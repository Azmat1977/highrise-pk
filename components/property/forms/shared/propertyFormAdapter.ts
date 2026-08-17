import {
  DEFAULT_FORM_STATE,
  type PropertyFormState,
  type UploadedImage,
} from './usePropertyForm';

function n(value: unknown): number | '' {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : '';
}

function s(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function b(value: unknown): boolean {
  return value === true;
}

function enumValue<const T extends readonly string[]>(value: unknown, allowed: T): T[number] | '' {
  const candidate = s(value);
  return (allowed as readonly string[]).includes(candidate) ? candidate as T[number] : '';
}

function imageList(value: unknown): UploadedImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const url = s(row.url || row.imageUrl || row.pdfUrl);
    if (!url) return [];
    return [{
      url,
      publicId: s(row.publicId || row.public_id || row.imagePublicId || row.pdfPublicId),
      resourceType: s(row.resourceType) || (s(row.mimeType) === 'application/pdf' ? 'raw' : 'image'),
      mimeType: s(row.mimeType),
      isExisting: true,
    } as UploadedImage];
  });
}

const AMENITY_TO_FIELD: Readonly<Record<string, keyof PropertyFormState>> = {
  'Central AC': 'centralAC',
  'Central Heating': 'centralHeating',
  'Generator': 'generator',
  'UPS Backup': 'upsBackup',
  'Solar Panels': 'solarPanels',
  'Elevator / Lift': 'elevator',
  '24/7 Security': 'security24_7',
  'CCTV': 'cctv',
  'Intercom': 'intercom',
  'Swimming Pool': 'swimmingPool',
  'Gym / Fitness': 'gym',
  'Mosque': 'mosque',
  'Park': 'park',
  'Playground': 'playground',
  'Community Center': 'communityCenter',
  'Shopping': 'shopping',
  'Hospital': 'hospital',
  'School': 'school',
  'Broadband Internet': 'broadband',
  'Cable TV': 'cableTV',
  'Waste Management': 'wasteManagement',
  'Maintenance Staff': 'maintenanceStaff',
  'Gated Community': 'gatedCommunity',
  'Guard Room': 'guardRoom',
  'Servant Quarters': 'servantQuartersAmenity',
  'Laundry': 'laundry',
  'Rooftop Access': 'rooftopAccess',
  'Balcony': 'balcony',
  'Garden': 'garden',
  'Basement': 'basement',
  'Double Glazing': 'doubleGlazing',
  'Floor Heating': 'floorHeating',
  'Power Backup': 'powerBackup',
  'Central Air Conditioning': 'centralAirConditioning',
  'Access Control': 'accessControl',
  'Fire Suppression': 'fireSuppression',
  'Loading Dock': 'loadingDock',
  'Crane Available': 'craneAvailable',
  'Cold Storage': 'coldStorageAvailable',
  'Tubewell': 'tubewell',
  'Fruit Trees': 'fruitTrees',
  'Livestock Area': 'livestockArea',
};

/**
 * Convert an owner-authorized Property read into the active Unified form contract.
 * Trust/moderation/private evidence references are deliberately not editable here.
 */
