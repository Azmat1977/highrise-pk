// lib/validations/developerOnboarding.ts
// Highrise.pk -- Developer 4-Stage Onboarding Zod Validation Schemas
// Enforces Pakistani regulatory formats (SECP, FBR NTN, NADRA CNIC, PK Phone)
// Pure ASCII comments | Zero external unvalidated dependencies

import { z } from 'zod';

// ============================================================================
// PAKISTANI REGULATORY REGEX PATTERNS
// ============================================================================

// NADRA CNIC: 13 digits, optional hyphens (e.g. 12345-1234567-1 or 1234512345671)
const CNIC_REGEX = /^[0-9]{5}-?[0-9]{7}-?[0-9]{1}$/;

// FBR NTN: 7 or 8 digits with optional hyphen check digit (e.g. 1234567-8 or 1234567)
const NTN_REGEX = /^[0-9]{7}(-?[0-9]{1})?$/;

// Pakistan Mobile: 03XXXXXXXXX or +923XXXXXXXXX or 923XXXXXXXXX
const PK_PHONE_REGEX = /^((\+92)|(0092)|(0))?3[0-9]{9}$/;

// ============================================================================
// ASSET SCHEMA
// ============================================================================

export const cloudinaryAssetSchema = z.object({
  url: z.string().url('Invalid asset URL'),
  public_id: z.string().min(1, 'Public ID is required'),
});

// ============================================================================
// COMPLETED PROJECT SCHEMA (STAGE 4)
// ============================================================================

export const completedProjectInputSchema = z.object({
  projectName: z
    .string()
    .min(3, 'Project name must be at least 3 characters')
    .max(150, 'Project name cannot exceed 150 characters'),
  projectType: z.enum([
    'residential_society',
    'residential_highrise',
    'apartment_complex',
    'commercial_society',
    'highrise_building',
    'mixed_use',
    'townhouse_complex',
    'gated_community',
    'housing_scheme',
    'township',
    'farmhouse_society',
    'commercial_plaza',
    'shopping_mall',
    'corporate_office_tower',
    'industrial_park',
    'retirement_community',
    'student_housing',
  ]),
  city: z.string().min(2, 'City is required'),
  area: z.string().min(2, 'Area/Locality is required'),
  startYear: z.number().int().min(1950).max(new Date().getFullYear()).optional(),
  completionYear: z
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 10, 'Completion year is too far in future'),
  status: z.enum([
    'completed',
    'under_construction',
    'ready_for_possession',
    'delayed',
    'on_hold',
  ]),
  totalUnits: z.number().int().nonnegative().optional(),
  totalArea: z.string().max(100).optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  images: z.array(z.string().url()).min(1, 'At least 1 project image is required').max(5),
});

// ============================================================================
// STAGE 1: COMPANY & CORPORATE IDENTITY
// ============================================================================

export const stage1Schema = z.object({
  developerType: z.enum(['builder', 'developer', 'society', 'corporate', 'individual']),
  companyName: z
    .string()
    .min(3, 'Company name must be at least 3 characters')
    .max(150, 'Company name cannot exceed 150 characters'),
  companyType: z.string().min(2, 'Please select corporate structure (e.g. Private Limited, Partnership)'),
  establishedYear: z
    .number()
    .int()
    .min(1900, 'Year must be after 1900')
    .max(new Date().getFullYear(), 'Established year cannot be in the future'),
  ceoName: z.string().max(100).optional(),
  tagline: z.string().max(200, 'Tagline cannot exceed 200 characters').optional(),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  email: z.string().email('Valid official email address is required'),
  phone: z.string().regex(PK_PHONE_REGEX, 'Enter a valid Pakistan phone number (03XXXXXXXXX)'),
  whatsapp: z.string().regex(PK_PHONE_REGEX, 'Enter a valid Pakistan WhatsApp number').optional().or(z.literal('')),
  website: z.string().url('Enter a valid URL (e.g. https://company.com)').optional().or(z.literal('')),
  city: z.string().min(2, 'Primary headquarter city is required'),
  officeAddress: z.string().min(5, 'Physical head office address is required'),
  operatingCities: z.array(z.string()).min(1, 'Select at least one operating city'),
  logo: cloudinaryAssetSchema.optional(),
  coverImage: cloudinaryAssetSchema.optional(),
});

// ============================================================================
// STAGE 2: TAX & REGULATORY KYC (FBR + SECP)
// ============================================================================

export const stage2Schema = z.object({
  ntnNumber: z.string().regex(NTN_REGEX, 'Enter a valid FBR NTN (7 or 8 digits, e.g. 1234567-8)'),
  secpNumber: z.string().min(4, 'SECP registration number is required (min 4 characters)').max(50),
  strnNumber: z.string().max(50).optional().or(z.literal('')),
  legalDocs: z.object({
    ntnCertificate: cloudinaryAssetSchema.optional(),
    secpCertificate: cloudinaryAssetSchema.optional(),
    memorandum: cloudinaryAssetSchema.optional(),
    articlesOfAssociation: cloudinaryAssetSchema.optional(),
  }).optional(),
});

