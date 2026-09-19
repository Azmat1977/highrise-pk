// components/project-detail/ConstructionTracker.tsx
// ============================================================================
// HIGHRISE.PK — Enterprise Construction Tracker & Trust Score
// 6-Block Architecture: Overall Ring, Delay Analyzer, Timeline Ruler, 
// Evidence Cards, Developer Track Record, CTA
// ============================================================================

'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import {
  Calendar,
  Camera,
  Video,
  HardHat,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building2,
  CalendarClock,
  MapPin,
  ChevronRight,
  TrendingUp,
  Activity
} from 'lucide-react';

import type { ProjectDetailData, ConstructionMilestone } from '@/types/projectDetail';
import { formatDetailDate } from '@/types/projectDetail';

type EnterpriseMilestone = ConstructionMilestone & {
  verifiedByHighriseAt?: string;
};

interface ConstructionTrackerProps {
  project: ProjectDetailData;
}

// ─── HELPERS ───

function getMonthsDifference(d1: string | Date, d2: string | Date): number {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  let months = (date2.getFullYear() - date1.getFullYear()) * 12;
  months -= date1.getMonth();
  months += date2.getMonth();
  return months <= 0 ? 0 : months;
}

function getQuarterString(d: string | Date): string {
  const date = new Date(d);
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} ${date.getFullYear()}`;
}

export default function ConstructionTracker({ project }: ConstructionTrackerProps): React.ReactElement | null {
  const updates = (project.developmentUpdates ?? []) as EnterpriseMilestone[];
  
  // Only hide if zero updates AND no progress tracking initialized
  if (updates.length === 0 && !project.developmentProgress && !project.launchDate) {
    return null; 
  }

  const overallProgress = project.developmentProgress || 0;
  const status = project.deliveryStatus || 'on_track';
  
  // Delay calculations
  const expectedDate = project.expectedCompletionDate;
  const today = new Date();
  const isDelayed = status === 'slightly_delayed' || status === 'critical_delay';
  const delayMonths = expectedDate && isDelayed ? getMonthsDifference(expectedDate, today) : 0;

  // Sorted updates (Newest first)
  const sortedUpdates = [...updates].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Generate Timeline Quarters (Launch -> Expected/Today)
  const timelineQuarters = useMemo(() => {
    if (!project.launchDate) return [];
    
    const start = new Date(project.launchDate);
    const end = expectedDate ? new Date(expectedDate) : today;
    if (end < start) return [];

    const quarters: { label: string; hasUpdate: boolean; isCurrent: boolean }[] = [];
    let current = new Date(start);
    const currentQStr = getQuarterString(today);

    while (current <= end || getQuarterString(current) === currentQStr) {
      const qStr = getQuarterString(current);
      // Check if any update falls in this quarter
      const hasUpdate = updates.some(u => getQuarterString(u.date) === qStr);
      
      // Prevent duplicates
      if (!quarters.some(q => q.label === qStr)) {
        quarters.push({
          label: qStr,
          hasUpdate,
          isCurrent: qStr === currentQStr
        });
      }
      current.setMonth(current.getMonth() + 3); // Move to next quarter
    }
    return quarters;
  }, [project.launchDate, expectedDate, updates, today]);

  // Status UI Config
  const statusConfig = {
    on_track: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'On Track', icon: TrendingUp },
    slightly_delayed: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Slightly Delayed', icon: AlertTriangle },
    critical_delay: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Critical Delay', icon: AlertTriangle },
    completed: { color: 'text-[#029bba]', bg: 'bg-[#029bba]/10', border: 'border-[#029bba]/20', label: 'Completed', icon: CheckCircle2 },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <section id="construction" className="py-4 scroll-mt-24">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* ─── BLOCK 1: HEADER & PROGRESS RING ─── */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* SVG Progress Ring */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                <circle 
                  cx="50" cy="50" r="42" fill="transparent" 
                  stroke="url(#gradient)" strokeWidth="8" 
                  strokeDasharray={`${(overallProgress / 100) * 264} 264`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#029bba" />
                    <stop offset="100%" stopColor="#004063" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-[#004063] leading-none">{overallProgress}%</span>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 mb-1.5">
                Construction Progress
              </h2>
              <div className="flex flex-wrap items-center gap-2.5 text-sm text-gray-500 font-medium">
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Started {project.launchDate ? formatDetailDate(project.launchDate) : 'TBA'}</span>
                <span className="hidden sm:inline text-gray-300">•</span>
                <span className="flex items-center gap-1"><CalendarClock className="w-4 h-4" /> Expected {expectedDate ? formatDetailDate(expectedDate) : 'TBA'}</span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
            <StatusIcon className="w-5 h-5" />
            <div className="flex flex-col">
              <span className="text-sm leading-tight uppercase tracking-wide">{statusConfig.label}</span>
              {isDelayed && delayMonths > 0 && <span className="text-[10px] opacity-80 leading-tight">Est. {delayMonths} Months Late</span>}
            </div>
          </div>
        </div>

        {/* ─── BLOCK 4: DELAY ANALYZER (Only shows if delayed) ─── */}
        {isDelayed && (
          <div className="bg-amber-50/50 border-b border-amber-100 p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-900 mb-1">Project is currently running behind schedule.</h3>
              <div className="text-sm text-amber-800/80 leading-relaxed mb-3">
                <p><strong>Original Delivery:</strong> {expectedDate ? formatDetailDate(expectedDate) : 'N/A'}</p>
                {project.revisedDeliveryDate && <p><strong>Revised Estimate:</strong> {formatDetailDate(project.revisedDeliveryDate)}</p>}
                {project.delayReason && (
                  <p className="mt-2 bg-amber-100/50 p-2.5 rounded-lg border border-amber-200/50 italic">
                    <strong className="not-italic">Reason for delay:</strong> {project.delayReason}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          {/* ─── BLOCK 2: TIMELINE RULER ─── */}
          {timelineQuarters.length > 0 && (
            <div className="mb-8 overflow-x-auto overflow-y-hidden scrollbar-none -mx-6 px-6 py-7">
              <div className="min-w-max flex items-center">
                {timelineQuarters.map((q, idx) => (
                  <div key={q.label} className="flex items-center">
                    {/* The Dot */}
                    <div className="relative flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full border-2 z-10 ${
                        q.hasUpdate ? 'bg-[#029bba] border-[#029bba]' : 'bg-white border-gray-300'
                      } ${q.isCurrent ? 'ring-4 ring-[#029bba]/20' : ''}`} />
                      
                      <span className={`absolute top-6 text-[10px] font-bold whitespace-nowrap ${
                        q.isCurrent ? 'text-[#029bba]' : 'text-gray-400'
                      }`}>
                        {q.label}
                      </span>
                      {q.isCurrent && (
                        <span className="absolute -top-5 text-[9px] font-black text-[#029bba] bg-[#029bba]/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Current
                        </span>
                      )}
                    </div>
                    {/* The Line */}
                    {idx < timelineQuarters.length - 1 && (
                      <div className={`w-16 h-0.5 ${timelineQuarters[idx+1].hasUpdate ? 'bg-[#029bba]' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── BLOCK 3: MILESTONE EVIDENCE CARDS ─── */}
          <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#029bba]" /> Latest Construction Updates
          </h3>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-200 before:via-gray-200 before:to-transparent">
            {sortedUpdates.length > 0 ? sortedUpdates.map((upd, idx) => {
              // Normalize image list (supports string[] or { url: string }[])
              const rawImages = upd.images ?? [];
              const images: { url: string }[] = rawImages.map((img: any) => {
                if (typeof img === 'string') return { url: img };
                if (img && typeof img === 'object' && typeof img.url === 'string') {
                  return { url: img.url };
                }
                return { url: '' };
              }).filter((img) => Boolean(img.url));
              
              return (
                <div key={idx} className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  
                  {/* Timeline Node */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-[#029bba] text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10 ml-0 md:ml-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>

                  {/* Card Content */}
                  <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 ml-4 md:ml-0">
                    
                    {/* Verification Stamp */}
                    {upd.verifiedByHighriseAt && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-1 mb-3 w-fit uppercase tracking-wider">
                        <ShieldCheck className="w-3 h-3" />
                        Verified by Highrise Team
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                        {formatDetailDate(upd.date)}
                      </span>
                      {upd.progressPercent && (
                        <span className="text-sm font-black text-[#029bba]">
                          {upd.progressPercent}% Complete
                        </span>
                      )}
                    </div>

                    <h4 className="text-lg font-bold text-gray-900 mb-2">{upd.title}</h4>
                    {upd.description && <p className="text-sm text-gray-600 mb-4 leading-relaxed">{upd.description}</p>}

                    {/* Photos Grid */}
                    {images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {images.slice(0, 3).map((img, i) => (
                          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200">
                            <Image src={img.url} alt="" fill className="object-cover" sizes="120px" />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      {upd.videoUrl && (
                        <a href={upd.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#ef4444] px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors">
                          <Video className="w-3.5 h-3.5" /> Watch Site Video
                        </a>
                      )}
                      {upd.isDroneUpdate && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#004063] bg-[#004063]/10 px-3 py-1.5 rounded-lg">
                          <Camera className="w-3.5 h-3.5" /> Drone Aerial View
                        </span>
                      )}
                    </div>

                    {upd.engineerNote && (
                      <div className="mt-4 bg-blue-50/50 border border-blue-100 p-3 rounded-xl flex gap-2">
                        <HardHat className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-900 italic">"{upd.engineerNote}"</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }) : (
              <p className="text-center text-sm text-gray-400 py-6">No construction updates have been posted yet.</p>
            )}
          </div>
        </div>

        {/* ─── BLOCK 5: DEVELOPER TRUST RECORD ─── */}
        {(project.completedProjects?.length ?? 0) > 0 && (
          <div className="bg-[#001f2b] p-6 flex flex-col md:flex-row items-center justify-between gap-4 text-white">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2 mb-1">
                <Building2 className="w-5 h-5 text-[#029bba]" />
                Developer Delivery Track Record
              </h3>
              <p className="text-sm text-gray-300">
                This developer has successfully delivered <strong className="text-white">{project.completedProjects?.length} previous projects</strong>.
              </p>
            </div>
            <button className="shrink-0 bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors flex items-center gap-2">
              View Developer Profile <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </section>
  );
}