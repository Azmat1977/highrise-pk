// components/project-detail/ConstructionTracker.tsx
//
// Highrise.pk — Construction Tracker (V2 — Transparency Edition)
//
// The transparency section: launch → today, evidence-based.
//   → Header: overall progress + schedule status chip
//   → Schedule derived ONLY from real dates (launchDate +
//     expectedCompletionDate + developmentProgress) — tolerance ±10%
//   → Timeline (newest first) with per-milestone progress delta
//   → Evidence: photos (+N), drone flag, engineer note, quality checks
//
// HONESTY RULES:
//   → No stage labels invented from % (milestone titles carry stages)
//   → Missing dates → schedule indicator hidden (never faked)
//   → Schedule computed client-side (Date.now) — avoids hydration
//     mismatch between ISR build time and view time

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Calendar,
  Camera,
  Video,
  HardHat,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react';

import type {
  ProjectDetailData,
  ConstructionMilestone,
} from '@/types/projectDetail';
import { formatDetailDate } from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS + TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ConstructionTrackerProps {
  project: ProjectDetailData;
}

interface ScheduleStatus {
  label:  string;
  tone:   'good' | 'warn';
  detail: string;
}

const SCHEDULE_TOLERANCE = 10; // ±% elapsed-vs-progress treated as on-track

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getScheduleStatus(project: ProjectDetailData): ScheduleStatus | null {
  const { launchDate, expectedCompletionDate, developmentProgress } = project;
  if (!launchDate || !expectedCompletionDate || developmentProgress === undefined) {
    return null;
  }

  const start = new Date(launchDate).getTime();
  const end   = new Date(expectedCompletionDate).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

  const now     = Date.now();
  const elapsed = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));

  if (developmentProgress >= 95) {
    return {
      label:  'Near Completion',
      tone:   'good',
      detail: 'Construction is in its final stages.',
    };
  }

  if (developmentProgress >= elapsed - SCHEDULE_TOLERANCE) {
    return {
      label:  'On Track',
      tone:   'good',
      detail: `Progress ${developmentProgress}% against ${Math.round(elapsed)}% of the scheduled timeline elapsed.`,
    };
  }

  return {
    label:  'Behind Schedule',
    tone:   'warn',
    detail: `Progress ${developmentProgress}% against ${Math.round(elapsed)}% of the timeline elapsed — confirm the revised delivery timeline with the developer.`,
  };
}

function getMilestoneProgress(upd: ConstructionMilestone): number | null {
  const p = upd.progress ?? upd.progressPercent;
  return typeof p === 'number' && p > 0 ? p : null;
}

