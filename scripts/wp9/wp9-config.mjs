export const REQUIRED_CANONICAL_MODULES = [
  'lib/property/propertyLifecycle.ts',
  'lib/property/publicProperty.ts',
  'lib/property/propertyTaxonomy.ts',
  'lib/property/propertyNormalization.ts',
  'lib/property/propertyAuthorization.ts',
  'lib/property/propertyPublicDto.ts',
  'lib/property/propertyService.ts',
  'lib/property/propertyDecisionState.ts',
  'lib/property/propertyDeletion.ts',
  'lib/property/propertyCommunicationContract.ts',
  'lib/property/propertyLeadRecipient.ts',
  'lib/property/propertyLeadAccess.ts',
  'lib/property/propertyCommunicationService.ts',
];

export const REQUIRED_PROPERTY_ROUTES = [
  'pages/api/properties/index.ts',
  'pages/api/properties/[id]/index.ts',
  'pages/api/properties/by-slug/[slug].ts',
  'pages/api/properties/[id]/contact.ts',
  'pages/api/reports/property.ts',
];

export const WP8_INTEGRATION_EXPECTATIONS = [
  'models/Lead.ts',
  'pages/property/[slug].tsx',
];

export const PUBLIC_CONSUMERS = [
  'pages/api/properties/index.ts',
  'pages/api/properties/by-slug/[slug].ts',
  'pages/properties/sitemap.xml.tsx',
  'pages/api/favorites/index.ts',
  'pages/api/recently-viewed/index.ts',
  'pages/api/recently-viewed/add.ts',
];

export const PRIVATE_FIELD_PATTERNS = [
  /ownershipProof(?:Encrypted|PublicId|Url|URL)?/i,
  /encryptedPublicId/i,
  /cloudinaryPublicId/i,
  /apiSecret/i,
  /cnic/i,
  /whatsApp/i,
  /phoneNumber/i,
  /contactPerson/i,
  /sellerEmail/i,
  /sellerPhone/i,
];

export const LEGACY_PROPERTY_ROUTE_CANDIDATES = [
  'pages/api/admin/moderation/restore-property.ts',
  'pages/api/admin/moderation/update-property-status.ts',
];

export const LEGACY_FORM_CANDIDATES = [
  'components/property/forms/PropertyForm.tsx',
  'components/property/forms/EditPropertyForm.tsx',
  'components/property/forms/PropertyEditForm.tsx',
  'components/property/property-filters.tsx',
];

export const CANONICAL_BUILD_SCRIPT_PREFERENCES = {
  lint: ['lint:strict', 'lint'],
  security: ['verify:source', 'security:check'],
  env: ['verify:env'],
  typecheck: ['typecheck', 'type-check'],
  build: ['build'],
};
