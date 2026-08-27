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
 *   → Pakistani Area Unit Normalization (Marla, Kanal, Sq.Ft.)
 *   → Sale vs. Rent Financial Model Guard & Rental Yield Estimator
 *   → "Highlight Differences Only" Filter Mode
 *   → "🤖 Ask ALEEM's Verdict" AI Modal Integration
 */

'use client';

import React, { useMemo, useState } from 'react';
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
  Bot,
  Sparkles,
  SlidersHorizontal,
  Info,
  TrendingUp,
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────

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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

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

function formatPakistaniArea(area?: number | null, unit?: string | null): string {
  if (!area || area <= 0) return '—';

  const rawUnit = (unit || 'Sq.Ft.').trim();
  const lowerUnit = rawUnit.toLowerCase();

  // If unit is explicitly Marla or Kanal
  if (lowerUnit.includes('marla')) {
    const sqft = Math.round(area * 225);
    return `${area.toLocaleString()} Marla (~${sqft.toLocaleString()} Sq.Ft.)`;
  }
  if (lowerUnit.includes('kanal')) {
    const marla = area * 20;
    const sqft = Math.round(area * 4500);
    return `${area.toLocaleString()} Kanal (${marla} Marla / ~${sqft.toLocaleString()} Sq.Ft.)`;
  }
  if (lowerUnit.includes('sq.yd') || lowerUnit.includes('sqyd') || lowerUnit.includes('yard')) {
    const sqft = Math.round(area * 9);
    return `${area.toLocaleString()} Sq.Yd. (~${sqft.toLocaleString()} Sq.Ft.)`;
  }

  // If raw number in Sq.Ft., convert to Pakistani Marla / Kanal
  if (area >= 4500) {
    const kanal = (area / 4500).toFixed(1).replace(/\.0$/, '');
    const marla = Math.round(area / 225);
    return `${marla} Marla / ${kanal} Kanal (${area.toLocaleString()} Sq.Ft.)`;
  }
  if (area >= 225) {
    const marla = (area / 225).toFixed(1).replace(/\.0$/, '');
    return `${marla} Marla (${area.toLocaleString()} Sq.Ft.)`;
  }

  return `${area.toLocaleString()} Sq.Ft.`;
}

function getShieldTier(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: 'text-emerald-600' };
  if (score >= 60) return { label: 'Trusted',   color: 'text-[#029bba]' };
  if (score >= 40) return { label: 'Good',      color: 'text-amber-600' };
  return { label: 'Pending', color: 'text-gray-400' };
}

// ─── EMPTY SLOT COMPONENTS ────────────────────────────────────────────────────

