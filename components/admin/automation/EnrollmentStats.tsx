// components/admin/automation/EnrollmentStats.tsx
// ═══════════════════════════════════════════════════════════════
// Stats widget for a single automation sequence
// Shows enrolled / active / completed / cancelled / emails sent
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Users, CheckCircle, XCircle, Mail, Activity } from 'lucide-react';

interface SequenceStats {
  totalEnrolled:  number;
  totalActive:    number;
  totalCompleted: number;
  totalCancelled: number;
  totalFailed:    number;
  emailsSent:     number;
}

interface EnrollmentStatsProps {
  stats: SequenceStats;
  compact?: boolean;   // Compact mode for list view
}

export default function EnrollmentStats({
  stats,
  compact = false,
}: EnrollmentStatsProps) {
  const completionRate = stats.totalEnrolled > 0
    ? Math.round((stats.totalCompleted / stats.totalEnrolled) * 100)
    : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-[#029bba]" />
          <strong className="text-gray-700">{stats.totalEnrolled}</strong> enrolled
        </span>
        <span className="flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-amber-500" />
          <strong className="text-gray-700">{stats.totalActive}</strong> active
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          <strong className="text-gray-700">{stats.totalCompleted}</strong> completed
        </span>
        <span className="flex items-center gap-1">
          <Mail className="w-3.5 h-3.5 text-gray-400" />
          <strong className="text-gray-700">{stats.emailsSent}</strong> emails
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

      {/* Enrolled */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
        <div className="flex items-center justify-center mb-2">
          <Users className="w-5 h-5 text-[#029bba]" />
        </div>
        <p className="text-2xl font-black text-[#004063]">{stats.totalEnrolled}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-semibold">Enrolled</p>
      </div>

      {/* Active */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
        <div className="flex items-center justify-center mb-2">
          <Activity className="w-5 h-5 text-amber-500" />
        </div>
        <p className="text-2xl font-black text-amber-600">{stats.totalActive}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-semibold">Active</p>
      </div>

      {/* Completed */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
        <div className="flex items-center justify-center mb-2">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
        </div>
        <p className="text-2xl font-black text-emerald-600">{stats.totalCompleted}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-semibold">Completed</p>
      </div>

      {/* Cancelled */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
        <div className="flex items-center justify-center mb-2">
          <XCircle className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-2xl font-black text-gray-500">{stats.totalCancelled}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-semibold">Cancelled</p>
      </div>

      {/* Failed */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
        <div className="flex items-center justify-center mb-2">
          <XCircle className="w-5 h-5 text-red-400" />
        </div>
        <p className="text-2xl font-black text-red-500">{stats.totalFailed}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-semibold">Failed</p>
      </div>

      {/* Emails Sent */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
        <div className="flex items-center justify-center mb-2">
          <Mail className="w-5 h-5 text-[#004063]" />
        </div>
        <p className="text-2xl font-black text-[#004063]">{stats.emailsSent}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-semibold">Emails Sent</p>
      </div>

      {/* Completion Rate (full width row) */}
      {stats.totalEnrolled > 0 && (
        <div className="col-span-2 sm:col-span-3 lg:col-span-6 bg-gradient-to-r from-[#004063] to-[#029bba]
                        rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold">Completion Rate</p>
            <p className="text-xl font-black">{completionRate}%</p>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-white transition-all duration-700"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-xs text-white/70 mt-1.5">
            {stats.totalCompleted} of {stats.totalEnrolled} recipients completed the full sequence
          </p>
        </div>
      )}
    </div>
  );
}