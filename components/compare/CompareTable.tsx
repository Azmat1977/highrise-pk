/**
 * components/compare/CompareTable.tsx
 *
 * Enterprise comparison table — side-by-side columns.
 * Handles BOTH projects and properties in unified view.
 *
 * ENTERPRISE PATTERN:
 *   → Fixed column widths (no stretching)
 *   → Empty slots shown when < 4 items (encourages "add more")
 *   → Sticky first column with row labels
 *   → Horizontal scroll on mobile
 */

'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  X,
  MapPin,
  BadgeCheck,
  ShieldCheck,
  Building2,
  Home as HomeIcon,
  Trophy,
  MessageSquare,
  ArrowRight,
  Loader2,
  BedDouble,
  Bath,
  Maximize2,
  Calendar,
  Plus,
} from 'lucide-react';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type CompareItemType = 'property' | 'project';

export interface CompareEntity {
  entityType: CompareItemType;
  data:       Record<string, unknown>;
}

export interface CompareTableProps {
  entities:   CompareEntity[];
  onRemove:   (entityType: CompareItemType, entityId: string) => Promise<void>;
  removingId: string | null;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MAX_COLUMNS = 4;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatPrice(price?: number | null): string {
  if (!price || price <= 0) return '—';
  if (price >= 10_000_000) return `PKR ${(price / 10_000_000).toFixed(1)} Cr`;
  if (price >= 100_000)    return `PKR ${(price / 100_000).toFixed(1)} Lac`;
  return `PKR ${price.toLocaleString('en-PK')}`;
}

function formatPriceRange(
  min?: number | null,
  max?: number | null,
): string {
  if (!min && !max) return 'On Request';
  if (min && max) return `${formatPrice(min)} – ${formatPrice(max)}`;
  if (min) return `${formatPrice(min)}+`;
  if (max) return `Up to ${formatPrice(max)}`;
  return 'On Request';
}

function formatArea(area?: number, unit?: string): string {
  if (!area) return '—';
  return `${area.toLocaleString()} ${unit || 'Sq.Ft.'}`;
}

function getShieldTier(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: 'text-emerald-600' };
  if (score >= 60) return { label: 'Trusted',   color: 'text-[#029bba]' };
  if (score >= 40) return { label: 'Good',      color: 'text-amber-600' };
  return { label: 'Pending', color: 'text-gray-400' };
}

// ─── EMPTY SLOT COMPONENTS ───────────────────────────────────────────────────