function getMilestoneImages(upd: ConstructionMilestone): { url: string }[] {
  // Handles both legacy string[] and object {url} formats
  const out: { url: string }[] = [];
  for (const img of upd.images ?? []) {
    const raw = img as unknown as string | { url?: string };
    if (typeof raw === 'string') {
      if (raw) out.push({ url: raw });
    } else if (raw?.url) {
      out.push({ url: raw.url });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ConstructionTracker({
  project,
}: ConstructionTrackerProps): React.ReactElement | null {
  const updates = project.developmentUpdates ?? [];
  if (updates.length === 0) return null;

  // Schedule uses Date.now() — computed post-mount to avoid ISR/hydration
  // text mismatch (elapsed % differs between build time and view time)
  const [schedule, setSchedule] = useState<ScheduleStatus | null>(null);
  useEffect(() => {
    setSchedule(getScheduleStatus(project));
  }, [project]);

  const overall = project.developmentProgress;

  // Newest first — investors check "what's the latest" first.
  // Per-milestone delta shows trajectory since the previous update.
  const sorted = [...updates].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const lastUpdateDate = sorted[0] ? formatDetailDate(sorted[0].date) : '';

  return (
    <section
      id="construction"
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      aria-label="Construction progress"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#029bba]" />
            Construction Progress
          </h2>
          {schedule && (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
              schedule.tone === 'good'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              {schedule.tone === 'good'
                ? <TrendingUp className="w-3.5 h-3.5" />
                : <TrendingDown className="w-3.5 h-3.5" />}
              {schedule.label}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Summary line */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          {overall !== undefined && (
            <span className="font-black text-gray-900 text-base tabular-nums">
              {overall}% complete
            </span>
          )}
          <span>{sorted.length} updates</span>
          {lastUpdateDate && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Last update {lastUpdateDate}
            </span>
          )}
        </div>

        {/* Schedule explanation — derived, evidence-based */}
        {schedule && (
          <p className={`text-xs leading-relaxed rounded-xl px-4 py-3 border ${
            schedule.tone === 'good'
              ? 'bg-green-50/60 border-green-100 text-green-700'
              : 'bg-amber-50/60 border-amber-100 text-amber-700'
          }`}>
            {schedule.detail}
          </p>
        )}

        {/* Timeline */}
        <div className="space-y-6">
          {sorted.map((upd, idx) => {
            const progress     = getMilestoneProgress(upd);
            const prev         = sorted[idx + 1];
            const prevProgress = prev ? getMilestoneProgress(prev) : null;
            const delta = progress !== null && prevProgress !== null
              ? progress - prevProgress
              : null;
            const images = getMilestoneImages(upd);

            return (
              <div key={`${upd.date}-${idx}`} className="flex gap-4">
                {/* Axis */}
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-[#029bba] ring-4 ring-[#029bba]/10" />
                  {idx < sorted.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 my-2" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pb-2">
                  {/* Meta row: date + progress + delta + drone */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <span className="text-xs font-bold text-[#029bba] bg-[#029bba]/5 px-2 py-1 rounded-md tabular-nums">
                      {formatDetailDate(upd.date)}
                    </span>
                    <div className="flex items-center gap-2">
                      {progress !== null && (
                        <span className="text-xs font-bold text-gray-500 tabular-nums">
                          {progress}%
                        </span>
                      )}
                      {delta !== null && delta > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-green-600 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5 tabular-nums">
                          <TrendingUp className="w-2.5 h-2.5" />
                          +{delta}%
                        </span>
                      )}
                      {upd.isDroneUpdate && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-[#029bba] bg-[#029bba]/10 border border-[#029bba]/20 rounded-full px-1.5 py-0.5">
                          <Video className="w-2.5 h-2.5" />
                          Drone
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 className="font-bold text-gray-900 mb-1">{upd.title}</h4>
                  {upd.description && (
                    <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                      {upd.description}
                    </p>
                  )}

                  {/* Photos — up to 4 thumbs + counter */}
                  {images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {images.slice(0, 4).map((img, i) => (
                        <div
                          key={i}
                          className="relative w-28 h-20 rounded-lg overflow-hidden border border-gray-200"
                        >
                          <Image
                            src={img.url}
                            alt={`${upd.title} — photo ${i + 1}`}
                            fill
                            className="object-cover"
                            sizes="112px"
                          />
                        </div>
                      ))}
                      {images.length > 4 && (
                        <div className="w-28 h-20 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-500">
                          <Camera className="w-4 h-4 mb-0.5" />
                          <span className="text-[10px] font-bold">
                            +{images.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Site activity video — model-backed evidence */}
                  {upd.videoUrl && (
                    <a
                      href={upd.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba]
                                 hover:underline mb-3"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Watch Site Video
                    </a>
                  )}

                  {/* Engineer note */}
                  {upd.engineerNote && (
                    <div className="flex gap-2.5 rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-2.5 mb-3">
                      <HardHat className="w-4 h-4 text-[#029bba] shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600 italic leading-relaxed">
                        {upd.engineerNote}
                      </p>
                    </div>
                  )}

                  {/* Quality checks */}
                  {(upd.qualityChecks?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {upd.qualityChecks!.map((check, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5"
                        >
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          {check}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}