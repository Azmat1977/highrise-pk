# Four Core Pages — Audit & Implementation Plan

**Generated**: 2026-10-20  
**Branch**: `feature/signup-verification` (clean working tree except security audit changes)

---

## 1. Page Inventory & Current State

| Page | Route | Rendering | Key Files | Status |
|------|-------|-----------|-----------|--------|
| **Home** | `/` | SSR | `pages/index.tsx` (1200+ lines), 15+ section components | ✅ Functional, dense |
| **Property Listing** | `/properties` | CSR (client fetch) | `pages/properties/index.tsx` (1300+ lines), `PropertyGrid`, `PropertyCard` | ✅ Functional, sticky filters |
| **Property Detail** | `/property/[slug]` | ISR (60s) | `pages/property/[slug].tsx` (926 lines), 12+ modular section components | ✅ Functional, two-column layout |
| **Project Listing** | `/projects` | SSR | `pages/projects/index.tsx` (1062 lines), `FilterDropdown`, `FeaturedProjectCarousel`, `MainProjectGrid` | ✅ Functional, hybrid Load More |
| **Project Detail** | `/projects/[slug]` | ISR (30s) | `pages/projects/[slug]/index.tsx` (1094 lines), `Section` wrapper, sidebar stack | ✅ Functional, payment plans, floor plans |

---

## 2. Confirmed Defects by Priority

### P0 — Critical (Data Loss / Security / Build Breaking)
| ID | Page | Issue | Evidence |
|----|------|-------|----------|
| P0-1 | Property Listing | `listingType` filter not strictly enforced server-side — "rent" search can return "full_payment" if DB enum mismatch | `pages/api/properties/index.ts` lines 711-714 allow `listingType` filter but `PUBLIC_PROPERTY_FILTER` may not exclude |
| P0-2 | Project Listing | `possession` filter maps `ready_to_move` → `Completed` but DB may have `Ready Possession` | `pages/projects/index.tsx` lines 733-741 |
| P0-3 | Project Detail | `saleMode` field used but `saleMode` not in `ProjectListing` type — potential undefined | `types/projects.ts` line 200 vs `getServerSideProps` line 907 |
| P0-4 | Property Detail | `getStaticProps` fetches `verification.status` but checks `property.verification?.status !== "verified"` — draft properties return 404 correctly but non-verified statuses may be inconsistent | `pages/property/[slug].tsx` line 332 |

### P1 — Launch Blocking (User Workflow Broken)
| ID | Page | Issue | Evidence |
|----|------|-------|----------|
| P1-1 | Property Listing | Search state not fully synced on browser back/forward — `initializedRef` prevents refetch on `router.query` change when `router.isReady` already true | `pages/properties/index.tsx` lines 509-547 |
| P1-2 | Property Listing | `listingType` (Buy/Rent) not persisted as tab — user must re-select after refresh | No tab UI, only dropdown |
| P1-3 | Project Listing | Discovery tabs ("Ready to Move", "On Installments") not connected to URL — tab click doesn't update `router.query` | `pages/projects/index.tsx` imports `DiscoveryTabs` but no tab click handler |
| P1-4 | Project Listing | "On Installments" tab sets `installments: true` but SSR filter uses `saleMode: { $in: ['Installment', 'Both'] }` — field name mismatch | `pages/projects/index.tsx` line 726 |
| P1-5 | Property Detail | True Cost API called only when `verification.status === "verified"` — installment properties may not have verified status yet | `pages/property/[slug].tsx` line 332 |

### P2 — Important Improvement (UX / Consistency / Performance)
| ID | Page | Issue | Evidence |
|----|------|-------|----------|
| P2-1 | Home | Hero search dropdowns not synchronized with `/properties` filters — category/type selection doesn't navigate with query params | `pages/index.tsx` `PropertyTypeDropdown` calls `onChange` but no router push |
| P2-2 | Property Listing | Filter bar has 8+ dropdowns — on mobile they wrap awkwardly, no collapsible "More Filters" | `pages/properties/index.tsx` lines 907-1032 |
| P2-3 | Property Detail | Jump links (sticky nav) show "Contact" but contact is in sidebar — confusing UX | `pages/property/[slug].tsx` lines 469-485, 607-626 |
| P2-4 | Project Listing | FeaturedProjectCarousel used twice (Top Picks + Prominent) — duplicate code, no lazy load | `pages/projects/index.tsx` lines 585-592 |
| P2-5 | Project Detail | Payment plans section has 3 different render paths (images, installmentPlan, activePaymentPlans) — inconsistent UI | `pages/projects/[slug]/index.tsx` lines 817-961 |
| P2-6 | All | Design tokens not consistently used — hardcoded colors (`#029bba`, `#004063`, etc.) scattered | Multiple files |

