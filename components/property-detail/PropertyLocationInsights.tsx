// components/property-detail/PropertyLocationInsights.tsx
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { MapPin, ExternalLink, CheckCircle } from 'lucide-react';
import NeighborhoodInsights from '@/components/project-detail/NeighborhoodInsights';
import type { NearbyPlacesExplorerProps } from '@/components/shared/NearbyPlacesExplorer';

const NearbyPlacesExplorer = dynamic<NearbyPlacesExplorerProps>(
  () => import('@/components/shared/NearbyPlacesExplorer'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#029bba] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-400 mt-2">Loading map...</p>
        </div>
      </div>
    ),
  }
);

function formatCoordinate(n: number): string {
  return n.toFixed(5);
}

interface PropertyLocationInsightsProps {
  property?: {
    title?: string;
    city: string;
    society?: string | null;
    phase?: string | null;
    block?: string | null;
    streetNumber?: string | null;
    plotNumber?: string | null;
    coordinates?: {
      lat: number;
      lng: number;
    } | null;
    nearbyFacilities?: Array<{
      category?: string;
      name: string;
      distance?: string;
    }> | null;
    nearbyLandmarks?: string[] | null;
  } | null;
  fullLocation: string;
  heroMapUrl?: string | null;
}

export default function PropertyLocationInsights({
  property,
  fullLocation,
  heroMapUrl,
}: PropertyLocationInsightsProps) {
  if (!property || (!property?.city && !property?.society && !fullLocation && !property?.coordinates?.lat)) {
    return null;
  }

  // Extract coordinates safely from object OR GeoJSON array fallback
  const rawLat = property?.coordinates?.lat ?? (Array.isArray((property as any)?.location?.coordinates) ? (property as any).location.coordinates[1] : null);
  const rawLng = property?.coordinates?.lng ?? (Array.isArray((property as any)?.location?.coordinates) ? (property as any).location.coordinates[0] : null);

  const latNum = Number(rawLat);
  const lngNum = Number(rawLng);
  const hasCoords = !isNaN(latNum) && !isNaN(lngNum) && latNum !== 0 && lngNum !== 0;

  const googleMapsHref = hasCoords && property?.coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${property.coordinates.lat},${property.coordinates.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullLocation || property?.city || '')}`;

  const verifiedPlaces = (property?.nearbyFacilities ?? []).map((p) => ({
    name: p.name,
    category: (p.category || 'other') as any,
    distance: p.distance,
  }));

  return (
    <div
      id="location"
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* ── Card Header (matches Project Section header) ── */}
      <div className="px-6 pt-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[#004063] flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#029bba]" />
          Location &amp; Neighborhood
        </h2>
        <a
          href={googleMapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-bold text-[#029bba] hover:underline bg-[#029bba]/10 px-3 py-1.5 rounded-full w-fit"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Google Maps
        </a>
      </div>

      <div className="px-6">
        {/* ── Address Banner ── */}
        <div className="flex items-start gap-3 mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <MapPin className="w-5 h-5 text-[#029bba] mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-gray-900">
              {fullLocation || property?.city}
            </p>
            {hasCoords && property?.coordinates && (
              <p className="text-sm text-gray-500 mt-0.5 font-mono">
                {formatCoordinate(property.coordinates.lat)}, {formatCoordinate(property.coordinates.lng)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 1. Interactive Map Explorer FIRST ── */}
      <div className="mb-8 border-y border-gray-200 bg-gray-50">
        {hasCoords ? (
          <NearbyPlacesExplorer
            projectLat={latNum}
            projectLng={lngNum}
            projectName={property.title || 'Property Location'}
            initialRadius={3000}
            verifiedPlaces={verifiedPlaces}
          />
        ) : heroMapUrl ? (
          <div className="aspect-video">
            <iframe
              src={heroMapUrl}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Property Location"
            />
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-sm text-gray-400 font-medium">
            Map coordinates unavailable for this listing
          </div>
        )}
      </div>

      {/* ── 2. Neighborhood Snapshot & Vibe SECOND ── */}
      <div className="px-6 pb-6">
        <NeighborhoodInsights places={verifiedPlaces} />

        {/* Nearby Landmarks fallback */}
        {Array.isArray(property?.nearbyLandmarks) && property.nearbyLandmarks.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-black text-gray-900 uppercase tracking-wider text-sm mb-4">
              Nearby Landmarks
            </h4>
            <div className="flex flex-wrap gap-2">
              {property.nearbyLandmarks.map((lm) => (
                <span
                  key={lm}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
                  {lm}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}