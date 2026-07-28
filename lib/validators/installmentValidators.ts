// lib/validators/installmentValidators.ts

import {
  InstallmentFormData,
  InstallmentFormErrors,
  parsePakistaniPrice,
} from '@/types/installmentProperty';

// ============================================
// INDIVIDUAL FIELD VALIDATORS
// ============================================

/**
 * Validate property title
 */
export const validateTitle = (title: string): string | undefined => {
  if (!title || title.trim().length === 0) {
    return 'Property title is required';
  }
  if (title.trim().length < 10) {
    return 'Title must be at least 10 characters';
  }
  if (title.trim().length > 150) {
    return 'Title must not exceed 150 characters';
  }
  return undefined;
};

/**
 * Validate property type
 */
export const validatePropertyType = (type: string): string | undefined => {
  if (!type || type.trim().length === 0) {
    return 'Property type is required';
  }
  return undefined;
};

/**
 * Validate listing purpose
 */
export const validateListingPurpose = (purpose: string): string | undefined => {
  const validPurposes = ['new_booking', 'resale', 'transfer'];
  if (!purpose || !validPurposes.includes(purpose)) {
    return 'Please select a listing purpose';
  }
  return undefined;
};

/**
 * Validate property condition
 */
export const validatePropertyCondition = (
  condition: string
): string | undefined => {
  if (!condition) {
    return 'Property condition is required';
  }
  return undefined;
};

/**
 * Validate province
 */
export const validateProvince = (province: string): string | undefined => {
  if (!province || province.trim().length === 0) {
    return 'Province is required';
  }
  return undefined;
};

/**
 * Validate city
 */
export const validateCity = (city: string): string | undefined => {
  if (!city || city.trim().length === 0) {
    return 'City is required';
  }
  return undefined;
};

/**
 * Validate society
 */
export const validateSociety = (
  society: string,
  customSociety: string
): string | undefined => {
  if (!society || society.trim().length === 0) {
    return 'Society/Scheme is required';
  }
  if (society === 'Other' && (!customSociety || customSociety.trim().length === 0)) {
    return 'Please enter the society name';
  }
  return undefined;
};

/**
 * Validate area
 */
export const validateArea = (area: string): string | undefined => {
  if (!area || area.trim().length === 0) {
    return 'Property area is required';
  }
  const numArea = parseFloat(area);
  if (isNaN(numArea) || numArea <= 0) {
    return 'Please enter a valid area';
  }
  if (numArea > 100000) {
    return 'Area seems too large. Please verify.';
  }
  return undefined;
};

/**
 * Validate area unit
 */
export const validateAreaUnit = (unit: string): string | undefined => {
  if (!unit || unit.trim().length === 0) {
    return 'Area unit is required';
  }
  return undefined;
};

/**
 * Validate bedrooms (for applicable property types)
 */
export const validateBedrooms = (
  bedrooms: string,
  propertyType: string
): string | undefined => {
  const requiresBedrooms = ['House', 'Villa', 'Apartment', 'Penthouse', 'Farmhouse'];

  if (!requiresBedrooms.includes(propertyType)) {
    return undefined;
  }

  if (!bedrooms || bedrooms.trim().length === 0) {
    return 'Number of bedrooms is required';
  }

  const num = parseInt(bedrooms, 10);
  if (isNaN(num) || num < 0) {
    return 'Please enter a valid number';
  }
  if (num > 50) {
    return 'Number seems too high';
  }

  return undefined;
};

/**
 * Validate bathrooms (for applicable property types)
 */
export const validateBathrooms = (
  bathrooms: string,
  propertyType: string
): string | undefined => {
  const requiresBathrooms = ['House', 'Villa', 'Apartment', 'Penthouse', 'Farmhouse'];

  if (!requiresBathrooms.includes(propertyType)) {
    return undefined;
  }

  if (!bathrooms || bathrooms.trim().length === 0) {
    return 'Number of bathrooms is required';
  }

  const num = parseInt(bathrooms, 10);
  if (isNaN(num) || num < 0) {
    return 'Please enter a valid number';
  }
  if (num > 30) {
    return 'Number seems too high';
  }

  return undefined;
};

/**
 * Validate floor location (for shops/commercial)
 */