function EmptyColumnHeader(): React.ReactElement {
  return (
    <th className="w-[280px] min-w-[280px] max-w-[280px] p-4 align-top
                   border-l border-gray-100">
      <Link
        href="/projects"
        className="block group"
      >
        <div className="flex flex-col gap-3">
          <div className="relative aspect-[16/10] rounded-xl overflow-hidden
                          bg-gradient-to-br from-gray-50 to-gray-100
                          border-2 border-dashed border-gray-200
                          flex flex-col items-center justify-center gap-2
                          group-hover:border-[#029bba]/40
                          group-hover:bg-[#029bba]/5
                          transition-colors">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm
                            flex items-center justify-center
                            group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5 text-gray-400
                               group-hover:text-[#029bba]" />
            </div>
            <p className="text-xs font-bold text-gray-400
                          group-hover:text-[#029bba] transition-colors">
              Add More
            </p>
          </div>

          <div>
            <p className="text-sm font-black text-gray-300
                          group-hover:text-[#029bba] transition-colors">
              Empty Slot
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Browse projects
            </p>
          </div>
        </div>
      </Link>
    </th>
  );
}

function EmptyCell(): React.ReactElement {
  return (
    <td className="w-[280px] min-w-[280px] max-w-[280px]
                   px-4 py-4 align-top border-l border-gray-100
                   bg-gray-50/30">
      <span className="text-xs text-gray-300">—</span>
    </td>
  );
}

// ─── NORMALIZATION ───────────────────────────────────────────────────────────

interface NormalizedEntity {
  id:           string;
  entityType:   CompareItemType;
  title:        string;
  slug:         string;
  city:         string;
  area:         string;
  imageUrl:     string | null;
  imageCount:   number;
  price:        number | null;
  priceMin:     number | null;
  priceMax:     number | null;
  shieldScore:  number;
  isVerified:   boolean;
  nocStatus:    string;
  nocAuthority: string | null;
  developer:    string;
  developerBadge: string | null;
  category:     string;
  status:       string;
  bedrooms:     number | null;
  bathrooms:    number | null;
  areaSize:     number | null;
  areaUnit:     string | null;
  listingType:  string | null;
  detailUrl:    string;
}

function normalizeEntity(entity: CompareEntity): NormalizedEntity {
  const d = entity.data;
  const isProject = entity.entityType === 'project';

  let imageUrl: string | null = null;
  if (typeof d.primaryImage === 'string') {
    imageUrl = d.primaryImage;
  } else if (typeof d.featureImageUrl === 'string') {
    imageUrl = d.featureImageUrl;
  } else if (Array.isArray(d.images) && d.images.length > 0) {
    const imgs = d.images as Array<{ url?: string } | string>;
    const first = imgs[0];
    imageUrl = typeof first === 'string' ? first : (first?.url ?? null);
  }

  const slug = String(d.slug ?? d._id ?? '');

  return {
    id:           String(d._id ?? ''),
    entityType:   entity.entityType,
    title:        String(isProject ? d.projectName : d.title) || 'Untitled',
    slug,
    city:         String(d.city ?? ''),
    area:         String(d.area ?? ''),
    imageUrl,
    imageCount:   Array.isArray(d.images) ? d.images.length : 0,
    price:        !isProject && typeof d.price === 'number' ? d.price : null,
    priceMin:     isProject && typeof d.minPrice === 'number' ? d.minPrice : null,
    priceMax:     isProject && typeof d.maxPrice === 'number' ? d.maxPrice : null,
    shieldScore:  typeof d.highriseScore === 'number' ? d.highriseScore : 0,
    isVerified:   Boolean(d.isVerified),
    nocStatus:    String(d.nocStatus ?? 'not_applied'),
    nocAuthority: typeof d.approvalAuthority === 'string' ? d.approvalAuthority : null,
    developer:    String(d.developerName ?? '') || '—',
    developerBadge: typeof d.developerBadge === 'string' ? d.developerBadge : null,
    category:     String(d.projectCategory ?? d.propertyType ?? '—'),
    status:       String(d.projectStatus ?? d.listingType ?? '—'),
    bedrooms:     typeof d.bedrooms === 'number' ? d.bedrooms : null,
    bathrooms:    typeof d.bathrooms === 'number' ? d.bathrooms : null,
    areaSize:     typeof d.area === 'number' ? d.area : null,
    areaUnit:     typeof d.areaUnit === 'string' ? d.areaUnit : null,
    listingType:  typeof d.listingType === 'string' ? d.listingType : null,
    detailUrl:    isProject ? `/projects/${slug}` : `/property/${slug}`,
  };
}

// ─── BEST-IN-CATEGORY DETECTION ──────────────────────────────────────────────

interface BestPicks {
  bestPriceId:  string | null;
  bestShieldId: string | null;
}

function calculateBestPicks(entities: NormalizedEntity[]): BestPicks {
  if (entities.length < 2) {
    return { bestPriceId: null, bestShieldId: null };
  }

  const withPrice = entities
    .map(e => ({ id: e.id, p: e.price ?? e.priceMin ?? Infinity }))
    .filter(x => x.p !== Infinity && x.p > 0);
  const bestPrice = withPrice.length > 0
    ? withPrice.reduce((min, x) => x.p < min.p ? x : min)
    : null;

  const withShield = entities.filter(e => e.shieldScore > 0);
  const bestShield = withShield.length > 0
    ? withShield.reduce((max, e) => e.shieldScore > max.shieldScore ? e : max)
    : null;

  return {
    bestPriceId:  bestPrice?.id ?? null,
    bestShieldId: bestShield?.id ?? null,
  };
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function CompareTable({
  entities,
  onRemove,
  removingId,
}: CompareTableProps): React.ReactElement {

  const normalized = useMemo(() => entities.map(normalizeEntity), [entities]);
  const bestPicks  = useMemo(() => calculateBestPicks(normalized), [normalized]);
  const emptySlots = Math.max(0, MAX_COLUMNS - normalized.length);

  // Reusable empty slot renderer
  const renderEmptyCells = (rowKey: string) =>
    Array.from({ length: emptySlots }).map((_, i) => (
      <EmptyCell key={`${rowKey}-empty-${i}`} />
    ));

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100
                    overflow-hidden">

      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr>
              {/* First column: row labels */}
              <th className="w-[140px] min-w-[140px] max-w-[140px]
                             sticky left-0 bg-white z-10
                             border-r border-gray-100">
                <div className="p-4">
                  <p className="text-[10px] font-black text-gray-400
                                uppercase tracking-widest">
                    Comparing
                  </p>
                  <p className="text-lg font-black text-gray-900 mt-1">
                    {normalized.length} of {MAX_COLUMNS}
                  </p>
                </div>
              </th>

              {/* Filled columns */}
              {normalized.map((entity) => (
                <th
                  key={entity.id}
                  className="w-[280px] min-w-[280px] max-w-[280px]
                             p-4 align-top border-l border-gray-100"
                >
                  <div className="flex flex-col gap-3">
                    {/* Image */}
                    <Link
                      href={entity.detailUrl}
                      className="relative block aspect-[16/10] rounded-xl
                                 overflow-hidden bg-gray-100 group"
                    >
                      {entity.imageUrl ? (
                        <Image
                          src={entity.imageUrl}
                          alt={entity.title}
                          fill
                          className="object-cover group-hover:scale-105
                                     transition-transform duration-500"
                          sizes="280px"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br
                                        from-[#004063]/10 to-[#029bba]/10
                                        flex items-center justify-center">
                          {entity.entityType === 'project'
                            ? <Building2 className="w-8 h-8 text-[#029bba]/40" />
                            : <HomeIcon  className="w-8 h-8 text-[#029bba]/40" />}
                        </div>
                      )}

                      <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full
                                        text-[10px] font-black uppercase tracking-wider
                                        ${entity.entityType === 'project'
                                          ? 'bg-[#029bba] text-white'
                                          : 'bg-emerald-500 text-white'
                                        }`}>
                        {entity.entityType}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void onRemove(entity.entityType, entity.id);
                        }}
                        disabled={removingId === entity.id}
                        aria-label={`Remove ${entity.title}`}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full
                                   bg-white/95 shadow-md
                                   flex items-center justify-center
                                   hover:bg-red-500 hover:text-white
                                   transition-colors
                                   focus:outline-none focus:ring-2 focus:ring-red-400
                                   disabled:opacity-70 disabled:cursor-wait"
                      >
                        {removingId === entity.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
                          : <X className="w-3.5 h-3.5 text-gray-600" />
                        }
                      </button>
                    </Link>

                    <div>
                      <Link href={entity.detailUrl}>
                        <h3 className="font-black text-sm text-gray-900
                                       leading-tight line-clamp-2
                                       hover:text-[#029bba] transition-colors">
                          {entity.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <p className="text-xs text-gray-500 truncate">
                          {[entity.area, entity.city].filter(Boolean).join(', ') || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </th>
              ))}

              {/* Empty slot placeholders */}
              {Array.from({ length: emptySlots }).map((_, i) => (
                <EmptyColumnHeader key={`empty-header-${i}`} />
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">

            {/* PRICE */}
            <tr className="hover:bg-gray-50/40 transition-colors">
              <th className="sticky left-0 bg-white z-10 border-r border-gray-100
                             px-4 py-4 text-left align-top">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  Price
                </p>
              </th>
              {normalized.map((entity) => {
                const isBest = bestPicks.bestPriceId === entity.id;
                const priceStr = entity.entityType === 'project'
                  ? formatPriceRange(entity.priceMin, entity.priceMax)
                  : formatPrice(entity.price);
                return (
                  <td key={entity.id}
                      className={`w-[280px] min-w-[280px] max-w-[280px]
                                  px-4 py-4 align-top border-l border-gray-100
                                  ${isBest ? 'bg-emerald-50/50' : ''}`}>
                    {isBest && (
                      <div className="inline-flex items-center gap-1 mb-1.5
                                      px-2 py-0.5 rounded-full bg-emerald-500 text-white
                                      text-[9px] font-black uppercase tracking-wider">
                        <Trophy className="w-2.5 h-2.5" />
                        Best Price
                      </div>
                    )}
                    <p className={`font-black text-base ${
                      isBest ? 'text-emerald-700' : 'text-[#029bba]'
                    }`}>
                      {priceStr}
                    </p>
                  </td>
                );
              })}
              {renderEmptyCells('price')}
            </tr>

            {/* SHIELD SCORE */}
            <tr className="hover:bg-gray-50/40 transition-colors">
              <th className="sticky left-0 bg-white z-10 border-r border-gray-100
                             px-4 py-4 text-left align-top">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  Shield Score
                </p>
              </th>
              {normalized.map((entity) => {
                const isBest = bestPicks.bestShieldId === entity.id;
                const tier   = getShieldTier(entity.shieldScore);
                return (
                  <td key={entity.id}
                      className={`w-[280px] min-w-[280px] max-w-[280px]
                                  px-4 py-4 align-top border-l border-gray-100
                                  ${isBest ? 'bg-emerald-50/50' : ''}`}>
                    {isBest && (
                      <div className="inline-flex items-center gap-1 mb-1.5
                                      px-2 py-0.5 rounded-full bg-emerald-500 text-white
                                      text-[9px] font-black uppercase tracking-wider">
                        <Trophy className="w-2.5 h-2.5" />
                        Top Trusted
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className={`w-4 h-4 ${tier.color}`} />
                      <span className={`font-black text-base ${tier.color}`}>
                        {entity.shieldScore}
                      </span>
                      <span className={`text-xs font-semibold ${tier.color}`}>
                        {tier.label}
                      </span>
                    </div>
                  </td>
                );
              })}
              {renderEmptyCells('shield')}
            </tr>

            {/* NOC */}
            <tr className="hover:bg-gray-50/40 transition-colors">
              <th className="sticky left-0 bg-white z-10 border-r border-gray-100
                             px-4 py-4 text-left align-top">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  NOC Status
                </p>
              </th>
              {normalized.map((entity) => (
                <td key={entity.id}
                    className="w-[280px] min-w-[280px] max-w-[280px]
                               px-4 py-4 align-top border-l border-gray-100">
                  {entity.nocStatus === 'approved' ? (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1
                                    rounded-lg bg-emerald-50 border border-emerald-200">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-xs font-black text-emerald-700">
                        {entity.nocAuthority || 'Approved'}
                      </span>
                    </div>
                  ) : entity.nocStatus === 'pending' ? (
                    <span className="text-xs font-bold text-amber-600">⏳ Pending</span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              ))}
              {renderEmptyCells('noc')}
            </tr>

            {/* DEVELOPER */}
            <tr className="hover:bg-gray-50/40 transition-colors">
              <th className="sticky left-0 bg-white z-10 border-r border-gray-100
                             px-4 py-4 text-left align-top">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  Developer
                </p>
              </th>
              {normalized.map((entity) => (
                <td key={entity.id}
                    className="w-[280px] min-w-[280px] max-w-[280px]
                               px-4 py-4 align-top border-l border-gray-100">
                  <p className="font-bold text-xs text-gray-900 truncate">
                    {entity.developer}
                  </p>
                  {entity.developerBadge && (
                    <p className="text-[10px] font-black text-[#029bba] uppercase mt-0.5">
                      {entity.developerBadge.replace(/_/g, ' ')}
                    </p>
                  )}
                </td>
              ))}
              {renderEmptyCells('developer')}
            </tr>

            {/* CATEGORY */}
            <tr className="hover:bg-gray-50/40 transition-colors">
              <th className="sticky left-0 bg-white z-10 border-r border-gray-100
                             px-4 py-4 text-left align-top">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  Category
                </p>
              </th>
              {normalized.map((entity) => (
                <td key={entity.id}
                    className="w-[280px] min-w-[280px] max-w-[280px]
                               px-4 py-4 align-top border-l border-gray-100">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5
                                   rounded-full bg-gray-100 text-gray-700
                                   text-xs font-bold capitalize">
                    {entity.category.replace(/_/g, ' ')}
                  </span>
                </td>
              ))}
              {renderEmptyCells('category')}
            </tr>

            {/* STATUS */}
            <tr className="hover:bg-gray-50/40 transition-colors">
              <th className="sticky left-0 bg-white z-10 border-r border-gray-100
                             px-4 py-4 text-left align-top">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  Status
                </p>
              </th>
              {normalized.map((entity) => (
                <td key={entity.id}
                    className="w-[280px] min-w-[280px] max-w-[280px]
                               px-4 py-4 align-top border-l border-gray-100">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-bold text-gray-700 capitalize">
                      {entity.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </td>
              ))}
              {renderEmptyCells('status')}
            </tr>

            {/* BEDROOMS */}
            {normalized.some(e => e.bedrooms !== null) && (
              <tr className="hover:bg-gray-50/40 transition-colors">
                <th className="sticky left-0 bg-white z-10 border-r border-gray-100
                               px-4 py-4 text-left align-top">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                    Bedrooms
                  </p>
                </th>
                {normalized.map((entity) => (
                  <td key={entity.id}
                      className="w-[280px] min-w-[280px] max-w-[280px]
                                 px-4 py-4 align-top border-l border-gray-100">
                    {entity.bedrooms !== null ? (
                      <div className="flex items-center gap-1.5">
                        <BedDouble className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-bold text-gray-700">
                          {entity.bedrooms}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                ))}
                {renderEmptyCells('bedrooms')}
              </tr>
            )}

            {/* BATHROOMS */}
            {normalized.some(e => e.bathrooms !== null) && (
              <tr className="hover:bg-gray-50/40 transition-colors">
                <th className="sticky left-0 bg-white z-10 border-r border-gray-100
                               px-4 py-4 text-left align-top">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                    Bathrooms
                  </p>
                </th>
                {normalized.map((entity) => (
                  <td key={entity.id}
                      className="w-[280px] min-w-[280px] max-w-[280px]
                                 px-4 py-4 align-top border-l border-gray-100">
                    {entity.bathrooms !== null ? (
                      <div className="flex items-center gap-1.5">
                        <Bath className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-bold text-gray-700">
                          {entity.bathrooms}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                ))}
                {renderEmptyCells('bathrooms')}
              </tr>
            )}

            {/* AREA SIZE */}
            {normalized.some(e => e.areaSize !== null) && (
              <tr className="hover:bg-gray-50/40 transition-colors">
                <th className="sticky left-0 bg-white z-10 border-r border-gray-100
                               px-4 py-4 text-left align-top">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                    Area
                  </p>
                </th>
                {normalized.map((entity) => (
                  <td key={entity.id}
                      className="w-[280px] min-w-[280px] max-w-[280px]
                                 px-4 py-4 align-top border-l border-gray-100">
                    {entity.areaSize !== null ? (
                      <div className="flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm font-bold text-gray-700">
                          {formatArea(entity.areaSize, entity.areaUnit ?? undefined)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                ))}
                {renderEmptyCells('area')}
              </tr>
            )}

            {/* VERIFIED */}
            <tr className="hover:bg-gray-50/40 transition-colors">
              <th className="sticky left-0 bg-white z-10 border-r border-gray-100
                             px-4 py-4 text-left align-top">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  Verified
                </p>
              </th>
              {normalized.map((entity) => (
                <td key={entity.id}
                    className="w-[280px] min-w-[280px] max-w-[280px]
                               px-4 py-4 align-top border-l border-gray-100">
                  {entity.isVerified ? (
                    <div className="inline-flex items-center gap-1 text-emerald-600">
                      <BadgeCheck className="w-4 h-4" />
                      <span className="text-xs font-black">Yes</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              ))}
              {renderEmptyCells('verified')}
            </tr>

            {/* ACTION CTA */}
            <tr className="bg-gray-50/60">
              <th className="sticky left-0 bg-gray-50 z-10 border-r border-gray-100
                             px-4 py-4 text-left align-top">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                  Action
                </p>
              </th>
              {normalized.map((entity) => (
                <td key={entity.id}
                    className="w-[280px] min-w-[280px] max-w-[280px]
                               px-4 py-4 align-top border-l border-gray-100">
                  <div className="flex flex-col gap-2">
                    <Link
                      href={entity.detailUrl}
                      className="inline-flex items-center justify-center gap-1
                                 px-3 py-2 rounded-xl bg-[#029bba] text-white
                                 text-xs font-black hover:bg-[#017a94]
                                 transition-colors shadow-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
                    >
                      View Details
                      <ArrowRight className="w-3 h-3" />
                    </Link>

                    <Link
                      href={entity.detailUrl}
                      className="inline-flex items-center justify-center gap-1
                                 px-3 py-2 rounded-xl border-2 border-[#029bba]
                                 text-[#029bba] text-xs font-black
                                 hover:bg-[#029bba]/5 transition-colors
                                 focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Contact
                    </Link>
                  </div>
                </td>
              ))}
              {renderEmptyCells('action')}
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}