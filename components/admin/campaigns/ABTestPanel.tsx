// components/admin/campaigns/ABTestPanel.tsx
// A/B Subject Line Testing Panel for MissionControl
// Lets admin configure variant B subject + split %

'use client';

import React, { useState } from 'react';
import {
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Info,
  Trophy,
  Percent,
  Type,
  Eye,
  AlertCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────

export interface ABTestConfig {
  enabled:           boolean;
  variantBSubject:   string;
  variantBPreview:   string;
  splitPercent:      number;
  winnerMetric:      'open_rate' | 'click_rate';
  testDurationHours: number;
}

interface ABTestPanelProps {
  subjectA:  string;        // The main subject from campaign form
  config:    ABTestConfig;
  onChange:  (config: ABTestConfig) => void;
}

export function getDefaultABConfig(): ABTestConfig {
  return {
    enabled:           false,
    variantBSubject:   '',
    variantBPreview:   '',
    splitPercent:      50,
    winnerMetric:      'open_rate',
    testDurationHours: 24,
  };
}

// ─── Component ────────────────────────────────────────────────

const ABTestPanel: React.FC<ABTestPanelProps> = ({
  subjectA,
  config,
  onChange,
}) => {
  const [expanded, setExpanded] = useState(false);

  const update = (partial: Partial<ABTestConfig>) => {
    onChange({ ...config, ...partial });
  };

  const toggle = () => {
    if (!config.enabled) {
      // Enable + expand
      update({ enabled: true });
      setExpanded(true);
    } else {
      // Disable + reset
      onChange(getDefaultABConfig());
      setExpanded(false);
    }
  };

  const isReady = config.enabled && config.variantBSubject.trim().length >= 5;
  const isSameAsA = config.variantBSubject.trim() === subjectA.trim();

  return (
    <div className={`
      rounded-2xl border transition-all
      ${config.enabled
        ? 'border-purple-300 bg-purple-50/50'
        : 'border-gray-200 bg-white'
      }
    `}>

      {/* ── Header / Toggle ──────────────────────────────── */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => config.enabled && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`
            w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
            ${config.enabled ? 'bg-purple-600' : 'bg-gray-100'}
          `}>
            <FlaskConical className={`w-4 h-4 ${config.enabled ? 'text-white' : 'text-gray-500'}`} />
          </div>
          <div>
            <p className="text-sm font-black text-[#004063] flex items-center gap-2">
              A/B Subject Test
              {config.enabled && isReady && (
                <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold">
                  ACTIVE
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {config.enabled
                ? `${config.splitPercent}% → A · ${100 - config.splitPercent}% → B`
                : 'Test two subject lines to find the winner'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle switch */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggle(); }}
            className={`
              relative w-11 h-6 rounded-full transition-colors flex-shrink-0
              ${config.enabled ? 'bg-purple-600' : 'bg-gray-300'}
            `}
            title={config.enabled ? 'Disable A/B test' : 'Enable A/B test'}
          >
            <div className={`
              absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
              ${config.enabled ? 'left-0.5 translate-x-5' : 'left-0.5'}
            `} />
          </button>

          {/* Expand/collapse chevron (only when enabled) */}
          {config.enabled && (
            <div className="text-gray-400">
              {expanded
                ? <ChevronUp className="w-4 h-4" />
                : <ChevronDown className="w-4 h-4" />
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Body (expanded when enabled) ─────────────────── */}
      {config.enabled && expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-purple-200 pt-4">

          {/* Variant A (read-only display) */}
          <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider 
                               flex items-center gap-1.5 mb-2">
              <span className="w-5 h-5 bg-[#029bba] text-white rounded-md text-[10px] 
                               font-black flex items-center justify-center">
                A
              </span>
              Variant A — Current Subject
            </label>
            <div className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 
                            text-sm text-gray-700 font-semibold">
              {subjectA || (
                <span className="text-gray-400 font-normal italic">
                  Enter subject line above first
                </span>
              )}
            </div>
          </div>

          {/* Variant B input */}
          <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider 
                               flex items-center gap-1.5 mb-2">
              <span className="w-5 h-5 bg-purple-600 text-white rounded-md text-[10px] 
                               font-black flex items-center justify-center">
                B
              </span>
              Variant B — Alternative Subject
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={config.variantBSubject}
              onChange={(e) => update({ variantBSubject: e.target.value.slice(0, 200) })}
              placeholder="Try a different angle, emoji, or question..."
              maxLength={200}
              className={`
                w-full px-3 py-2.5 rounded-xl border outline-none text-sm
                focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400
                ${isSameAsA && config.variantBSubject
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-gray-300'
                }
              `}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">
                {config.variantBSubject.length}/200
              </span>
              {isSameAsA && config.variantBSubject && (
                <span className="text-xs text-amber-600 flex items-center gap-1 font-semibold">
                  <AlertCircle className="w-3 h-3" />
                  Same as Variant A — they must differ
                </span>
              )}
            </div>
          </div>

          {/* Variant B preview text (optional) */}
          <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider 
                               flex items-center gap-1.5 mb-2">
              <Eye className="w-3 h-3 text-gray-400" />
              Variant B Preview Text
              <span className="text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={config.variantBPreview}
              onChange={(e) => update({ variantBPreview: e.target.value.slice(0, 300) })}
              placeholder="Different inbox snippet for variant B..."
              maxLength={300}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 outline-none 
                         text-sm focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400"
            />
          </div>

          {/* Split % slider */}
          <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider 
                               flex items-center gap-1.5 mb-3">
              <Percent className="w-3 h-3 text-gray-400" />
              Recipient Split
            </label>
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-[#029bba] w-12 text-center bg-[#029bba]/10 
                               px-2 py-1 rounded-lg flex-shrink-0">
                A {config.splitPercent}%
              </span>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={config.splitPercent}
                onChange={(e) => update({ splitPercent: parseInt(e.target.value, 10) })}
                className="flex-1 accent-purple-600"
              />
              <span className="text-sm font-black text-purple-600 w-12 text-center bg-purple-100 
                               px-2 py-1 rounded-lg flex-shrink-0">
                B {100 - config.splitPercent}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1.5 text-center">
              First {config.splitPercent}% of recipients get Variant A · 
              Remaining {100 - config.splitPercent}% get Variant B
            </p>
          </div>

          {/* Winner metric */}
          <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider 
                               flex items-center gap-1.5 mb-2">
              <Trophy className="w-3 h-3 text-gray-400" />
              Pick Winner By
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'open_rate',  label: 'Open Rate',  desc: 'Most opens wins' },
                { value: 'click_rate', label: 'Click Rate', desc: 'Most clicks wins' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ winnerMetric: opt.value as 'open_rate' | 'click_rate' })}
                  className={`
                    p-3 rounded-xl border text-left transition-all
                    ${config.winnerMetric === opt.value
                      ? 'border-purple-400 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }
                  `}
                >
                  <p className="text-xs font-black">{opt.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Test duration */}
          <div>
            <label className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2 block">
              Test Duration (hours)
            </label>
            <select
              value={config.testDurationHours}
              onChange={(e) => update({ testDurationHours: parseInt(e.target.value, 10) })}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 outline-none 
                         text-sm focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 
                         bg-white"
            >
              {[4, 8, 12, 24, 48, 72].map((h) => (
                <option key={h} value={h}>
                  {h} hour{h !== 1 ? 's' : ''} 
                  {h === 24 ? ' (recommended)' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              After this time, go to Analytics to pick the winner.
            </p>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700">
              <p className="font-bold mb-0.5">How it works:</p>
              <p>Both variants send the same email content. Only the subject line differs. 
              After {config.testDurationHours}h, check Analytics to see which performed better 
              and pick a winner.</p>
            </div>
          </div>

          {/* Readiness indicator */}
          {!isReady && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-semibold">
                Enter Variant B subject line (min. 5 characters) to enable A/B testing.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ABTestPanel;