export const validateFloorLocation = (
  floorLocation: string,
  propertyType: string
): string | undefined => {
  const requiresFloorLocation = ['Shop', 'Office', 'Food Court'];

  if (!requiresFloorLocation.includes(propertyType)) {
    return undefined;
  }

  if (!floorLocation || floorLocation.trim().length === 0) {
    return 'Floor location is required';
  }

  return undefined;
};

/**
 * Validate total price
 */
export const validateTotalPrice = (price: string): string | undefined => {
  if (!price || price.trim().length === 0) {
    return 'Total price is required';
  }

  const numPrice = parsePakistaniPrice(price);
  if (isNaN(numPrice) || numPrice <= 0) {
    return 'Please enter a valid price';
  }
  if (numPrice < 100000) {
    return 'Price must be at least Rs. 1 Lakh';
  }

  return undefined;
};

/**
 * Validate booking amount
 */
export const validateBookingAmount = (
  amount: string,
  totalPrice: string
): string | undefined => {
  if (!amount || amount.trim().length === 0) {
    return 'Booking amount is required';
  }

  const numAmount = parsePakistaniPrice(amount);
  const numTotal = parsePakistaniPrice(totalPrice);

  if (isNaN(numAmount) || numAmount <= 0) {
    return 'Please enter a valid booking amount';
  }

  if (numTotal > 0 && numAmount > numTotal) {
    return 'Booking amount cannot exceed total price';
  }

  if (numTotal > 0 && numAmount > numTotal * 0.5) {
    return 'Booking amount seems too high (>50% of price)';
  }

  return undefined;
};

/**
 * Validate down payment amount
 */
export const validateDownPayment = (
  amount: string,
  totalPrice: string
): string | undefined => {
  if (!amount || amount.trim().length === 0) {
    return undefined; // Down payment is optional
  }

  const numAmount = parsePakistaniPrice(amount);
  const numTotal = parsePakistaniPrice(totalPrice);

  if (isNaN(numAmount) || numAmount < 0) {
    return 'Please enter a valid amount';
  }

  if (numTotal > 0 && numAmount > numTotal) {
    return 'Down payment cannot exceed total price';
  }

  return undefined;
};

/**
 * Validate possession amount
 */
export const validatePossessionAmount = (
  amount: string,
  totalPrice: string
): string | undefined => {
  if (!amount || amount.trim().length === 0) {
    return undefined; // Optional
  }

  const numAmount = parsePakistaniPrice(amount);
  const numTotal = parsePakistaniPrice(totalPrice);

  if (isNaN(numAmount) || numAmount < 0) {
    return 'Please enter a valid amount';
  }

  if (numTotal > 0 && numAmount > numTotal * 0.5) {
    return 'Possession amount seems too high';
  }

  return undefined;
};

/**
 * Validate payment plan totals using the same logic as Payment Summary
 */
export const validatePaymentPlanTotal = (
  formData: InstallmentFormData
): string | undefined => {
  // Re‑use the shared breakdown helper so math is 100% consistent
  const breakdown = calculatePaymentBreakdown(formData);

  // Agar total price hi set nahi ya zero hai to kuch mat validate karo
  if (!breakdown.totalPrice || breakdown.totalPrice <= 0) {
    return undefined;
  }

  // Agar plan balanced hai (difference <= ROUNDING_THRESHOLD), to koi error nahi
  if (breakdown.isBalanced) {
    return undefined;
  }

  // Yahan tak aate hi matlab real mismatch hai
  const percent = breakdown.grandTotalPercent; // e.g. "94.6"
  const diffAbs = Math.abs(breakdown.difference);

  return `Payment plan total (${percent}%) doesn't match price. Difference: Rs. ${diffAbs.toLocaleString()}`;
};

/**
 * Validate project name
 */
export const validateProjectName = (name: string): string | undefined => {
  if (!name || name.trim().length === 0) {
    return 'Project/Society name is required';
  }
  if (name.trim().length < 3) {
    return 'Project name is too short';
  }
  return undefined;
};

/**
 * Validate developer name
 */
export const validateDeveloperName = (name: string): string | undefined => {
  if (!name || name.trim().length === 0) {
    return 'Developer name is required';
  }
  return undefined;
};

/**
 * Validate project status
 */
export const validateProjectStatus = (status: string): string | undefined => {
  if (!status || status.trim().length === 0) {
    return 'Project status is required';
  }
  return undefined;
};

/**
 * Validate ownership type
 */