// ============================================================================
// STAGE 3: AUTHORIZED REPRESENTATIVE (NADRA KYC)
// ============================================================================

export const stage3Schema = z.object({
  authorizedPersonName: z.string().min(3, 'Representative full name is required'),
  authorizedPersonDesignation: z.string().min(2, 'Designation is required (e.g. CEO, Director)'),
  authorizedPersonCnic: z.string().regex(CNIC_REGEX, 'Enter a valid 13-digit NADRA CNIC (XXXXX-XXXXXXX-X)'),
  authorizedPersonPhone: z.string().regex(PK_PHONE_REGEX, 'Enter a valid representative mobile number'),
  authorizedPersonEmail: z.string().email('Enter a valid representative email address'),
  legalDocs: z.object({
    authorizedPersonCnicFrontImage: cloudinaryAssetSchema.optional(),
    authorizedPersonCnicBackImage: cloudinaryAssetSchema.optional(),
  }).optional(),
});

// ============================================================================
// STAGE 4: TRACK RECORD & SUBMISSION DECLARATION
// ============================================================================

export const stage4Schema = z.object({
  completedProjects: z.array(completedProjectInputSchema).max(50).default([]),
  totalUnitsDelivered: z.number().int().nonnegative().optional(),
  totalLandArea: z.number().nonnegative().optional(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must certify that all provided corporate documents are authentic',
  }),
});

// ============================================================================
// FULL SUBMISSION SCHEMA (STAGES 1 - 4 COMBINED)
// ============================================================================

export const developerOnboardingSubmitSchema = z.object({
  // Stage 1
  developerType: stage1Schema.shape.developerType,
  companyName: stage1Schema.shape.companyName,
  companyType: stage1Schema.shape.companyType,
  establishedYear: stage1Schema.shape.establishedYear,
  ceoName: stage1Schema.shape.ceoName,
  tagline: stage1Schema.shape.tagline,
  description: stage1Schema.shape.description,
  email: stage1Schema.shape.email,
  phone: stage1Schema.shape.phone,
  whatsapp: stage1Schema.shape.whatsapp,
  website: stage1Schema.shape.website,
  city: stage1Schema.shape.city,
  officeAddress: stage1Schema.shape.officeAddress,
  operatingCities: stage1Schema.shape.operatingCities,
  logo: stage1Schema.shape.logo,
  coverImage: stage1Schema.shape.coverImage,

  // Stage 2
  ntnNumber: stage2Schema.shape.ntnNumber,
  secpNumber: stage2Schema.shape.secpNumber,
  strnNumber: stage2Schema.shape.strnNumber,
  legalDocs: z.object({
    ntnCertificate: cloudinaryAssetSchema.optional(),
    secpCertificate: cloudinaryAssetSchema.optional(),
    memorandum: cloudinaryAssetSchema.optional(),
    articlesOfAssociation: cloudinaryAssetSchema.optional(),
    authorizedPersonCnicFrontImage: cloudinaryAssetSchema.optional(),
    authorizedPersonCnicBackImage: cloudinaryAssetSchema.optional(),
  }).optional(),

  // Stage 3
  authorizedPersonName: stage3Schema.shape.authorizedPersonName,
  authorizedPersonDesignation: stage3Schema.shape.authorizedPersonDesignation,
  authorizedPersonCnic: stage3Schema.shape.authorizedPersonCnic,
  authorizedPersonPhone: stage3Schema.shape.authorizedPersonPhone,
  authorizedPersonEmail: stage3Schema.shape.authorizedPersonEmail,

  // Stage 4
  completedProjects: stage4Schema.shape.completedProjects,
  totalUnitsDelivered: stage4Schema.shape.totalUnitsDelivered,
  totalLandArea: stage4Schema.shape.totalLandArea,
  agreedToTerms: stage4Schema.shape.agreedToTerms,
});

// ============================================================================
// DRAFT SAVE SCHEMA (All fields optional for progressive saving)
// ============================================================================

export const developerOnboardingDraftSchema = developerOnboardingSubmitSchema.partial();

export type Stage1Input = z.infer<typeof stage1Schema>;
export type Stage2Input = z.infer<typeof stage2Schema>;
export type Stage3Input = z.infer<typeof stage3Schema>;
export type Stage4Input = z.infer<typeof stage4Schema>;
export type DeveloperOnboardingSubmitInput = z.infer<typeof developerOnboardingSubmitSchema>;
export type DeveloperOnboardingDraftInput = z.infer<typeof developerOnboardingDraftSchema>;
