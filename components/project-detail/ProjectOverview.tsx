// components/project-detail/ProjectOverview.tsx
//
// Highrise.pk — Project Overview (V1)
// Single-owner fact sheet: type, floors breakdown, dates, authority/NOC,
// sale mode, units, construction progress.
// Replaces: hero StatsBar, sidebar Quick Info, overview 4-cards.
// Every fact conditional — nothing invented (missing data = hidden).

'use client';

import React from 'react';
import { Building2 } from 'lucide-react';

import type { ProjectDetailData } from '@/types/projectDetail';
import { formatDetailDate } from '@/types/projectDetail';

interface ProjectOverviewProps {
  project: ProjectDetailData;
}

function Fact({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">
        {label}
      </p>
      <div className="text-sm font-bold text-gray-900 truncate">{value}</div>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

/**
 * getLandAreaSecondary
 * Secondary land-area conversion line — Kanal ↔ Marla ↔ Acre.
 * Returns undefined for unknown units (fact stays single-line).
 */
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

export default function ProjectOverview({ project }: ProjectOverviewProps) {
  const breakdown = project.unitTypeBreakdown ?? [];

  // Land area — societyDetails (primary) → legacy totalArea (fallback)
  const landValue = project.societyDetails?.totalLandArea ?? 0;
  const landUnit  = project.societyDetails?.landAreaUnit ?? 'Kanal';
  const hasLandArea = landValue > 0;

  const totalUnits =
    breakdown.reduce((s, ut) => s + (ut.totalUnits ?? 0), 0) ||
    project.totalUnits ||
    0;
  const availableUnits =
    breakdown.reduce((s, ut) => s + (ut.availableUnits ?? 0), 0) ||
    project.unitsAvailable ||
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

  return (
    <section
      id="overview"
      className="max-w-7xl mx-auto px-4 py-4"
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

        {/* Facts grid */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5">

          <Fact
            label="Project Type"
            value={<span className="capitalize">{(project.projectNature || '—').replace(/_/g, ' ')}</span>}
          />

          {hasLandArea ? (
            <Fact
              label="Project Area"
              value={`${landValue.toLocaleString()} ${landUnit}`}
              sub={getLandAreaSecondary(landValue, landUnit)}
            />
          ) : project.totalArea ? (
            <Fact
              label="Project Area"
              value={project.totalArea}
            />
          ) : null}

          {fd?.totalFloors ? (
            <Fact
              label="Total Floors"
              value={fd.totalFloors}
              sub={floorBreakdown || undefined}
            />
          ) : null}

          {project.launchDate && (
            <Fact label="Launch Date" value={formatDetailDate(project.launchDate)} />
          )}

          {project.possessionStartDate && (
            <Fact label="Possession" value={formatDetailDate(project.possessionStartDate)} />
          )}

          {project.expectedCompletionDate && (
            <Fact label="Completion" value={formatDetailDate(project.expectedCompletionDate)} />
          )}

          {project.approvalAuthority && (
            <Fact
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
            <Fact label="Sale Mode" value={project.saleMode} />
          )}

          {status && (
            <Fact label="Status" value={<span className="capitalize">{status.replace(/_/g, ' ')}</span>} />
          )}

          {totalUnits > 0 && (
            <Fact
              label="Total Units"
              value={totalUnits}
              sub={availableUnits > 0 ? `${availableUnits} available` : undefined}
            />
          )}

        </div>

        {/* Construction progress — synced with developmentUpdates data */}
        {progress !== undefined && (
          <div className="px-6 py-5 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider whitespace-nowrap">
                Construction Progress
              </p>
              <div
                className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Construction ${progress}% complete`}
              >
                <div
                  className="h-full bg-gradient-to-r from-[#029bba] to-[#017a94] rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-black text-[#029bba] tabular-nums whitespace-nowrap">
                {progress}%
              </span>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}