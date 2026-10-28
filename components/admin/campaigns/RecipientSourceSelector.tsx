// ========== FILE: components/admin/campaigns/RecipientSourceSelector.tsx ==========
// 📬 ENTERPRISE RECIPIENT SOURCE SELECTOR — HIGHRISE.PK
// Beautiful 3-option toggle: Subscribers / Leads / Both
// ═══════════════════════════════════════════════════════════════
// FEATURES:
//   ✅ 3 source options with icons and descriptions
//   ✅ Visual card-based selection (not dropdown)
//   ✅ Live count display per source
//   ✅ Merge tags toggle
//   ✅ Animated selection indicator
//   ✅ Mobile responsive
//   ✅ Pro tips per source
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useEffect, useState } from 'react';
import {
  Mail,
  Users,
  Combine,
  Check,
  Sparkles,
  Info,
  Loader2,
  Tag,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

export type RecipientSource = 'subscribers' | 'leads' | 'both';

interface SourceOption {
  id:          RecipientSource;
  label:       string;
  description: string;
  icon:        React.ReactNode;
  gradient:    string;
  iconBg:      string;
  proTip:      string;
}

interface RecipientSourceSelectorProps {
  source:            RecipientSource;
  onSourceChange:    (source: RecipientSource) => void;
  mergeTagsEnabled:  boolean;
  onMergeTagsChange: (enabled: boolean) => void;
}

interface SourceCounts {
  subscribers: number;
  leads:       number;
  both:        number;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 SOURCE OPTIONS
// ═══════════════════════════════════════════════════════════════

const SOURCE_OPTIONS: SourceOption[] = [
  {
    id:          'subscribers',
    label:       'Newsletter Only',
    description: 'Verified opt-in subscribers only',
    icon:        <Mail className="w-5 h-5" />,
    gradient:    'from-[#029bba] to-[#004063]',
    iconBg:      'bg-[#029bba]/10 text-[#029bba]',
    proTip:      'Highest deliverability — verified consent',
  },
  {
    id:          'leads',
    label:       'Leads Only',
    description: 'CRM contacts with advanced filters',
    icon:        <Users className="w-5 h-5" />,
    gradient:    'from-purple-500 to-indigo-600',
    iconBg:      'bg-purple-100 text-purple-600',
    proTip:      'Apply filters for laser-targeted outreach',
  },
  {
    id:          'both',
    label:       'Subscribers + Leads',
    description: 'Combined list — duplicates auto-removed',
    icon:        <Combine className="w-5 h-5" />,
    gradient:    'from-emerald-500 to-teal-600',
    iconBg:      'bg-emerald-100 text-emerald-600',
    proTip:      'Maximum reach — deduplication ensures no double sends',
  },
];

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const RecipientSourceSelector: React.FC<RecipientSourceSelectorProps> = ({
  source,
  onSourceChange,
  mergeTagsEnabled,
  onMergeTagsChange,
}) => {
  const [counts,  setCounts]  = useState<SourceCounts | null>(null);
  const [loading, setLoading] = useState(true);

  // ─────────────────────────────────────────────
  // Fetch counts for all sources
  // ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchCounts = async () => {
      setLoading(true);
      try {
        // Fetch subscriber count
        const subRes = await fetch(
          '/api/newsletter/subscribers?status=active',
          { credentials: 'include' }
        );
        const subData = await subRes.json();
        const subCount = subData.success ? (subData.stats?.active || 0) : 0;

        // Fetch lead count (no filters)
        const leadRes = await fetch(
          '/api/newsletter/campaigns/recipients-preview',
          {
            method:      'POST',
            credentials: 'include',
            headers:     { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source:    'leads',
              leadFilters: {},
              countOnly: true,
            }),
          }
        );
        const leadData = await leadRes.json();
        const leadCount = leadData.success ? (leadData.counts?.leads || 0) : 0;

        if (!cancelled) {
          setCounts({
            subscribers: subCount,
            leads:       leadCount,
            both:        subCount + leadCount,
          });
        }
      } catch {
        // Silent fail — counts not critical
        if (!cancelled) setCounts({ subscribers: 0, leads: 0, both: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCounts();
    return () => { cancelled = true; };
  }, []);

  // ─────────────────────────────────────────────
  // Get count for a source
  // ─────────────────────────────────────────────
  const getCount = (sourceId: RecipientSource): number | null => {
    if (!counts || loading) return null;
    return counts[sourceId];
  };

  const activeOption = SOURCE_OPTIONS.find((o) => o.id === source)!;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

      {/* ═══════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════ */}
      <div className="px-4 py-3 bg-gradient-to-br from-white to-gray-50
                      border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#029bba]" />
          <h3 className="text-sm font-black text-[#004063]">
            Who Receives This Campaign
          </h3>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 ml-6">
          Choose your target audience
        </p>
      </div>

      {/* ═══════════════════════════════════════════
          SOURCE OPTIONS (3 Cards)
          ═══════════════════════════════════════════ */}
      <div className="p-4 space-y-3">
        {SOURCE_OPTIONS.map((option) => {
          const isSelected = source === option.id;
          const count      = getCount(option.id);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSourceChange(option.id)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-2xl 
                border-2 transition-all text-left
                ${isSelected
                  ? 'border-[#029bba] bg-[#029bba]/5 shadow-md shadow-[#029bba]/10'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
              `}
            >
              {/* Selection Indicator */}
              <div className={`
                w-5 h-5 rounded-full border-2 flex items-center 
                justify-center flex-shrink-0 transition-all
                ${isSelected
                  ? 'border-[#029bba] bg-[#029bba]'
                  : 'border-gray-300 bg-white'
                }
              `}>
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>

              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-xl flex items-center justify-center 
                flex-shrink-0 ${option.iconBg}
              `}>
                {option.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-gray-900 truncate">
                    {option.label}
                  </p>
                  {/* Count Badge */}
                  <div className={`
                    flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-black
                    ${isSelected
                      ? 'bg-[#029bba] text-white'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {loading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : count !== null ? (
                      count.toLocaleString()
                    ) : (
                      '...'
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {option.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════
          PRO TIP FOR SELECTED SOURCE
          ═══════════════════════════════════════════ */}
      <div className="mx-4 mb-4 p-3 bg-[#029bba]/5 border 
                      border-[#029bba]/15 rounded-xl">
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-700">
            <strong className="text-[#004063]">
              {activeOption.label}:
            </strong>{' '}
            {activeOption.proTip}
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          MERGE TAGS TOGGLE
          ═══════════════════════════════════════════ */}
      <div className="px-4 pb-4 border-t border-gray-100 pt-4">
        <label className="flex items-start gap-3 cursor-pointer">

          {/* Toggle Switch */}
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={mergeTagsEnabled}
              onChange={(e) => onMergeTagsChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-200 rounded-full 
                            peer-checked:bg-[#029bba] transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white 
                            rounded-full shadow transition-transform 
                            peer-checked:translate-x-5" />
          </div>

          {/* Label */}
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#029bba]" />
              <p className="text-sm font-bold text-gray-900">
                Personalization Tags
              </p>
              <span className="px-1.5 py-0.5 bg-[#029bba]/10 text-[#029bba] 
                               text-[10px] font-black rounded uppercase tracking-wider">
                Recommended
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {mergeTagsEnabled
                ? 'Active — {{name}}, {{city}}, {{budget}} will be replaced per recipient'
                : 'Disabled — all recipients get identical email content'}
            </p>
          </div>
        </label>

        {/* Example when enabled */}
        {mergeTagsEnabled && (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#029bba]" />
              <p className="text-xs font-black text-gray-600 uppercase tracking-wider">
                Personalization Preview
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <code className="text-[#029bba] font-mono bg-[#029bba]/10 
                                 px-1.5 py-0.5 rounded">
                  {'{{name}}'}
                </code>
                <span className="text-gray-400">→</span>
                <span className="text-gray-700 font-semibold">
                  "Ahmed Ali Khan"
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <code className="text-[#029bba] font-mono bg-[#029bba]/10 
                                 px-1.5 py-0.5 rounded">
                  {'{{city}}'}
                </code>
                <span className="text-gray-400">→</span>
                <span className="text-gray-700 font-semibold">
                  "Karachi"
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <code className="text-[#029bba] font-mono bg-[#029bba]/10 
                                 px-1.5 py-0.5 rounded">
                  {'{{budget}}'}
                </code>
                <span className="text-gray-400">→</span>
                <span className="text-gray-700 font-semibold">
                  "PKR 2 Crore - 5 Crore"
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipientSourceSelector;
// ========== END OF FILE ==========