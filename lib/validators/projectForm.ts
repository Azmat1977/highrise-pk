// lib/validators/projectForm.ts
//
// HIGHRISE — Shared project form contract (POST create + PATCH update).
// SINGLE SOURCE OF TRUTH — created after the V5 API rewrite broke both
// form pipelines (minimal wizard schema vs rich form payloads).
//
// Contains:
//   → ProjectContentSchema (all form fields, form-flat shape)
//   → ProjectCreateSchema  (content + required base)
//   → ProjectPatchSchema   (content + workflow flags)
//   → applyProjectContentFields() — form-flat → model mapping
//     (floorDetails/societyDetails nesting, coordinates parse,
//      developmentUpdates + completedProjects transforms)
//
// RULES: model is canonical. Forms send flat. This module is the only
// place that translates. Never duplicate these schemas.

import { z } from 'zod';

// ─── Leaf helpers ───────────────────────────────────────────────────────────

const trimmed          = (max: number) => z.string().trim().max(max);
const nullableTrimmed  = (max: number) => trimmed(max).nullable();
const nullableCount    = z.number().int().min(0).nullable();
const dateStr          = z.string().max(30).nullable(); // 'YYYY-MM-DD' | null (Mongoose casts)

const PROJECT_TYPE_MAP: Record<string, string> = {
  residential: 'Residential',
  commercial:  'Commercial',
  mixed:       'Mixed Use',
};

// ─── List item schemas (form-flat input shapes) ─────────────────────────────

export const DevelopmentUpdateInputSchema = z.object({
  date:            dateStr,
  progressPercent: z.number().min(0).max(100).nullable(),
  title:           nullableTrimmed(150),
  description:     nullableTrimmed(2000),
  videoUrl:        nullableTrimmed(2048),
  imageUrl:        nullableTrimmed(2048),
  // Phase 2 forward-compat (accepted when forms send them)
  images: z.array(z.object({
    url:       z.string().url().max(2048),
    publicId:  z.string().max(512).optional(),
    caption:   z.string().max(200).optional(),
  })).max(20).optional(),
  isDroneUpdate: z.boolean().optional(),
  engineerNote:  z.string().max(1000).nullable().optional(),
  qualityChecks: z.array(z.string().max(100)).max(20).optional(),
});

export const CompletedProjectInputSchema = z.object({
  name:     trimmed(80),
  type:     nullableTrimmed(30),
  location: nullableTrimmed(80),
  year:     z.number().int().min(1800).max(2200).nullable(),
  image:    z.string().url().max(2048).nullable().optional(),
  images:   z.array(z.string().max(2048)).max(10).optional(),
});

export const AmenityInputSchema = z.object({
  name:        trimmed(100),
  category:    z.string().max(40).optional(),
  description: nullableTrimmed(500).optional(),
});

export const NearbyFacilityInputSchema = z.object({
  name:     trimmed(100),
  category: z.string().max(40).optional(),
  distance: nullableTrimmed(40).optional(),
});

export const LocationAdvantageInputSchema = z.object({
  title:  trimmed(150),
  points: z.array(z.string().max(200)).max(20).optional(),
});

const FloorPlanInputSchema = z.object({
  floorName:    trimmed(80),
  floorNumber:  nullableCount.optional(),
  floorType:    nullableTrimmed(50).optional(),
  pdfUrl:       z.string().url().max(2048).nullable().optional(),
  imageUrl:     z.string().url().max(2048).nullable().optional(),
  description:  nullableTrimmed(1000).optional(),
});

const DocumentsInputSchema = z.object({
  brochureUrl:       z.string().url().max(2048).nullable().optional(),
  brochurePublicId:  z.string().max(512).nullable().optional(),
  priceListUrl:      z.string().url().max(2048).nullable().optional(),
  priceListPublicId: z.string().max(512).nullable().optional(),
  masterPlanUrl:     z.string().url().max(2048).nullable().optional(),
  masterPlanPublicId: z.string().max(512).nullable().optional(),
  paymentPlanUrl:    z.string().url().max(2048).nullable().optional(),
  paymentPlanPublicId: z.string().max(512).nullable().optional(),
});

