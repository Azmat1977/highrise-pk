// C:\dev\highrise-pk\pages\api\dashboard\projects\[id]\index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import User from '@/models/User';
import { requireAuth } from '@/lib/requireAuth';

type ApiResponse =
  | { success: true; project: any }
  | { success: false; message: string };

function setSecurityHeaders(res: NextApiResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Vary', 'Accept-Encoding');

  // Encourage HTTPS (best set at CDN/edge too, but safe here)
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');

  // API conservative defaults
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Dashboard: never cache
  res.setHeader('Cache-Control', 'no-store, max-age=0');
}

const RL_WINDOW_MS = 60_000;
const RL_MAX_GET = 120;
const RL_MAX_PUT_IP = 15;
const RL_MAX_PUT_USER = 12;

type RL = { count: number; resetAt: number };
const rlStore: Map<string, RL> = (globalThis as any).__hr_dash_projects_id_rl || new Map<string, RL>();
(globalThis as any).__hr_dash_projects_id_rl = rlStore;

function getClientIp(req: NextApiRequest): string {
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf) ? xf[0] : xf;
  const first = (ip || '').split(',')[0]?.trim();
  return first || (req.socket?.remoteAddress || '0.0.0.0');
}

function bumpRate(key: string, max: number) {
  const now = Date.now();

  // lightweight cleanup
  if (rlStore.size > 10_000) {
    for (const [k, v] of rlStore.entries()) {
      if (now > v.resetAt) rlStore.delete(k);
    }
  }

  const cur = rlStore.get(key);
  if (!cur || now > cur.resetAt) {
    rlStore.set(key, { count: 1, resetAt: now + RL_WINDOW_MS });
    return { ok: true as const, retryAfterSec: 0 };
  }

  cur.count += 1;
  rlStore.set(key, cur);

  if (cur.count > max) {
    const retryAfterSec = Math.max(1, Math.ceil((cur.resetAt - now) / 1000));
    return { ok: false as const, retryAfterSec };
  }

  return { ok: true as const, retryAfterSec: 0 };
}

function normalizeString(v: any) {
  return typeof v === 'string' ? v.trim() : '';
}

function safeJsonBody(req: NextApiRequest): any {
  const b: any = (req as any).body;
  if (!b) return {};
  if (typeof b === 'object') return b;
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return {};
}

async function requireSession(req: NextApiRequest, res: NextApiResponse) {
  const auth = await requireAuth(req, res);
  if (!auth) return { ok: false as const };

  const role = String(auth.role || '').toLowerCase();
  const isAdmin =
    auth.authorityRole === 'admin' ||
    role === 'admin' ||
    role === 'superadmin';

  return { ok: true as const, userId: auth.id, isAdmin };
}

async function enforceActiveAndCnicIfPossible(
  userId: string,
  isAdmin: boolean
): Promise<{ ok: boolean; status: number; message: string }> {
  if (isAdmin) return { ok: true, status: 200, message: 'ok' };

  try {
    const u: any = await (User as any)
      .findById(userId)
      .select('_id isActive disabled status cnicVerified cnic verified deletedAt deleted isDeleted softDeleted')
      .lean();

    if (!u) return { ok: false, status: 401, message: 'Unauthorized' };

    const softDeleted =
      Boolean(u.deletedAt) || Boolean(u.deleted) || Boolean(u.isDeleted) || Boolean(u.softDeleted);

    if (softDeleted) return { ok: false, status: 403, message: 'Account is not available.' };

    const disabled =
      u.disabled === true ||
      u.isActive === false ||
      u.status === 'disabled' ||
      u.status === 'banned';

    if (disabled) return { ok: false, status: 403, message: 'Account is not active.' };

    const cnicVerified =
      u.cnicVerified === true || u.verified === true || u?.cnic?.verified === true;

    if (!cnicVerified) {
      return { ok: false, status: 403, message: 'CNIC verification is required for dashboard access.' };
    }

    return { ok: true, status: 200, message: 'ok' };
  } catch {
    // best-effort
    return { ok: true, status: 200, message: 'ok' };
  }
}

