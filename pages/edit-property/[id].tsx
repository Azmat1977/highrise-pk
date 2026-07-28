// pages/edit-property/[id].tsx

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, LogIn, ShieldAlert, RefreshCcw } from 'lucide-react';

import FullPaymentForm from '@/components/property/forms/FullPaymentForm';
import InstallmentPropertyForm from '@/components/property/forms/InstallmentPropertyForm';
import RentPropertyForm from '@/components/property/forms/RentPropertyForm';
import { Button } from '@/components/ui/button';

type AnyProperty = any;

// Simple formatter: 1000000 -> "1,000,000"
function formatPriceWithCommas(num?: number | string): string {
  if (num == null || num === '') return '';
  const s = num.toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Helper to safe string
const safeStr = (val: any) => (val != null ? String(val) : '');

// yyyy-mm-dd for <input type="date" />
function toDateInput(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val.slice(0, 10);
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

function getSafeCanonical(routerPath?: string) {
  // Avoid trusting host headers; just build a relative canonical for safety.
  // (If you later want absolute canonical, do it in _document/_app with trusted env base URL.)
  if (!routerPath) return undefined;
  const clean = routerPath.split('?')[0] || '';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

type UiState =
  | { kind: 'loading'; message: string }
  | { kind: 'error'; title: string; message: string; code?: string; canRetry?: boolean }
  | { kind: 'auth'; title: string; message: string }
  | { kind: 'notfound'; title: string; message: string }
  | { kind: 'ready' };

function normalizeApiError(payload: any): { code?: string; message?: string } {
  if (!payload) return {};
  const code = typeof payload.code === 'string' ? payload.code : undefined;
  const message =
    typeof payload.error === 'string'
      ? payload.error
      : typeof payload.message === 'string'
        ? payload.message
        : undefined;
  return { code, message };
}

// Map Property document to initial values for FullPaymentForm
function mapPropertyToFullPaymentInitialData(property: AnyProperty): any {
  if (!property) return {};

  return {
    // BASIC
    title: property.title || '',
    propertyType: property.propertyType || 'House',
    propertySubtype: property.propertySubtype || '',

    price: formatPriceWithCommas(property.price),
    area: safeStr(property.area),
    unit: property.unit || 'Marla',

    // LOCATION
    city: property.city || '',
    society: property.society || '',
    customSociety: '',
    phase: property.phase || '',
    block: property.block || '',
    streetNumber: property.streetNumber || '',

    // PROPERTY DETAILS
    bedrooms: safeStr(property.bedrooms),
    bathrooms: safeStr(property.bathrooms),
    floors: safeStr(property.floors),
    floorNumber: safeStr(property.floorNumber),
    totalFloors: safeStr(property.totalFloors),
    servantQuarter: !!property.servantQuarter,
    basement: !!property.basement,
    hasAttachedBath: !!property.hasAttachedBath,
    hasMezzanine: !!property.hasMezzanine,

    // SHOP / COMMERCIAL
    floorLocation: property.floorLocation || 'ground',
    shopPosition: property.shopPosition || '',
    shopFrontWidth: safeStr(property.shopFrontWidth),
    shopDepth: safeStr(property.shopDepth),
    mezzanineArea: safeStr(property.mezzanineArea),
    electricityLoad: property.electricityLoad || 'single_phase',
    ceilingHeight: property.ceilingHeight || 'standard',
    suitableFor: property.suitableFor || [],
    hasWashroom: !!property.hasWashroom,
    hasSignage:
      typeof property.hasSignage === 'boolean' ? property.hasSignage : true,

    // FEATURES
    furnished: property.furnished || 'unfurnished',
    condition: property.condition || 'excellent',
    facing: property.facing || '',
    parking: property.parking || '0',
    amenities: property.amenities || [],

    // LEGAL / POSSESSION
    possessionStatus: property.possessionStatus || 'ready',
    ownershipType: property.ownershipType || 'freehold',

    // DESCRIPTION & MEDIA
    description: property.description || '',
    videoUrl: property.videoUrl || '',

    // CONTACT
    whatsappNumber: property.whatsappNumber || '',
    contactTime: property.contactTime || 'anytime',

    // Images: for edit, we only upload *new* ones
    images: [],

    // ✅ Existing Feature Image (prefill edit mode)
    existingFeatureImage: property.featureImageUrl
      ? {
          url: property.featureImageUrl,
          publicId: property.featureImagePublicId || '',
        }
      : null,

    // ✅ Existing Gallery Images (prefill edit mode)
    existingGallery: Array.isArray(property.gallery)
      ? property.gallery.map((img: any, index: number) => ({
          url: img.url,
          publicId: img.public_id || img.publicId || '',
          caption: img.caption || '',
          category: img.category || 'exterior',
          order: img.order ?? index,
        }))
      : [],
  };
}

// Map Property document to initial values for RentPropertyForm
function mapPropertyToRentInitialData(property: AnyProperty): any {
  const base = mapPropertyToFullPaymentInitialData(property);

  const rd = property.rentalDetails || {};
  const bills = rd.bills || {};
  const tenantPrefs = rd.tenantPreferences || {};

  return {
    ...base,

    // RENTAL FINANCIAL TERMS
    securityDeposit: formatPriceWithCommas(rd.securityDeposit),
    advanceMonths: rd.advanceMonths != null ? String(rd.advanceMonths) : '1',
    minimumStay: rd.minimumStayMonths != null ? String(rd.minimumStayMonths) : '12',

    leaseDuration: rd.leaseFlexible
      ? 'flexible'
      : rd.leaseDurationMonths != null
        ? String(rd.leaseDurationMonths)
        : '12',

    availableFrom: toDateInput(rd.availableFrom),
    rentNegotiable: !!rd.rentNegotiable,

    // BILLS INCLUSION
    billsIncluded: !!bills.allIncluded,
    electricityIncluded: !!bills.electricityIncluded,
    gasIncluded: !!bills.gasIncluded,
    waterIncluded: !!bills.waterIncluded,
    internetIncluded: !!bills.internetIncluded,

    // MAINTENANCE CHARGES (monthly)
    maintenanceCharges: formatPriceWithCommas(rd.maintenanceChargesMonthly),

    // TENANT PREFERENCES
    familyOnly: !!tenantPrefs.familyOnly,
    bachelorsAllowed: !!tenantPrefs.bachelorsAllowed,
    petsAllowed: !!tenantPrefs.petsAllowed,
    smokingAllowed: !!tenantPrefs.smokingAllowed,
    commercialUseAllowed: !!tenantPrefs.commercialUseAllowed,
  };
}

// Map Property document to initial values for InstallmentPropertyForm
function mapPropertyToInstallmentInitialData(property: AnyProperty): any {
  if (!property) return {};

  const booking = property.booking || {};
  const dp = property.downPayment || {};
  const plan = property.installmentPlan || {};
  const poss = property.possession || {};
  const ballot = property.ballot || {};
  const resale = property.resaleTracking || property.resale || {};
  const other = property.otherPaymentCharges || {};
  const contact = property.contactDetails || {};

  const parkingDetails = property.parkingDetails || {};
  const infrastructure = property.infrastructure || {};
  const utilities = property.utilities || property.utilityConnections || {};
  const approvals = property.approvals || {};
  const projectDetails = property.projectDetails || {};

  const extraCharges = property.extraCharges || {};
  const possessionCharges = property.possessionCharges || {};
  const maintenance = property.maintenance || {};
  const governmentTaxes = property.governmentTaxes || {};
  const transferCharges = property.transferCharges || {};
  const hiddenChargesDisclosure = property.hiddenChargesDisclosure || {};

  const legal = property.legal || {};

  const govStampDuty = (governmentTaxes as any).stampDuty || {};
  const govCvt = (governmentTaxes as any).cvt || {};
  const govWht = (governmentTaxes as any).wht || {};
  const govAdvanceTax = (governmentTaxes as any).advanceTax || {};

  const amenitiesList = Array.isArray((property as any).amenities)
    ? ((property as any).amenities as string[])
    : [];

  const FEATURE_AMENITY_KEYS = [
    'centralHeating',
    'intercom',
    'smartHome',
    'doubleGlazedWindows',
    'boundaryWall',
    'garden',
    'swimmingPool',
    'terrace',
    'elevator',
    'generator',
    'fireSafety',
    'reception',
    'gym',
    'buildingPool',
    'communityHall',
    'kidsPlayArea',
    'prayerRoom',
    'mosque',
    'school',
    'hospital',
    'shoppingMall',
    'parks',
    'sportsFacilities',
    'joggingTrack',
    'communityCenter',
    'banks',
    'restaurants',
    'cinema',
    'lake',
    'golfCourse',
    'gatedEntry',
    'securityGuards24x7',
    'cctvCameras',
    'intercomSystem',
    'smartLock',
    'panicButton',
  ] as const;

  const amenityFlags: Record<string, boolean> = {};
  FEATURE_AMENITY_KEYS.forEach((key) => {
    const fromTopLevel = (property as any)?.[key];
    amenityFlags[key] =
      typeof fromTopLevel === 'boolean' ? fromTopLevel : amenitiesList.includes(key);
  });

  const parkingCountStr = safeStr(property.parking ?? '');
  const hasParkingCount = parkingCountStr !== '' && parkingCountStr !== '0';

  const parkingAvailable =
    typeof parkingDetails.available === 'boolean'
      ? parkingDetails.available
      : hasParkingCount;

  return {
    ...amenityFlags,

    numberOfLifts:
      (property as any)?.numberOfLifts != null
        ? String((property as any).numberOfLifts)
        : '',

    propertyCategory: property.propertyCategory || 'residential',
    propertyType: property.propertyType || 'Plot',
    propertySubtype: property.propertySubtype || '',
    listingPurpose: property.listingPurpose || 'new_booking',
    title: property.title || '',
    propertyCondition: property.propertyCondition || 'under_construction',

    province: property.province || 'Punjab',
    city: property.city || '',
    locality: property.locality || '',
    society: property.society || '',
    customSociety: property.customSociety || '',
    phase: property.phase || '',
    block: property.block || '',
    streetNumber: property.streetNumber || '',
    plotNumber: property.plotNumber || '',
    completeAddress: property.completeAddress || '',
    nearbyLandmark: property.nearbyLandmark || '',

    area: safeStr(property.area),
    areaUnit: property.areaUnit || property.unit || 'Marla',
    coveredArea: safeStr(property.coveredArea),
    coveredAreaUnit: property.coveredAreaUnit || 'Sq. Ft.',
    plotWidth: safeStr(property.plotWidth),
    plotDepth: safeStr(property.plotDepth),
    grossArea: safeStr(property.grossArea),
    netArea: safeStr(property.netArea),
    floorNumber: safeStr(property.floorNumber),
    totalFloors: safeStr(property.totalFloors),
    balconyArea: safeStr(property.balconyArea),

    plotCategory: property.plotCategory || 'residential',
    isCornerPlot: !!property.isCornerPlot,
    facingDirection: property.facingDirection || '',
    specialFacing: property.specialFacing || [],
    plotStatus: property.plotStatus || 'file',
    developmentStatus: property.developmentStatus || 'under_development',
    openSides: safeStr(property.openSides),
    hasBoundaryWall: !!property.hasBoundaryWall,

    bedrooms: safeStr(property.bedrooms),
    bathrooms: safeStr(property.bathrooms),
    drawingRoom: !!property.drawingRoom,
    diningRoom: !!property.diningRoom,
    livingRoom: !!property.livingRoom,
    kitchens: safeStr(property.kitchens),
    storeRooms: safeStr(property.storeRooms),
    servantQuarter: !!property.servantQuarter,
    servantQuarterRooms: safeStr(property.servantQuarterRooms),
    floors: safeStr(property.floors),
    basement: !!property.basement,
    basementArea: safeStr(property.basementArea),
    rooftopAccess: !!property.rooftopAccess,
    lawnGarden: property.lawnGarden || 'none',
    garage: safeStr(property.garage),
    porch: !!property.porch,

    apartmentType: property.apartmentType || '',
    view: property.view || '',
    balconies: safeStr(property.balconies),
    isCornerUnit: !!property.isCornerUnit,

    floorLocation: property.floorLocation || 'ground',
    shopPosition: property.shopPosition || '',
    shopFrontWidth: safeStr(property.shopFrontWidth),
    shopDepth: safeStr(property.shopDepth),
    shopHeight: safeStr(property.shopHeight),
    hasMezzanine: !!property.hasMezzanine,
    mezzanineArea: safeStr(property.mezzanineArea),
    hasBasement: !!property.hasBasement,
    commercialBasementArea: safeStr(property.commercialBasementArea),
    washroom: property.washroom || 'none',
    hasSignage:
      typeof property.hasSignage === 'boolean' ? property.hasSignage : true,
    shutterType: property.shutterType || '',
    hasDisplayWindow: !!property.hasDisplayWindow,
    suitableFor: property.suitableFor || [],
    electricityLoad: property.electricityLoad || 'single_phase',
    ceilingHeight: property.ceilingHeight || 'standard',

    parking: safeStr(property.parking ?? ''),
    parkingDetails,

    parkingAvailable,
    parkingType: (parkingDetails as any).type || '',
    parkingSpaces: safeStr((parkingDetails as any).spaces ?? property.parking ?? ''),
    parkingIncluded: (parkingDetails as any).included || 'included',
    hasEVCharging: !!(parkingDetails as any).hasEVCharging,
    parkingSize: safeStr((parkingDetails as any).sizeSqft ?? (parkingDetails as any).size ?? ''),
    parkingPricePerSqft: safeStr((parkingDetails as any).pricePerSqft ?? ''),

    infrastructure,
    utilities,
    approvals,
    projectDetails,

    electricityStatus: (infrastructure as any).electricityStatus || '',
    electricityLoadInfra:
      (infrastructure as any).electricityLoadInfra ||
      property.electricityLoad ||
      'single_phase',
    gasStatus: (infrastructure as any).gasStatus || '',
    waterStatus: (infrastructure as any).waterStatus || '',
    sewerageStatus: (infrastructure as any).sewerageStatus || '',
    roadCondition: (infrastructure as any).roadCondition || '',
    securityLevel: (infrastructure as any).securityLevel || '',
    internetReady: !!(infrastructure as any).internetReady,
    cctvCoverage: !!(infrastructure as any).cctvCoverage,
    streetLights: !!(infrastructure as any).streetLights,
    gatedCommunity: !!(infrastructure as any).gatedCommunity,

    extraCharges,
    possessionCharges,
    maintenance,
    governmentTaxes,
    transferCharges,
    hiddenChargesDisclosure,

    dcRate: formatPriceWithCommas((governmentTaxes as any).dcRate),
    fbrValue: formatPriceWithCommas((governmentTaxes as any).fbrValue),

    stampDutyPercent: safeStr(govStampDuty.percent),
    stampDutyAmount: formatPriceWithCommas(govStampDuty.amount),
    stampDutyPaidBy: govStampDuty.paidBy || 'buyer',

    cvtPercent: safeStr(govCvt.percent),
    cvtAmount: formatPriceWithCommas(govCvt.amount),
    cvtPaidBy: govCvt.paidBy || 'buyer',

    whtFiler: formatPriceWithCommas(govWht.filerAmount),
    whtNonFiler: formatPriceWithCommas(govWht.nonFilerAmount),

    advanceTaxFiler: formatPriceWithCommas(govAdvanceTax.filerAmount),
    advanceTaxNonFiler: formatPriceWithCommas(govAdvanceTax.nonFilerAmount),

    societyTransferFee: formatPriceWithCommas((transferCharges as any).societyTransferFee),
    nocCharges: formatPriceWithCommas((transferCharges as any).nocCharges),
    registrationFee: formatPriceWithCommas((transferCharges as any).registrationFee),
    mutationFee: formatPriceWithCommas((transferCharges as any).mutationFee),
    membershipTransferFeeCharges: formatPriceWithCommas((transferCharges as any).membershipTransferFee),

    cornerCharges: formatPriceWithCommas((extraCharges as any).cornerCharges),
    facingCharges: formatPriceWithCommas((extraCharges as any).facingCharges),
    floorPreferenceCharges: formatPriceWithCommas((extraCharges as any).floorPreferenceCharges),
    developmentCharges: formatPriceWithCommas((extraCharges as any).developmentCharges),
    documentationCharges: formatPriceWithCommas((extraCharges as any).documentationCharges),
    processingFee: formatPriceWithCommas((extraCharges as any).processingFee),

    possessionFee: formatPriceWithCommas((possessionCharges as any).possessionFee),
    electricityMeterCharges: formatPriceWithCommas((possessionCharges as any).electricityMeterCharges),
    gasMeterCharges: formatPriceWithCommas((possessionCharges as any).gasMeterCharges),
    waterConnectionCharges: formatPriceWithCommas((possessionCharges as any).waterConnectionCharges),
    generatorShare: formatPriceWithCommas((possessionCharges as any).generatorShare),
    securityDeposit: formatPriceWithCommas((possessionCharges as any).securityDeposit),
    advanceMaintenance: formatPriceWithCommas((possessionCharges as any).advanceMaintenance),
    sinkingFund: formatPriceWithCommas((possessionCharges as any).sinkingFund),

    maintenanceApplicable:
      typeof (maintenance as any).isApplicable === 'boolean'
        ? (maintenance as any).isApplicable
        : false,
    maintenanceIncluded: (maintenance as any).included ?? '',
    maintenanceCalculation: (maintenance as any).calculationType ?? '',
    maintenancePerSqft: formatPriceWithCommas((maintenance as any).perSqft),
    fixedMaintenanceAmount: formatPriceWithCommas((maintenance as any).fixedAmount),
    maintenanceCovers: Array.isArray((maintenance as any).covers) ? (maintenance as any).covers : [],
    maintenanceManagedBy: (maintenance as any).managedBy ?? '',

    escalationClause:
      typeof (hiddenChargesDisclosure as any).escalationClause === 'boolean'
        ? (hiddenChargesDisclosure as any).escalationClause
        : false,
    escalationDetails: (hiddenChargesDisclosure as any).escalationDetails ?? '',
    delayPenalty:
      typeof (hiddenChargesDisclosure as any).delayPenalty === 'boolean'
        ? (hiddenChargesDisclosure as any).delayPenalty
        : false,
    delayPenaltyDetails: (hiddenChargesDisclosure as any).delayPenaltyDetails ?? '',
    allChargesDisclosed:
      typeof (hiddenChargesDisclosure as any).allChargesDisclosed === 'boolean'
        ? (hiddenChargesDisclosure as any).allChargesDisclosed
        : true,

    legal,
    ownershipType: legal.ownershipType ?? property.ownershipType ?? 'freehold',
    fileType: legal?.fileType ?? '',
    transferType: legal?.transferType ?? '',
    documentsAvailable: Array.isArray(legal?.documentsAvailable) ? legal.documentsAvailable : [],
    previousOwner: legal?.previousOwner ?? '',
    hasDispute: !!legal?.hasDispute,
    disputeDetails: legal?.hasDispute ? legal?.disputeDetails ?? '' : '',
    societyMembershipRequired: !!legal?.societyMembershipRequired,
    membershipTransferFee:
      legal?.societyMembershipRequired && legal?.membershipTransferFee != null
        ? String(legal.membershipTransferFee)
        : '',
    taxPaidUpToDate: !!legal?.taxPaidUpToDate,

    totalPrice: formatPriceWithCommas(property.totalPrice ?? property.price),
    pricePerUnit: formatPriceWithCommas(property.pricePerUnit),
    isNegotiable: !!(property.isNegotiable ?? property.priceNegotiable),

    bookingAmount: formatPriceWithCommas(booking.amount),
    bookingPercent: safeStr(booking.percent),
    bookingStatus: booking.status || 'open',

    downPaymentAmount: formatPriceWithCommas(dp.amount),
    downPaymentPercent: safeStr(dp.percent),
    downPaymentDueWithin: dp.dueWithin || '30_days',
    downPaymentInInstallments: !!dp.inInstallments,
    numberOfDPInstallments: safeStr(dp.numberOfInstallments ?? dp.installmentCount),

    hasMonthlyInstallments: !!plan.hasMonthly,
    monthlyAmount: formatPriceWithCommas(plan.monthlyAmount),
    monthlyCount: safeStr(plan.monthlyCount),

    hasQuarterlyInstallments: !!plan.hasQuarterly,
    quarterlyAmount: formatPriceWithCommas(plan.quarterlyAmount),
    quarterlyCount: safeStr(plan.quarterlyCount),

    hasHalfYearlyInstallments: !!plan.hasHalfYearly,
    halfYearlyAmount: formatPriceWithCommas(plan.halfYearlyAmount),
    halfYearlyCount: safeStr(plan.halfYearlyCount),

    hasYearlyInstallments: !!plan.hasYearly,
    yearlyAmount: formatPriceWithCommas(plan.yearlyAmount),
    yearlyCount: safeStr(plan.yearlyCount),

    installmentPlan: {
      hasMonthly: !!plan.hasMonthly,
      monthlyAmount: formatPriceWithCommas(plan.monthlyAmount),
      monthlyCount: safeStr(plan.monthlyCount),
      hasQuarterly: !!plan.hasQuarterly,
      quarterlyAmount: formatPriceWithCommas(plan.quarterlyAmount),
      quarterlyCount: safeStr(plan.quarterlyCount),
      hasHalfYearly: !!plan.hasHalfYearly,
      halfYearlyAmount: formatPriceWithCommas(plan.halfYearlyAmount),
      halfYearlyCount: safeStr(plan.halfYearlyCount),
      hasYearly: !!plan.hasYearly,
      yearlyAmount: formatPriceWithCommas(plan.yearlyAmount),
      yearlyCount: safeStr(plan.yearlyCount),
    },

    installmentStartDate:
      (plan.startDate && String(plan.startDate).slice(0, 10)) ||
      property.installmentStartDate ||
      '',
    planDuration: safeStr(plan.planDuration ?? property.planDuration),
    planDurationUnit: plan.planDurationUnit ?? property.planDurationUnit ?? 'years',

    isResale: !!resale.isResale,
    installmentsPaid: safeStr(resale.installmentsPaid),
    installmentsRemaining: safeStr(resale.installmentsRemaining),
    amountPaid: formatPriceWithCommas(resale.amountPaid),
    amountRemaining: formatPriceWithCommas(resale.amountRemaining),
    ownPrice: formatPriceWithCommas(resale.ownPrice ?? property.ownPrice),
    profit: formatPriceWithCommas(resale.profitAmount ?? resale.profit),

    possessionAmount: formatPriceWithCommas(poss.amount),
    possessionPercent: safeStr(poss.percent),
    possessionDueOn: poss.dueOn || 'on_completion',
    expectedPossessionDate: poss.expectedDate ? String(poss.expectedDate).slice(0, 10) : '',
    possessionStatus: poss.status || 'not_yet',

    ballotStatus: ballot.status || 'not_applicable',
    expectedBallotDate: ballot.date ? String(ballot.date).slice(0, 10) : '',
    isPlotAllocated: !!ballot.isAllocated,
    hasAllocationLetter: !!ballot.allocationLetterAvailable,

    confirmationCharges: formatPriceWithCommas(other.confirmationCharges),
    developmentChargesPayment: formatPriceWithCommas(other.developmentChargesPayment ?? other.developmentCharges),
    latePaymentSurcharge: formatPriceWithCommas(other.latePaymentSurcharge),
    earlyPaymentDiscount: safeStr(other.earlyPaymentDiscount),

    description: property.description || '',
    shortDescription: property.shortDescription || '',
    investmentHighlights: property.investmentHighlights || '',
    whyBuyThis: property.whyBuyThis || '',
    termsAndConditions: property.termsAndConditions || '',
    videoUrl: property.videoUrl || '',
    droneVideoUrl: property.droneVideoUrl || '',
    virtualTourUrl: property.virtualTourUrl || '',
    constructionVideoUrl: property.constructionVideoUrl || '',
    developerVideoUrl: property.developerVideoUrl || '',

    contactPerson:
      contact.personName ||
      property.owner?.displayName ||
      property.owner?.name ||
      '',
    primaryPhone: contact.primaryPhone || property.owner?.phone || '',
    secondaryPhone: contact.secondaryPhone || '',
    whatsappNumber: contact.whatsappNumber || property.whatsappNumber || '',
    contactEmail: contact.email || property.owner?.email || '',
    preferredContactMethod: contact.preferredMethod || 'whatsapp',
    bestTimeToCall: contact.contactTime || property.contactTime || 'anytime',
    showPhoneOnListing: contact.showPhoneOnListing ?? true,
    allowWhatsAppMessages: contact.allowWhatsappMessages ?? true,

    termsAccepted: !!property.termsAccepted,
    privacyAccepted: !!property.privacyAccepted,
    accuracyConfirmed: !!property.accuracyConfirmed,
    authorizationConfirmed: !!property.authorizationConfirmed,

    images: [],
    primaryImageIndex: 0,
    imageCaptions: [],

    existingFeatureImage: property.featureImageUrl
      ? {
          url: property.featureImageUrl,
          publicId: property.featureImagePublicId || '',
        }
      : null,

    existingGallery: Array.isArray(property.gallery)
      ? property.gallery.map((img: any, index: number) => ({
          url: img.url,
          publicId: img.public_id || img.publicId || '',
          caption: img.caption || '',
          category: img.category || 'exterior',
          order: img.order ?? index,
        }))
      : [],
  };
}

function CenterCard({
  title,
  message,
  icon,
  actions,
}: {
  title: string;
  message: string;
  icon?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">
        <div className="flex justify-center mb-3">{icon}</div>
        <h1 className="text-xl sm:text-2xl font-semibold mb-2">{title}</h1>
        <p className="text-gray-600 mb-5">{message}</p>
        {actions ? <div className="flex flex-col sm:flex-row gap-3 justify-center">{actions}</div> : null}
      </div>
    </div>
  );
}

export default function EditPropertyPage() {
  const router = useRouter();

  const canonical = useMemo(() => getSafeCanonical(router.asPath), [router.asPath]);

  const propertyId = useMemo(() => {
    const raw = router.query.id;
    if (!raw) return '';
    return Array.isArray(raw) ? raw[0] : String(raw);
  }, [router.query.id]);

  const [property, setProperty] = useState<AnyProperty | null>(null);
  const [ui, setUi] = useState<UiState>({ kind: 'loading', message: 'Loading...' });

  const abortRef = useRef<AbortController | null>(null);

  const load = async () => {
    if (!router.isReady) return;
    if (!propertyId) {
      setProperty(null);
      setUi({
        kind: 'notfound',
        title: 'Invalid link',
        message: 'Invalid property identifier.',
      });
      return;
    }

    // Cancel previous request (defense-in-depth against state races)
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setUi({ kind: 'loading', message: 'Loading property details...' });
    setProperty(null);

    try {
      const res = await fetch(`/api/properties/${encodeURIComponent(propertyId)}`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      let payload: any = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }
      } else {
        // Don’t leak backend responses into UI; just handle gracefully
        payload = null;
      }

      // Auth / gating handling (enterprise UX, no data leak)
      if (res.status === 401) {
        setUi({
          kind: 'auth',
          title: 'Login required',
          message: 'Please login to edit your property listing.',
        });
        return;
      }

      if (res.status === 403) {
        const { code, message } = normalizeApiError(payload);
        // If CNIC / verification gating exists, show helpful next action
        const looksLikeKyc =
          code === 'CNIC_REQUIRED' ||
          code === 'CNIC_NOT_VERIFIED' ||
          /cnic|kyc|verify/i.test(message || '');

        setUi({
          kind: 'auth',
          title: looksLikeKyc ? 'Verification required' : 'Access denied',
          message: looksLikeKyc
            ? 'To edit listings, please complete CNIC verification in your profile settings.'
            : 'You do not have permission to edit this listing.',
        });
        return;
      }

      // Anti-enumeration: treat not found and non-success uniformly
      if (!res.ok || !payload?.success || !payload?.property) {
        setUi({
          kind: 'notfound',
          title: 'Listing not available',
          message: 'This listing is not available for editing.',
        });
        return;
      }

      const prop = payload.property;

      // Only allow known edit types
      const ALLOWED_LISTING_TYPES = ['full_payment', 'installment', 'rent'];
      if (!ALLOWED_LISTING_TYPES.includes(prop?.listingType)) {
        setUi({
          kind: 'error',
          title: 'Unsupported listing type',
          message: 'Editing is not supported for this type of listing yet.',
          canRetry: false,
        });
        setProperty(null);
        return;
      }

      setProperty(prop);
      setUi({ kind: 'ready' });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Error fetching property for edit:', err);
      setUi({
        kind: 'error',
        title: 'Could not load listing',
        message: 'Something went wrong while loading. Please try again.',
        canRetry: true,
      });
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    load();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, propertyId]);

  // Always noindex edit pages (security + SEO)
  return (
    <>
      <Head>
        <title>Edit Property | Highrise</title>
        <meta name="robots" content="noindex,nofollow,noarchive" />
        {canonical ? <link rel="canonical" href={canonical} /> : null}
      </Head>

      {/* Router not ready */}
      {!router.isReady ? (
        <div className="max-w-4xl mx-auto p-8 text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      ) : ui.kind === 'loading' ? (
        <div className="max-w-4xl mx-auto p-8 text-center">
          <p className="text-gray-600">{ui.message}</p>
        </div>
      ) : ui.kind === 'auth' ? (
        <CenterCard
          title={ui.title}
          message={ui.message}
          icon={<ShieldAlert className="w-10 h-10 text-[#029bba]" />}
          actions={
            <>
              <Link href="/login" className="inline-flex">
                <Button className="rounded-xl shadow-sm inline-flex items-center gap-2">
                  <LogIn size={18} />
                  Login
                </Button>
              </Link>
              <Link href="/profile" className="inline-flex">
                <Button variant="outline" className="rounded-xl inline-flex items-center gap-2">
                  <Home size={18} />
                  Go to Profile
                </Button>
              </Link>
              <Button
                variant="outline"
                className="rounded-xl inline-flex items-center gap-2"
                onClick={() => router.back()}
              >
                <ArrowLeft size={18} />
                Go back
              </Button>
            </>
          }
        />
      ) : ui.kind === 'notfound' ? (
        <CenterCard
          title={ui.title}
          message={ui.message}
          icon={<ShieldAlert className="w-10 h-10 text-gray-500" />}
          actions={
            <>
              <Link href="/my-properties" className="inline-flex">
                <Button className="rounded-xl shadow-sm inline-flex items-center gap-2">
                  <Home size={18} />
                  My Properties
                </Button>
              </Link>
              <Button
                variant="outline"
                className="rounded-xl inline-flex items-center gap-2"
                onClick={() => router.back()}
              >
                <ArrowLeft size={18} />
                Go back
              </Button>
            </>
          }
        />
      ) : ui.kind === 'error' ? (
        <CenterCard
          title={ui.title}
          message={ui.message}
          icon={<ShieldAlert className="w-10 h-10 text-red-500" />}
          actions={
            <>
              {ui.canRetry ? (
                <Button className="rounded-xl inline-flex items-center gap-2" onClick={load}>
                  <RefreshCcw size={18} />
                  Retry
                </Button>
              ) : null}
              <Button
                variant="outline"
                className="rounded-xl inline-flex items-center gap-2"
                onClick={() => router.back()}
              >
                <ArrowLeft size={18} />
                Go back
              </Button>
            </>
          }
        />
      ) : !property ? (
        <CenterCard
          title="Listing not available"
          message="This listing is not available for editing."
          icon={<ShieldAlert className="w-10 h-10 text-gray-500" />}
          actions={
            <>
              <Link href="/my-properties" className="inline-flex">
                <Button className="rounded-xl shadow-sm inline-flex items-center gap-2">
                  <Home size={18} />
                  My Properties
                </Button>
              </Link>
              <Button
                variant="outline"
                className="rounded-xl inline-flex items-center gap-2"
                onClick={() => router.back()}
              >
                <ArrowLeft size={18} />
                Go back
              </Button>
            </>
          }
        />
      ) : (
        // READY
        (() => {
          // ---------- INSTALLMENT EDIT ----------
          if (property.listingType === 'installment') {
            const initialInstallmentData = mapPropertyToInstallmentInitialData(property);

            return (
              <div className="min-h-screen bg-gray-100">
                <div className="bg-white shadow-sm">
                  <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="flex items-center gap-2 text-gray-600 hover:text-[#029bba] transition-colors"
                    >
                      <ArrowLeft size={18} />
                      Back
                    </button>

                    <Link href="/my-properties">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hidden sm:inline-flex items-center gap-2 text-[#029bba] border-[#029bba]"
                      >
                        <Home size={16} />
                        My Properties
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="max-w-5xl mx-auto px-4 py-8">
                  <div className="text-xs sm:text-sm text-gray-500 mb-2 flex items-center flex-wrap gap-1">
                    <Link href="/my-properties" className="text-[#029bba] hover:underline">
                      My Properties
                    </Link>
                    <span className="text-gray-400">›</span>
                    <span>Edit Installment Property</span>
                    <span className="text-gray-400">›</span>
                    <span className="font-medium text-gray-800 truncate max-w-xs sm:max-w-md">
                      {property.title}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold mb-4">
                    Edit Installment Property: {property.title}
                  </h1>
                  <p className="text-gray-500 mb-6">
                    Update your installment listing details. Existing images will remain unless you upload additional
                    photos.
                  </p>

                  <InstallmentPropertyForm mode="edit" propertyId={property._id} initialData={initialInstallmentData} />
                </div>
              </div>
            );
          }

          // ---------- RENT EDIT ----------
          if (property.listingType === 'rent') {
            const initialRentData = mapPropertyToRentInitialData(property);

            return (
              <div className="min-h-screen bg-gray-100">
                <div className="bg-white shadow-sm">
                  <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="flex items-center gap-2 text-gray-600 hover:text-[#029bba] transition-colors"
                    >
                      <ArrowLeft size={18} />
                      Back
                    </button>

                    <Link href="/my-properties">
                      <Button
                        variant="outline"
                        size="sm"
                        className="hidden sm:inline-flex items-center gap-2 text-[#029bba] border-[#029bba]"
                      >
                        <Home size={16} />
                        My Properties
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="max-w-5xl mx-auto px-4 py-8">
                  <div className="text-xs sm:text-sm text-gray-500 mb-2 flex items-center flex-wrap gap-1">
                    <Link href="/my-properties" className="text-[#029bba] hover:underline">
                      My Properties
                    </Link>
                    <span className="text-gray-400">›</span>
                    <span>Edit Rental Property</span>
                    <span className="text-gray-400">›</span>
                    <span className="font-medium text-gray-800 truncate max-w-xs sm:max-w-md">
                      {property.title}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-bold mb-4">Edit Rental Property: {property.title}</h1>
                  <p className="text-gray-500 mb-6">
                    Update your rental listing details. Existing images will remain unless you upload additional photos.
                  </p>

                  <RentPropertyForm mode="edit" propertyId={property._id} initialData={initialRentData} />
                </div>
              </div>
            );
          }

          // ---------- FULL-PAYMENT EDIT ----------
          const initialFullData = mapPropertyToFullPaymentInitialData(property);

          return (
            <div className="min-h-screen bg-gray-100">
              <div className="bg-white shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-[#029bba] transition-colors"
                  >
                    <ArrowLeft size={18} />
                    Back
                  </button>

                  <Link href="/my-properties">
                    <Button
                      variant="outline"
                      size="sm"
                      className="hidden sm:inline-flex items-center gap-2 text-[#029bba] border-[#029bba]"
                    >
                      <Home size={16} />
                      My Properties
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="text-xs sm:text-sm text-gray-500 mb-2 flex items-center flex-wrap gap-1">
                  <Link href="/my-properties" className="text-[#029bba] hover:underline">
                    My Properties
                  </Link>
                  <span className="text-gray-400">›</span>
                  <span>Edit Property</span>
                  <span className="text-gray-400">›</span>
                  <span className="font-medium text-gray-800 truncate max-w-xs sm:max-w-md">
                    {property.title}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold mb-4">Edit Property: {property.title}</h1>
                <p className="text-gray-500 mb-6">
                  Update your listing details. Existing images will remain unless you upload additional photos.
                </p>

                <FullPaymentForm mode="edit" propertyId={property._id} initialData={initialFullData} />
              </div>
            </div>
          );
        })()
      )}
    </>
  );
}
