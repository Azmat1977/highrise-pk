// ========== FILE: components/admin/campaigns/SubjectAnalyzer.tsx ==========
// 📊 ENTERPRISE SUBJECT LINE ANALYZER — HIGHRISE.PK
// Real-time quality scoring for email subject lines
// ═══════════════════════════════════════════════════════════════
// FEATURES:
//   ✅ Real-time score (0-100) with color coding
//   ✅ Length analysis (optimal 30-60 chars)
//   ✅ Word count analysis (optimal 6-10 words)
//   ✅ Emoji detection (+points for engagement)
//   ✅ Personalization detection ({{name}}, "you", "your")
//   ✅ Urgency/scarcity word detection
//   ✅ Number/statistic detection
//   ✅ Power word detection (real estate optimized)
//   ✅ Question mark detection
//   ✅ ALL CAPS warning (spam signal)
//   ✅ Spam word detection with warnings
//   ✅ Actionable suggestions
//   ✅ Detailed breakdown with visual scoring
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useMemo } from 'react';
import {
  Sparkles,
  Check,
  X,
  AlertTriangle,
  Target,
  TrendingUp,
  Info,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

interface SubjectAnalyzerProps {
  subject: string;
}

interface CheckResult {
  id:      string;
  label:   string;
  passed:  boolean;
  points:  number;
  message: string;
  weight:  'good' | 'warning' | 'bad';
}

// ═══════════════════════════════════════════════════════════════
// 📚 KNOWLEDGE BASE (Real Estate Optimized)
// ═══════════════════════════════════════════════════════════════

// Words that create urgency/scarcity — proven to boost open rates
const URGENCY_WORDS = [
  'limited', 'exclusive', 'today', 'now', 'hurry', 'last', 'ending',
  'expires', 'deadline', 'final', 'only', 'don\'t miss', 'closing',
  'urgent', 'immediate', 'quickly', 'fast', 'instant',
];

// Power words that engage real estate buyers
const POWER_WORDS = [
  'new', 'exclusive', 'discover', 'introducing', 'launch', 'premium',
  'luxury', 'best', 'top', 'featured', 'trending', 'hot', 'popular',
  'proven', 'guaranteed', 'verified', 'trusted', 'expert', 'insider',
  'secret', 'revealed', 'ultimate', 'complete', 'essential',
  'affordable', 'invest', 'opportunity', 'deal', 'save',
];

// Personalization indicators
const PERSONALIZATION_WORDS = [
  'you', 'your', 'yours', '{{name}}', '{{first_name}}', '{{city}}',
];

// SPAM TRIGGER WORDS — from Litmus/Mailchimp spam research
const SPAM_WORDS = [
  'free', 'click here', 'click below', 'buy now', 'act now',
  'call now', 'order now', 'unlimited', 'winner', 'won',
  'congratulations', 'cash', 'money back', '100% free',
  'risk-free', 'no obligation', 'no cost', 'guaranteed',
  'earn $', 'make $', 'income', 'be your own boss',
  'work from home', 'as seen on', 'trial', 'limited time',
  'save up to', 'save big', 'discount', 'promo', 'deal',
  'apply now', 'urgent', 'important', 'confidential',
];

// Emoji detection regex — proper Unicode ranges
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu;

// Number detection (integers, decimals, percentages, currency)
const NUMBER_REGEX = /\d+/;

// Merge tag detection
const MERGE_TAG_REGEX = /\{\{[^}]+\}\}/;

// ═══════════════════════════════════════════════════════════════
// 🧮 SCORING ENGINE
// ═══════════════════════════════════════════════════════════════

