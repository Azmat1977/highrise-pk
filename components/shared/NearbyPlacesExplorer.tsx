// components/shared/NearbyPlacesExplorer.tsx
//
// Highrise.pk — Interactive Nearby Places Explorer (Phase 2 R1+)
// Leaflet + OpenStreetMap + Overpass API — 100% FREE stack.
//
//   → Project pin (teal pulse) at coordinates
//   → Category POI auto-discovery (Overpass — 3-mirror fallback)
//   → Icon markers: white glyph SVG on category-colored pins
//   → Verified places (developer-curated) — badge markers + list section
//   → Distance-sorted auto list, category icon chips, radius selector
//   → Google Maps directions deep-link per POI

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import {
  Loader2,
  RefreshCw,
  MapPin,
  Search,
  Navigation,
  Hospital,
  GraduationCap,
  ShoppingBag,
  Landmark,
  Building2,
  Trees,
  Plane,
  UtensilsCrossed,
  BadgeCheck,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES + CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export type PoiCategory =
  | 'hospital' | 'school' | 'university' | 'mall' | 'mosque'
  | 'bank' | 'park' | 'airport' | 'restaurant' | 'other';

export interface DiscoveredPOI {
  id: string;
  name: string;
  category: PoiCategory;
  lat: number;
  lng: number;
  distanceMeters: number;
}

export interface VerifiedPlace {
  name: string;
  category: string;
  distance?: string;
}

export interface NearbyPlacesExplorerProps {
  projectLat: number;
  projectLng: number;
  projectName: string;
  mapHeightClass?: string;
  initialRadius?: number;
  onPoiSelect?: (poi: DiscoveredPOI) => void;
  verifiedPlaces?: VerifiedPlace[];
}

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
  hospital:   { label: 'Hospitals',    color: '#ef4444' },
  school:     { label: 'Schools',      color: '#f59e0b' },
  university: { label: 'Universities', color: '#7c3aed' },
  mall:       { label: 'Shopping',     color: '#ec4899' },
  mosque:     { label: 'Mosques',      color: '#10b981' },
  bank:       { label: 'Banks',        color: '#029bba' },
  park:       { label: 'Parks',        color: '#22c55e' },
  airport:    { label: 'Airports',     color: '#004063' },
  restaurant: { label: 'Restaurants',  color: '#f97316' },
  other:      { label: 'Other',        color: '#6b7280' },
};

const TAB_ICONS: Record<
  PoiCategory,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  hospital: Hospital, school: GraduationCap, university: GraduationCap,
  mall: ShoppingBag, mosque: Landmark, bank: Building2,
  park: Trees, airport: Plane, restaurant: UtensilsCrossed,
  other: MapPin,
};