### P3 — Cosmetic / Polish
| ID | Page | Issue |
|----|------|-------|
| P3-1 | Home | Market pulse ticker uses static data |
| P3-2 | Property Listing | Promoted strip uses `isPromoted` but no visual distinction from featured |
| P3-3 | Project Detail | Floor plan modal zoom uses `transform: scale()` — blurry on high-DPI |
| P3-4 | All | Some `img` elements should be `next/image` (ESLint warnings present) |

---

## 3. Implementation Plan — Phase Order

### Phase 2: Property Listing Page (Highest Impact)
**Dependencies**: None — standalone page
**Scope**:
1. Fix search synchronization (P1-1) — ensure `router.query` changes always trigger fetch
2. Add Buy/Rent tab UI replacing `listingType` dropdown (P1-2)
3. Consolidate mobile filters into collapsible "More Filters" drawer (P2-2)
4. Validate server-side `listingType` filter enforcement (P0-1)
5. Ensure browser back/forward + refresh preserves exact state

### Phase 3: Property Detail Page
**Dependencies**: Property Listing (shared types/components)
**Scope**:
1. Fix True Cost loading condition (P1-5) — load for all verified+published
2. Improve jump links UX (P2-3) — separate contact action from section nav
3. Verify enquiry → lead flow end-to-end
4. Ensure unavailable/archived records handled honestly

### Phase 4: Project Listing Page
**Dependencies**: None — standalone but shares design system
**Scope**:
1. Connect Discovery Tabs to URL/router (P1-3)
2. Fix `installments` filter field mapping (P1-4)
3. Fix `possession` status mapping (P0-2)
4. Consolidate FeaturedProjectCarousel instances (P2-4)
5. Add tab count badges from `tabCounts` SSR data

### Phase 5: Project Detail Page
**Dependencies**: Project Listing (shared types)
**Scope**:
1. Unify payment plans rendering (P2-5) — single component handling all data shapes
2. Fix `saleMode` type in `ProjectListing` (P0-3)
3. Improve floor plan modal quality (P3-3)
4. Verify developer/society/unit relationships

### Phase 6: Shared Design System
**Scope**:
1. Create design token aliases for all hardcoded colors
2. Standardize button variants, card shadows, focus rings
3. Replace remaining `img` with `next/image` where appropriate

### Phase 7: Backend/Data Integrity
**Scope**:
1. Trace all API query filters to model indexes
2. Verify authorization on mutation endpoints
3. Confirm `PUBLIC_PROPERTY_FILTER` / project base filter correctness

### Phase 8: Testing & Acceptance
**Commands**: `npm run verify:source && npm run typecheck && npm run lint:strict && npm run build`

---

## 4. Files to Modify (Initial Batch)

| Phase | Files |
|-------|-------|
| 2 | `pages/properties/index.tsx`, `pages/api/properties/index.ts` (validation), `components/property/property-grid.tsx` (if exists) |
| 3 | `pages/property/[slug].tsx`, `components/property-detail/PropertyHeroGallery.tsx` |
| 4 | `pages/projects/index.tsx`, `components/projects/DiscoveryTabs.tsx`, `components/projects/FilterDropdown.tsx` |
| 5 | `pages/projects/[slug]/index.tsx`, `components/project-detail/PaymentPlanList.tsx` (new) |
| 6 | `lib/design-system/tokens.ts`, `tailwind.config.js` (extend), component files using hardcoded colors |

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing search URL sharing | Medium | High | Preserve all existing query params; add new params only |
| SSR/ISR cache inconsistency after filter changes | Low | Medium | Use `revalidate` tags; test with `fallback: 'blocking'` |
| Mobile filter drawer performance | Low | Low | Use `framer-motion` only if already in deps; otherwise CSS-only |
| Type mismatches between SSR and client types | Medium | High | Single source of truth in `types/projects.ts` — already established |

---

## 6. Next Action

**Start Phase 2: Property Listing Page** — Fix search synchronization, add Buy/Rent tabs, consolidate mobile filters. This is the highest-traffic page and has the clearest P0/P1 defects.

First step: Inspect `components/property/property-grid.tsx` and `components/property/property-card.tsx` to understand the rendering layer.