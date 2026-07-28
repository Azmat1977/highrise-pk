/**
 * components/project-detail/ProjectHighlights.tsx
 *
 * Highrise.pk — Project Highlights Section (Wave 5B)
 *
 * Purpose:
 *   Quick 5-second scan of project's key selling points.
 *   Auto-detects iconic features from amenities + project data.
 *
 * Features:
 *   → Grid of 8-12 highlights with icons
 *   → Smart auto-detection from project.amenitiesDetailed
 *   → Fallback to universal amenities if none provided
 *   → Responsive: 2 cols mobile → 3 cols tablet → 4 cols desktop
 *   → Icon mapping (25+ amenity types)
 *   → Featured highlight badges (Premium, Exclusive, etc.)
 *
 * Rules:
 *   → Tailwind only (zero inline styles)
 *   → Lucide React icons only
 *   → No framer-motion (CSS transitions only)
 *   → Mobile-first (375px min)
 *   → Guest-first (no login required)
 *
 * SEO:
 *   → Semantic <section> with heading hierarchy
 *   → aria-label on each highlight
 *
 * SECURITY:
 *   → No user HTML rendered (uses safe icon mapping)
 *   → No external links
 */

'use client';

import React from 'react';
import {
  Sparkles,
  Waves,          // Swimming Pool
  Dumbbell,       // Gym
  Shield,         // Security
  Car,            // Parking
  Zap,            // Backup Power
  Trees,          // Garden
  Star,           // Mosque
  Wifi,           // Internet
  Building,       // Elevator
  Film,           // Cinema
  Baby,           // Kids Play
  MapPin,         // Location
  Cctv,           // CCTV
  Utensils,       // Restaurant
  ShoppingBag,    // Shopping
  Coffee,         // Cafe
  Briefcase,      // Business
  Heart,          // Health
  BookOpen,       // Library
  Users,          // Community
  Lock,           // Security Gate
  Sun,            // Rooftop
  Home,           // Duplex
  Store,          // Retail
  Flame,          // Fire Safety
  DoorClosed,     // Concierge
  ArrowUpDown,    // High-Speed Elevator
  Phone,          // Intercom
  Snowflake,      // Central AC
  Award,          // Premium
  CheckCircle2,   // Generic
} from 'lucide-react';

import type { ProjectDetailData, AmenityItem } from '@/types/projectDetail';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface ProjectHighlightsProps {
  project: ProjectDetailData;
}

