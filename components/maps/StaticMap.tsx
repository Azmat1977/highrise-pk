// components/maps/StaticMap.tsx
// ═══════════════════════════════════════════════════════════════
// Static Google Map with bulletproof fallback chain:
//   1. Try Google Static Maps API (best — branded, branded marker)
//   2. On error/timeout → fallback to Google embed iframe (no API key)
//   3. On total failure → fallback link to Google Maps
//
// Timeout: 8 seconds max — never spins forever
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, ExternalLink, Navigation, Maximize2 } from 'lucide-react';

interface StaticMapProps {
  lat:      number;
  lng:      number;
  title?:   string;
  address?: string;
  zoom?:    number;
  width?:   number;
  height?:  number;
}

const LOAD_TIMEOUT_MS = 8000; // 8s max — then fallback to iframe

export default function StaticMap({
  lat,
  lng,
  title   = 'Property Location',
  address,
  zoom    = 15,
  width   = 600,
  height  = 300,
}: StaticMapProps): React.ReactElement {
  const [imageError, setImageError] = useState(false);
  const [isLoading,  setIsLoading]  = useState(true);
  const [useIframe,  setUseIframe]  = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  // ── Validate coordinates ──────────────────────────────────────
  const hasValidCoords =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180;

  // ── URLs ──────────────────────────────────────────────────────
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&scale=2&maptype=roadmap&markers=color:red%7Csize:mid%7C${lat},${lng}&key=${apiKey}`;
  const embedMapUrl  = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  // ── Timeout watchdog ──────────────────────────────────────────
  // If image doesn't load within 8s, switch to iframe fallback
  // This prevents the "infinite spinner" you experienced
  useEffect(() => {
    if (!isLoading) return;
    if (useIframe)  return;
    if (!hasValidCoords) return;

    timeoutRef.current = setTimeout(() => {
      // Image silently failed (no onError fired) → switch to iframe
      setUseIframe(true);
      setIsLoading(false);
    }, LOAD_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isLoading, useIframe, hasValidCoords]);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // ── Invalid coordinates fallback ──────────────────────────────
  if (!hasValidCoords) {
    return (
      <div className="bg-gray-100 rounded-xl p-8 text-center border border-gray-200">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Map location unavailable</p>
      </div>
    );
  }

  // ── No API key — go straight to iframe ────────────────────────
  // Iframe embed works without API key (free Google embed)
  const shouldUseIframe = useIframe || imageError || !apiKey;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 bg-white">

      {/* ── Map display ──────────────────────────────────────── */}
      <div className="relative" style={{ minHeight: '300px' }}>

        {/* Loading spinner (only for static image attempt) */}
        {isLoading && !shouldUseIframe && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#029bba]" />
          </div>
        )}

        {shouldUseIframe ? (
          // ── Fallback: Free Google embed iframe (no API key needed)
          <iframe
            src={embedMapUrl}
            width="100%"
            height="300"
            style={{ border: 0, display: 'block' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={title}
          />
        ) : (
          // ── Primary: Static map image (branded, faster, SEO-friendly)
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block cursor-pointer group"
          >
            <div className="relative">
              <img
                src={staticMapUrl}
                alt={title}
                className="w-full h-[300px] object-cover"
                loading="lazy"
                onLoad={() => {
                  setIsLoading(false);
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                }}
                onError={() => {
                  setImageError(true);
                  setIsLoading(false);
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                }}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
                  <Maximize2 size={16} />
                  Click to open in Google Maps
                </span>
              </div>
            </div>
          </a>
        )}
      </div>

      {/* ── Address + action buttons ─────────────────────────── */}
      <div className="p-4">
        {address && (
          <div className="flex items-start gap-2 mb-4">
            <MapPin className="w-5 h-5 text-[#029bba] flex-shrink-0 mt-0.5" />
            <p className="text-gray-700 text-sm">{address}</p>
          </div>
        )}

        <div className="flex gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <ExternalLink size={16} />
            View Larger Map
          </a>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#029bba] hover:bg-[#017a8a] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Navigation size={16} />
            Get Directions
          </a>
        </div>
      </div>
    </div>
  );
}