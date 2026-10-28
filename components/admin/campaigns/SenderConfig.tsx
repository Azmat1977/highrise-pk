// ========== FILE: components/admin/campaigns/SenderConfig.tsx ==========
// 📧 ENTERPRISE SENDER CONFIGURATION — HIGHRISE.PK
// Option C: Default sender + optional per-campaign override
// ═══════════════════════════════════════════════════════════════
// FEATURES:
//   ✅ Default sender identity displayed
//   ✅ Toggle to enable custom override
//   ✅ From Name field (with character limit)
//   ✅ From Email field (with validation)
//   ✅ Reply-To field (with validation)
//   ✅ Real-time email format validation
//   ✅ Inline error messages
//   ✅ Preview of "As users will see it"
//   ✅ Info tooltip explaining each field
//   ✅ Reset to default button
//   ✅ Domain warning for external emails
//   ✅ Best practice recommendations
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useEffect, useState } from 'react';
import {
  Mail,
  User,
  MessageSquare,
  Info,
  AlertCircle,
  RotateCcw,
  Check,
  Settings,
  Eye,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🎨 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_FROM_NAME  = 'Highrise.pk';
const DEFAULT_FROM_EMAIL = 'newsletter@highrise.pk';
const DEFAULT_REPLY_TO   = '';

const MAX_NAME_LENGTH  = 150;
const MAX_EMAIL_LENGTH = 200;

const EMAIL_REGEX = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,63}$/;

const TRUSTED_DOMAINS = ['highrise.pk'];

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

export interface SenderConfigData {
  fromName:  string;
  fromEmail: string;
  replyTo:   string;
}