const UnitTypeInputSchema = z.object({
  type:           nullableTrimmed(80).optional(),
  name:           nullableTrimmed(80).optional(),
  category:       z.enum(['residential', 'commercial']).nullable().optional(),
  totalUnits:     nullableCount.optional(),
  availableUnits: nullableCount.optional(),
  soldUnits:      nullableCount.optional(),
  minPrice:       z.number().min(0).nullable().optional(),
  maxPrice:       z.number().min(0).nullable().optional(),
  priceRange:     z.object({ min: z.number().min(0), max: z.number().min(0) }).nullable().optional(),
  minArea:        z.number().min(0).nullable().optional(),
  maxArea:        z.number().min(0).nullable().optional(),
  areaUnit:       nullableTrimmed(20).optional(),
  areaRange:      z.object({ min: z.number().min(0), max: z.number().min(0), unit: z.string().max(20) }).nullable().optional(),
  bedrooms:       z.number().int().min(0).max(20).nullable().optional(),
  bathrooms:      z.number().int().min(0).max(20).nullable().optional(),
  description:    nullableTrimmed(1000).optional(),
  features:       z.array(z.string().max(100)).max(30).optional(),
  image:          z.string().url().max(2048).nullable().optional(),
  imageUrl:       z.string().url().max(2048).nullable().optional(),
  floorPlanPdfUrl: z.string().url().max(2048).nullable().optional(),
});

// ─── Payment (canonical = edit form's computed shape) ───────────────────────

export const InstallmentPlanInputSchema = z.object({
  totalPrice:          z.number().min(0).optional(),
  bookingAmount:       z.number().min(0).optional(),
  bookingPercent:      z.number().min(0).max(100).optional(),
  downPayment:         z.number().min(0).optional(),
  downPaymentPercent:  z.number().min(0).max(100).optional(),
  possessionAmount:    z.number().min(0).optional(),
  possessionPercent:   z.number().min(0).max(100).optional(),
  monthlyAmount:       z.number().min(0).optional(),
  monthlyDuration:     z.number().int().min(0).optional(),
  quarterlyAmount:     z.number().min(0).optional(),
  quarterlyDuration:   z.number().int().min(0).optional(),
  halfYearlyAmount:    z.number().min(0).optional(),
  halfYearlyDuration:  z.number().int().min(0).optional(),
  yearlyAmount:        z.number().min(0).optional(),
  yearlyDuration:      z.number().int().min(0).optional(),
  planDurationYears:   z.number().min(0).max(60).optional(),
  installmentFrequency: z.enum(['monthly', 'quarterly', 'halfYearly', 'yearly']).optional(),
  totalInstallments:   z.number().int().min(0).optional(),
  installmentAmount:   z.number().min(0).optional(),
  notes:               nullableTrimmed(500).optional(),
}).nullable();

const FullPaymentInputSchema = z.object({
  basePrice:      z.number().min(0).optional(),
  fullPrice:      z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountAmount: z.number().min(0).optional(),
  finalPrice:     z.number().min(0).optional(),
  areaSize:       z.number().min(0).optional(),
  areaUnit:       z.string().max(20).optional(),
  pricePerUnit:   z.number().min(0).optional(),
  notes:          nullableTrimmed(500).optional(),
}).nullable();

