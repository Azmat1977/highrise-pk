/**
 * components/project-detail/AIRiskSummarySection.tsx
 *
 * Highrise.pk — AI Risk Summary Section (Wave 3)
 *
 * WHAT IT SHOWS:
 *   → Risk level badge (Low/Medium/High) with color
 *   → Confidence percentage
 *   → Data points analyzed
 *   → 3 paragraphs:
 *       1. Overview (what this project is)
 *       2. Risk Assessment (trust signals + concerns)
 *       3. Recommendation (who this is best for)
 *   → Green flags (positives)
 *   → Red flags (warnings)
 *   → Disclaimer footer
 *
 * PLACEMENT: After PropertyPassport, before Overview Cards
 *
 * SECURITY:
 *   → Read-only computed data
 *   → No user data processed
 *   → No external API calls
 *   → aria-labels on all elements
 *
 * SEO:
 *   → Section id="ai-risk" (scroll spy can include it)
 *   → Unique per-project content (no duplicate content risk)
 *   → Structured text improves content depth for SEO
 */

'use client';

import React, { useState } from 'react';
import {
  Shield,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

import type { AIRiskSummary } from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface AIRiskSummarySectionProps {
  aiRiskSummary: AIRiskSummary;
  projectName:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE METER
// ─────────────────────────────────────────────────────────────────────────────

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const color = confidence >= 80
    ? 'bg-emerald-500'
    : confidence >= 60
    ? 'bg-[#029bba]'
    : 'bg-amber-500';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${confidence}%` }}
          role="progressbar"
          aria-valuenow={confidence}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Analysis confidence: ${confidence}%`}
        />
      </div>
      <span className="text-xs font-black text-gray-700 flex-shrink-0">
        {confidence}%
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AIRiskSummarySection({
  aiRiskSummary,
  projectName,
}: AIRiskSummarySectionProps) {
  const [showFlags, setShowFlags] = useState(false);

  const hasPositives = aiRiskSummary.positives.length > 0;
  const hasWarnings  = aiRiskSummary.warnings.length > 0;
  const hasAnyFlags  = hasPositives || hasWarnings;

  return (
    <section
      id="ai-risk"
      className="bg-white rounded-2xl border border-gray-200
                 shadow-sm overflow-hidden"
      aria-label="AI Risk Analysis"
    >
      {/* ── Header ── */}
      <div className={`px-6 py-4 border-b border-gray-100
                       flex items-center justify-between
                       ${aiRiskSummary.riskBg}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/60
                          flex items-center justify-center">
            <Shield className={`w-5 h-5 ${aiRiskSummary.riskColor}`} />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900">
              AI Risk Analysis
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              {aiRiskSummary.dataPoints} data points •{' '}
              Rule-based analysis, not financial advice
            </p>
          </div>
        </div>

        {/* Risk level badge */}
        <div className={`flex-shrink-0 px-4 py-2 rounded-xl border
                         font-black text-sm ${aiRiskSummary.riskBg}
                         ${aiRiskSummary.riskColor}
                         ${aiRiskSummary.riskBorder}`}>
          {aiRiskSummary.riskLabel}
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Confidence meter ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 uppercase font-black
                          tracking-wider">
              Analysis Confidence
            </p>
            <p className="text-[10px] text-gray-400 font-medium">
              Based on verified platform data
            </p>
          </div>
          <ConfidenceMeter confidence={aiRiskSummary.confidence} />
        </div>

        {/* ── Risk level explanation ── */}
        <div className={`flex items-center gap-4 p-4 rounded-xl border
                         ${aiRiskSummary.riskBg} ${aiRiskSummary.riskBorder}`}>
          <div className="flex-shrink-0">
            {aiRiskSummary.riskLevel === 'low' && (
              <TrendingUp className={`w-8 h-8 ${aiRiskSummary.riskColor}`} />
            )}
            {aiRiskSummary.riskLevel === 'medium' && (
              <Minus className={`w-8 h-8 ${aiRiskSummary.riskColor}`} />
            )}
            {aiRiskSummary.riskLevel === 'high' && (
              <TrendingDown className={`w-8 h-8 ${aiRiskSummary.riskColor}`} />
            )}
          </div>
          <div>
            <p className={`text-base font-black ${aiRiskSummary.riskColor}`}>
              {aiRiskSummary.riskLabel}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {aiRiskSummary.riskLevel === 'low'
                ? 'Strong trust signals detected. Suitable for buyers and investors.'
                : aiRiskSummary.riskLevel === 'medium'
                ? 'Some documentation gaps detected. Independent verification recommended.'
                : 'Significant gaps detected. Thorough due diligence required.'}
            </p>
          </div>
        </div>

        {/* ── 3 Paragraphs ── */}
        <div className="space-y-4">

          {/* Paragraph 1: Overview */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-black
                          tracking-wider mb-2 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Project Overview
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {aiRiskSummary.overview}
            </p>
          </div>

          {/* Paragraph 2: Risk Assessment */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-black
                          tracking-wider mb-2 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Risk Assessment
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {aiRiskSummary.riskAssessment}
            </p>
          </div>

          {/* Paragraph 3: Recommendation */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase font-black
                          tracking-wider mb-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Recommendation
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {aiRiskSummary.recommendation}
            </p>
          </div>
        </div>

        {/* ── Green flags + Red flags (expandable) ── */}
        {hasAnyFlags && (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowFlags(v => !v)}
              aria-expanded={showFlags}
              aria-label="Toggle risk flags"
              className="w-full px-4 py-3 flex items-center gap-2
                         hover:bg-gray-50 transition-colors text-left"
            >
              <Shield className="w-4 h-4 text-[#029bba] flex-shrink-0" />
              <span className="text-sm font-bold text-gray-700 flex-1">
                Key Risk Signals for {projectName}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                {hasPositives && (
                  <span className="text-[10px] font-bold text-emerald-600
                                   bg-emerald-50 px-2 py-0.5 rounded-full">
                    {aiRiskSummary.positives.length} ✅
                  </span>
                )}
                {hasWarnings && (
                  <span className="text-[10px] font-bold text-amber-600
                                   bg-amber-50 px-2 py-0.5 rounded-full">
                    {aiRiskSummary.warnings.length} ⚠️
                  </span>
                )}
                {showFlags
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {showFlags && (
              <div className="border-t border-gray-100 p-4 space-y-4
                              bg-gray-50/50">

                {/* Green flags */}
                {hasPositives && (
                  <div>
                    <p className="text-[10px] text-emerald-600 uppercase
                                  font-black tracking-wider mb-2">
                      ✅ Positive Signals
                    </p>
                    <ul className="space-y-2">
                      {aiRiskSummary.positives.map((p, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs
                                     text-gray-700"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500
                                                   flex-shrink-0 mt-0.5" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Red flags */}
                {hasWarnings && (
                  <div>
                    <p className="text-[10px] text-amber-600 uppercase
                                  font-black tracking-wider mb-2">
                      ⚠️ Areas of Concern
                    </p>
                    <ul className="space-y-2">
                      {aiRiskSummary.warnings.map((w, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs
                                     text-gray-700"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500
                                                    flex-shrink-0 mt-0.5" />
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Disclaimer ── */}
        <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
          <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-400 leading-relaxed">
            This analysis is generated automatically from verified platform
            data using rule-based logic. It does not constitute financial,
            legal, or investment advice. Always conduct independent due
            diligence before any property transaction.
            Last updated:{' '}
            {new Date(aiRiskSummary.lastUpdated).toLocaleDateString(
              'en-PK',
              { year: 'numeric', month: 'short', day: 'numeric' }
            )}.
          </p>
        </div>

      </div>
    </section>
  );
}