function analyzeSubject(subject: string): {
  score:       number;
  checks:      CheckResult[];
  suggestions: string[];
  wordCount:   number;
  charCount:   number;
  emojiCount:  number;
  spamRisk:    'low' | 'medium' | 'high';
} {
  const trimmed = subject.trim();
  const lower   = trimmed.toLowerCase();
  const words   = trimmed ? trimmed.split(/\s+/) : [];
  const emojis  = trimmed.match(EMOJI_REGEX) || [];

  const checks:      CheckResult[] = [];
  const suggestions: string[]      = [];
  let score = 0;

  // ─────────────────────────────────────────────
  // 1. LENGTH CHECK (Weight: 20 points)
  // Optimal: 30-60 characters
  // ─────────────────────────────────────────────
  const len = trimmed.length;
  if (len === 0) {
    checks.push({
      id:      'length',
      label:   'Length',
      passed:  false,
      points:  0,
      message: 'Empty subject',
      weight:  'bad',
    });
    suggestions.push('Add a subject line — emails without subjects have <10% open rates');
  } else if (len < 30) {
    checks.push({
      id:      'length',
      label:   'Length',
      passed:  false,
      points:  10,
      message: `${len} chars — too short`,
      weight:  'warning',
    });
    score += 10;
    suggestions.push(`Add ${30 - len} more characters — optimal is 30-60`);
  } else if (len <= 60) {
    checks.push({
      id:      'length',
      label:   'Length',
      passed:  true,
      points:  20,
      message: `${len} chars — perfect`,
      weight:  'good',
    });
    score += 20;
  } else if (len <= 80) {
    checks.push({
      id:      'length',
      label:   'Length',
      passed:  false,
      points:  10,
      message: `${len} chars — will truncate on mobile`,
      weight:  'warning',
    });
    score += 10;
    suggestions.push('Shorten to under 60 chars — mobile devices truncate long subjects');
  } else {
    checks.push({
      id:      'length',
      label:   'Length',
      passed:  false,
      points:  0,
      message: `${len} chars — too long`,
      weight:  'bad',
    });
    suggestions.push('Cut to under 60 characters — long subjects hurt open rates');
  }

  // ─────────────────────────────────────────────
  // 2. WORD COUNT (Weight: 10 points)
  // Optimal: 6-10 words
  // ─────────────────────────────────────────────
  const wc = words.length;
  if (wc >= 6 && wc <= 10) {
    checks.push({
      id:      'words',
      label:   'Word Count',
      passed:  true,
      points:  10,
      message: `${wc} words — ideal`,
      weight:  'good',
    });
    score += 10;
  } else if (wc >= 3 && wc <= 15) {
    checks.push({
      id:      'words',
      label:   'Word Count',
      passed:  false,
      points:  5,
      message: `${wc} words — acceptable`,
      weight:  'warning',
    });
    score += 5;
  } else if (wc > 0) {
    checks.push({
      id:      'words',
      label:   'Word Count',
      passed:  false,
      points:  0,
      message: `${wc} words — ${wc < 3 ? 'too few' : 'too many'}`,
      weight:  'bad',
    });
  }

  // ─────────────────────────────────────────────
  // 3. EMOJI CHECK (Weight: 15 points)
  // Optimal: 1-2 emojis (boosts open rates by 56%)
  // ─────────────────────────────────────────────
  if (emojis.length === 0) {
    checks.push({
      id:      'emoji',
      label:   'Emoji',
      passed:  false,
      points:  0,
      message: 'No emoji',
      weight:  'warning',
    });
    suggestions.push('Add 1 relevant emoji — boosts open rates by up to 56% 📈');
  } else if (emojis.length <= 2) {
    checks.push({
      id:      'emoji',
      label:   'Emoji',
      passed:  true,
      points:  15,
      message: `${emojis.length} emoji — engaging`,
      weight:  'good',
    });
    score += 15;
  } else {
    checks.push({
      id:      'emoji',
      label:   'Emoji',
      passed:  false,
      points:  5,
      message: `${emojis.length} emojis — too many`,
      weight:  'warning',
    });
    score += 5;
    suggestions.push('Use max 2 emojis — too many looks spammy');
  }

  // ─────────────────────────────────────────────
  // 4. PERSONALIZATION (Weight: 15 points)
  // ─────────────────────────────────────────────
  const hasMergeTag       = MERGE_TAG_REGEX.test(trimmed);
  const hasPersonalWord   = PERSONALIZATION_WORDS.some((w) => lower.includes(w));
  if (hasMergeTag) {
    checks.push({
      id:      'personalization',
      label:   'Personalization',
      passed:  true,
      points:  15,
      message: 'Uses merge tag',
      weight:  'good',
    });
    score += 15;
  } else if (hasPersonalWord) {
    checks.push({
      id:      'personalization',
      label:   'Personalization',
      passed:  true,
      points:  10,
      message: 'Uses "you/your"',
      weight:  'good',
    });
    score += 10;
  } else {
    checks.push({
      id:      'personalization',
      label:   'Personalization',
      passed:  false,
      points:  0,
      message: 'Not personalized',
      weight:  'warning',
    });
    suggestions.push('Add "you", "your", or {{name}} — personalized subjects get 26% more opens');
  }

  // ─────────────────────────────────────────────
  // 5. URGENCY / SCARCITY (Weight: 10 points)
  // ─────────────────────────────────────────────
  const hasUrgency = URGENCY_WORDS.some((w) => lower.includes(w));
  if (hasUrgency) {
    checks.push({
      id:      'urgency',
      label:   'Urgency',
      passed:  true,
      points:  10,
      message: 'Creates urgency',
      weight:  'good',
    });
    score += 10;
  } else {
    checks.push({
      id:      'urgency',
      label:   'Urgency',
      passed:  false,
      points:  0,
      message: 'No urgency',
      weight:  'warning',
    });
  }

  // ─────────────────────────────────────────────
  // 6. NUMBERS / STATISTICS (Weight: 10 points)
  // ─────────────────────────────────────────────
  const hasNumber = NUMBER_REGEX.test(trimmed);
  if (hasNumber) {
    checks.push({
      id:      'numbers',
      label:   'Numbers',
      passed:  true,
      points:  10,
      message: 'Contains numbers',
      weight:  'good',
    });
    score += 10;
  } else {
    checks.push({
      id:      'numbers',
      label:   'Numbers',
      passed:  false,
      points:  0,
      message: 'No numbers',
      weight:  'warning',
    });
    suggestions.push('Add a number — "5 Properties" beats "New Properties"');
  }

  // ─────────────────────────────────────────────
  // 7. POWER WORDS (Weight: 10 points)
  // ─────────────────────────────────────────────
  const foundPowerWords = POWER_WORDS.filter((w) => lower.includes(w));
  if (foundPowerWords.length > 0) {
    checks.push({
      id:      'power',
      label:   'Power Words',
      passed:  true,
      points:  10,
      message: `${foundPowerWords.length} power word${foundPowerWords.length > 1 ? 's' : ''}`,
      weight:  'good',
    });
    score += 10;
  } else {
    checks.push({
      id:      'power',
      label:   'Power Words',
      passed:  false,
      points:  0,
      message: 'No power words',
      weight:  'warning',
    });
    suggestions.push('Add power words like "exclusive", "new", "premium"');
  }

  // ─────────────────────────────────────────────
  // 8. QUESTION MARK (Weight: 5 points)
  // ─────────────────────────────────────────────
  const hasQuestion = trimmed.includes('?');
  if (hasQuestion) {
    checks.push({
      id:      'question',
      label:   'Question',
      passed:  true,
      points:  5,
      message: 'Asks a question',
      weight:  'good',
    });
    score += 5;
  }

  // ─────────────────────────────────────────────
  // 9. ALL CAPS CHECK (Negative: -10 points)
  // ─────────────────────────────────────────────
  const alphaOnly = trimmed.replace(/[^a-zA-Z]/g, '');
  const capsCount = trimmed.replace(/[^A-Z]/g, '').length;
  const capsRatio = alphaOnly.length > 0 ? capsCount / alphaOnly.length : 0;
  if (capsRatio > 0.5 && alphaOnly.length > 5) {
    checks.push({
      id:      'caps',
      label:   'CAPS Warning',
      passed:  false,
      points:  -10,
      message: 'Too many CAPS',
      weight:  'bad',
    });
    score = Math.max(0, score - 10);
    suggestions.push('⚠️ Too many CAPITALS look like SPAM — use sentence case');
  }

  // ─────────────────────────────────────────────
  // 10. SPAM WORD DETECTION (Negative: -5 per word)
  // ─────────────────────────────────────────────
  const foundSpamWords = SPAM_WORDS.filter((w) => lower.includes(w));
  let spamRisk: 'low' | 'medium' | 'high' = 'low';

  if (foundSpamWords.length > 0) {
    const penalty = Math.min(foundSpamWords.length * 5, 20);
    score = Math.max(0, score - penalty);

    if (foundSpamWords.length >= 3) {
      spamRisk = 'high';
      checks.push({
        id:      'spam',
        label:   'Spam Risk',
        passed:  false,
        points:  -penalty,
        message: `HIGH — ${foundSpamWords.length} spam words`,
        weight:  'bad',
      });
      suggestions.push(`🚨 Remove spam words: ${foundSpamWords.slice(0, 3).join(', ')}`);
    } else if (foundSpamWords.length === 2) {
      spamRisk = 'medium';
      checks.push({
        id:      'spam',
        label:   'Spam Risk',
        passed:  false,
        points:  -penalty,
        message: `MEDIUM — ${foundSpamWords.length} spam words`,
        weight:  'warning',
      });
      suggestions.push(`⚠️ Consider removing: ${foundSpamWords.join(', ')}`);
    } else {
      spamRisk = 'low';
      checks.push({
        id:      'spam',
        label:   'Spam Risk',
        passed:  false,
        points:  -penalty,
        message: `LOW — 1 spam word`,
        weight:  'warning',
      });
      suggestions.push(`Consider replacing "${foundSpamWords[0]}"`);
    }
  } else if (trimmed.length > 0) {
    checks.push({
      id:      'spam',
      label:   'Spam Risk',
      passed:  true,
      points:  0,
      message: 'Clean — no spam words',
      weight:  'good',
    });
  }

  // ─────────────────────────────────────────────
  // NORMALIZE SCORE
  // Max positive: 20+10+15+15+10+10+10+5 = 95
  // Round to 100
  // ─────────────────────────────────────────────
  const finalScore = Math.max(0, Math.min(100, Math.round(score * (100 / 95))));

  return {
    score:      finalScore,
    checks,
    suggestions,
    wordCount:  wc,
    charCount:  len,
    emojiCount: emojis.length,
    spamRisk,
  };
}

