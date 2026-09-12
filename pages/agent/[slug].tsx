// pages/agent/[slug].tsx
// Public Agent Profile Page — enterprise ISR rewrite
// - ISR: getStaticProps + getStaticPaths (fallback: blocking)
// - Full SEO: title, description, OG, Twitter, JSON-LD
// - No client-side data fetch for primary content
// - Sanitized JSON-LD (no XSS via dangerouslySetInnerHTML)
// - ReviewsList placeholder (Section 6/7)
// - API controls phone/email masking
// - Zero any — fully typed
// - No alert() — inline clipboard feedback

import React, { useState, useCallback } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Phone,
  Mail,
  Shield,
  Star,
  MessageCircle,
  Briefcase,
  Home,
  Share2,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Twitter,
  Maximize,
  Bed,
  Bath,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Users,
  Clock,
  Copy,
  Check,
  Info,
  Quote,
} from "lucide-react";
import dbConnect from "@/lib/dbConnect";

// V6.8.9: Swiper carousel library imports
// Using Swiper — industry-standard carousel (used by Instagram, Airbnb)
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination, EffectFade, Keyboard } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

// V6.8.9 + V6.8.10: Custom Swiper styles injected via style tag
// Overrides default Swiper theme to match Highrise brand
const SWIPER_CUSTOM_STYLES = `
  .highrise-review-swiper .swiper-pagination-bullet,
  .highrise-property-swiper .swiper-pagination-bullet {
    background: #cbd5e1;
    opacity: 1;
    width: 8px;
    height: 8px;
    transition: all 0.3s;
  }
  .highrise-review-swiper .swiper-pagination-bullet-active,
  .highrise-property-swiper .swiper-pagination-bullet-active {
    background: #029bba;
    width: 24px;
    border-radius: 4px;
  }
  .highrise-review-swiper,
  .highrise-property-swiper {
    padding-bottom: 50px !important;
  }
  /* Property carousel — smooth transitions */
  .highrise-property-swiper .swiper-slide {
    height: auto;
  }
`;

// ─── Serialization Helper ─────────────────────────────────────────────────────
// Next.js getStaticProps cannot serialize `undefined` values.
// This helper recursively converts undefined → removed (or preserves null).
// Handles: nested objects, arrays, Dates (→ ISO strings), ObjectIds (→ strings).

function serializeForNext<T>(value: T): T {
  if (value === undefined) {
    // Undefined at top level — return null (caller must handle)
    return null as unknown as T;
  }
  if (value === null) return value;

  // Dates → ISO strings
  if (value instanceof Date) {
    return value.toISOString() as unknown as T;
  }

  // Handle Mongoose ObjectIds and similar objects with toString
  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    value.constructor?.name === "ObjectId"
  ) {
    return String(value) as unknown as T;
  }

  // Arrays — recurse
  if (Array.isArray(value)) {
    return value
      .filter((v) => v !== undefined)
      .map((v) => serializeForNext(v)) as unknown as T;
  }

  // Plain objects — recurse, omit undefined keys
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (val === undefined) continue;
      result[key] = serializeForNext(val);
    }
    return result as unknown as T;
  }

  // Primitives — return as-is
  return value;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentSocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  twitter?: string;
}

interface AgentStats {
  activeListings: number;
  soldProperties: number;
  rentedProperties: number;
  responseRate?: number;
}

interface AgentRatings {
  averageRating: number;
  totalReviews: number;
}

interface PublicAgent {
  _id: string;
  slug: string;
  displayName: string;
  tagline?: string;
  about?: string;
  agentType: "individual" | "agency" | "freelance";
  agencyName?: string;
  city: string;
  // V6.8.5: REAL contact data (revealed on user click)
  phone?: string;      // Full phone number (e.g. +923001234567)
  email?: string;      // Full email (e.g. agent@example.com)
  whatsapp?: string;   // Full WhatsApp number
  officeVerification?: {
    address?: string;
    city?: string;
    coordinates?: {
      latitude:  number;
      longitude: number;
    };
  };
  experience?: {
    years: number;
    totalDeals?: number;
    totalValue?: number;
  };
  serviceAreas?: {
    cities?: string[];
    localities?: string[];
  };
  specializations?: string[];
  languages?: string[];
  socialLinks?: AgentSocialLinks;
  businessHours?: {
    weekdays?: string;
    weekends?: string;
  };
  documents?: {
    profilePhoto?: { url?: string };
    coverPhoto?: { url?: string };
  };
  // V6.8.5: Agency logo (top-level, agency accounts only)
  agencyLogo?: { url?: string };
  verificationLevel?:
    | "not_verified"
    | "documents_pending"
    | "basic_verified"
    | "license_verified"
    | "full_verified"
    | "premium_verified";
  stats?: AgentStats;
  ratings?: AgentRatings;
  createdAt?: string;
  // V6.8.8: Published reviews only (admin-curated)
  reviews?: Array<{
    _id?:          string;
    rating:        number;
    reviewText:    string;
    reviewerName:  string;
    reviewerCity?: string;
    source:        string;
    addedAt:       string;
  }>;
}

interface PublicProperty {
  _id: string;
  title: string;
  slug?: string;
  price: number;
  totalPrice?: number;
  area: number;
  unit: string;
  city: string;
  locality?: string;
  society?: string;
  propertyType: string;
  listingType: string;
  bedrooms?: number;
  bathrooms?: number;
  images?: { url: string }[];
}

interface PageProps {
  agent: PublicAgent;
  properties: PublicProperty[];
}

type ActiveTab = "all" | "sale" | "rent";

// V6.8.10: Property category active tab
type ActivePropertyCategory = PropertyCategory;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price >= 10_000_000) return `${(price / 10_000_000).toFixed(2)} Cr`;
  if (price >= 100_000) return `${(price / 100_000).toFixed(2)} Lac`;
  return price.toLocaleString();
}

function formatMemberSince(dateString?: string): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
  });
}

function sanitizeForJsonLd(str: string): string {
  return str
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/'/g, "\\u0027");
}

function getVerificationConfig(level?: string): {
  label: string;
  bg: string;
  text: string;
  show: boolean;
} {
  const map: Record<string, { label: string; bg: string; text: string; show: boolean }> = {
    not_verified: { label: "Not Verified", bg: "bg-gray-100", text: "text-gray-600", show: false },
    documents_pending: { label: "Pending Verification", bg: "bg-yellow-100", text: "text-yellow-700", show: true },
    basic_verified: { label: "Basic Verified", bg: "bg-blue-100", text: "text-blue-700", show: true },
    license_verified: { label: "License Verified", bg: "bg-indigo-100", text: "text-indigo-700", show: true },
    full_verified: { label: "Verified Agent", bg: "bg-green-100", text: "text-green-700", show: true },
    premium_verified: { label: "Premium Agent", bg: "bg-purple-100", text: "text-purple-700", show: true },
  };
  return map[level ?? "not_verified"] ?? map.not_verified;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-400";
}

