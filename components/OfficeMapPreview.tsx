// components/OfficeMapPreview.tsx
// ═══════════════════════════════════════════════════════════════
// OFFICE MAP PREVIEW COMPONENT - Highrise.pk
// 🗺️ Reusable static map with "Get Directions" button
// V6.8.11 — Uses Google Static Maps API (matches existing setup)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { MapPin, Navigation, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import {
  geocodeAddress,
  isValidCoordinates,
  buildStaticMapUrl,
  buildDirectionsUrl,
  buildViewLocationUrl,
} from "@/lib/geocode";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface OfficeMapPreviewProps {
  address:  string;
  city?:    string;
  /** Pre-computed coordinates (skip geocoding if provided) */
  lat?:     number;
  lng?:     number;
  /** Height of the map in pixels */
  height?:  number;
  /** Zoom level (10=city, 15=street, 18=building) */
  zoom?:    number;
  /** Show "Get Directions" button */
  showDirections?: boolean;
  /** Show "Open in Maps" button */
  showOpenInMaps?: boolean;
  /** Compact mode (smaller buttons, tighter spacing) */
  compact?: boolean;
  /** Called when coordinates are resolved from geocoding */
  onCoordinatesResolved?: (lat: number, lng: number) => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function OfficeMapPreview({
  address,
  city,
  lat: propLat,
  lng: propLng,
  height = 260,
  zoom = 15,
  showDirections = true,
  showOpenInMaps = true,
  compact = false,
  onCoordinatesResolved,
}: OfficeMapPreviewProps): React.ReactElement {

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    isValidCoordinates(propLat, propLng)
      ? { lat: Number(propLat), lng: Number(propLng) }
      : null
  );
  const [geocoding, setGeocoding] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Geocode if coordinates not provided
  useEffect(() => {
    // Skip if already have valid coordinates
    if (coords) return;

    // Skip if no address to geocode
    if (!address || address.trim().length < 3) {
      setError("Address is too short to locate on map.");
      return;
    }

    setGeocoding(true);
    setError(null);

    // Build full address with city if provided
    const fullAddress = city && !address.toLowerCase().includes(city.toLowerCase())
      ? `${address}, ${city}, Pakistan`
      : address.toLowerCase().includes('pakistan')
      ? address
      : `${address}, Pakistan`;

    geocodeAddress(fullAddress)
      .then((result) => {
        if (!result.coordinates) {
          setError(result.error ?? "Could not locate this address on the map.");
          setGeocoding(false);
          return;
        }

        setCoords(result.coordinates);
        setGeocoding(false);
        onCoordinatesResolved?.(result.coordinates.lat, result.coordinates.lng);
      })
      .catch(() => {
        setError("Failed to locate address. Please check your connection.");
        setGeocoding(false);
      });
  }, [address, city, coords, onCoordinatesResolved]);

  // ─── Loading State ──────────────────────────────────────────
  if (geocoding) {
    return (
      <div
        className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#029bba] animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">Locating on map...</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs truncate px-4">
            {address}
          </p>
        </div>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────
  if (error || !coords) {
    return (
      <div
        className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <div className="text-center px-4">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-amber-800">Map Unavailable</p>
          <p className="text-xs text-amber-700 mt-1 max-w-sm">
            {error ?? "Could not display map for this address."}
          </p>
          {address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + (city ? `, ${city}` : ""))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba] hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              Search on Google Maps
            </a>
          )}
        </div>
      </div>
    );
  }

  // ─── Success State (Map Loaded) ─────────────────────────────
  const mapImageUrl = buildStaticMapUrl(coords.lat, coords.lng, {
    zoom,
    width:  600,
    height: Math.min(height, 400),
    marker: true,
    scale:  2, // Retina display
  });

  const directionsUrl = buildDirectionsUrl(coords.lat, coords.lng, address);
  const viewMapUrl    = buildViewLocationUrl(coords.lat, coords.lng, address);

  // If Google Maps API key missing, mapImageUrl will be empty string
  if (!mapImageUrl) {
    return (
      <div
        className="rounded-2xl border-2 border-dashed border-red-200 bg-red-50 flex items-center justify-center"
        style={{ height: `${height}px` }}
      >
        <div className="text-center px-4">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-red-800">Map Configuration Missing</p>
          <p className="text-xs text-red-700 mt-1">
            Google Maps API key not configured.
          </p>
          <a
            href={viewMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba] hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            View on Google Maps
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">

      {/* Map Image */}
      <div
        className="relative bg-gray-100"
        style={{ height: `${height}px` }}
      >
        {!imageError ? (
          <a
            href={viewMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative w-full h-full group"
            title="Click to open in Google Maps"
          >
            <Image
              src={mapImageUrl}
              alt={`Map showing ${address}`}
              fill
              unoptimized
              className="object-cover transition-transform group-hover:scale-105"
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 100vw, 600px"
            />

            {/* Overlay pin badge */}
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full
                            shadow-md flex items-center gap-1.5 border border-gray-100">
              <MapPin className="w-3.5 h-3.5 text-[#029bba] fill-[#029bba]" />
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                Office Location
              </span>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors
                            flex items-center justify-center opacity-0 group-hover:opacity-100">
              <span className="bg-white/95 backdrop-blur px-4 py-2 rounded-full text-xs font-bold
                               text-gray-700 shadow-lg flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5" />
                Click to view full map
              </span>
            </div>
          </a>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center px-4">
              <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Map image failed to load</p>
              <a
                href={viewMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#029bba]"
              >
                View on Google Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {(showDirections || showOpenInMaps) && (
        <div className={`grid ${showDirections && showOpenInMaps ? "grid-cols-2" : "grid-cols-1"} border-t border-gray-100`}>
          {showDirections && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 ${compact ? "py-2.5" : "py-3"}
                          text-xs font-bold text-white bg-gradient-to-r from-[#029bba] to-[#0284a3]
                          hover:from-[#027a94] hover:to-[#016880] transition-all
                          ${showOpenInMaps ? "border-r border-white/20" : ""}`}
            >
              <Navigation className="w-3.5 h-3.5" />
              Get Directions
            </a>
          )}
          {showOpenInMaps && (
            <a
              href={viewMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 ${compact ? "py-2.5" : "py-3"}
                          text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Google Maps
            </a>
          )}
        </div>
      )}
    </div>
  );
}