// pages/api/owner/listings/index.ts
// GET  → owner's listings with pagination + filters
// POST → create new listing (approved owners only, max 10)

import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect             from "@/lib/dbConnect";
import Property              from "@/models/Property";
import OwnerProfile          from "@/models/OwnerProfile";
import { requireAuth }       from "@/lib/requireAuth";
import { rateLimitApi, sendRateLimitResponse }         from "@/lib/rateLimit";

interface OwnerActor {
  id:     string;
  name?:  string;
  email?: string;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").trim().slice(0, 80);
}

// ─── GET handler ─────────────────────────────────────────────────────────────

async function handleGet(
  req:  NextApiRequest,
  res:  NextApiResponse,
  user: OwnerActor,
): Promise<void> {
  const {
    page      = "1",
    limit     = "12",
    status    = "all",
    search    = "",
    countOnly = "false",
  } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const skip     = (pageNum - 1) * limitNum;

  // Build query
  const query: Record<string, unknown> = {
    owner:     user.id,
    isDeleted: false,
  };

  // Status filter maps verification.status
  if (status && status !== "all") {
    query["verification.status"] = status;
  }

  // Search filter
  if (search && typeof search === "string" && search.trim()) {
    const safe = escapeRegex(search);
    if (safe.length >= 2) {
      const searchRegex = new RegExp(safe, "i");
      query["$or"] = [
        { title:   searchRegex },
        { city:    searchRegex },
        { society: searchRegex },
      ];
    }
  }

  // Count only (for layout listing count)
  if (countOnly === "true") {
    const total = await Property.countDocuments(query);
    res.status(200).json({ success: true, total, count: total });
    return;
  }

  const [properties, total] = await Promise.all([
    Property.find(query)
      .select([
        "_id", "title", "slug", "price", "area", "unit",
        "city", "society", "locality", "phase", "block",
        "propertyType", "propertyCategory", "residentialType",
        "listingType", "bedrooms", "bathrooms",
        "verification", "status",
        "images", "featureImageUrl",
        "views", "favoriteCount", "inquiryCount",
        "createdAt", "updatedAt",
      ].join(" "))
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Property.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    properties,
    pagination: {
      page:       pageNum,
      limit:      limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

// ─── POST handler ─────────────────────────────────────────────────────────────

async function handlePost(
  req:  NextApiRequest,
  res:  NextApiResponse,
  user: OwnerActor,
): Promise<void> {
  // Check owner is approved
  const ownerProfile = await OwnerProfile.findOne({
    userId: user.id,
  }).lean<{ status: string }>();

  if (!ownerProfile) {
    res.status(403).json({
      error: "Owner profile not found. Please complete verification first.",
    });
    return;
  }

  if (ownerProfile.status !== "approved") {
    res.status(403).json({
      error: `Your owner account is ${ownerProfile.status}. Only approved owners can create listings.`,
    });
    return;
  }

  // Check listing limit (max 10)
  const listingCount = await Property.countDocuments({
    owner:     user.id,
    isDeleted: false,
  });

  const LISTING_LIMIT = 10;

  if (listingCount >= LISTING_LIMIT) {
    res.status(403).json({
      error: `You have reached the maximum listing limit of ${LISTING_LIMIT} properties.`,
      code:  "LISTING_LIMIT_REACHED",
      limit: LISTING_LIMIT,
      used:  listingCount,
    });
    return;
  }

  // Validate required fields
  const {
    title,
    propertyType,
    propertyCategory,
    listingType,
    price,
    area,
    unit,
    city,
    society,
    description,
    // Optional - basic
    residentialType,
    listingPurpose,
    phase,
    block,
    bedrooms,
    bathrooms,
    priceNegotiable,
    images,
    contactDetails,
    amenities,
    // Enterprise - size and details
    areaSize,
    frontSize,
    depthSize,
    coveredArea,
    servantQuarters,
    parkings,
    floors,
    floorNumber,
    propertyAge,
    facing,
    cornerPlot,
    boundaryWall,
    furnishingStatus,
    possessionStatus,
    // Enterprise - pricing
    monthlyRent,
    securityDeposit,
    advanceMonths,
    utilitiesIncluded,
    installmentPlan,
    // Enterprise - utilities
    electricityStatus,
    suiGasStatus,
    waterStatus,
    sewerageStatus,
    internetReady,
    cctvCoverage,
    streetLights,
    roadCondition,
    gatedCommunity,
    // Enterprise - legal
    ownershipType,
    fileType,
    documentsAvailable,
    hasDispute,
    disputeDetails,
    taxPaidUpToDate,
    societyMembershipRequired,
    // Enterprise - media
    featureImageUrl,
    featureImagePublicId,
    videoUrl,
    virtualTourUrl,
    droneVideoUrl,
    // Contact extra
    showPhoneOnListing,
  } = req.body as Record<string, unknown>;

  // Required field validation
  const errors: string[] = [];
  if (!title || typeof title !== "string" || title.trim().length < 10) {
    errors.push("Title must be at least 10 characters");
  }
  if (!propertyType || typeof propertyType !== "string") {
    errors.push("Property type is required");
  }
  if (!listingType || !["full_payment","installment","rent","pre_launch"].includes(String(listingType))) {
    errors.push("Valid listing type is required");
  }
  if (!price || isNaN(Number(price)) || Number(price) < 0) {
    errors.push("Valid price is required");
  }
  if (!area || isNaN(Number(area)) || Number(area) <= 0) {
    errors.push("Valid area is required");
  }
  if (!unit || typeof unit !== "string") {
    errors.push("Area unit is required");
  }
  if (!city || typeof city !== "string") {
    errors.push("City is required");
  }
  if (!society || typeof society !== "string") {
    errors.push("Society/Location is required");
  }
  if (!description || typeof description !== "string" || description.trim().length < 50) {
    errors.push("Description must be at least 50 characters");
  }

  if (errors.length > 0) {
    res.status(400).json({ error: "Validation failed", details: errors });
    return;
  }

  // Validate images array
  const safeImages = Array.isArray(images)
    ? (images as Array<{ url: string; public_id: string }>)
        .filter((img) => img?.url && img?.public_id)
        .slice(0, 10)
        .map((img, idx) => ({
          url:       String(img.url).trim(),
          public_id: String(img.public_id).trim(),
          isPrimary: idx === 0,
          order:     idx,
        }))
    : [];

  // Validate contact details
  const safeContact =
    contactDetails && typeof contactDetails === "object"
      ? {
          personName:    String((contactDetails as Record<string,unknown>).personName  ?? user.name  ?? "").trim(),
          primaryPhone:  String((contactDetails as Record<string,unknown>).primaryPhone ?? "").trim(),
          whatsappNumber:String((contactDetails as Record<string,unknown>).whatsappNumber ?? "").trim(),
          email:         String((contactDetails as Record<string,unknown>).email ?? user.email ?? "").trim(),
          showPhoneOnListing:    true,
          allowWhatsappMessages: true,
        }
      : undefined;

  // Create the property
  // ── Installment amounts computed server-side (schema 1746-1781: amount-based) ──
  let instCalc: null | {
    total: number; bPct: number; dPct: number; pPct: number; count: number; freq: string;
    bookingAmt: number; downAmt: number; possAmt: number; perInst: number; durMonths: number;
  } = null;
  if (installmentPlan && typeof installmentPlan === "object") {
    const ip    = installmentPlan as Record<string, unknown>;
    const total = Number(ip.totalPrice) || 0;
    const bPct  = Number(ip.bookingPercent) || 0;
    const dPct  = Number(ip.downPaymentPercent) || 0;
    const pPct  = Number(ip.possessionPercent) || 0;
    const count = Number(ip.installmentCount) || 0;
    const freq  = String(ip.frequency ?? "quarterly");
    const bookingAmt = Math.round((total * bPct) / 100);
    const downAmt    = Math.round((total * dPct) / 100);
    const possAmt    = Math.round((total * pPct) / 100);
    const remaining  = Math.max(total - bookingAmt - downAmt - possAmt, 0);
    instCalc = {
      total, bPct, dPct, pPct, count, freq,
      bookingAmt, downAmt, possAmt,
      perInst:   count > 0 ? Math.round(remaining / count) : 0,
      durMonths: count * (freq === "monthly" ? 1 : freq === "quarterly" ? 3 : 6),
    };
  }

  const property = await Property.create({
    // Ownership
    owner:     user.id,
    createdBy: user.id,

    // Classification
    propertyKind:    "standalone",
    propertyCategory: propertyCategory ?? "residential",
    propertyType:    String(title).trim().toLowerCase().includes("shop") ? "Shop" : String(propertyType).trim(),
    residentialType: residentialType ?? undefined,
    listingType:     listingType,
    listingPurpose:  listingPurpose ?? undefined,

    // Core
    title:       String(title).trim(),
    description: String(description).trim(),

    // Pricing — rent listings have no sale price; avoid NaN
    price:           listingType === "rent" ? 0 : (Number(price) || 0),
    priceNegotiable: Boolean(priceNegotiable),

    // Size
    area: Number(area),
    unit: String(unit).trim(),

    // Location
    city:    String(city).trim(),
    society: String(society).trim(),
    phase:   phase ? String(phase).trim() : undefined,
    block:   block ? String(block).trim() : undefined,

    // Rooms
    bedrooms:  bedrooms  ? Number(bedrooms)  : undefined,
    bathrooms: bathrooms ? Number(bathrooms) : undefined,

    // Enterprise - size and details (schema-exact paths — Mongoose strips unknown keys)
    plotWidth:       frontSize ? Number(frontSize) : undefined,
    plotDepth:       depthSize ? Number(depthSize) : undefined,
    coveredArea:     coveredArea ? Number(coveredArea) : undefined,
    coveredAreaUnit: coveredArea ? String(unit).trim() : undefined,
    servantQuarter:      Number(servantQuarters) > 0 ? true : undefined,
    servantQuarterRooms: Number(servantQuarters) > 0 ? Number(servantQuarters) : undefined,
    parking:         parkings ? String(Number(parkings)) : undefined,
    floors:          floors ? Number(floors) : undefined,
    floorNumber:     floorNumber ? Number(floorNumber) : undefined,
    facing:          facing ? String(facing).trim() : undefined,
    facingDirection: facing ? String(facing).trim() : undefined,
    isCornerPlot:    cornerPlot === true ? true : undefined,
    hasBoundaryWall: boundaryWall === true ? true : undefined,
    furnished: (() => {
      const f = String(furnishingStatus ?? "");
      if (f === "furnished") return "fully_furnished";
      if (f === "semi-furnished") return "semi_furnished";
      if (f === "unfurnished") return "unfurnished";
      return undefined;
    })(),
    possessionStatus: possessionStatus
      ? ["ready","under_construction","on_handover"].includes(String(possessionStatus))
        ? String(possessionStatus)
        : "ready"
      : undefined,

    // Enterprise - rental pricing (nested — schema rentalDetails, Property.ts 2209-2235)
    rentalDetails: listingType === "rent" ? {
      monthlyRent:       Number(monthlyRent) || 0,
      securityDeposit:   Number(securityDeposit) || undefined,
      advanceMonths:     Number(advanceMonths) || undefined,
      utilitiesIncluded: utilitiesIncluded === true ? true : undefined,
    } : undefined,

    // Enterprise - installment plan (values from instCalc, computed above the create call;
    // schema 1746-1781: booking / downPayment / installmentPlan / possession are TOP-LEVEL keys)
    ...(instCalc ? {
      listingPurpose: "new_booking",
      pricePerUnit:   instCalc.total > 0 && Number(area) > 0 ? Math.round(instCalc.total / Number(area)) : undefined,
      booking:     { amount: instCalc.bookingAmt, percent: instCalc.bPct, status: "open" },
      downPayment: { amount: instCalc.downAmt, percent: instCalc.dPct, inInstallments: false },
      installmentPlan: {
        hasMonthly:       instCalc.freq === "monthly",
        monthlyAmount:    instCalc.freq === "monthly"     ? instCalc.perInst : undefined,
        monthlyCount:     instCalc.freq === "monthly"     ? instCalc.count   : undefined,
        hasQuarterly:     instCalc.freq === "quarterly",
        quarterlyAmount:  instCalc.freq === "quarterly"   ? instCalc.perInst : undefined,
        quarterlyCount:   instCalc.freq === "quarterly"   ? instCalc.count   : undefined,
        hasHalfYearly:    instCalc.freq === "half-yearly",
        halfYearlyAmount: instCalc.freq === "half-yearly" ? instCalc.perInst : undefined,
        halfYearlyCount:  instCalc.freq === "half-yearly" ? instCalc.count   : undefined,
        hasYearly:        false,
        planDuration:     instCalc.durMonths,
        planDurationUnit: "months",
      },
      possession: { amount: instCalc.possAmt, percent: instCalc.pPct },
    } : {}),

    // Enterprise - utilities (nested — schema infrastructure {}, Property.ts 1914-1926)
    infrastructure: {
      electricityStatus: ["available","applied","not_available"].includes(String(electricityStatus ?? ""))
        ? String(electricityStatus) : undefined,
      gasStatus:      suiGasStatus ? String(suiGasStatus).trim().slice(0, 60) : undefined,
      waterStatus:    waterStatus  ? String(waterStatus).trim().slice(0, 60)  : undefined,
      sewerageStatus: ["available","applied","not_available"].includes(String(sewerageStatus ?? ""))
        ? String(sewerageStatus) : undefined,
      internetReady:  internetReady  === true,
      cctvCoverage:   cctvCoverage   === true,
      streetLights:   streetLights   === true,
      gatedCommunity: gatedCommunity === true,
      roadCondition:  roadCondition  ? String(roadCondition).trim().slice(0, 60) : undefined,
    },

    // Enterprise - legal (nested — schema legal {}, Property.ts 2080-2095; + top-level enum at 2075)
    ownershipType: ["freehold","leasehold","power_of_attorney"].includes(String(ownershipType ?? ""))
      ? String(ownershipType) : "freehold",
    legal: {
      ownershipType: String(ownershipType ?? "freehold").slice(0, 40),
      fileType: ["open_file","allocation","affidavit","registry","lease"].includes(String(fileType ?? ""))
        ? String(fileType) : undefined,
      documentationAvailable: Array.isArray(documentsAvailable)
        ? (documentsAvailable as string[]).filter((d) => typeof d === "string").slice(0, 10)
        : [],
      hasDispute:                hasDispute === true,
      disputeDetails:            hasDispute && disputeDetails ? String(disputeDetails).trim().slice(0, 500) : "",
      societyMembershipRequired: societyMembershipRequired === true,
      taxPaidUpToDate:           taxPaidUpToDate === true,
    },

    // Enterprise - media (video URLs)
    videoUrl:        videoUrl        ? String(videoUrl).trim()        : undefined,
    virtualTourUrl:  virtualTourUrl  ? String(virtualTourUrl).trim()  : undefined,
    droneVideoUrl:   droneVideoUrl   ? String(droneVideoUrl).trim()   : undefined,

    // Media
    featureImageUrl:    featureImageUrl    ? String(featureImageUrl).trim()    : undefined,
    featureImagePublicId: featureImagePublicId ? String(featureImagePublicId).trim() : undefined,
    images: safeImages,
    primaryImageIndex: safeImages.length > 0 ? 0 : undefined,

    // Contact
    contactDetails: safeContact,

    // Amenities
    amenities: Array.isArray(amenities)
      ? (amenities as string[]).filter((a) => typeof a === "string").slice(0, 20)
      : [],

    // Verification - starts as draft
    verification: {
      status: "draft",
    },
  });

  res.status(201).json({
    success:  true,
    message:  "Listing created as draft",
    property: {
      _id:  property._id,
      slug: property.slug,
    },
    listingCount: listingCount + 1,
    listingLimit: LISTING_LIMIT,
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  try {
    await dbConnect();

    const isAdmin =
      auth.authorityRole === "admin" || auth.role === "admin";

    if (!isAdmin) {
      const verified = await OwnerProfile.findOne({
        userId: auth.id,
        status: "approved",
        isDeleted: { $ne: true },
      })
        .select("_id")
        .lean();

      if (!verified) {
        res.status(403).json({
          error: "Verified owner access required. Please complete owner verification.",
          code:  "OWNER_NOT_VERIFIED",
        });
        return;
      }
    }

    const actor: OwnerActor = {
      id:    auth.id,
      name:  auth.name,
      email: auth.email,
    };

    if (req.method === "GET") {
      await handleGet(req, res, actor);
    } else if (req.method === "POST") {
      await handlePost(req, res, actor);
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err: unknown) {
    res.status(500).json({ error: "Internal server error" });
  }
}