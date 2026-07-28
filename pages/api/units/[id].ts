// pages/api/units/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files, File as FormidableFile } from 'formidable';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import cloudinary from '@/lib/cloudinary';
import Unit from '@/models/Unit';
import { requireAuth } from '@/lib/requireAuth';
import {
  rateLimitApi,
  rateLimitDeveloper,
  sendRateLimitResponse,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { syncUnitTypeBreakdown } from '@/lib/units/syncUnitTypeBreakdown';

export const config = {
  api: { bodyParser: false },
};

type CloudinaryFile = { url: string; publicId: string };

async function uploadSingle(
  file: FormidableFile,
  folder: string
): Promise<CloudinaryFile> {
  const result = await cloudinary.uploader.upload(file.filepath, {
    folder,
    resource_type: 'auto',
  });
  return { url: result.secure_url, publicId: result.public_id };
}

async function uploadMultiple(
  files: FormidableFile[],
  folder: string
): Promise<CloudinaryFile[]> {
  const uploads: CloudinaryFile[] = [];
  for (const file of files) {
    uploads.push(await uploadSingle(file, folder));
  }
  return uploads;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, message: 'Unit ID is required' });
  }

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid unit ID' });
  }

  await dbConnect();

  // ════════════════════════════════════════════════════
  // GET — Public unit detail (auth optional)
  // ════════════════════════════════════════════════════
  if (req.method === 'GET') {
    // Rate limit — general API (public endpoint)
    const rl = await rateLimitApi(req);
    setRateLimitHeaders(res, rl);
    if (!rl.ok) return sendRateLimitResponse(res, rl);

    try {
      const unit = await Unit.findOne({
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: { $ne: true },
      })
        .populate('projectId', 'projectName slug city area status')
        .lean() as Record<string, unknown> | null;

      if (!unit) {
        return res.status(404).json({ success: false, message: 'Unit not found' });
      }

      // Increment views — fire and forget (never block response)
      Unit.findByIdAndUpdate(id, { $inc: { views: 1 } }).catch(() => {
        // Silent
      });

      return res.status(200).json({ success: true, data: { unit } });

    } catch (error: unknown) {
      await logSecurityEvent({
        type: 'system_error',
        severity: 'medium',
        metadata: {
          action: 'unit_fetch_failed',
          unitId: id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({ success: false, message: 'Something went wrong' });
    }
  }

  // ════════════════════════════════════════════════════
  // PUT — Update unit (auth required)
  // ════════════════════════════════════════════════════
  if (req.method === 'PUT') {
    // Auth guard
    const auth = await requireAuth(req, res);
    if (!auth) return;

    // Role guard
    const role = auth.role as string;
    if (!['developer', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Rate limit
    const rl = await rateLimitDeveloper(req);
    setRateLimitHeaders(res, rl);
    if (!rl.ok) return sendRateLimitResponse(res, rl);

    // Parse form
    const form = formidable({ multiples: true, keepExtensions: true });

    return form.parse(req, async (err: unknown, fields: Fields, files: Files) => {
      if (err) {
        return res.status(400).json({ success: false, message: 'Error parsing form data' });
      }

      // ── Helpers ──
      const getField = (name: string): string => {
        const val = fields[name];
        if (!val) return '';
        return Array.isArray(val) ? String(val[0] ?? '') : String(val);
      };

      const parseNumber = (name: string): number | undefined => {
        const v = getField(name);
        if (!v) return undefined;
        const n = Number(v);
        return Number.isNaN(n) ? undefined : n;
      };

      const parseBoolean = (name: string): boolean | undefined => {
        const v = getField(name);
        if (v === '') return undefined;
        return v === 'true' || v === 'on' || v === '1';
      };

      const parseDate = (name: string): Date | undefined => {
        const v = getField(name);
        if (!v) return undefined;
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? undefined : d;
      };

      const getArrayField = (name: string): string[] | undefined => {
        const val = fields[name];
        if (!val) return undefined;
        if (Array.isArray(val)) {
          return (val as string[]).map((v) => String(v).trim()).filter(Boolean);
        }
        const str = String(val).trim();
        if (str.startsWith('[')) {
          try { return JSON.parse(str); } catch { /* fall through */ }
        }
        return str.split(',').map((s) => s.trim()).filter(Boolean);
      };

      const parseJSON = (name: string): unknown => {
        const raw = getField(name);
        if (!raw) return undefined;
        try { return JSON.parse(raw); } catch { return undefined; }
      };

      try {
        // ── Find existing unit ──
        const existingUnit = await Unit.findOne({
          _id: new mongoose.Types.ObjectId(id),
          isDeleted: { $ne: true },
        }).lean() as {
          _id: mongoose.Types.ObjectId;
          projectId: mongoose.Types.ObjectId;
          developerId: mongoose.Types.ObjectId;
          images?: Array<{ url: string; publicId: string; isPrimary?: boolean; order?: number }>;
          floorPlanImage?: { url: string; publicId: string };
          layoutImage?: { url: string; publicId: string };
          status?: string;
        } | null;

        if (!existingUnit) {
          return res.status(404).json({ success: false, message: 'Unit not found' });
        }

        // ── Ownership check — session-based ──
        if (role === 'developer') {
          const DeveloperProfile = mongoose.models.DeveloperProfile as
            mongoose.Model<mongoose.Document>;

          if (!DeveloperProfile) {
            return res.status(500).json({ success: false, message: 'Something went wrong' });
          }

          const devProfile = await DeveloperProfile.findOne(
            { user: auth.id },
            { _id: 1 }
          ).lean() as { _id: mongoose.Types.ObjectId } | null;

          if (!devProfile) {
            return res.status(403).json({ success: false, message: 'Developer profile not found' });
          }

          if (existingUnit.developerId.toString() !== devProfile._id.toString()) {
            await logSecurityEvent({
              type: 'suspicious_activity',
              severity: 'high',
              userId: auth.id,
              metadata: {
                action: 'unit_update_unauthorized',
                unitId: id,
                reason: 'Developer attempted to update another developer unit',
              },
            });
            return res.status(403).json({
              success: false,
              message: 'You do not have permission to update this unit',
            });
          }
        }

        // ── File uploads ──
        let floorPlanImage = existingUnit.floorPlanImage;
        let layoutImage = existingUnit.layoutImage;
        let images = existingUnit.images || [];

        const fpFile = files.floorPlanImage;
        if (fpFile) {
          const arr = Array.isArray(fpFile) ? fpFile : [fpFile];
          floorPlanImage = await uploadSingle(
            arr[0] as FormidableFile,
            'highrise/units/floorplans'
          );
        }

        const lyFile = files.layoutImage;
        if (lyFile) {
          const arr = Array.isArray(lyFile) ? lyFile : [lyFile];
          layoutImage = await uploadSingle(
            arr[0] as FormidableFile,
            'highrise/units/layouts'
          );
        }

        const imgFiles = files.images;
        if (imgFiles) {
          const arr = Array.isArray(imgFiles) ? imgFiles : [imgFiles];
          const uploaded = await uploadMultiple(
            arr as FormidableFile[],
            'highrise/units/images'
          );
          const newImages = uploaded.map((img, i) => ({
            url: img.url,
            publicId: img.publicId,
            isPrimary: false,
            order: images.length + i,
          }));
          images = [...images, ...newImages];
        }

        // ── Build update object (only include provided fields) ──
        const updateData: Record<string, unknown> = {};

        // Identity
        const unitNumber = getField('unitNumber');
        if (unitNumber) updateData.unitNumber = unitNumber.trim();
        const title = getField('title');
        if (title) updateData.title = title;
        const floorNumber = parseNumber('floorNumber');
        if (floorNumber !== undefined) updateData.floorNumber = floorNumber;
        const floorName = getField('floorName');
        if (floorName) updateData.floorName = floorName;
        const tower = getField('tower');
        if (tower) updateData.tower = tower;
        const wing = getField('wing');
        if (wing) updateData.wing = wing;
        const building = getField('building');
        if (building) updateData.building = building;

        // Classification
        const category = getField('category');
        if (category && ['residential', 'commercial'].includes(category)) {
          updateData.category = category;
        }
        const unitType = getField('unitType');
        if (unitType) updateData.unitType = unitType;
        const subType = getField('subType');
        if (subType) updateData.subType = subType;

        // Size
        const area = parseNumber('area');
        if (area !== undefined && area > 0) updateData.area = area;
        const areaUnit = getField('areaUnit');
        if (areaUnit) updateData.areaUnit = areaUnit;
        const coveredArea = parseNumber('coveredArea');
        if (coveredArea !== undefined) updateData.coveredArea = coveredArea;
        const carpetArea = parseNumber('carpetArea');
        if (carpetArea !== undefined) updateData.carpetArea = carpetArea;
        const balconyArea = parseNumber('balconyArea');
        if (balconyArea !== undefined) updateData.balconyArea = balconyArea;
        const terraceArea = parseNumber('terraceArea');
        if (terraceArea !== undefined) updateData.terraceArea = terraceArea;
        const frontWidth = parseNumber('frontWidth');
        if (frontWidth !== undefined) updateData.frontWidth = frontWidth;
        const depth = parseNumber('depth');
        if (depth !== undefined) updateData.depth = depth;
        const height = parseNumber('height');
        if (height !== undefined) updateData.height = height;
        const hasMezzanine = parseBoolean('hasMezzanine');
        if (hasMezzanine !== undefined) updateData.hasMezzanine = hasMezzanine;
        const mezzanineArea = parseNumber('mezzanineArea');
        if (mezzanineArea !== undefined) updateData.mezzanineArea = mezzanineArea;

        // Price
        const price = parseNumber('price');
        if (price !== undefined && price > 0) updateData.price = price;
        const pricePerUnit = parseNumber('pricePerUnit');
        if (pricePerUnit !== undefined) updateData.pricePerUnit = pricePerUnit;
        const priceNegotiable = parseBoolean('priceNegotiable');
        if (priceNegotiable !== undefined) updateData.priceNegotiable = priceNegotiable;
        const priceLabel = getField('priceLabel');
        if (priceLabel) updateData.priceLabel = priceLabel;

        // Residential features
        const bedrooms = parseNumber('bedrooms');
        if (bedrooms !== undefined) updateData.bedrooms = bedrooms;
        const bathrooms = parseNumber('bathrooms');
        if (bathrooms !== undefined) updateData.bathrooms = bathrooms;
        const livingRooms = parseNumber('livingRooms');
        if (livingRooms !== undefined) updateData.livingRooms = livingRooms;
        const kitchens = parseNumber('kitchens');
        if (kitchens !== undefined) updateData.kitchens = kitchens;
        const balconies = parseNumber('balconies');
        if (balconies !== undefined) updateData.balconies = balconies;
        const servantQuarter = parseBoolean('servantQuarter');
        if (servantQuarter !== undefined) updateData.servantQuarter = servantQuarter;
        const storeRoom = parseBoolean('storeRoom');
        if (storeRoom !== undefined) updateData.storeRoom = storeRoom;
        const studyRoom = parseBoolean('studyRoom');
        if (studyRoom !== undefined) updateData.studyRoom = studyRoom;

        // Commercial features
        const washroom = getField('washroom');
        if (washroom) updateData.washroom = washroom;
        const kitchenette = parseBoolean('kitchenette');
        if (kitchenette !== undefined) updateData.kitchenette = kitchenette;
        const reception = parseBoolean('reception');
        if (reception !== undefined) updateData.reception = reception;
        const cabins = parseNumber('cabins');
        if (cabins !== undefined) updateData.cabins = cabins;
        const seatingCapacity = parseNumber('seatingCapacity');
        if (seatingCapacity !== undefined) updateData.seatingCapacity = seatingCapacity;
        const hasExhaustSystem = parseBoolean('hasExhaustSystem');
        if (hasExhaustSystem !== undefined) updateData.hasExhaustSystem = hasExhaustSystem;
        const hasDisplayWindow = parseBoolean('hasDisplayWindow');
        if (hasDisplayWindow !== undefined) updateData.hasDisplayWindow = hasDisplayWindow;
        const shutterType = getField('shutterType');
        if (shutterType) updateData.shutterType = shutterType;
        const suitableFor = getArrayField('suitableFor');
        if (suitableFor) updateData.suitableFor = suitableFor;

        // Position
        const isCorner = parseBoolean('isCorner');
        if (isCorner !== undefined) updateData.isCorner = isCorner;
        const facing = getField('facing');
        if (facing) updateData.facing = facing;
        const view = getField('view');
        if (view) updateData.view = view;
        const viewDescription = getField('viewDescription');
        if (viewDescription) updateData.viewDescription = viewDescription;
        const isParkFacing = parseBoolean('isParkFacing');
        if (isParkFacing !== undefined) updateData.isParkFacing = isParkFacing;
        const isRoadFacing = parseBoolean('isRoadFacing');
        if (isRoadFacing !== undefined) updateData.isRoadFacing = isRoadFacing;
        const isMosqueFacing = parseBoolean('isMosqueFacing');
        if (isMosqueFacing !== undefined) updateData.isMosqueFacing = isMosqueFacing;
        const hasPrivateElevator = parseBoolean('hasPrivateElevator');
        if (hasPrivateElevator !== undefined) updateData.hasPrivateElevator = hasPrivateElevator;
        const hasPrivateEntrance = parseBoolean('hasPrivateEntrance');
        if (hasPrivateEntrance !== undefined) updateData.hasPrivateEntrance = hasPrivateEntrance;
        const hasRoofRights = parseBoolean('hasRoofRights');
        if (hasRoofRights !== undefined) updateData.hasRoofRights = hasRoofRights;
        const hasGarden = parseBoolean('hasGarden');
        if (hasGarden !== undefined) updateData.hasGarden = hasGarden;
        const gardenArea = parseNumber('gardenArea');
        if (gardenArea !== undefined) updateData.gardenArea = gardenArea;

        // Features & amenities
        const features = getArrayField('features');
        if (features) updateData.features = features;
        const includedAppliances = getArrayField('includedAppliances');
        if (includedAppliances) updateData.includedAppliances = includedAppliances;
        const finishingLevel = getField('finishingLevel');
        if (finishingLevel) updateData.finishingLevel = finishingLevel;
        const finishingDetails = getField('finishingDetails');
        if (finishingDetails) updateData.finishingDetails = finishingDetails;

        // Status
        const status = getField('status');
        const validStatuses = ['available', 'reserved', 'sold', 'on_hold', 'cancelled'];
        if (status && validStatuses.includes(status)) updateData.status = status;
        const availableFrom = parseDate('availableFrom');
        if (availableFrom) updateData.availableFrom = availableFrom;

        // Payment
        const listingType = getField('listingType');
        if (listingType) updateData.listingType = listingType;
        const installmentPlan = parseJSON('installmentPlan');
        if (installmentPlan !== undefined) updateData.installmentPlan = installmentPlan;
        const charges = parseJSON('charges');
        if (charges !== undefined) updateData.charges = charges;

        // Investor intelligence
        const investorIntelligence = parseJSON('investorIntelligence');
        if (investorIntelligence !== undefined) {
          updateData.investorIntelligence = investorIntelligence;
        }

        // Parking
        const parkingIncluded = parseBoolean('parkingIncluded');
        if (parkingIncluded !== undefined) updateData.parkingIncluded = parkingIncluded;
        const parkingSpaces = parseNumber('parkingSpaces');
        if (parkingSpaces !== undefined) updateData.parkingSpaces = parkingSpaces;
        const parkingType = getField('parkingType');
        if (parkingType) updateData.parkingType = parkingType;
        const parkingNumber = getField('parkingNumber');
        if (parkingNumber) updateData.parkingNumber = parkingNumber;
        const parkingPrice = parseNumber('parkingPrice');
        if (parkingPrice !== undefined) updateData.parkingPrice = parkingPrice;

        // Media (always overwrite with merged result)
        updateData.floorPlanImage = floorPlanImage;
        updateData.layoutImage = layoutImage;
        updateData.images = images;
        const virtualTourUrl = getField('virtualTourUrl');
        if (virtualTourUrl) updateData.virtualTourUrl = virtualTourUrl;
        const videoUrl = getField('videoUrl');
        if (videoUrl) updateData.videoUrl = videoUrl;

        // Description
        const description = getField('description');
        if (description) updateData.description = description;
        const shortDescription = getField('shortDescription');
        if (shortDescription) updateData.shortDescription = shortDescription;
        const highlights = getArrayField('highlights');
        if (highlights) updateData.highlights = highlights;
        const termsAndConditions = getField('termsAndConditions');
        if (termsAndConditions) updateData.termsAndConditions = termsAndConditions;

        // Meta — developers cannot self-verify or self-feature
        if (role === 'admin') {
          const isFeatured = parseBoolean('isFeatured');
          if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
          const isVerified = parseBoolean('isVerified');
          if (isVerified !== undefined) updateData.isVerified = isVerified;
          const isPublished = parseBoolean('isPublished');
          if (isPublished !== undefined) updateData.isPublished = isPublished;
        }

        const isHotDeal = parseBoolean('isHotDeal');
        if (isHotDeal !== undefined) updateData.isHotDeal = isHotDeal;
        const isPriceDropped = parseBoolean('isPriceDropped');
        if (isPriceDropped !== undefined) updateData.isPriceDropped = isPriceDropped;
        const previousPrice = parseNumber('previousPrice');
        if (previousPrice !== undefined) updateData.previousPrice = previousPrice;

        // ── Update ──
        const updated = await Unit.findByIdAndUpdate(
          id,
          { $set: updateData },
          { new: true, runValidators: true }
        ).lean();

        // ── Sync project breakdown ──
        syncUnitTypeBreakdown(String(existingUnit.projectId)).catch(() => {
          // Silent
        });

        // ── Audit log ──
        await logSecurityEvent({
          type: 'admin_action',
          severity: 'low',
          userId: auth.id,
          metadata: {
            action: 'unit_updated',
            unitId: id,
            projectId: String(existingUnit.projectId),
            changedFields: Object.keys(updateData),
          },
        });

        return res.status(200).json({
          success: true,
          message: 'Unit updated successfully',
          data: { unit: updated },
        });

      } catch (error: unknown) {
        await logSecurityEvent({
          type: 'system_error',
          severity: 'high',
          userId: auth.id,
          metadata: {
            action: 'unit_update_failed',
            unitId: id,
            reason: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
      }
    });
  }

  // ════════════════════════════════════════════════════
  // DELETE — Soft delete unit (auth required)
  // ════════════════════════════════════════════════════
  if (req.method === 'DELETE') {
    // Auth guard
    const auth = await requireAuth(req, res);
    if (!auth) return;

    // Role guard
    const role = auth.role as string;
    if (!['developer', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Rate limit
    const rl = await rateLimitDeveloper(req);
    setRateLimitHeaders(res, rl);
    if (!rl.ok) return sendRateLimitResponse(res, rl);

    try {
      const unit = await Unit.findOne({
        _id: new mongoose.Types.ObjectId(id),
        isDeleted: { $ne: true },
      }).lean() as {
        _id: mongoose.Types.ObjectId;
        projectId: mongoose.Types.ObjectId;
        developerId: mongoose.Types.ObjectId;
        status?: string;
        unitNumber?: string;
      } | null;

      if (!unit) {
        return res.status(404).json({ success: false, message: 'Unit not found' });
      }

      // ── Ownership check — session-based ──
      if (role === 'developer') {
        const DeveloperProfile = mongoose.models.DeveloperProfile as
          mongoose.Model<mongoose.Document>;

        const devProfile = await DeveloperProfile.findOne(
          { user: auth.id },
          { _id: 1 }
        ).lean() as { _id: mongoose.Types.ObjectId } | null;

        if (!devProfile) {
          return res.status(403).json({ success: false, message: 'Developer profile not found' });
        }

        if (unit.developerId.toString() !== devProfile._id.toString()) {
          await logSecurityEvent({
            type: 'suspicious_activity',
            severity: 'high',
            userId: auth.id,
            metadata: {
              action: 'unit_delete_unauthorized',
              unitId: id,
              reason: 'Developer attempted to delete another developer unit',
            },
          });
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to delete this unit',
          });
        }
      }

      // ── Soft delete ──
      await Unit.findByIdAndUpdate(id, {
        $set: { isDeleted: true, deletedAt: new Date() },
      });

      // ── Sync project breakdown ──
      syncUnitTypeBreakdown(String(unit.projectId)).catch(() => {
        // Silent
      });

      // ── Audit log ──
      await logSecurityEvent({
        type: 'admin_action',
        severity: 'medium',
        userId: auth.id,
        metadata: {
          action: 'unit_deleted',
          unitId: id,
          unitNumber: unit.unitNumber,
          projectId: String(unit.projectId),
          previousStatus: unit.status,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Unit deleted successfully',
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type: 'system_error',
        severity: 'high',
        userId: auth.id,
        metadata: {
          action: 'unit_delete_failed',
          unitId: id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }
  }

  // ── Method not allowed ──
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}