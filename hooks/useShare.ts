/**
 * hooks/useShare.ts
 *
 * Enterprise share hook for Highrise.pk project cards.
 *
 * Features:
 *   → Web Share API (native mobile sheet)
 *   → Per-channel UTM URL generation
 *   → QR code generation (qrcode package)
 *   → Share event logging (POST /api/projects/share)
 *   → Copy-to-clipboard with feedback
 *   → Print-friendly trigger
 *   → Zero external state dependencies
 *
 * Rules:
 *   → No framer-motion
 *   → No toast libraries
 *   → Lucide icons only (in consuming component)
 *   → Works 100% without login (guest-first)
 */

import { useState, useCallback, useRef } from 'react';
import type QRCode from 'qrcode';
import type { ShareChannel, ShareEvent } from '@/types/projects';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface ShareTarget {
  projectId:   string;
  projectSlug: string;
  projectName: string;
  city:        string;
  area:        string;
  minPrice:    number | null;
  maxPrice:    number | null;
  priceOnRequest: boolean;
  shieldScore: number;
  primaryImage: string | null;
  developerName: string;
  nocStatus:   'approved' | 'pending' | 'not_applied';
}

export interface UseShareReturn {
  // State
  copyState:   'idle' | 'copied' | 'error';
  qrDataUrl:   string | null;
  qrLoading:   boolean;
  shareLoading: boolean;

  // Actions
  shareViaChannel:   (channel: ShareChannel, target: ShareTarget) => Promise<void>;
  generateQrCode:    (target: ShareTarget) => Promise<void>;
  triggerNativeShare:(target: ShareTarget) => Promise<boolean>;
  canNativeShare:    boolean;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://highrise.pk';

// ─── URL BUILDER ─────────────────────────────────────────────────────────────

function buildShareUrl(
  slug: string,
  channel: ShareChannel,
): string {
  const base = `${BASE_URL}/projects/${slug}`;
  const params = new URLSearchParams({
    utm_source:   'highrise_share',
    utm_medium:   channel,
    utm_campaign: slug,
    utm_content:  'project_card',
  });
  return `${base}?${params.toString()}`;
}

// ─── MESSAGE BUILDER ─────────────────────────────────────────────────────────

function buildWhatsAppMessage(target: ShareTarget, url: string): string {
  const priceStr = target.priceOnRequest
    ? 'Price on Request'
    : target.minPrice && target.maxPrice
      ? `PKR ${formatPKRShort(target.minPrice)} – ${formatPKRShort(target.maxPrice)}`
      : target.minPrice
        ? `PKR ${formatPKRShort(target.minPrice)}+`
        : 'Contact for Price';

  const nocStr = target.nocStatus === 'approved' ? '✅ NOC Approved' : '';
  const shieldStr = `🛡️ Shield Score: ${target.shieldScore}/100`;
  const location = [target.area, target.city].filter(Boolean).join(', ');

  return [
    `🏢 *${target.projectName}*`,
    `📍 ${location}`,
    `💰 ${priceStr}`,
    shieldStr,
    nocStr,
    ``,
    `🔗 View on Highrise.pk:`,
    url,
    ``,
    `_Pakistan's most trusted property portal_`,
  ]
    .filter(line => line !== null && line !== undefined)
    .join('\n');
}

function buildEmailBody(target: ShareTarget, url: string): string {
  const priceStr = target.priceOnRequest
    ? 'Price on Request'
    : target.minPrice && target.maxPrice
      ? `PKR ${formatPKRShort(target.minPrice)} – ${formatPKRShort(target.maxPrice)}`
      : target.minPrice
        ? `PKR ${formatPKRShort(target.minPrice)}+`
        : 'Contact for Price';

  const location = [target.area, target.city].filter(Boolean).join(', ');

  return [
    `I found this property on Highrise.pk and wanted to share it with you:`,
    ``,
    `Project: ${target.projectName}`,
    `Developer: ${target.developerName}`,
    `Location: ${location}`,
    `Price: ${priceStr}`,
    `Shield Score: ${target.shieldScore}/100`,
    target.nocStatus === 'approved' ? `NOC Status: Approved ✓` : '',
    ``,
    `View full details: ${url}`,
    ``,
    `— Shared via Highrise.pk`,
    `Pakistan's most trusted property portal`,
  ]
    .filter(line => line !== null)
    .join('\n');
}

// ─── PKR FORMATTER (standalone — no import to keep hook self-contained) ───────

function formatPKRShort(amount: number): string {
  if (amount >= 1_000_000_000) {
    const v = amount / 1_000_000_000;
    return `${v % 1 === 0 ? v : v.toFixed(1)} Arab`;
  }
  if (amount >= 10_000_000) {
    const v = amount / 10_000_000;
    return `${v % 1 === 0 ? v : v.toFixed(1)} Cr`;
  }
  if (amount >= 100_000) {
    const v = amount / 100_000;
    return `${v % 1 === 0 ? v : v.toFixed(1)} Lakh`;
  }
  return amount.toLocaleString('en-PK');
}

// ─── LOG SHARE EVENT ─────────────────────────────────────────────────────────

async function logShareEvent(event: ShareEvent): Promise<void> {
  try {
    await fetch('/api/projects/share', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(event),
    });
  } catch {
    // Non-critical — never block user action on analytics failure
  }
}