export const validateOwnershipType = (type: string): string | undefined => {
  if (!type || type.trim().length === 0) {
    return 'Ownership type is required';
  }
  return undefined;
};

/**
 * Validate file type
 */
export const validateFileType = (type: string): string | undefined => {
  if (!type || type.trim().length === 0) {
    return 'File type is required';
  }
  return undefined;
};

/**
 * Validate images
 */
export const validateImages = (images: File[]): string | undefined => {
  if (!images || images.length === 0) {
    return 'At least one image is required';
  }
  if (images.length > 30) {
    return 'Maximum 30 images allowed';
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

  for (const image of images) {
    if (!allowedTypes.includes(image.type)) {
      return 'Only JPG, PNG, and WebP images are allowed';
    }
    if (image.size > maxSize) {
      return 'Each image must be less than 5MB';
    }
  }

  return undefined;
};

/**
 * Validate description
 */
export const validateDescription = (
  description: string
): string | undefined => {
  if (!description || description.trim().length === 0) {
    return 'Description is required';
  }
  if (description.trim().length < 50) {
    return 'Description must be at least 50 characters';
  }
  if (description.trim().length > 5000) {
    return 'Description must not exceed 5000 characters';
  }
  return undefined;
};

/**
 * Validate phone number
 */
export const validatePhone = (phone: string): string | undefined => {
  if (!phone || phone.trim().length === 0) {
    return 'Phone number is required';
  }

  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '');

  // Pakistani phone number patterns
  const patterns = [
    /^03\d{9}$/, // 03XXXXXXXXX
    /^92\d{10}$/, // 92XXXXXXXXXX
    /^\+92\d{10}$/, // +92XXXXXXXXXX
  ];

  const isValid = patterns.some((pattern) => pattern.test(cleaned));

  if (!isValid) {
    return 'Please enter a valid Pakistani phone number';
  }

  return undefined;
};

/**
 * Validate email
 */
export const validateEmail = (email: string): string | undefined => {
  if (!email || email.trim().length === 0) {
    return undefined; // Email is optional
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }

  return undefined;
};

/**
 * Validate WhatsApp number
 */
export const validateWhatsApp = (phone: string): string | undefined => {
  if (!phone || phone.trim().length === 0) {
    return undefined; // WhatsApp is optional
  }

  const cleaned = phone.replace(/[\s-]/g, '');
  const patterns = [/^03\d{9}$/, /^92\d{10}$/, /^\+92\d{10}$/];

  const isValid = patterns.some((pattern) => pattern.test(cleaned));

  if (!isValid) {
    return 'Please enter a valid WhatsApp number';
  }

  return undefined;
};

/**
 * Validate video URL
 */
export const validateVideoUrl = (url: string): string | undefined => {
  if (!url || url.trim().length === 0) {
    return undefined; // Video is optional
  }

  const validPatterns = [/youtu\.be/, /youtube\.com/, /vimeo\.com/];

  const isValid = validPatterns.some((pattern) => pattern.test(url));

  if (!isValid) {
    return 'Video URL must be from YouTube or Vimeo';
  }

  return undefined;
};

/**
 * Validate date (must be in future)
 */
export const validateFutureDate = (
  dateStr: string,
  fieldName: string
): string | undefined => {
  if (!dateStr || dateStr.trim().length === 0) {
    return undefined; // Optional
  }

  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(date.getTime())) {
    return `Please enter a valid ${fieldName}`;
  }

  if (date < today) {
    return `${fieldName} should be in the future`;
  }

  return undefined;
};

/**
 * Validate terms acceptance
 */
export const validateTerms = (
  termsAccepted: boolean,
  privacyAccepted: boolean,
  accuracyConfirmed: boolean,
  authorizationConfirmed: boolean
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!termsAccepted) {
    errors.termsAccepted = 'You must accept the terms and conditions';
  }
  if (!privacyAccepted) {
    errors.privacyAccepted = 'You must accept the privacy policy';
  }
  if (!accuracyConfirmed) {
    errors.accuracyConfirmed = 'You must confirm information accuracy';
  }
  if (!authorizationConfirmed) {
    errors.authorizationConfirmed = 'You must confirm authorization to list';
  }

  return errors;
};

// ============================================
// RESALE-SPECIFIC VALIDATORS
// ============================================

/**
 * Validate resale fields
 */
