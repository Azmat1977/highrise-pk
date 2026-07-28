/**
 * components/projects/ShareMenu.tsx
 *
 * Enterprise share modal for Highrise.pk project cards.
 *
 * Features:
 *   → 8 share channels (WhatsApp, Facebook, Twitter, LinkedIn,
 *     Email, Copy Link, QR Code, Print)
 *   → Email: Gmail / Outlook / Yahoo direct compose (no mailto:)
 *   → QR code generation (qrcode package — dynamic import)
 *   → UTM tracking on all share URLs
 *   → Share event logging (POST /api/projects/share)
 *   → Inline copy feedback ("Copied!")
 *   → Project preview card in modal
 *   → Print-friendly trigger
 *   → Full keyboard + ARIA accessibility
 *   → Portal render (outside parent Link DOM tree)
 *
 * Rules:
 *   → Tailwind only (zero inline styles)
 *   → Lucide React icons only
 *   → No framer-motion
 *   → Mobile-first (375px min)
 *   → Works 100% without login
 */

'use client';

import React, { useEffect, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import {
  X,
  Share2,
  Copy,
  Check,
  AlertCircle,
  MessageCircle,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  QrCode,
  ExternalLink,
  ShieldCheck,
  MapPin,
  Building2,
  Loader2,
  ChevronLeft,
  ClipboardCopy,
} from 'lucide-react';

import {
  useShare,
  buildEmailShareData,
  getEmailProviderUrl,
  type ShareTarget,
  type EmailProvider,
} from '@/hooks/useShare';
import type { ProjectListing }  from '@/types/projects';
import { formatPriceRange }     from '@/types/projects';

// ─── PROPS ───────────────────────────────────────────────────────────────────

export interface ShareMenuProps {
  project:  ProjectListing;
  isOpen:   boolean;
  onClose:  () => void;
}

// ─── VIEWS ───────────────────────────────────────────────────────────────────

type ShareView = 'main' | 'email' | 'qr';

// ─── CHANNEL CONFIG ──────────────────────────────────────────────────────────

interface ChannelConfig {
  id:      string;
  label:   string;
  icon:    React.ReactElement;
  bg:      string;
  text:    string;
  border:  string;
  hoverBg: string;
}

function getChannelConfig(
  copyState: 'idle' | 'copied' | 'error',
): ChannelConfig[] {
  return [
    {
      id:      'whatsapp',
      label:   'WhatsApp',
      icon:    <MessageCircle className="w-5 h-5" />,
      bg:      'bg-[#25D366]/10',
      text:    'text-[#128C7E]',
      border:  'border-[#25D366]/20',
      hoverBg: 'hover:bg-[#25D366]/20',
    },
    {
      id:      'facebook',
      label:   'Facebook',
      icon:    <Facebook className="w-5 h-5" />,
      bg:      'bg-[#1877F2]/10',
      text:    'text-[#1877F2]',
      border:  'border-[#1877F2]/20',
      hoverBg: 'hover:bg-[#1877F2]/20',
    },
    {
      id:      'twitter',
      label:   'X (Twitter)',
      icon:    <Twitter className="w-5 h-5" />,
      bg:      'bg-gray-100',
      text:    'text-gray-800',
      border:  'border-gray-200',
      hoverBg: 'hover:bg-gray-200',
    },
    {
      id:      'linkedin',
      label:   'LinkedIn',
      icon:    <Linkedin className="w-5 h-5" />,
      bg:      'bg-[#0A66C2]/10',
      text:    'text-[#0A66C2]',
      border:  'border-[#0A66C2]/20',
      hoverBg: 'hover:bg-[#0A66C2]/20',
    },
    {
      id:      'email',
      label:   'Email',
      icon:    <Mail className="w-5 h-5" />,
      bg:      'bg-amber-50',
      text:    'text-amber-700',
      border:  'border-amber-200',
      hoverBg: 'hover:bg-amber-100',
    },
    {
      id:      'copy_link',
      label:   copyState === 'copied'
                 ? 'Copied!'
                 : copyState === 'error'
                   ? 'Failed'
                   : 'Copy Link',
      icon:    copyState === 'copied'
                 ? <Check className="w-5 h-5" />
                 : copyState === 'error'
                   ? <AlertCircle className="w-5 h-5" />
                   : <Copy className="w-5 h-5" />,
      bg:      copyState === 'copied'
                 ? 'bg-emerald-50'
                 : copyState === 'error'
                   ? 'bg-red-50'
                   : 'bg-[#029bba]/10',
      text:    copyState === 'copied'
                 ? 'text-emerald-700'
                 : copyState === 'error'
                   ? 'text-red-700'
                   : 'text-[#029bba]',
      border:  copyState === 'copied'
                 ? 'border-emerald-200'
                 : copyState === 'error'
                   ? 'border-red-200'
                   : 'border-[#029bba]/20',
      hoverBg: copyState === 'copied'
                 ? 'hover:bg-emerald-100'
                 : 'hover:bg-[#029bba]/20',
    },
    {
      id:      'qr_code',
      label:   'QR Code',
      icon:    <QrCode className="w-5 h-5" />,
      bg:      'bg-purple-50',
      text:    'text-purple-700',
      border:  'border-purple-200',
      hoverBg: 'hover:bg-purple-100',
    },
  ];
}

// ─── EMAIL PROVIDER CONFIG ────────────────────────────────────────────────────

interface EmailProviderConfig {
  id:    EmailProvider;
  label: string;
  icon:  string;    // emoji — no external icon library needed
  bg:    string;
  text:  string;
  hover: string;
}

const EMAIL_PROVIDERS: EmailProviderConfig[] = [
  {
    id:    'gmail',
    label: 'Open in Gmail',
    icon:  '📧',
    bg:    'bg-red-50',
    text:  'text-red-700',
    hover: 'hover:bg-red-100',
  },
  {
    id:    'outlook',
    label: 'Open in Outlook / Hotmail',
    icon:  '📬',
    bg:    'bg-blue-50',
    text:  'text-blue-700',
    hover: 'hover:bg-blue-100',
  },
  {
    id:    'yahoo',
    label: 'Open in Yahoo Mail',
    icon:  '💌',
    bg:    'bg-purple-50',
    text:  'text-purple-700',
    hover: 'hover:bg-purple-100',
  },
];

// ─── PROJECT PREVIEW CARD ────────────────────────────────────────────────────

function ProjectPreview({
  project,
}: {
  project: ProjectListing;
}): React.ReactElement {
  const priceStr  = formatPriceRange(
    project.minPrice,
    project.maxPrice,
    project.priceOnRequest,
  );
  const location  = [project.area, project.city].filter(Boolean).join(', ');

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl
                    border border-gray-100 p-4 flex items-center gap-4">
      <div className="relative w-16 h-16 rounded-xl overflow-hidden
                      bg-gray-100 flex-shrink-0">
        {project.primaryImage ? (
          <Image
            src={project.primaryImage}
            alt={project.projectName}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br
                          from-[#004063]/10 to-[#029bba]/10
                          flex items-center justify-center">
            <Building2 className="w-6 h-6 text-[#029bba]/40" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-black text-sm text-gray-900 truncate leading-tight">
          {project.projectName}
        </p>
        {location && (
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <p className="text-xs text-gray-500 truncate">{location}</p>
          </div>
        )}
        <p className="text-sm font-black text-[#029bba] mt-1">{priceStr}</p>
      </div>

      <div className="flex flex-col items-center flex-shrink-0">
        <ShieldCheck className={`w-5 h-5 ${
          project.shield.total >= 80 ? 'text-emerald-500' :
          project.shield.total >= 60 ? 'text-[#029bba]' :
          project.shield.total >= 40 ? 'text-amber-500' :
          'text-gray-300'
        }`} />
        <span className="text-[10px] font-black text-gray-600 mt-0.5">
          {project.shield.total}
        </span>
      </div>
    </div>
  );
}

// ─── EMAIL PANEL ──────────────────────────────────────────────────────────────

function EmailPanel({
  target,
  onBack,
  onLogEvent,
}: {
  target:     ShareTarget;
  onBack:     () => void;
  onLogEvent: () => void;
}): React.ReactElement {
  const emailData   = buildEmailShareData(target);
  const [copied, setCopied] = useState(false);

  const handleProvider = (provider: EmailProvider) => {
    const url = getEmailProviderUrl(provider, emailData);
    window.open(url, '_blank', 'noopener,noreferrer');
    onLogEvent();
  };

  const handleCopyContent = async () => {
    const content = `Subject: ${emailData.subject}\n\n${emailData.body}`;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity  = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // silent fail
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-bold
                   text-gray-500 hover:text-[#029bba] transition-colors
                   focus:outline-none"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to share options
      </button>

      {/* Email provider heading */}
      <div>
        <h3 className="text-sm font-black text-gray-900 mb-1">
          Choose Your Email Provider
        </h3>
        <p className="text-xs text-gray-500">
          Opens a pre-filled compose window — just add the recipient&apos;s email and send.
        </p>
      </div>

      {/* Provider buttons */}
      <div className="space-y-2">
        {EMAIL_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => handleProvider(provider.id)}
            className={`w-full flex items-center gap-3 px-4 py-3.5
                       rounded-2xl border border-gray-100
                       ${provider.bg} ${provider.text} ${provider.hover}
                       text-sm font-bold transition-all duration-200
                       focus:outline-none focus:ring-2 focus:ring-[#029bba]/40
                       active:scale-[0.98]`}
          >
            <span className="text-xl">{provider.icon}</span>
            <span className="flex-1 text-left">{provider.label}</span>
            <ExternalLink className="w-4 h-4 opacity-50" />
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-100" />
        <p className="text-[10px] font-black text-gray-400 uppercase
                      tracking-wider">
          Or
        </p>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Copy email content */}
      <button
        type="button"
        onClick={() => void handleCopyContent()}
        className={`w-full flex items-center justify-center gap-2
                   px-4 py-3 rounded-2xl border-2 transition-all duration-200
                   text-sm font-bold focus:outline-none focus:ring-2
                   focus:ring-[#029bba]/40 active:scale-[0.98]
                   ${copied
                     ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                     : 'border-gray-200 bg-white text-gray-700 hover:border-[#029bba]/30 hover:text-[#029bba]'
                   }`}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Content Copied! Paste into any email app
          </>
        ) : (
          <>
            <ClipboardCopy className="w-4 h-4" />
            Copy Email Content
          </>
        )}
      </button>

      {/* Preview of email content */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
        <p className="text-[10px] font-black text-gray-400 uppercase
                      tracking-wider mb-2">
          Email Preview
        </p>
        <p className="text-xs font-bold text-gray-700 mb-1">
          Subject: {emailData.subject}
        </p>
        <p className="text-[11px] text-gray-500 whitespace-pre-line
                      line-clamp-4 leading-relaxed">
          {emailData.body}
        </p>
      </div>
    </div>
  );
}

// ─── QR PANEL ─────────────────────────────────────────────────────────────────

function QrPanel({
  qrDataUrl,
  qrLoading,
  projectName,
  projectSlug,
  onBack,
  onGenerate,
}: {
  qrDataUrl:   string | null;
  qrLoading:   boolean;
  projectName: string;
  projectSlug: string;
  onBack:      () => void;
  onGenerate:  () => void;
}): React.ReactElement {

  // Auto-generate when panel mounts
  useEffect(() => {
    if (!qrDataUrl && !qrLoading) {
      onGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href     = qrDataUrl;
    a.download = `highrise-${projectSlug}-qr.png`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-bold
                   text-gray-500 hover:text-[#029bba] transition-colors
                   focus:outline-none"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to share options
      </button>

      {/* QR content */}
      <div className="flex flex-col items-center gap-4 py-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          Scan to View Project
        </p>

        {qrLoading ? (
          <div className="w-40 h-40 flex items-center justify-center
                          bg-gray-50 rounded-2xl">
            <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
          </div>
        ) : qrDataUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR code for ${projectName}`}
              className="w-40 h-40 rounded-2xl border-2 border-gray-100"
            />
            <p className="text-xs text-gray-400 text-center max-w-[200px]">
              Point your camera at this QR code to open the project page
            </p>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2
                         rounded-xl bg-[#029bba]/10 text-[#029bba]
                         text-xs font-bold hover:bg-[#029bba]/20
                         transition-colors focus:outline-none
                         focus:ring-2 focus:ring-[#029bba]/40"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Download QR Image
            </button>
          </>
        ) : (
          <div className="w-40 h-40 flex items-center justify-center
                          bg-gray-50 rounded-2xl">
            <p className="text-xs text-gray-400">Failed to generate</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ShareMenu({
  project,
  isOpen,
  onClose,
}: ShareMenuProps): React.ReactElement | null {

  const [view, setView] = useState<ShareView>('main');

  const {
    copyState,
    qrDataUrl,
    qrLoading,
    shareViaChannel,
    generateQrCode,
  } = useShare();

  // Build ShareTarget from ProjectListing
  const target: ShareTarget = {
    projectId:      project._id,
    projectSlug:    project.slug,
    projectName:    project.projectName,
    city:           project.city,
    area:           project.area,
    minPrice:       project.minPrice,
    maxPrice:       project.maxPrice,
    priceOnRequest: project.priceOnRequest,
    shieldScore:    project.shield.total,
    primaryImage:   project.primaryImage,
    developerName:  project.developerName,
    nocStatus:      project.nocStatus,
  };

  // ── Reset view when modal opens ──────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setView('main');
    }
  }, [isOpen]);

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
      if (e.key === 'Escape') {
        if (view !== 'main') {
          setView('main');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, view]);

  // ── Channel click handler ──────────────────────────────────────────────────
  const handleChannel = useCallback(
    async (channelId: string) => {
      if (channelId === 'email') {
        setView('email');
        return;
      }

      if (channelId === 'qr_code') {
        setView('qr');
        return;
      }

      await shareViaChannel(
        channelId as Parameters<typeof shareViaChannel>[0],
        target,
      );
    },
    [target, shareViaChannel],
  );

  // ── Email log event ────────────────────────────────────────────────────────
  const handleEmailLog = useCallback(() => {
    void shareViaChannel('email', target);
  }, [shareViaChannel, target]);

  // ── QR generate ────────────────────────────────────────────────────────────
  const handleQrGenerate = useCallback(() => {
    void generateQrCode(target);
  }, [generateQrCode, target]);

  if (!isOpen) return null;

  const channels = getChannelConfig(copyState);

  const modalContent = (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex min-h-full items-center justify-center p-4">

        {/* ── Backdrop ── */}
        <div
          className="fixed inset-0 bg-black/50"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-hidden="true"
        />

        {/* ── Modal Panel ── */}
        <div className="relative bg-white rounded-2xl shadow-xl
                        w-full max-w-md">

          {/* ── Header ── */}
          <div className="flex items-center justify-between p-5
                          border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#029bba]/10
                              flex items-center justify-center">
                <Share2 className="w-4 h-4 text-[#029bba]" />
              </div>
              <div>
                <h2
                  id="share-modal-title"
                  className="text-base font-black text-gray-900"
                >
                  {view === 'email'
                    ? 'Share via Email'
                    : view === 'qr'
                      ? 'QR Code'
                      : 'Share This Project'}
                </h2>
                <p className="text-xs text-gray-400 font-semibold">
                  via Highrise.pk
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close share menu"
              className="p-2 text-gray-400 hover:text-gray-600
                         hover:bg-gray-100 rounded-xl transition-colors
                         focus:outline-none focus:ring-2
                         focus:ring-[#029bba]/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="p-5 space-y-4">

            {/* Project preview — always visible */}
            <ProjectPreview project={project} />

            {/* ══════ VIEW: MAIN ══════ */}
            {view === 'main' && (
              <>
                {/* Hero share buttons — WhatsApp + Email */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void handleChannel('whatsapp')}
                    className="w-full flex items-center justify-center gap-2
                               py-3 rounded-2xl bg-[#25D366] text-white
                               text-sm font-black hover:bg-[#1da851]
                               transition-colors duration-200
                               focus:outline-none focus:ring-2
                               focus:ring-[#25D366]/50
                               active:scale-[0.98]"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Share on WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleChannel('email')}
                    className="w-full flex items-center justify-center gap-2
                               py-3 rounded-2xl bg-white border-2
                               border-gray-200 text-gray-700
                               text-sm font-black hover:border-[#029bba]/40
                               hover:text-[#029bba] hover:bg-[#029bba]/5
                               transition-colors duration-200
                               focus:outline-none focus:ring-2
                               focus:ring-[#029bba]/30
                               active:scale-[0.98]"
                  >
                    <Mail className="w-4 h-4" />
                    Share via Email
                  </button>
                </div>

                {/* Secondary channel grid */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <p className="text-[10px] font-black text-gray-400 uppercase
                                  tracking-wider">
                      More Options
                    </p>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {channels
                      .filter(ch =>
                        ch.id !== 'whatsapp' && ch.id !== 'email',
                      )
                      .map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => void handleChannel(ch.id)}
                          aria-label={`Share via ${ch.label}`}
                          className={`
                            flex flex-col items-center gap-1.5
                            px-2 py-3 rounded-2xl border
                            ${ch.bg} ${ch.text} ${ch.border} ${ch.hoverBg}
                            transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-[#029bba]/40
                            active:scale-95
                          `}
                        >
                          {ch.icon}
                          <span className="text-[10px] font-bold leading-tight
                                           text-center">
                            {ch.label}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Copy feedback strip */}
                {copyState === 'copied' && (
                  <div className="flex items-center gap-2 px-4 py-2.5
                                  rounded-xl bg-emerald-50 border
                                  border-emerald-200">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <p className="text-xs font-bold text-emerald-700">
                      Link copied to clipboard! Share it anywhere.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ══════ VIEW: EMAIL ══════ */}
            {view === 'email' && (
              <EmailPanel
                target={target}
                onBack={() => setView('main')}
                onLogEvent={handleEmailLog}
              />
            )}

            {/* ══════ VIEW: QR CODE ══════ */}
            {view === 'qr' && (
              <QrPanel
                qrDataUrl={qrDataUrl}
                qrLoading={qrLoading}
                projectName={project.projectName}
                projectSlug={project.slug}
                onBack={() => setView('main')}
                onGenerate={handleQrGenerate}
              />
            )}

            {/* Footer */}
            <div className="flex items-center justify-center gap-1.5
                            pt-1 border-t border-gray-50">
              <ShieldCheck className="w-3.5 h-3.5 text-[#029bba]" />
              <p className="text-[10px] text-gray-400 font-semibold">
                Shared via{' '}
                <span className="text-[#029bba] font-black">Highrise.pk</span>
                {' '}— Pakistan&apos;s most trusted property portal
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    modalContent,
    document.body,
  );
}