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
  X,
  Loader2,
  RefreshCw,
  MapPin,
  Search,
  Navigation,
  Hospital,
  GraduationCap,
  ShoppingCart,
  Landmark,
  Building2,
  Trees,
  Plane,
  UtensilsCrossed,
  BadgeCheck,
  ChevronRight,
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
  hospital:   { label: 'Hospitals',    color: '#ef4444' }, // Error Red
  school:     { label: 'Schools',      color: '#f59e0b' }, // Warning Amber
  university: { label: 'Universities', color: '#f59e0b' }, // Warning Amber
  mall:       { label: 'Shopping',     color: '#029bba' }, // Primary Teal
  mosque:     { label: 'Mosques',      color: '#10b981' }, // Success Emerald
  bank:       { label: 'Banks',        color: '#004063' }, // Secondary Navy
  park:       { label: 'Parks',        color: '#10b981' }, // Success Emerald
  airport:    { label: 'Airports',     color: '#004063' }, // Secondary Navy
  restaurant: { label: 'Restaurants',  color: '#f59e0b' }, // Warning Amber
  other:      { label: 'Other',        color: '#004063' }, // Secondary Navy
};

const TAB_ICONS: Record<
  PoiCategory,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  hospital: Hospital, school: GraduationCap, university: GraduationCap,
  mall: ShoppingCart, mosque: Landmark, bank: Building2,
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
  // Mall/Grocery: shopping cart (universal retail symbol)
  mall:       '<circle cx="9" cy="21" r="1.8" fill="white"/><circle cx="19" cy="21" r="1.8" fill="white"/><path d="M2 3h3l2.6 12.6a1.8 1.8 0 001.8 1.4h8.9a1.8 1.8 0 001.8-1.4L22 7H6" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
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

const RADIUS_OPTIONS = [500, 1000, 3000, 5000, 10000] as const;
const RADIUS_MIN = 100;    // 100m
const RADIUS_MAX = 10000;  // 10km
const RADIUS_STEP = 100;   // 100m steps
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