export const validateResaleFields = (
  formData: InstallmentFormData
): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (formData.listingPurpose !== 'resale') {
    return errors;
  }

  if (
    !formData.installmentsPaid ||
    formData.installmentsPaid.trim().length === 0
  ) {
    errors.installmentsPaid =
      'Number of installments paid is required for resale';
  }

  if (!formData.amountPaid || formData.amountPaid.trim().length === 0) {
    errors.amountPaid = 'Amount paid is required for resale';
  }

  if (!formData.ownPrice || formData.ownPrice.trim().length === 0) {
    errors.ownPrice = 'Your asking price is required for resale';
  }

  return errors;
};

// ============================================
// FULL FORM VALIDATION
// ============================================

/**
 * Validate entire form
 */
export const validateInstallmentForm = (
  formData: InstallmentFormData
): InstallmentFormErrors => {
  const errors: InstallmentFormErrors = {};

  // Section 1: Basic Information
  const titleError = validateTitle(formData.title);
  if (titleError) errors.title = titleError;

  const typeError = validatePropertyType(formData.propertyType);
  if (typeError) errors.propertyType = typeError;

  const purposeError = validateListingPurpose(formData.listingPurpose);
  if (purposeError) errors.listingPurpose = purposeError;

  const conditionError = validatePropertyCondition(formData.propertyCondition);
  if (conditionError) errors.propertyCondition = conditionError;

  // Section 2: Location
  const provinceError = validateProvince(formData.province);
  if (provinceError) errors.province = provinceError;

  const cityError = validateCity(formData.city);
  if (cityError) errors.city = cityError;

  const societyError = validateSociety(
    formData.society,
    formData.customSociety
  );
  if (societyError) errors.society = societyError;

  // Section 3: Size
  const areaError = validateArea(formData.area);
  if (areaError) errors.area = areaError;

  const unitError = validateAreaUnit(formData.areaUnit);
  if (unitError) errors.areaUnit = unitError;

  // Section 4: Property Details
  const bedroomsError = validateBedrooms(
    formData.bedrooms,
    formData.propertyType
  );
  if (bedroomsError) errors.bedrooms = bedroomsError;

  const bathroomsError = validateBathrooms(
    formData.bathrooms,
    formData.propertyType
  );
  if (bathroomsError) errors.bathrooms = bathroomsError;

  const floorLocationError = validateFloorLocation(
    formData.floorLocation,
    formData.propertyType
  );
  if (floorLocationError) errors.floorLocation = floorLocationError;

  // Section 5: Payment Plan
  const priceError = validateTotalPrice(formData.totalPrice);
  if (priceError) errors.totalPrice = priceError;

  const bookingError = validateBookingAmount(
    formData.bookingAmount,
    formData.totalPrice
  );
  if (bookingError) errors.bookingAmount = bookingError;

  const paymentPlanError = validatePaymentPlanTotal(formData);
  if (paymentPlanError) errors.paymentPlanTotal = paymentPlanError;

  // Section 7: Project Details (REMOVED FROM UI)
  // The Installment form no longer collects projectName, developerName,
  // or projectStatus directly. These details now come from the linked
  // Project / Developer profile, so we intentionally do NOT validate
  // them here to keep the validator aligned with the UI.

  // Section 10: Legal
  const ownershipError = validateOwnershipType(formData.ownershipType);
  if (ownershipError) errors.ownershipType = ownershipError;

  const fileTypeError = validateFileType(formData.fileType);
  if (fileTypeError) errors.fileType = fileTypeError;

  // Section 13: Media
  const imagesError = validateImages(formData.images);
  if (imagesError) errors.images = imagesError;

  // Section 14: Description
  const descriptionError = validateDescription(formData.description);
  if (descriptionError) errors.description = descriptionError;

  // Section 15: Contact
  const phoneError = validatePhone(formData.primaryPhone);
  if (phoneError) errors.primaryPhone = phoneError;

  const emailError = validateEmail(formData.contactEmail);
  if (emailError) errors.contactEmail = emailError;

  // Terms
  const termsErrors = validateTerms(
    formData.termsAccepted,
    formData.privacyAccepted,
    formData.accuracyConfirmed,
    formData.authorizationConfirmed
  );
  Object.assign(errors, termsErrors);

  // Resale-specific validation
  if (formData.listingPurpose === 'resale') {
    const resaleErrors = validateResaleFields(formData);
    Object.assign(errors, resaleErrors);
  }

  return errors;
};

