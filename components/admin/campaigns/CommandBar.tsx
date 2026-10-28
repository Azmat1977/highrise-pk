// ========== FILE: components/admin/campaigns/CommandBar.tsx ==========
// 🎛️ ENTERPRISE COMMAND BAR — HIGHRISE.PK
// Mission Control top bar: back nav, title, auto-save, send button
// ═══════════════════════════════════════════════════════════════
// FEATURES:
//   ✅ Back navigation to campaigns list
//   ✅ Editable campaign title inline
//   ✅ Auto-save status indicator (4 states)
//   ✅ "Saved X ago" timestamp with live update
//   ✅ Manual save button
//   ✅ Preview button (opens full-screen preview)
//   ✅ Test email button
//   ✅ Send/Schedule button (disabled until ready)
//   ✅ Send progress state
//   ✅ Sticky positioning
//   ✅ Mobile responsive (icons only on mobile)
//   ✅ Keyboard shortcuts hint
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Mail,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  Rocket,
  Calendar,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface CommandBarProps {
  title:            string;
  onTitleChange:    (title: string) => void;
  saveStatus:       SaveStatus;
  lastSavedAt:      Date | null;
  canSend:          boolean;
  isSending:        boolean;
  isSaving:         boolean;
  isTestSending:    boolean;
  onSave:           () => void;
  onSend:           () => void;
  onTest:           () => void;
  onPreviewToggle:  () => void;
  isScheduled?:     boolean;
  backHref?:        string;
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Format timestamp as relative time ("2 seconds ago", "3 minutes ago")
 */
function formatRelativeTime(date: Date | null): string {
  if (!date) return 'never';

  const now = Date.now();
  const then = date.getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 3)   return 'just now';
  if (diff < 60)  return `${diff} seconds ago`;

  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// ═══════════════════════════════════════════════════════════════
// 🎨 SAVE STATUS INDICATOR
// ═══════════════════════════════════════════════════════════════

const SaveStatusIndicator: React.FC<{
  status:      SaveStatus;
  lastSavedAt: Date | null;
}> = ({ status, lastSavedAt }) => {
  const [_, setTick] = useState(0);

  // Update relative time every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-[#029bba]">
        <div className="w-2 h-2 bg-[#029bba] rounded-full animate-pulse" />
        <span className="text-xs font-semibold">Saving...</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-red-600">
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold">Save failed</span>
      </div>
    );
  }

  if (status === 'saved' && lastSavedAt) {
    return (
      <div className="flex items-center gap-1.5 text-emerald-600">
        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
        <span className="text-xs font-semibold">
          Saved {formatRelativeTime(lastSavedAt)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-gray-400">
      <div className="w-2 h-2 bg-gray-300 rounded-full" />
      <span className="text-xs font-semibold">Unsaved</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const CommandBar: React.FC<CommandBarProps> = ({
  title,
  onTitleChange,
  saveStatus,
  lastSavedAt,
  canSend,
  isSending,
  isSaving,
  isTestSending,
  onSave,
  onSend,
  onTest,
  onPreviewToggle,
  isScheduled = false,
  backHref    = '/admin/campaigns',
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localTitle,     setLocalTitle]     = useState(title);

  // Sync local title with prop
  useEffect(() => {
    if (!isEditingTitle) {
      setLocalTitle(title);
    }
  }, [title, isEditingTitle]);

  // Handle title edit save
  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    const trimmed = localTitle.trim();
    if (trimmed && trimmed !== title) {
      onTitleChange(trimmed);
    } else {
      setLocalTitle(title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setLocalTitle(title);
      setIsEditingTitle(false);
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 
                    shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">

        {/* ─────────────────────────────────────────
            LEFT: Back Button + Title
            ───────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Back Button */}
          <Link
            href={backHref}
            className="p-2 rounded-xl text-gray-500 hover:text-[#029bba] 
                       hover:bg-gray-100 transition-colors flex-shrink-0"
            title="Back to campaigns"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Editable Title */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                maxLength={200}
                autoFocus
                className="w-full px-3 py-1.5 text-base font-black 
                           text-[#004063] bg-white border-2 
                           border-[#029bba]/30 rounded-lg 
                           focus:ring-2 focus:ring-[#029bba]/20 
                           focus:border-[#029bba] outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="w-full text-left px-3 py-1.5 rounded-lg 
                           hover:bg-gray-100 transition-colors group"
                title="Click to edit"
              >
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-black text-[#004063] truncate">
                    {title || (
                      <span className="text-gray-400 italic font-normal">
                        Untitled Campaign
                      </span>
                    )}
                  </h1>
                  <span className="text-xs text-gray-400 opacity-0 
                                   group-hover:opacity-100 transition-opacity 
                                   flex-shrink-0">
                    ✎ Edit
                  </span>
                </div>
              </button>
            )}

            {/* Save Status (Under Title) */}
            <div className="px-3 mt-0.5">
              <SaveStatusIndicator
                status={saveStatus}
                lastSavedAt={lastSavedAt}
              />
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────
            RIGHT: Action Buttons
            ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Preview (Mobile Only — hidden on desktop, always visible in preview panel) */}
          <button
            type="button"
            onClick={onPreviewToggle}
            className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-[#029bba] 
                       hover:bg-gray-100 transition-colors"
            title="Preview email"
          >
            <Eye className="w-5 h-5" />
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || saveStatus === 'saving'}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 
                       rounded-xl border border-gray-300 text-gray-700 
                       font-semibold text-sm hover:bg-gray-50 
                       transition-colors disabled:opacity-50 
                       disabled:cursor-not-allowed"
            title="Save draft (Ctrl+S)"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save</span>
          </button>

          {/* Save Icon (Mobile) */}
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving || saveStatus === 'saving'}
            className="sm:hidden p-2 rounded-xl text-gray-500 hover:text-[#029bba] 
                       hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Save"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
          </button>

          {/* Test Email Button */}
          <button
            type="button"
            onClick={onTest}
            disabled={isTestSending || !canSend}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 
                       rounded-xl border border-[#029bba]/30 text-[#029bba] 
                       font-semibold text-sm hover:bg-[#029bba]/5 
                       transition-colors disabled:opacity-40 
                       disabled:cursor-not-allowed"
            title="Send test email to yourself"
          >
            {isTestSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            <span>Test</span>
          </button>

          {/* Test Icon (Small screens) */}
          <button
            type="button"
            onClick={onTest}
            disabled={isTestSending || !canSend}
            className="md:hidden p-2 rounded-xl text-[#029bba] hover:bg-[#029bba]/10 
                       transition-colors disabled:opacity-40"
            title="Send test"
          >
            {isTestSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Mail className="w-5 h-5" />
            )}
          </button>

          {/* Vertical Divider */}
          <div className="h-8 w-px bg-gray-200 mx-1" />

          {/* Send/Schedule Button */}
          <button
            type="button"
            onClick={onSend}
            disabled={!canSend || isSending}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl 
              font-black text-sm transition-all shadow-sm
              ${canSend && !isSending
                ? 'bg-gradient-to-r from-[#029bba] to-[#004063] text-white hover:shadow-lg hover:shadow-[#029bba]/20 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
            title={
              !canSend
                ? 'Complete required items first'
                : isScheduled
                  ? 'Schedule campaign'
                  : 'Send campaign now'
            }
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Sending...</span>
              </>
            ) : isScheduled ? (
              <>
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Schedule</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────
          KEYBOARD SHORTCUTS HINT (Hidden on mobile)
          ───────────────────────────────────────── */}
      {!canSend && (
        <div className="hidden lg:block px-4 pb-2">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Auto-saves every 10 seconds
            </span>
            <span>·</span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded 
                              text-[10px] font-mono">Ctrl+S</kbd> to save
            </span>
            <span>·</span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded 
                              text-[10px] font-mono">Esc</kbd> to exit editing
            </span>
          </div>
        </div>
      )}

      {/* Ready Banner (Show when campaign is send-ready) */}
      {canSend && !isSending && (
        <div className="hidden lg:block px-4 pb-2">
          <div className="flex items-center gap-2 text-xs">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-700 font-semibold">
              All required items complete — ready to {isScheduled ? 'schedule' : 'send'}!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommandBar;
// ========== END OF FILE ==========