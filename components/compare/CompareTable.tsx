import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { icons } from '@/lib/design-system/icons';
import { getOptimizedImageUrl } from '@/utils/cloudinaryTransform';

const {
  X,
  MapPin,
  BadgeCheck,
  Building2,
  Home: HomeIcon,
  ArrowRight,
  Loader2,
  BedDouble,
  Bath,
  Maximize2,
  Calendar,
  Plus,
  SlidersHorizontal,
  Info,
  CreditCard,
} = icons;

export type CompareItemType = 'property' | 'project' | 'society';

export interface CompareEntity {
  entityType: CompareItemType;
  data: Record<string, unknown>;
}

export interface CompareTableProps {
  entities: CompareEntity[];
  onRemove: (
    entityType: CompareItemType,
    entityId: string,
  ) => Promise<void>;
  removingId: string | null;
}

const MAX_COLUMNS = 4;

interface NormalizedEntity {
  id: string;
  entityType: CompareItemType;
  title: string;
  slug: string;
  city: string | null;
  area: string | null;
  imageUrl: string | null;
  price: number | null;
  priceMin: number | null;
  priceMax: number | null;
  score: number | null;
  verification: string | null;
  nocStatus: string | null;
  nocAuthority: string | null;
  litigationStatus: string | null;
  riskLevel: string | null;
  developer: string | null;
  category: string | null;
  status: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSize: number | null;
  areaUnit: string | null;
  listingType: string | null;
  paymentTerms: string | null;
  detailUrl: string;
  amenities: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null;
}

function humanize(value: string | null): string {
  if (!value) return 'Not available';

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getImageUrl(data: Record<string, unknown>): string | null {
  const directCandidates = [
    data.featuredImage,
    data.primaryImage,
    data.featureImageUrl,
  ];

  for (const candidate of directCandidates) {
    const imageUrl = readString(candidate);
    if (imageUrl) return imageUrl;
  }

  if (!Array.isArray(data.images)) return null;

  const firstImage: unknown = data.images[0];

  if (typeof firstImage === 'string') {
    return readString(firstImage);
  }

  const firstImageRecord = asRecord(firstImage);
  return readString(firstImageRecord?.url);
}

function getScore(
  entityType: CompareItemType,
  data: Record<string, unknown>,
): number | null {
  if (entityType === 'society') {
    const scores = asRecord(data.scores);
    return readNumber(scores?.overall);
  }

  return readNumber(data.highriseScore);
}

function getVerificationLabel(
  entityType: CompareItemType,
  data: Record<string, unknown>,
): string | null {
  if (entityType === 'property') {
    const ownershipProof = asRecord(data.ownershipProof);
    const reviewStatus = readString(ownershipProof?.reviewStatus);

    if (reviewStatus === 'verified') {
      return 'Title Verified';
    }

    if (reviewStatus) {
      return `Title review: ${humanize(reviewStatus)}`;
    }

    const verification = asRecord(data.verification);
    const verificationStatus = readString(verification?.status);

    return verificationStatus
      ? `Verification status: ${humanize(verificationStatus)}`
      : null;
  }

  if (entityType === 'society') {
    if (data.isVerifiedByHighrise === true) {
      return 'Highrise verified';
    }

    if (data.isVerifiedByHighrise === false) {
      return 'Not verified by Highrise';
    }

    return null;
  }

  const verificationStatus = readString(data.verificationStatus);
  return verificationStatus
    ? `Project verification status: ${humanize(verificationStatus)}`
    : null;
}

function getAmenities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (amenity): amenity is string =>
      typeof amenity === 'string' && amenity.trim().length > 0,
  );
}