/**
 * Check if form has any errors
 */
export const hasInstallmentFormErrors = (
  errors: InstallmentFormErrors
): boolean => {
  return Object.keys(errors).length > 0;
};

/**
 * Get error count by section
 */
export const getErrorCountBySection = (
  errors: InstallmentFormErrors
): Record<string, number> => {
  const sectionErrors: Record<string, number> = {
    basic: 0,
    location: 0,
    size: 0,
    property_details: 0,
    payment_plan: 0,
    parking: 0,
    project: 0,
    infrastructure: 0,
    features: 0,
    legal: 0,
    taxes: 0,
    documents: 0,
    media: 0,
    description: 0,
    contact: 0,
  };

  // Map fields to sections
  const fieldToSection: Record<string, string> = {
    title: 'basic',
    propertyType: 'basic',
    propertyCategory: 'basic',
    listingPurpose: 'basic',
    propertyCondition: 'basic',

    province: 'location',
    city: 'location',
    society: 'location',
    customSociety: 'location',

    area: 'size',
    areaUnit: 'size',

    bedrooms: 'property_details',
    bathrooms: 'property_details',
    floorLocation: 'property_details',
    shopFrontWidth: 'property_details',
    shopDepth: 'property_details',

    totalPrice: 'payment_plan',
    bookingAmount: 'payment_plan',
    bookingStatus: 'payment_plan',
    downPaymentAmount: 'payment_plan',
    possessionAmount: 'payment_plan',
    possessionDueOn: 'payment_plan',
    paymentPlanTotal: 'payment_plan',

    projectName: 'project',
    developerName: 'project',
    projectStatus: 'project',

    ownershipType: 'legal',
    fileType: 'legal',

    images: 'media',

    description: 'description',

    primaryPhone: 'contact',
    contactEmail: 'contact',

    termsAccepted: 'contact',
    privacyAccepted: 'contact',
    accuracyConfirmed: 'contact',
    authorizationConfirmed: 'contact',
  };

  for (const field of Object.keys(errors)) {
    const section = fieldToSection[field];
    if (section && sectionErrors[section] !== undefined) {
      sectionErrors[section]++;
    }
  }

  return sectionErrors;
};

/**
 * Check if a section is complete (no required field errors)
 */
export const isSectionComplete = (
  sectionId: string,
  formData: InstallmentFormData,
  errors: InstallmentFormErrors
): boolean => {
  const sectionErrors = getErrorCountBySection(errors);
  return sectionErrors[sectionId] === 0;
};

// ============================================
// CALCULATION HELPERS
// ============================================

/**
 * Calculate installments total (Monthly + Quarterly + Half-Yearly + Yearly)
 * Supports NEW nested installmentPlan structure,
 * and falls back to OLD flat fields for backward compatibility.
 */
// Early payment discount helper: base price → net price
export const getEarlyPaymentDiscountInfo = (
  formData: InstallmentFormData
) => {
  const basePrice = parsePakistaniPrice(formData.totalPrice) || 0;

  const raw = (formData.earlyPaymentDiscount || '').toString();
  const cleaned = raw.replace(/[^0-9.-]/g, ''); // sirf digits / dot / minus
  const percent = Number(cleaned);

  if (!basePrice || !Number.isFinite(percent) || percent <= 0) {
    return {
      basePrice,
      discountPercent: 0,
      discountAmount: 0,
      netPrice: basePrice,
    };
  }

  const discountAmount = Math.round((basePrice * percent) / 100);
  const netPrice = Math.max(basePrice - discountAmount, 0);

  return {
    basePrice,
    discountPercent: percent,
    discountAmount,
    netPrice,
  };
};

