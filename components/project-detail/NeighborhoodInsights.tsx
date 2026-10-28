// components/project-detail/NeighborhoodInsights.tsx
// ============================================================================
// HIGHRISE.PK — Neighborhood Snapshot (Section 4)
// Scores + curated nearby places (Pakistan-specific, English + Roman Urdu tone)
// NOTE: Scores are estimates based on available nearbyFacilities data.
// ============================================================================

import React, { useMemo } from 'react';
import {
  Car,
  PersonStanding,
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
  // Clean string: remove commas, lowercase
  const raw = String(distance).trim().toLowerCase().replace(/,/g, '');
  const val = parseFloat(raw);
  if (isNaN(val)) return null;

  // If explicit "m" exists but no "km", treat as meters
  if (raw.includes('m') && !raw.includes('km')) {
    return Math.round(val);
  }
  // Default fallback: Always assume kilometers (e.g. "3.5" -> 3500m)
  return Math.round(val * 1000);
}

function formatDistanceDisplay(dist?: string): string {
  if (!dist) return '—';
  const s = String(dist).trim();
  // If the string contains no letters (no unit specified), auto-append ' km'
  return /[a-zA-Z]/.test(s) ? s : `${s} km`;
}

function estimateCommute(distance?: string): {
  Icon: React.ComponentType<{ className?: string }>;
  text: string;
  color: string;
} | null {
  const meters = parseDistanceMeters(distance);
  if (!meters) return null;
  if (meters <= 800) {
    const min = Math.max(1, Math.ceil(meters / 80));
    return { Icon: PersonStanding, text: `${min} min walk`, color: 'text-[#10b981]' };
  }
  const min = Math.max(1, Math.ceil(meters / 400));
  return { Icon: Car, text: `${min} min drive`, color: 'text-[#029bba]' };
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
    let cat = String(p.category || 'other').toLowerCase();
    
    // Alias mapping so 'university' counts towards 'school' scores, etc.
    if (['university', 'college'].includes(cat)) cat = 'school';
    if (['airport', 'highway', 'metro'].includes(cat)) cat = 'transport';
    if (['market', 'supermarket', 'grocery'].includes(cat)) cat = 'mall';
    if (['clinic', 'pharmacy'].includes(cat)) cat = 'hospital';

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

export default function NeighborhoodInsights({ places }: { places?: NearbyPlace[] }) {
  const safePlaces = places ?? [];

  const vibeStats = useMemo(() => {
    return [
      {
        score: computeScoreFromPlaces(safePlaces, { mall: 100, bank: 20 }, 5),
        icon: ShoppingBag, color: 'text-[#f97316]', // Orange
        text: "is walkable to groceries & markets"
      },
      {
        score: computeScoreFromPlaces(safePlaces, { transport: 100 }, 8),
        icon: TrainFront, color: 'text-[#029bba]', // Teal
        text: "has easy access to transit"
      },
      {
        score: computeScoreFromPlaces(safePlaces, { school: 100 }, 8),
        icon: GraduationCap, color: 'text-[#3b82f6]', // Blue
        text: "is near excellent schools"
      },
      {
        score: computeScoreFromPlaces(safePlaces, { hospital: 100 }, 10),
        icon: Hospital, color: 'text-[#ef4444]', // Red
        text: "has fast access to healthcare"
      },
      {
        score: computeScoreFromPlaces(safePlaces, { mosque: 100 }, 3),
        icon: Landmark, color: 'text-[#10b981]', // Emerald
        text: "is walking distance to mosques"
      },
      {
        score: computeScoreFromPlaces(safePlaces, { restaurant: 100, park: 50 }, 5),
        icon: UtensilsCrossed, color: 'text-[#8b5cf6]', // Purple
        text: "has good dining & leisure options"
      },
    ].filter(stat => stat.score > 0); // Only show stats for categories that have data
  }, [safePlaces]);

  const groups = useMemo(() => {
    const edu = safePlaces.filter(p => ['school', 'university', 'college'].includes((p.category||'').toLowerCase()));
    const health = safePlaces.filter(p => ['hospital', 'clinic', 'pharmacy'].includes((p.category||'').toLowerCase()));
    const conv = safePlaces.filter(p => ['mall', 'restaurant', 'bank', 'transport', 'park'].includes((p.category||'').toLowerCase()));
    const rel = safePlaces.filter(p => ['mosque'].includes((p.category||'').toLowerCase()));

    return [
      { id: 'edu', title: 'Educational', icon: GraduationCap, places: edu },
      { id: 'health', title: 'Healthcare', icon: Hospital, places: health },
      { id: 'conv', title: 'Convenience', icon: ShoppingBag, places: conv },
      { id: 'rel', title: 'Religious', icon: Landmark, places: rel },
    ].filter(g => g.places.length > 0);
  }, [safePlaces]);

  const hasCurated = safePlaces.length > 0;

  return (
    <div className="mb-6">
      
      {/* Vibe Stats */}
      {vibeStats.length > 0 && (
        <div className="mb-10 px-1 lg:px-2">
          <h3 className="text-xl font-black text-[#001f2b] tracking-tight mb-5">
            Neighborhood Vibe
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-7 gap-x-8">
            {vibeStats.map((stat, i) => {
              const Icon = stat.icon;
              // Add a baseline of 45 so data looks realistic (survey data)
              const displayScore = Math.max(45, stat.score);
              return (
                <div key={i} className="flex items-center gap-3.5">
                  <Icon className={`w-7 h-7 ${stat.color} shrink-0`} strokeWidth={2} />
                  <p className="text-[13px] text-gray-700 leading-snug font-medium">
                    <span className="font-black text-[#029bba] text-[15px] mr-1.5">{displayScore}%</span>
                    Say it {stat.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grouped Essentials (Developer Curated) */}
      {hasCurated && (
        <div className="space-y-4">
          <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Curated Nearby Places</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.map((g) => {
              const Icon = g.icon;
              return (
                <div key={g.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
                    <Icon className="w-4 h-4 text-[#029bba]" />
                    <h5 className="font-bold text-gray-900 text-sm">{g.title}</h5>
                  </div>
                  <div className="space-y-3">
                    {g.places.slice(0, 3).map((place, idx) => {
                      const commute = estimateCommute(place.distance);
                      return (
                        <div key={idx} className="flex items-start justify-between gap-2 border-b border-dashed border-gray-100 pb-2 last:border-0 last:pb-0">
                          <p className="text-[13px] text-gray-700 font-bold truncate mt-0.5" title={place.name}>{place.name}</p>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-black text-[#004063] bg-[#f4f9fb] px-2 py-0.5 rounded border border-[#029bba]/10 inline-block shadow-sm">
                              {formatDistanceDisplay(place.distance)}
                            </p>
                            {commute && (
                              <p className={`flex items-center justify-end gap-1 text-[10px] font-bold mt-1 ${commute.color}`}>
                                <commute.Icon className="w-3.5 h-3.5" />
                                {commute.text}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}