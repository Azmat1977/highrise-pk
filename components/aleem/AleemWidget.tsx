// components/aleem/AleemWidget.tsx
// Highrise.pk — ALEEM AI floating chat widget
// V7.3.0 — STAGE 0.3: Added Proactive Engagement Nudge (dwell + scroll trigger)
// Floating bottom-right bubble with expand/minimize/close
// Context-aware: knows which page user is on
// NO framer-motion | NO external libs | NO axios

import React, { useState, useEffect, useCallback } from 'react';
import type { IAriaContext } from '@/models/Conversation';
import AleemChat from './AleemChat';
import AleemNudge from './AleemNudge';
import useProactiveNudge from '@/hooks/useProactiveNudge';
import { MessageCircle, X, Bot, ChevronDown } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AriaWidgetProps {
  context?: Partial<IAriaContext>;
}

// ─── Session ID management ────────────────────────────────────────────────────
// Persisted in sessionStorage (not localStorage — clears on tab close)
// Never contains PII — just a UUID for conversation continuity

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID();
  const key = 'aria_session_id';
  const stored = sessionStorage.getItem(key);
  if (stored) return stored;
  const id = crypto.randomUUID();
  sessionStorage.setItem(key, id);
  return id;
}

// ─── State types ──────────────────────────────────────────────────────────────

type WidgetState = 'hidden' | 'bubble' | 'open' | 'minimized';

/**
 * Hover hint. Shown only on deliberate hover or keyboard focus, never on a
 * timer: an unprompted popup reads as an ad, not as help.
 */
function getHoverHint(context: IAriaContext): string {
  if (context.type === 'property') return 'Ask ALEEM about this property';
  if (context.type === 'society') return 'Ask ALEEM about this society';
  if (context.type === 'project') return 'Ask ALEEM about this project';
  return 'Need help? Talk to ALEEM';
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export default function AriaWidget({ context }: AriaWidgetProps): React.ReactElement | null {
  const [widgetState, setWidgetState] = useState<WidgetState>('bubble');
  const [sessionId,   setSessionId]   = useState<string>('');
  const [isHovered,   setIsHovered]   = useState(false);
  const [mounted,     setMounted]     = useState(false);

  // Hydration guard — widget uses sessionStorage
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
    setMounted(true);
  }, []);

  // Build full context (merge prop context with defaults)
  const fullContext: IAriaContext = {
    type: 'general',
    ...context,
  };

  // Proactive nudge: only eligible when we're on a high-intent page
  // AND the widget hasn't been opened yet
  const isHighIntentPage =
    fullContext.type === 'property' ||
    fullContext.type === 'project' ||
    fullContext.type === 'society';

  const nudgeEligible = mounted && Boolean(sessionId) && isHighIntentPage && widgetState === 'bubble';

  const { shouldShow: showNudge, dismiss: dismissNudge, markShown } = useProactiveNudge({
    eligible: nudgeEligible,
  });

  useEffect(() => {
    if (showNudge) markShown();
  }, [showNudge, markShown]);

  const handleOpen = useCallback(() => {
    setWidgetState('open');
    setIsHovered(false);
  }, []);

  const handleMinimize = useCallback(() => {
    setWidgetState('minimized');
  }, []);

  const handleClose = useCallback(() => {
    setWidgetState('bubble');
  }, []);

  const handleNudgeOpen = useCallback(() => {
    dismissNudge();
    setWidgetState('open');
    setIsHovered(false);
  }, [dismissNudge]);

  const handleNudgeDismiss = useCallback(() => {
    dismissNudge();
  }, [dismissNudge]);

  // Don't render until hydrated
  if (!mounted || !sessionId) return null;

  // ── Hidden state ──────────────────────────────────────────────────────────
  if (widgetState === 'hidden') return null;

  const canShowNudge =
    showNudge &&
    widgetState === 'bubble' &&
    isHighIntentPage &&
    (fullContext.type === 'property' ||
      fullContext.type === 'project' ||
      fullContext.type === 'society');

  return (
    <>
      {/* ── Floating Chat Window (open state) ── */}
      {widgetState === 'open' && (
        <div
          className="fixed bottom-6 right-6 z-[200] w-[360px] h-[560px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ boxShadow: '0 25px 60px rgba(0, 64, 99, 0.25)' }}
        >
          <AleemChat
            context={fullContext}
            sessionId={sessionId}
            onMinimize={handleMinimize}
            onClose={handleClose}
          />
        </div>
      )}

      {/* ── Minimized bar ── */}
      {widgetState === 'minimized' && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <button
            onClick={handleOpen}
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#029bba] to-[#004063] text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold">Aleem</span>
            <ChevronDown className="w-5 h-5 text-white/70" />
          </button>
        </div>
      )}

      {/* ── Floating bubble (default state) ── */}
      {widgetState === 'bubble' && (
        <div
          className="fixed bottom-6 right-6 z-[200] flex flex-col items-end gap-3"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Proactive Nudge (Stage 0.3) */}
          {canShowNudge && (fullContext.type === 'property' || fullContext.type === 'project' || fullContext.type === 'society') && (
            <AleemNudge
              contextType={fullContext.type}
              contextTitle={fullContext.title}
              sessionId={sessionId}
              onOpen={handleNudgeOpen}
              onDismiss={handleNudgeDismiss}
            />
          )}

          {/* Hint on hover / keyboard focus only */}
          {isHovered && !canShowNudge && (
            <div className="flex items-start gap-2 max-w-[240px]">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-br-sm px-4 py-2.5 shadow-lg text-sm text-[#004063] leading-snug font-semibold whitespace-nowrap">
                {getHoverHint(fullContext)}
              </div>
            </div>
          )}

          {/* Main bubble button */}
          <button
            onClick={handleOpen}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            aria-label="Open ALEEM property specialist"
            className="group relative w-14 h-14 bg-gradient-to-br from-[#029bba] to-[#004063] rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-110 active:scale-95 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[#029bba]/40"
          >
            <Bot className="w-7 h-7 text-white" />

            {/* Online status dot */}
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#10b981] rounded-full border-2 border-white" />

            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-[#029bba]/30 animate-ping" />

          </button>

          {/* Label below bubble */}
          <p className="text-xs text-gray-600 font-semibold text-center">
            Ask Aleem
          </p>
        </div>
      )}
    </>
  );
}