// V6.8.10: Property category configuration
// Groups property types into user-friendly categories with icons
const PROPERTY_CATEGORIES = [
  {
    key:   "all",
    label: "All",
    icon:  "🏘️",
    matches: (_p: PublicProperty) => true,
  },
  {
    key:   "residential",
    label: "Residential",
    icon:  "🏠",
    matches: (p: PublicProperty) => {
      const t = (p.propertyType ?? "").toLowerCase();
      return ["house", "flat", "apartment", "penthouse", "villa", "farmhouse", "room", "residential"].includes(t);
    },
  },
  {
    key:   "commercial",
    label: "Commercial",
    icon:  "🏢",
    matches: (p: PublicProperty) => {
      const t = (p.propertyType ?? "").toLowerCase();
      return ["office", "shop", "warehouse", "factory", "building", "commercial", "retail"].includes(t);
    },
  },
  {
    key:   "plots",
    label: "Plots & Land",
    icon:  "🌍",
    matches: (p: PublicProperty) => {
      const t = (p.propertyType ?? "").toLowerCase();
      return ["plot", "land", "agricultural", "commercial-plot", "residential-plot"].includes(t);
    },
  },
  {
    key:   "rental",
    label: "For Rent",
    icon:  "🔑",
    matches: (p: PublicProperty) => p.listingType === "rent",
  },
] as const;

