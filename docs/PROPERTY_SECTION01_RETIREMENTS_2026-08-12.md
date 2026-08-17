# Highrise.pk — Property Route / Component Retirements

**Date:** 2026-08-12

## Deleted
- `components/property/property-filters.tsx` — unreferenced legacy filter implementation; canonical discovery/filter behavior lives in the active Properties discovery flow and taxonomy serializer.

## Kept as explicit 410 retirement routes
- `pages/api/admin/moderation/restore-property.ts`
- `pages/api/admin/moderation/update-property-status.ts`

These files intentionally remain as authenticated `410 Gone` endpoints so old clients cannot silently continue using a competing Property state-mutation architecture. They should not be restored as active mutation handlers.

## Generic Lead boundary
`pages/api/leads/index.ts` remains for non-Property/Project lead compatibility, but Property requests are explicitly refused and must use `/api/properties/[id]/communication`.