const DiscountOffersInputSchema = z.object({
  fullCashDiscount: z.object({
    enabled:        z.boolean().optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    description:    nullableTrimmed(500).optional(),
  }).optional(),
  advanceInstallmentDiscount: z.object({
    enabled:        z.boolean().optional(),
    advanceMonths:  z.number().int().min(0).max(120).optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    description:    nullableTrimmed(500).optional(),
  }).optional(),
  downPaymentBonus: z.object({
    enabled:        z.boolean().optional(),
    minDownPercent: z.number().min(0).max(100).optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    description:    nullableTrimmed(500).optional(),
  }).optional(),
  earlyBirdOffer: z.object({
    enabled:        z.boolean().optional(),
    discountPercent: z.number().min(0).max(100).optional(),
    description:    nullableTrimmed(500).optional(),
    validFrom:      dateStr.optional(),
    validTill:      dateStr.optional(),
  }).optional(),
  customOffers: z.array(z.object({
    title:         trimmed(100),
    discountType:  z.enum(['percent', 'fixed']).optional(),
    discountValue: z.number().min(0).optional(),
    description:   nullableTrimmed(500).optional(),
    validFrom:     dateStr.optional(),
    validTill:     dateStr.optional(),
    isActive:      z.boolean().optional(),
  })).max(10).optional(),
});

// ─── Content schema (form-flat; everything optional — superset base) ────────

export const ProjectContentSchema = z.object({
  // Identity / copy
  projectName:      trimmed(120).optional(),
  title:            nullableTrimmed(120).optional(),
  tagline:          nullableTrimmed(200).optional(),
  shortDescription: nullableTrimmed(500).optional(),
  description:      nullableTrimmed(10000).optional(),
  projectStatus:    trimmed(40).optional(),

  // Location
  city:             trimmed(80).optional(),
  area:             nullableTrimmed(120).optional(),
  areaName:         nullableTrimmed(120).optional(),
  location:         nullableTrimmed(120).optional(),
  specificLocation: nullableTrimmed(200).optional(),
  googleMapLink:    nullableTrimmed(2048).optional(),
  coordinatesRaw:   nullableTrimmed(60).optional(),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),

  // Classification
  projectCategory: z.enum([
    'highrise', 'society', 'mixed_use', 'commercial_plaza',
    'townhouse', 'gated_community', 'high_rise', 'housing_society',
    'farmhouse_community', 'industrial_park',
  ]).optional(),
  projectNature: z.enum(['residential', 'commercial', 'mixed']).optional(),
  projectType:   nullableTrimmed(30).optional(),

  // Timeline
  launchDate:             dateStr.optional(),
  expectedCompletionDate: dateStr.optional(),
  possessionStartDate:    dateStr.optional(),
  developmentProgress:    z.number().min(0).max(100).optional(),

  // Legal
  approvalAuthority:         nullableTrimmed(50).optional(),
  isApproved:                nullableTrimmed(20).optional(),
  nocStatus:                 nullableTrimmed(20).optional(),
  nocNumber:                 nullableTrimmed(60).optional(),
  societyRegistrationNumber: nullableTrimmed(60).optional(),
  environmentClearance:      z.boolean().optional(),
  buildingPlanApproved:      z.boolean().optional(),

  // Scale — top-level in model
  totalArea:       nullableTrimmed(80).optional(),
  totalBlocks:     nullableCount.optional(),
  totalUnits:      nullableCount.optional(),
  unitsSold:       nullableCount.optional(),
  unitsAvailable:  nullableCount.optional(),

  // Scale — flat form → nested model (floorDetails)
  totalFloors:      nullableCount.optional(),
  parkingFloors:    nullableCount.optional(),
  commercialFloors: nullableCount.optional(),
  residentialFloors: nullableCount.optional(),

  // Society — flat form → nested model (societyDetails)
  totalLandArea:         nullableTrimmed(40).optional(),
  totalResidentialPlots: nullableCount.optional(),
  totalCommercialPlots:  nullableCount.optional(),
  plotSizesOffered:      nullableTrimmed(120).optional(),
  developmentStatus:     nullableTrimmed(20).optional(),
  societyFacilities:     z.array(z.string().max(40)).max(20).optional(),

  // Pricing
  minPrice:       z.number().min(0).nullable().optional(),
  maxPrice:       z.number().min(0).nullable().optional(),
  priceRangeText: nullableTrimmed(100).optional(),
  saleMode:       trimmed(30).optional(),
  paymentMeta: z.object({
    representativeUnitType: nullableTrimmed(80).optional(),
    priceDisclaimer:        nullableTrimmed(200).optional(),
  }).optional(),
  installmentPlan: InstallmentPlanInputSchema.optional(),
  fullPaymentInfo: FullPaymentInputSchema.optional(),
  discountOffers:  DiscountOffersInputSchema.optional(),

  // Media
  featureImageUrl:     nullableTrimmed(2048).optional(),
  featureImagePublicId: nullableTrimmed(512).optional(),
  droneVideoUrl:       nullableTrimmed(2048).optional(),
  virtualTourUrl:      nullableTrimmed(2048).optional(),

  // Lists
  developmentUpdates:  z.array(DevelopmentUpdateInputSchema).max(100).optional(),
  amenitiesDetailed:   z.array(AmenityInputSchema).max(60).optional(),
  nearbyFacilities:    z.array(NearbyFacilityInputSchema).max(40).optional(),
  locationAdvantages:  z.array(LocationAdvantageInputSchema).max(20).optional(),
  completedProjects:  z.array(CompletedProjectInputSchema).max(50).optional(),
  projectDocuments:   DocumentsInputSchema.optional(),
  buildingFloorPlans: z.array(FloorPlanInputSchema).max(30).optional(),
  unitTypeBreakdown:  z.array(UnitTypeInputSchema).max(50).optional(),
});

