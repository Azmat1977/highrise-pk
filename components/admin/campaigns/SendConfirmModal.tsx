// ========== FILE: components/admin/campaigns/SendConfirmModal.tsx ==========
// 🚀 ENTERPRISE SEND CONFIRMATION MODAL — HIGHRISE.PK
// Beautiful send confirmation with test email flow
// ═══════════════════════════════════════════════════════════════
// FEATURES:
//   ✅ 2-step confirmation flow (Review → Confirm)
//   ✅ Test email sending inline
//   ✅ Test email validation
//   ✅ Multiple test emails (comma-separated)
//   ✅ Campaign summary display
//   ✅ Recipient count prominence
//   ✅ Send/Schedule mode toggle
//   ✅ Schedule date picker
//   ✅ Pre-send checklist (final review)
//   ✅ Warning banner (irreversible action)
//   ✅ Loading states with progress
//   ✅ Success/error inline banners
//   ✅ Body scroll lock
//   ✅ ESC key closes
//   ✅ Click outside closes
//   ✅ Beautiful animations
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Mail,
  Send,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users,
  Clock,
  Eye,
  Rocket,
  Shield,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

interface SendConfirmModalProps {
  isOpen:           boolean;
  onClose:          () => void;
  onSend:           (scheduleDate?: string) => Promise<void>;
  onTest:           (emails: string[]) => Promise<{ success: boolean; message: string }>;
  campaignTitle:    string;
  campaignSubject:  string;
  fromName:         string;
  fromEmail:        string;
  recipientCount:   number;
  isSending:        boolean;
}

type Step = 'review' | 'confirm';

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,63}$/;