export function propertyToUnifiedFormState(raw: Record<string, unknown>): PropertyFormState {
  const details = (raw.details && typeof raw.details === 'object' ? raw.details : {}) as Record<string, unknown>;
  const construction = (details.construction && typeof details.construction === 'object' ? details.construction : {}) as Record<string, unknown>;
  const contact = (raw.contactDetails && typeof raw.contactDetails === 'object' ? raw.contactDetails : {}) as Record<string, unknown>;
  const coordinates = (raw.coordinates && typeof raw.coordinates === 'object' ? raw.coordinates : {}) as Record<string, unknown>;
  const installment = (raw.installmentPlan && typeof raw.installmentPlan === 'object' ? raw.installmentPlan : {}) as Record<string, unknown>;
  const rental = (raw.rentalDetails && typeof raw.rentalDetails === 'object' ? raw.rentalDetails : {}) as Record<string, unknown>;
  const legal = (raw.legal && typeof raw.legal === 'object' ? raw.legal : {}) as Record<string, unknown>;
  const infrastructure = (raw.infrastructure && typeof raw.infrastructure === 'object' ? raw.infrastructure : {}) as Record<string, unknown>;
  const parking = (raw.parkingDetails && typeof raw.parkingDetails === 'object' ? raw.parkingDetails : {}) as Record<string, unknown>;

  const form: PropertyFormState = JSON.parse(JSON.stringify(DEFAULT_FORM_STATE)) as PropertyFormState;
  form.isDraft = raw.verification && typeof raw.verification === 'object'
    ? (raw.verification as Record<string, unknown>).status === 'draft'
    : false;
  form.listingType = (s(raw.listingType) || 'full_payment') as PropertyFormState['listingType'];
  form.title = s(raw.title);
  form.description = s(raw.description);
  form.propertyType = s(raw.propertyType) as PropertyFormState['propertyType'];
  form.subType = s(raw.propertySubtype);
  form.condition = s(raw.condition);
  form.facing = s(raw.facing || raw.facingDirection);
  form.isCorner = b(raw.isCornerPlot);
  form.floor = n(raw.floorNumber);
  form.totalFloors = n(raw.totalFloors || raw.floors);
  form.bedrooms = n(raw.bedrooms);
  form.bathrooms = n(raw.bathrooms);
  form.kitchens = n(raw.kitchens);
  form.possessionStatus = s(raw.possessionStatus) as PropertyFormState['possessionStatus'];

  form.city = s(raw.city);
  form.area = s(raw.locality);
  form.sector = s(raw.locality);
  form.block = s(raw.block);
  form.street = s(raw.streetNumber);
  form.address = s(raw.completeAddress);
  form.latitude = n(coordinates.lat);
  form.longitude = n(coordinates.lng);
  form.nearbyLandmarks = s(raw.nearbyLandmark) ? [s(raw.nearbyLandmark)] : [];
  form.societyName = s(raw.society);
  form.phase = s(raw.phase);
  form.projectId = s(raw.projectId);

  form.areaSize = n(raw.area);
  form.areaUnit = (s(raw.unit) || 'Marla') as PropertyFormState['areaUnit'];
  form.coveredArea = n(raw.coveredArea);
  form.coveredAreaUnit = (s(raw.coveredAreaUnit) || 'Square Feet') as PropertyFormState['coveredAreaUnit'];
  form.plotWidth = n(raw.plotWidth);
  form.plotLength = n(raw.plotDepth);
  form.sizeUnit = form.areaUnit;
  form.constructionYear = n(raw.constructionYear);
  form.renovationYear = n(raw.renovationYear);

  form.price = n(raw.price);
  form.pricePerUnit = n(raw.pricePerUnit);
  form.isNegotiable = b(raw.priceNegotiable);
  form.tokenAmount = n(raw.tokenAmount);

  Object.assign(form.installmentPlan, installment);
  Object.assign(form.rentalDetails, rental);
  Object.assign(form.legal, legal);
  Object.assign(form.infrastructure, infrastructure);

  form.residential = {
    ...form.residential,
    drawingRoom: b(details.drawingRoom ?? raw.drawingRoom),
    diningRoom: b(details.diningRoom ?? raw.diningRoom),
    studyRoom: b(details.studyRoom),
    storeRoom: b(details.storeRoom),
    servantQuarters: b(details.servantQuarters ?? raw.servantQuarter),
    laundryRoom: b(details.laundryRoom),
    porch: b(details.porch ?? raw.porch),
    boundaryWall: b(details.boundaryWall ?? raw.hasBoundaryWall),
    mainRoadAccess: b(details.mainRoadAccess),
    isParkFacing: b(details.isParkFacing),
    isMainRoadFacing: b(details.isMainRoadFacing),
    lawnGarden: enumValue(details.lawnGarden ?? raw.lawnGarden, ['none', 'front', 'back', 'both', 'rooftop'] as const),
    terraceArea: n(details.terraceArea),
    carpetArea: n(details.carpetArea),
    balconies: n(details.balconies ?? raw.balconies),
    view: s(details.view ?? raw.view),
    hasPrivateElevator: b(details.hasPrivateElevator),
    hasJacuzzi: b(details.hasJacuzzi),
    hasPanoramicView: b(details.hasPanoramicView),
    hasConcierge: b(details.hasConcierge),
    attachedBath: b(details.attachedBath ?? raw.hasAttachedBath),
    sharedBath: b(details.sharedBath),
    kitchenAccess: enumValue(details.kitchenAccess, ['private', 'shared', 'none'] as const),
  };

  form.plotDetails = {
    ...form.plotDetails,
    plotCategory: enumValue(details.plotCategory ?? raw.plotCategory, ['open_plot', 'file', 'on_ground'] as const),
    plotNumber: s(details.plotNumber ?? raw.plotNumber),
    isParkFacing: b(details.isParkFacing),
    isMainRoadFacing: b(details.isMainRoadFacing),
    isCorner: b(raw.isCornerPlot),
    roadWidth: n(details.roadWidth),
    allowedFloors: n(details.allowedFloors),
    allowedUse: s(details.allowedUse),
    boundaryWall: b(details.boundaryWall ?? raw.hasBoundaryWall),
    developmentStatus: enumValue(details.developmentStatus ?? raw.developmentStatus, ['undeveloped', 'under_development', 'semi_developed', 'fully_developed'] as const),
  };

  form.commercial = {
    ...form.commercial,
    shopNumber: s(details.shopNumber),
    frontageWidth: n(details.frontageWidth),
    hasMezzanine: b(details.hasMezzanine ?? raw.hasMezzanine),
    mezzanineArea: n(details.mezzanineArea ?? raw.mezzanineArea),
    hasDisplayWindow: b(details.hasDisplayWindow),
    hasStorageRoom: b(details.hasStorageRoom),
    hasWashroom: b(details.hasWashroom ?? raw.hasWashroom),
    shutterType: enumValue(details.shutterType ?? raw.shutterType, ['rolling', 'collapsible', 'glass', 'none'] as const),
    suitableFor: Array.isArray(details.suitableFor) ? details.suitableFor.map(String) : [],
    meetingRooms: n(details.meetingRooms),
    carpetArea: n(details.carpetArea),
    officeCabinType: enumValue(details.officeCabinType, ['cabin', 'open_plan', 'mixed'] as const),
    hasReception: b(details.hasReception),
    hasServerRoom: b(details.hasServerRoom),
    hasPantry: b(details.hasPantry),
    hasPrayerRoom: b(details.hasPrayerRoom),
    ceilingHeight: n(details.ceilingHeight),
    loadingBays: n(details.loadingBays),
    hasOfficePortion: b(details.hasOfficePortion),
    openYardArea: n(details.openYardArea),
    hasThreePhase: b(details.hasThreePhase),
    hasDockLeveler: b(details.hasDockLeveler),
    hasCraneAccess: b(details.hasCraneAccess),
    hasFireSafety: b(details.hasFireSafety),
    hasDrainage: b(details.hasDrainage),
    totalUnits: n(details.totalUnits),
    basementFloors: n(details.basementFloors),
    liftsCount: n(details.liftsCount),
    buildingAge: n(details.buildingAge),
    floorPlateArea: n(details.floorPlateArea),
    occupancyStatus: enumValue(details.occupancyStatus, ['vacant', 'tenanted', 'partial'] as const),
    currentRentalIncome: n(details.currentRentalIncome),
    powerLoad: n(details.powerLoad),
    roadWidth: n(details.roadWidth),
  };

  form.agricultural = {
    ...form.agricultural,
    landType: enumValue(details.landType, ['irrigated', 'rainfed', 'barani'] as const),
    waterSource: enumValue(details.waterSource, ['canal', 'tubewell', 'rainwater', 'none'] as const),
    cropHistory: s(details.cropHistory),
    hasTubewell: b(details.hasTubewell),
    hasFruitTrees: b(details.hasFruitTrees),
    hasLivestockArea: b(details.hasLivestockArea),
    hasGuestHouse: b(details.hasGuestHouse),
    accessRoadType: enumValue(details.accessRoadType, ['paved', 'unpaved', 'none'] as const),
  };

  Object.assign(form.construction, construction);

  form.parking = {
    ...form.parking,
    availability: enumValue(parking.availability, ['dedicated', 'shared', 'none'] as const),
    isIncludedInPrice: parking.isIncludedInPrice !== false,
    oneTimePurchaseFee: n(parking.oneTimePurchaseFee ?? parking.price),
    monthlyFee: n(parking.monthlyFee),
    carSpaces: n(parking.carSpaces),
    motorcycleSpaces: n(parking.motorcycleSpaces),
    locationType: enumValue(parking.locationType, ['covered', 'open', 'garage', 'basement', 'driveway'] as const),
    isDedicated: b(parking.isDedicated),
    hasEVCharging: b(parking.hasEVCharging),
    hasCCTV: b(parking.hasCCTV),
    hasVisitorParking: b(parking.hasVisitorParking),
    hasValet: b(parking.hasValet),
    hasSecurityGuard: b(parking.hasSecurityGuard),
    specialNotes: s(parking.specialNotes),
  };

  const amenities = Array.isArray(raw.amenities) ? raw.amenities.map(String) : [];
  for (const amenity of amenities) {
    const field = AMENITY_TO_FIELD[amenity];
    if (field && typeof form[field] === 'boolean') {
      (form as unknown as Record<string, unknown>)[field] = true;
    }
  }

  form.images = imageList(raw.images ?? raw.gallery);
  form.floorPlanImages = imageList(raw.floorPlans);
  form.videoUrl = s(raw.videoUrl);
  form.virtualTourUrl = s(raw.virtualTourUrl);

  // Private ownership evidence is intentionally represented only by the separate summary UI/API.
  form.ownershipProofUrl = '';
  form.ownershipProofPublicId = '';

  form.contactDetails = {
    name: s(contact.personName),
    phone: s(contact.primaryPhone),
    whatsapp: s(contact.whatsappNumber),
    email: s(contact.email),
    preferredContact: (s(contact.preferredMethod) || 'phone') as PropertyFormState['contactDetails']['preferredContact'],
    showPhone: contact.showPhoneOnListing !== false,
    showEmail: false,
  };

  // Existing owner-approved record should not require re-accepting terms merely to edit.
  form.termsAccepted = true;
  form.accuracyConfirmed = true;
  return form;
}
