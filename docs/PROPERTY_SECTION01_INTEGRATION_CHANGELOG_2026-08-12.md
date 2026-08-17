# Highrise.pk — Section 01 Property WP1→WP8 Integration Changelog

**Date:** 2026-08-12  
**Source of truth:** `Highrise-pk Backup 12 aug 2026.zip`  
**Canonical local project remains:** `C:\dev\highrise-pk`

## What this cumulative integration implements

### WP1 — Canonical contracts
- central lifecycle and transition policy;
- one public visibility policy;
- Pakistan-market taxonomy and query normalization;
- normalized/allowlisted Property mutation helpers;
- explicit resource-level authorization helpers.

### WP2 — Create/Edit/Submit
- unified create/edit form shell;
- owner edit loads through owner-authorized API;
- Draft → Pending submission semantics;
- Under Review / Flagged owner edit lock;
- material edits return eligible listings to Draft/re-review.

### WP3 — Media & private evidence
- uploader-bound HMAC asset tokens for new Property media;
- public gallery/floor-plan ownership validation;
- encrypted durable private ownership-proof Cloudinary references;
- protected short-lived ownership-proof retrieval;
- cleanup on failed creation/replacement paths.

### WP4 — Public discovery
- canonical Residential/Commercial/Plots taxonomy;
- multi-value type/category serializer;
- canonical public visibility in list/sitemap/decision consumers;
- obsolete unreferenced Property filter component retired.

### WP5 — Property detail/trust/contact
- direct DB-backed Property service instead of fragile internal HTTP self-fetch;
- canonical slug + legacy ObjectId redirect;
- Developer → Agent → Owner accountable listing actor;
- least-privilege public DTO and factual trust summary;
- authenticated contact reveal;
- Property view telemetry;
- floor-plan handling and truthful decision-support copy.

### WP6 — Decision state
- Favorites public-state recheck + idempotent guest migration;
- Recently Viewed canonical public-state reconciliation;
- Property/Project Compare resolver and account-authoritative empty-state behavior;
- real Save/Compare actions on Property Detail;
- price updates obey material-edit lifecycle/re-review rules.

### WP7 — Safety/moderation/deletion
- reports are risk signals, not automatic guilt;
- risk engine is assessment-only and cannot auto-delete/flag a Property;
- duplicate/self-report abuse constraints;
- canonical admin moderation and audit semantics;
- legacy competing moderation mutations retired with 410;
- owner Active/Trash views;
- restore returns safely to Draft rather than auto-republishing;
- real 30-day owner permanent-delete grace;
- public/private media cleanup;
- persistent encrypted cleanup queue with retry/backoff/stale-worker recovery;
- protected cleanup cron endpoint.

### WP8 — Communication
- one narrow Property communication contract for inquiry/callback/site visit;
- browser cannot choose recipient or sender identity;
- DB-current requester identity;
- accountable Developer → Agent → Owner recipient resolver;
- inactive explicit recipient fails closed;
- self-inquiry blocked;
- Lead supports Owner recipient role;
- exact `assignedToUserId + assignedToRole + entityType=property` dashboard/object authorization;
- generic `/api/leads` refuses Property routing and preserves non-Property Project behavior.

### Certification tooling
- WP9 automated certification scripts installed;
- WP10 manual/browser/API certification scripts installed;
- WP10 112-case matrix and evidence template installed.

## File inventory before integration metadata docs

