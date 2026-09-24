// components/project-detail/ProjectOverview.tsx
//
// Highrise.pk — Project Snapshot (V3 — Elegant Identity & Commercial)
//
// Rebuild: OWNS ONLY legal + commercial identity of the project.
// All structural/physical facts (floors, units, parking) moved to
// EnterprisePropertySpecs to eliminate duplication.
//
// Tiles rendered: Project Type · Project Area · Launch · Possession ·
// Completion · Approval Authority (+ NOC badge) · Sale Mode · Status
//
// Two-tier hierarchy:
//   Row 1: Identity        (Type, Area, Approval Authority)
//   Row 2: Timeline        (Launch, Possession, Completion)
//   Row 3: Commercial      (Sale Mode, Status)

'use client';

import React from 'react';
import {
  Building2,
  Home,
  Ruler,
  Calendar,
  KeyRound,
  CalendarCheck,
  Landmark,
  CreditCard,
  Activity,
  BadgeCheck,
  Clock,
} from 'lucide-react';

import type { ProjectDetailData } from '@/types/projectDetail';
import { formatDetailDate } from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS + HELPERS
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
// ELEGANT FACT TILE — accent bar + icon + label + value
// ─────────────────────────────────────────────────────────────────────────────

type AccentTone = 'teal' | 'navy' | 'emerald' | 'amber';

const TONE_MAP: Record<AccentTone, { accent: string; iconBg: string; iconColor: string }> = {
  teal:    { accent: 'before:bg-[#029bba]', iconBg: 'bg-[#029bba]/10', iconColor: 'text-[#029bba]' },
  navy:    { accent: 'before:bg-[#004063]', iconBg: 'bg-[#004063]/10', iconColor: 'text-[#004063]' },
  emerald: { accent: 'before:bg-[#10b981]', iconBg: 'bg-[#10b981]/10', iconColor: 'text-[#10b981]' },
  amber:   { accent: 'before:bg-[#f59e0b]', iconBg: 'bg-[#f59e0b]/10', iconColor: 'text-[#f59e0b]' },
};