interface Highlight {
  id:       string;
  label:    string;
  icon:     React.ReactElement;
  featured?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// AMENITY → ICON MAPPING
// Maps common amenity keywords to Lucide icons
// ─────────────────────────────────────────────────────────────────────────────

const AMENITY_ICON_MAP: { keywords: string[]; icon: React.ReactElement; color: string }[] = [
  // Water
  { keywords: ['pool', 'swimming', 'jacuzzi'],       icon: <Waves className="w-5 h-5" />,       color: 'text-blue-600' },
  // Fitness
  { keywords: ['gym', 'fitness', 'workout'],          icon: <Dumbbell className="w-5 h-5" />,     color: 'text-red-600' },
  // Security
  { keywords: ['security', 'guard', 'patrol'],        icon: <Shield className="w-5 h-5" />,       color: 'text-emerald-600' },
  { keywords: ['cctv', 'surveillance', 'camera'],     icon: <Cctv className="w-5 h-5" />,         color: 'text-purple-600' },
  { keywords: ['gate', 'gated'],                       icon: <Lock className="w-5 h-5" />,         color: 'text-slate-600' },
  // Parking
  { keywords: ['parking', 'garage', 'basement park'], icon: <Car className="w-5 h-5" />,          color: 'text-gray-700' },
  // Power
  { keywords: ['backup', 'generator', 'power'],       icon: <Zap className="w-5 h-5" />,          color: 'text-amber-600' },
  // Nature
  { keywords: ['garden', 'landscape', 'green', 'park'], icon: <Trees className="w-5 h-5" />,      color: 'text-green-700' },
  { keywords: ['rooftop', 'terrace'],                  icon: <Sun className="w-5 h-5" />,          color: 'text-orange-600' },
  // Spiritual
  { keywords: ['mosque', 'prayer', 'jamat'],          icon: <Star className="w-5 h-5" />,         color: 'text-teal-600' },
  // Tech
  { keywords: ['wifi', 'internet', 'fiber'],          icon: <Wifi className="w-5 h-5" />,         color: 'text-cyan-600' },
  { keywords: ['intercom', 'phone'],                   icon: <Phone className="w-5 h-5" />,        color: 'text-indigo-600' },
  // Elevator
  { keywords: ['elevator', 'lift', 'escalator'],      icon: <ArrowUpDown className="w-5 h-5" />,  color: 'text-blue-700' },
  // Entertainment
  { keywords: ['cinema', 'theater', 'movie'],         icon: <Film className="w-5 h-5" />,         color: 'text-pink-600' },
  // Family
  { keywords: ['kids', 'children', 'play'],           icon: <Baby className="w-5 h-5" />,         color: 'text-rose-600' },
  { keywords: ['community', 'club', 'lounge'],        icon: <Users className="w-5 h-5" />,        color: 'text-violet-600' },
  // Business
  { keywords: ['business', 'office', 'meeting', 'conference'], icon: <Briefcase className="w-5 h-5" />, color: 'text-slate-700' },
  // Retail / Food
  { keywords: ['retail', 'shop', 'mall'],             icon: <Store className="w-5 h-5" />,        color: 'text-purple-600' },
  { keywords: ['restaurant', 'dining', 'food court'], icon: <Utensils className="w-5 h-5" />,     color: 'text-orange-700' },
  { keywords: ['shopping'],                            icon: <ShoppingBag className="w-5 h-5" />,  color: 'text-pink-700' },
  { keywords: ['cafe', 'coffee'],                     icon: <Coffee className="w-5 h-5" />,       color: 'text-amber-700' },
  // Health
  { keywords: ['health', 'clinic', 'medical', 'spa'], icon: <Heart className="w-5 h-5" />,        color: 'text-red-700' },
  // Reading
  { keywords: ['library', 'reading'],                 icon: <BookOpen className="w-5 h-5" />,     color: 'text-blue-800' },
  // Fire safety
  { keywords: ['fire', 'sprinkler'],                  icon: <Flame className="w-5 h-5" />,        color: 'text-red-600' },
  // Concierge
  { keywords: ['concierge', 'doorman', 'reception'],  icon: <DoorClosed className="w-5 h-5" />,   color: 'text-indigo-700' },
  // AC
  { keywords: ['ac', 'air conditioning', 'central cooling'], icon: <Snowflake className="w-5 h-5" />, color: 'text-sky-600' },
];

/**
 * Match amenity name to icon
 */
function getIconForAmenity(name: string): { icon: React.ReactElement; color: string } {
  const lower = name.toLowerCase();

  for (const mapping of AMENITY_ICON_MAP) {
    if (mapping.keywords.some(kw => lower.includes(kw))) {
      return { icon: mapping.icon, color: mapping.color };
    }
  }

  // Fallback icon
  return {
    icon:  <CheckCircle2 className="w-5 h-5" />,
    color: 'text-[#029bba]',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-DETECT HIGHLIGHTS FROM PROJECT DATA
// ─────────────────────────────────────────────────────────────────────────────

function buildHighlights(project: ProjectDetailData): Highlight[] {
  const highlights: Highlight[] = [];
  const seenLabels = new Set<string>();

  // ── Add unique amenities ──
  const amenities = project.amenitiesDetailed ?? [];
  for (const amenity of amenities) {
    if (highlights.length >= 12) break;
    if (!amenity.name || seenLabels.has(amenity.name.toLowerCase())) continue;

    seenLabels.add(amenity.name.toLowerCase());
    const { icon } = getIconForAmenity(amenity.name);

    highlights.push({
      id:    `amenity-${highlights.length}`,
      label: amenity.name,
      icon:  React.cloneElement(
        icon as React.ReactElement<{ className?: string }>,
        { className: 'w-5 h-5' },
      ),
    });
  }

  // ── Add universal Highrise highlights if we have space ──
  const universalHighlights = [
    {
      condition: project.isVerified,
      label:    'Highrise Verified',
      icon:     <Award className="w-5 h-5" />,
      featured: true,
    },
    {
      condition: project.isTrustedBuilder,
      label:    'Trusted Builder',
      icon:     <Shield className="w-5 h-5" />,
      featured: true,
    },
    {
      condition: (project.nocStatus ?? '').toLowerCase() === 'approved',
      label:    'NOC Approved',
      icon:     <CheckCircle2 className="w-5 h-5" />,
      featured: true,
    },
    {
      condition: true, // Always show
      label:    'Zero Buyer Commission',
      icon:     <Heart className="w-5 h-5" />,
      featured: true,
    },
  ];

  for (const uh of universalHighlights) {
    if (highlights.length >= 12) break;
    if (uh.condition && !seenLabels.has(uh.label.toLowerCase())) {
      seenLabels.add(uh.label.toLowerCase());
      highlights.push({
        id:       `universal-${highlights.length}`,
        label:    uh.label,
        icon:     uh.icon,
        featured: uh.featured,
      });
    }
  }

  return highlights;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectHighlights({ project }: ProjectHighlightsProps) {
  const highlights = buildHighlights(project);

  // Hide section if no highlights
  if (highlights.length === 0) return null;

  return (
    <section
      id="highlights"
      className="max-w-7xl mx-auto px-4 py-4"
      aria-label={`Highlights of ${project.projectName}`}
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#029bba]/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#029bba]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Highlights
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Key features at a glance
              </p>
            </div>
          </div>
        </div>

        {/* ── Highlights Grid — Apartments.com clean style ── */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
            {highlights.map((h) => (
              <div
                key={h.id}
                className="group flex items-center gap-3"
                aria-label={h.label}
              >
                {/* Icon — inline, small */}
                <div className="flex-shrink-0 text-[#029bba] group-hover:scale-110 transition-transform">
                  {h.icon}
                </div>

                {/* Label — text only, no box */}
                <span className={`
                  text-sm leading-snug
                  ${h.featured
                    ? 'font-black text-[#004063] group-hover:text-[#029bba]'
                    : 'font-semibold text-gray-700 group-hover:text-[#029bba]'
                  }
                  transition-colors
                `}>
                  {h.label}
                </span>
              </div>
            ))}
          </div>

          {/* ── Footer note ── */}
          {highlights.length >= 12 && (
            <p className="text-xs text-gray-400 mt-5 pt-4 border-t border-gray-100 text-center">
              Showing top 12 highlights · See{' '}
              <a
                href="#features"
                className="text-[#029bba] font-bold hover:underline"
              >
                Features & Amenities
              </a>
              {' '}for full list
            </p>
          )}
        </div>
      </div>
    </section>
  );
}