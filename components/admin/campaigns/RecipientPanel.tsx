// ========== FILE: components/admin/campaigns/RecipientPanel.tsx ==========
// 👥 ENTERPRISE RECIPIENT PANEL — HIGHRISE.PK
// Live subscriber count display — connected to real API stats
// ═══════════════════════════════════════════════════════════════
// FIX V2.0:
//   ✅ Segments match actual DB model (active|unsubscribed|bounced|pending)
//   ✅ Removed fake segments (new/inactive/premium — never existed in DB)
//   ✅ onCountChange callback notifies MissionControl of real count
//   ✅ All stats connected to real API response
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  UserCheck,
  RefreshCw,
  AlertCircle,
  Loader2,
  Info,
  Check,
  UserX,
  Clock,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

interface RecipientPanelProps {
  selectedSegments: string[];
  onChange:         (segments: string[]) => void;
  /** Called whenever the real recipient count changes */
  onCountChange?:   (count: number) => void;
}

interface SegmentOption {
  id:          string;
  label:       string;
  description: string;
  icon:        React.ReactNode;
  color:       string;
  bg:          string;
  statsKey:    'active' | 'unsubscribed' | 'bounced' | 'pending';
  selectable:  boolean;   // Only active subscribers can receive campaigns
}

interface SubscriberStats {
  total:        number;
  active:       number;
  unsubscribed: number;
  bounced:      number;
  pending:      number;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 SEGMENT OPTIONS (Matches actual DB model status enum)
// ═══════════════════════════════════════════════════════════════

const SEGMENTS: SegmentOption[] = [
  {
    id:          'all',
    label:       'All Active Subscribers',
    description: 'All verified, opted-in subscribers who can receive emails',
    icon:        <Users className="w-4 h-4" />,
    color:       'text-[#029bba]',
    bg:          'bg-[#029bba]/10',
    statsKey:    'active',
    selectable:  true,
  },
  {
    id:          'active',
    label:       'Active Only',
    description: 'Same as All Active — verified & opted-in subscribers',
    icon:        <UserCheck className="w-4 h-4" />,
    color:       'text-emerald-600',
    bg:          'bg-emerald-100',
    statsKey:    'active',
    selectable:  true,
  },
];

// ─── Info-only segments (not selectable — shown for awareness) ─
const INFO_SEGMENTS: Array<{
  label:    string;
  statsKey: keyof SubscriberStats;
  icon:     React.ReactNode;
  color:    string;
  tooltip:  string;
}> = [
  {
    label:    'Unsubscribed',
    statsKey: 'unsubscribed',
    icon:     <UserX   className="w-3.5 h-3.5" />,
    color:    'text-gray-500',
    tooltip:  'Opted out — excluded from all campaigns',
  },
  {
    label:    'Bounced',
    statsKey: 'bounced',
    icon:     <AlertCircle className="w-3.5 h-3.5" />,
    color:    'text-red-500',
    tooltip:  'Invalid email — excluded from all campaigns',
  },
  {
    label:    'Pending Verification',
    statsKey: 'pending',
    icon:     <Clock  className="w-3.5 h-3.5" />,
    color:    'text-amber-500',
    tooltip:  'Email not yet verified — excluded from campaigns',
  },
];

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const RecipientPanel: React.FC<RecipientPanelProps> = ({
  selectedSegments,
  onChange,
  onCountChange,
}) => {
  const [stats,      setStats]      = useState<SubscriberStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ─────────────────────────────────────────────
  // Fetch subscriber stats from API
  // ─────────────────────────────────────────────
  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/newsletter/subscribers', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load subscriber stats');
      }

      const data = await response.json();

      if (data.success && data.stats) {
        const newStats: SubscriberStats = {
          total:        data.stats.total        || 0,
          active:       data.stats.active       || 0,
          unsubscribed: data.stats.unsubscribed || 0,
          bounced:      data.stats.bounced      || 0,
          pending:      data.stats.pending      || 0,
        };
        setStats(newStats);

        // ✅ Notify MissionControl of real recipient count
        onCountChange?.(newStats.active);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─────────────────────────────────────────────
  // Recipient count — always = active subscribers
  // (Only active subscribers receive campaigns)
  // ─────────────────────────────────────────────
  const totalRecipients = stats?.active || 0;

  // ─────────────────────────────────────────────
  // Handle segment toggle
  // ─────────────────────────────────────────────
  const handleSegmentToggle = (segmentId: string) => {
    // Both 'all' and 'active' map to the same set of people
    // Toggle between them is cosmetic — always sends to active list
    if (segmentId === 'all') {
      onChange(['all']);
    } else if (segmentId === 'active') {
      onChange(['active']);
    }
  };

  // ─────────────────────────────────────────────
  // Get count for a segment
  // ─────────────────────────────────────────────
  const getSegmentCount = (statsKey: keyof SubscriberStats): number => {
    if (!stats) return 0;
    return stats[statsKey] || 0;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

      {/* ── Header ─────────────────────────────── */}
      <div className="px-4 py-3 bg-gradient-to-br from-white to-gray-50
                      border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#029bba]" />
            <h3 className="text-sm font-black text-[#004063]">
              Subscribers
            </h3>
          </div>
          <button
            type="button"
            onClick={() => fetchStats(true)}
            disabled={refreshing || loading}
            className="text-xs font-semibold text-gray-500 hover:text-[#029bba]
                       flex items-center gap-1 transition-colors disabled:opacity-50"
            title="Refresh counts"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Total Counter ───────────────────────── */}
      <div className="p-4 bg-gradient-to-br from-[#029bba]/5 to-[#004063]/5
                      border-b border-gray-100">
        <div className="text-center">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-[#029bba]" />
            </div>
          ) : error ? (
            <div className="py-4">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-xs text-red-600 mb-2">{error}</p>
              <button
                type="button"
                onClick={() => fetchStats()}
                className="text-xs font-semibold text-[#029bba] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="text-4xl font-black text-[#029bba] transition-all duration-300">
                {totalRecipients.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                active {totalRecipients === 1 ? 'subscriber' : 'subscribers'}
              </p>
              {totalRecipients === 0 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center
                              justify-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  No active subscribers yet
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Selectable Segments ─────────────────── */}
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-black text-gray-600 uppercase mb-3 tracking-wider">
          Send To
        </h4>
        <div className="space-y-2">
          {SEGMENTS.map((segment) => {
            const isSelected = selectedSegments.includes(segment.id);
            const count = getSegmentCount(segment.statsKey);

            return (
              <button
                key={segment.id}
                type="button"
                onClick={() => handleSegmentToggle(segment.id)}
                disabled={loading}
                className={`
                  w-full flex items-center gap-3 p-3 rounded-xl border-2
                  transition-all text-left
                  ${isSelected
                    ? 'border-[#029bba] bg-[#029bba]/5 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {/* Checkbox */}
                <div className={`
                  w-5 h-5 rounded-md border-2 flex items-center justify-center
                  flex-shrink-0 transition-all
                  ${isSelected
                    ? 'border-[#029bba] bg-[#029bba]'
                    : 'border-gray-300 bg-white'
                  }
                `}>
                  {isSelected && (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  )}
                </div>

                {/* Icon */}
                <div className={`
                  w-9 h-9 rounded-xl flex items-center justify-center
                  flex-shrink-0 ${segment.bg} ${segment.color}
                `}>
                  {segment.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">
                    {segment.label}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {loading ? 'Loading...' : segment.description}
                  </p>
                </div>

                {/* Count Badge */}
                <div className={`
                  px-2.5 py-1 rounded-lg text-xs font-black flex-shrink-0
                  ${isSelected
                    ? 'bg-[#029bba] text-white'
                    : 'bg-gray-100 text-gray-600'
                  }
                `}>
                  {loading ? '…' : count.toLocaleString()}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Info-only Segments (awareness, not selectable) ─ */}
      <div className="px-4 py-3">
        <h4 className="text-xs font-black text-gray-400 uppercase mb-2 tracking-wider">
          Excluded (auto)
        </h4>
        <div className="space-y-1.5">
          {INFO_SEGMENTS.map((seg) => {
            const count = getSegmentCount(seg.statsKey);
            return (
              <div
                key={seg.label}
                className="flex items-center justify-between py-1"
                title={seg.tooltip}
              >
                <div className={`flex items-center gap-1.5 ${seg.color}`}>
                  {seg.icon}
                  <span className="text-xs text-gray-500">{seg.label}</span>
                </div>
                <span className="text-xs font-bold text-gray-400">
                  {loading ? '…' : count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer Note ─────────────────────────── */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-700">
            Only <strong>active subscribers</strong> receive campaigns.
            Unsubscribed, bounced, and pending emails are automatically excluded.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecipientPanel;
// ========== END OF FILE ==========