// International standard map symbols (WHO/UN-style POI glyphs)
const MARKER_SVGS: Record<PoiCategory, string> = {
  // Hospital: white cross (red field) — universal medical symbol
  hospital:   '<rect x="9" y="4" width="6" height="16" fill="white"/><rect x="4" y="9" width="16" height="6" fill="white"/>',
  // School: open book (universal education)
  school:     '<path d="M21 5c-1.5-1-4-1.5-6-1-1 .3-2 .8-3 1.5C11 4.8 10 4.3 9 4c-2-.5-4.5 0-6 1v14c1.5-1 4-1.5 6-1 1 .3 2 .8 3 1.5 1-.7 2-1.2 3-1.5 2-.5 4.5 0 6 1V5z" fill="white"/>',
  // University: graduation cap (global academia)
  university: '<path d="M12 4L1 9l11 5 9-4.09V17h2V9L12 4z" fill="white"/><path d="M6 13.18V17c0 1.66 2.69 3 6 3s6-1.34 6-3v-3.82l-6 2.73-6-2.73z" fill="white"/>',
  // Mall: shopping bag
  mall:       '<path d="M6 7V6a6 6 0 0112 0v1h2v14H4V7h2zm2 0h8V6a4 4 0 00-8 0v1z" fill="white"/>',
  // Mosque: crescent + dome (universal place of worship symbol)
  mosque:     '<path d="M15.5 3a8 8 0 100 15 8.5 8.5 0 01-2-1.8 7 7 0 112-11.4A8.4 8.4 0 0115.5 3z" fill="white"/><path d="M7 19h10v2H7z" fill="white"/>',
  // Bank: column institution (classic bank symbol)
  bank:       '<path d="M12 2l9 5v2H3V7l9-5zM5 10h2v8H5v-8zm6 0h2v8h-2v-8zm6 0h2v8h-2v-8zM3 19h18v2H3v-2z" fill="white"/>',
  // Park: tree (green space)
  park:       '<path d="M12 2l5 8h-3l4 6H6l4-6H7l5-8zM11 16h2v6h-2v-6z" fill="white"/>',
  // Airport: airplane (global transport)
  airport:    '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="white"/>',
  // Restaurant: fork & knife (global dining)
  restaurant: '<path d="M7 2v8a3 3 0 003 3v9h2v-9a3 3 0 003-3V2h-2v7h-1V2h-2v7H9V2H7zm12 0c-2 0-4 2.5-4 5v3h3v12h2V2h-1z" fill="white"/>',
  other:      '<circle cx="12" cy="12" r="6" fill="white"/>',
};

