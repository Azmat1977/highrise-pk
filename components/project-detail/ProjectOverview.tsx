// components/project-detail/ProjectOverview.tsx
//
// Highrise.pk — Project Overview (V2 — Icon Tiles + Milestone Progress)
//
// Redesign: every fact gets a grey type-specific icon chip; the
// construction progress becomes a milestone bar (gradient fill,
// 25/50/75 markers, phase label) instead of a plain thin bar.
//
// Data logic identical to V1 — nothing invented, conditional facts only.

'use client';

import React from 'react';
import {
  Building2,
  Home,
  Ruler,
  Layers,
  Calendar,
  KeyRound,
  CalendarCheck,
  Landmark,
  CreditCard,
  Activity,
} from 'lucide-react';

import type { ProjectDetailData } from '@/types/projectDetail';
import { formatDetailDate } from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS + HELPERS (unchanged from V1)
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectOverviewProps {
  project: ProjectDetailData;
}

function getLandAreaSecondary(value: number, unit: string): string | undefined {
  const u = (unit || '').toLowerCase();
  const fmt = (n: number, dp = 1) =>
    Number.isInteger(n) ? String(n) : n.toFixed(dp);

  if (u.includes('kanal')) {
    const marla = value * 20;
    const acre  = value / 8;
    return `${fmt(marla)} Marla · ${fmt(acre, 2)} Acre`;
  }
  if (u.includes('marla')) {
    return `${fmt(value / 20, 2)} Kanal`;
  }
  if (u.includes('acre')) {
    return `${fmt(value * 8)} Kanal`;
  }
  if (u.includes('sq')) {
    const kanal = value / 5445;
    if (kanal >= 0.01) return `${fmt(kanal, 2)} Kanal`;
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// FACT TILE — grey icon chip + label + value + sub
// ─────────────────────────────────────────────────────────────────────────────

function FactTile({
  icon,
  label,
  value,
  sub,
  subClass,
}: {
  icon:   React.ReactNode;
  label:  string;
  value:  React.ReactNode;
  sub?:   React.ReactNode;
  subClass?: string;
}): React.ReactElement {
  return (
    <div className="flex items-start gap-3.5 min-w-0 rounded-xl px-2 py-3
                    hover:bg-gray-50 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 flex items-center
                      justify-center shrink-0 text-[#029bba]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-gray-500 font-medium mb-0.5">
          {label}
        </p>
        <p className="text-[15px] font-medium text-gray-800 leading-snug break-words">
          {value}
        </p>
        {sub && (
          <p className={`text-[12px] mt-1 break-words ${subClass ?? 'text-gray-500'}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MILESTONE PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────

function MilestoneProgressBar({ progress }: { progress: number }): React.ReactElement {
  const clamped = Math.min(100, Math.max(0, progress));

  const phase =
    clamped >= 90 ? 'Finishing stage — near handover'
    : clamped >= 50 ? 'Structure phase — mid construction'
    : clamped >= 25 ? 'Foundation & structure work underway'
    : clamped > 0  ? 'Early construction phase'
    : 'Not started';

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
          Construction Progress
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-[#029bba] tabular-nums leading-none">
            {clamped}
          </span>
          <span className="text-xs font-bold text-gray-400">%</span>
        </div>
      </div>

      {/* Track with gradient fill + milestone dots */}
      <div className="relative">
        <div
          className="h-3 w-full rounded-full bg-gray-200 overflow-hidden"
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Construction ${clamped}% complete`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#029bba] to-[#004063]
                       transition-all duration-700"
            style={{ width: `${clamped}%` }}
          />
        </div>

        {/* Milestone markers — sit above the track */}
        {[25, 50, 75].map((m) => (
          <div
            key={m}
            className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full
                        border-2 transition-colors ${
              clamped >= m
                ? 'bg-white border-[#004063]'
                : 'bg-gray-400 border-gray-200'
            }`}
            style={{ left: `calc(${m}% - 4px)` }}
            title={`${m}% milestone`}
          />
        ))}
      </div>

      <p className="mt-2.5 text-[11px] text-gray-500 font-medium">
        {phase}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectOverview({ project }: ProjectOverviewProps) {
  const breakdown = project.unitTypeBreakdown ?? [];

  const totalUnits =
    breakdown.reduce((s, ut) => s + (ut.totalUnits ?? 0), 0) ||
    project.totalUnits ||
    0;


  const fd = project.floorDetails;
  const floorParts: string[] = [];
  if (fd?.floorsForResidential) floorParts.push(`${fd.floorsForResidential} residential`);
  if (fd?.floorsForCommercial) floorParts.push(`${fd.floorsForCommercial} commercial`);
  if (fd?.floorsForParking) floorParts.push(`${fd.floorsForParking} parking`);
  const floorBreakdown = floorParts.join(' · ');

  const status = project.projectStatus ?? project.status;
  const progress = project.developmentProgress;
  const nocApproved = project.nocStatus === 'approved';
  const nocPending = project.nocStatus === 'pending';

  // Land area — societyDetails (primary) → legacy totalArea (fallback)
  const landValue = project.societyDetails?.totalLandArea ?? 0;
  const landUnit  = project.societyDetails?.landAreaUnit ?? 'Kanal';

  return (
    <section
      id="overview"
      className="scroll-mt-24"
      aria-label="Project overview"
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-[#029bba]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Project Overview</h2>
        </div>

        <div className="p-6">
          {/* Fact tiles grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">

            <FactTile
              icon={<Home className="w-5 h-5" />}
              label="Project Type"
              value={<span className="capitalize">{(project.projectNature || '—').replace(/_/g, ' ')}</span>}
            />

            {landValue > 0 ? (
              <FactTile
                icon={<Ruler className="w-5 h-5" />}
                label="Project Area"
                value={`${landValue.toLocaleString()} ${landUnit}`}
                sub={getLandAreaSecondary(landValue, landUnit)}
              />
            ) : project.totalArea ? (
              <FactTile
                icon={<Ruler className="w-5 h-5" />}
                label="Project Area"
                value={project.totalArea}
              />
            ) : null}

            {fd?.totalFloors ? (
              <FactTile
                icon={<Layers className="w-5 h-5" />}
                label="Total Floors"
                value={fd.totalFloors}
                sub={floorBreakdown || undefined}
              />
            ) : null}

            {project.launchDate && (
              <FactTile
                icon={<Calendar className="w-5 h-5" />}
                label="Launch Date"
                value={formatDetailDate(project.launchDate)}
              />
            )}

            {project.possessionStartDate && (
              <FactTile
                icon={<KeyRound className="w-5 h-5" />}
                label="Possession"
                value={formatDetailDate(project.possessionStartDate)}
              />
            )}

            {project.expectedCompletionDate && (
              <FactTile
                icon={<CalendarCheck className="w-5 h-5" />}
                label="Completion"
                value={formatDetailDate(project.expectedCompletionDate)}
              />
            )}

            {project.approvalAuthority && (
              <FactTile
                icon={<Landmark className="w-5 h-5" />}
                label="Approved By"
                value={project.approvalAuthority}
                sub={
                  nocApproved ? (
                    <span className="font-bold text-green-600">NOC Approved</span>
                  ) : nocPending ? (
                    <span className="font-bold text-amber-600">NOC Pending</span>
                  ) : undefined
                }
              />
            )}

            {project.saleMode && (
              <FactTile
                icon={<CreditCard className="w-5 h-5" />}
                label="Sale Mode"
                value={project.saleMode}
              />
            )}

            {status && (
              <FactTile
                icon={<Activity className="w-5 h-5" />}
                label="Status"
                value={<span className="capitalize">{status.replace(/_/g, ' ')}</span>}
              />
            )}

            {totalUnits > 0 && (
              <FactTile
                icon={<Building2 className="w-5 h-5" />}
                label="Total Units"
                value={totalUnits}
              />
            )}

          </div>

        </div>
      </div>
    </section>
  );
}