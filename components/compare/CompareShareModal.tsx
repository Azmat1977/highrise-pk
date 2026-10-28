/**
 * components/compare/CompareShareModal.tsx
 *
 * Portal-rendered share modal for comparison URL.
 * Uses existing shareId system in Comparison model.
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  X,
  Share2,
  Copy,
  Check,
  Loader2,
  MessageCircle,
  Mail,
  Facebook,
  Twitter,
  Linkedin,
} from 'lucide-react';

export interface CompareShareModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  shareUrl: string | null;
  loading:  boolean;
  itemCount: number;
}

export default function CompareShareModal({
  isOpen,
  onClose,
  shareUrl,
  loading,
  itemCount,
}: CompareShareModalProps): React.ReactElement | null {

  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity  = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
        setCopyState('copied');
        setTimeout(() => setCopyState('idle'), 2500);
      } catch {
        setCopyState('error');
      }
      document.body.removeChild(textarea);
    }
  }, [shareUrl]);

  const shareText = `Check out my property comparison on Highrise.pk (${itemCount} items)`;

  const shareChannels = [
    {
      id:    'whatsapp',
      label: 'WhatsApp',
      icon:  <MessageCircle className="w-4 h-4" />,
      color: 'bg-[#25D366]/10 text-[#128C7E] border-[#25D366]/20 hover:bg-[#25D366]/20',
      url:   shareUrl
             ? `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`
             : '',
    },
    {
      id:    'email',
      label: 'Email',
      icon:  <Mail className="w-4 h-4" />,
      color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
      url:   shareUrl
             ? `mailto:?subject=${encodeURIComponent('Property Comparison')}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`
             : '',
    },
    {
      id:    'facebook',
      label: 'Facebook',
      icon:  <Facebook className="w-4 h-4" />,
      color: 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20 hover:bg-[#1877F2]/20',
      url:   shareUrl
             ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
             : '',
    },
    {
      id:    'twitter',
      label: 'X (Twitter)',
      icon:  <Twitter className="w-4 h-4" />,
      color: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
      url:   shareUrl
             ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
             : '',
    },
    {
      id:    'linkedin',
      label: 'LinkedIn',
      icon:  <Linkedin className="w-4 h-4" />,
      color: 'bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/20 hover:bg-[#0A66C2]/20',
      url:   shareUrl
             ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
             : '',
    },
  ];

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-compare-title"
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

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">

          {/* Header */}
          <div className="flex items-center justify-between p-5
                          border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#029bba]/10
                              flex items-center justify-center">
                <Share2 className="w-4 h-4 text-[#029bba]" />
              </div>
              <div>
                <h2 id="share-compare-title"
                    className="text-base font-black text-gray-900">
                  Share Comparison
                </h2>
                <p className="text-xs text-gray-400 font-semibold">
                  {itemCount} items · via Highrise.pk
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 text-gray-400 hover:text-gray-600
                         hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">

            {loading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="w-6 h-6 text-[#029bba] animate-spin" />
                <p className="text-sm text-gray-500 font-semibold">
                  Generating share link...
                </p>
              </div>
            ) : shareUrl ? (
              <>
                {/* Link display + copy */}
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase
                                tracking-widest mb-2">
                    Shareable Link
                  </p>
                  <div className="flex items-center gap-2 bg-gray-50
                                  border-2 border-gray-100 rounded-xl p-2">
                    <code className="flex-1 text-xs text-gray-700 truncate px-2">
                      {shareUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => void handleCopy()}
                      className={`inline-flex items-center gap-1 px-3 py-1.5
                                  rounded-lg text-xs font-black transition-colors
                                  ${copyState === 'copied'
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-[#029bba] text-white hover:bg-[#017a94]'
                                  }`}
                    >
                      {copyState === 'copied' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Share channels */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <p className="text-[10px] font-black text-gray-400
                                  uppercase tracking-widest">
                      Or Share Via
                    </p>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {shareChannels.map(ch => (
                      <a
                        key={ch.id}
                        href={ch.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Share via ${ch.label}`}
                        className={`flex flex-col items-center gap-1
                                    px-2 py-3 rounded-2xl border
                                    ${ch.color}
                                    transition-all duration-200
                                    focus:outline-none focus:ring-2 focus:ring-[#029bba]/40
                                    active:scale-95`}
                      >
                        {ch.icon}
                        <span className="text-[9px] font-bold leading-tight
                                         text-center">
                          {ch.label}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-red-600 font-bold">
                  Failed to generate share link
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Please try again in a moment
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}