interface SenderConfigProps {
  value:    SenderConfigData;
  onChange: (value: SenderConfigData) => void;
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

function validateEmail(email: string): boolean {
  if (!email) return true;  // Empty is OK (optional)
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

function isTrustedDomain(email: string): boolean {
  if (!email) return true;
  const lower = email.toLowerCase().trim();
  return TRUSTED_DOMAINS.some((domain) => lower.endsWith(`@${domain}`));
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const SenderConfig: React.FC<SenderConfigProps> = ({ value, onChange }) => {

  // Detect if user has customized any field
  const hasCustomValues = Boolean(
    value.fromName?.trim() ||
    value.fromEmail?.trim() ||
    value.replyTo?.trim()
  );

  const [useCustom, setUseCustom] = useState(hasCustomValues);
  const [showInfo,  setShowInfo]  = useState<string | null>(null);

  // Sync toggle with props (in case parent resets)
  useEffect(() => {
    if (hasCustomValues && !useCustom) {
      setUseCustom(true);
    }
  }, [hasCustomValues, useCustom]);

  // Effective values shown in preview
  const effectiveFromName  = value.fromName?.trim()  || DEFAULT_FROM_NAME;
  const effectiveFromEmail = value.fromEmail?.trim() || DEFAULT_FROM_EMAIL;
  const effectiveReplyTo   = value.replyTo?.trim()   || effectiveFromEmail;

  // Validation state
  const fromEmailValid = validateEmail(value.fromEmail || '');
  const replyToValid   = validateEmail(value.replyTo || '');
  const fromEmailTrusted = isTrustedDomain(value.fromEmail || '');

  // Handlers
  const handleFieldChange = (field: keyof SenderConfigData, val: string) => {
    onChange({ ...value, [field]: val });
  };

  const handleReset = () => {
    onChange({ fromName: '', fromEmail: '', replyTo: '' });
    setUseCustom(false);
  };

  const handleToggleCustom = (enabled: boolean) => {
    setUseCustom(enabled);
    if (!enabled) {
      onChange({ fromName: '', fromEmail: '', replyTo: '' });
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

      {/* ═══════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════ */}
      <div className="px-4 py-3 bg-gradient-to-br from-white to-gray-50 
                      border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#029bba]" />
            <h3 className="text-sm font-black text-[#004063]">
              Sender Identity
            </h3>
          </div>
          {useCustom && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-gray-500 hover:text-[#029bba] 
                         flex items-center gap-1 transition-colors"
              title="Reset to default sender"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          CUSTOM TOGGLE
          ═══════════════════════════════════════════ */}
      <div className="p-4 border-b border-gray-100">
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => handleToggleCustom(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-200 rounded-full peer-checked:bg-[#029bba] 
                            transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full 
                            shadow transition-transform peer-checked:translate-x-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Customize sender for this campaign
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {useCustom
                ? 'Custom sender will be used for this email'
                : 'Using default Highrise.pk sender'}
            </p>
          </div>
        </label>
      </div>

      {/* ═══════════════════════════════════════════
          DEFAULT SENDER DISPLAY (when custom disabled)
          ═══════════════════════════════════════════ */}
      {!useCustom && (
        <div className="p-4 bg-emerald-50 border-b border-emerald-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 
                            flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-emerald-700 uppercase 
                            tracking-wider mb-1">
                Using Default Sender
              </p>
              <p className="text-sm font-bold text-gray-900">
                {DEFAULT_FROM_NAME}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                &lt;{DEFAULT_FROM_EMAIL}&gt;
              </p>
              <p className="text-xs text-emerald-600 mt-2">
                ✓ Verified sender with best deliverability
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          CUSTOM SENDER FIELDS
          ═══════════════════════════════════════════ */}
      {useCustom && (
        <div className="p-4 space-y-4">

          {/* From Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-gray-700 uppercase 
                                tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3" />
                From Name
              </label>
              <button
                type="button"
                onMouseEnter={() => setShowInfo('name')}
                onMouseLeave={() => setShowInfo(null)}
                className="text-gray-400 hover:text-[#029bba]"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="text"
              value={value.fromName || ''}
              onChange={(e) => handleFieldChange('fromName', e.target.value)}
              maxLength={MAX_NAME_LENGTH}
              placeholder={DEFAULT_FROM_NAME}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 
                         focus:ring-2 focus:ring-[#029bba]/20 focus:border-[#029bba] 
                         outline-none text-sm"
            />
            <div className="flex items-center justify-between mt-1">
              {showInfo === 'name' && (
                <p className="text-xs text-gray-500">
                  Display name recipients will see
                </p>
              )}
              <p className="text-xs text-gray-400 ml-auto">
                {(value.fromName || '').length}/{MAX_NAME_LENGTH}
              </p>
            </div>
          </div>

          {/* From Email */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-gray-700 uppercase 
                                tracking-wider flex items-center gap-1.5">
                <Mail className="w-3 h-3" />
                From Email
              </label>
              <button
                type="button"
                onMouseEnter={() => setShowInfo('email')}
                onMouseLeave={() => setShowInfo(null)}
                className="text-gray-400 hover:text-[#029bba]"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="email"
              value={value.fromEmail || ''}
              onChange={(e) => handleFieldChange('fromEmail', e.target.value.toLowerCase())}
              maxLength={MAX_EMAIL_LENGTH}
              placeholder={DEFAULT_FROM_EMAIL}
              className={`w-full px-3 py-2 rounded-xl border 
                          focus:ring-2 outline-none text-sm 
                          ${
                            value.fromEmail && !fromEmailValid
                              ? 'border-red-300 focus:ring-red-100 focus:border-red-500'
                              : 'border-gray-300 focus:ring-[#029bba]/20 focus:border-[#029bba]'
                          }`}
            />
            {showInfo === 'email' && (
              <p className="text-xs text-gray-500 mt-1">
                Email address that will appear as sender
              </p>
            )}
            {value.fromEmail && !fromEmailValid && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Invalid email format
              </p>
            )}
            {value.fromEmail && fromEmailValid && !fromEmailTrusted && (
              <p className="text-xs text-amber-600 mt-1 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                <span>
                  Using external domain may hurt deliverability. 
                  Recommended: use @highrise.pk
                </span>
              </p>
            )}
          </div>

          {/* Reply-To */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-gray-700 uppercase 
                                tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                Reply-To
                <span className="text-gray-400 font-normal normal-case">
                  (optional)
                </span>
              </label>
              <button
                type="button"
                onMouseEnter={() => setShowInfo('reply')}
                onMouseLeave={() => setShowInfo(null)}
                className="text-gray-400 hover:text-[#029bba]"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="email"
              value={value.replyTo || ''}
              onChange={(e) => handleFieldChange('replyTo', e.target.value.toLowerCase())}
              maxLength={MAX_EMAIL_LENGTH}
              placeholder={effectiveFromEmail}
              className={`w-full px-3 py-2 rounded-xl border 
                          focus:ring-2 outline-none text-sm 
                          ${
                            value.replyTo && !replyToValid
                              ? 'border-red-300 focus:ring-red-100 focus:border-red-500'
                              : 'border-gray-300 focus:ring-[#029bba]/20 focus:border-[#029bba]'
                          }`}
            />
            {showInfo === 'reply' && (
              <p className="text-xs text-gray-500 mt-1">
                Where replies go (defaults to From Email if empty)
              </p>
            )}
            {value.replyTo && !replyToValid && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Invalid email format
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          LIVE PREVIEW OF SENDER
          ═══════════════════════════════════════════ */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-3.5 h-3.5 text-[#029bba]" />
          <p className="text-xs font-black text-gray-600 uppercase 
                        tracking-wider">
            How Recipients See It
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br 
                            from-[#029bba] to-[#004063] flex items-center 
                            justify-center flex-shrink-0 text-white 
                            font-black text-sm">
              {effectiveFromName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {effectiveFromName}
              </p>
              <p className="text-xs text-gray-500 truncate">
                &lt;{effectiveFromEmail}&gt;
              </p>
              {effectiveReplyTo !== effectiveFromEmail && (
                <p className="text-xs text-gray-400 mt-1 truncate">
                  ↩ Reply to: {effectiveReplyTo}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          BEST PRACTICE TIP
          ═══════════════════════════════════════════ */}
      {useCustom && (
        <div className="p-3 bg-[#029bba]/5 border-t border-[#029bba]/10">
          <div className="flex items-start gap-2">
            <Settings className="w-3.5 h-3.5 text-[#029bba] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-700">
              <strong>Pro Tip:</strong> Use a recognizable sender name that 
              matches your brand. Consistent sender identity builds trust and 
              improves open rates.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SenderConfig;
// ========== END OF FILE ==========