function normalizeEntity(entity: CompareEntity): NormalizedEntity {
  const data = entity.data;
  const isProject = entity.entityType === 'project';
  const isSociety = entity.entityType === 'society';
  const id = readString(data._id) ?? '';
  const slug = readString(data.slug) ?? id;

  const rawTitle = isSociety
    ? data.name
    : isProject
      ? data.projectName
      : data.title;

  const title = readString(rawTitle) ?? 'Untitled';

  const rawArea = isSociety
    ? data.areaName
    : typeof data.area === 'string'
      ? data.area
      : null;

  const category = isSociety
    ? readString(data.category)
    : isProject
      ? readString(data.projectCategory)
      : readString(data.propertyType);

  const status = isSociety
    ? null
    : isProject
      ? readString(data.projectStatus)
      : readString(data.status);

  const ownershipProof = asRecord(data.ownershipProof);
  const societyScores = asRecord(data.scores);

  return {
    id,
    entityType: entity.entityType,
    title,
    slug,
    city: readString(data.city),
    area: readString(rawArea),
    imageUrl: getImageUrl(data),
    price: entity.entityType === 'property'
      ? readNumber(data.price)
      : null,
    priceMin: isProject ? readNumber(data.minPrice) : null,
    priceMax: isProject ? readNumber(data.maxPrice) : null,
    score: isSociety
      ? readNumber(societyScores?.overall)
      : readNumber(data.highriseScore),
    verification: getVerificationLabel(entity.entityType, data),
    nocStatus: isSociety ? readString(data.nocStatus) : null,
    nocAuthority: isSociety ? readString(data.approvalAuthority) : null,
    litigationStatus: isSociety
      ? readString(data.litigationStatus)
      : null,
    riskLevel: isSociety ? readString(data.overallRiskLevel) : null,
    developer: isProject || isSociety
      ? readString(data.developerName)
      : null,
    category,
    status,
    bedrooms: entity.entityType === 'property'
      ? readNumber(data.bedrooms)
      : null,
    bathrooms: entity.entityType === 'property'
      ? readNumber(data.bathrooms)
      : null,
    areaSize: entity.entityType === 'property'
      ? readNumber(data.area)
      : null,
    areaUnit: entity.entityType === 'property'
      ? readString(data.areaUnit)
      : null,
    listingType: entity.entityType === 'property'
      ? readString(data.listingType)?.toLowerCase() ?? null
      : null,
    paymentTerms: entity.entityType === 'property'
      ? readString(data.saleMode)
      : null,
    detailUrl: isSociety
      ? `/societies/${encodeURIComponent(slug)}`
      : isProject
        ? `/projects/${encodeURIComponent(slug)}`
        : `/property/${encodeURIComponent(slug)}`,
    amenities: entity.entityType === 'society'
      ? []
      : getAmenities(data.amenities),
  };
}

function formatPrice(value: number | null): string | null {
  if (value === null || value <= 0) return null;

  if (value >= 10_000_000) {
    return `PKR ${(value / 10_000_000).toFixed(1)} Cr`;
  }

  if (value >= 100_000) {
    return `PKR ${(value / 100_000).toFixed(1)} Lac`;
  }

  return `PKR ${value.toLocaleString('en-PK')}`;
}

function formatProjectPriceRange(
  minimum: number | null,
  maximum: number | null,
): string | null {
  const formattedMinimum = formatPrice(minimum);
  const formattedMaximum = formatPrice(maximum);

  if (formattedMinimum && formattedMaximum) {
    return `${formattedMinimum} to ${formattedMaximum}`;
  }

  if (formattedMinimum) return `From ${formattedMinimum}`;
  if (formattedMaximum) return `Up to ${formattedMaximum}`;

  return null;
}

function formatArea(
  area: number | null,
  unit: string | null,
): string | null {
  if (area === null || area <= 0) return null;

  const formattedArea = area.toLocaleString('en-PK');
  return unit
    ? `${formattedArea} ${unit}`
    : `${formattedArea} (unit not specified)`;
}

function propertyIntent(
  listingType: string | null,
): 'sale' | 'rent' | 'pre_launch' | null {
  switch (listingType) {
    case 'full_payment':
    case 'installment':
      return 'sale';
    case 'rent':
      return 'rent';
    case 'pre_launch':
      return 'pre_launch';
    default:
      return null;
  }
}

