// components/project-detail/NeighborhoodInsights.tsx
// ============================================================================
// HIGHRISE.PK — Neighborhood Snapshot (Section 4)
// Scores + curated nearby places (Pakistan-specific, English + Roman Urdu tone)
// NOTE: Scores are estimates based on available nearbyFacilities data.
// ============================================================================

import React, { useMemo } from 'react';
import {
  Car,
  MapPin,
  HeartPulse,
  Landmark,
  GraduationCap,
  Hospital,
  UtensilsCrossed,
  ShoppingBag,
  TrainFront,
} from 'lucide-react';
import type { NearbyPlace } from '@/types/projectDetail';

type ScoreTone = 'good' | 'mid' | 'low';

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parseDistanceMeters(distance?: string): number | null {
  if (!distance) return null;
  const raw = String(distance).trim().toLowerCase();

  // Examples supported:
  // "500 m", "0.8 km", "2km", "1,200 m"
  const m = raw.match(/([\d.,]+)\s*(km|m)\b/);
  if (!m) return null;

  const value = Number(String(m[1]).replace(/,/g, ''));
  if (!Number.isFinite(value)) return null;

  const unit = m[2];
  if (unit === 'km') return Math.round(value * 1000);
  return Math.round(value);
}

function toneFromScore(score: number): ScoreTone {
  if (score >= 75) return 'good';
  if (score >= 50) return 'mid';
  return 'low';
}

function toneClasses(tone: ScoreTone): { pill: string; text: string; segmentOn: string } {
  if (tone === 'good') {
    return {
      pill: 'bg-[#10b981]/10 border border-[#10b981]/20',
      text: 'text-[#10b981]',
      segmentOn: 'bg-[#10b981]',
    };
  }
  if (tone === 'mid') {
    return {
      pill: 'bg-[#f59e0b]/10 border border-[#f59e0b]/20',
      text: 'text-[#f59e0b]',
      segmentOn: 'bg-[#f59e0b]',
    };
  }
  return {
    pill: 'bg-gray-50 border border-gray-200',
    text: 'text-gray-600',
    segmentOn: 'bg-gray-400',
  };
}