export const calculateInstallmentsTotal = (
  formData: InstallmentFormData
): number => {
  // Helper: safe series total = amount × count
  const getSeriesTotal = (
    hasFlag?: boolean,
    amountStr?: string,
    countStr?: string | number
  ): number => {
    if (!hasFlag) return 0;

    const amount = parsePakistaniPrice(amountStr || '0') || 0;
    const count = Number(countStr || 0);

    if (!amount || !count) return 0;

    return amount * count;
  };

  let total = 0;

  // 🔹 NEW: Nested installmentPlan object (jo abhi form use kar raha hai)
  const plan = (formData as any).installmentPlan as
    | {
        hasMonthly?: boolean;
        monthlyAmount?: string;
        monthlyCount?: string | number;
        hasQuarterly?: boolean;
        quarterlyAmount?: string;
        quarterlyCount?: string | number;
        hasHalfYearly?: boolean;
        halfYearlyAmount?: string;
        halfYearlyCount?: string | number;
        hasYearly?: boolean;
        yearlyAmount?: string;
        yearlyCount?: string | number;
      }
    | undefined;

  const hasNestedPlan =
    plan &&
    (plan.hasMonthly ||
      plan.hasQuarterly ||
      plan.hasHalfYearly ||
      plan.hasYearly ||
      plan.monthlyAmount ||
      plan.quarterlyAmount ||
      plan.halfYearlyAmount ||
      plan.yearlyAmount);

  if (hasNestedPlan && plan) {
    // ✅ NEW structure se total calculate karo
    total += getSeriesTotal(
      plan.hasMonthly,
      plan.monthlyAmount,
      plan.monthlyCount
    );
    total += getSeriesTotal(
      plan.hasQuarterly,
      plan.quarterlyAmount,
      plan.quarterlyCount
    );
    total += getSeriesTotal(
      plan.hasHalfYearly,
      plan.halfYearlyAmount,
      plan.halfYearlyCount
    );
    total += getSeriesTotal(
      plan.hasYearly,
      plan.yearlyAmount,
      plan.yearlyCount
    );

    return total;
  }

  // 🔹 OLD: Flat fields (backward compatibility, agar koi purana data ho)
  const anyForm: any = formData;

  total += getSeriesTotal(
    anyForm.hasMonthlyInstallments,
    anyForm.monthlyAmount,
    anyForm.monthlyCount
  );
  total += getSeriesTotal(
    anyForm.hasQuarterlyInstallments,
    anyForm.quarterlyAmount,
    anyForm.quarterlyCount
  );
  total += getSeriesTotal(
    anyForm.hasHalfYearlyInstallments,
    anyForm.halfYearlyAmount,
    anyForm.halfYearlyCount
  );
  total += getSeriesTotal(
    anyForm.hasYearlyInstallments,
    anyForm.yearlyAmount,
    anyForm.yearlyCount
  );

  return total;
};

/**
 * Calculate payment plan breakdown
 */
export const calculatePaymentBreakdown = (formData: InstallmentFormData) => {
  // Price + early payment discount
  const {
    basePrice,
    discountPercent,
    discountAmount,
    netPrice,
  } = getEarlyPaymentDiscountInfo(formData);

  // 🔹 Plan hamesha NET price ke mutabiq banega
  const totalPrice = netPrice || basePrice || 0;

  const booking = parsePakistaniPrice(formData.bookingAmount) || 0;
  const downPayment = parsePakistaniPrice(formData.downPaymentAmount) || 0;
  const possession = parsePakistaniPrice(formData.possessionAmount) || 0;
  const installments = calculateInstallmentsTotal(formData);

  // Raw math (jo bhi exact result aaye)
  const rawGrandTotal = booking + downPayment + installments + possession;
  const rawDifference = totalPrice - rawGrandTotal;

  const ROUNDING_THRESHOLD = 100;
  const isRoundingNoise = Math.abs(rawDifference) <= ROUNDING_THRESHOLD;

  const grandTotal = isRoundingNoise ? totalPrice : rawGrandTotal;
  const difference = totalPrice - grandTotal;

  return {
    // Yehi NET price hai jisko plan ke sath compare karenge
    totalPrice,

    // Extra info for UI
    originalTotalPrice: basePrice,
    discountPercent,
    discountAmount,
    netPrice,

    booking,
    bookingPercent:
      totalPrice > 0 ? ((booking / totalPrice) * 100).toFixed(1) : '0',

    downPayment,
    downPaymentPercent:
      totalPrice > 0 ? ((downPayment / totalPrice) * 100).toFixed(1) : '0',

    installments,
    installmentsPercent:
      totalPrice > 0 ? ((installments / totalPrice) * 100).toFixed(1) : '0',

    possession,
    possessionPercent:
      totalPrice > 0 ? ((possession / totalPrice) * 100).toFixed(1) : '0',

    grandTotal,
    grandTotalPercent:
      totalPrice > 0 ? ((grandTotal / totalPrice) * 100).toFixed(1) : '0',

    difference,
    isBalanced: Math.abs(rawDifference) <= ROUNDING_THRESHOLD,
  };
};

