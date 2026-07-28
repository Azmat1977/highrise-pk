// components/projects/ProjectCard.tsx
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  Building2,
  Home,
  Eye,
  MessageSquare,
  BadgeCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  Star,
  Layers,
  Tag,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Pause,
} from 'lucide-react';
import DeveloperBadge from '@/components/developer/DeveloperBadge';
import type { DeveloperBadgeType } from '@/components/developer/DeveloperBadge';

// ════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════

export type ProjectStatus =
  | 'draft'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'suspended';

export type ProjectNature =
  | 'new_launch'
  | 'under_construction'
  | 'ready_for_possession'
  | 'completed';

export type SaleMode = 'Installment' | 'Full Payment' | 'Both';

export interface ProjectCardData {
  _id:              string;
  projectName:      string;
  slug:             string;
  city:             string;
  area?:            string;
  areaName?:        string;
  status:           ProjectStatus;
  projectNature?:   ProjectNature;
  projectCategory?: string;
  saleMode?:        SaleMode;

  // Media
  coverImage?:      { url: string; publicId?: string } | null;
  gallery?:         Array<{ url: string }>;

  // Pricing
  minPrice?:        number;
  maxPrice?:        number;

  // Units
  totalUnits?:      number;
  unitsAvailable?:  number;
  unitsSold?:       number;

  // Developer
  developerName?:   string;
  developerSlug?:   string;
  developerLogo?:   { url: string } | null;
  developerBadges?: DeveloperBadgeType[];
  isVerified?:      boolean;

  // Engagement
  views?:           number;
  inquiryCount?:    number;
  favoriteCount?:   number;

  // Features
  isFeatured?:      boolean;
  isHotDeal?:       boolean;

  // Risk
  riskAlerts?:      Array<{ level: string; message: string }>;

  // Dates
  possessionDate?:  string;
  launchDate?:      string;
  createdAt?:       string;
}

export type ProjectCardVariant = 'grid' | 'list' | 'compact' | 'admin';

interface ProjectCardProps {
  project:    ProjectCardData;
  variant?:   ProjectCardVariant;
  showStatus?: boolean;
  className?: string;
}

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

function formatPrice(price: number): string {
  if (!price || price <= 0) return '';
  if (price >= 10_000_000) {
    const crore = price / 10_000_000;
    return `${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Crore`;
  }
  if (price >= 100_000) {
    const lac = price / 100_000;
    return `${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(1)} Lac`;
  }
  return price.toLocaleString();
}

