// lib/validators/propertyValidators.ts

import {
  PropertyFormData,
  PropertyFormErrors,
  FullPaymentFormData,
  FullPaymentFormErrors,
} from '@/types/property';

// ============================================
// FULL PAYMENT FORM VALIDATORS
// ============================================

export const validateFullPaymentTitle = (title: string): string | undefined => {
  if (!title.trim()) {
    return 'Property title is required';
  }
  if (title.trim().length < 10) {
    return 'Title must be at least 10 characters';
  }
  if (title.trim().length > 100) {
    return 'Title must not exceed 100 characters';
  }
  return undefined;
};

export const validateFullPaymentPrice = (price: string): string | undefined => {
  if (!price.trim()) {
    return 'Price is required';
  }
  const numPrice = Number(price.replace(/,/g, ''));
  if (isNaN(numPrice)) {
    return 'Please enter a valid number';
  }
  if (numPrice < 100000) {
    return 'Minimum price is PKR 100,000';
  }
  if (numPrice > 50000000000) {
    return 'Maximum price is PKR 50,000,000,000';
  }
  return undefined;
};

export const validateFullPaymentArea = (area: string): string | undefined => {
  if (!area.trim()) {
    return 'Area is required';
  }
  const numArea = Number(area);
  if (isNaN(numArea) || numArea <= 0) {
    return 'Please enter a valid area';
  }
  if (numArea > 100000) {
    return 'Please enter a realistic area size';
  }
  return undefined;
};

export const validateFullPaymentCity = (city: string): string | undefined => {
  if (!city.trim()) {
    return 'Please select a city';
  }
  return undefined;
};

export const validateFullPaymentSociety = (
  society: string,
  customSociety: string
): string | undefined => {
  if (!society.trim()) {
    return 'Please select a society';
  }
  if (society === 'Other' && !customSociety.trim()) {
    return 'Please enter society name';
  }
  return undefined;
};

export const validateFullPaymentBedrooms = (
  bedrooms: string,
  propertyType: string
): string | undefined => {
  // NOT required for: Plot, Shop, Commercial
  if (['Plot', 'Shop', 'Commercial'].includes(propertyType)) {
    return undefined;
  }
  // Required for: House, Apartment, Farmhouse
  if (!bedrooms.trim()) {
    return 'Number of bedrooms is required';
  }
  const num = Number(bedrooms);
  if (isNaN(num) || num < 0 || num > 20) {
    return 'Please enter a valid number (0-20)';
  }
  return undefined;
};

export const validateFullPaymentBathrooms = (
  bathrooms: string,
  propertyType: string
): string | undefined => {
  // Only required for House, Apartment, Farmhouse
  if (!['House', 'Apartment', 'Farmhouse'].includes(propertyType)) {
    return;
  }

  if (!bathrooms || !bathrooms.trim()) {
    return 'Number of bathrooms is required';
  }

  const num = Number(bathrooms);
  if (Number.isNaN(num) || num < 0 || num > 15) {
    return 'Please enter a valid number of bathrooms';
  }

  return;
};

export const validateFullPaymentFloorNumber = (
  floorNumber: string,
  propertyType: string
): string | undefined => {
  // ONLY required for Apartment
  // Shop/Commercial use floorLocation instead
  if (propertyType !== 'Apartment') {
    return undefined;
  }
  if (!floorNumber.trim()) {
    return 'Floor number is required';
  }
  const num = Number(floorNumber);
  if (isNaN(num) || num < 0 || num > 100) {
    return 'Please enter a valid floor (0-100)';
  }
  return undefined;
};

export const validateFullPaymentDescription = (description: string): string | undefined => {
  if (!description.trim()) {
    return 'Description is required';
  }
  if (description.trim().length < 50) {
    return 'Description must be at least 50 characters';
  }
  if (description.trim().length > 2000) {
    return 'Description must not exceed 2000 characters';
  }
  return undefined;
};

export const validateFullPaymentVideo = (url: string): string | undefined => {
  if (!url.trim()) {
    return undefined; // Optional field
  }

  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  const vimeoRegex = /^(https?:\/\/)?(www\.)?vimeo\.com\/.+/;

  if (!youtubeRegex.test(url) && !vimeoRegex.test(url)) {
    return 'Please enter a valid YouTube or Vimeo URL';
  }
  return undefined;
};

export const validateFullPaymentImages = (images: File[]): string | undefined => {
  if (images.length === 0) {
    return 'At least 1 image is required';
  }
  if (images.length > 10) {
    return 'Maximum 10 images allowed';
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  for (const file of images) {
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPG, PNG, and WebP images are allowed';
    }
    if (file.size > maxSize) {
      return 'Each image must be less than 5MB';
    }
  }
  return undefined;
};

export const validateFullPaymentWhatsApp = (phone: string): string | undefined => {
  if (!phone.trim()) {
    return undefined; // Optional field
  }

  // Pakistani phone number validation
  const phoneRegex = /^(\+92|0)?3[0-9]{9}$/;
  const cleanPhone = phone.replace(/[\s-]/g, '');

  if (!phoneRegex.test(cleanPhone)) {
    return 'Please enter a valid Pakistani mobile number';
  }
  return undefined;
};