function parseEmails(input: string): string[] {
  return input
    .split(/[,;\n]/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

function validateEmails(emails: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  emails.forEach((email) => {
    if (EMAIL_REGEX.test(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  });

  return { valid, invalid };
}

function getMinScheduleDate(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15); // Minimum 15 minutes in future
  now.setSeconds(0, 0);
  return now.toISOString().slice(0, 16);
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const SendConfirmModal: React.FC<SendConfirmModalProps> = ({
  isOpen,
  onClose,
  onSend,
  onTest,
  campaignTitle,
  campaignSubject,
  fromName,
  fromEmail,
  recipientCount,
  isSending,
}) => {

  // ═══════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════
  const [step,           setStep]           = useState<Step>('review');
  const [testEmails,     setTestEmails]     = useState('');
  const [isTestSending,  setIsTestSending]  = useState(false);
  const [testResult,     setTestResult]     = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [sendMode,       setSendMode]       = useState<'now' | 'schedule'>('now');
  const [scheduleDate,   setScheduleDate]   = useState('');
  const [scheduleError,  setScheduleError]  = useState<string | null>(null);
  const [checklistState, setChecklistState] = useState({
    reviewed:   false,
    tested:     false,
    understood: false,
  });

  // ═══════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('review');
      setTestResult(null);
      setScheduleError(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSending) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSending, onClose]);

  // ═══════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleTestSend = async () => {
    setTestResult(null);
    const parsed = parseEmails(testEmails);

    if (parsed.length === 0) {
      setTestResult({
        type:    'error',
        message: 'Please enter at least one email address',
      });
      return;
    }

    if (parsed.length > 5) {
      setTestResult({
        type:    'error',
        message: 'Maximum 5 test emails allowed at once',
      });
      return;
    }

    const { valid, invalid } = validateEmails(parsed);

    if (invalid.length > 0) {
      setTestResult({
        type:    'error',
        message: `Invalid email${invalid.length > 1 ? 's' : ''}: ${invalid.slice(0, 3).join(', ')}`,
      });
      return;
    }

    setIsTestSending(true);
    try {
      const result = await onTest(valid);
      setTestResult({
        type:    result.success ? 'success' : 'error',
        message: result.message,
      });
      if (result.success) {
        setChecklistState((prev) => ({ ...prev, tested: true }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send test';
      setTestResult({ type: 'error', message: msg });
    } finally {
      setIsTestSending(false);
    }
  };

  const handleProceedToConfirm = () => {
    if (sendMode === 'schedule') {
      if (!scheduleDate) {
        setScheduleError('Please select a date and time');
        return;
      }
      const scheduled = new Date(scheduleDate);
      if (scheduled.getTime() <= Date.now() + 10 * 60 * 1000) {
        setScheduleError('Schedule must be at least 15 minutes in the future');
        return;
      }
      setScheduleError(null);
    }
    setStep('confirm');
  };

  const handleFinalSend = async () => {
    try {
      await onSend(sendMode === 'schedule' ? scheduleDate : undefined);
      // Modal will close from parent
    } catch (err) {
      // Error handled by parent
    }
  };

  const allChecklistComplete =
    checklistState.reviewed &&
    checklistState.tested &&
    checklistState.understood;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isSending && onClose()}
      />

      {/* Modal */}
      <div className="relative min-h-screen flex items-start 
                      justify-center p-4 py-8">
        <div className="relative bg-white rounded-3xl shadow-2xl 
                        w-full max-w-2xl">

          {/* ═══════════════════════════════════════════
              HEADER
              ═══════════════════════════════════════════ */}
          <div className="sticky top-0 bg-white border-b border-gray-200 
                          px-6 py-4 rounded-t-3xl flex items-center 
                          justify-between z-10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center 
                               justify-center ${
                                 step === 'confirm'
                                   ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                                   : 'bg-gradient-to-br from-[#029bba] to-[#004063] text-white'
                               }`}>
                {step === 'confirm' ? (
                  <Rocket className="w-5 h-5" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-black text-[#004063]">
                  {step === 'confirm' ? 'Final Confirmation' : 'Ready to Send'}
                </h2>
                <p className="text-xs text-gray-500">
                  {step === 'confirm'
                    ? 'Last chance to review before sending'
                    : 'Review campaign details and send test email'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => !isSending && onClose()}
              disabled={isSending}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors 
                         disabled:opacity-40"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* ═══════════════════════════════════════════
              STEP INDICATOR
              ═══════════════════════════════════════════ */}
          <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 ${
                step === 'review' ? 'text-[#029bba]' : 'text-emerald-600'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center 
                                 justify-center text-xs font-black 
                                 ${
                                   step === 'review'
                                     ? 'bg-[#029bba] text-white'
                                     : 'bg-emerald-500 text-white'
                                 }`}>
                  {step === 'confirm' ? <CheckCircle className="w-3.5 h-3.5" /> : '1'}
                </div>
                <span className="text-xs font-bold">Review & Test</span>
              </div>

              <div className={`flex-1 h-0.5 ${
                step === 'confirm' ? 'bg-emerald-500' : 'bg-gray-200'
              }`} />

              <div className={`flex items-center gap-2 ${
                step === 'confirm' ? 'text-[#029bba]' : 'text-gray-400'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center 
                                 justify-center text-xs font-black 
                                 ${
                                   step === 'confirm'
                                     ? 'bg-[#029bba] text-white'
                                     : 'bg-gray-200 text-gray-500'
                                 }`}>
                  2
                </div>
                <span className="text-xs font-bold">Confirm & Send</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              CONTENT: STEP 1 — REVIEW
              ═══════════════════════════════════════════ */}
          {step === 'review' && (
            <div className="p-6 space-y-5">

              {/* Campaign Summary Card */}
              <div className="p-4 bg-gradient-to-br from-gray-50 to-white 
                              rounded-2xl border border-gray-200">
                <p className="text-xs font-black text-gray-500 uppercase 
                              tracking-wider mb-3">
                  Campaign Summary
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-500 
                                     min-w-[80px]">Title:</span>
                    <span className="text-sm font-bold text-gray-900 flex-1">
                      {campaignTitle || 'Untitled'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-500 
                                     min-w-[80px]">Subject:</span>
                    <span className="text-sm text-gray-900 flex-1">
                      {campaignSubject}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-semibold text-gray-500 
                                     min-w-[80px]">From:</span>
                    <span className="text-sm text-gray-900 flex-1">
                      {fromName} &lt;{fromEmail}&gt;
                    </span>
                  </div>
                  <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                    <span className="text-xs font-semibold text-gray-500 
                                     min-w-[80px]">Recipients:</span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#029bba]" />
                      <span className="text-lg font-black text-[#029bba]">
                        {recipientCount.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 font-semibold">
                        active subscribers
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Test Email Section */}
              <div>
                <label className="flex text-sm font-black text-[#004063] 
                                  mb-2 items-center gap-2">
                  <Mail className="w-4 h-4 text-[#029bba]" />
                  Send Test Email First
                  <span className="text-xs font-normal text-gray-500">
                    (highly recommended)
                  </span>
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testEmails}
                    onChange={(e) => setTestEmails(e.target.value)}
                    placeholder="your@email.com, colleague@email.com"
                    disabled={isTestSending}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 
                               focus:ring-2 focus:ring-[#029bba]/20 
                               focus:border-[#029bba] outline-none text-sm 
                               disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleTestSend}
                    disabled={isTestSending || !testEmails.trim()}
                    className="px-4 py-2 rounded-xl bg-[#029bba] hover:bg-[#027a94] 
                               text-white font-semibold text-sm transition-colors 
                               disabled:opacity-50 disabled:cursor-not-allowed 
                               flex items-center gap-1.5 flex-shrink-0"
                  >
                    {isTestSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send Test
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Separate multiple emails with commas (max 5)
                </p>

                {/* Test Result Banner */}
                {testResult && (
                  <div className={`mt-3 p-3 rounded-xl flex items-start gap-2 
                                    ${
                                      testResult.type === 'success'
                                        ? 'bg-emerald-50 border border-emerald-200'
                                        : 'bg-red-50 border border-red-200'
                                    }`}>
                    {testResult.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 
                                              flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 
                                              flex-shrink-0 mt-0.5" />
                    )}
                    <p className={`text-xs font-semibold ${
                      testResult.type === 'success'
                        ? 'text-emerald-800'
                        : 'text-red-800'
                    }`}>
                      {testResult.message}
                    </p>
                  </div>
                )}
              </div>

              {/* Send Mode Toggle */}
              <div>
                <label className="flex text-sm font-black text-[#004063] 
                                  mb-2 items-center gap-2">
                  <Clock className="w-4 h-4 text-[#029bba]" />
                  When to Send
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSendMode('now')}
                    className={`p-3 rounded-xl border-2 transition-all text-left 
                                ${
                                  sendMode === 'now'
                                    ? 'border-[#029bba] bg-[#029bba]/5'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Rocket className={`w-4 h-4 ${
                        sendMode === 'now' ? 'text-[#029bba]' : 'text-gray-400'
                      }`} />
                      <span className="text-sm font-bold text-gray-900">
                        Send Now
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Send immediately
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSendMode('schedule')}
                    className={`p-3 rounded-xl border-2 transition-all text-left 
                                ${
                                  sendMode === 'schedule'
                                    ? 'border-[#029bba] bg-[#029bba]/5'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className={`w-4 h-4 ${
                        sendMode === 'schedule' ? 'text-[#029bba]' : 'text-gray-400'
                      }`} />
                      <span className="text-sm font-bold text-gray-900">
                        Schedule
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Send at specific time
                    </p>
                  </button>
                </div>

                {/* Schedule Date Input */}
                {sendMode === 'schedule' && (
                  <div className="mt-3">
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => {
                        setScheduleDate(e.target.value);
                        setScheduleError(null);
                      }}
                      min={getMinScheduleDate()}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 
                                 focus:ring-2 focus:ring-[#029bba]/20 
                                 focus:border-[#029bba] outline-none text-sm"
                    />
                    {scheduleError && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {scheduleError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════
              CONTENT: STEP 2 — CONFIRM
              ═══════════════════════════════════════════ */}
          {step === 'confirm' && (
            <div className="p-6 space-y-5">

              {/* Warning Banner */}
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 
                              border border-amber-200 rounded-2xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 
                                          flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-amber-900 mb-1">
                      This action cannot be undone
                    </p>
                    <p className="text-xs text-amber-800">
                      Once sent, this email will reach{' '}
                      <strong>{recipientCount.toLocaleString()}</strong> subscribers 
                      and cannot be recalled.
                    </p>
                  </div>
                </div>
              </div>

              {/* Final Summary */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <p className="text-xs font-black text-gray-500 uppercase 
                              tracking-wider mb-3">
                  Sending To
                </p>
                <div className="text-center">
                  <div className="text-4xl font-black text-[#029bba] mb-1">
                    {recipientCount.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-600 font-semibold">
                    active subscribers
                  </p>
                </div>

                {sendMode === 'schedule' && scheduleDate && (
                  <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                    <p className="text-xs text-gray-500 mb-1">Scheduled for:</p>
                    <p className="text-sm font-bold text-[#004063]">
                      {new Date(scheduleDate).toLocaleString('en-PK', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Final Checklist */}
              <div>
                <p className="text-xs font-black text-gray-500 uppercase 
                              tracking-wider mb-3">
                  Please Confirm
                </p>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer 
                                    p-3 rounded-xl hover:bg-gray-50 
                                    transition-colors">
                    <input
                      type="checkbox"
                      checked={checklistState.reviewed}
                      onChange={(e) => setChecklistState((prev) => ({
                        ...prev,
                        reviewed: e.target.checked,
                      }))}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 
                                 text-[#029bba] focus:ring-[#029bba]/20"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        I have reviewed the email content
                      </p>
                      <p className="text-xs text-gray-500">
                        Subject, content, links, and images look correct
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer 
                                    p-3 rounded-xl hover:bg-gray-50 
                                    transition-colors">
                    <input
                      type="checkbox"
                      checked={checklistState.tested}
                      onChange={(e) => setChecklistState((prev) => ({
                        ...prev,
                        tested: e.target.checked,
                      }))}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 
                                 text-[#029bba] focus:ring-[#029bba]/20"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        I sent a test email and verified it
                      </p>
                      <p className="text-xs text-gray-500">
                        The email arrived in my inbox and displays correctly
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer 
                                    p-3 rounded-xl hover:bg-gray-50 
                                    transition-colors">
                    <input
                      type="checkbox"
                      checked={checklistState.understood}
                      onChange={(e) => setChecklistState((prev) => ({
                        ...prev,
                        understood: e.target.checked,
                      }))}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 
                                 text-[#029bba] focus:ring-[#029bba]/20"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        I understand this action is irreversible
                      </p>
                      <p className="text-xs text-gray-500">
                        Sent emails cannot be recalled
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════
              FOOTER — Action Buttons
              ═══════════════════════════════════════════ */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 
                          px-6 py-4 rounded-b-3xl flex items-center 
                          justify-between gap-3">

            {step === 'review' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSending}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 
                             text-gray-700 font-semibold hover:bg-gray-50 
                             transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProceedToConfirm}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl 
                             bg-gradient-to-r from-[#029bba] to-[#004063] 
                             text-white font-black hover:shadow-lg 
                             hover:shadow-[#029bba]/20 transition-all"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('review')}
                  disabled={isSending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl 
                             border border-gray-300 text-gray-700 
                             font-semibold hover:bg-gray-50 transition-colors 
                             disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinalSend}
                  disabled={!allChecklistComplete || isSending}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl 
                              font-black transition-all
                              ${
                                allChecklistComplete && !isSending
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-lg hover:shadow-emerald-500/20'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : sendMode === 'schedule' ? (
                    <>
                      <Calendar className="w-4 h-4" />
                      Schedule Campaign
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Send to {recipientCount.toLocaleString()} Recipients
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendConfirmModal;
// ========== END OF FILE ==========