function listingTypeLabel(listingType: string | null): string | null {
  switch (listingType) {
    case 'full_payment':
      return 'For sale, full payment';
    case 'installment':
      return 'For sale, installments';
    case 'rent':
      return 'For rent';
    case 'pre_launch':
      return 'Pre-launch';
    default:
      return null;
  }
}

function EmptyColumnHeader({
  entityType,
}: {
  entityType: CompareItemType;
}): React.ReactElement {
  const browseHref = entityType === 'society'
    ? '/societies'
    : entityType === 'property'
      ? '/properties'
      : '/projects';

  const browseLabel = entityType === 'society'
    ? 'Browse societies'
    : entityType === 'property'
      ? 'Browse properties'
      : 'Browse projects';

  return (
    <th className="w-[280px] min-w-[280px] max-w-[280px] p-4 align-top border-l border-gray-100">
      <Link href={browseHref} className="block group">
        <div className="flex flex-col gap-3">
          <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 group-hover:border-[#029bba]/40 group-hover:bg-[#029bba]/5 transition-colors">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5 text-gray-400 group-hover:text-[#029bba]" />
            </div>
            <p className="text-xs font-bold text-gray-500 group-hover:text-[#029bba] transition-colors">
              Add another
            </p>
          </div>
          <p className="text-xs text-gray-500">{browseLabel}</p>
        </div>
      </Link>
    </th>
  );
}

function EmptyCell(): React.ReactElement {
  return (
    <td className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100 bg-gray-50/30">
      <span className="text-xs text-gray-500">Not available</span>
    </td>
  );
}

export default function CompareTable({
  entities,
  onRemove,
  removingId,
}: CompareTableProps): React.ReactElement {
  const normalized = useMemo(
    () => entities.map(normalizeEntity).filter((entity) => entity.id.length > 0),
    [entities],
  );

  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const emptySlots = Math.max(0, MAX_COLUMNS - normalized.length);

  const entityTypes = new Set(normalized.map((entity) => entity.entityType));
  const hasMixedEntityTypes = entityTypes.size > 1;

  const propertyListings = normalized.filter(
    (entity) => entity.entityType === 'property',
  );
  const propertyIntents = new Set(
    propertyListings.map((entity) => propertyIntent(entity.listingType)),
  );
  const hasInvalidPropertyIntents =
    propertyListings.length > 0 &&
    (
      propertyListings.length !== normalized.length ||
      propertyListings.some((entity) => propertyIntent(entity.listingType) === null) ||
      propertyIntents.size > 1
    );

  const activeEntityType = normalized[0]?.entityType ?? 'property';

  const renderEmptyCells = (rowKey: string): React.ReactElement[] =>
    Array.from({ length: emptySlots }, (_, index) => (
      <EmptyCell key={`${rowKey}-empty-${index}`} />
    ));

  const shouldShowRow = (values: Array<string | null>): boolean => {
    const availableValues = values.filter(
      (value): value is string => value !== null,
    );

    if (availableValues.length === 0) return false;
    if (!showDiffOnly || availableValues.length <= 1) return true;

    return new Set(availableValues).size > 1;
  };

  const renderTextRow = (
    rowKey: string,
    label: string,
    values: Array<string | null>,
  ): React.ReactNode => {
    if (!shouldShowRow(values)) return null;

    return (
      <tr key={rowKey} className="hover:bg-gray-50/40 transition-colors">
        <th className="sticky left-0 bg-white z-10 border-r border-gray-100 px-4 py-4 text-left align-top">
          <p className="text-xs font-black text-gray-600 uppercase tracking-wider">
            {label}
          </p>
        </th>

        {values.map((value, index) => (
          <td
            key={`${rowKey}-${normalized[index]?.id ?? index}`}
            className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100"
          >
            <span className="text-sm font-semibold text-gray-700">
              {value ?? 'Not available'}
            </span>
          </td>
        ))}

        {renderEmptyCells(rowKey)}
      </tr>
    );
  };

  if (normalized.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm font-semibold text-gray-600">
        No comparison items are available to display.
      </div>
    );
  }

  if (hasMixedEntityTypes) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-bold">These items cannot be compared together.</p>
          <p className="mt-1 text-sm">
            Clear the comparison and add properties, projects, or societies of one type.
          </p>
        </div>
      </div>
    );
  }

  if (hasInvalidPropertyIntents) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-bold">These property listings cannot be compared together.</p>
          <p className="mt-1 text-sm">
            Clear the comparison, then add properties with the same listing intent. For-sale listings and rentals must be compared separately.
          </p>
        </div>
      </div>
    );
  }

  const priceLabel = activeEntityType === 'society'
    ? null
    : activeEntityType === 'project'
      ? 'Project price range'
      : propertyListings[0]?.listingType === 'rent'
        ? 'Listed rent'
        : 'Listed price';

  const priceValues = normalized.map((entity) => {
    if (entity.entityType === 'project') {
      return formatProjectPriceRange(entity.priceMin, entity.priceMax);
    }

    if (entity.entityType === 'property') {
      return formatPrice(entity.price);
    }

    return null;
  });

  const scoreLabel = activeEntityType === 'society'
    ? 'Overall score'
    : 'Recorded Highrise score';

  const listingTypeValues = normalized.map((entity) =>
    entity.entityType === 'property'
      ? listingTypeLabel(entity.listingType)
      : null,
  );

  const paymentTermValues = normalized.map((entity) =>
    entity.entityType === 'property'
      ? entity.paymentTerms
      : null,
  );

  const verificationLabel = activeEntityType === 'property'
    ? 'Title and verification status'
    : activeEntityType === 'society'
      ? 'Highrise verification'
      : 'Project verification status';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <p className="text-sm font-black text-[#004063]">
            Comparing {normalized.length} of {MAX_COLUMNS}
          </p>
          <p className="mt-1 text-xs font-semibold text-gray-600">
            Missing details are shown as not available. Review the original listing before making a decision.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowDiffOnly((current) => !current)}
          aria-pressed={showDiffOnly}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
            showDiffOnly
              ? 'border-[#029bba] bg-[#029bba]/10 text-[#029bba]'
              : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showDiffOnly ? 'Showing differences' : 'Highlight differences'}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 w-[140px] min-w-[140px] max-w-[140px] border-r border-gray-100 bg-white">
                  <div className="p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Comparing
                    </p>
                    <p className="mt-1 text-lg font-black text-[#004063]">
                      {normalized.length} of {MAX_COLUMNS}
                    </p>
                  </div>
                </th>

                {normalized.map((entity) => {
                  const optimizedImageUrl = entity.imageUrl
                    ? getOptimizedImageUrl(entity.imageUrl, { width: 720 })
                    : null;

                  return (
                    <th
                      key={entity.id}
                      className="w-[280px] min-w-[280px] max-w-[280px] p-4 align-top border-l border-gray-100"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="relative">
                          <Link
                            href={entity.detailUrl}
                            className="relative block aspect-[16/10] overflow-hidden rounded-xl bg-gray-100"
                          >
                            {optimizedImageUrl ? (
                              <Image
                                src={optimizedImageUrl}
                                alt={entity.title}
                                fill
                                className="object-cover transition-transform duration-300 hover:scale-105"
                                sizes="280px"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#004063]/10 to-[#029bba]/10">
                                {entity.entityType === 'property' ? (
                                  <HomeIcon className="h-8 w-8 text-[#029bba]/60" />
                                ) : (
                                  <Building2 className="h-8 w-8 text-[#029bba]/60" />
                                )}
                              </div>
                            )}

                            <span className="absolute left-2 top-2 rounded-full bg-[#004063] px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                              {entity.entityType}
                            </span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => void onRemove(entity.entityType, entity.id)}
                            disabled={removingId === entity.id}
                            aria-label={`Remove ${entity.title} from comparison`}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm transition-colors hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400 disabled:cursor-wait disabled:opacity-70"
                          >
                            {removingId === entity.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                            ) : (
                              <X className="h-4 w-4 text-gray-600" />
                            )}
                          </button>
                        </div>

                        <div>
                          <Link href={entity.detailUrl}>
                            <span className="line-clamp-2 text-sm font-black text-[#004063] transition-colors hover:text-[#029bba]">
                              {entity.title}
                            </span>
                          </Link>

                          <div className="mt-1 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                            <p className="truncate text-xs text-gray-600">
                              {[entity.area, entity.city]
                                .filter((value): value is string => Boolean(value))
                                .join(', ') || 'Location not available'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </th>
                  );
                })}

                {Array.from({ length: emptySlots }, (_, index) => (
                  <EmptyColumnHeader
                    key={`empty-header-${index}`}
                    entityType={activeEntityType}
                  />
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {priceLabel && renderTextRow('price', priceLabel, priceValues)}

              {renderTextRow(
                'score',
                scoreLabel,
                normalized.map((entity) =>
                  entity.score === null ? null : String(entity.score),
                ),
              )}

              {renderTextRow(
                'verification',
                verificationLabel,
                normalized.map((entity) => entity.verification),
              )}

              {activeEntityType === 'society' && renderTextRow(
                'noc-status',
                'NOC status',
                normalized.map((entity) => humanize(entity.nocStatus)),
              )}

              {activeEntityType === 'society' && renderTextRow(
                'approval-authority',
                'Approval authority',
                normalized.map((entity) => entity.nocAuthority),
              )}

              {activeEntityType === 'society' && renderTextRow(
                'litigation-status',
                'Litigation status',
                normalized.map((entity) => humanize(entity.litigationStatus)),
              )}

              {activeEntityType === 'society' && renderTextRow(
                'risk-level',
                'Recorded risk level',
                normalized.map((entity) => humanize(entity.riskLevel)),
              )}

              {(activeEntityType === 'project' || activeEntityType === 'society') &&
                renderTextRow(
                  'developer',
                  'Developer',
                  normalized.map((entity) => entity.developer),
                )}

              {renderTextRow(
                'category',
                'Category',
                normalized.map((entity) => humanize(entity.category)),
              )}

              {activeEntityType !== 'society' && renderTextRow(
                'status',
                'Status',
                normalized.map((entity) => humanize(entity.status)),
              )}

              {activeEntityType === 'property' && renderTextRow(
                'listing-type',
                'Listing type',
                listingTypeValues,
              )}

              {activeEntityType === 'property' && renderTextRow(
                'payment-terms',
                'Payment terms',
                paymentTermValues,
              )}

              {activeEntityType === 'property' && renderTextRow(
                'bedrooms',
                'Bedrooms',
                normalized.map((entity) =>
                  entity.bedrooms === null ? null : String(entity.bedrooms),
                ),
              )}

              {activeEntityType === 'property' && renderTextRow(
                'bathrooms',
                'Bathrooms',
                normalized.map((entity) =>
                  entity.bathrooms === null ? null : String(entity.bathrooms),
                ),
              )}

              {activeEntityType === 'property' && renderTextRow(
                'area',
                'Area',
                normalized.map((entity) =>
                  formatArea(entity.areaSize, entity.areaUnit),
                ),
              )}

              {activeEntityType !== 'society' && renderTextRow(
                'amenities',
                'Amenities',
                normalized.map((entity) =>
                  entity.amenities.length > 0
                    ? entity.amenities.slice(0, 8).join(', ')
                    : null,
                ),
              )}

              <tr className="bg-gray-50/60">
                <th className="sticky left-0 z-10 border-r border-gray-100 bg-gray-50 px-4 py-4 text-left align-top">
                  <p className="text-xs font-black uppercase tracking-wider text-gray-600">
                    Action
                  </p>
                </th>

                {normalized.map((entity) => (
                  <td
                    key={entity.id}
                    className="w-[280px] min-w-[280px] max-w-[280px] px-4 py-4 align-top border-l border-gray-100"
                  >
                    <Link
                      href={entity.detailUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#029bba] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#027f99] focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
                    >
                      View details
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                ))}

                {renderEmptyCells('action')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-gray-600">
        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#029bba]" />
        Comparison values are limited to information available in the saved records. Confirm details with the original listing.
      </p>
    </div>
  );
}