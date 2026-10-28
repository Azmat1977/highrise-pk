// ========== FILE: components/admin/campaigns/LivePreview.tsx ==========
// 📱 ENTERPRISE LIVE PREVIEW — HIGHRISE.PK
// Real-time email preview with device toggle + inbox simulation
// ═══════════════════════════════════════════════════════════════
// FEATURES:
//   ✅ Real-time preview updates as user types
//   ✅ Device toggle: Desktop / Tablet / Mobile
//   ✅ Gmail-style inbox header simulation
//   ✅ Dark mode preview toggle
//   ✅ Iframe isolation (email HTML sandboxed)
//   ✅ Debounced rendering (300ms) for performance
//   ✅ Loading state during render
//   ✅ Zoom controls for detailed inspection
//   ✅ Reload button
//   ✅ Full-screen preview mode
//   ✅ Sender info displayed (from name/email)
//   ✅ Preview text (inbox snippet) displayed
//   ✅ Timestamp shown ("Just now")
//   ✅ Responsive frame graphics
// ═══════════════════════════════════════════════════════════════

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Sun,
  Moon,
  RefreshCw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Inbox,
  Mail,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// 🎨 TYPES
// ═══════════════════════════════════════════════════════════════

export type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface LivePreviewProps {
  content:      string;   // HTML from TipTap
  subject:      string;
  previewText?: string;
  fromName?:    string;
  fromEmail?:   string;
  onDeviceChange?: (device: DeviceType) => void;
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Wrap TipTap HTML in a full email document with styles.
 * This ensures the preview looks like the actual sent email.
 */
function buildEmailDocument(html: string, isDark: boolean): string {
  const bgColor    = isDark ? '#1f2937' : '#ffffff';
  const textColor  = isDark ? '#f9fafb' : '#374151';
  const headingCol = isDark ? '#f9fafb' : '#004063';
  const mutedColor = isDark ? '#9ca3af' : '#6b7280';
  const borderCol  = isDark ? '#374151' : '#e5e7eb';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Email Preview</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI',
                 Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: ${bgColor};
    color: ${textColor};
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
    font-size: 15px;
  }
  h1 { font-size: 28px; font-weight: 800; color: ${headingCol}; margin: 0 0 12px; line-height: 1.2; }
  h2 { font-size: 22px; font-weight: 700; color: ${headingCol}; margin: 24px 0 10px; line-height: 1.3; }
  h3 { font-size: 18px; font-weight: 700; color: ${headingCol}; margin: 20px 0 8px; line-height: 1.4; }
  p  { margin: 0 0 12px; color: ${textColor}; }
  ul, ol { margin: 0 0 12px; padding-left: 24px; }
  li { margin-bottom: 6px; color: ${textColor}; }
  a  {
    color: #029bba;
    text-decoration: underline;
    font-weight: 500;
  }
  a:hover { color: #027a94; }
  blockquote {
    border-left: 4px solid #029bba;
    padding: 8px 16px;
    margin: 16px 0;
    color: ${mutedColor};
    font-style: italic;
    background: ${isDark ? '#111827' : '#f9fafb'};
    border-radius: 0 8px 8px 0;
  }
  code {
    background: ${isDark ? '#111827' : '#f3f4f6'};
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
    color: #029bba;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  }
  hr {
    border: none;
    border-top: 1px solid ${borderCol};
    margin: 24px 0;
  }
  img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 16px 0;
    display: block;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
  }
  th, td {
    border: 1px solid ${borderCol};
    padding: 8px 12px;
    text-align: left;
  }
  th {
    background: ${isDark ? '#111827' : '#f9fafb'};
    font-weight: 700;
    color: ${headingCol};
  }
  ::selection {
    background: #029bba;
    color: white;
  }
</style>
</head>
<body>
${html || '<p style="color:#9ca3af;text-align:center;padding:40px 0;">Start typing to see your email preview...</p>'}
</body>
</html>`;
}

/**
 * Get Tailwind width class for the current device.
 * Using arbitrary values (Tailwind JIT).
 */
function getDeviceWidthClass(device: DeviceType): string {
  switch (device) {
    case 'mobile': return 'w-[375px]';
    case 'tablet': return 'w-[600px]';
    default:       return 'w-full';
  }
}

/**
 * Get Tailwind height class for iframe.
 */
function getDeviceHeightClass(device: DeviceType, isFullScreen: boolean): string {
  if (isFullScreen) return 'h-[calc(100vh-200px)]';
  switch (device) {
    case 'mobile': return 'h-[667px]';
    case 'tablet': return 'h-[800px]';
    default:       return 'h-[640px]';
  }
}

/**
 * Get dark mode background class for iframe.
 */
function getIframeBgClass(isDark: boolean): string {
  return isDark ? 'bg-[#1f2937]' : 'bg-white';
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const LivePreview: React.FC<LivePreviewProps> = ({
  content,
  subject,
  previewText = '',
  fromName    = 'Highrise.pk',
  fromEmail   = 'newsletter@highrise.pk',
  onDeviceChange,
}) => {
  const [device,       setDevice]       = useState<DeviceType>('desktop');
  const [isDark,       setIsDark]       = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [zoom,         setZoom]         = useState(100);
  const [isLoading,    setIsLoading]    = useState(false);
  const [debouncedContent, setDebouncedContent] = useState(content);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ─────────────────────────────────────────────
  // Debounce content updates (300ms)
  // Prevents excessive iframe re-renders while typing
  // ─────────────────────────────────────────────
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setDebouncedContent(content);
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [content]);

  // ─────────────────────────────────────────────
  // Build email document (memoized)
  // ─────────────────────────────────────────────
  const emailDoc = useMemo(
    () => buildEmailDocument(debouncedContent, isDark),
    [debouncedContent, isDark]
  );

  // ─────────────────────────────────────────────
  // Notify parent of device changes
  // ─────────────────────────────────────────────
  useEffect(() => {
    onDeviceChange?.(device);
  }, [device, onDeviceChange]);

  // ─────────────────────────────────────────────
  // Full-screen body scroll lock
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isFullScreen]);

  // ─────────────────────────────────────────────
  // Escape key exits full-screen
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!isFullScreen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullScreen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isFullScreen]);

  // ─────────────────────────────────────────────
  // Reload iframe
  // ─────────────────────────────────────────────
  const handleReload = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 200);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = emailDoc;
    }
  };

  // ─────────────────────────────────────────────
  // Zoom controls
  // ─────────────────────────────────────────────
  const zoomIn  = () => setZoom((z) => Math.min(z + 10, 150));
  const zoomOut = () => setZoom((z) => Math.max(z - 10, 50));
  const resetZoom = () => setZoom(100);

  // Layout container class
  const containerClass = isFullScreen
    ? 'fixed inset-0 z-50 bg-gray-100 flex flex-col'
    : 'flex flex-col bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden';

  return (
    <div className={containerClass}>

      {/* ═══════════════════════════════════════════
          TOOLBAR
          ═══════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 py-3 
                      bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#029bba]" />
          <h3 className="text-sm font-black text-[#004063]">
            Live Preview
          </h3>
          {isLoading && (
            <div className="ml-2 w-2 h-2 bg-[#029bba] rounded-full animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-1">

          {/* Device Toggle */}
          <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={`p-1.5 rounded-md transition-all ${
                device === 'desktop'
                  ? 'bg-white shadow text-[#029bba]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Desktop view"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDevice('tablet')}
              className={`p-1.5 rounded-md transition-all ${
                device === 'tablet'
                  ? 'bg-white shadow text-[#029bba]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Tablet view"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={`p-1.5 rounded-md transition-all ${
                device === 'mobile'
                  ? 'bg-white shadow text-[#029bba]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Mobile view"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={`p-1.5 rounded-lg transition-all ${
              isDark
                ? 'bg-[#004063] text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Reload */}
          <button
            type="button"
            onClick={handleReload}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-all"
            title="Reload preview"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= 50}
              className="p-1.5 rounded-md text-gray-500 hover:bg-white transition-all disabled:opacity-40"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="px-2 text-xs font-semibold text-gray-600 hover:text-[#029bba] min-w-[3rem]"
              title="Reset zoom"
            >
              {zoom}%
            </button>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= 150}
              className="p-1.5 rounded-md text-gray-500 hover:bg-white transition-all disabled:opacity-40"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Full Screen */}
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-all"
            title={isFullScreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullScreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          INBOX SIMULATION (Gmail-style header)
          ═══════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br 
                          from-[#029bba] to-[#004063] flex items-center 
                          justify-center flex-shrink-0 text-white font-black">
            {fromName?.charAt(0) || 'H'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-bold text-gray-900 truncate">
                {fromName || 'Highrise.pk'}
              </p>
              <p className="text-xs text-gray-400 flex-shrink-0">
                Just now
              </p>
            </div>
            <p className="text-xs text-gray-500 truncate">
              &lt;{fromEmail || 'newsletter@highrise.pk'}&gt;
            </p>
            <p className="text-sm font-semibold text-gray-900 mt-1.5 truncate">
              {subject || <span className="text-gray-400">No subject</span>}
            </p>
            {previewText && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {previewText}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          IFRAME PREVIEW
          ═══════════════════════════════════════════ */}
      <div className={`flex-1 overflow-auto flex items-start justify-center 
                       p-4 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div
          className={`
            bg-white shadow-2xl rounded-lg transition-all duration-300
            max-w-full ${getDeviceWidthClass(device)}
          `}
          style={{
            // ✅ transform + transformOrigin are truly dynamic (zoom is 50-150)
            // Cannot be expressed as static Tailwind classes — CSS var approach
            transform:       `scale(${zoom / 100})`,
            transformOrigin: 'top center',
          }}
        >
          <iframe
            ref={iframeRef}
            srcDoc={emailDoc}
            title="Email Preview"
            sandbox="allow-same-origin"
            className={`
              w-full rounded-lg border-0 min-h-[400px]
              ${getDeviceHeightClass(device, isFullScreen)}
              ${getIframeBgClass(isDark)}
            `}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          STATUS BAR
          ═══════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 py-2 
                      bg-white border-t border-gray-200 text-xs 
                      text-gray-500 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Inbox className="w-3 h-3" />
            {device === 'mobile' ? 'Mobile' : device === 'tablet' ? 'Tablet' : 'Desktop'}
          </span>
          <span>·</span>
          <span>{isDark ? 'Dark mode' : 'Light mode'}</span>
          <span>·</span>
          <span>{zoom}% zoom</span>
        </div>
        <span className="text-[#029bba] font-semibold">
          🔒 Sandboxed preview
        </span>
      </div>
    </div>
  );
};

export default LivePreview;
// ========== END OF FILE ==========