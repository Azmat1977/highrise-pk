// components/aleem/FeedbackButtons.tsx
// Highrise.pk — ALEEM Assistant Response Feedback Widget
// Modern, brand-aligned (#029bba / #004063 / #10b981 / #ef4444), mobile-touch safe.
// NO framer-motion | NO external modal lib | Lucide icons only

import React, { useState, useCallback } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  Loader2,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { FEEDBACK_REASONS, FeedbackReason } from '@/models/AleemFeedback';

interface FeedbackButtonsProps {
  messageId: string;
  sessionId: string;
  contextType?: string;
  contextSlug?: string;
}

const REASON_LABELS: Record<FeedbackReason, string> = {
  price_mismatch: '💰 Price mismatch / outdated',
  not_relevant: '❓ Not relevant to my query',
  unverified_alert: '⚠️ Unverified / risky info',
  language_issue: '🗣️ Language / script error',
  other: '💬 Other reason',
};

export default function FeedbackButtons({
  messageId,
  sessionId,
  contextType,
  contextSlug,
}: FeedbackButtonsProps): React.ReactElement {
  const [voted, setVoted] = useState<'positive' | 'negative' | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState<FeedbackReason>('not_relevant');
  const [comment, setComment] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const submitFeedback = useCallback(
    async (rating: 'positive' | 'negative', reason?: FeedbackReason, userComment?: string) => {
      setSubmitting(true);
      try {
        const res = await fetch('/api/aleem/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId,
            sessionId,
            rating,
            reason: rating === 'negative' ? reason : undefined,
            comment: userComment?.trim() || undefined,
            contextType,
            contextSlug,
            honeypot,
          }),
        });

        if (res.ok) {
          setVoted(rating);
          setFeedbackSent(true);
          setShowModal(false);
        }
      } catch {
        // Silent recovery
      } finally {
        setSubmitting(false);
      }
    },
    [messageId, sessionId, contextType, contextSlug, honeypot]
  );

  const handlePositive = () => {
    if (voted || submitting) return;
    void submitFeedback('positive');
  };

  const handleNegativeClick = () => {
    if (voted || submitting) return;
    setShowModal(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitFeedback('negative', selectedReason, comment);
  };

  if (feedbackSent) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-[#10b981] font-semibold animate-fadeIn">
        <Check className="w-3.5 h-3.5" />
        <span>Shukriya! Feedback received.</span>
      </div>
    );
  }

  return (
    <div className="relative mt-1.5 flex items-center gap-2">
      <span className="text-[11px] font-medium text-gray-400 select-none">Was this helpful?</span>

      <div className="flex items-center gap-1">
        {/* Thumbs Up Button */}
        <button
          type="button"
          onClick={handlePositive}
          disabled={submitting || voted !== null}
          aria-label="Helpful"
          title="Mark reply as helpful"
          className={`p-1 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-[#029bba] ${
            voted === 'positive'
              ? 'bg-[#10b981]/15 text-[#10b981]'
              : 'text-gray-400 hover:text-[#029bba] hover:bg-gray-100 active:scale-95'
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>

        {/* Thumbs Down Button */}
        <button
          type="button"
          onClick={handleNegativeClick}
          disabled={submitting || voted !== null}
          aria-label="Not helpful"
          title="Report inaccurate or unhelpful reply"
          className={`p-1 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-[#ef4444] ${
            voted === 'negative'
              ? 'bg-[#ef4444]/15 text-[#ef4444]'
              : 'text-gray-400 hover:text-[#ef4444] hover:bg-gray-100 active:scale-95'
          }`}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Negative Reason Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden text-left p-5 animate-slideUp">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#ef4444]/10 text-[#ef4444] rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-[#004063]">Help us improve ALEEM</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit}>
              {/* Invisible Honeypot */}
              <div className="absolute opacity-0 pointer-events-none w-0 h-0 -z-10" aria-hidden="true">
                <input
                  type="text"
                  tabIndex={-1}
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <p className="text-xs text-gray-600 mb-3">What was wrong with this response?</p>

              {/* Reason Pills */}
              <div className="space-y-2 mb-4">
                {FEEDBACK_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                      selectedReason === r
                        ? 'border-[#029bba] bg-[#029bba]/5 text-[#004063] font-bold shadow-xs'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="feedback_reason"
                      value={r}
                      checked={selectedReason === r}
                      onChange={() => setSelectedReason(r)}
                      className="sr-only"
                    />
                    <span>{REASON_LABELS[r]}</span>
                  </label>
                ))}
              </div>

              {/* Optional Comment Input */}
              <div className="mb-4">
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-3.5 h-3.5 text-gray-400" />
                  <textarea
                    placeholder="Tell us more (optional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={300}
                    rows={2}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#029bba] bg-white text-gray-800 resize-none"
                  />
                </div>
              </div>

              {/* Submit Action */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-[#004063] text-white rounded-xl text-xs font-bold hover:bg-[#002f4a] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}