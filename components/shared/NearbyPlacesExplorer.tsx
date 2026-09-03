// components/shared/NearbyPlacesExplorer.tsx
//
// Highrise.pk — Interactive Nearby Places Explorer (Phase 2 R1)
// Leaflet + OpenStreetMap + Overpass API — 100% FREE stack.
//
//   → Project pin (teal pulse) at coordinates
//   → Category POI auto-discovery (hospitals, schools, malls, mosques,
//     banks, parks, roads, airports — Overpass radius query)
//   → Haversine distance (exact meters)
//   → Distance-sorted list + map markers (click-sync)
//
// R2 (routing) hook: onSelect POI → OSRM route (pending integration)

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import {
  Loader2,
  RefreshCw,
  MapPin,
  Search,
  Navigation,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES + CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export interface DiscoveredPOI {
  id: string;
  name: string;
  category: PoiCategory;
  lat: number;
  lng: number;
  distanceMeters: number; // haversine — straight line
}

export type PoiCategory =
  | 'hospital' | 'school' | 'university' | 'mall' | 'mosque'
  | 'bank' | 'park' | 'airport' | 'restaurant' | 'other';

interface NearbyPlacesExplorerProps {
  projectLat: number;
  projectLng: number;
  projectName: string;
  /** Height of the map container (Tailwind class, default h-[420px]) */
  mapHeightClass?: string;
  /** Initial discovery radius in meters (default 3000) */
  initialRadius?: number;
  /** Called when user selects a POI (R2 routing hook) */
  onPoiSelect?: (poi: DiscoveredPOI) => void;
}

// Overpass query tags → our categories
const OVERPASS_QUERIES: Record<PoiCategory, { tag: string; value?: string }[]> = {
  hospital:    [{ tag: 'amenity', value: 'hospital' }, { tag: 'amenity', value: 'clinic' }],
  school:      [{ tag: 'amenity', value: 'school' }, { tag: 'amenity', value: 'college' }],
  university:  [{ tag: 'amenity', value: 'university' }],
  mall:        [{ tag: 'shop', value: 'mall' }, { tag: 'shop', value: 'supermarket' }],
  mosque:      [{ tag: 'amenity', value: 'place_of_worship' }],
  bank:        [{ tag: 'amenity', value: 'bank' }],
  park:        [{ tag: 'leisure', value: 'park' }],
  airport:     [{ tag: 'aeroway', value: 'aerodrome' }],
  restaurant:  [{ tag: 'amenity', value: 'restaurant' }],
  other:       [],
};

const CATEGORY_META: Record<PoiCategory, { label: string; color: string }> = {
  hospital:   { label: 'Hospitals',   color: '#ef4444' },
  school:     { label: 'Schools',     color: '#f59e0b' },
  university: { label: 'Universities',color: '#7c3aed' },
  mall:       { label: 'Shopping',    color: '#ec4899' },
  mosque:     { label: 'Mosques',     color: '#10b981' },
  bank:       { label: 'Banks',       color: '#029bba' },
  park:       { label: 'Parks',       color: '#22c55e' },
  airport:    { label: 'Airports',    color: '#004063' },
  restaurant: { label: 'Restaurants', color: '#f97316' },
  other:      { label: 'Other',       color: '#6b7280' },
};

const RADIUS_OPTIONS = [1000, 3000, 5000, 10000] as const;

// Default enabled categories (focused discovery — not overwhelming)
const DEFAULT_CATEGORIES: PoiCategory[] = [
  'hospital', 'school', 'mall', 'mosque', 'bank', 'park',
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Haversine distance in meters */
function haversine(
  lat1: number, lng1: number, lat2: number, lng2: number,
): number {
  const R = 6371000; // Earth radius meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function fmtDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Build + run Overpass query for enabled categories within radius */
async function fetchPois(
  lat: number,
  lng: number,
  radius: number,
  categories: PoiCategory[],
): Promise<DiscoveredPOI[]> {
  if (categories.length === 0) return [];

  // Build tag filters: node["amenity"="hospital"](around:RADIUS,LAT,LNG);
  const filters = categories
    .flatMap((cat) =>
      OVERPASS_QUERIES[cat].map(({ tag, value }) =>
        `node["${tag}"${value ? `="${value}"` : ''}](around:${radius},${lat},${lng});`
      )
    )
    .join('');

  const query = `[out:json][timeout:25];(${filters});out center 200;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const data = (await res.json()) as { elements?: OverpassElement[] };

  const pois: DiscoveredPOI[] = [];
  for (const el of data.elements ?? []) {
    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    const name = el.tags?.['name'];
    if (!elLat || !elLng || !name) continue;

    // Reverse-map tags → category
    let category: PoiCategory = 'other';
    for (const [cat, tagDefs] of Object.entries(OVERPASS_QUERIES) as Array<
      [PoiCategory, { tag: string; value?: string }[]]
    >) {
      const matches = tagDefs.some(
        ({ tag, value }) =>
          el.tags?.[tag] === (value ?? el.tags?.[tag])
      );
      if (matches) { category = cat; break; }
    }

    pois.push({
      id: `${category}-${el.id}`,
      name,
      category,
      lat: elLat,
      lng: elLng,
      distanceMeters: haversine(lat, lng, elLat, elLng),
    });
  }

  // Closest first, dedupe by name+category
  const seen = new Set<string>();
  return pois
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .filter((p) => {
      const key = `${p.category}:${p.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function NearbyPlacesExplorer({
  projectLat,
  projectLng,
  projectName,
  mapHeightClass = 'h-[420px]',
  initialRadius = 3000,
  onPoiSelect,
}: NearbyPlacesExplorerProps): React.ReactElement {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const routeLineRef = useRef<L.Polyline | null>(null);

  const [pois, setPois] = useState<DiscoveredPOI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(initialRadius);
  const [enabledCats, setEnabledCats] = useState<Set<PoiCategory>>(
    new Set(DEFAULT_CATEGORIES)
  );
  const [selectedPoi, setSelectedPoi] = useState<DiscoveredPOI | null>(null);
  const [discovered, setDiscovered] = useState(false);

  // ── Init map (once) ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [projectLat, projectLng],
      zoom: 14,
      scrollWheelZoom: false, // page scroll conflict — enable on click
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Project pin — teal pulse
    const projectIcon = L.divIcon({
      className: '',
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#029bba;
              box-shadow:0 0 0 4px rgba(2,155,186,0.3), 0 0 0 8px rgba(2,155,186,0.15);
              border:3px solid white;"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    L.marker([projectLat, projectLng], { icon: projectIcon })
      .addTo(map)
      .bindPopup(`<strong>${projectName}</strong><br/>Project location`);

    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [projectLat, projectLng, projectName]);

  // ── Discover (Overpass) ──
  const discover = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setDiscovered(true);
    try {
      const results = await fetchPois(
        projectLat,
        projectLng,
        radius,
        Array.from(enabledCats),
      );
      setPois(results);
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message.includes('Overpass')
          ? 'Discovery service is busy — try again in a moment.'
          : 'Failed to discover nearby places. Please try again.'
      );
      setPois([]);
    } finally {
      setLoading(false);
    }
  }, [projectLat, projectLng, radius, enabledCats]);

  // ── Render POI markers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    for (const poi of pois) {
      const meta = CATEGORY_META[poi.category];
      const marker = L.circleMarker([poi.lat, poi.lng], {
        radius: 6,
        color: '#ffffff',
        weight: 2,
        fillColor: meta.color,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup(
          `<strong>${poi.name}</strong><br/>${meta.label} · ${fmtDistance(poi.distanceMeters)}`
        );

      marker.on('click', () => {
        setSelectedPoi(poi);
        onPoiSelect?.(poi);
      });

      markersRef.current.set(poi.id, marker);
    }
  }, [pois, onPoiSelect]);

  // ── Selected POI → fly + highlight ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPoi) return;
    const marker = markersRef.current.get(selectedPoi.id);
    if (marker) {
      map.flyTo([selectedPoi.lat, selectedPoi.lng], 15, { duration: 0.8 });
      marker.openPopup();
    }
  }, [selectedPoi]);

  const visiblePois = useMemo(
    () => pois.filter((p) => enabledCats.has(p.category)),
    [pois, enabledCats],
  );

  const toggleCat = (cat: PoiCategory): void => {
    setEnabledCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#029bba]" />
            Live Nearby Explorer
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Real places around this project — auto-discovered from OpenStreetMap
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Radius selector */}
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-bold
                       text-gray-600 focus:border-[#029bba] outline-none"
            aria-label="Search radius"
          >
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {(r / 1000).toFixed(r === 1000 ? 0 : 1)} km
              </option>
            ))}
          </select>

          {/* Discover button */}
          <button
            type="button"
            onClick={() => void discover()}
            disabled={loading || enabledCats.size === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg
                       bg-[#029bba] hover:bg-[#027a94] text-white text-sm font-bold
                       shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : discovered ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {loading ? 'Discovering...' : discovered ? 'Refresh' : 'Discover Nearby'}
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-1.5 bg-gray-50/50">
        {(Object.keys(CATEGORY_META) as PoiCategory[])
          .filter((c) => c !== 'other')
          .map((cat) => {
            const meta = CATEGORY_META[cat];
            const active = enabledCats.has(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCat(cat)}
                aria-pressed={active}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold
                           border transition-all flex items-center gap-1.5"
                style={{
                  backgroundColor: active ? `${meta.color}15` : 'white',
                  borderColor: active ? meta.color : '#e5e7eb',
                  color: active ? meta.color : '#9ca3af',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: active ? meta.color : '#d1d5db' }}
                />
                {meta.label}
              </button>
            );
          })}
      </div>

      {/* Map + list side by side (desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Map */}
        <div className="lg:col-span-2 relative">
          <div ref={containerRef} className={`${mapHeightClass} w-full z-0`} />
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px]
                            flex items-center justify-center z-[500]">
              <Loader2 className="w-8 h-8 text-[#029bba] animate-spin" />
            </div>
          )}
        </div>

        {/* List panel */}
        <div className="border-t lg:border-t-0 lg:border-l border-gray-100">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Nearby ({visiblePois.length})
            </p>
            {selectedPoi && (
              <button
                type="button"
                onClick={() => setSelectedPoi(null)}
                className="text-xs text-[#029bba] font-bold hover:underline"
              >
                Clear selection
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
            {error && (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-red-500 mb-2">{error}</p>
                <button
                  type="button"
                  onClick={() => void discover()}
                  className="text-xs font-bold text-[#029bba] hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {!error && !discovered && !loading && (
              <div className="px-4 py-10 text-center">
                <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400 font-medium">
                  Click "Discover Nearby" to find real places
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Hospitals, schools, malls, mosques and more — around this project
                </p>
              </div>
            )}

            {visiblePois.map((poi) => {
              const meta = CATEGORY_META[poi.category];
              const isActive = selectedPoi?.id === poi.id;
              return (
                <button
                  key={poi.id}
                  type="button"
                  onClick={() => {
                    setSelectedPoi(poi);
                    onPoiSelect?.(poi);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left
                              transition-colors ${
                                isActive ? 'bg-[#029bba]/5' : 'hover:bg-gray-50'
                              }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: meta.color }}
                  />
                  <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">
                    {poi.name}
                  </span>
                  <span className="text-[11px] font-bold text-gray-500 tabular-nums shrink-0">
                    {fmtDistance(poi.distanceMeters)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected POI action bar (R2 routing hook) */}
          {selectedPoi && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-sm font-bold text-gray-900 truncate">
                {selectedPoi.name}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: CATEGORY_META[selectedPoi.category].color }}
                >
                  {CATEGORY_META[selectedPoi.category].label}
                </span>
                <span className="text-[11px] font-bold text-gray-500 tabular-nums">
                  {fmtDistance(selectedPoi.distanceMeters)} away
                </span>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${projectLat},${projectLng}&destination=${selectedPoi.lat},${selectedPoi.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold
                           text-[#029bba] hover:underline"
              >
                <Navigation className="w-3.5 h-3.5" />
                Get Directions in Google Maps
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}