export type ProjectContentInput = z.infer<typeof ProjectContentSchema>;

// ─── PATCH (content + workflow flags) ───────────────────────────────────────

export const ProjectPatchSchema = ProjectContentSchema.extend({
  submitForReview: z.boolean().optional(),
  isFullUpdate:    z.boolean().optional(),
});

export type ProjectPatchInput = z.infer<typeof ProjectPatchSchema>;

// ─── Mapping: form-flat → model shape ───────────────────────────────────────

const DIRECT_KEYS = [
  'projectName', 'title', 'tagline', 'shortDescription', 'description',
  'projectStatus', 'city', 'location', 'specificLocation', 'googleMapLink',
  'projectCategory', 'projectNature',
  'launchDate', 'expectedCompletionDate', 'possessionStartDate',
  'developmentProgress',
  'approvalAuthority', 'isApproved', 'nocStatus', 'nocNumber',
  'societyRegistrationNumber', 'environmentClearance', 'buildingPlanApproved',
  'totalArea', 'totalBlocks', 'totalUnits', 'unitsSold', 'unitsAvailable',
  'minPrice', 'maxPrice', 'priceRangeText', 'saleMode',
  'paymentMeta', 'installmentPlan', 'fullPaymentInfo', 'discountOffers',
  'featureImageUrl', 'featureImagePublicId', 'droneVideoUrl', 'virtualTourUrl',
  'projectDocuments', 'buildingFloorPlans', 'unitTypeBreakdown',
  'amenitiesDetailed', 'nearbyFacilities', 'locationAdvantages',
] as const;

/**
 * applyProjectContentFields
 * Writes validated form-flat fields onto a Mongoose document (or plain
 * object for create payloads). Handles: direct keys, area sync,
 * projectType normalization, coordinatesRaw parse, floorDetails /
 * societyDetails nesting, developmentUpdates + completedProjects transforms.
 */