function computeScoreFromPlaces(
  places: NearbyPlace[],
  weights: Record<string, number>,
  maxKm = 8
): number {
  const maxMeters = maxKm * 1000;

  // For each category, take the closest distance (best signal)
  const closestByCategory = new Map<string, number>();

  for (const p of places) {
    const cat = String(p.category || 'other').toLowerCase();
    const meters = parseDistanceMeters(p.distance);
    if (!meters) continue;

    const prev = closestByCategory.get(cat);
    if (prev === undefined || meters < prev) closestByCategory.set(cat, meters);
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  let weighted = 0;
  for (const [cat, w] of Object.entries(weights)) {
    const d = closestByCategory.get(cat);
    const meters = d ?? maxMeters;

    // nearer = better, normalized 0..1
    const norm = clamp(1 - meters / maxMeters, 0, 1);
    weighted += w * norm;
  }

  return clamp(Math.round((weighted / totalWeight) * 100), 0, 100);
}

function pickBest(places: NearbyPlace[], category: string): NearbyPlace | null {
  const cat = category.toLowerCase();
  const inCat = places
    .filter((p) => String(p.category || '').toLowerCase() === cat)
    .map((p) => ({ p, m: parseDistanceMeters(p.distance) ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => a.m - b.m);

  return inCat[0]?.p ?? null;
}

export default function NeighborhoodInsights({ places }: { places?: NearbyPlace[] }) {
  const safePlaces = places ?? [];

  const scores = useMemo(() => {
    const access = computeScoreFromPlaces(safePlaces, {
      transport: 45,
      bank: 15,
      mall: 20,
      mosque: 20,
    });

    const commute = computeScoreFromPlaces(safePlaces, {
      transport: 60,
      school: 15,
      hospital: 15,
      restaurant: 10,
    });

    const livability = computeScoreFromPlaces(safePlaces, {
      hospital: 25,
      school: 20,
      mosque: 15,
      restaurant: 20,
      mall: 10,
      park: 10,
    });

    return { access, commute, livability };
  }, [safePlaces]);

  const essentials = useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      place: NearbyPlace | null;
    }> = [
      { key: 'school', label: 'Schools', icon: GraduationCap, place: pickBest(safePlaces, 'school') },
      { key: 'hospital', label: 'Hospitals', icon: Hospital, place: pickBest(safePlaces, 'hospital') },
      { key: 'restaurant', label: 'Restaurants', icon: UtensilsCrossed, place: pickBest(safePlaces, 'restaurant') },
      { key: 'mall', label: 'Shopping', icon: ShoppingBag, place: pickBest(safePlaces, 'mall') },
      { key: 'mosque', label: 'Mosques', icon: Landmark, place: pickBest(safePlaces, 'mosque') },
      { key: 'transport', label: 'Transit', icon: TrainFront, place: pickBest(safePlaces, 'transport') },
    ];

    return items;
  }, [safePlaces]);

  // Hide entire snapshot if there is absolutely no curated data
  const hasCurated = safePlaces.length > 0;

  const accessTone = toneFromScore(scores.access);
  const commuteTone = toneFromScore(scores.commute);
  const liveTone = toneFromScore(scores.livability);

  const accessC = toneClasses(accessTone);
  const commuteC = toneClasses(commuteTone);
  const liveC = toneClasses(liveTone);

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-[#001f2b] tracking-tight">
            Neighborhood Snapshot
          </h3>
          <p className="text-gray-600 text-sm mt-1">
            Quick signals for access, commute, and livability — traffic ka scene vary karta hai, so treat as estimate.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-gray-500 bg-[#f4f9fb] border border-gray-200 rounded-full px-3 py-1">
          <MapPin className="w-3.5 h-3.5 text-[#029bba]" />
          Data-based estimate
        </div>
      </div>

      {/* Scores */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ScoreCard
          title="Society Access Score"
          subtitle="Banks, mosques, shopping, transit"
          score={scores.access}
          icon={<MapPin className="w-4 h-4 text-[#029bba]" />}
          tone={accessTone}
          tonePill={accessC.pill}
          toneText={accessC.text}
          segmentOn={accessC.segmentOn}
        />
        <ScoreCard
          title="Commute Score"
          subtitle="Transit + daily essentials"
          score={scores.commute}
          icon={<Car className="w-4 h-4 text-[#029bba]" />}
          tone={commuteTone}
          tonePill={commuteC.pill}
          toneText={commuteC.text}
          segmentOn={commuteC.segmentOn}
        />
        <ScoreCard
          title="Livability Score"
          subtitle="Family-friendly lifestyle mix"
          score={scores.livability}
          icon={<HeartPulse className="w-4 h-4 text-[#029bba]" />}
          tone={liveTone}
          tonePill={liveC.pill}
          toneText={liveC.text}
          segmentOn={liveC.segmentOn}
        />
      </div>

      {/* Essentials list */}
      <div className="mt-5 bg-[#f8fcfd] border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-gray-900">Nearby Essentials</p>
          <p className="text-xs text-gray-500">
            {hasCurated ? 'Curated by developer / listing data' : 'No curated nearby data available yet'}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {essentials.map((it) => {
            const Icon = it.icon;
            return (
              <div
                key={it.key}
                className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-200"
              >
                <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#029bba]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">{it.label}</p>
                  {it.place ? (
                    <p className="text-sm text-gray-600 truncate">
                      {it.place.name}
                      <span className="text-gray-400 font-semibold"> {' · '} </span>
                      <span className="tabular-nums">{it.place.distance ?? '—'}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Not listed yet
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
          Tip: For accurate travel time, open directions in Google Maps (peak hours mein difference aa sakta hai).
        </p>
      </div>
    </div>
  );
}

function ScoreCard(props: {
  title: string;
  subtitle: string;
  score: number;
  icon: React.ReactNode;
  tone: ScoreTone;
  tonePill: string;
  toneText: string;
  segmentOn: string;
}) {
  const filled = clamp(Math.round(props.score / 10), 0, 10);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">{props.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{props.subtitle}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-[#f4f9fb] border border-gray-200 flex items-center justify-center shrink-0">
          {props.icon}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className={`px-2.5 py-1 rounded-full text-xs font-black ${props.tonePill} ${props.toneText}`}>
          {props.score}/100
        </div>

        <div className="flex items-center gap-1" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-3 rounded-full ${
                i < filled ? props.segmentOn : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}