// ═══════════════════════════════════════════════════════════════
// 🎨 HELPER: Score color
// ═══════════════════════════════════════════════════════════════

function getScoreColor(score: number): { bg: string; text: string; ring: string; label: string } {
  if (score >= 80) return {
    bg:    'bg-emerald-500',
    text:  'text-emerald-600',
    ring:  'ring-emerald-500/20',
    label: 'Excellent',
  };
  if (score >= 60) return {
    bg:    'bg-[#029bba]',
    text:  'text-[#029bba]',
    ring:  'ring-[#029bba]/20',
    label: 'Good',
  };
  if (score >= 40) return {
    bg:    'bg-amber-500',
    text:  'text-amber-600',
    ring:  'ring-amber-500/20',
    label: 'Fair',
  };
  return {
    bg:    'bg-red-500',
    text:  'text-red-600',
    ring:  'ring-red-500/20',
    label: 'Weak',
  };
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const SubjectAnalyzer: React.FC<SubjectAnalyzerProps> = ({ subject }) => {

  // Memoize analysis (only recompute when subject changes)
  const analysis = useMemo(() => analyzeSubject(subject), [subject]);
  const scoreColor = getScoreColor(analysis.score);

  // Empty state
  if (!subject.trim()) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Sparkles className="w-4 h-4" />
          <span className="font-semibold">Subject Analyzer</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Start typing a subject line to see real-time analysis
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

      {/* ═══════════════════════════════════════════
          HEADER — Score Display
          ═══════════════════════════════════════════ */}
      <div className="p-4 bg-gradient-to-br from-white to-gray-50 
                      border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#029bba]" />
            <h3 className="text-sm font-black text-[#004063]">
              Subject Line Score
            </h3>
          </div>
          <span className={`text-xs font-black ${scoreColor.text}`}>
            {scoreColor.label}
          </span>
        </div>

        {/* Score Circle */}
        <div className="flex items-center gap-4">
          <div className={`relative w-16 h-16 rounded-full ${scoreColor.bg} 
                           flex items-center justify-center ring-4 ${scoreColor.ring}`}>
            <span className="text-2xl font-black text-white">
              {analysis.score}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs 
                            text-gray-500 mb-1">
              <span>Score</span>
              <span className="font-bold">{analysis.score}/100</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${scoreColor.bg} transition-all duration-500`}
                style={{ width: `${analysis.score}%` }}
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
              <span>{analysis.charCount} chars</span>
              <span>·</span>
              <span>{analysis.wordCount} words</span>
              {analysis.emojiCount > 0 && (
                <>
                  <span>·</span>
                  <span>{analysis.emojiCount} emoji</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          CHECKS BREAKDOWN
          ═══════════════════════════════════════════ */}
      <div className="p-4">
        <h4 className="text-xs font-black text-gray-600 uppercase mb-2 
                       tracking-wider">
          Analysis Breakdown
        </h4>
        <div className="space-y-1.5">
          {analysis.checks.map((check) => (
            <div
              key={check.id}
              className="flex items-center justify-between gap-2 
                         py-1.5 px-2 rounded-lg hover:bg-gray-50 
                         transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {check.weight === 'good' && (
                  <div className="w-4 h-4 rounded-full bg-emerald-100 
                                  flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-emerald-600" strokeWidth={3} />
                  </div>
                )}
                {check.weight === 'warning' && (
                  <div className="w-4 h-4 rounded-full bg-amber-100 
                                  flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                  </div>
                )}
                {check.weight === 'bad' && (
                  <div className="w-4 h-4 rounded-full bg-red-100 
                                  flex items-center justify-center flex-shrink-0">
                    <X className="w-2.5 h-2.5 text-red-600" strokeWidth={3} />
                  </div>
                )}
                <span className="text-xs font-semibold text-gray-700 truncate">
                  {check.label}
                </span>
              </div>
              <span className={`text-xs truncate ${
                check.weight === 'good'    ? 'text-emerald-600' :
                check.weight === 'warning' ? 'text-amber-600'   :
                                             'text-red-600'
              }`}>
                {check.message}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SUGGESTIONS
          ═══════════════════════════════════════════ */}
      {analysis.suggestions.length > 0 && (
        <div className="p-4 bg-[#029bba]/5 border-t border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#029bba]" />
            <h4 className="text-xs font-black text-[#004063] uppercase 
                           tracking-wider">
              Improve Your Score
            </h4>
          </div>
          <ul className="space-y-1.5">
            {analysis.suggestions.slice(0, 4).map((suggestion, index) => (
              <li key={index} className="text-xs text-gray-700 
                                          flex items-start gap-2">
                <Info className="w-3 h-3 text-[#029bba] flex-shrink-0 mt-0.5" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          PERFECT SCORE CELEBRATION
          ═══════════════════════════════════════════ */}
      {analysis.score >= 90 && (
        <div className="p-3 bg-gradient-to-r from-emerald-50 
                        to-teal-50 border-t border-emerald-200 
                        text-center">
          <p className="text-xs font-bold text-emerald-700">
            🎉 Excellent subject line! Ready to send.
          </p>
        </div>
      )}
    </div>
  );
};

export default SubjectAnalyzer;
// ========== END OF FILE ==========