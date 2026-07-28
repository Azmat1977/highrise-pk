/**
 * components/shortlist/ShortlistNoteModal.tsx
 *
 * Portal-rendered modal for editing per-favorite private notes.
 * Uses same pattern as ShareMenu (portal, ESC, backdrop, stopPropagation).
 *
 * For LOGGED-IN users only (guest notes deferred — needs DB persistence).
 * Guests will see a login prompt inside the modal instead.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Save, Loader2, Check, AlertCircle, StickyNote, Lock } from 'lucide-react';

import type { ProjectListing } from '@/types/projects';

// ─── PROPS ───────────────────────────────────────────────────────────────────

export interface ShortlistNoteModalProps {
  project:      ProjectListing;
  initialNote:  string;
  isOpen:       boolean;
  onClose:      () => void;
  isLoggedIn:   boolean;
  onSave:       (note: string) => Promise<boolean>;
}

const MAX_NOTE_LENGTH = 500;

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function ShortlistNoteModal({
  project,
  initialNote,
  isOpen,
  onClose,
  isLoggedIn,
  onSave,
}: ShortlistNoteModalProps): React.ReactElement | null {

  const [note,       setNote]       = useState(initialNote);
  const [saveState,  setSaveState]  = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  // ── Sync initialNote when modal opens ─────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setNote(initialNote);
      setSaveState('idle');
      setErrorMsg(null);
    }
  }, [isOpen, initialNote]);

  // ── Body scroll lock ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── ESC to close ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // ── Save handler ──────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!isLoggedIn) return;
    setSaveState('saving');
    setErrorMsg(null);

    const success = await onSave(note.trim());

    if (success) {
      setSaveState('saved');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setSaveState('error');
      setErrorMsg('Failed to save note. Please try again.');
      setTimeout(() => {
        setSaveState('idle');
        setErrorMsg(null);
      }, 3000);
    }
  }, [isLoggedIn, note, onSave, onClose]);

  if (!isOpen) return null;

  const remaining     = MAX_NOTE_LENGTH - note.length;
  const isSaving      = saveState === 'saving';
  const noteChanged   = note.trim() !== initialNote.trim();

  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-modal-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex min-h-full items-center justify-center p-4">

        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-hidden="true"
        />

        {/* Modal Panel */}
        <div className="relative bg-white rounded-2xl shadow-xl
                        w-full max-w-md">

          {/* Header */}
          <div className="flex items-center justify-between p-5
                          border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100
                              flex items-center justify-center">
                <StickyNote className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h2
                  id="note-modal-title"
                  className="text-base font-black text-gray-900"
                >
                  Private Note
                </h2>
                <p className="text-xs text-gray-400 font-semibold truncate max-w-[200px]">
                  {project.projectName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 text-gray-400 hover:text-gray-600
                         hover:bg-gray-100 rounded-xl transition-colors
                         focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5">

            {/* Guest mode — login prompt */}
            {!isLoggedIn ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center
                                w-14 h-14 rounded-full bg-[#029bba]/10 mb-4">
                  <Lock className="w-6 h-6 text-[#029bba]" />
                </div>
                <h3 className="text-base font-black text-gray-900 mb-2">
                  Login to Save Notes
                </h3>
                <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                  Private notes on your favorites are available for logged-in users only.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-6 py-2.5
                             rounded-xl bg-[#029bba] text-white
                             text-sm font-black hover:bg-[#017a94]
                             transition-colors"
                >
                  Got it
                </button>
              </div>
            ) : (
              <>
                {/* Info text */}
                <p className="text-xs text-gray-500 mb-3">
                  Add private thoughts, comparisons, or questions to remember about this project.
                  Only you can see this.
                </p>

                {/* Textarea */}
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, MAX_NOTE_LENGTH))}
                  disabled={isSaving}
                  rows={6}
                  placeholder="e.g., Ask about payment plans, near mosque, good for family..."
                  className="w-full px-4 py-3 rounded-xl
                             border-2 border-gray-200
                             focus:border-[#029bba] focus:ring-2 focus:ring-[#029bba]/20
                             outline-none transition-all resize-none
                             text-sm text-gray-900 placeholder-gray-400
                             disabled:bg-gray-50 disabled:cursor-not-allowed"
                />

                {/* Character counter */}
                <div className="flex items-center justify-between mt-2">
                  <p className={`text-xs font-semibold ${
                    remaining < 50 ? 'text-amber-600' : 'text-gray-400'
                  }`}>
                    {remaining} characters remaining
                  </p>
                  {noteChanged && !isSaving && saveState === 'idle' && (
                    <p className="text-xs font-semibold text-[#029bba]">
                      Unsaved changes
                    </p>
                  )}
                </div>

                {/* Error banner */}
                {errorMsg && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2
                                  rounded-lg bg-red-50 border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <p className="text-xs font-bold text-red-700">{errorMsg}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 rounded-xl
                               border-2 border-gray-200 text-gray-700
                               text-sm font-bold
                               hover:bg-gray-50 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving || !noteChanged}
                    className="flex-1 inline-flex items-center justify-center gap-2
                               px-4 py-2.5 rounded-xl
                               bg-[#029bba] text-white text-sm font-black
                               hover:bg-[#017a94] transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed
                               focus:outline-none focus:ring-2 focus:ring-[#029bba]/50"
                  >
                    {saveState === 'saving' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : saveState === 'saved' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Note
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(modalContent, document.body);
}