function pickFirstImageUrlFromDevUpdate(u: any): string {
  const imgs = u?.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const first = imgs[0];
    if (first?.url) return String(first.url);
  }
  return '';
}

function toDateInput(d: any): string {
  if (!d) return '';
  try {
    const s = String(d);
    return s.includes('T') ? s.split('T')[0] : s.slice(0, 10);
  } catch {
    return '';
  }
}

/**
 * Build a dashboard-friendly response that matches the developer edit form
 * without forcing model/schema changes today.
 */
function buildDashboardProjectView(raw: any) {
  const p = raw || {};

  const floorDetails = p.floorDetails || {};
  const societyDetails = p.societyDetails || {};

  // Map model -> edit form expectations (root-level aliases)
  const view: any = {
    ...p,

    // High-rise floor aliases (form expects these root fields)
    totalFloors:
      p.totalFloors ?? floorDetails.totalFloors ?? p.floorDetails?.totalFloors ?? null,
    parkingFloors:
      p.parkingFloors ?? floorDetails.floorsForParking ?? p.floorDetails?.floorsForParking ?? null,
    commercialFloors:
      p.commercialFloors ??
      floorDetails.floorsForCommercial ??
      p.floorDetails?.floorsForCommercial ??
      null,
    residentialFloors:
      p.residentialFloors ??
      floorDetails.floorsForResidential ??
      p.floorDetails?.floorsForResidential ??
      null,

    // Society aliases (form expects these root fields)
    totalLandArea: p.totalLandArea ?? societyDetails.totalLandArea ?? null,
    totalResidentialPlots: p.totalResidentialPlots ?? societyDetails.totalResidentialPlots ?? null,
    totalCommercialPlots: p.totalCommercialPlots ?? societyDetails.totalCommercialPlots ?? null,
    plotSizesOffered: p.plotSizesOffered ?? societyDetails.plotSizesOffered ?? '',
    developmentStatus: p.developmentStatus ?? societyDetails.developmentStatus ?? '',
    societyFacilities: Array.isArray(p.societyFacilities)
      ? p.societyFacilities
      : Array.isArray(societyDetails.facilities)
        ? societyDetails.facilities
        : [],

    // For UnitPlansSection: if UI prefers unitPlans, provide alias
    unitPlans: Array.isArray(p.unitPlans)
      ? p.unitPlans
      : Array.isArray(p.unitTypeBreakdown)
        ? p.unitTypeBreakdown
        : [],

    // For construction updates: UI expects constructionUpdates
    constructionUpdates: Array.isArray(p.constructionUpdates)
      ? p.constructionUpdates
      : Array.isArray(p.developmentUpdates)
        ? p.developmentUpdates.map((u: any) => ({
            date: toDateInput(u?.date),
            progressPercent: u?.progressPercent != null ? String(u.progressPercent) : '',
            title: normalizeString(u?.title || ''),
            description: normalizeString(u?.description || ''),
            videoUrl: normalizeString(u?.videoUrl || ''),
            imageUrl: normalizeString(pickFirstImageUrlFromDevUpdate(u) || ''),
          }))
        : [],

    // Ensure completedProjects array exists for UI
    completedProjects: Array.isArray(p.completedProjects) ? p.completedProjects : [],

    // Dates formatted for input
    launchDate: p.launchDate ? toDateInput(p.launchDate) : '',
    expectedCompletionDate: p.expectedCompletionDate ? toDateInput(p.expectedCompletionDate) : '',
    possessionStartDate: p.possessionStartDate ? toDateInput(p.possessionStartDate) : '',
  };

  return view;
}

/**
 * Allowlist update builder: only accepts known project-edit fields from the UI,
 * and writes them safely (including "extra" dashboard-only fields) without trusting arbitrary input.
 */