function formatNumber(num: number): string {
  if (!num) return '0';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function getProjectUrl(project: ProjectCardData): string {
  return `/projects/${project.slug || project._id}`;
}

function getCoverImageUrl(project: ProjectCardData): string {
  if (project.coverImage?.url) return project.coverImage.url;
  if (project.gallery && project.gallery.length > 0) return project.gallery[0].url;
  return '/images/placeholder-project.webp';
}

function getNatureLabel(nature?: ProjectNature): string {
  const labels: Record<ProjectNature, string> = {
    new_launch:           'New Launch',
    under_construction:   'Under Construction',
    ready_for_possession: 'Ready for Possession',
    completed:            'Completed',
  };
  return nature ? labels[nature] ?? nature : '';
}

function getNatureColor(nature?: ProjectNature): string {
  const colors: Record<ProjectNature, string> = {
    new_launch:           'bg-blue-100 text-blue-700',
    under_construction:   'bg-amber-100 text-amber-700',
    ready_for_possession: 'bg-emerald-100 text-emerald-700',
    completed:            'bg-green-100 text-green-700',
  };
  return nature ? colors[nature] ?? 'bg-gray-100 text-gray-600' : '';
}

// ════════════════════════════════════════════════════
// STATUS BADGE
// ════════════════════════════════════════════════════

function StatusBadge({ status }: { status: ProjectStatus }): React.ReactElement {
  const config: Record<ProjectStatus, {
    label: string;
    icon:  React.ReactElement;
    bg:    string;
    text:  string;
  }> = {
    draft: {
      label: 'Draft',
      icon:  <Layers className="w-3 h-3" />,
      bg:    'bg-gray-100',
      text:  'text-gray-600',
    },
    pending: {
      label: 'Pending Review',
      icon:  <Clock className="w-3 h-3" />,
      bg:    'bg-amber-100',
      text:  'text-amber-700',
    },
    verified: {
      label: 'Verified',
      icon:  <ShieldCheck className="w-3 h-3" />,
      bg:    'bg-emerald-100',
      text:  'text-emerald-700',
    },
    rejected: {
      label: 'Rejected',
      icon:  <XCircle className="w-3 h-3" />,
      bg:    'bg-red-100',
      text:  'text-red-700',
    },
    suspended: {
      label: 'Suspended',
      icon:  <Pause className="w-3 h-3" />,
      bg:    'bg-red-100',
      text:  'text-red-700',
    },
  };

  const c = config[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                      ${c.bg} ${c.text} text-[10px] font-bold uppercase tracking-wide`}>
      {c.icon}
      {c.label}
    </span>
  );
}

// ════════════════════════════════════════════════════
// SOLD PROGRESS
// ════════════════════════════════════════════════════

function SoldProgress({
  total,
  sold,
}: {
  total: number;
  sold:  number;
}): React.ReactElement | null {
  if (!total || total <= 0) return null;

  const percentage = Math.min(Math.round((sold / total) * 100), 100);

  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-gray-400 font-medium">{sold} Sold</span>
        <span className="text-gray-500 font-bold">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full
                     transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════
// GRID VARIANT (DEFAULT)
// ════════════════════════════════════════════════════

function GridCard({
  project,
  showStatus,
}: {
  project:    ProjectCardData;
  showStatus: boolean;
}): React.ReactElement {
  const hasPrice     = (project.minPrice ?? 0) > 0;
  const soldPct      = project.totalUnits && project.unitsSold
    ? Math.round((project.unitsSold / project.totalUnits) * 100)
    : 0;
  const hasRisk      = (project.riskAlerts?.length ?? 0) > 0;

  return (
    <Link href={getProjectUrl(project)} className="block group">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden
                      hover:shadow-xl hover:border-[#029bba]/20 transition-all duration-300">

        {/* ── Image ── */}
        <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
          <Image
            src={getCoverImageUrl(project)}
            alt={project.projectName}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Overlay badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {project.isFeatured && (
              <span className="px-2 py-0.5 rounded-full bg-[#029bba] text-white
                               text-[10px] font-bold flex items-center gap-1">
                <Star className="w-3 h-3" /> Featured
              </span>
            )}
            {project.isHotDeal && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white
                               text-[10px] font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Hot Deal
              </span>
            )}
            {project.projectNature && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                                ${getNatureColor(project.projectNature)}`}>
                {getNatureLabel(project.projectNature)}
              </span>
            )}
          </div>

          {/* Status badge (developer/admin view) */}
          {showStatus && (
            <div className="absolute top-3 right-3">
              <StatusBadge status={project.status} />
            </div>
          )}

          {/* Risk alert indicator */}
          {hasRisk && (
            <div className="absolute bottom-3 right-3">
              <span className="px-2 py-0.5 rounded-full bg-red-500/90 text-white
                               text-[10px] font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {project.riskAlerts!.length} Alert{project.riskAlerts!.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Sold overlay */}
          {soldPct >= 90 && (
            <div className="absolute bottom-3 left-3">
              <span className="px-2.5 py-1 rounded-full bg-black/70 text-white
                               text-xs font-bold backdrop-blur-sm">
                {soldPct === 100 ? 'Sold Out' : `${soldPct}% Sold`}
              </span>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        <div className="p-4">
          {/* Developer */}
          {project.developerName && (
            <div className="flex items-center gap-2 mb-2">
              {project.developerLogo?.url ? (
                <Image
                  src={project.developerLogo.url}
                  alt={project.developerName}
                  width={20}
                  height={20}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                  <Building2 className="w-3 h-3 text-gray-400" />
                </div>
              )}
              <span className="text-xs text-gray-500 font-medium truncate">
                {project.developerName}
              </span>
              {project.isVerified && (
                <BadgeCheck className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0" />
              )}
              {project.developerBadges && project.developerBadges.length > 0 && (
                <DeveloperBadge
                  badge={project.developerBadges[0]}
                  size="xs"
                  variant="icon-only"
                  showTooltip={false}
                />
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="font-bold text-base text-gray-900 leading-tight mb-1
                         group-hover:text-[#029bba] transition-colors line-clamp-2">
            {project.projectName}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {project.areaName || project.area}
              {project.city ? `, ${project.city}` : ''}
            </span>
          </div>

          {/* Price */}
          {hasPrice && (
            <div className="mb-3">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xl font-black text-[#029bba]">
                  {formatPrice(project.minPrice!)}
                </span>
                {project.maxPrice && project.maxPrice !== project.minPrice && (
                  <>
                    <span className="text-gray-300">–</span>
                    <span className="text-lg font-bold text-[#029bba]">
                      {formatPrice(project.maxPrice)}
                    </span>
                  </>
                )}
              </div>
              {project.saleMode && (
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  {project.saleMode}
                </span>
              )}
            </div>
          )}

          {/* Units + Sold progress */}
          {(project.totalUnits ?? 0) > 0 && (
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Home className="w-3 h-3" />
                {project.totalUnits} Units
              </span>
              {(project.unitsAvailable ?? 0) > 0 && (
                <span className="text-xs font-semibold text-emerald-600">
                  {project.unitsAvailable} Available
                </span>
              )}
            </div>
          )}

          <SoldProgress
            total={project.totalUnits ?? 0}
            sold={project.unitsSold ?? 0}
          />

          {/* Footer stats */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {(project.views ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {formatNumber(project.views!)}
                </span>
              )}
              {(project.inquiryCount ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {formatNumber(project.inquiryCount!)}
                </span>
              )}
            </div>

            <span className="text-xs font-semibold text-[#029bba]
                             group-hover:underline flex items-center gap-1">
              View Details <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ════════════════════════════════════════════════════
// LIST VARIANT
// ════════════════════════════════════════════════════

function ListCard({
  project,
  showStatus,
}: {
  project:    ProjectCardData;
  showStatus: boolean;
}): React.ReactElement {
  const hasPrice = (project.minPrice ?? 0) > 0;

  return (
    <Link href={getProjectUrl(project)} className="block group">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden
                      hover:shadow-lg hover:border-[#029bba]/20 transition-all duration-300
                      flex flex-col sm:flex-row">

        {/* Image */}
        <div className="relative w-full sm:w-64 aspect-[16/10] sm:aspect-auto sm:h-auto
                        overflow-hidden bg-gray-100 flex-shrink-0">
          <Image
            src={getCoverImageUrl(project)}
            alt={project.projectName}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, 256px"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {project.isFeatured && (
              <span className="px-2 py-0.5 rounded-full bg-[#029bba] text-white
                               text-[10px] font-bold flex items-center gap-1">
                <Star className="w-3 h-3" /> Featured
              </span>
            )}
            {project.projectNature && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
                                ${getNatureColor(project.projectNature)}`}>
                {getNatureLabel(project.projectNature)}
              </span>
            )}
          </div>

          {showStatus && (
            <div className="absolute top-3 right-3">
              <StatusBadge status={project.status} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            {/* Developer */}
            {project.developerName && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-xs text-gray-500 font-medium">
                  {project.developerName}
                </span>
                {project.isVerified && (
                  <BadgeCheck className="w-3.5 h-3.5 text-[#029bba]" />
                )}
              </div>
            )}

            {/* Title */}
            <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1
                           group-hover:text-[#029bba] transition-colors line-clamp-1">
              {project.projectName}
            </h3>

            {/* Location */}
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">
                {project.areaName || project.area}
                {project.city ? `, ${project.city}` : ''}
              </span>
            </div>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {project.projectCategory && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600
                                 text-xs font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {project.projectCategory}
                </span>
              )}
              {project.saleMode && (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600
                                 text-xs font-medium">
                  {project.saleMode}
                </span>
              )}
              {project.possessionDate && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600
                                 text-xs font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {project.possessionDate}
                </span>
              )}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-end justify-between">
            {/* Price */}
            {hasPrice && (
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">
                  Starting From
                </p>
                <p className="text-xl font-black text-[#029bba]">
                  PKR {formatPrice(project.minPrice!)}
                </p>
              </div>
            )}

            {/* Units + engagement */}
            <div className="text-right">
              {(project.totalUnits ?? 0) > 0 && (
                <p className="text-xs text-gray-500 mb-1">
                  <span className="font-bold text-gray-700">{project.unitsAvailable ?? 0}</span>
                  {' '}of {project.totalUnits} available
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {(project.views ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Eye className="w-3 h-3" /> {formatNumber(project.views!)}
                  </span>
                )}
                {(project.inquiryCount ?? 0) > 0 && (
                  <span className="flex items-center gap-0.5">
                    <MessageSquare className="w-3 h-3" /> {formatNumber(project.inquiryCount!)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ════════════════════════════════════════════════════
// COMPACT VARIANT
// ════════════════════════════════════════════════════

function CompactCard({
  project,
}: {
  project: ProjectCardData;
}): React.ReactElement {
  return (
    <Link href={getProjectUrl(project)} className="block group">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100
                      hover:border-[#029bba]/20 hover:shadow-sm transition-all duration-200">

        {/* Thumbnail */}
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          <Image
            src={getCoverImageUrl(project)}
            alt={project.projectName}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-gray-900 truncate
                         group-hover:text-[#029bba] transition-colors">
            {project.projectName}
          </h4>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {project.areaName || project.area}
            {project.city ? `, ${project.city}` : ''}
          </p>
          {(project.minPrice ?? 0) > 0 && (
            <p className="text-sm font-bold text-[#029bba] mt-1">
              PKR {formatPrice(project.minPrice!)}
            </p>
          )}
        </div>

        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#029bba]
                               transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

// ════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════

export default function ProjectCard({
  project,
  variant    = 'grid',
  showStatus = false,
  className  = '',
}: ProjectCardProps): React.ReactElement {
  if (variant === 'list') {
    return (
      <div className={className}>
        <ListCard project={project} showStatus={showStatus} />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={className}>
        <CompactCard project={project} />
      </div>
    );
  }

  if (variant === 'admin') {
    return (
      <div className={className}>
        <GridCard project={project} showStatus={true} />
      </div>
    );
  }

  // Default: grid
  return (
    <div className={className}>
      <GridCard project={project} showStatus={showStatus} />
    </div>
  );
}