function EmptyColumnHeader(): React.ReactElement {
  return (
    <th className="w-[280px] min-w-[280px] max-w-[280px] p-4 align-top border-l border-gray-100">
      <Link href="/projects" className="block group">
        <div className="flex flex-col gap-3">
          <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 group-hover:border-[#029bba]/40 group-hover:bg-[#029bba]/5 transition-colors">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5 text-gray-400 group-hover:text-[#029bba]" />
            </div>
            <p className="text-xs font-bold text-gray-400 group-hover:text-[#029bba] transition-colors">
              Add More
            </p>
          </div>

          <div>
            <p className="text-sm font-black text-gray-300 group-hover:text-[#029bba] transition-colors">
              Empty Slot
            </p>
            <p className="text-xs text-gray-300 mt-1">Browse projects</p>
          </div>
        </div>
      </Link>
    </th>
  );
}

function EmptyCell(): React.ReactElement {
  return (
    <td className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100 bg-gray-50/30">
      <span className="text-xs text-gray-300">—</span>
    </td>
  );
}

// ─── NORMALIZATION ────────────────────────────────────────────────────────────

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

// ─── BEST-IN-CATEGORY DETECTION (Sale vs Rent Guard) ─────────────────────────

interface BestPicks {
  bestPriceId:  string | null;
  bestShieldId: string | null;
}

function calculateBestPicks(entities: NormalizedEntity[]): BestPicks {
  if (entities.length < 2) {
    return { bestPriceId: null, bestShieldId: null };
  }

  // Guard: Do not compare prices across mixed Sale vs Rent models
  const listingTypes = new Set(
    entities.map((e) => e.listingType || (e.entityType === 'project' ? 'project' : 'full_payment'))
  );
  const isMixedModel =
    listingTypes.has('rent') &&
    (listingTypes.has('full_payment') || listingTypes.has('installment') || listingTypes.has('project'));

  let bestPriceId: string | null = null;
  if (!isMixedModel) {
    const withPrice = entities
      .map((e) => ({ id: e.id, p: e.price ?? e.priceMin ?? Infinity }))
      .filter((x) => x.p !== Infinity && x.p > 0);
    if (withPrice.length > 0) {
      bestPriceId = withPrice.reduce((min, x) => (x.p < min.p ? x : min)).id;
    }
  }

  const withShield = entities.filter((e) => e.shieldScore > 0);
  const bestShield =
    withShield.length > 0
      ? withShield.reduce((max, e) => (e.shieldScore > max.shieldScore ? e : max))
      : null;

  return {
    bestPriceId,
    bestShieldId: bestShield?.id ?? null,
  };
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function CompareTable({
  entities,
  onRemove,
  removingId,
}: CompareTableProps): React.ReactElement {
  const normalized = useMemo(() => entities.map(normalizeEntity), [entities]);
  const bestPicks  = useMemo(() => calculateBestPicks(normalized), [normalized]);
  const emptySlots = Math.max(0, MAX_COLUMNS - normalized.length);

  // Enterprise Interactive States
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [aiVerdictLoading, setAiVerdictLoading] = useState(false);
  const [aiVerdict, setAiVerdict] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // Detect mixed Sale vs Rent comparison
  const hasSale = normalized.some((e) => e.listingType === 'full_payment' || e.listingType === 'installment' || e.entityType === 'project');
  const hasRent = normalized.some((e) => e.listingType === 'rent');
  const isMixedSaleRent = hasSale && hasRent;

  // Row visibility helper for "Differences Only" mode
  const isRowDifferent = (values: (string | number | boolean | null)[]): boolean => {
    if (!showDiffOnly) return true;
    const nonNulls = values.filter((v) => v !== null && v !== '—' && v !== '');
    if (nonNulls.length <= 1) return true;
    return new Set(nonNulls).size > 1;
  };

  // Reusable empty slot renderer
  const renderEmptyCells = (rowKey: string) =>
    Array.from({ length: emptySlots }).map((_, i) => (
      <EmptyCell key={`${rowKey}-empty-${i}`} />
    ));

  // Request ALEEM AI Verdict via Nemotron engine
  const fetchAleemVerdict = async () => {
    setShowAiModal(true);
    if (aiVerdict) return; // Cached

    setAiVerdictLoading(true);
    try {
      const summaryList = normalized
        .map(
          (e, idx) =>
            `${idx + 1}. "${e.title}" (${e.entityType}, ${e.city}, ${e.listingType || 'sale'}, Price: ${
              e.price ? formatPrice(e.price) : 'On Request'
            }, Area: ${formatPakistaniArea(e.areaSize, e.areaUnit)})`
        )
        .join('\n');

      const prompt = `Compare these ${normalized.length} options side-by-side and give me your expert investment verdict with pros/cons for each:\n${summaryList}`;

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });

      const data = await res.json();
      const verdictText = data.response || data.reply || data.message;
      if (verdictText) {
        setAiVerdict(verdictText);
      } else {
        setAiVerdict('Unable to generate AI verdict at this moment. Please try again.');
      }
    } catch {
      setAiVerdict('Network error generating AI verdict. Please try again.');
    } finally {
      setAiVerdictLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Enterprise Action & Control Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAleemVerdict}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#029bba] to-[#004063] hover:from-[#004063] hover:to-[#029bba] text-white text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <Bot className="w-4 h-4 text-[#06b6d4]" />
            <span>🤖 Ask ALEEM&apos;s Verdict</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowDiffOnly(!showDiffOnly)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              showDiffOnly
                ? 'bg-[#029bba]/10 border-[#029bba] text-[#029bba]'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{showDiffOnly ? 'Showing Differences Only' : 'Highlight Differences'}</span>
          </button>
        </div>
      </div>

      {/* ── Sale vs Rent Mismatch Warning Banner ── */}
      {isMixedSaleRent && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Sale vs. Rent Model Mismatch:</span> You are comparing properties listed for <strong>Sale</strong> against properties for <strong>Rent</strong>. Purchase prices and monthly rentals are evaluated in separate financial tiers below.
          </div>
        </div>
      )}

      {/* ── Main Comparison Table ── */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="w-[140px] min-w-[140px] max-w-[140px] sticky left-0 bg-white z-10 border-r border-gray-100">
                  <div className="p-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Comparing
                    </p>
                    <p className="text-lg font-black text-gray-900 mt-1">
                      {normalized.length} of {MAX_COLUMNS}
                    </p>
                  </div>
                </th>

                {normalized.map((entity) => (
                  <th
                    key={entity.id}
                    className="w-[280px] min-w-[280px] max-w-[280px] p-4 align-top border-l border-gray-100"
                  >
                    <div className="flex flex-col gap-3">
                      <Link
                        href={entity.detailUrl}
                        className="relative block aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 group"
                      >
                        {entity.imageUrl ? (
                          <Image
                            src={entity.imageUrl}
                            alt={entity.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="280px"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-[#004063]/10 to-[#029bba]/10 flex items-center justify-center">
                            {entity.entityType === 'project' ? (
                              <Building2 className="w-8 h-8 text-[#029bba]/40" />
                            ) : (
                              <HomeIcon className="w-8 h-8 text-[#029bba]/40" />
                            )}
                          </div>
                        )}

                        <span
                          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            entity.entityType === 'project'
                              ? 'bg-[#029bba] text-white'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
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
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 shadow-md flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-70 disabled:cursor-wait"
                        >
                          {removingId === entity.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-gray-600" />
                          )}
                        </button>
                      </Link>

                      <div>
                        <Link href={entity.detailUrl}>
                          <h3 className="font-black text-sm text-gray-900 leading-tight line-clamp-2 hover:text-[#029bba] transition-colors">
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

                {Array.from({ length: emptySlots }).map((_, i) => (
                  <EmptyColumnHeader key={`empty-header-${i}`} />
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {/* PRICE */}
              {isRowDifferent(normalized.map((e) => e.price ?? e.priceMin)) && (
                <tr className="hover:bg-gray-50/40 transition-colors">
                  <th className="sticky left-0 bg-white z-10 border-r border-gray-100 px-4 py-4 text-left align-top">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                      Price
                    </p>
                  </th>
                  {normalized.map((entity) => {
                    const isBest = bestPicks.bestPriceId === entity.id;
                    const priceStr =
                      entity.entityType === 'project'
                        ? formatPriceRange(entity.priceMin, entity.priceMax)
                        : formatPrice(entity.price);
                    return (
                      <td
                        key={entity.id}
                        className={`w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100 ${
                          isBest ? 'bg-emerald-50/50' : ''
                        }`}
                      >
                        {isBest && (
                          <div className="inline-flex items-center gap-1 mb-1.5 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider">
                            <Trophy className="w-2.5 h-2.5" />
                            Best Price
                          </div>
                        )}
                        <p className={`font-black text-base ${isBest ? 'text-emerald-700' : 'text-[#029bba]'}`}>
                          {priceStr}
                        </p>
                      </td>
                    );
                  })}
                  {renderEmptyCells('price')}
                </tr>
              )}

              {/* SHIELD SCORE */}
              {isRowDifferent(normalized.map((e) => e.shieldScore)) && (
                <tr className="hover:bg-gray-50/40 transition-colors">
                  <th className="sticky left-0 bg-white z-10 border-r border-gray-100 px-4 py-4 text-left align-top">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                      Shield Score
                    </p>
                  </th>
                  {normalized.map((entity) => {
                    const isBest = bestPicks.bestShieldId === entity.id;
                    const tier = getShieldTier(entity.shieldScore);
                    return (
                      <td
                        key={entity.id}
                        className={`w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100 ${
                          isBest ? 'bg-emerald-50/50' : ''
                        }`}
                      >
                        {isBest && (
                          <div className="inline-flex items-center gap-1 mb-1.5 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider">
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
              )}

              {/* NOC */}
              {isRowDifferent(normalized.map((e) => e.nocStatus)) && (
                <tr className="hover:bg-gray-50/40 transition-colors">
                  <th className="sticky left-0 bg-white z-10 border-r border-gray-100 px-4 py-4 text-left align-top">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                      NOC Status
                    </p>
                  </th>
                  {normalized.map((entity) => (
                    <td key={entity.id} className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100">
                      {entity.nocStatus === 'approved' ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs font-black text-emerald-700">
                            {entity.nocAuthority || 'Approved'}
                          </span>
                        </div>
                      ) : entity.nocStatus === 'pending' ? (
                        <span className="text-xs font-bold text-amber-600">⌛ Pending</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  ))}
                  {renderEmptyCells('noc')}
                </tr>
              )}

              {/* DEVELOPER */}
              {isRowDifferent(normalized.map((e) => e.developer)) && (
                <tr className="hover:bg-gray-50/40 transition-colors">
                  <th className="sticky left-0 bg-white z-10 border-r border-gray-100 px-4 py-4 text-left align-top">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                      Developer
                    </p>
                  </th>
                  {normalized.map((entity) => (
                    <td key={entity.id} className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100">
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
              )}

              {/* CATEGORY */}
              {isRowDifferent(normalized.map((e) => e.category)) && (
                <tr className="hover:bg-gray-50/40 transition-colors">
                  <th className="sticky left-0 bg-white z-10 border-r border-gray-100 px-4 py-4 text-left align-top">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                      Category
                    </p>
                  </th>
                  {normalized.map((entity) => (
                    <td key={entity.id} className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold capitalize">
                        {entity.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                  ))}
                  {renderEmptyCells('category')}
                </tr>
              )}

              {/* STATUS */}
              {isRowDifferent(normalized.map((e) => e.status)) && (
                <tr className="hover:bg-gray-50/40 transition-colors">
                  <th className="sticky left-0 bg-white z-10 border-r border-gray-100 px-4 py-4 text-left align-top">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                      Status
                    </p>
                  </th>
                  {normalized.map((entity) => (
                    <td key={entity.id} className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100">
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
              )}

              {/* BEDROOMS */}
              {normalized.some((e) => e.bedrooms !== null) && isRowDifferent(normalized.map((e) => e.bedrooms)) && (
                <tr className="hover:bg-gray-50/40 transition-colors">
                  <th className="sticky left-0 bg-white z-10 border-r border-gray-100 px-4 py-4 text-left align-top">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                      Bedrooms
                    </p>
                  </th>
                  {normalized.map((entity) => (
                    <td key={entity.id} className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100">
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
              {normalized.some((e) => e.bathrooms !== null) && isRowDifferent(normalized.map((e) => e.bathrooms)) && (
                <tr className="hover:bg-gray-50/40 transition-colors">
                  <th className="sticky left-0 bg-white z-10 border-r border-gray-100 px-4 py-4 text-left align-top">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                      Bathrooms
                    </p>
                  </th>
                  {normalized.map((entity) => (
                    <td key={entity.id} className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100">
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

              {/* AREA SIZE (Pakistani Land Unit Normalization) */}
              {normalized.some((e) => e.areaSize !== null) && isRowDifferent(normalized.map((e) => e.areaSize)) && (
                <tr className="hover:bg-gray-50/40 transition-colors">
                  <th className="sticky left-0 bg-white z-10 border-r border-gray-100 px-4 py-4 text-left align-top">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                      Area Size
                    </p>
                  </th>
                  {normalized.map((entity) => (
                    <td key={entity.id} className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100">
                      {entity.areaSize !== null ? (
                        <div className="flex items-center gap-1.5">
                          <Maximize2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-xs font-bold text-gray-800">
                            {formatPakistaniArea(entity.areaSize, entity.areaUnit)}
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

              {/* RENTAL YIELD / FINANCIAL ESTIMATE ROW */}
              <tr className="bg-gradient-to-r from-gray-50 to-cyan-50/30 hover:bg-cyan-50/50 transition-colors">
                <th className="sticky left-0 bg-white z-10 border-r border-gray-100 px-4 py-4 text-left align-top">
                  <p className="text-xs font-black text-[#029bba] uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Financial Est.
                  </p>
                </th>
                {normalized.map((entity) => {
                  const isRent = entity.listingType === 'rent';
                  const isSale =
                    entity.listingType === 'full_payment' ||
                    entity.listingType === 'installment' ||
                    entity.entityType === 'project';
                  const price = entity.price ?? entity.priceMin ?? 0;

                  return (
                    <td key={entity.id} className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100">
                      {isSale && price > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Est. Rental Yield</p>
                          <p className="text-xs font-extrabold text-emerald-600">
                            ~PKR {Math.round(price * 0.005).toLocaleString()}/mo{' '}
                            <span className="text-[10px] text-gray-500 font-normal">(6% p.a.)</span>
                          </p>
                        </div>
                      )}
                      {isRent && price > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Est. Buy Value</p>
                          <p className="text-xs font-extrabold text-[#004063]">
                            ~PKR {formatPrice(price * 200)}
                          </p>
                        </div>
                      )}
                      {!price && <span className="text-xs text-gray-400">—</span>}
                    </td>
                  );
                })}
                {renderEmptyCells('financial_est')}
              </tr>

              {/* VERIFIED */}
              {isRowDifferent(normalized.map((e) => e.isVerified)) && (
                <tr className="hover:bg-gray-50/40 transition-colors">
                  <th className="sticky left-0 bg-white z-10 border-r border-gray-100 px-4 py-4 text-left align-top">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                      Verified
                    </p>
                  </th>
                  {normalized.map((entity) => (
                    <td key={entity.id} className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100">
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
              )}

              {/* ACTION CTA */}
              <tr className="bg-gray-50/60">
                <th className="sticky left-0 bg-gray-50 z-10 border-r border-gray-100 px-4 py-4 text-left align-top">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider">
                    Action
                  </p>
                </th>
                {normalized.map((entity) => (
                  <td key={entity.id} className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={entity.detailUrl}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-[#029bba] text-white text-xs font-black hover:bg-[#017a94] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
                      >
                        View Details
                        <ArrowRight className="w-3 h-3" />
                      </Link>

                      <Link
                        href={entity.detailUrl}
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border-2 border-[#029bba] text-[#029bba] text-xs font-black hover:bg-[#029bba]/5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
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

      {/* ── ALEEM AI Verdict Modal ── */}
      {showAiModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col relative overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAiModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center text-white shadow-md">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  ALEEM AI Investment Verdict
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </h3>
                <p className="text-xs text-gray-500">Grounded analysis based on database records &amp; sector intelligence</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-sm text-gray-700 pr-2">
              {aiVerdictLoading ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-[#029bba] animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-gray-500">
                    ALEEM (NVIDIA Nemotron) is analyzing your {normalized.length} compared properties...
                  </p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none space-y-3 whitespace-pre-wrap leading-relaxed">
                  {aiVerdict}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-semibold">Powered by Nemotron 3 Ultra 550B &amp; Highrise Intelligence</span>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-5 py-2 rounded-xl bg-[#029bba] text-white text-xs font-bold hover:bg-[#027a94] transition-colors"
              >
                Close Verdict
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}