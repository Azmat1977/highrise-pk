// pages/api/units/create.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files, File as FormidableFile } from 'formidable';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import cloudinary from '@/lib/cloudinary';
import Unit from '@/models/Unit';
import { requireAuth } from '@/lib/requireAuth';
import { rateLimitDeveloper, sendRateLimitResponse, setRateLimitHeaders } from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { syncUnitTypeBreakdown } from '@/lib/units/syncUnitTypeBreakdown';

export const config = {
  api: { bodyParser: false },
};

type CloudinaryFile = { url: string; publicId: string };

async function uploadSingle(file: FormidableFile, folder: string): Promise<CloudinaryFile> {
  const result = await cloudinary.uploader.upload(file.filepath, {
    folder,
    resource_type: 'auto',
  });
  return { url: result.secure_url, publicId: result.public_id };
}

async function uploadMultiple(files: FormidableFile[], folder: string): Promise<CloudinaryFile[]> {
  const uploads: CloudinaryFile[] = [];
  for (const file of files) {
    uploads.push(await uploadSingle(file, folder));
  }
  return uploads;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── Method guard ──
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ── Auth guard ──
  const auth = await requireAuth(req, res);
  if (!auth) return;

  // ── Role guard ──
  const role = auth.role as string;
  if (!['developer', 'admin'].includes(role)) {
    await logSecurityEvent({
      type: 'suspicious_activity',
      severity: 'medium',
      userId: auth.id,
      metadata: {
        action: 'unit_create_unauthorized_role',
        role,
        reason: 'Non-developer attempted unit creation',
      },
    });
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  // ── Rate limit ──
  const rl = await rateLimitDeveloper(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  // ── DB ──
  await dbConnect();

  // ── Parse form ──
  const form = formidable({ multiples: true, keepExtensions: true });

  form.parse(req, async (err: unknown, fields: Fields, files: Files) => {
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

    const parseBoolean = (name: string): boolean => {
      const v = getField(name);
      return v === 'true' || v === 'on' || v === '1';
    };

    const parseDate = (name: string): Date | undefined => {
      const v = getField(name);
      if (!v) return undefined;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };

    const getArrayField = (name: string): string[] => {
      const val = fields[name];
      if (!val) return [];
      if (Array.isArray(val)) {
        return (val as string[]).map((v) => String(v).trim()).filter(Boolean);
      }
      const str = String(val).trim();
      if (str.startsWith('[')) {
        try { return JSON.parse(str); } catch { /* fall through */ }
      }
      return str.split(',').map((s) => s.trim()).filter(Boolean);
    };

    const parseJSON = (name: string, fallback: unknown = null): unknown => {
      const raw = getField(name);
      if (!raw) return fallback;
      try { return JSON.parse(raw); } catch { return fallback; }
    };

    try {
      // ── Required fields ──
      const projectId = getField('projectId');
      const unitNumber = getField('unitNumber');
      const category = getField('category');
      const unitType = getField('unitType');
      const area = parseNumber('area');
      const price = parseNumber('price');

      if (!projectId) {
        return res.status(400).json({ success: false, message: 'Project ID is required' });
      }
      if (!mongoose.isValidObjectId(projectId)) {
        return res.status(400).json({ success: false, message: 'Invalid project ID' });
      }
      if (!unitNumber?.trim()) {
        return res.status(400).json({ success: false, message: 'Unit number is required' });
      }
      if (!category || !['residential', 'commercial'].includes(category)) {
        return res.status(400).json({ success: false, message: 'Valid category required: residential or commercial' });
      }
      if (!unitType) {
        return res.status(400).json({ success: false, message: 'Unit type is required' });
      }
      if (!area || area <= 0) {
        return res.status(400).json({ success: false, message: 'Valid area is required' });
      }
      if (!price || price <= 0) {
        return res.status(400).json({ success: false, message: 'Valid price is required' });
      }

      // ── Ownership check — get developerId from SESSION not body ──
      const Project = mongoose.models.Project as mongoose.Model<mongoose.Document>;
      if (!Project) {
        return res.status(500).json({ success: false, message: 'Something went wrong' });
      }

      // For admin: bypass ownership check
      // For developer: verify they own the project
      const projectQuery: Record<string, unknown> = {
        _id: new mongoose.Types.ObjectId(projectId),
        isDeleted: { $ne: true },
      };

      if (role === 'developer') {
        // Find developer profile linked to this user
        const DeveloperProfile = mongoose.models.DeveloperProfile as mongoose.Model<mongoose.Document>;
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
        projectQuery.developerId = devProfile._id;
      }

      const project = await Project.findOne(projectQuery).lean() as {
        _id: mongoose.Types.ObjectId;
        developerId: mongoose.Types.ObjectId;
      } | null;

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found or you do not have permission',
        });
      }

      // ── Duplicate unit number check ──
      const existing = await Unit.findOne({
        projectId: new mongoose.Types.ObjectId(projectId),
        unitNumber: unitNumber.trim(),
        isDeleted: { $ne: true },
      }).lean();

      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Unit number "${unitNumber}" already exists in this project`,
        });
      }

      // ── File uploads ──
      let floorPlanImage: CloudinaryFile | null = null;
      let layoutImage: CloudinaryFile | null = null;
      let images: Array<{
        url: string;
        publicId: string;
        isPrimary?: boolean;
        order?: number;
      }> = [];

      const fpFile = files.floorPlanImage;
      if (fpFile) {
        const arr = Array.isArray(fpFile) ? fpFile : [fpFile];
        floorPlanImage = await uploadSingle(arr[0] as FormidableFile, 'highrise/units/floorplans');
      }

      const lyFile = files.layoutImage;
      if (lyFile) {
        const arr = Array.isArray(lyFile) ? lyFile : [lyFile];
        layoutImage = await uploadSingle(arr[0] as FormidableFile, 'highrise/units/layouts');
      }

      const imgFiles = files.images;
      if (imgFiles) {
        const arr = Array.isArray(imgFiles) ? imgFiles : [imgFiles];
        const uploaded = await uploadMultiple(arr as FormidableFile[], 'highrise/units/images');
        images = uploaded.map((img, i) => ({
          url: img.url,
          publicId: img.publicId,
          isPrimary: i === 0,
          order: i,
        }));
      }

      // ── Build document ──
      const unitDoc = {
        // References — from verified sources only
        projectId: new mongoose.Types.ObjectId(projectId),
        developerId: project.developerId,
        unitTypeName: getField('unitTypeName') || unitType,

        // Identity
        unitNumber: unitNumber.trim(),
        title: getField('title') || undefined,
        floorNumber: parseNumber('floorNumber'),
        floorName: getField('floorName') || undefined,
        tower: getField('tower') || undefined,
        wing: getField('wing') || undefined,
        building: getField('building') || undefined,

        // Classification
        category,
        unitType,
        subType: getField('subType') || undefined,

        // Size
        area,
        areaUnit: getField('areaUnit') || 'Sq.Ft',
        coveredArea: parseNumber('coveredArea'),
        carpetArea: parseNumber('carpetArea'),
        balconyArea: parseNumber('balconyArea'),
        terraceArea: parseNumber('terraceArea'),
        frontWidth: parseNumber('frontWidth'),
        depth: parseNumber('depth'),
        height: parseNumber('height'),
        hasMezzanine: parseBoolean('hasMezzanine'),
        mezzanineArea: parseNumber('mezzanineArea'),

        // Price
        price,
        pricePerUnit: parseNumber('pricePerUnit'),
        priceNegotiable: parseBoolean('priceNegotiable'),
        priceLabel: getField('priceLabel') || undefined,

        // Residential features
        bedrooms: parseNumber('bedrooms'),
        bathrooms: parseNumber('bathrooms'),
        livingRooms: parseNumber('livingRooms'),
        kitchens: parseNumber('kitchens'),
        balconies: parseNumber('balconies'),
        servantQuarter: parseBoolean('servantQuarter'),
        storeRoom: parseBoolean('storeRoom'),
        laundryArea: parseBoolean('laundryArea'),
        studyRoom: parseBoolean('studyRoom'),

        // Commercial features
        washroom: getField('washroom') || undefined,
        kitchenette: parseBoolean('kitchenette'),
        reception: parseBoolean('reception'),
        cabins: parseNumber('cabins'),
        seatingCapacity: parseNumber('seatingCapacity'),
        hasExhaustSystem: parseBoolean('hasExhaustSystem'),
        hasDisplayWindow: parseBoolean('hasDisplayWindow'),
        shutterType: getField('shutterType') || undefined,
        suitableFor: getArrayField('suitableFor'),

        // Position
        isCorner: parseBoolean('isCorner'),
        facing: getField('facing') || undefined,
        view: getField('view') || undefined,
        viewDescription: getField('viewDescription') || undefined,
        isParkFacing: parseBoolean('isParkFacing'),
        isRoadFacing: parseBoolean('isRoadFacing'),
        isMosqueFacing: parseBoolean('isMosqueFacing'),
        hasPrivateElevator: parseBoolean('hasPrivateElevator'),
        hasPrivateEntrance: parseBoolean('hasPrivateEntrance'),
        hasRoofRights: parseBoolean('hasRoofRights'),
        hasGarden: parseBoolean('hasGarden'),
        gardenArea: parseNumber('gardenArea'),

        // Features
        features: getArrayField('features'),
        includedAppliances: getArrayField('includedAppliances'),
        finishingLevel: getField('finishingLevel') || undefined,
        finishingDetails: getField('finishingDetails') || undefined,

        // Status
        status: getField('status') || 'available',
        isPublished: false, // Always false until admin reviews
        availableFrom: parseDate('availableFrom'),
        bookingInfo: parseJSON('bookingInfo') || undefined,
        soldInfo: parseJSON('soldInfo') || undefined,

        // Payment
        listingType: getField('listingType') || 'both',
        installmentPlan: parseJSON('installmentPlan') || undefined,
        charges: parseJSON('charges') || undefined,

        // Investor intelligence
        investorIntelligence: parseJSON('investorIntelligence') || undefined,

        // Parking
        parkingIncluded: parseBoolean('parkingIncluded'),
        parkingSpaces: parseNumber('parkingSpaces'),
        parkingType: getField('parkingType') || undefined,
        parkingNumber: getField('parkingNumber') || undefined,
        parkingPrice: parseNumber('parkingPrice'),

        // Media
        images: images.length > 0 ? images : undefined,
        floorPlanImage: floorPlanImage ?? undefined,
        layoutImage: layoutImage ?? undefined,
        virtualTourUrl: getField('virtualTourUrl') || undefined,
        videoUrl: getField('videoUrl') || undefined,

        // Description
        description: getField('description') || undefined,
        shortDescription: getField('shortDescription') || undefined,
        highlights: getArrayField('highlights'),
        termsAndConditions: getField('termsAndConditions') || undefined,

        // Meta
        isVerified: false,
        isFeatured: false,
        isHotDeal: parseBoolean('isHotDeal'),
        isPriceDropped: false,
        previousPrice: parseNumber('previousPrice'),

        // Soft delete
        isDeleted: false,
        deletedAt: null,

        // Analytics
        views: 0,
        inquiryCount: 0,
      };

      // ── Save ──
      const saved = await Unit.create(unitDoc);

      // ── Sync project breakdown (fire and forget — never block response) ──
      syncUnitTypeBreakdown(projectId).catch(() => {
        // Silent — sync failure never blocks unit creation
      });

      // ── Audit log ──
      await logSecurityEvent({
        type: 'admin_action',
        severity: 'low',
        userId: auth.id,
        metadata: {
          action: 'unit_created',
          unitId: String(saved._id),
          unitNumber: unitNumber.trim(),
          projectId,
          unitType,
          price,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Unit created successfully',
        data: {
          unitId: saved._id,
          unitNumber: saved.unitNumber,
          status: saved.status,
        },
      });

    } catch (error: unknown) {
      // Duplicate key (race condition)
      if ((error as { code?: number }).code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'A unit with this number already exists in this project',
        });
      }

      await logSecurityEvent({
        type: 'system_error',
        severity: 'high',
        userId: auth.id,
        metadata: {
          action: 'unit_create_failed',
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }
  });
}