### Modified (47)
- `components/UniversalInquiryModal.tsx`
- `components/property/forms/UnifiedPropertyForm.tsx`
- `components/property/forms/shared/usePropertyForm.ts`
- `components/property/forms/tabs/TabMedia.tsx`
- `hooks/useCompare.ts`
- `hooks/useFavorites.ts`
- `lib/autoProtection.ts`
- `lib/cloudinary.ts`
- `lib/riskEngine.ts`
- `models/AdminAuditLog.ts`
- `models/Lead.ts`
- `models/Property.ts`
- `models/Report.ts`
- `pages/api/admin/moderation/developer-heat.ts`
- `pages/api/admin/moderation/flagged.ts`
- `pages/api/admin/moderation/restore-property.ts`
- `pages/api/admin/moderation/update-property-status.ts`
- `pages/api/admin/properties/[propertyId]/index.ts`
- `pages/api/admin/properties/[propertyId]/permanent-delete.ts`
- `pages/api/admin/properties/[propertyId]/trash.ts`
- `pages/api/admin/reports/[id].ts`
- `pages/api/admin/reports/index.ts`
- `pages/api/compare/[shareId].ts`
- `pages/api/compare/add.ts`
- `pages/api/compare/index.ts`
- `pages/api/favorites/index.ts`
- `pages/api/favorites/toggle.ts`
- `pages/api/leads/[id].ts`
- `pages/api/leads/index.ts`
- `pages/api/owner/leads.ts`
- `pages/api/properties/[id]/index.ts`
- `pages/api/properties/[id]/permanent-delete.ts`
- `pages/api/properties/[id]/trash.ts`
- `pages/api/properties/by-slug/[slug].ts`
- `pages/api/properties/index.ts`
- `pages/api/properties/my-properties.ts`
- `pages/api/properties/track-price.ts`
- `pages/api/properties/upload-ownership-proof.ts`
- `pages/api/recently-viewed/add.ts`
- `pages/api/recently-viewed/index.ts`
- `pages/api/reports/property.ts`
- `pages/api/upload/index.ts`
- `pages/edit-property/[id].tsx`
- `pages/my-properties.tsx`
- `pages/properties/index.tsx`
- `pages/properties/sitemap.xml.tsx`
- `pages/property/[slug].tsx`

### Added (42)
- `components/property/forms/shared/propertyFormAdapter.ts`
- `docs/WP10_API_ABUSE_PRIVACY.md`
- `docs/WP10_BROWSER_DEVICE_MATRIX.md`
- `docs/WP10_BUILD_STATUS.md`
- `docs/WP10_MANUAL_CERTIFICATION.md`
- `docs/WP10_README_FIRST.md`
- `docs/WP10_WINDOWS_RUNBOOK.md`
- `docs/WP9_AUTOMATED_CERTIFICATION.md`
- `lib/property/propertyActor.ts`
- `lib/property/propertyAuthorization.ts`
- `lib/property/propertyCleanupQueue.ts`
- `lib/property/propertyCleanupWorker.ts`
- `lib/property/propertyCommunicationContract.ts`
- `lib/property/propertyCommunicationService.ts`
- `lib/property/propertyDecisionState.ts`
- `lib/property/propertyDeletion.ts`
- `lib/property/propertyLeadAccess.ts`
- `lib/property/propertyLeadRecipient.ts`
- `lib/property/propertyLifecycle.ts`
- `lib/property/propertyMedia.ts`
- `lib/property/propertyModeration.ts`
- `lib/property/propertyMutation.ts`
- `lib/property/propertyNormalization.ts`
- `lib/property/propertyPublicDto.ts`
- `lib/property/propertyService.ts`
- `lib/property/propertyTaxonomy.ts`
- `lib/property/propertyTrust.ts`
- `lib/property/publicProperty.ts`
- `lib/uploadAssetToken.ts`
- `models/PropertyCleanupJob.ts`
- `pages/api/cron/property-cleanup.ts`
- `pages/api/properties/[id]/communication.ts`
- `pages/api/properties/[id]/contact.ts`
- `pages/api/properties/[id]/ownership-proof.ts`
- `pages/api/properties/[id]/view.ts`
- `scripts/run-property-wp10.ps1`
- `scripts/run-property-wp9.ps1`
- `scripts/verify-property-wp10-framework.mjs`
- `scripts/verify-property-wp9-framework.mjs`
- `scripts/wp10/`
- `scripts/wp9/`
- `templates/`

### Deleted/retired (1)
- `components/property/property-filters.tsx`
