// File: components/property/forms/listing/propertyFormAdapter.ts
// Bidirectional mapper for Mongoose Property Document <-> Wizard ListingFormState

import type { ListingFormState, AreaUnit } from "./types";
import { INITIAL_STATE } from "./types";

/**
 * Reverse-maps a Mongoose Property document (returned from the API) into ListingFormState
 */
export function propertyToListingFormState(property: any): ListingFormState {
  if (!property) return INITIAL_STATE;

  const getStr = (val: any): string => (val !== undefined && val !== null ? String(val) : "");
  const getNumStr = (val: any): string => (val !== undefined && val !== null && Number(val) > 0 ? String(val) : "");

  // Map amenities safely
  const amenitiesList: string[] = Array.isArray(property.amenities)
    ? property.amenities
    : [];

  return {
    ...INITIAL_STATE,

    // Step 1: Type & Location
    propertyType: property.propertyType || "",
    propertySubtype: property.propertySubtype || "",
    listingType: property.listingType || "",
    title: property.title || "",
    city: property.city || "",
    society: property.society || "",
    phase: property.phase || "",
    block: property.block || "",
    streetAddress: property.streetNumber || property.completeAddress || "",
    coordinatesRaw: property.coordinatesRaw || (property.coordinates?.lat ? `${property.coordinates.lat}, ${property.coordinates.lng}` : ""),
    lat: property.coordinates?.lat ? String(property.coordinates.lat) : "",
    lng: property.coordinates?.lng ? String(property.coordinates.lng) : "",

    // Step 2: Details
    area: getNumStr(property.area),
    areaUnit: (property.unit || "Marla") as AreaUnit,
    frontSize: getNumStr(property.plotWidth || property.frontSize),
    depthSize: getNumStr(property.plotDepth || property.depthSize),
    coveredArea: getNumStr(property.coveredArea),
    bedrooms: getNumStr(property.bedrooms),
    bathrooms: getNumStr(property.bathrooms),
    servantQuarters: getNumStr(property.servantQuarterRooms || property.servantQuarters),
    parkings: getNumStr(property.parkingDetails?.spaces || property.parking || property.parkings),
    floors: getNumStr(property.numberOfFloors || property.totalFloors || property.floors),
    floorNumber: getNumStr(property.floorNumber),
    propertyAge: getNumStr(property.propertyAge),
    facing: property.facing || "",
    isCorner: Boolean(property.isCornerPlot || property.isCorner),
    boundaryWall: Boolean(property.hasBoundaryWall || property.boundaryWall),
    furnishingStatus: property.furnished === "semi_furnished" ? "semi-furnished" : property.furnished === "fully_furnished" ? "furnished" : "unfurnished",
    possessionStatus: property.possessionStatus || "ready",
    amenities: amenitiesList,
    nearbyFacilities: Array.isArray(property.nearbyFacilities)
      ? property.nearbyFacilities.map((f: any) => ({
          name: f.name || "",
          category: f.category || "other",
          distance: f.distance || "",
        }))
      : [],

    // Step 3: Pricing
    price: property.price ? getNumStr(property.price) : "",
    priceNegotiable: Boolean(property.priceNegotiable),
    monthlyRent: property.rentalDetails?.monthlyRent ? getNumStr(property.rentalDetails.monthlyRent) : getNumStr(property.price),
    securityDeposit: getNumStr(property.rentalDetails?.securityDeposit || property.securityDeposit),
    advanceMonths: getNumStr(property.rentalDetails?.advanceMonths || property.advanceMonths),
    utilitiesIncluded: Boolean(property.rentalDetails?.utilitiesIncluded || property.utilitiesIncluded),

    // Installments
    instTotalPrice: property.installmentPlan?.totalPrice ? getNumStr(property.installmentPlan.totalPrice) : getNumStr(property.price),
    bookingPercent: getNumStr(property.installmentPlan?.bookingPercent || property.booking?.percent),
    downPercent: getNumStr(property.installmentPlan?.downPaymentPercent || property.downPayment?.percent),
    possessionPercent: getNumStr(property.installmentPlan?.possessionPercent || property.possession?.percent),
    installmentCount: getNumStr(property.installmentPlan?.installmentCount),
    frequency: property.installmentPlan?.frequency || "quarterly",

    // Utilities
    electricityStatus: property.infrastructure?.electricityStatus || property.electricityStatus || "",
    suiGasStatus: property.infrastructure?.gasStatus || property.suiGasStatus || "",
    waterStatus: property.infrastructure?.waterStatus || property.waterStatus || "",
    sewerageStatus: property.infrastructure?.sewerageStatus || property.sewerageStatus || "",
    internetReady: Boolean(property.infrastructure?.internetReady || property.internetReady),
    cctvCoverage: Boolean(property.infrastructure?.cctvCoverage || property.cctvCoverage),
    streetLights: Boolean(property.infrastructure?.streetLights || property.streetLights),
    roadCondition: property.infrastructure?.roadCondition || property.roadCondition || "",
    gatedCommunity: Boolean(property.infrastructure?.gatedCommunity || property.gatedCommunity),

    // Step 4: Legal & Media
    ownershipType: property.ownershipType || property.legal?.ownershipType || "freehold",
    fileType: property.legal?.fileType || property.fileType || "",
    documentsAvailable: Array.isArray(property.legal?.documentationAvailable) ? property.legal.documentationAvailable : [],
    hasDispute: Boolean(property.legal?.hasDispute || property.hasDispute),
    disputeDetails: property.legal?.disputeDetails || property.disputeDetails || "",
    taxPaidUpToDate: Boolean(property.legal?.taxPaidUpToDate || property.taxPaidUpToDate),
    societyMembershipRequired: Boolean(property.legal?.societyMembershipRequired || property.societyMembershipRequired),

    featureImage: property.featureImageUrl
      ? { url: property.featureImageUrl, public_id: property.featureImagePublicId || "" }
      : null,
    images: Array.isArray(property.images)
      ? property.images.map((img: any) => ({
          url: img.url,
          public_id: img.public_id || "",
          caption: img.caption || "",
        }))
      : [],
    videoUrl: property.videoUrl || "",
    virtualTourUrl: property.virtualTourUrl || "",
    droneVideoUrl: property.droneVideoUrl || "",

    // Contact
    contactPerson: property.contactDetails?.personName || property.contactPerson || "",
    contactPhone: property.contactDetails?.primaryPhone || property.contactPhone || "",
    contactWhatsapp: property.contactDetails?.whatsappNumber || property.contactWhatsapp || "",
    showPhoneOnListing: property.contactDetails?.showPhoneOnListing !== false,

    // Metadata
    description: property.description || "",
    declaration: true,
  };
}