type PropertyCategory = typeof PROPERTY_CATEGORIES[number]["key"];

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://highrise.pk";

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  return (
    <div
      className={`p-5 rounded-2xl ${bg} text-center transition-transform hover:scale-105`}
    >
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 font-semibold uppercase tracking-widest mt-1">
        {label}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
      {children}
    </h3>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function ColorChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="px-3 py-1.5 bg-[#029bba]/10 text-[#029bba] rounded-full text-sm font-medium"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

// ─── Highrise Insight Card ────────────────────────────────────────────────────

function InsightCard({ agent }: { agent: PublicAgent }) {
  const verification = getVerificationConfig(agent.verificationLevel);
  const hasReviews  = (agent.ratings?.totalReviews ?? 0) > 0;
  const ratingPct   = ((agent.ratings?.averageRating ?? 0) / 5) * 100;
  const responsePct = agent.stats?.responseRate ?? 0;

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[#029bba] flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Highrise Insight</p>
          <p className="text-xs text-gray-500">Verified by Highrise.pk</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Rating Bar — ONLY shown when reviews exist (Highrise-verified only) */}
        {hasReviews && (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-gray-600">
                Client Rating
              </span>
              <span className="text-sm font-black text-gray-900">
                {agent.ratings!.averageRating.toFixed(1)}/5
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getScoreColor(ratingPct)}`}
                style={{ width: `${ratingPct}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
              <CheckCircle className="w-2.5 h-2.5 text-green-500" />
              {agent.ratings!.totalReviews} Highrise-verified review{agent.ratings!.totalReviews !== 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Response Rate Bar — only shown if activity exists */}
        {responsePct > 0 && (
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-gray-600">
                Response Rate
              </span>
              <span className="text-sm font-black text-gray-900">
                {responsePct}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${getScoreColor(responsePct)}`}
                style={{ width: `${responsePct}%` }}
              />
            </div>
          </div>
        )}

        {/* Verification Badge */}
        {verification.show && (
          <div className="pt-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${verification.bg} ${verification.text}`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {verification.label}
            </span>
          </div>
        )}

        {/* Member Since */}
        {agent.createdAt && (
          <p className="text-xs text-gray-400 pt-2 border-t border-gray-200">
            Member since {formatMemberSince(agent.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Property Card ────────────────────────────────────────────────────────────

function PropertyCard({ property }: { property: PublicProperty }) {
  const imgUrl = property.images?.[0]?.url;
  const href = `/property/${property.slug ?? property._id}`;
  const isRent = property.listingType === "rent";

  return (
    <Link href={href} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
        {/* Image */}
        <div className="relative h-52 bg-gray-100 overflow-hidden">
          {imgUrl ? (
            <Image
              src={imgUrl}
              alt={property.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <Home className="w-12 h-12" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className="px-2.5 py-1 bg-black/50 backdrop-blur-sm text-white text-xs font-bold rounded-lg">
              {isRent ? "For Rent" : "For Sale"}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          <h3 className="font-bold text-gray-900 group-hover:text-[#029bba] transition-colors mb-1 line-clamp-1">
            {property.title}
          </h3>
          <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#029bba]" />
            <span className="truncate">
              {property.society ?? property.locality ?? property.city}
            </span>
          </p>

          {/* Specs */}
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
            <span className="flex items-center gap-1">
              <Maximize className="w-3.5 h-3.5" />
              {property.area} {property.unit}
            </span>
            {property.bedrooms && (
              <span className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5" />
                {property.bedrooms}
              </span>
            )}
            {property.bathrooms && (
              <span className="flex items-center gap-1">
                <Bath className="w-3.5 h-3.5" />
                {property.bathrooms}
              </span>
            )}
          </div>

          {/* Price Row */}
          <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-0.5">
                Price
              </p>
              <p className="text-lg font-black text-[#029bba]">
                PKR {formatPrice(property.totalPrice ?? property.price)}
                {isRent && (
                  <span className="text-sm font-normal text-gray-400">/mo</span>
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-[#029bba] group-hover:text-white transition-all">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── V6.9.0: Office Location Card ─────────────────────────────────────────────
// Displays office address with interactive Google Static Map preview
// + Get Directions button (uses saved GPS coordinates for pinpoint accuracy)
// + Copy Address button
// + View Larger Map link (opens Google Maps in new tab)

interface OfficeLocationCardProps {
  address:      string;
  city:         string;
  coordinates?: { latitude: number; longitude: number };
  agentName:    string;
  onCopySuccess: (v: boolean) => void;
  addressCopied: boolean;
}

function OfficeLocationCard({
  address,
  city,
  coordinates,
  agentName,
  onCopySuccess,
  addressCopied,
}: OfficeLocationCardProps): React.ReactElement {

  const [mapError, setMapError] = useState(false);
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  // Build "Get Directions" URL
  // Priority: exact GPS coordinates > text address fallback
  const directionsUrl = coordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${coordinates.latitude},${coordinates.longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${address}, ${city}, Pakistan`)}`;

  // Build "View on Google Maps" URL (open interactive map)
  const viewMapUrl = coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}, Pakistan`)}`;

  // Build Google Static Map URL (only if we have coordinates + API key)
  const staticMapUrl = coordinates && googleMapsKey && !mapError
    ? `https://maps.googleapis.com/maps/api/staticmap?` +
      `center=${coordinates.latitude},${coordinates.longitude}` +
      `&zoom=16` +
      `&size=600x300` +
      `&scale=2` +
      `&maptype=roadmap` +
      `&markers=color:red%7Csize:mid%7C${coordinates.latitude},${coordinates.longitude}` +
      `&style=feature:poi%7Cvisibility:simplified` +
      `&key=${googleMapsKey}`
    : null;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(`${address}, ${city}, Pakistan`);
      onCopySuccess(true);
      setTimeout(() => onCopySuccess(false), 2500);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = `${address}, ${city}, Pakistan`;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        onCopySuccess(true);
        setTimeout(() => onCopySuccess(false), 2500);
      } catch {
        // Silent fail
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-3.5 py-3 flex items-center justify-between gap-2 border-b border-gray-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#029bba]/10 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-[#029bba]" />
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Office Location
          </p>
        </div>
        {coordinates && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0">
            <CheckCircle className="w-2.5 h-2.5" />
            Pin Verified
          </span>
        )}
      </div>

      {/* Static Map Preview (only when coordinates + API key available) */}
      {staticMapUrl && (
        <a
          href={viewMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative block h-40 bg-gray-100 overflow-hidden group"
          aria-label="Open interactive map in new tab"
        >
          {/* Using next/image with fixed unoptimized to avoid CDN cost */}
          <Image
            src={staticMapUrl}
            alt={`Map showing ${agentName}'s office location`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 1024px) 100vw, 320px"
            unoptimized
            onError={() => setMapError(true)}
          />

          {/* Hover overlay with "click to enlarge" hint */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 text-xs font-bold text-gray-900">
              <Maximize className="w-3.5 h-3.5" />
              Click to enlarge
            </div>
          </div>

          {/* Attribution corner */}
          <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-sm rounded px-1.5 py-0.5 text-[9px] font-bold text-gray-600">
            Google Maps
          </div>
        </a>
      )}

      {/* Fallback: No coordinates → show icon-only banner */}
      {!staticMapUrl && (
        <div className="h-24 bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center gap-1 border-b border-gray-100">
          <MapPin className="w-6 h-6 text-[#029bba]/40" />
          <p className="text-[10px] text-gray-500 font-medium">
            Precise location coming soon
          </p>
        </div>
      )}

      {/* Address text */}
      <div className="p-3.5 space-y-3">
        <div className="flex items-start gap-2">
          <Home className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-700 leading-relaxed">
            {address}
            {city && (
              <>
                <br />
                <span className="text-gray-500">{city}, Pakistan</span>
              </>
            )}
          </p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* Get Directions */}
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5
                       bg-gradient-to-r from-[#029bba] to-[#0284a3] text-white
                       rounded-lg text-xs font-bold shadow-sm shadow-[#029bba]/20
                       hover:shadow-md hover:shadow-[#029bba]/30
                       transition-all group"
          >
            <svg
              className="w-3.5 h-3.5 group-hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M21.71 11.29l-9-9a1 1 0 0 0-1.42 0l-9 9a1 1 0 0 0 0 1.42l9 9a1 1 0 0 0 1.42 0l9-9a1 1 0 0 0 0-1.42zM14 14.5V12h-4v3H8v-4a1 1 0 0 1 1-1h5V7.5l3.5 3.5-3.5 3.5z" />
            </svg>
            Directions
          </a>

          {/* Copy Address */}
          <button
            onClick={handleCopyAddress}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5
                       rounded-lg text-xs font-bold border-2 transition-all ${
              addressCopied
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-gray-200 text-gray-700 hover:border-[#029bba] hover:text-[#029bba]"
            }`}
          >
            {addressCopied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>

        {/* View larger map link */}
        {coordinates && (
          <a
            href={viewMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 pt-1 text-[11px] font-semibold text-gray-500 hover:text-[#029bba] transition-colors"
          >
            <Maximize className="w-3 h-3" />
            View on Google Maps
            <ArrowRight className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentPublicProfilePage({
  agent,
  properties,
}: PageProps) {
  const [showPhone, setShowPhone] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [copied, setCopied] = useState(false);

  // V6.8.10: Active property category tab
  const [activePropertyCategory, setActivePropertyCategory] = useState<ActivePropertyCategory>("all");

  // V6.8.5: Copy value to clipboard with visual feedback
  const copyToClipboard = useCallback(async (
    value: string,
    setter: (v: boolean) => void
  ) => {
    try {
      await navigator.clipboard.writeText(value);
      setter(true);
      setTimeout(() => setter(false), 2500);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = value;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setter(true);
        setTimeout(() => setter(false), 2500);
      } catch {
        // Silent fail
      }
      document.body.removeChild(textArea);
    }
  }, []);

  const handleShare = useCallback(async () => {
    const url = `${APP_URL}/agent/${agent.slug}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `${agent.displayName} — Real Estate Agent`,
          text: `Check out ${agent.displayName}'s profile on Highrise.pk`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Share cancelled or clipboard unavailable — silent fail
    }
  }, [agent.slug, agent.displayName]);

  // V6.8.10: Filter properties by active category
  const activeCategoryConfig = PROPERTY_CATEGORIES.find((c) => c.key === activePropertyCategory)
    ?? PROPERTY_CATEGORIES[0];
  const filteredProperties = properties.filter((p) => activeCategoryConfig.matches(p));

  // Pre-compute counts per category for tab badges
  const categoryCounts = PROPERTY_CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = properties.filter((p) => cat.matches(p)).length;
    return acc;
  }, {} as Record<PropertyCategory, number>);

  const verification = getVerificationConfig(agent.verificationLevel);
  const pageUrl = `${APP_URL}/agent/${agent.slug}`;

  // Sanitized JSON-LD (SEO-friendly, only real data)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: sanitizeForJsonLd(agent.displayName),
    url: pageUrl,
    image: agent.documents?.profilePhoto?.url ?? agent.agencyLogo?.url ?? undefined,
    description: sanitizeForJsonLd(
      agent.about ?? `Verified real estate agent in ${agent.city}, Pakistan`
    ),
    ...(agent.phone && { telephone: agent.phone }),
    ...(agent.email && { email: agent.email }),
    address: {
      "@type": "PostalAddress",
      addressLocality: sanitizeForJsonLd(agent.city),
      addressCountry: "PK",
      ...(agent.officeVerification?.address && {
        streetAddress: sanitizeForJsonLd(agent.officeVerification.address),
      }),
    },
    // Only include rating when there are actual reviews (avoids showing 0/5)
    ...(agent.ratings && agent.ratings.totalReviews > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: agent.ratings.averageRating,
        reviewCount: agent.ratings.totalReviews,
        bestRating: 5,
        worstRating: 1,
      },
    }),
    sameAs: Object.values(agent.socialLinks ?? {}).filter(
      (v): v is string => typeof v === "string" && v.length > 0
    ),
  };

  const ogImage =
    agent.documents?.coverPhoto?.url ??
    agent.documents?.profilePhoto?.url ??
    `${APP_URL}/og-agent.jpg`;

  const profilePhotoUrl = agent.documents?.profilePhoto?.url;

  return (
    <>
      <Head>
        <title>
          {agent.displayName} — Real Estate Agent in {agent.city} |
          Highrise.pk
        </title>
        <meta
          name="description"
          content={`${agent.displayName} is a verified real estate agent in ${agent.city}. ${agent.experience?.years ?? 0}+ years experience. ${agent.stats?.activeListings ?? 0} active listings. Contact on Highrise.pk.`}
        />
        <link rel="canonical" href={pageUrl} />
        <meta name="robots" content="index, follow" />

        {/* Open Graph */}
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={pageUrl} />
        <meta
          property="og:title"
          content={`${agent.displayName} | Real Estate Agent in ${agent.city}`}
        />
        <meta
          property="og:description"
          content={
            agent.tagline ??
            `Professional real estate agent based in ${agent.city}, Pakistan.`
          }
        />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="Highrise.pk" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${agent.displayName} | Highrise.pk`}
        />
        <meta
          name="twitter:description"
          content={agent.tagline ?? `Real estate agent in ${agent.city}`}
        />
        <meta name="twitter:image" content={ogImage} />
      </Head>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <div className="min-h-screen bg-gray-50 pb-20">

        {/* ── Hero Banner — Elegant gradient with optional cover photo ────── */}
        <div className="relative h-72 md:h-80 w-full bg-gradient-to-br from-[#029bba] via-[#0284a3] to-[#004063] overflow-hidden">
          {/* Cover photo with subtle overlay */}
          {agent.documents?.coverPhoto?.url && (
            <>
              <Image
                src={agent.documents.coverPhoto.url}
                alt={`${agent.displayName} cover`}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#004063]/60"></div>
            </>
          )}

          {/* Decorative pattern overlay (when no cover) */}
          {!agent.documents?.coverPhoto?.url && (
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            />
          )}

          {/* Breadcrumb */}
          <div className="absolute top-6 left-0 right-0 max-w-7xl mx-auto px-4">
            <nav
              aria-label="Breadcrumb"
              className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full text-white text-xs font-semibold border border-white/10"
            >
              <Link href="/" className="hover:text-white/80 transition-colors">
                Home
              </Link>
              <span className="opacity-40">/</span>
              <Link
                href="/agents"
                className="hover:text-white/80 transition-colors"
              >
                Agents
              </Link>
              <span className="opacity-40">/</span>
              <span>{agent.displayName}</span>
            </nav>
          </div>

          {/* Share Button */}
          <button
            onClick={() => void handleShare()}
            className="absolute top-6 right-4 flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-white hover:bg-white/30 transition-colors text-sm font-medium"
            aria-label="Share profile"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Share
              </>
            )}
          </button>
        </div>

        {/* ── Profile Card ─────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 -mt-20 relative z-10">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100">
            <div className="flex flex-col lg:flex-row">

              {/* ── Main Content ─────────────────────────────────────────── */}
              <div className="flex-1 p-6 md:p-10 lg:rounded-l-3xl rounded-t-3xl lg:rounded-tr-none">
                {/* V6.9.2: Enterprise photo layout — Zameen/Zillow hybrid */}
                {/* Layout: Agent photo + Agency logo (side-by-side, both prominent) */}
                {/* For non-agencies: only agent photo shows (clean, no clutter) */}
                <div className="flex flex-col md:flex-row gap-6 items-start">

                  {/* ═══ PHOTOS ROW — Agent + Agency Logo ═══ */}
                  <div className="flex items-start gap-4 md:gap-6 -mt-24 md:-mt-32 z-40 isolate w-full md:w-auto">

                    {/* ─── AGENT PHOTO (Personal Identity) ─── */}
                    <div className="relative shrink-0">
                      <div className="relative group">
                        {/* Glow effect on hover */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#029bba] to-[#004063] rounded-3xl blur opacity-40 group-hover:opacity-70 transition-opacity duration-300"></div>

                        {/* Main photo box */}
                        <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-[#029bba] via-[#0284a3] to-[#004063] flex items-center justify-center">
                          {profilePhotoUrl ? (
                            <Image
                              src={profilePhotoUrl}
                              alt={agent.displayName}
                              width={176}
                              height={176}
                              className="w-full h-full object-cover"
                              priority
                            />
                          ) : agent.agencyLogo?.url ? (
                            <div className="w-full h-full flex items-center justify-center bg-white p-4">
                              <Image
                                src={agent.agencyLogo.url}
                                alt={`${agent.displayName} logo`}
                                width={176}
                                height={176}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          ) : (
                            <span className="text-white text-6xl font-black drop-shadow-lg">
                              {agent.displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Verified indicator badge (bottom-right corner) */}
                        {verification.show && (
                          <div
                            className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-white z-10"
                            title={verification.label}
                          >
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* "Agent" label below photo */}
                      <p className="text-center mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Agent
                      </p>
                    </div>

                    {/* ─── AGENCY LOGO (Brand Identity) — Only for agencies with logo ─── */}
                    {agent.agentType === "agency" && agent.agencyLogo?.url && (
                      <>
                        {/* Elegant vertical divider (desktop only) */}
                        <div
                          className="hidden md:flex flex-col items-center justify-center h-36 md:h-44"
                          aria-hidden="true"
                        >
                          <div className="w-px h-full bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
                        </div>

                        <div className="relative shrink-0">
                          <div className="relative group">
                            {/* Subtle glow (less intense than agent photo) */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#004063] to-[#029bba] rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>

                            {/* Main logo box — WHITE background, PROMINENT size */}
                            <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-white flex items-center justify-center p-4">
                              <Image
                                src={agent.agencyLogo.url}
                                alt={agent.agencyName ?? "Agency logo"}
                                width={176}
                                height={176}
                                className="max-w-full max-h-full object-contain"
                                priority
                              />
                            </div>

                            {/* Small agency indicator badge (bottom-right) */}
                            <div
                              className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg border-2 border-white z-10"
                              title={agent.agencyName ?? "Agency"}
                            >
                              <div className="w-full h-full rounded-full bg-gradient-to-br from-[#029bba] to-[#004063] flex items-center justify-center">
                                <Briefcase className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          </div>

                          {/* "Agency" label below logo */}
                          <p className="text-center mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Agency
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* ═══ IDENTITY & INFO ═══ */}
                  <div className="flex-1 pt-2">
                    {/* Name + Verified badge */}
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h1 className="text-3xl md:text-4xl font-black text-gray-900">
                        {agent.displayName}
                      </h1>
                      {verification.show && (
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold ${verification.bg} ${verification.text}`}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {verification.label}
                        </span>
                      )}
                    </div>

                    {/* V6.9.2: "Represents X Agency" branded badge (agency accounts only) */}
                    {agent.agentType === "agency" && agent.agencyName && (
                      <div className="mb-3">
                        <div className="inline-flex items-center gap-2 pl-1 pr-4 py-1 bg-gradient-to-r from-[#029bba]/10 to-[#004063]/5 border border-[#029bba]/20 rounded-full">
                          {agent.agencyLogo?.url ? (
                            <div className="w-7 h-7 rounded-full bg-white shadow-sm border border-white flex items-center justify-center p-0.5 shrink-0">
                              <Image
                                src={agent.agencyLogo.url}
                                alt={agent.agencyName}
                                width={28}
                                height={28}
                                className="max-w-full max-h-full object-contain rounded-full"
                              />
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#029bba] flex items-center justify-center shrink-0">
                              <Briefcase className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          <span className="text-xs font-bold text-[#004063]">
                            Represents <span className="text-[#029bba]">{agent.agencyName}</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Non-agency: show agency name as text (e.g., freelance under agency) */}
                    {agent.agentType !== "agency" && agent.agencyName && (
                      <p className="text-base text-gray-600 font-semibold mb-2">
                        {agent.agencyName}
                      </p>
                    )}

                    {/* Tagline */}
                    {agent.tagline && (
                      <p className="text-gray-500 italic text-sm mb-4">
                        &ldquo;{agent.tagline}&rdquo;
                      </p>
                    )}

                    {/* Meta Row — City · Experience · Rating */}
                    <div className="flex flex-wrap gap-4 text-sm font-semibold text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#029bba]" />
                        {agent.city}, Pakistan
                      </span>
                      <span className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
                        <Briefcase className="w-4 h-4 text-[#029bba]" />
                        {agent.experience?.years ?? 0}+ years experience
                      </span>
                      {/* Rating only shown when reviews exist — no "New Agent" text */}
                      {agent.ratings && agent.ratings.totalReviews > 0 && (
                        <span className="flex items-center gap-1.5 border-l border-gray-200 pl-4">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          {agent.ratings.averageRating.toFixed(1)} (
                          {agent.ratings.totalReviews} review{agent.ratings.totalReviews !== 1 ? "s" : ""})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* About */}
                {agent.about && (
                  <div className="mt-8">
                    <SectionLabel>About</SectionLabel>
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {agent.about}
                    </p>
                  </div>
                )}

                {/* Specializations */}
                {(agent.specializations?.length ?? 0) > 0 && (
                  <div className="mt-6">
                    <SectionLabel>Specializations</SectionLabel>
                    <ColorChipList items={agent.specializations!} />
                  </div>
                )}

                {/* Service Areas */}
                {(agent.serviceAreas?.localities?.length ?? 0) > 0 && (
                  <div className="mt-6">
                    <SectionLabel>Service Areas</SectionLabel>
                    <ChipList
                      items={agent.serviceAreas!.localities!.slice(0, 10)}
                    />
                  </div>
                )}

                {/* Languages */}
                {(agent.languages?.length ?? 0) > 0 && (
                  <div className="mt-6">
                    <SectionLabel>Languages</SectionLabel>
                    <ChipList items={agent.languages!} />
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-100">
                  <StatCard
                    label="Active Listings"
                    value={agent.stats?.activeListings ?? 0}
                    color="text-[#029bba]"
                    bg="bg-blue-50"
                  />
                  <StatCard
                    label="Properties Sold"
                    value={agent.stats?.soldProperties ?? 0}
                    color="text-green-600"
                    bg="bg-green-50"
                  />
                  <StatCard
                    label="Experience"
                    value={`${agent.experience?.years ?? 0}+ Yrs`}
                    color="text-purple-600"
                    bg="bg-purple-50"
                  />
                  <StatCard
                    label="Total Reviews"
                    value={agent.ratings?.totalReviews ?? 0}
                    color="text-amber-600"
                    bg="bg-amber-50"
                  />
                </div>
              </div>

              {/* ── Sidebar ──────────────────────────────────────────────── */}
              <div className="w-full lg:w-80 bg-slate-50/60 border-t lg:border-t-0 lg:border-l border-gray-100 p-6 md:p-8 space-y-8 lg:rounded-r-3xl rounded-b-3xl lg:rounded-bl-none">

                {/* Insight Card */}
                <InsightCard agent={agent} />

                {/* ── Contact Section — Enterprise Grade ─────────────────── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <SectionLabel>Get in Touch</SectionLabel>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Verified
                    </span>
                  </div>

                  <div className="space-y-2.5">

                    {/* 1️⃣ PHONE — Click to reveal → shows number + call + copy */}
                    {agent.phone && (
                      <>
                        {showPhone ? (
                          <div className="bg-gradient-to-r from-[#029bba] to-[#0284a3] rounded-xl shadow-lg shadow-[#029bba]/20 overflow-hidden">
                            {/* Number display */}
                            <div className="p-3.5 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                                <Phone className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                                  Phone Number
                                </p>
                                <p className="text-sm font-black text-white truncate">
                                  {agent.phone}
                                </p>
                              </div>
                            </div>
                            {/* Action buttons */}
                            <div className="flex border-t border-white/20">
                              <a
                                href={`tel:${agent.phone}`}
                                className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-white hover:bg-white/10 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                Call Now
                              </a>
                              <div className="w-px bg-white/20" />
                              <button
                                onClick={() => copyToClipboard(agent.phone!, setPhoneCopied)}
                                className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-white hover:bg-white/10 transition-colors"
                              >
                                {phoneCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowPhone(true)}
                            className="w-full py-3.5 bg-gradient-to-r from-[#029bba] to-[#0284a3] text-white rounded-xl hover:shadow-lg hover:shadow-[#029bba]/30 font-bold transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                          >
                            <Phone className="w-4 h-4" />
                            Show Phone Number
                          </button>
                        )}
                      </>
                    )}

                    {/* 2️⃣ WHATSAPP — Opens WhatsApp with pre-filled message */}
                    {agent.whatsapp && (
                      <a
                        href={`https://wa.me/${agent.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Assalam-u-Alaikum ${agent.displayName},\n\nI found your profile on Highrise.pk and would like to inquire about your services.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3.5 bg-white rounded-xl border-2 border-transparent hover:border-[#25D366] shadow-sm hover:shadow-md transition-all duration-200 group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#25D366] to-[#1ebe5d] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <MessageCircle className="w-4.5 h-4.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            WhatsApp
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            Send Message
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#25D366] group-hover:translate-x-1 transition-all" />
                      </a>
                    )}

                    {/* 3️⃣ EMAIL — Multi-option (Gmail, Outlook, Mail App, Copy) */}
                    {/* Works EVERYWHERE — user chooses their preferred email app */}
                    {agent.email && (
                      <>
                        {showEmail ? (
                          <div className="bg-white rounded-xl border-2 border-[#004063] shadow-md overflow-hidden">
                            {/* Email display */}
                            <div className="p-3.5 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#004063] to-[#003050] flex items-center justify-center shrink-0">
                                <Mail className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                  Email Address
                                </p>
                                <p className="text-sm font-bold text-gray-900 truncate" title={agent.email}>
                                  {agent.email}
                                </p>
                              </div>
                            </div>

                            {/* Provider buttons — 2x2 grid */}
                            <div className="grid grid-cols-2 border-t border-gray-100">
                              {/* Gmail */}
                              <a
                                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(agent.email)}&su=${encodeURIComponent(`Inquiry from Highrise.pk`)}&body=${encodeURIComponent(`Assalam-u-Alaikum ${agent.displayName},\n\nI found your profile on Highrise.pk and would like to inquire about your services.\n\nRegards`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 border-r border-b border-gray-100 transition-colors"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                                </svg>
                                Gmail
                              </a>

                              {/* Outlook */}
                              <a
                                href={`https://outlook.live.com/mail/deeplink/compose?to=${encodeURIComponent(agent.email)}&subject=${encodeURIComponent(`Inquiry from Highrise.pk`)}&body=${encodeURIComponent(`Assalam-u-Alaikum ${agent.displayName},\n\nI found your profile on Highrise.pk and would like to inquire about your services.\n\nRegards`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-600 border-b border-gray-100 transition-colors"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.79-.33.33-.79.33H15.13V15.5H10.9v6.11H.9q-.46 0-.79-.33Q-.22 20.94-.22 20.48V3.52q0-.46.33-.79Q.44 2.4.9 2.4h22.68q.46 0 .79.33.33.33.33.79zM7.9 15.34H1.8v-5.6q0-.79.34-1.47.34-.68.94-1.19.6-.51 1.42-.78.83-.28 1.78-.28.94 0 1.72.28.78.28 1.37.79.58.5.9 1.19.32.7.32 1.47v5.59zm3.9-10.55v3.86h7.98V4.79H11.8zm11.85 4.86h-3.7l-2.31 3.4-2.32-3.4h-3.72v9.55h3.55v-5.36l2.49 3.65 2.49-3.65v5.36h3.52V9.65z"/>
                                </svg>
                                Outlook
                              </a>

                              {/* Mail App (mailto) */}
                              <a
                                href={`mailto:${agent.email}?subject=${encodeURIComponent(`Inquiry from Highrise.pk`)}&body=${encodeURIComponent(`Assalam-u-Alaikum ${agent.displayName},\n\nI found your profile on Highrise.pk and would like to inquire about your services.\n\nRegards`)}`}
                                className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 border-r border-gray-100 transition-colors"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                Mail App
                              </a>

                              {/* Copy */}
                              <button
                                onClick={() => copyToClipboard(agent.email!, setEmailCopied)}
                                className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                {emailCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-green-600" />
                                    <span className="text-green-600">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Tip footer */}
                            <div className="px-3.5 py-2 bg-blue-50 border-t border-blue-100">
                              <p className="text-[10px] text-blue-700 flex items-center gap-1">
                                <Info className="w-2.5 h-2.5 shrink-0" />
                                <span>Choose your preferred email provider — all options work!</span>
                              </p>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowEmail(true)}
                            className="w-full flex items-center gap-3 p-3.5 bg-white rounded-xl border-2 border-transparent hover:border-[#004063] shadow-sm hover:shadow-md transition-all duration-200 group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#004063] to-[#003050] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                              <Mail className="w-4.5 h-4.5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                Email
                              </p>
                              <p className="text-sm font-bold text-gray-900">
                                Show Email Address
                              </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#004063] group-hover:translate-x-1 transition-all" />
                          </button>
                        )}
                      </>
                    )}

                    {/* 4️⃣ OFFICE — V6.9.0: Interactive with map preview + Get Directions */}
                    {agent.officeVerification?.address && (
                      <OfficeLocationCard
                        address={agent.officeVerification.address}
                        city={agent.officeVerification.city ?? agent.city}
                        coordinates={agent.officeVerification.coordinates}
                        agentName={agent.displayName}
                        onCopySuccess={setAddressCopied}
                        addressCopied={addressCopied}
                      />
                    )}
                  </div>

                  {/* Trust footer */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-[10px] text-gray-500">
                    <Shield className="w-3 h-3 text-emerald-500" />
                    <span>All contact details verified by Highrise.pk</span>
                  </div>
                </div>

                {/* Business Hours */}
                {agent.businessHours && (
                  <div>
                    <SectionLabel>Business Hours</SectionLabel>
                    <div className="space-y-2">
                      {agent.businessHours.weekdays && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 shrink-0">
                            Mon–Fri:
                          </span>
                          <span className="font-medium">
                            {agent.businessHours.weekdays}
                          </span>
                        </div>
                      )}
                      {agent.businessHours.weekends && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 shrink-0">
                            Sat–Sun:
                          </span>
                          <span className="font-medium">
                            {agent.businessHours.weekends}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Social Links */}
                {agent.socialLinks &&
                  Object.values(agent.socialLinks).some(Boolean) && (
                    <div>
                      <SectionLabel>Connect</SectionLabel>
                      <div className="flex flex-wrap gap-2">
                        {agent.socialLinks.facebook && (
                          <a
                            href={agent.socialLinks.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Facebook"
                            className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                          >
                            <Facebook className="w-4 h-4" />
                          </a>
                        )}
                        {agent.socialLinks.instagram && (
                          <a
                            href={agent.socialLinks.instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                          >
                            <Instagram className="w-4 h-4" />
                          </a>
                        )}
                        {agent.socialLinks.linkedin && (
                          <a
                            href={agent.socialLinks.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn"
                            className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center hover:bg-blue-800 transition-colors"
                          >
                            <Linkedin className="w-4 h-4" />
                          </a>
                        )}
                        {agent.socialLinks.youtube && (
                          <a
                            href={agent.socialLinks.youtube}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="YouTube"
                            className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
                          >
                            <Youtube className="w-4 h-4" />
                          </a>
                        )}
                        {agent.socialLinks.twitter && (
                          <a
                            href={agent.socialLinks.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Twitter / X"
                            className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center hover:bg-sky-600 transition-colors"
                          >
                            <Twitter className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* ── V6.8.9: Verified Reviews Carousel ─────────────────────────────── */}
        {/* Interactive Swiper carousel with auto-play, arrows, dots, keyboard nav */}
        {agent.reviews && agent.reviews.length > 0 && (
          <>
            <style dangerouslySetInnerHTML={{ __html: SWIPER_CUSTOM_STYLES }} />
            <div className="max-w-6xl mx-auto px-4 mt-16">

              {/* Section Header */}
              <div className="text-center mb-10">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Highrise-Verified Reviews
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
                  What Clients Say About {agent.displayName.split(" ")[0]}
                </h2>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 flex-wrap">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.round(agent.ratings?.averageRating ?? 0)
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    {agent.ratings?.averageRating.toFixed(1)}
                  </span>
                  <span>
                    · {agent.reviews.length} verified review{agent.reviews.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Carousel Wrapper */}
              <div className="relative group">

                {/* Custom Navigation Arrows */}
                {agent.reviews.length > 1 && (
                  <>
                    <button
                      className="highrise-review-prev absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0 md:-translate-x-4 z-20
                                 w-12 h-12 rounded-full bg-white shadow-xl border border-gray-100
                                 flex items-center justify-center text-[#029bba] hover:bg-[#029bba] hover:text-white
                                 hover:scale-110 hover:shadow-2xl transition-all duration-300
                                 opacity-0 group-hover:opacity-100 focus:opacity-100
                                 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Previous review"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button
                      className="highrise-review-next absolute right-0 top-1/2 -translate-y-1/2 translate-x-0 md:translate-x-4 z-20
                                 w-12 h-12 rounded-full bg-white shadow-xl border border-gray-100
                                 flex items-center justify-center text-[#029bba] hover:bg-[#029bba] hover:text-white
                                 hover:scale-110 hover:shadow-2xl transition-all duration-300
                                 opacity-0 group-hover:opacity-100 focus:opacity-100
                                 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Next review"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Swiper Carousel */}
                <Swiper
                  modules={[Autoplay, Navigation, Pagination, Keyboard]}
                  className="highrise-review-swiper"
                  spaceBetween={24}
                  slidesPerView={1}
                  breakpoints={{
                    640:  { slidesPerView: 1 },
                    768:  { slidesPerView: 2 },
                    1024: { slidesPerView: agent.reviews.length >= 3 ? 3 : agent.reviews.length },
                  }}
                  navigation={{
                    prevEl: ".highrise-review-prev",
                    nextEl: ".highrise-review-next",
                  }}
                  pagination={{
                    clickable: true,
                    dynamicBullets: true,
                  }}
                  keyboard={{ enabled: true }}
                  autoplay={
                    agent.reviews.length > 1
                      ? {
                          delay: 6000,
                          disableOnInteraction: false,
                          pauseOnMouseEnter: true,
                        }
                      : false
                  }
                  loop={agent.reviews.length > 3}
                  grabCursor={true}
                >
                  {agent.reviews.map((review) => (
                    <SwiperSlide key={review._id ?? review.addedAt}>
                      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl
                                      transition-all duration-300 h-full flex flex-col relative overflow-hidden">

                        {/* Decorative quote icon */}
                        <div className="absolute top-4 right-4 text-[#029bba]/10 pointer-events-none">
                          <Quote className="w-16 h-16" />
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-1 mb-4 relative z-10">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-gray-200"
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-sm font-bold text-gray-900">
                            {review.rating}.0
                          </span>
                        </div>

                        {/* Review text (grows to fill space) */}
                        <p className="text-sm text-gray-700 leading-relaxed mb-6 flex-grow relative z-10 line-clamp-6">
                          &ldquo;{review.reviewText}&rdquo;
                        </p>

                        {/* Reviewer footer */}
                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2 relative z-10">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar circle with initial */}
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#029bba] to-[#004063]
                                            flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {review.reviewerName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">
                                {review.reviewerName}
                              </p>
                              <p className="text-[11px] text-gray-500 flex items-center gap-1">
                                {review.reviewerCity && (
                                  <>
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{review.reviewerCity}</span>
                                    <span>·</span>
                                  </>
                                )}
                                <span className="whitespace-nowrap">
                                  {new Date(review.addedAt).toLocaleDateString("en-PK", {
                                    month: "short",
                                    year:  "numeric",
                                  })}
                                </span>
                              </p>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700
                                           rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0"
                                title="Verified by Highrise.pk">
                            <Shield className="w-2.5 h-2.5" />
                            Verified
                          </span>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>

              {/* Trust footer */}
              <div className="mt-8 text-center">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  All reviews are personally verified by the Highrise.pk team.
                  {agent.reviews.length > 1 && (
                    <span className="text-gray-400 hidden md:inline">
                      · Use arrow keys ← → to navigate
                    </span>
                  )}
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── V6.8.10: Properties Portfolio — Tabbed Interactive Carousel ──── */}
        <div className="max-w-7xl mx-auto px-4 mt-16">

          {/* Section Header */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-[#029bba] rounded-full text-xs font-bold uppercase tracking-widest mb-4">
              <Home className="w-3.5 h-3.5" />
              Property Portfolio
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-2">
              Properties by {agent.displayName.split(" ")[0]}
            </h2>
            <p className="text-gray-500 text-sm">
              {properties.length} listing{properties.length !== 1 ? "s" : ""} available across categories
            </p>
          </div>

          {/* V6.8.10: Category Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex flex-wrap justify-center gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
              {PROPERTY_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.key];
                const isActive = activePropertyCategory === cat.key;
                const isDisabled = count === 0 && cat.key !== "all";

                return (
                  <button
                    key={cat.key}
                    onClick={() => !isDisabled && setActivePropertyCategory(cat.key)}
                    disabled={isDisabled}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                                transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-gradient-to-r from-[#029bba] to-[#0284a3] text-white shadow-md shadow-[#029bba]/30"
                        : isDisabled
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                    title={isDisabled ? `No ${cat.label.toLowerCase()} properties yet` : undefined}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive
                        ? "bg-white/20 text-white"
                        : isDisabled
                        ? "bg-gray-100 text-gray-400"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Properties Carousel or Empty State */}
          {filteredProperties.length > 0 ? (
            <div className="relative group">

              {/* Custom Navigation Arrows */}
              {filteredProperties.length > 3 && (
                <>
                  <button
                    className="highrise-property-prev absolute left-0 top-1/2 -translate-y-1/2 -translate-x-0 md:-translate-x-4 z-20
                               w-12 h-12 rounded-full bg-white shadow-xl border border-gray-100
                               flex items-center justify-center text-[#029bba] hover:bg-[#029bba] hover:text-white
                               hover:scale-110 hover:shadow-2xl transition-all duration-300
                               opacity-0 group-hover:opacity-100 focus:opacity-100
                               disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Previous property"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button
                    className="highrise-property-next absolute right-0 top-1/2 -translate-y-1/2 translate-x-0 md:translate-x-4 z-20
                               w-12 h-12 rounded-full bg-white shadow-xl border border-gray-100
                               flex items-center justify-center text-[#029bba] hover:bg-[#029bba] hover:text-white
                               hover:scale-110 hover:shadow-2xl transition-all duration-300
                               opacity-0 group-hover:opacity-100 focus:opacity-100
                               disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Next property"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Swiper Property Carousel */}
              <Swiper
                key={activePropertyCategory}
                modules={[Autoplay, Navigation, Pagination, Keyboard]}
                className="highrise-property-swiper"
                spaceBetween={24}
                slidesPerView={1}
                breakpoints={{
                  640:  { slidesPerView: 1 },
                  768:  { slidesPerView: 2 },
                  1024: { slidesPerView: Math.min(3, filteredProperties.length) },
                }}
                navigation={{
                  prevEl: ".highrise-property-prev",
                  nextEl: ".highrise-property-next",
                }}
                pagination={{
                  clickable: true,
                  dynamicBullets: true,
                }}
                keyboard={{ enabled: true }}
                autoplay={
                  filteredProperties.length > 3
                    ? {
                        delay: 5000,
                        disableOnInteraction: false,
                        pauseOnMouseEnter: true,
                      }
                    : false
                }
                loop={filteredProperties.length > 3}
                grabCursor={true}
              >
                {filteredProperties.map((property) => (
                  <SwiperSlide key={property._id}>
                    <PropertyCard property={property} />
                  </SwiperSlide>
                ))}
              </Swiper>

              {/* Nav hint */}
              {filteredProperties.length > 3 && (
                <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-2">
                  <ArrowLeft className="w-3 h-3" />
                  Swipe or use arrow keys to navigate
                  <ArrowRight className="w-3 h-3" />
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">{activeCategoryConfig.icon}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                No {activeCategoryConfig.label} Properties
              </h3>
              <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
                {activePropertyCategory === "all"
                  ? `${agent.displayName.split(" ")[0]} hasn't listed any properties yet. Check back soon or contact directly for exclusive listings.`
                  : `${agent.displayName.split(" ")[0]} doesn't have any ${activeCategoryConfig.label.toLowerCase()} listings at the moment.`}
              </p>
              {activePropertyCategory !== "all" && categoryCounts.all > 0 && (
                <button
                  onClick={() => setActivePropertyCategory("all")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                             bg-[#029bba] text-white text-sm font-bold
                             hover:bg-[#027a94] transition-colors"
                >
                  View All {categoryCounts.all} Properties
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── ISR Data Fetching ────────────────────────────────────────────────────────

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  const slug = context.params?.slug;
  if (typeof slug !== "string") return { notFound: true };

  try {
    await dbConnect();

    // Dynamic imports to keep edge-safe
    const { default: AgentProfile } = await import("@/models/AgentProfile");
    const { default: User } = await import("@/models/User");

    // Fetch approved agent by slug
    // V6.8.5: Force include encrypted phone/whatsapp fields
    // These have `select: false` in schema — must explicitly request
    const agentDoc = await AgentProfile.findOne({
      slug,
      status: "approved",
    })
      .select("+phoneEncrypted +whatsappEncrypted")
      .lean<Record<string, unknown>>();

    if (!agentDoc) return { notFound: true };

    // Fetch user for display name fallback
    // AgentProfile schema uses field name 'user' (not 'userId')
    const userId = agentDoc.user as unknown;
    const userDoc =
      typeof userId === "string" || (userId && typeof userId === "object")
        ? await User.findById(userId)
            .select("name email")
            .lean<{ name?: string; email?: string }>()
        : null;

    // V6.8.5: Decrypt phone + WhatsApp for public reveal
    // Enterprise pattern: Reveal contact via user action (rate-limited)
    // Encrypted at rest in DB, decrypted server-side for approved agents only
    let realPhone:    string | undefined;
    let realWhatsapp: string | undefined;

    try {
      const { decryptPhone } = await import("@/lib/kycCrypto");
      if (agentDoc.phoneEncrypted) {
        realPhone = decryptPhone(String(agentDoc.phoneEncrypted));
      }
      if (agentDoc.whatsappEncrypted) {
        realWhatsapp = decryptPhone(String(agentDoc.whatsappEncrypted));
      }
    } catch (err) {
      // Decryption failed — leave phone/whatsapp undefined
      if (process.env.NODE_ENV === "development") {
        console.error("[Agent Slug] Phone decrypt failed:", err);
      }
    }

    // Business email preference: contactEmail > userDoc.email
    const businessEmail = agentDoc.contactEmail
      ? String(agentDoc.contactEmail)
      : userDoc?.email
      ? String(userDoc.email)
      : undefined;

    // V6.8.5: Extract nested documents safely
    const docsRaw = agentDoc.documents as
      | { profilePhoto?: { url?: string }; coverPhoto?: { url?: string } }
      | undefined;

    const agencyLogoRaw = agentDoc.agencyLogo as
      | { url?: string }
      | undefined;

    // Build safe public agent object
    // Phone/email now FULL (real values) — user reveals via click
    const agent: PublicAgent = {
      _id: String(agentDoc._id),
      slug: String(agentDoc.slug ?? ""),
      displayName: String(agentDoc.displayName ?? userDoc?.name ?? "Agent"),
      tagline: agentDoc.tagline ? String(agentDoc.tagline) : undefined,
      about: agentDoc.about ? String(agentDoc.about) : undefined,
      agentType: (agentDoc.agentType as PublicAgent["agentType"]) ?? "individual",
      agencyName: agentDoc.agencyName ? String(agentDoc.agencyName) : undefined,
      city: String(agentDoc.city ?? "Pakistan"),
      // V6.8.5: REAL contact values (revealed on user click, rate-limited)
      phone:    realPhone,
      email:    businessEmail,
      whatsapp: realWhatsapp,
      officeVerification: agentDoc.officeVerification
        ? (() => {
            const ov = agentDoc.officeVerification as Record<string, unknown>;
            const coords = ov.coordinates as
              | { latitude?: unknown; longitude?: unknown }
              | undefined;

            const lat = Number(coords?.latitude);
            const lng = Number(coords?.longitude);
            const hasValidCoords =
              Number.isFinite(lat) &&
              Number.isFinite(lng) &&
              lat >= -90 && lat <= 90 &&
              lng >= -180 && lng <= 180 &&
              !(lat === 0 && lng === 0);

            return {
              address: ov.address ? String(ov.address) : undefined,
              city:    ov.city ? String(ov.city) : undefined,
              coordinates: hasValidCoords
                ? { latitude: lat, longitude: lng }
                : undefined,
            };
          })()
        : undefined,
      experience: agentDoc.experience as PublicAgent["experience"],
      serviceAreas: agentDoc.serviceAreas as PublicAgent["serviceAreas"],
      specializations: Array.isArray(agentDoc.specializations)
        ? (agentDoc.specializations as string[])
        : [],
      languages: Array.isArray(agentDoc.languages)
        ? (agentDoc.languages as string[])
        : [],
      socialLinks: agentDoc.socialLinks as PublicAgent["socialLinks"],
      businessHours: agentDoc.businessHours as PublicAgent["businessHours"],
      documents: {
        profilePhoto: docsRaw?.profilePhoto?.url
          ? { url: String(docsRaw.profilePhoto.url) }
          : undefined,
        coverPhoto: docsRaw?.coverPhoto?.url
          ? { url: String(docsRaw.coverPhoto.url) }
          : undefined,
      },
      agencyLogo: agencyLogoRaw?.url
        ? { url: String(agencyLogoRaw.url) }
        : undefined,
      verificationLevel:
        (agentDoc.verificationLevel as PublicAgent["verificationLevel"]) ??
        "not_verified",
      stats: agentDoc.stats as PublicAgent["stats"],
      ratings: agentDoc.ratings as PublicAgent["ratings"],
      createdAt: agentDoc.createdAt
        ? new Date(agentDoc.createdAt as string).toISOString()
        : undefined,
      // V6.8.8: Only published reviews (admin curates), sorted newest first
      reviews: Array.isArray(agentDoc.reviews)
        ? (agentDoc.reviews as Array<Record<string, unknown>>)
            .filter((r) => r.isPublished === true)
            .sort((a, b) => {
              const dateA = new Date(String(a.addedAt ?? 0)).getTime();
              const dateB = new Date(String(b.addedAt ?? 0)).getTime();
              return dateB - dateA;
            })
            .slice(0, 20) // Cap at 20 reviews on public page
            .map((r) => ({
              _id:          r._id ? String(r._id) : undefined,
              rating:       Number(r.rating ?? 0),
              reviewText:   String(r.reviewText ?? ""),
              reviewerName: String(r.reviewerName ?? "Verified Client"),
              reviewerCity: r.reviewerCity ? String(r.reviewerCity) : undefined,
              source:       String(r.source ?? "admin_verified"),
              addedAt:      new Date(String(r.addedAt)).toISOString(),
            }))
        : [],
    };

    // Fetch agent's approved properties — Section 4 graceful degradation
    let properties: PublicProperty[] = [];
    try {
      const { default: Property } = await import("@/models/Property");
      const propDocs = await Property.find({
        owner: agentDoc.user,
        status: "approved",
      })
        .select(
          "title slug price totalPrice area unit city locality society propertyType listingType bedrooms bathrooms images"
        )
        .limit(12)
        .lean<PublicProperty[]>();

      properties = propDocs.map((p) => ({
        ...p,
        _id: String(p._id),
      }));
    } catch {
      // Property model not built yet — graceful degradation
      properties = [];
    }

    // V6.8.4: Deep-clean props to remove undefined values
    // Next.js getStaticProps throws on undefined — this fixes it
    const cleanAgent      = serializeForNext(agent);
    const cleanProperties = serializeForNext(properties);

    return {
      props: {
        agent:      cleanAgent,
        properties: cleanProperties,
      },
      revalidate: 60,
    };
  } catch (error) {
    // Log error in dev to help debug
    if (process.env.NODE_ENV === "development") {
      console.error("[Agent Slug getStaticProps] Error:", error);
    }
    return { notFound: true };
  }
};