export function applyProjectContentFields(
  doc: Record<string, unknown>,
  data: ProjectContentInput,
): void {
  // Direct keys
  for (const key of DIRECT_KEYS) {
    if (data[key] !== undefined) doc[key] = data[key];
  }

  // area ↔ areaName sync (model keeps both; display prefers areaName)
  if (data.areaName !== undefined) {
    doc.areaName = data.areaName;
    doc.area = data.areaName;
  } else if (data.area !== undefined) {
    doc.area = data.area;
    doc.areaName = data.area;
  }

  // projectType normalization (create form sends lowercase nature value)
  if (data.projectType !== undefined && data.projectType) {
    doc.projectType = PROJECT_TYPE_MAP[data.projectType] ?? data.projectType;
  } else if (data.projectType === null) {
    doc.projectType = undefined;
  }

  // coordinates (object form wins; coordinatesRaw parsed form)
  if (data.coordinates !== undefined) doc.coordinates = data.coordinates;
  if (data.coordinatesRaw !== undefined && data.coordinatesRaw) {
    const m = String(data.coordinatesRaw).match(
      /^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/
    );
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[3]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        doc.coordinates = { lat, lng };
      }
    }
  }

  // floorDetails nesting
  const hasFloorInput =
    data.totalFloors !== undefined || data.parkingFloors !== undefined ||
    data.commercialFloors !== undefined || data.residentialFloors !== undefined;
  if (hasFloorInput) {
    const existing = (doc.floorDetails as Record<string, unknown> | undefined) ?? {};
    doc.floorDetails = {
      ...existing,
      ...(data.totalFloors !== undefined ? { totalFloors: data.totalFloors ?? undefined } : {}),
      ...(data.parkingFloors !== undefined ? { floorsForParking: data.parkingFloors ?? undefined } : {}),
      ...(data.commercialFloors !== undefined ? { floorsForCommercial: data.commercialFloors ?? undefined } : {}),
      ...(data.residentialFloors !== undefined ? { floorsForResidential: data.residentialFloors ?? undefined } : {}),
    };
  }

  // societyDetails nesting
  const hasSocietyInput =
    data.totalLandArea !== undefined || data.totalResidentialPlots !== undefined ||
    data.totalCommercialPlots !== undefined || data.plotSizesOffered !== undefined ||
    data.developmentStatus !== undefined || data.societyFacilities !== undefined;
  if (hasSocietyInput) {
    const existing = (doc.societyDetails as Record<string, unknown> | undefined) ?? {};
    const next: Record<string, unknown> = { ...existing };
    if (data.totalLandArea !== undefined) {
      // Phase 2 upgrades this to number+unit input; parse numeric for now
      const n = Number(String(data.totalLandArea ?? '').replace(/[^\d.]/g, ''));
      next.totalLandArea = Number.isFinite(n) && n > 0 ? n : undefined;
    }
    if (data.totalResidentialPlots !== undefined) next.totalResidentialPlots = data.totalResidentialPlots ?? undefined;
    if (data.totalCommercialPlots !== undefined)  next.totalCommercialPlots = data.totalCommercialPlots ?? undefined;
    if (data.plotSizesOffered !== undefined)      next.plotSizesOffered = data.plotSizesOffered ?? undefined;
    if (data.developmentStatus !== undefined)     next.developmentStatus = data.developmentStatus ?? undefined;
    if (data.societyFacilities !== undefined)     next.societyFacilities = data.societyFacilities;
    doc.societyDetails = next;
    // Belt-and-suspenders: legacy flat read path
    doc.societyFacilities = data.societyFacilities ?? [];
  }

  // developmentUpdates — flat form shape → model shape
  if (data.developmentUpdates !== undefined) {
    doc.developmentUpdates = data.developmentUpdates.map((u) => ({
      title:           u.title ?? '',
      date:            u.date ? new Date(u.date) : undefined,
      description:     u.description ?? undefined,
      images:          u.images ?? (u.imageUrl ? [{ url: u.imageUrl }] : []),
      videoUrl:        u.videoUrl ?? undefined,
      progressPercent: u.progressPercent ?? undefined,
      isDroneUpdate:   u.isDroneUpdate ?? false,
      engineerNote:    u.engineerNote ?? undefined,
      qualityChecks:   u.qualityChecks,
    }));
  }

  // completedProjects — images[] fallback → image (model display field)
  if (data.completedProjects !== undefined) {
    doc.completedProjects = data.completedProjects.map((p) => ({
      name:     p.name,
      type:     p.type ?? undefined,
      location: p.location ?? undefined,
      year:     p.year ?? undefined,
      image:    p.image ?? p.images?.[0],
    }));
  }
}