function FactTile({
  icon,
  label,
  value,
  sub,
  tone = 'teal',
  badge,
}: {
  icon:   React.ReactNode;
  label:  string;
  value:  React.ReactNode;
  sub?:   React.ReactNode;
  tone?:  AccentTone;
  badge?: React.ReactNode;
}): React.ReactElement {
  const t = TONE_MAP[tone];

  return (
    <div
      className={`relative overflow-hidden bg-white rounded-2xl border border-gray-150 p-4
                  hover:border-gray-300 hover:shadow-md transition-all duration-200
                  before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${t.accent}`}
    >
      <div className="flex items-start gap-3 pl-1">
        <div className={`w-10 h-10 rounded-xl ${t.iconBg} ${t.iconColor}
                        flex items-center justify-center shrink-0`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {label}
            </p>
            {badge}
          </div>
          <p className="text-[15px] font-bold text-gray-900 leading-snug mt-1 break-words tabular-nums">
            {value}
          </p>
          {sub && (
            <p className="text-[11px] text-gray-500 mt-1 break-words font-medium">
              {sub}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE — top-right of card header
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }): React.ReactElement | null {
  if (!status) return null;

  const normalized = status.toLowerCase().replace(/[_-]/g, ' ');
  const isActive = ['launched', 'active', 'ongoing', 'under construction', 'live'].some(k => normalized.includes(k));
  const isCompleted = ['completed', 'delivered', 'handover'].some(k => normalized.includes(k));
  const isPreLaunch = ['pre launch', 'coming', 'planning', 'upcoming'].some(k => normalized.includes(k));

  const cfg = isCompleted
    ? { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Completed' }
    : isActive
    ? { bg: 'bg-[#029bba]/10', text: 'text-[#029bba]', border: 'border-[#029bba]/20', dot: 'bg-[#029bba]', label: normalized }
    : isPreLaunch
    ? { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: normalized }
    : { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400', label: normalized };

  return (
    <span className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                     text-[11px] font-bold tracking-wider capitalize
                     ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectOverview({ project }: ProjectOverviewProps) {
  const status = project.projectStatus ?? project.status;
  const nocApproved = project.nocStatus === 'approved';
  const nocPending = project.nocStatus === 'pending';

  const landValue = project.societyDetails?.totalLandArea ?? 0;
  const landUnit  = project.societyDetails?.landAreaUnit ?? 'Kanal';

  const nocBadge = nocApproved ? (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
                     bg-emerald-50 text-emerald-700 border border-emerald-200
                     text-[9px] font-black uppercase tracking-wider">
      <BadgeCheck className="w-2.5 h-2.5" />
      NOC
    </span>
  ) : nocPending ? (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
                     bg-amber-50 text-amber-700 border border-amber-200
                     text-[9px] font-black uppercase tracking-wider">
      <Clock className="w-2.5 h-2.5" />
      Pending
    </span>
  ) : null;

  return (
    <section
      id="overview"
      className="scroll-mt-24"
      aria-label="Project snapshot"
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header with subtle gradient + status badge */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-3
                        bg-gradient-to-r from-[#029bba]/5 via-white to-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-[#029bba]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-gray-900 leading-tight">
                Project Snapshot
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5 font-semibold uppercase tracking-wider">
                Identity · Legal · Commercial
              </p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="p-5 sm:p-6 space-y-6">

          {/* ── ROW 1: IDENTITY ── */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 pl-1
                          flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[#029bba]" />
              Identity
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <FactTile
                icon={<Home className="w-5 h-5" />}
                label="Project Type"
                value={<span className="capitalize">{(project.projectNature || '—').replace(/_/g, ' ')}</span>}
                tone="teal"
              />

              {landValue > 0 ? (
                <FactTile
                  icon={<Ruler className="w-5 h-5" />}
                  label="Project Area"
                  value={`${landValue.toLocaleString()} ${landUnit}`}
                  sub={getLandAreaSecondary(landValue, landUnit)}
                  tone="navy"
                />
              ) : project.totalArea ? (
                <FactTile
                  icon={<Ruler className="w-5 h-5" />}
                  label="Project Area"
                  value={project.totalArea}
                  tone="navy"
                />
              ) : null}

              {project.approvalAuthority && (
                <FactTile
                  icon={<Landmark className="w-5 h-5" />}
                  label="Approval Authority"
                  value={project.approvalAuthority}
                  tone={nocApproved ? 'emerald' : nocPending ? 'amber' : 'navy'}
                  badge={nocBadge}
                />
              )}
            </div>
          </div>

          {/* ── ROW 2: TIMELINE ── */}
          {(project.launchDate || project.possessionStartDate || project.expectedCompletionDate) && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 pl-1
                            flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#004063]" />
                Timeline
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {project.launchDate && (
                  <FactTile
                    icon={<Calendar className="w-5 h-5" />}
                    label="Launch Date"
                    value={formatDetailDate(project.launchDate)}
                    tone="teal"
                  />
                )}
                {project.possessionStartDate && (
                  <FactTile
                    icon={<KeyRound className="w-5 h-5" />}
                    label="Possession"
                    value={formatDetailDate(project.possessionStartDate)}
                    tone="emerald"
                  />
                )}
                {project.expectedCompletionDate && (
                  <FactTile
                    icon={<CalendarCheck className="w-5 h-5" />}
                    label="Completion"
                    value={formatDetailDate(project.expectedCompletionDate)}
                    tone="navy"
                  />
                )}
              </div>
            </div>
          )}

          {/* ── ROW 3: COMMERCIAL ── */}
          {(project.saleMode || status) && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 pl-1
                            flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-[#f59e0b]" />
                Commercial
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {project.saleMode && (
                  <FactTile
                    icon={<CreditCard className="w-5 h-5" />}
                    label="Sale Mode"
                    value={project.saleMode}
                    tone="amber"
                  />
                )}
                {status && (
                  <FactTile
                    icon={<Activity className="w-5 h-5" />}
                    label="Project Status"
                    value={<span className="capitalize">{status.replace(/_/g, ' ')}</span>}
                    tone="teal"
                  />
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}