function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin > 0 ? `${hr}h ${remMin}m` : `${hr}h`;
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
        // Use 'nwr' (Nodes, Ways, Relations) to capture buildings/polygons, not just single points
        `nwr["${tag}"${value ? `="${value}"` : ''}](around:${radius},${lat},${lng});`
      )
    )
    .join('');

  // Increased timeout and result limit (150) to handle rich polygonal data
  const query = `[out:json][timeout:15];(${filters});out center 150;`;

  // Parallel mirror RACE — first success wins, others aborted.
  // Using official high-availability clusters to prevent discovery failures
  const mirrors = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://z.overpass-api.de/api/interpreter',
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s cap to accommodate complex queries

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
    // Promise.any throws an AggregateError if all fail.
    lastError = new Error('All discovery servers failed to respond');
  } finally {
    clearTimeout(timeout);
    controller.abort(); // kill stragglers
  }

  if (!data || !data.elements) {
    throw lastError ?? new Error('Overpass failed or returned empty data');
  }

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
  const routeLineRef = useRef<L.Polyline | null>(null);


  const [pois, setPois] = useState<DiscoveredPOI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState<number>(initialRadius);
  // Slider works in meters (100m steps); presets in km
  const [enabledCats, setEnabledCats] = useState<Set<PoiCategory>>(
    new Set(DEFAULT_CATEGORIES)
  );
  const [selectedPoi, setSelectedPoi] = useState<DiscoveredPOI | null>(null);
  const [discovered, setDiscovered] = useState(false);
  // R2: OSRM road routing
  const [routeData, setRouteData] = useState<{
    distanceMeters: number;
    durationSeconds: number;
    coords: Array<[number, number]>; // [lat, lng] polyline points
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'discovered' | 'curated'>(verifiedPlaces.length > 0 ? 'curated' : 'discovered');

  // â”€â”€ Init map (once) â”€â”€
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

      const lat = Number(projectLat);
      const lng = Number(projectLng);

      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      // Classic location marker (teardrop pin) — Google-style, brand teal
      const projectIcon = L.divIcon({
        className: 'custom-project-pin',
        html: `<div style="position:relative;width:32px;height:42px;display:flex;align-items:center;justify-content:center;">
          <svg viewBox="0 0 24 34" width="32" height="42"
               style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));pointer-events:none;overflow:visible;">
            <path d="M12 1C6 1 1.5 5.5 1.5 11.5c0 7 10.5 21.5 10.5 21.5S22.5 18.5 22.5 11.5C22.5 5.5 18 1 12 1z"
                  fill="#029bba" stroke="#ffffff" stroke-width="1.8"/>
            <circle cx="12" cy="11.5" r="4" fill="#ffffff"/>
          </svg>
        </div>`,
        iconSize: [32, 42],
        iconAnchor: [16, 42], // tip at exact coordinate
      });

      L.marker([lat, lng], { icon: projectIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindTooltip(projectName, {
          permanent: true,
          direction: 'top',
          offset: [0, -46], // Float 4px above pin tip so teardrop pin is 100% visible
          className: 'project-pin-label',
        })
        .bindPopup(`<strong>${projectName}</strong><br/>Site Location`);

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
  // Enterprise clear — full map reset to pristine state (project pin only)
  const clearAll = useCallback((): void => {
    // Remove all POI markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    // Remove route
    if (routeLineRef.current) {
      const fill = routeLineRef.current;
      const casing = (fill as unknown as { _casing?: L.Polyline })._casing;
      const label = (fill as unknown as { _label?: L.Marker })._label;
      fill.remove();
      casing?.remove();
      label?.remove();
      routeLineRef.current = null;
    }

    // Reset all state → IDLE
    setPois([]);
    setSelectedPoi(null);
    setRouteData(null);
    setDiscovered(false);
    setError(null);

    // Reset map view to project location
    const map = mapRef.current;
    if (map) {
      map.flyTo([projectLat, projectLng], 14, { duration: 0.8 });
    }
  }, [projectLat, projectLng]);

  const discover = useCallback(async (): Promise<void> => {
    if (enabledCats.size === 0) {
      setError('Select at least one category to discover places.');
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- radius tracked below
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
          `<strong>${poi.name}</strong><br/>${CATEGORY_META[poi.category].label}`
        );

      marker.on('click', () => {
        setSelectedPoi(poi);
        onPoiSelect?.(poi);
      });

      markersRef.current.set(poi.id, marker);
    }
  }, [pois, onPoiSelect]);

  // ── Auto re-discover on radius change (only after first discovery) ──
  useEffect(() => {
    if (discovered && !loading) {
      void discover();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]);

  // ── Batch road distances (1:many OSRM) — every list entry shows ROAD
  // distance. Consistency = trust: no mixed straight/road values.
  const [roadDistances, setRoadDistances] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    if (pois.length === 0 || !projectLat || !projectLng) {
      setRoadDistances(new Map());
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        // OSRM table service: project (source) → all POIs (destinations).
        // Explicit destinations param required by newer OSRM builds —
        // implicit form returns inconsistent shapes.
        const targets = pois.slice(0, 30);
        const destIdx = targets.map((_, i) => i + 1).join(';'); // skip index 0 (source)
        const coordStr = [
          `${projectLng},${projectLat}`,
          ...targets.map((p) => `${p.lng},${p.lat}`),
        ].join(';');
        // annotations=distance REQUIRED — public OSRM returns only
        // durations by default; distances field needs this flag.
        const url =
          `https://router.project-osrm.org/table/v1/driving/${coordStr}` +
          `?sources=0&destinations=${destIdx}&annotations=distance`;

        const res = await fetch(url);
        if (!res.ok) {
          console.warn('[OSRM-TABLE] HTTP', res.status, url);
          return;
        }
        const data = (await res.json()) as {
          distances?: number[][]; // meters
          durations?: number[][]; // seconds (fallback estimate basis)
        };

        // Distances array (annotation=distance) — preferred
        let row: number[] | undefined = data.distances?.[0];

        if (!row) {
          console.warn('[OSRM-TABLE] distances missing — keys:', Object.keys(data));
        }

        if (!row && data.durations?.[0]) {
          // Fallback: estimate distance from duration (~35 km/h urban
          // average) — marked approximate but road-based (still better
          // than straight-line for consistency)
          row = data.durations[0].map((sec) => Math.round((sec * 35000) / 3600));
        }

        if (!row || cancelled) return;

        const map = new Map<string, number>();
        targets.forEach((poi, i) => {
          const d = row![i];
          if (typeof d === 'number' && d > 0) map.set(poi.id, Math.round(d));
        });
        if (!cancelled) setRoadDistances(map);
      } catch {
        // Silent — straight-line (≈) fallback remains
      }
    })();

    return () => { cancelled = true; };
  }, [pois, projectLat, projectLng]);

  // ── Selected POI → fly + highlight + OSRM route fetch ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPoi) return;

    // Fly + popup
    const marker = markersRef.current.get(selectedPoi.id);
    if (marker) {
      map.flyTo([selectedPoi.lat, selectedPoi.lng], 15, { duration: 0.8 });
      marker.openPopup();
    }

    // Clear previous route (fill + casing + label)
    if (routeLineRef.current) {
      const oldFill = routeLineRef.current;
      const oldCasing = (oldFill as unknown as { _casing?: L.Polyline })._casing;
      const oldLabel = (oldFill as unknown as { _label?: L.Marker })._label;
      oldFill.remove();
      oldCasing?.remove();
      oldLabel?.remove();
      routeLineRef.current = null;
    }
    setRouteData(null);

    // OSRM road route — fetch (free public server)
    let cancelled = false;
    setRouteLoading(true);
    (async () => {
      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${projectLng},${projectLat};${selectedPoi.lng},${selectedPoi.lat}` +
          `?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('routing failed');
        const data = (await res.json()) as {
          routes?: Array<{
            distance: number; // meters
            duration: number; // seconds
            geometry: { coordinates: Array<[number, number]> }; // [lng, lat]
          }>;
        };

        const route = data.routes?.[0];
        if (!route || cancelled) return;

        const coords = route.geometry.coordinates.map(
          ([lng, lat]): [number, number] => [lat, lng]
        );

        // Draw route polyline — brand teal, dashed with white casing
        const line = L.polyline(coords, {
          color: '#ffffff',
          weight: 8,
          opacity: 0.9,
        }).addTo(map);
        const lineFill = L.polyline(coords, {
          color: '#029bba',
          weight: 5,
          opacity: 1,
        }).addTo(map);
        // Combine in ref (fill on top of casing — remove both together)
        (line as unknown as { _casing?: L.Polyline })._casing = lineFill;
        routeLineRef.current = lineFill;
        (lineFill as unknown as { _casing?: L.Polyline })._casing = line;

        setRouteData({
          distanceMeters: Math.round(route.distance),
          durationSeconds: Math.round(route.duration),
          coords,
        });

        // Route midpoint — distance + duration label (Google-style)
        const midCoord = coords[Math.floor(coords.length / 2)];
        const routeLabel = L.marker(midCoord, {
          interactive: false, // clicks pass through to map
          zIndexOffset: 1000,
        })
          .addTo(map)
          .bindTooltip(
            `${fmtDistance(route.distance)} · ${fmtDuration(route.duration)}`,
            {
              permanent: true,
              direction: 'top',
              className: 'route-dist-label', // styled via CSS below
            }
          );
        // Track for cleanup with route lines
        (routeLineRef.current as unknown as { _label?: L.Marker })._label = routeLabel;

        // Fit map to route bounds (both pins + path visible)
        const bounds = L.latLngBounds(coords);
        bounds.extend([projectLat, projectLng]);
        bounds.extend([selectedPoi.lat, selectedPoi.lng]);
        map.fitBounds(bounds, { padding: [40, 40] });
      } catch {
        if (!cancelled) {
          // Silent fail — straight-line distance still shown (fallback)
        }
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPoi, projectLat, projectLng]);

  // ── Enterprise state machine: full reset on POI deselect ──
  useEffect(() => {
    if (!selectedPoi && routeLineRef.current) {
      // Remove route (fill + casing + midpoint label)
      const fill = routeLineRef.current;
      const casing = (fill as unknown as { _casing?: L.Polyline })._casing;
      const label = (fill as unknown as { _label?: L.Marker })._label;
      fill.remove();
      casing?.remove();
      label?.remove();
      routeLineRef.current = null;
      setRouteData(null);
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
    <div className="bg-white overflow-hidden flex flex-col h-full">
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

          {/* State machine: Discover → Refresh → Clear (cycle) */}
          <button
            type="button"
            onClick={() => {
              if (discovered) {
                clearAll();
              } else {
                void discover();
              }
            }}
            disabled={loading}
            title={
              enabledCats.size === 0
                ? 'Select at least one category above'
                : discovered
                  ? 'Clear all places and reset map'
                  : 'Discover places'
            }
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg
                        text-white text-sm font-bold shadow-sm transition-colors
                        disabled:opacity-50 ${
                          discovered
                            ? 'bg-gray-700 hover:bg-gray-800'
                            : 'bg-[#029bba] hover:bg-[#027a94]'
                        }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : discovered ? (
              <X className="w-4 h-4" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {loading ? 'Discovering...' : discovered ? 'Clear Map' : 'Discover Nearby'}
          </button>
        </div>
      </div>

      {/* Radius control — slider + quick presets */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide shrink-0">
            Radius
          </span>
          <input
            type="range"
            min={RADIUS_MIN}
            max={RADIUS_MAX}
            step={RADIUS_STEP}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            aria-label="Search radius in meters"
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                       accent-[#029bba] max-w-[240px]"
          />
          <span className="text-sm font-bold text-[#029bba] tabular-nums shrink-0 min-w-[52px]">
            {radius >= 1000
              ? `${(radius / 1000).toFixed(1)} km`
              : `${radius} m`}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRadius(r)}
              aria-pressed={radius === r}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                radius === r
                  ? 'bg-[#029bba] text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-[#029bba]/40'
              }`}
            >
              {r >= 1000
                ? `${(r / 1000).toFixed(r === 1000 || r === 10000 ? 0 : 1)} km`
                : `${r} m`}
            </button>
          ))}
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
        <div className="border-t lg:border-t-0 lg:border-l border-gray-100 flex flex-col h-full bg-gray-50">
          
          {/* Enhanced Tab Switcher */}
          <div className="flex bg-white border-b border-gray-100">
            {verifiedPlaces.length > 0 && (
              <button
                type="button"
                onClick={() => setSidebarTab('curated')}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-colors ${sidebarTab === 'curated' ? 'text-[#029bba] border-[#029bba]' : 'text-gray-400 border-transparent hover:text-gray-700'}`}
              >
                Curated ({verifiedPlaces.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setSidebarTab('discovered')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-colors ${sidebarTab === 'discovered' ? 'text-[#029bba] border-[#029bba]' : 'text-gray-400 border-transparent hover:text-gray-700'}`}
            >
              Discovered ({visiblePois.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] divide-y divide-gray-100 bg-white">
            
            {sidebarTab === 'curated' ? (
              <div className="p-2 space-y-1">
                {verifiedPlaces.map((vp, idx) => {
                  const catKey = (vp.category?.toLowerCase() || 'other') as PoiCategory;
                  const meta = CATEGORY_META[catKey] || CATEGORY_META.other;
                  const Icon = TAB_ICONS[catKey] || TAB_ICONS.other;
                  return (
                    <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded bg-white flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                          <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-gray-900 truncate">{vp.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <BadgeCheck className="w-3 h-3 text-[#10b981]" />
                            <span className="text-[10px] text-gray-500 font-medium">Verified Dist.</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-black text-[#004063] whitespace-nowrap bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">{vp.distance || 'â€”'}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="px-4 py-2 bg-gray-50 flex justify-between items-center border-b border-gray-100">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Live Map Data</p>
                  {selectedPoi && (
                    <button type="button" onClick={() => void clearAll()} className="text-[10px] text-[#ef4444] font-bold hover:underline">Clear Map</button>
                  )}
                </div>

                {error && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-[#ef4444] mb-2">{error}</p>
                    <button type="button" onClick={() => void discover()} className="text-xs font-bold text-[#029bba] hover:underline">Retry</button>
                  </div>
                )}

                {!error && !discovered && !loading && (
                  <div className="px-4 py-10 text-center">
                    <Search className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 font-bold">Discover Map Areas</p>
                    <p className="text-[11px] text-gray-400 mt-1">Click Discover Nearby to populate the map.</p>
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
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${isActive ? 'bg-[#029bba]/5 border-l-2 border-l-[#029bba]' : 'hover:bg-gray-50 border-l-2 border-l-transparent'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded flex items-center justify-center shrink-0 border border-gray-200 bg-white shadow-sm">
                          <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{poi.name}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{meta.label}</p>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-[#029bba] translate-x-1' : 'text-gray-300'}`} />
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Selected POI action bar — with OSRM road route */}
          {selectedPoi && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-sm font-bold text-gray-900 truncate">
                {selectedPoi.name}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: CATEGORY_META[selectedPoi.category].color }}
                >
                  {CATEGORY_META[selectedPoi.category].label}
                </span>

              </div>

              {/* Road route (OSRM) — the Highrise differentiator */}
              <div className="mt-2.5 rounded-lg bg-white border border-gray-200 p-2.5">
                {routeLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#029bba]" />
                    Calculating road route...
                  </div>
                ) : routeData ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-[#004063] flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-[#029bba]" />
                        Driving Route
                      </p>
                      <span className="text-[10px] text-gray-400">via road</span>
                    </div>
                    <p className="text-sm font-black text-[#029bba] tabular-nums mt-1">
                      {fmtDistance(routeData.distanceMeters)}
                      <span className="text-gray-400 font-bold mx-1">·</span>
                      <span className="text-gray-700">
                        {fmtDuration(routeData.durationSeconds)} drive
                      </span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Actual driving distance — {fmtDuration(routeData.durationSeconds)} by road
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-gray-400 italic">
                    Road route unavailable — straight-line distance shown
                  </p>
                )}
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