// Complete form validation for Full Payment
export const validateFullPaymentForm = (
  formData: FullPaymentFormData
): FullPaymentFormErrors => {
  const errors: FullPaymentFormErrors = {};

  // ========== ALWAYS REQUIRED ==========
  const titleError = validateFullPaymentTitle(formData.title);
  if (titleError) errors.title = titleError;

  const priceError = validateFullPaymentPrice(formData.price);
  if (priceError) errors.price = priceError;

  const areaError = validateFullPaymentArea(formData.area);
  if (areaError) errors.area = areaError;

  const cityError = validateFullPaymentCity(formData.city);
  if (cityError) errors.city = cityError;

  const societyError = validateFullPaymentSociety(formData.society, formData.customSociety);
  if (societyError) errors.society = societyError;

  const descriptionError = validateFullPaymentDescription(formData.description);
  if (descriptionError) errors.description = descriptionError;

  const imagesError = validateFullPaymentImages(formData.images);
  if (imagesError) errors.images = imagesError;

  // ========== CONDITIONAL - Based on Property Type ==========
  
  // Bedrooms: Required for House, Apartment, Farmhouse
  // NOT required for: Plot, Shop, Commercial
  if (['House', 'Apartment', 'Farmhouse'].includes(formData.propertyType)) {
    if (!formData.bedrooms.trim()) {
      errors.bedrooms = 'Number of bedrooms is required';
    } else {
      const num = Number(formData.bedrooms);
      if (isNaN(num) || num < 0 || num > 20) {
        errors.bedrooms = 'Please enter a valid number (0-20)';
      }
    }
  }

  // Bathrooms: Required for House, Apartment, Farmhouse
  // NOT required for: Plot, Shop, Commercial
  if (['House', 'Apartment', 'Farmhouse'].includes(formData.propertyType)) {
    if (!formData.bathrooms.trim()) {
      errors.bathrooms = 'Number of bathrooms is required';
    } else {
      const num = Number(formData.bathrooms);
      if (isNaN(num) || num < 0 || num > 15) {
        errors.bathrooms = 'Please enter a valid number (0-15)';
      }
    }
  }

  // Floor Number: ONLY required for Apartment
  if (formData.propertyType === 'Apartment') {
    if (!formData.floorNumber.trim()) {
      errors.floorNumber = 'Floor number is required';
    } else {
      const num = Number(formData.floorNumber);
      if (isNaN(num) || num < 0 || num > 100) {
        errors.floorNumber = 'Please enter a valid floor (0-100)';
      }
    }
  }

  // ========== OPTIONAL FIELDS ==========
  const videoError = validateFullPaymentVideo(formData.videoUrl);
  if (videoError) errors.videoUrl = videoError;

  const whatsappError = validateFullPaymentWhatsApp(formData.whatsappNumber);
  if (whatsappError) errors.whatsappNumber = whatsappError;

  return errors;
};

export const hasFullPaymentErrors = (errors: FullPaymentFormErrors): boolean => {
  return Object.keys(errors).length > 0;
};

// ============================================
// LEGACY VALIDATORS (for backward compatibility)
// ============================================

export const validateTitle = (title: string): string | undefined => {
  return validateFullPaymentTitle(title);
};

export const validatePrice = (price: string): string | undefined => {
  return validateFullPaymentPrice(price);
};

export const validateArea = (area: string): string | undefined => {
  return validateFullPaymentArea(area);
};

export const validateDeveloper = (developer: string): string | undefined => {
  if (!developer.trim()) {
    return 'Please select a developer';
  }
  return undefined;
};

export const validateCity = (city: string): string | undefined => {
  return validateFullPaymentCity(city);
};

export const validateBedrooms = (
  bedrooms: string,
  propertyType: string
): string | undefined => {
  return validateFullPaymentBedrooms(bedrooms, propertyType);
};

export const validateBathrooms = (
  bathrooms: string,
  propertyType: string
): string | undefined => {
  return validateFullPaymentBathrooms(bathrooms, propertyType);
};

export const validateDescription = (description: string): string | undefined => {
  return validateFullPaymentDescription(description);
};

export const validateVideo = (url: string): string | undefined => {
  return validateFullPaymentVideo(url);
};

export const validateImages = (images: File[]): string | undefined => {
  return validateFullPaymentImages(images);
};

export const validatePropertyForm = (
  formData: PropertyFormData
): PropertyFormErrors => {
  const errors: PropertyFormErrors = {};

  const titleError = validateTitle(formData.title);
  if (titleError) errors.title = titleError;

  const priceError = validatePrice(formData.price);
  if (priceError) errors.price = priceError;

  const areaError = validateArea(formData.area);
  if (areaError) errors.area = areaError;

  const developerError = validateDeveloper(formData.developer);
  if (developerError) errors.developer = developerError;

  const cityError = validateCity(formData.city);
  if (cityError) errors.city = cityError;

  const bedroomsError = validateBedrooms(formData.bedrooms, formData.propertyType);
  if (bedroomsError) errors.bedrooms = bedroomsError;

  const bathroomsError = validateBathrooms(formData.bathrooms, formData.propertyType);
  if (bathroomsError) errors.bathrooms = bathroomsError;

  const descriptionError = validateDescription(formData.description);
  if (descriptionError) errors.description = descriptionError;

  const videoError = validateVideo(formData.video);
  if (videoError) errors.video = videoError;

  const imagesError = validateImages(formData.images);
  if (imagesError) errors.images = imagesError;

  return errors;
};

export const hasErrors = (errors: PropertyFormErrors): boolean => {
  return Object.keys(errors).length > 0;
};