/**
 * Calculate total charges
 */
export const calculateTotalCharges = (formData: InstallmentFormData) => {
  // Extra charges (Developer)
  const extraCharges =
    (parsePakistaniPrice(formData.cornerCharges) || 0) +
    (parsePakistaniPrice(formData.facingCharges) || 0) +
    (parsePakistaniPrice(formData.floorPreferenceCharges) || 0) +
    (parsePakistaniPrice(formData.developmentCharges) || 0) +
    (parsePakistaniPrice(formData.documentationCharges) || 0) +
    (parsePakistaniPrice(formData.processingFee) || 0) +
    (parsePakistaniPrice(formData.fdcCharges) || 0) +
    (parsePakistaniPrice(formData.otherExtraCharges) || 0);

  // Possession charges (one-time)
  const possessionCharges =
    (parsePakistaniPrice(formData.possessionFee) || 0) +
    (parsePakistaniPrice(formData.electricityMeterCharges) || 0) +
    (parsePakistaniPrice(formData.gasMeterCharges) || 0) +
    (parsePakistaniPrice(formData.waterConnectionCharges) || 0) +
    (parsePakistaniPrice(formData.sewerageCharges) || 0) +
    (parsePakistaniPrice(formData.generatorShare) || 0) +
    (parsePakistaniPrice(formData.liftShare) || 0) +
    (parsePakistaniPrice(formData.securityDeposit) || 0) +
    (parsePakistaniPrice(formData.advanceMaintenance) || 0) +
    (parsePakistaniPrice(formData.sinkingFund) || 0) +
    (parsePakistaniPrice(formData.parkingAllotmentCharges) || 0) +
    (parsePakistaniPrice(formData.terraceCharges) || 0) +
    (parsePakistaniPrice(formData.gardenCharges) || 0) +
    (parsePakistaniPrice(formData.otherPossessionCharges) || 0);

  // Government taxes (for filer)
  const stampDutyAmount = parsePakistaniPrice(formData.stampDutyAmount) || 0;
  const cvtAmount = parsePakistaniPrice(formData.cvtAmount) || 0;
  const advanceTaxFiler =
    parsePakistaniPrice(formData.advanceTaxFiler) || 0;
  const advanceTaxNonFiler =
    parsePakistaniPrice(formData.advanceTaxNonFiler) || 0;
  const whtFiler = parsePakistaniPrice(formData.whtFiler) || 0;
  const whtNonFiler = parsePakistaniPrice(formData.whtNonFiler) || 0;

  const govtTaxesFiler =
    stampDutyAmount + cvtAmount + whtFiler + advanceTaxFiler;

  // Government taxes (for non-filer)
  const govtTaxesNonFiler =
    stampDutyAmount + cvtAmount + whtNonFiler + advanceTaxNonFiler;

  // Society / Transfer charges
  const transferCharges =
    (parsePakistaniPrice(formData.societyTransferFee) || 0) +
    (parsePakistaniPrice(formData.membershipTransferFeeCharges) || 0) +
    (parsePakistaniPrice(formData.nocCharges) || 0) +
    (parsePakistaniPrice(formData.registrationFee) || 0) +
    (parsePakistaniPrice(formData.mutationFee) || 0);

  // NET price (discount ke baad) – plan is based on net price
  const { basePrice, discountPercent, discountAmount, netPrice } =
    getEarlyPaymentDiscountInfo(formData);

  const totalPrice = netPrice || basePrice || 0;

  return {
    extraCharges,
    possessionCharges,
    govtTaxesFiler,
    govtTaxesNonFiler,
    transferCharges,

    // One-time charges excluding govt taxes
    totalCharges: extraCharges + possessionCharges + transferCharges,

    // Grand totals (including govt taxes)
    grandTotalFiler:
      totalPrice +
      extraCharges +
      possessionCharges +
      govtTaxesFiler +
      transferCharges,
    grandTotalNonFiler:
      totalPrice +
      extraCharges +
      possessionCharges +
      govtTaxesNonFiler +
      transferCharges,

    // Meta (if you want to display later)
    basePrice,
    discountPercent,
    discountAmount,
    netPrice,
  };
};