// ─── MAIN HOOK ───────────────────────────────────────────────────────────────

export function useShare(): UseShareReturn {
  const [copyState,    setCopyState]    = useState<'idle' | 'copied' | 'error'>('idle');
  const [qrDataUrl,    setQrDataUrl]    = useState<string | null>(null);
  const [qrLoading,    setQrLoading]    = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  // Debounce copy reset
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canNativeShare =
    typeof navigator !== 'undefined' && Boolean(navigator.share);

  // ── Native Share API ────────────────────────────────────────────────────────
  const triggerNativeShare = useCallback(
    async (target: ShareTarget): Promise<boolean> => {
      if (!canNativeShare) return false;

      const url = buildShareUrl(target.projectSlug, 'native');
      const location = [target.area, target.city].filter(Boolean).join(', ');

      try {
        await navigator.share({
          title: target.projectName,
          text:  `${target.projectName} — ${location} | Highrise.pk`,
          url,
        });

        void logShareEvent({
          projectId:   target.projectId,
          projectSlug: target.projectSlug,
          channel:     'native',
          timestamp:   new Date().toISOString(),
          utmSource:   'highrise_share',
          utmMedium:   'native',
          utmCampaign: target.projectSlug,
        });

        return true;
      } catch (err) {
        // User cancelled — not an error
        if (err instanceof Error && err.name === 'AbortError') return false;
        return false;
      }
    },
    [canNativeShare],
  );

  // ── Per-Channel Share ───────────────────────────────────────────────────────
  const shareViaChannel = useCallback(
    async (channel: ShareChannel, target: ShareTarget): Promise<void> => {
      setShareLoading(true);

      const url      = buildShareUrl(target.projectSlug, channel);
      const location = [target.area, target.city].filter(Boolean).join(', ');

      try {
        switch (channel) {

          // ── WhatsApp ────────────────────────────────────────────────────────
          case 'whatsapp': {
            const msg = buildWhatsAppMessage(target, url);
            const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
            window.open(waUrl, '_blank', 'noopener,noreferrer');
            break;
          }

          // ── Facebook ────────────────────────────────────────────────────────
          case 'facebook': {
            const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
            window.open(fbUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
            break;
          }

          // ── Twitter / X ─────────────────────────────────────────────────────
          case 'twitter': {
            const priceStr = target.priceOnRequest
              ? ''
              : target.minPrice
                ? ` | PKR ${formatPKRShort(target.minPrice)}+`
                : '';
            const tweet = `🏢 ${target.projectName} — ${location}${priceStr} | 🛡️ Shield ${target.shieldScore}/100\n\nView on @HighrisePK:`;
            const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(url)}`;
            window.open(twUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
            break;
          }

          // ── LinkedIn ────────────────────────────────────────────────────────
          case 'linkedin': {
            const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
            window.open(liUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
            break;
          }

          // ── Email ────────────────────────────────────────────────────────────
          // Handled by ShareMenu's email panel — NOT mailto:
          // This case is a no-op; the UI shows provider buttons directly.
          case 'email': {
            // Email sharing is handled by ShareMenu's email provider panel.
            // This case intentionally does nothing — the channel click
            // toggles the email panel visibility in ShareMenu.tsx.
            break;
          }

          // ── Copy Link ────────────────────────────────────────────────────────
          case 'copy_link': {
            if (copyResetTimer.current) {
              clearTimeout(copyResetTimer.current);
            }
            try {
              await navigator.clipboard.writeText(url);
              setCopyState('copied');
            } catch {
              // Fallback for older browsers / non-HTTPS
              const textarea = document.createElement('textarea');
              textarea.value = url;
              textarea.style.position = 'fixed';
              textarea.style.opacity  = '0';
              document.body.appendChild(textarea);
              textarea.focus();
              textarea.select();
              try {
                document.execCommand('copy');
                setCopyState('copied');
              } catch {
                setCopyState('error');
              }
              document.body.removeChild(textarea);
            }
            copyResetTimer.current = setTimeout(
              () => setCopyState('idle'),
              2500,
            );
            break;
          }

          // ── QR Code ─────────────────────────────────────────────────────────
          // QR generation is handled separately via generateQrCode()
          // This case just logs the event
          case 'qr_code': {
            break;
          }

          // ── Native ───────────────────────────────────────────────────────────
          case 'native': {
            await triggerNativeShare(target);
            break;
          }
        }

        // Log event for all channels except copy_link
        // (copy_link sets its own state, no need to double-fire)
        if (channel !== 'copy_link' && channel !== 'qr_code') {
          void logShareEvent({
            projectId:   target.projectId,
            projectSlug: target.projectSlug,
            channel,
            timestamp:   new Date().toISOString(),
            utmSource:   'highrise_share',
            utmMedium:   channel,
            utmCampaign: target.projectSlug,
          });
        }

      } finally {
        setShareLoading(false);
      }
    },
    [triggerNativeShare],
  );

  // ── QR Code Generation ──────────────────────────────────────────────────────
  const generateQrCode = useCallback(
    async (target: ShareTarget): Promise<void> => {
      setQrLoading(true);
      try {
        const url = buildShareUrl(target.projectSlug, 'qr_code');

        // Dynamic import — code-splits qrcode from main bundle
        const QRCodeLib = await import('qrcode') as typeof QRCode;

        const dataUrl = await QRCodeLib.toDataURL(url, {
          width:           256,
          margin:          2,
          color: {
            dark:  '#004063', // Highrise Navy
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });

        setQrDataUrl(dataUrl);

        void logShareEvent({
          projectId:   target.projectId,
          projectSlug: target.projectSlug,
          channel:     'qr_code',
          timestamp:   new Date().toISOString(),
          utmSource:   'highrise_share',
          utmMedium:   'qr_code',
          utmCampaign: target.projectSlug,
        });

      } catch (err) {
        console.error('[useShare] QR generation failed:', err);
      } finally {
        setQrLoading(false);
      }
    },
    [],
  );

  return {
    copyState,
    qrDataUrl,
    qrLoading,
    shareLoading,
    shareViaChannel,
    generateQrCode,
    triggerNativeShare,
    canNativeShare,
  };
}

// ─── EMAIL PROVIDER HELPERS ───────────────────────────────────────────────────
// Direct compose URLs for major email providers.
// These open the provider's compose window pre-filled with project details.
// No mailto: interception by Chrome.

export interface EmailShareData {
  subject: string;
  body:    string;
}

export function buildEmailShareData(target: ShareTarget): EmailShareData {
  const url = buildShareUrl(target.projectSlug, 'email');

  const priceStr = target.priceOnRequest
    ? 'Price on Request'
    : target.minPrice && target.maxPrice
      ? `PKR ${formatPKRShort(target.minPrice)} – ${formatPKRShort(target.maxPrice)}`
      : target.minPrice
        ? `PKR ${formatPKRShort(target.minPrice)}+`
        : 'Contact for Price';

  const location = [target.area, target.city].filter(Boolean).join(', ');

  const subject = `Check out ${target.projectName} on Highrise.pk`;

  const body = [
    `I found this property on Highrise.pk and wanted to share it with you:`,
    ``,
    `Project: ${target.projectName}`,
    `Developer: ${target.developerName}`,
    `Location: ${location}`,
    `Price: ${priceStr}`,
    `Shield Score: ${target.shieldScore}/100`,
    target.nocStatus === 'approved' ? `NOC Status: Approved ✓` : '',
    ``,
    `View full details: ${url}`,
    ``,
    `— Shared via Highrise.pk`,
    `Pakistan's most trusted property portal`,
  ]
    .filter(line => line !== null)
    .join('\n');

  return { subject, body };
}

export type EmailProvider = 'gmail' | 'outlook' | 'yahoo';

export function getEmailProviderUrl(
  provider: EmailProvider,
  data: EmailShareData,
): string {
  const subject = encodeURIComponent(data.subject);
  const body    = encodeURIComponent(data.body);

  switch (provider) {
    case 'gmail':
      return `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`;
    case 'outlook':
      return `https://outlook.live.com/mail/0/deeplink/compose?subject=${subject}&body=${body}`;
    case 'yahoo':
      return `https://compose.mail.yahoo.com/?subject=${subject}&body=${body}`;
  }
}