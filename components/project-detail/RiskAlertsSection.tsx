// components/project-detail/RiskAlertsSection.tsx
//
// Highrise.pk — Risk Alerts / Important Information (V1)
//
// Design philosophy (§27): calm, factual, NEVER sensational.
// Trust requires neutrality — buyers get balanced risk context
// alongside the verification evidence panel.
//
//   → Active alerts (investigating included), severity-ordered
//     critical → low: white cards, thin left-border accent, no
//     full-red panic backgrounds
//   → Resolved alerts: collapsed muted archive (transparency —
//     "what was the issue, how it closed")
//   → Empty (no alerts) → section hidden entirely — absence of
//     alerts is NOT a trust claim (admin-curated data)
//
// DATA: project.riskAlerts — embedded, admin-created (audit
// createdBy), unified with Society feed shape. Nothing invented.

'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Landmark,
  Wallet,
  HardHat,
  ShieldAlert,
  FileCheck,
  MapPin,
} from 'lucide-react';

import type {
  ProjectDetailData,
  RiskAlertDetail,
  RiskAlertCategory,
  RiskAlertSeverity,
} from '@/types/projectDetail';
import { formatDetailDate } from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — palette-compliant (Rule Set A only), restrained severity tones
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<RiskAlertSeverity, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

const SEVERITY_CONFIG: Record<RiskAlertSeverity, {
  label:  string;
  border: string;
  chip:   string;
}> = {
  critical: { label: 'Critical', border: 'border-l-red-500',    chip: 'bg-red-50 text-red-600 border-red-200' },
  high:     { label: 'High',     border: 'border-l-amber-500',  chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  medium:   { label: 'Medium',   border: 'border-l-amber-400',  chip: 'bg-amber-50/60 text-amber-700 border-amber-200/60' },
  low:      { label: 'Low',      border: 'border-l-gray-400',   chip: 'bg-gray-50 text-gray-500 border-gray-200' },
};

const CATEGORY_META: Record<RiskAlertCategory, {
  label: string;
  icon:  React.ComponentType<{ className?: string }>;
}> = {
  legal:        { label: 'Legal',        icon: Landmark },
  financial:    { label: 'Financial',    icon: Wallet },
  construction: { label: 'Construction', icon: HardHat },
  fraud:        { label: 'Fraud',        icon: ShieldAlert },
  noc:          { label: 'NOC',          icon: FileCheck },
  general:      { label: 'General',      icon: Info },
};

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface RiskAlertsSectionProps {
  project: ProjectDetailData;
}

// ─────────────────────────────────────────────────────────────────────────────
// ALERT CARD — one alert (active or archived)
// ─────────────────────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  archived = false,
}: {
  alert:   RiskAlertDetail;
  archived?: boolean;
}): React.ReactElement {
  const sev    = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.low;
  const cat    = CATEGORY_META[alert.category] ?? CATEGORY_META.general;
  const CatIcon = cat.icon;

  return (
    <div className={`rounded-xl border border-gray-200 border-l-[3px] ${sev.border}
                    ${archived ? 'bg-gray-50/60 opacity-80' : 'bg-white'}
                    p-4`}>
      {/* Title + chips */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1.5">
        <h4 className={`font-bold text-sm leading-tight ${archived ? 'text-gray-600' : 'text-gray-900'}`}>
          {alert.title}
        </h4>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sev.chip}`}>
            {sev.label}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                           text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200">
            <CatIcon className="w-2.5 h-2.5" />
            {cat.label}
          </span>
          {alert.status === 'investigating' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold
                             bg-[#004063]/5 text-[#004063] border border-[#004063]/20">
              Under Investigation
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className={`text-sm leading-relaxed ${archived ? 'text-gray-500' : 'text-gray-600'}`}>
        {alert.description}
      </p>

      {/* Meta: issued by + dates */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] text-gray-400">
        <span className="font-semibold text-gray-500">{alert.issuedBy}</span>
        <span>issued {formatDetailDate(alert.issuedAt)}</span>
        {archived && alert.resolvedAt && (
          <span className="font-semibold text-green-600">
            resolved {formatDetailDate(alert.resolvedAt)}
          </span>
        )}
      </div>

      {/* Affected units */}
      {(alert.affectedUnits?.length ?? 0) > 0 && (
        <div className="flex items-center flex-wrap gap-1.5 mt-3">
          {alert.affectedUnits!.map((unit, i) => (
            <span key={i}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600
                         bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
              <MapPin className="w-2.5 h-2.5 text-gray-400" />
              {unit}
            </span>
          ))}
        </div>
      )}

      {/* Evidence source */}
      {alert.sourceUrl && (
        <a
          href={alert.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#029bba]
                     hover:underline mt-3"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Source Notice
        </a>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function RiskAlertsSection({
  project,
}: RiskAlertsSectionProps): React.ReactElement | null {
  const alerts = project.riskAlerts ?? [];

  const active = alerts
    .filter(a => a.status === 'active' || a.status === 'investigating')
    .sort((a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    );

  const resolved = alerts
    .filter(a => a.status === 'resolved')
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

  // No alerts at all → hidden (absence of admin alerts is not a claim)
  const [showResolved, setShowResolved] = useState(false);

  if (alerts.length === 0) return null;

  return (
    <section
      id="risk-alerts"
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      aria-label="Important information and risk alerts"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Important Information
          </h2>
          {active.length > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold
                             bg-amber-50 text-amber-700 border border-amber-200">
              {active.length} active {active.length === 1 ? 'alert' : 'alerts'}
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Neutral framing line — §27: no sensationalism */}
        <p className="text-xs text-gray-500 leading-relaxed">
          Alerts are issued by regulatory authorities or the Highrise.pk team,
          based on public notices and verification records. Review this
          information alongside the verification evidence above.
        </p>

        {/* Active alerts */}
        {active.map((alert, i) => (
          <AlertCard key={alert._id ?? `active-${i}`} alert={alert} />
        ))}

        {/* Resolved archive — transparency history */}
        {resolved.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowResolved(v => !v)}
              aria-expanded={showResolved}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-500
                         hover:text-gray-700 transition-colors"
            >
              {showResolved ? (
                <><ChevronUp className="w-3.5 h-3.5" />Hide resolved</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" />
                  {resolved.length} resolved {resolved.length === 1 ? 'alert' : 'alerts'} (history)</>
              )}
            </button>

            {showResolved && (
              <div className="space-y-3 mt-3">
                {resolved.map((alert, i) => (
                  <AlertCard key={alert._id ?? `resolved-${i}`} alert={alert} archived />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}