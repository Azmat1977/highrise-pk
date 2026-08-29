// components/aleem/AleemNudge.tsx
// Highrise.pk — ALEEM Proactive Engagement Nudge Balloon
// Appears above the chat launcher on high-intent pages.
// Palette: #029bba / #004063 / #10b981 | Lucide icons only | Mobile-safe.

import React, { useEffect, useCallback } from 'react';
import { Bot, X, Sparkles } from 'lucide-react';

interface AleemNudgeProps {
  contextType: 'property' | 'project' | 'society';
  contextTitle?: string;
  sessionId: string;
  onOpen: () => void;
  onDismiss: () => void;
}

function beacon(
  action: 'triggered' | 'clicked' | 'dismissed',
  payload: {
    sessionId: string;
    contextType: string;
    contextTitle?: string;
  },
): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({ action, ...payload });
    const url = '/api/aleem/nudge-event';

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon(url, blob);
      if (sent) return;
    }

    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      /* silent */
    });
  } catch {
    /* silent */
  }
}

function getNudgeCopy(
  contextType: AleemNudgeProps['contextType'],
  contextTitle?: string,
): { heading: string; sub: string } {
  const trimmedTitle =
    contextTitle && contextTitle.length > 32
      ? `${contextTitle.slice(0, 32)}…`
      : contextTitle;

  if (contextType === 'property') {
    return {
      heading: 'Verified price & NOC check?',
      sub: trimmedTitle
        ? `Is property ("${trimmedTitle}") ke actual rates aur documents poochhein.`
        : 'Is property ke actual rates aur documents poochhein.',
    };
  }
  if (contextType === 'project') {
    return {
      heading: 'Approved project? Confirm karein.',
      sub: trimmedTitle
        ? `${trimmedTitle} — payment plan aur delivery timeline check karein.`
        : 'Payment plan, timeline aur builder verification poochhein.',
    };
  }
  return {
    heading: 'Society ka NOC status?',
    sub: trimmedTitle
      ? `${trimmedTitle} ke risks aur verified listings dekhein.`
      : 'Society ke NOC, risks aur verified listings poochhein.',
  };
}

export default function AleemNudge({
  contextType,
  contextTitle,
  sessionId,
  onOpen,
  onDismiss,
}: AleemNudgeProps): React.ReactElement {
  const copy = getNudgeCopy(contextType, contextTitle);

  useEffect(() => {
    beacon('triggered', { sessionId, contextType, contextTitle });
  }, [sessionId, contextType, contextTitle]);

  const handleOpen = useCallback(() => {
    beacon('clicked', { sessionId, contextType, contextTitle });
    onOpen();
  }, [sessionId, contextType, contextTitle, onOpen]);

  const handleDismiss = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      beacon('dismissed', { sessionId, contextType, contextTitle });
      onDismiss();
    },
    [sessionId, contextType, contextTitle, onDismiss],
  );

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="ALEEM property specialist suggestion"
      className="aleem-nudge relative w-[280px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl border border-[#029bba]/20 shadow-xl overflow-hidden"
    >
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss ALEEM suggestion"
        className="absolute top-2 right-2 z-10 p-1 rounded-lg text-gray-400 hover:text-[#004063] hover:bg-gray-100 transition-colors active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#029bba]"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={handleOpen}
        className="w-full text-left p-4 pr-8 focus:outline-none focus:ring-2 focus:ring-[#029bba] focus:ring-inset"
      >
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10b981] border-2 border-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3 h-3 text-[#029bba] flex-shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#029bba]">
                Ask ALEEM
              </p>
            </div>
            <p className="text-sm font-bold text-[#004063] leading-tight mb-1">
              {copy.heading}
            </p>
            <p className="text-xs text-gray-600 leading-snug">{copy.sub}</p>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-gray-100">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#029bba]">
            Chat with ALEEM →
          </span>
        </div>
      </button>

      <style jsx>{`
        .aleem-nudge {
          animation: aleem-nudge-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes aleem-nudge-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .aleem-nudge {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}