function buildAllowedUpdate(body: any) {
  const b = body || {};

  const update: Record<string, any> = {};

  // Classification
  if (typeof b.projectCategory === 'string') update.projectCategory = b.projectCategory.trim();
  if (typeof b.projectNature === 'string') update.projectNature = b.projectNature.trim();
  if (typeof b.projectType === 'string') update.projectType = b.projectType;

  // Basic
  if (typeof b.projectName === 'string') update.projectName = b.projectName.trim();
  if (typeof b.title === 'string') update.title = b.title.trim();
  if (typeof b.tagline === 'string' || b.tagline === null) update.tagline = b.tagline;
  if (typeof b.shortDescription === 'string' || b.shortDescription === null)
    update.shortDescription = b.shortDescription;
  if (typeof b.description === 'string' || b.description === null) update.description = b.description;

  if (typeof b.city === 'string') update.city = b.city.trim();
  if (typeof b.area === 'string') update.area = b.area.trim();
  if (typeof b.location === 'string') update.location = b.location.trim();
  if (typeof b.projectStatus === 'string') update.projectStatus = b.projectStatus;

  if (b.launchDate === null || typeof b.launchDate === 'string') update.launchDate = b.launchDate || null;
  if (typeof b.developmentProgress === 'number') update.developmentProgress = b.developmentProgress;
  if (b.expectedCompletionDate === null || typeof b.expectedCompletionDate === 'string')
    update.expectedCompletionDate = b.expectedCompletionDate || null;
  if (b.possessionStartDate === null || typeof b.possessionStartDate === 'string')
    update.possessionStartDate = b.possessionStartDate || null;

  // Legal (note: model has isApproved/nocStatus as enums)
  if (typeof b.approvalAuthority === 'string' || b.approvalAuthority === null)
    update.approvalAuthority = b.approvalAuthority;
  if (typeof b.isApproved === 'string' || b.isApproved === null) update.isApproved = b.isApproved;
  if (typeof b.nocStatus === 'string' || b.nocStatus === null) update.nocStatus = b.nocStatus;
  if (typeof b.nocNumber === 'string' || b.nocNumber === null) update.nocNumber = b.nocNumber;
  if (typeof b.societyRegistrationNumber === 'string' || b.societyRegistrationNumber === null)
    update.societyRegistrationNumber = b.societyRegistrationNumber;
  if (typeof b.environmentClearance === 'boolean') update.environmentClearance = b.environmentClearance;
  if (typeof b.buildingPlanApproved === 'boolean') update.buildingPlanApproved = b.buildingPlanApproved;

  // High-rise scale (root fields in model)
  if (typeof b.totalArea === 'string' || b.totalArea === null) update.totalArea = b.totalArea;
  if (typeof b.totalBlocks === 'number' || b.totalBlocks === null) update.totalBlocks = b.totalBlocks;
  if (typeof b.totalUnits === 'number' || b.totalUnits === null) update.totalUnits = b.totalUnits;
  if (typeof b.unitsSold === 'number' || b.unitsSold === null) update.unitsSold = b.unitsSold;
  if (typeof b.unitsAvailable === 'number' || b.unitsAvailable === null) update.unitsAvailable = b.unitsAvailable;

  // Floor details: UI sends totalFloors/parkingFloors/... at root; model stores in floorDetails.*
  const floorDetails: any = {};
  if (typeof b.totalFloors === 'number') floorDetails.totalFloors = b.totalFloors;
  if (typeof b.parkingFloors === 'number') floorDetails.floorsForParking = b.parkingFloors;
  if (typeof b.commercialFloors === 'number') floorDetails.floorsForCommercial = b.commercialFloors;
  if (typeof b.residentialFloors === 'number') floorDetails.floorsForResidential = b.residentialFloors;
  if (Object.keys(floorDetails).length > 0) update.floorDetails = floorDetails;

  // Society details: UI sends these at root; model stores in societyDetails.*
  const societyDetails: any = {};
  if (typeof b.totalLandArea === 'string' || typeof b.totalLandArea === 'number') {
    const n = Number(b.totalLandArea);
    societyDetails.totalLandArea = Number.isFinite(n) ? n : undefined;
  }
  if (typeof b.totalResidentialPlots === 'number') societyDetails.totalResidentialPlots = b.totalResidentialPlots;
  if (typeof b.totalCommercialPlots === 'number') societyDetails.totalCommercialPlots = b.totalCommercialPlots;
  if (typeof b.plotSizesOffered === 'string' || b.plotSizesOffered === null)
    societyDetails.plotSizesOffered = b.plotSizesOffered;
  if (typeof b.developmentStatus === 'string' || b.developmentStatus === null)
    societyDetails.developmentStatus = b.developmentStatus;
  if (Array.isArray(b.societyFacilities)) societyDetails.facilities = b.societyFacilities;
  if (Object.keys(societyDetails).length > 0) update.societyDetails = societyDetails;

  // Payment
  if (typeof b.saleMode === 'string' || b.saleMode === null) update.saleMode = b.saleMode;

  // These fields may not exist in schema today, but can exist in MongoDB and UI expects them:
  // We allow them explicitly (safe allowlist) and persist using collection.updateOne (bypass strict stripping).
  if (typeof b.paymentMeta === 'object' && b.paymentMeta !== null) update.paymentMeta = b.paymentMeta;
  if (typeof b.discountOffers === 'object' && b.discountOffers !== null) update.discountOffers = b.discountOffers;

  // Map UI fullPaymentInfo -> model fullPaymentInfo best-effort
  if (b.fullPaymentInfo === null) {
    update.fullPaymentInfo = null;
  } else if (typeof b.fullPaymentInfo === 'object' && b.fullPaymentInfo) {
    const fp = b.fullPaymentInfo;
    const fullPrice =
      typeof fp.finalPrice === 'number'
        ? fp.finalPrice
        : typeof fp.basePrice === 'number'
          ? fp.basePrice
          : typeof fp.fullPrice === 'number'
            ? fp.fullPrice
            : undefined;

    update.fullPaymentInfo = {
      ...(typeof fullPrice === 'number' ? { fullPrice } : {}),
      ...(typeof fp.areaSize === 'number' ? { areaSize: fp.areaSize } : {}),
      ...(typeof fp.areaUnit === 'string' ? { areaUnit: fp.areaUnit } : {}),
      ...(typeof fp.pricePerUnit === 'number' ? { pricePerUnit: fp.pricePerUnit } : {}),
    };

    // keep extra pricing breakdown for UI round-trips (explicit allowlist)
    update.fullPaymentInfoExtra = {
      ...(typeof fp.basePrice === 'number' ? { basePrice: fp.basePrice } : {}),
      ...(typeof fp.discountPercent === 'number' ? { discountPercent: fp.discountPercent } : {}),
      ...(typeof fp.discountAmount === 'number' ? { discountAmount: fp.discountAmount } : {}),
      ...(typeof fp.finalPrice === 'number' ? { finalPrice: fp.finalPrice } : {}),
      ...(typeof fp.notes === 'string' || fp.notes === null ? { notes: fp.notes } : {}),
    };
  }

  if (b.installmentPlan === null) {
    update.installmentPlan = null;
  } else if (typeof b.installmentPlan === 'object' && b.installmentPlan) {
    // allow round-trip extra fields used by UI (planDurationYears, installmentFrequency, etc.)
    update.installmentPlan = b.installmentPlan;
  }

  // Media / Map
  if (typeof b.featureImageUrl === 'string' || b.featureImageUrl === null) update.featureImageUrl = b.featureImageUrl;
  if (typeof b.droneVideoUrl === 'string' || b.droneVideoUrl === null) update.droneVideoUrl = b.droneVideoUrl;
  if (typeof b.virtualTourUrl === 'string' || b.virtualTourUrl === null) update.virtualTourUrl = b.virtualTourUrl;
  if (typeof b.googleMapLink === 'string' || b.googleMapLink === null) update.googleMapLink = b.googleMapLink;
  if (typeof b.coordinatesRaw === 'string' || b.coordinatesRaw === null) update.coordinatesRaw = b.coordinatesRaw;

  // Completed projects (UI sends without images; keep existing images if present)
  if (Array.isArray(b.completedProjects)) {
    update.completedProjects = b.completedProjects.map((p: any) => ({
      name: typeof p?.name === 'string' ? p.name.trim() : '',
      type: typeof p?.type === 'string' ? p.type : undefined,
      location: typeof p?.location === 'string' ? p.location.trim() : '',
      year: typeof p?.year === 'number' ? p.year : p?.year == null ? undefined : Number(p.year),
      // do not allow arbitrary images injection from this form today
      images: Array.isArray(p?.images) ? p.images : [],
    }));
  }

  // Documents / Floor plans / Unit plans
  if (typeof b.projectDocuments === 'object' && b.projectDocuments !== null) update.projectDocuments = b.projectDocuments;
  if (Array.isArray(b.buildingFloorPlans)) update.buildingFloorPlans = b.buildingFloorPlans;
  if (Array.isArray(b.unitTypeBreakdown)) update.unitTypeBreakdown = b.unitTypeBreakdown;
  if (Array.isArray(b.unitPlans)) update.unitTypeBreakdown = b.unitPlans;

  // Construction updates: keep as a separate field for UI round-trips today
  // (Model uses developmentUpdates with required title/date; we avoid forcing that and breaking saves.)
  if (Array.isArray(b.constructionUpdates)) {
    update.constructionUpdates = b.constructionUpdates.map((u: any) => ({
      date: typeof u?.date === 'string' ? u.date : '',
      progressPercent: u?.progressPercent != null ? String(u.progressPercent) : '',
      title: typeof u?.title === 'string' ? u.title : '',
      description: typeof u?.description === 'string' ? u.description : '',
      videoUrl: typeof u?.videoUrl === 'string' ? u.videoUrl : '',
      imageUrl: typeof u?.imageUrl === 'string' ? u.imageUrl : '',
    }));
  }

  update.updatedAt = new Date();

  return update;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  setSecurityHeaders(res);

  const method = String(req.method || 'GET').toUpperCase();
  const ip = getClientIp(req);

  // Rate limit
  if (method === 'GET') {
    const rl = bumpRate(`dash:projects:id:get:${ip}`, RL_MAX_GET);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfterSec));
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again.' });
    }
  } else if (method === 'PUT') {
    const rl = bumpRate(`dash:projects:id:put:ip:${ip}`, RL_MAX_PUT_IP);
    if (!rl.ok) {
      res.setHeader('Retry-After', String(rl.retryAfterSec));
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again.' });
    }
  }

  if (method !== 'GET' && method !== 'PUT') {
    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const auth = await requireSession(req, res);
  if (!auth.ok) return;

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!id) return res.status(400).json({ success: false, message: 'Project ID is required' });

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID format.' });
  }

  try {
    await dbConnect();

    const gate = await enforceActiveAndCnicIfPossible(auth.userId, auth.isAdmin);
    if (!gate.ok) {
      return res.status(gate.status).json({ success: false, message: gate.message });
    }

    const project: any = await (Project as any)
      .findById(id)
      .select(
        [
          '_id',
          'developerId',
          'projectCategory',
          'projectNature',
          'projectType',
          'projectName',
          'title',
          'tagline',
          'shortDescription',
          'description',
          'city',
          'area',
          'specificLocation',
          'projectStatus',
          'launchDate',
          'developmentProgress',
          'expectedCompletionDate',
          'possessionStartDate',

          'approvalAuthority',
          'isApproved',
          'nocStatus',
          'nocNumber',
          'societyRegistrationNumber',
          'environmentClearance',
          'buildingPlanApproved',

          'totalArea',
          'totalBlocks',
          'totalUnits',
          'unitsSold',
          'unitsAvailable',

          'floorDetails',
          'societyDetails',

          'saleMode',
          'fullPaymentInfo',
          'fullPaymentInfoExtra',
          'installmentPlan',
          'paymentMeta',
          'discountOffers',

          'unitTypeBreakdown',
          'unitPlans',

          'featureImageUrl',
          'featureImagePublicId',
          'images',
          'gallery',
          'progressImages',

          'projectDocuments',
          'buildingFloorPlans',

          'droneVideoUrl',
          'virtualTourUrl',
          'googleMapLink',
          'coordinatesRaw',
          'coordinates',
          'location',

          'completedProjects',
          'constructionUpdates',
          'developmentUpdates',

          'isDeleted',
          'deletedAt',
        ].join(' ')
      )
      .lean();

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const ownerId = String(project.developerId || '');
    const isOwner = ownerId && ownerId === String(auth.userId);

    // Anti-enumeration
    if (!auth.isAdmin && !isOwner) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const projectDeleted = project.isDeleted === true || !!project.deletedAt;
    if (projectDeleted && !auth.isAdmin) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (method === 'GET') {
      return res.status(200).json({ success: true, project: buildDashboardProjectView(project) });
    }

    // PUT
    const userRL = bumpRate(`dash:projects:id:put:user:${auth.userId}`, RL_MAX_PUT_USER);
    if (!userRL.ok) {
      res.setHeader('Retry-After', String(userRL.retryAfterSec));
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again.' });
    }

    const body = safeJsonBody(req);
    const isFullUpdate = body?.isFullUpdate === true;

    if (!isFullUpdate) {
      return res.status(400).json({ success: false, message: 'Invalid update mode' });
    }

    const allowedUpdate = buildAllowedUpdate(body);

    // Write using native collection update to avoid strict stripping of allowed extra fields
    await (Project as any).collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: allowedUpdate }
    );

    const updated: any = await (Project as any)
      .findById(id)
      .select(
        [
          '_id',
          'developerId',
          'projectCategory',
          'projectNature',
          'projectType',
          'projectName',
          'title',
          'tagline',
          'shortDescription',
          'description',
          'city',
          'area',
          'specificLocation',
          'projectStatus',
          'launchDate',
          'developmentProgress',
          'expectedCompletionDate',
          'possessionStartDate',

          'approvalAuthority',
          'isApproved',
          'nocStatus',
          'nocNumber',
          'societyRegistrationNumber',
          'environmentClearance',
          'buildingPlanApproved',

          'totalArea',
          'totalBlocks',
          'totalUnits',
          'unitsSold',
          'unitsAvailable',

          'floorDetails',
          'societyDetails',

          'saleMode',
          'fullPaymentInfo',
          'fullPaymentInfoExtra',
          'installmentPlan',
          'paymentMeta',
          'discountOffers',

          'unitTypeBreakdown',
          'unitPlans',

          'featureImageUrl',
          'featureImagePublicId',
          'images',
          'gallery',
          'progressImages',

          'projectDocuments',
          'buildingFloorPlans',

          'droneVideoUrl',
          'virtualTourUrl',
          'googleMapLink',
          'coordinatesRaw',
          'coordinates',
          'location',

          'completedProjects',
          'constructionUpdates',
          'developmentUpdates',

          'isDeleted',
          'deletedAt',
        ].join(' ')
      )
      .lean();

    return res.status(200).json({
      success: true,
      project: buildDashboardProjectView(updated),
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, message: 'Something went wrong' });
  }
}