const RADIUS_OPTIONS = [1000, 3000, 5000, 10000] as const;
const DEFAULT_CATEGORIES: PoiCategory[] = [
  'hospital', 'school', 'mall', 'mosque', 'bank', 'park',
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
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

async function fetchPois(
  lat: number,
  lng: number,
  radius: number,
  categories: PoiCategory[],
): Promise<DiscoveredPOI[]> {
  if (categories.length === 0) return [];

  const filters = categories
    .flatMap((cat) =>
      OVERPASS_QUERIES[cat].map(({ tag, value }) =>
        `node["${tag}"${value ? `="${value}"` : ''}](around:${radius},${lat},${lng});`
      )
    )
    .join('');

  // Compact query: shorter server timeout, fewer elements, no meta
  const query = `[out:json][timeout:10];(${filters});out center 60;`;

  // Parallel mirror RACE — first success wins, others aborted.
  // (Serial fallback could hang 75s+ when the primary mirror queues.)
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000); // hard 12s cap

  const attempts = mirrors.map(async (mirror, i) => {
    // Stagger 300ms per mirror — de-primary usually wins, race still fast
    await new Promise((r) => setTimeout(r, i * 300));
    const res = await fetch(mirror, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    return (await res.json()) as { elements?: OverpassElement[] };
  });

  let data: { elements?: OverpassElement[] } | null = null;
  let lastError: Error | null = null;
  try {
    data = await Promise.any(attempts); // first success
  } catch (err: unknown) {
    lastError = err instanceof Error ? err : new Error('All mirrors failed');
  } finally {
    clearTimeout(timeout);
    controller.abort(); // kill stragglers
  }

  if (!data) throw lastError ?? new Error('Overpass failed');

  const pois: DiscoveredPOI[] = [];
  for (const el of data.elements ?? []) {
    const elLat = el.lat ?? el.center?.lat;
    const elLng = el.lon ?? el.center?.lon;
    // English name preferred; Urdu/other only when English absent
    const name = el.tags?.['name:en'] ?? el.tags?.['name'];
    if (elLat === undefined || elLng === undefined || !name) continue;

    // Exact tag+value matching (map iteration order — specific first)
    // e.g. amenity=place_of_worship → mosque; shop=mall → mall
    let category: PoiCategory = 'other';
    const CATEGORY_BY_TAG: Record<string, PoiCategory> = {
      'amenity=hospital': 'hospital',
      'amenity=clinic': 'hospital',
      'amenity=school': 'school',
      'amenity=college': 'school',
      'amenity=university': 'university',
      'shop=mall': 'mall',
      'shop=supermarket': 'mall',
      'amenity=place_of_worship': 'mosque',
      'amenity=bank': 'bank',
      'leisure=park': 'park',
      'aeroway=aerodrome': 'airport',
      'amenity=restaurant': 'restaurant',
    };
    for (const [tagKey, cat] of Object.entries(CATEGORY_BY_TAG)) {
      const [tag, value] = tagKey.split('=');
      if (el.tags?.[tag] === value) { category = cat; break; }
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

/** Icon marker — white glyph SVG on category-colored rounded square */
function makeIconMarker(category: PoiCategory, verified = false): L.DivIcon {
  const color = CATEGORY_META[category].color;
  const size = verified ? 34 : 28;
  const border = verified ? 'border:3px solid #029bba;' : 'border:2px solid white;';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:9px;background:${color};
            ${border}box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
      <svg viewBox="0 0 24 24" width="${size - 12}" height="${size - 12}"
           style="pointer-events:none">${MARKER_SVGS[category]}</svg>
      ${verified ? `<div style="position:absolute;top:-6px;right:-6px;width:14px;height:14px;
        border-radius:50%;background:#029bba;border:2px solid white;"></div>` : ''}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
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
  verifiedPlaces = [],
}: NearbyPlacesExplorerProps): React.ReactElement {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());


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
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

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

    // Container may render hidden/zero-height (SSR hydration timing) —
    // force Leaflet to re-measure once visible
    setTimeout(() => map.invalidateSize(), 200);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [projectLat, projectLng, projectName]);

  // Verified (curated) places: sidebar-list only — NO map markers (fake
  // placement near project pin was misleading; exact coords unavailable
  // until form collects lat/lng per place — R3 scope).

  // ── Discover (Overpass) ──
  const discover = useCallback(async (): Promise<void> => {
    if (enabledCats.size === 0) {
      setError('Select at least one category to discover places.');
      return;
    }
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
          ? 'All discovery servers are busy right now. Please try again in a moment.'
          : 'Failed to discover nearby places. Check your connection and try again.'
      );
      setPois([]);
    } finally {
      setLoading(false);
    }
  }, [projectLat, projectLng, radius, enabledCats]);

  // ── Render discovered POI markers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    for (const poi of pois) {
      const marker = L.marker([poi.lat, poi.lng], {
        icon: makeIconMarker(poi.category),
      })
        .addTo(map)
        .bindPopup(
          `<strong>${poi.name}</strong><br/>${CATEGORY_META[poi.category].label} · ${fmtDistance(poi.distanceMeters)}`
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
            Location Explorer
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Verified places + live discovery — distances at a glance, directions one click away
          </p>
        </div>

        <div className="flex items-center gap-2">
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

          <button
            type="button"
            onClick={() => { void discover(); }}
            disabled={loading}
            title={enabledCats.size === 0 ? 'Select at least one category above' : 'Discover places'}
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

      {/* Category filters — icon chips */}
      <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-1.5 bg-gray-50/50">
        {(Object.keys(CATEGORY_META) as PoiCategory[])
          .filter((c) => c !== 'other')
          .map((cat) => {
            const meta = CATEGORY_META[cat];
            const active = enabledCats.has(cat);
            const Icon = TAB_ICONS[cat];
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
                <Icon className="w-3.5 h-3.5" />
                {meta.label}
              </button>
            );
          })}
      </div>

      {/* Map + sidebar */}
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

        {/* Sidebar */}
        <div className="border-t lg:border-t-0 lg:border-l border-gray-100">
          {/* Discovered places */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Auto-Discovered ({visiblePois.length})
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
              const Icon = TAB_ICONS[poi.category];
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
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${meta.color}18` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                  </span>
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

          {/* Selected POI action bar */}
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