/**
 * components/project-detail/HighriseTrustIndex.tsx
 *
 * Highrise.pk — Highrise Trust Index (Full 100-Point Breakdown)
 *
 * WHAT IT SHOWS:
 *   → Overall score 0-100 with animated bar
 *   → Grade badge (A+/A/B+/B/C/D)
 *   → 7 sub-scores with individual bars
 *   → Strengths (top positives)
 *   → Weaknesses (gaps to improve)
 *   → Platform average comparison
 *   → "Why this score" expandable explanation
 *   → Data points count (transparency)
 *   → AI Risk Summary inline badge
 *
 * SECURITY:
 *   → No sensitive data rendered
 *   → All data from trustIndexCalculator (pure functions)
 *   → No external API calls
 *   → aria-labels on all interactive elements
 *
 * SEO:
 *   → Section has id="trust" for scroll spy
 *   → h2 heading for semantic structure
 *   → Score in content for rich snippet potential
 *   → No noindex impact
 */

'use client';

import React, { useState } from 'react';
import {
  Shield,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  Info,
  Star,
} from 'lucide-react';

import type {
  TrustIndexBreakdown,
  TrustSubScore,
  AIRiskSummary,
} from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface HighriseTrustIndexProps {
  trustIndex:    TrustIndexBreakdown;
  aiRiskSummary: AIRiskSummary;
  projectName:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-SCORE ROW
// ─────────────────────────────────────────────────────────────────────────────

function SubScoreRow({
  ss,
  isExpanded,
  onToggle,
}: {
  ss:         TrustSubScore;
  isExpanded: boolean;
  onToggle:   () => void;
}) {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={`${ss.label}: ${ss.score} of ${ss.maxScore} points`}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50
                   transition-colors text-left"
      >
        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-gray-700 truncate">
              {ss.label}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <span className={`text-xs font-black ${ss.color}`}>
                {ss.score}/{ss.maxScore}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                ss.percentage >= 80
                  ? 'bg-emerald-50 text-emerald-700'
                  : ss.percentage >= 60
                  ? 'bg-[#029bba]/10 text-[#029bba]'
                  : ss.percentage >= 40
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {ss.percentage}%
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                ss.percentage >= 80
                  ? 'bg-emerald-500'
                  : ss.percentage >= 60
                  ? 'bg-[#029bba]'
                  : ss.percentage >= 40
                  ? 'bg-amber-500'
                  : 'bg-red-400'
              }`}
              style={{ width: `${ss.percentage}%` }}
              role="progressbar"
              aria-valuenow={ss.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Expand icon */}
        <div className="flex-shrink-0 text-gray-400">
          {isExpanded
            ? <ChevronUp className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expanded: reasons + missing */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-50 bg-gray-50/50">
          {ss.reasons.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] text-gray-400 uppercase font-bold
                            tracking-wider mb-2">
                What earned this score
              </p>
              <ul className="space-y-1.5">
                {ss.reasons.map((reason, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-gray-600"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500
                                             flex-shrink-0 mt-0.5" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(ss.missing ?? []).length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] text-gray-400 uppercase font-bold
                            tracking-wider mb-2">
                What would improve this score
              </p>
              <ul className="space-y-1.5">
                {(ss.missing ?? []).map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-gray-500"
                  >
                    <AlertCircle className="w-3 h-3 text-amber-500
                                            flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function HighriseTrustIndex({
  trustIndex,
  aiRiskSummary,
  projectName,
}: HighriseTrustIndexProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const toggleSubScore = (key: string) => {
    setExpandedKey(prev => prev === key ? null : key);
  };

  const vsAvg        = trustIndex.vsAverage;
  const isAboveAvg   = vsAvg > 0;
  const isBelowAvg   = vsAvg < 0;

  return (
    <section
      id="trust"
      className="bg-white rounded-2xl border border-gray-200
                 shadow-sm overflow-hidden"
      aria-label="Highrise Trust Index"
    >
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-gray-100
                      bg-gradient-to-r from-[#004063]/5 to-[#029bba]/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#029bba]/10
                            flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#029bba]" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900">
                Highrise Trust Index
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {trustIndex.dataPoints} verified data points analyzed
              </p>
            </div>
          </div>

          {/* Grade badge */}
          <div className={`flex flex-col items-center justify-center
                           w-14 h-14 rounded-2xl border-2 flex-shrink-0
                           ${trustIndex.gradeBg} ${trustIndex.gradeColor}
                           border-current/20`}>
            <span className="text-2xl font-black leading-none">
              {trustIndex.grade}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider
                             opacity-70">
              Grade
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Overall Score ── */}
        <div>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold
                            tracking-wider mb-1">
                Overall Trust Score
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-gray-900">
                  {trustIndex.overall}
                </span>
                <span className="text-xl text-gray-400 font-bold">/100</span>
              </div>
            </div>

            {/* vs Platform average */}
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase font-bold
                            tracking-wider mb-1">
                vs Platform Avg
              </p>
              <div className={`flex items-center gap-1 justify-end font-black
                               text-sm ${
                isAboveAvg
                  ? 'text-emerald-600'
                  : isBelowAvg
                  ? 'text-red-500'
                  : 'text-gray-500'
              }`}>
                {isAboveAvg && (
                  <TrendingUp className="w-4 h-4" />
                )}
                {isBelowAvg && (
                  <TrendingDown className="w-4 h-4" />
                )}
                {!isAboveAvg && !isBelowAvg && (
                  <Minus className="w-4 h-4" />
                )}
                {isAboveAvg ? `+${vsAvg}` : vsAvg} pts
              </div>
              <p className="text-[10px] text-gray-400">
                Avg: {trustIndex.platformAvg}/100
              </p>
            </div>
          </div>

          {/* Main progress bar */}
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-1000
                          bg-gradient-to-r ${
                trustIndex.overall >= 80
                  ? 'from-emerald-400 to-emerald-600'
                  : trustIndex.overall >= 60
                  ? 'from-[#029bba] to-[#017a94]'
                  : trustIndex.overall >= 40
                  ? 'from-amber-400 to-amber-600'
                  : 'from-red-400 to-red-600'
              }`}
              style={{ width: `${trustIndex.overall}%` }}
              role="progressbar"
              aria-valuenow={trustIndex.overall}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Trust score: ${trustIndex.overall} out of 100`}
            />
          </div>

          <div className="flex items-center justify-between text-[10px]
                          text-gray-400 font-medium">
            <span>0 — Needs Work</span>
            <span>{trustIndex.gradeLabel}</span>
            <span>100 — Exceptional</span>
          </div>
        </div>

        {/* ── AI Risk Badge ── */}
        <div className={`flex items-center justify-between px-4 py-3
                         rounded-xl border ${aiRiskSummary.riskBg}
                         ${aiRiskSummary.riskBorder}`}>
          <div className="flex items-center gap-2">
            <Star className={`w-4 h-4 ${aiRiskSummary.riskColor}`} />
            <span className="text-sm font-bold text-gray-700">
              Investment Risk
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-black ${aiRiskSummary.riskColor}`}>
              {aiRiskSummary.riskLabel}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {aiRiskSummary.confidence}% confidence
            </span>
          </div>
        </div>

        {/* ── Strengths + Weaknesses ── */}
        {(trustIndex.strengths.length > 0 ||
          trustIndex.weaknesses.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Strengths */}
            {trustIndex.strengths.length > 0 && (
              <div className="bg-emerald-50 rounded-xl p-4 border
                              border-emerald-100">
                <p className="text-[10px] text-emerald-600 uppercase
                               font-black tracking-wider mb-2">
                  ✅ Strengths
                </p>
                <ul className="space-y-1.5">
                  {trustIndex.strengths.slice(0, 3).map((s, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-emerald-800 font-medium
                                 leading-tight"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {trustIndex.weaknesses.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-4 border
                              border-amber-100">
                <p className="text-[10px] text-amber-600 uppercase
                               font-black tracking-wider mb-2">
                  ⚠️ Gaps
                </p>
                <ul className="space-y-1.5">
                  {trustIndex.weaknesses.slice(0, 3).map((w, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-amber-800 font-medium
                                 leading-tight"
                    >
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── 7 Sub-Scores ── */}
        <div>
          <p className="text-xs text-gray-400 uppercase font-black
                        tracking-wider mb-3">
            Score Breakdown — 7 Components
          </p>
          <div className="space-y-2">
            {trustIndex.subScores.map(ss => (
              <SubScoreRow
                key={ss.key}
                ss={ss}
                isExpanded={expandedKey === ss.key}
                onToggle={() => toggleSubScore(ss.key)}
              />
            ))}
          </div>
        </div>

        {/* ── Why This Score ── */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowExplanation(v => !v)}
            aria-expanded={showExplanation}
            aria-label="Toggle score explanation"
            className="w-full px-4 py-3 flex items-center gap-2
                       hover:bg-gray-50 transition-colors text-left"
          >
            <Info className="w-4 h-4 text-[#029bba] flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-700 flex-1">
              Why does {projectName} have this score?
            </span>
            {showExplanation
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {showExplanation && (
            <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50">
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                {trustIndex.explanation}
              </p>
            </div>
          )}
        </div>

        {/* ── AI Risk Overview ── */}
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-[#029bba]/10
                            flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-[#029bba]" />
            </div>
            <p className="text-xs font-black text-gray-700 uppercase
                          tracking-wider">
              AI Risk Analysis
            </p>
            <span className="text-[9px] text-gray-400 font-medium ml-auto">
              {aiRiskSummary.dataPoints} data points
            </span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mb-2">
            {aiRiskSummary.riskAssessment}
          </p>
          <p className="text-[10px] text-gray-400 italic leading-relaxed">
            {aiRiskSummary.recommendation}
          </p>
        </div>

        {/* ── Footer disclaimer ── */}
        <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
          <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Trust Index is calculated from verified platform data.
            Updated: {new Date(trustIndex.lastUpdated).toLocaleDateString(
              'en-PK',
              { year: 'numeric', month: 'short', day: 'numeric' }
            )}.
            This score does not constitute financial or legal advice.
          </p>
        </div>

      </div>
    </section>
  );
}