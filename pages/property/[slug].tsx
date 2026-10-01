// File: pages/property/[slug].tsx
// ISR public property detail page — canonical slug-based URL
// COMPLETE FILE — replace any existing version

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps, GetStaticPaths } from "next";

import UniversalInquiryModal from "@/components/UniversalInquiryModal";
import LoginOrSignupForm from "@/components/auth/LoginOrSignupForm";
import StaticMap from "@/components/maps/StaticMap";
import PaymentTimeline from "@/components/property/PaymentTimeline";
import SimilarProperties from "@/components/property/SimilarProperties";
import { PropertyDetailSkeleton } from "@/components/skeletons/PropertyDetailSkeleton";
import TrueCostCard, {
  TrueCostBreakdown,
  ListingType,
} from "@/components/property/TrueCostCard";
import ReportListingModal from "@/components/property/ReportListingModal";
import { addToRecentlyViewed } from "@/lib/recently-viewed";
import AleemWidget from "@/components/aleem/AleemWidget";
import SafeDealBanner from "@/components/safedeal/SafeDealBanner";
import VerifiedOwnerBadge from "@/components/badges/VerifiedOwnerBadge";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompare } from "@/hooks/useCompare";
import PropertyMediaExplorer from "@/components/property/PropertyMediaExplorer";

import {
  ArrowLeft,
  MapPin,
  Home,
  Bed,
  Bath,
  Car,
  Maximize,
  Calendar,
  Eye,
  Share2,
  Heart,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  Building,
  Layers,
  Key,
  FileText,
  Zap,
  Shield,
  ShieldCheck,
  Droplets,
  Flame,
  Trees,
  Dumbbell,
  GraduationCap,
  ShoppingBag,
  Stethoscope,
  Warehouse,
  Wind,
  Thermometer,
  Users,
  MessageCircle,
  AlertCircle,
  HardHat,
  ClipboardCheck,
  CircleDollarSign,
  Ruler,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Image as ImageIcon,
  Play,
  Map,
  Map as MapIcon,
  Camera,
  Video,
  LayoutGrid,
  CreditCard,
  Banknote,
  Info,
  Lock,
  Receipt,
  Sparkles,
  ChefHat,
  DoorOpen,
  User,
  Store,
  Megaphone,
  Truck,
  Snowflake,
  Utensils,
  Landmark,
  HeartPulse,
  Bus,
  Navigation,
  Compass,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyOwner {
  _id: string;
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  profilePictureUrl?: string;
}

// TrueCostBreakdown and ListingType are imported from TrueCostCard above
// (single source of truth — no local duplicates)

// Aligned with @/components/property/PaymentTimeline
interface InstallmentPlan {
  planName?: string;
  developerName?: string;
  planDuration?: number;
  planDurationUnit?: string;
  hasMonthly?: boolean;
  monthlyAmount?: number;
  monthlyCount?: number;
  hasQuarterly?: boolean;
  quarterlyAmount?: number;
  quarterlyCount?: number;
  hasHalfYearly?: boolean;
  halfYearlyAmount?: number;
  halfYearlyCount?: number;
  hasYearly?: boolean;
  yearlyAmount?: number;
  yearlyCount?: number;
}

interface BookingPayment {
  amount?: number;
  percentage?: number;
  dueDate?: string;
  isPaid?: boolean; // Ensure these match PaymentTimeline
}

interface PossessionPayment {
  amount?: number;
  percentage?: number;
  dueDate?: string;
  isPaid?: boolean;
}

interface ContactDetails {
  personName?: string;
  primaryPhone?: string;
  whatsappNumber?: string;
  email?: string;
  preferredMethod?: string;
  contactTime?: string;
  showPhoneOnListing?: boolean;
  allowWhatsappMessages?: boolean;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface PropertyImage {
  url: string;
  public_id?: string;
}

interface ProjectDetails {
  projectName?: string;
  developerName?: string;
  projectStatus?: string;
  developmentProgress?: number;
  launchDate?: string;
  expectedCompletionDate?: string;
}

interface Approvals {
  authority?: string;
}

interface Legal {
  ownershipType?: string;
}

type GovernmentTaxes = Record<string, number | undefined>;
type TransferCharges = Record<string, number | undefined>;
type ExtraCharges = Record<string, number | undefined>;
type PossessionCharges = { total?: number; description?: string };

interface Property {
  _id: string;
  slug?: string;
  owner: PropertyOwner;
  title: string;
  description: string;
  propertyType: string;
  propertySubtype?: string;
  propertyCategory?: string;
  listingType: string;
  listingPurpose?: string;
  price: number;
  totalPrice?: number;
  pricePerUnit?: number;
  priceNegotiable?: boolean;
  area: number;
  unit: string;
  city: string;
  society?: string;
  phase?: string;
  block?: string;
  streetNumber?: string;
  plotNumber?: string;
  completeAddress?: string;
  formattedAddress?: string;
  nearbyLandmarks?: string[];
  coordinates?: Coordinates;
  bedrooms?: number;
  bathrooms?: number;
  kitchens?: number;
  balconies?: number;
  storeRooms?: number;
  floorNumber?: number;
  totalFloors?: number;
  furnished?: string;
  condition?: string;
  facing?: string;
  possessionStatus?: string;
  ownershipType?: string;
  amenities?: string[];
  nearbyFacilities?: Array<{ name: string; category?: string; distance?: string }>;
  parking?: string | number;
  isBankFinanceAvailable?: boolean;
  booking?: BookingPayment;
  downPayment?: BookingPayment;
  installmentPlan?: InstallmentPlan;
  possession?: PossessionPayment;
  projectDetails?: ProjectDetails;
  approvals?: Approvals;
  legal?: Legal;
  extraCharges?: ExtraCharges;
  possessionCharges?: PossessionCharges;
  transferCharges?: TransferCharges;
  governmentTaxes?: GovernmentTaxes;
  videoUrl?: string;
  virtualTourUrl?: string;
  images: PropertyImage[];
  whatsappNumber?: string;
  contactDetails?: ContactDetails;
  contactTime?: string;
  status: "pending" | "approved" | "rejected";
  verification?: { status?: "draft" | "pending" | "under_review" | "verified" | "rejected" | "flagged" };
  isVerified: boolean;
  ownerVerified?: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  listingActor?: { role: 'developer' | 'agent' | 'owner'; label: string; displayName: string; profileSlug?: string; profileImageUrl?: string; verified?: boolean } | null;
  trustSummary?: { listingVerified?: boolean; sellerVerified?: boolean; ownershipEvidenceReviewed?: boolean; nocStatus?: string; disclaimer?: string };
}

type AmenityGroup =
  | "interior"
  | "exterior"
  | "building"
  | "society"
  | "security"
  | "other";

type InquiryLeadType =
  | "project_interest"
  | "call_back"
  | "site_visit"
  | "general_inquiry";

// ─── Utilities ────────────────────────────────────────────────────────────────

const stripHtml = (html: string): string =>
  (html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (s: string, n: number): string =>
  s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;

const sanitizeRichHtml = (html: string): string => {
  let out = (html || "").toString();
  out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  out = out.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "");
  out = out.replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "");
  out = out.replace(/<embed[\s\S]*?>/gi, "");
  out = out.replace(/\son\w+="[^"]*"/gi, "");
  out = out.replace(/\son\w+='[^']*'/gi, "");
  out = out.replace(/\sstyle="[^"]*"/gi, "");
  out = out.replace(/\sstyle='[^']*'/gi, "");
  out = out.replace(/javascript:/gi, "");
  out = out.replace(/data:/gi, "");

  const allowedTags = new Set([
    "p", "br", "strong", "b", "em", "i", "u",
    "ul", "ol", "li", "h1", "h2", "h3",
    "blockquote", "code", "pre", "a",
  ]);

  out = out.replace(
    /<\/?([a-z0-9]+)(\s[^>]*)?>/gi,
    (full: string, tagName: string, attrs: string) => {
      const t = String(tagName || "").toLowerCase();
      if (!allowedTags.has(t)) return "";
      if (t !== "a") {
        return full.startsWith("</") ? `</${t}>` : `<${t}>`;
      }
      const rawAttrs = String(attrs || "");
      const hrefMatch = rawAttrs.match(
        /\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i
      );
      const href = (
        hrefMatch?.[2] ||
        hrefMatch?.[3] ||
        hrefMatch?.[4] ||
        ""
      ).trim();
      const isSafe =
        href.startsWith("/") ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:");
      if (!isSafe) {
        return full.startsWith("</") ? `</${t}>` : `<${t}>`;
      }
      const isExternal =
        href.startsWith("http://") || href.startsWith("https://");
      const rel = isExternal ? ' rel="noopener noreferrer"' : "";
      const target = isExternal ? ' target="_blank"' : "";
      return full.startsWith("</")
        ? `</${t}>`
        : `<${t} href="${href}"${target}${rel}>`;
    }
  );

  return out;
};

const normalizePkMobile = (raw: string): string => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("92") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length >= 11)
    return `92${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("3")) return `92${digits}`;
  return digits;
};

const getOptimizedImageUrl = (url: string, width = 800): string => {
  if (!url || !url.includes("cloudinary.com") || !url.includes("/upload/"))
    return url;
  const base = `f_auto,q_auto,w_${width}`;
  const wm =
    "l_highrise_logo,o_40,w_0.18,fl_relative,g_south_east,x_20,y_20";
  return url.replace("/upload/", `/upload/${base}/${wm}/`);
};

const getThumbnailUrl = (url: string): string => {
  if (!url || !url.includes("cloudinary.com") || !url.includes("/upload/"))
    return url;
  const base = "w_150,h_100,c_fill,q_auto,f_auto";
  const wm =
    "l_highrise_logo,o_40,w_0.16,fl_relative,g_south_east,x_20,y_20";
  return url.replace("/upload/", `/upload/${base}/${wm}/`);
};

const formatPrice = (price: number): string => {
  const p = typeof price === "number" && !isNaN(price) ? price : 0;
  if (p >= 10_000_000) return `${(p / 10_000_000).toFixed(2)} Crore`;
  if (p >= 100_000) return `${(p / 100_000).toFixed(2)} Lac`;
  return p.toLocaleString("en-PK");
};

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const formatFurnished = (value?: string): string => {
  const map: Record<string, string> = {
    unfurnished: "Unfurnished",
    semi_furnished: "Semi-Furnished",
    fully_furnished: "Fully Furnished",
  };
  return map[value ?? ""] ?? value ?? "N/A";
};

const formatCondition = (value?: string): string => {
  const map: Record<string, string> = {
    brand_new: "Brand New",
    excellent: "Excellent",
    good: "Good",
    needs_renovation: "Needs Renovation",
  };
  return map[value ?? ""] ?? value ?? "N/A";
};

const formatFacing = (value?: string): string => {
  const map: Record<string, string> = {
    north: "North",
    south: "South",
    east: "East",
    west: "West",
    corner: "Corner",
    park_facing: "Park Facing",
    main_boulevard: "Main Boulevard",
  };
  return map[value ?? ""] ?? value ?? "N/A";
};

const formatPossession = (value?: string): string => {
  const map: Record<string, string> = {
    ready: "Ready to Move",
    under_construction: "Under Construction",
    on_handover: "On Handover",
  };
  return map[value ?? ""] ?? value ?? "N/A";
};

const formatOwnership = (value?: string): string => {
  const map: Record<string, string> = {
    freehold: "Freehold",
    leasehold: "Leasehold",
    power_of_attorney: "Power of Attorney",
  };
  return map[value ?? ""] ?? value ?? "N/A";
};

const formatContactTime = (value?: string): string => {
  const map: Record<string, string> = {
    anytime: "Anytime",
    morning: "Morning (9 AM – 12 PM)",
    afternoon: "Afternoon (12 PM – 5 PM)",
    evening: "Evening (5 PM – 9 PM)",
  };
  return map[value ?? ""] ?? value ?? "Anytime";
};

const formatParking = (value?: string | number): string => {
  if (value === undefined || value === null) return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const str = String(value);
  if (str === "0") return "No Parking";
  if (str === "4+") return "4+ Cars";
  if (str) return `${str} Car${Number(str) > 1 ? "s" : ""}`;
  return "N/A";
};

const getListingTypeBadge = (type: string): string => {
  const map: Record<string, string> = {
    full_payment: "For Sale",
    installment: "Installment",
    rent: "For Rent",
    pre_launch: "Pre-Launch",
  };
  return map[type] ?? "For Sale";
};

const extractVideoId = (
  url: string
): { type: "youtube" | "vimeo"; id: string } | null => {
  if (!url) return null;
  const yt = url.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  if (yt) return { type: "youtube", id: yt[1] };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: "vimeo", id: vm[1] };
  return null;
};

// ─── Amenity config ───────────────────────────────────────────────────────────

type AmenityDef = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  group: AmenityGroup;
};

const AMENITY_ICONS: Record<string, AmenityDef> = {
  // Residential Keys
  balcony:              { icon: DoorOpen,       label: "Balcony",                group: "interior"  },
  servant_quarter:      { icon: User,           label: "Servant Quarter",        group: "interior"  },
  store_room:           { icon: Warehouse,      label: "Store Room",             group: "interior"  },
  laundry:              { icon: Warehouse,      label: "Laundry Room",           group: "interior"  },
  modular_kitchen:      { icon: ChefHat,        label: "Modular Kitchen",        group: "interior"  },
  lift:                 { icon: Building,       label: "Lift / Elevator",        group: "building"  },
  backup_generator:     { icon: Zap,            label: "Backup Generator",       group: "building"  },
  gym:                  { icon: Dumbbell,       label: "Gym",                    group: "building"  },
  swimming_pool:        { icon: Droplets,       label: "Swimming Pool",          group: "exterior"  },
  community_hall:       { icon: Users,          label: "Community Hall",         group: "building"  },
  kids_play_area:       { icon: Users,          label: "Kids Play Area",         group: "building"  },
  rooftop_access:       { icon: Layers,         label: "Rooftop Access",         group: "exterior"  },
  cctv:                 { icon: Eye,            label: "CCTV Security",          group: "security"  },
  security_guard:       { icon: ShieldCheck,    label: "24/7 Security",          group: "security"  },
  intercom:             { icon: Phone,          label: "Intercom",               group: "interior"  },
  reserved_parking:     { icon: Car,            label: "Reserved Parking",       group: "exterior"  },
  visitor_parking:      { icon: Car,            label: "Visitor Parking",        group: "exterior"  },

  // Commercial Keys
  front_signage:        { icon: Megaphone,      label: "Front Signage",          group: "exterior"  },
  display_window:       { icon: Store,          label: "Display Window",         group: "interior"  },
  reception:            { icon: Users,          label: "Reception Area",         group: "interior"  },
  meeting_room:         { icon: Users,          label: "Meeting Room",           group: "interior"  },
  central_ac:           { icon: Wind,           label: "Central AC",             group: "building"  },
  split_ac:             { icon: Wind,           label: "Split AC",               group: "interior"  },
  backup_power:         { icon: Zap,            label: "Backup Power",           group: "building"  },
  internet_ready:       { icon: Zap,            label: "Internet Ready",         group: "interior"  },
  lift_access:          { icon: Building,       label: "Lift Access",            group: "building"  },
  loading_dock:         { icon: Truck,          label: "Loading Dock",           group: "exterior"  },
  fire_safety:          { icon: AlertCircle,    label: "Fire Safety System",     group: "building"  },
  access_control:       { icon: Lock,           label: "Access Control",         group: "security"  },

  // Food Court / Restaurant
  commercial_kitchen:   { icon: ChefHat,        label: "Commercial Kitchen",     group: "interior"  },
  exhaust_system:       { icon: Wind,           label: "Exhaust System",         group: "interior"  },
  grease_trap:          { icon: Droplets,       label: "Grease Trap",            group: "interior"  },
  cold_storage:         { icon: Snowflake,      label: "Cold Storage",           group: "interior"  },
  gas_connection:       { icon: Flame,          label: "Gas Connection",         group: "building"  },
  outdoor_seating:      { icon: Utensils,       label: "Outdoor Seating",        group: "exterior"  },
  delivery_bay:         { icon: Truck,          label: "Delivery Bay",           group: "exterior"  },

  // Plot / Land
  electricity:          { icon: Zap,            label: "Electricity Available",  group: "building"  },
  sui_gas:              { icon: Flame,          label: "Sui Gas Available",      group: "building"  },
  water:                { icon: Droplets,       label: "Water Connection",       group: "building"  },
  sewerage:             { icon: Warehouse,      label: "Sewerage Line",          group: "building"  },
  boundary_wall:        { icon: Shield,         label: "Boundary Wall",          group: "exterior"  },
  main_gate:            { icon: Lock,           label: "Main Gate",              group: "exterior"  },
  paved_road:           { icon: Navigation,     label: "Paved Road Access",      group: "society"   },
  corner:               { icon: Sparkles,       label: "Corner Plot",            group: "exterior"  },

  // Legacy Fallbacks
  centralHeating:       { icon: Thermometer,   label: "Central Heating",        group: "interior"  },
  smartHome:            { icon: Home,           label: "Smart Home",             group: "interior"  },
  doubleGlazedWindows:  { icon: Layers,         label: "Double-Glazed Windows",  group: "interior"  },
  laundry_room:         { icon: Warehouse,      label: "Laundry Room",           group: "interior"  },
  boundaryWall:         { icon: Shield,         label: "Boundary Wall",          group: "exterior"  },
  garden:               { icon: Trees,          label: "Garden",                 group: "exterior"  },
  swimmingPool:         { icon: Droplets,       label: "Swimming Pool",          group: "exterior"  },
  terrace:              { icon: Layers,         label: "Terrace",                group: "exterior"  },
  lawn_garden:          { icon: Trees,          label: "Lawn / Garden",          group: "exterior"  },
  elevator:             { icon: Building,       label: "Elevator / Lift",        group: "building"  },
  generator:            { icon: Zap,            label: "Generator / Backup",     group: "building"  },
  prayerRoom:           { icon: Building,       label: "Prayer Room",            group: "building"  },
  water_supply:         { icon: Droplets,       label: "Water Supply",           group: "building"  },
  solar_panels:         { icon: Zap,            label: "Solar Panels",           group: "building"  },
  central_heating:      { icon: Thermometer,    label: "Central Heating",        group: "interior"  },
  mosque:               { icon: Building,       label: "Mosque",                 group: "society"   },
  school:               { icon: GraduationCap,  label: "School",                 group: "society"   },
  hospital:             { icon: Stethoscope,    label: "Hospital",               group: "society"   },
  shoppingMall:         { icon: ShoppingBag,    label: "Shopping Mall",          group: "society"   },
  parks:                { icon: Trees,          label: "Parks",                  group: "society"   },
  sportsFacilities:     { icon: Dumbbell,       label: "Sports Facilities",      group: "society"   },
  joggingTrack:         { icon: Users,          label: "Jogging Track",          group: "society"   },
  communityCenter:      { icon: Users,          label: "Community Center",       group: "society"   },
  gatedEntry:           { icon: Shield,         label: "Gated Entry",            group: "security"  },
  securityGuards24x7:   { icon: ShieldCheck,    label: "24/7 Security",          group: "security"  },
  cctvCameras:          { icon: Eye,            label: "CCTV Cameras",           group: "security"  },
  intercomSystem:       { icon: Phone,          label: "Intercom System",        group: "security"  },
  smartLock:            { icon: Lock,           label: "Smart Lock",             group: "security"  },
  panicButton:          { icon: AlertCircle,    label: "Panic Button",           group: "security"  },
  gated_community:      { icon: Shield,         label: "Gated Community",        group: "security"  },
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }): React.ReactElement {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3.5 h-3.5" /> Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
        <XCircle className="w-3.5 h-3.5" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
      <Clock className="w-3.5 h-3.5" /> Pending Review
    </span>
  );
}

// ─── Copy banner ──────────────────────────────────────────────────────────────

function CopyBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}): React.ReactElement {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl bg-[#004063] text-white text-sm font-medium shadow-xl animate-fadeIn">
      <CheckCircle className="w-4 h-4 text-[#10b981] flex-shrink-0" />
      {message}
      <button
        type="button"
        onClick={onDismiss}
        className="ml-2 text-white/60 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface PageProps {
  initialProperty: Property | null;
}

export default function PropertySlugPage({
  initialProperty,
}: PageProps): React.ReactElement {
  const router = useRouter();
  const { data: session } = useSession();
  const favorites = useFavorites({ defaultEntityType: 'property' });
  const compare = useCompare({ defaultEntityType: 'property' });

  // ── State ──────────────────────────────────────────────────────────────────
  const [property, setProperty] = useState<Property | null>(
    initialProperty ?? null
  );
  const [loading, setLoading] = useState(!initialProperty);
  const [error, setError] = useState("");

  const [trueCostLoading, setTrueCostLoading] = useState(false);
  const [trueCostError, setTrueCostError] = useState("");
  const [trueCostBreakdown, setTrueCostBreakdown] =
    useState<TrueCostBreakdown | null>(null);

  const [selectedImage, setSelectedImage] = useState(0);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [explorerTab, setExplorerTab] = useState<'media'|'video'|'map'>('media');
  const [explorerPhotoIdx, setExplorerPhotoIdx] = useState(0);
  const [showPhone, setShowPhone] = useState(false);
  const [revealedContact, setRevealedContact] = useState<{ name?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null; preferredMethod?: string | null; contactTime?: string | null } | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryLeadType, setInquiryLeadType] =
    useState<InquiryLeadType>("general_inquiry");

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [showJumpLinks, setShowJumpLinks] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Inline copy banner (replaces alert())
  const [copyBanner, setCopyBanner] = useState("");
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCopyBanner = useCallback((msg: string) => {
    setCopyBanner(msg);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopyBanner(""), 3000);
  }, []);

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    []
  );

  // ── Derived ────────────────────────────────────────────────────────────────
  const isInstallment = property?.listingType === "installment";
  const isRent = property?.listingType === "rent";
  const isCommercial =
    property?.propertyCategory === "commercial" ||
    /shop|office|plaza|mall|commercial/i.test(property?.propertyType ?? "");

  const fullLocation = useMemo(() => {
    const parts: string[] = [];
    if (property?.plotNumber) parts.push(`Plot ${property.plotNumber}`);
    if (property?.streetNumber) parts.push(property.streetNumber);
    if (property?.block) parts.push(property.block);
    if (property?.phase) parts.push(property.phase);
    if (property?.society) parts.push(property.society);
    if (property?.city) parts.push(property.city);
    return parts.filter(Boolean).join(", ");
  }, [property]);

  // Auth-derived values (useSession only — no localStorage)
  const sessionUser = session?.user as
    | {
        _id?: string;
        id?: string;
        name?: string;
        email?: string;
        role?: string;
      }
    | undefined;

  const isLoggedIn = !!sessionUser;
  const isSaved = property ? favorites.isFavorite(property._id, 'property') : false;
  const isCompared = property ? compare.isInCompare(property._id, 'property') : false;

  // Detect ownership
  useEffect(() => {
    if (!sessionUser || !property) return;
    const uid = sessionUser._id ?? sessionUser.id ?? "";
    setIsOwner(!!uid && uid === property.owner?._id);
  }, [sessionUser, property]);

  // ── Fetch property (client-side fallback for draft/pending) ───────────────
  const fetchProperty = useCallback(
    async (slug: string, signal: AbortSignal) => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(
          `/api/properties/by-slug/${encodeURIComponent(slug)}`,
          { signal }
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          setError(body.error ?? "Property not found");
          setProperty(null);
          return;
        }
        const data = (await res.json()) as { property: Property };
        setProperty(data.property ?? null);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Property not found");
        setProperty(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!router.isReady) return;
    // ISR provided data → skip client fetch
    if (initialProperty) {
      // Next.js reuses this dynamic page component when moving between
      // /property/[slug] routes. Synchronize state with the new ISR props.
      setProperty(initialProperty);
      setError("");
      setLoading(false);

      // Reset UI that belongs to the previous listing.
      setSelectedImage(0);
      setExplorerOpen(false);
      setShowPhone(false);
      setRevealedContact(null);
      setTrueCostBreakdown(null);
      setTrueCostError("");
      setIsOwner(false);
      setActiveSection("overview");
      return;
    }
    const slug = router.query.slug;
    if (!slug || typeof slug !== "string") {
      setError("Invalid property link");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    fetchProperty(slug, controller.signal);
    return () => controller.abort();
  }, [router.isReady, router.query.slug, initialProperty, fetchProperty]);

  // ── True Cost fetch ───────────────────────────────────────────────────────
  // V4.8 API response shape:
  //   { success: true, trueCost: { basePrice, grandTotalBuyerFiler,
  //     extraChargesTotal, possessionChargesTotal, transferChargesTotal,
  //     governmentTaxBuyerFiler, governmentTaxBuyerNonFiler,
  //     maintenanceAnnual, bookingAmount, downPaymentAmount,
  //     totalInstallmentsAmount, possessionAmount, ... } }
  //
  // TrueCostCard expects TrueCostBreakdown shape with items[] array.
  // We transform the flat trueCost object into line items here.
  useEffect(() => {
    if (!property?._id) return;
    if (property.verification?.status !== "verified") return;
    const slug = property.slug;
    if (!slug) return;

    const controller = new AbortController();

    const run = async () => {
      try {
        setTrueCostLoading(true);
        setTrueCostError("");
        setTrueCostBreakdown(null);

        const res = await fetch(
          `/api/properties/true-cost?slug=${encodeURIComponent(slug)}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as {
            message?: string;
            code?: string;
          };
          setTrueCostError(
            errBody.message ?? "True cost data not available for this property."
          );
          return;
        }

        const data = (await res.json()) as {
          success?: boolean;
          trueCost?: {
            basePrice?: number;
            bookingAmount?: number;
            downPaymentAmount?: number;
            totalInstallmentsAmount?: number;
            possessionAmount?: number;
            extraChargesTotal?: number;
            possessionChargesTotal?: number;
            governmentTaxBuyerFiler?: number;
            governmentTaxBuyerNonFiler?: number;
            transferChargesTotal?: number;
            maintenanceAnnual?: number;
            grandTotalBuyerFiler?: number;
            grandTotalBuyerNonFiler?: number;
            hiddenChargesDisclosed?: boolean;
          };
          message?: string;
        };

        if (!data.success || !data.trueCost) {
          setTrueCostError(data.message ?? "Unable to load true cost");
          return;
        }

        // Transform flat trueCost object → TrueCostBreakdown.items[]
        const tc = data.trueCost;
        const items: TrueCostBreakdown["items"] = [];

        if ((tc.bookingAmount ?? 0) > 0) {
          items.push({
            key: "booking",
            label: "Booking Amount",
            amount: tc.bookingAmount ?? 0,
          });
        }
        if ((tc.downPaymentAmount ?? 0) > 0) {
          items.push({
            key: "down_payment",
            label: "Down Payment",
            amount: tc.downPaymentAmount ?? 0,
          });
        }
        if ((tc.totalInstallmentsAmount ?? 0) > 0) {
          items.push({
            key: "installments",
            label: "Total Installments",
            amount: tc.totalInstallmentsAmount ?? 0,
          });
        }
        if ((tc.possessionAmount ?? 0) > 0) {
          items.push({
            key: "possession",
            label: "Possession Amount",
            amount: tc.possessionAmount ?? 0,
          });
        }
        if ((tc.extraChargesTotal ?? 0) > 0) {
          items.push({
            key: "extra_charges",
            label: "Extra Charges",
            amount: tc.extraChargesTotal ?? 0,
            note: "Society development, club, utilities, etc.",
          });
        }
        if ((tc.possessionChargesTotal ?? 0) > 0) {
          items.push({
            key: "possession_charges",
            label: "Possession Charges",
            amount: tc.possessionChargesTotal ?? 0,
          });
        }
        if ((tc.transferChargesTotal ?? 0) > 0) {
          items.push({
            key: "transfer_charges",
            label: "Transfer Charges",
            amount: tc.transferChargesTotal ?? 0,
            note: "Stamp duty, registration, transfer fee",
          });
        }
        if ((tc.governmentTaxBuyerFiler ?? 0) > 0) {
          items.push({
            key: "gov_tax_filer",
            label: "Government Tax (Filer)",
            amount: tc.governmentTaxBuyerFiler ?? 0,
            note: "Lower rate for tax filers — file your returns!",
          });
        }
        if ((tc.maintenanceAnnual ?? 0) > 0) {
          items.push({
            key: "maintenance_annual",
            label: "Annual Maintenance",
            amount: tc.maintenanceAnnual ?? 0,
            note: "Estimated per year",
          });
        }

        const basePrice = tc.basePrice ?? property.price ?? 0;
        const total     = tc.grandTotalBuyerFiler ?? basePrice;
        const subtotal  = items.reduce((s, it) => s + (it.amount || 0), 0) + basePrice;

        setTrueCostBreakdown({
          total,
          subtotal,
          currency:    "PKR",
          listingType: (property.listingType as ListingType) ?? "full_payment",
          baseLabel:   "Base Listing Price",
          baseAmount:  basePrice,
          disclaimer:  tc.hiddenChargesDisclosed
            ? "Seller has disclosed all known charges. Final amounts may still vary based on society rules and government policy at transfer time."
            : "Estimates only — seller has not disclosed all hidden charges. Final amounts depend on society and government rules at the time of transfer.",
          items,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setTrueCostError("Unable to load true cost");
      } finally {
        setTrueCostLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [property?._id, property?.status, property?.slug, property?.price, property?.listingType]);

  // ── Recently viewed ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!property?._id) return;
    addToRecentlyViewed({
      _id: property._id,
      slug: property.slug,
      title: property.title,
      price: property.price,
      city: property.city,
      images: property.images?.map((img) => img.url),
      propertyType: property.propertyType,
      viewedAt: new Date().toISOString(),
    });
  }, [property?._id]);

  // ── Gallery navigation ────────────────────────────────────────────────────
  const openExplorer = useCallback((tab: 'media' | 'video' | 'map', photoIdx = 0) => {
    setExplorerTab(tab);
    setExplorerPhotoIdx(photoIdx);
    setExplorerOpen(true);
  }, []);

  // ── Contact helpers ───────────────────────────────────────────────────────
  // Public ISR data contains no seller PII. Contact is revealed only after
  // authenticated server authorization through /api/properties/:id/contact.
  const phoneValue = revealedContact?.phone ?? "";
  const canRevealPhone = !!phoneValue;
  const waValue = normalizePkMobile(revealedContact?.whatsapp ?? "");
  const canWhatsapp = !!waValue;

  const getCleanPropertyId = useCallback((p: Property | null): string => {
    if (!p) return "";
    if (typeof p._id === "string" && p._id && p._id !== "[object Object]") {
      return p._id;
    }
    if (p._id && typeof p._id === "object") {
      const obj = p._id as Record<string, unknown>;
      if (typeof obj._id === "string") return obj._id;
      if (typeof obj.toString === "function") {
        const str = obj.toString();
        if (str !== "[object Object]") return str;
      }
    }
    return p.slug || "";
  }, []);

  const revealContact = useCallback(async (): Promise<void> => {
    const targetId = getCleanPropertyId(property);
    if (!targetId || contactLoading) return;
    if (!isLoggedIn) { setShowAuthModal(true); return; }
    setContactLoading(true);
    try {
      const res = await fetch(`/api/properties/${encodeURIComponent(targetId)}/contact`, { headers: { Accept: 'application/json' } });
      const data = await res.json() as { success?: boolean; contact?: typeof revealedContact; message?: string };
      if (res.ok && data.success && data.contact) {
        setRevealedContact(data.contact);
        if (data.contact.phone) setShowPhone(true);
      } else {
        setCopyBanner(data.message ?? 'Contact details are not available. You can send an inquiry instead.');
      }
    } catch {
      setCopyBanner('Contact details could not be loaded. You can send an inquiry instead.');
    } finally {
      setContactLoading(false);
    }
  }, [property, getCleanPropertyId, contactLoading, isLoggedIn]);

  // ── Jump links ────────────────────────────────────────────────────────────
  const jumpLinks = useMemo(() => {
    if (!property) return [];
    const links: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { id: "overview", label: "Overview", icon: LayoutGrid },
    ];
    if (isInstallment)
      links.push({ id: "payment-plan", label: "Payment Plan", icon: CreditCard });
    if (trueCostLoading || !!trueCostBreakdown)
      links.push({ id: "true-cost", label: "True Cost", icon: Receipt });
    const hasCharges =
      !!trueCostBreakdown ||
      trueCostLoading ||
      !!property.extraCharges ||
      !!property.possessionCharges ||
      !!property.transferCharges ||
      !!property.governmentTaxes;
    if (hasCharges && !isRent)
      links.push({ id: "charges", label: "Charges", icon: Banknote });
    links.push({ id: "details", label: "Details", icon: Info });
    links.push({ id: "location", label: "Location", icon: MapPin });
    if (property.coordinates?.lat && property.coordinates?.lng)
      links.push({ id: "map-section", label: "Map", icon: Map });
    if (property.amenities?.length)
      links.push({ id: "amenities", label: "Amenities", icon: CheckCircle });
    links.push({ id: "description", label: "Description", icon: FileText });
    if (property.videoUrl)
      links.push({ id: "video-section", label: "Video", icon: Play });
    links.push({ id: "contact", label: "Contact", icon: Phone });
    return links;
  }, [property, isInstallment, isRent, trueCostLoading, trueCostBreakdown]);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const offset = 80;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.pageYOffset - offset,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    if (!property) return;
    const handler = () => {
      const scrollY = window.scrollY;
      setShowJumpLinks(scrollY > 300);
      const sectionIds = jumpLinks
        .map((l) => l.id)
        .filter((id) => id !== "contact");
      let current = "overview";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 200) current = id;
      }
      const atBottom =
        scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 200;
      if (atBottom) current = "contact";
      setActiveSection(current);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [property, jumpLinks]);

  // ── Share ─────────────────────────────────────────────────────────────────
  const canonicalUrl = useMemo(() => {
    const slug = property?.slug ?? property?._id ?? "";
    return `https://highrise.pk/property/${slug}`;
  }, [property]);

  const handleShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : canonicalUrl;
    if ((navigator as Navigator & { share?: (data: object) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (data: object) => Promise<void> }).share({
          title: property?.title,
          text: `Check out this property: ${property?.title}`,
          url,
        });
      } catch {
        // User cancelled share — silent
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        showCopyBanner("Link copied to clipboard!");
      } catch {
        showCopyBanner("Copy this link: " + url);
      }
    }
  }, [property?.title, canonicalUrl, showCopyBanner]);

  // ── SEO ───────────────────────────────────────────────────────────────────
  const metaDescription = useMemo(() => {
    if (!property?.description)
      return "Find verified properties in Pakistan on Highrise.pk.";
    const plain = stripHtml(property.description);
    return truncate(
      plain || "Find verified properties in Pakistan on Highrise.pk.",
      160
    );
  }, [property?.description]);

  const ogImage = useMemo(() => {
    if (!property?.images?.length) return "";
    return getOptimizedImageUrl(property.images[0].url, 1200);
  }, [property?.images]);

  const robotsContent = useMemo(() => {
    if (!property) return "noindex, nofollow";
    if (property.verification?.status !== "verified") return "noindex, nofollow";
    return "index, follow";
  }, [property]);

  const heroMapUrl = useMemo(() => {
    if (!property) return "";
    if (property.coordinates?.lat && property.coordinates?.lng) {
      return `https://maps.google.com/maps?q=${property.coordinates.lat},${property.coordinates.lng}&z=15&output=embed`;
    }
    const addr =
      property.formattedAddress ?? property.completeAddress ?? fullLocation;
    if (!addr) return "";
    return `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&z=15&output=embed`;
  }, [property, fullLocation]);

  const videoInfo = useMemo(
    () => (property?.videoUrl ? extractVideoId(property.videoUrl) : null),
    [property?.videoUrl]
  );

  const videoCount = useMemo(() => {
    let c = 0;
    if (property?.videoUrl) c++;
    if (property?.virtualTourUrl) c++;
    return c;
  }, [property?.videoUrl, property?.virtualTourUrl]);

  // ── JSON-LD ───────────────────────────────────────────────────────────────
  const jsonLd = useMemo(() => {
    if (!property) return null;
    const priceValue = property.totalPrice ?? property.price;

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://highrise.pk/" },
        { "@type": "ListItem", position: 2, name: "Properties", item: "https://highrise.pk/properties" },
        ...(property.city
          ? [{
              "@type": "ListItem",
              position: 3,
              name: property.city,
              item: `https://highrise.pk/properties?city=${encodeURIComponent(property.city)}`,
            }]
          : []),
        { "@type": "ListItem", position: 4, name: property.title, item: canonicalUrl },
      ],
    };

    const listing = {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: property.title,
      url: canonicalUrl,
      description: metaDescription,
      image: property.images?.slice(0, 5).map((i) => getOptimizedImageUrl(i.url, 1200)),
      datePosted: property.createdAt,
      offers: {
        "@type": "Offer",
        priceCurrency: "PKR",
        price: priceValue,
        availability: "https://schema.org/InStock",
      },
      address: {
        "@type": "PostalAddress",
        addressLocality: property.city,
        streetAddress:
          property.formattedAddress ?? property.completeAddress ?? fullLocation,
      },
      ...(property.coordinates?.lat && property.coordinates?.lng
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: property.coordinates.lat,
              longitude: property.coordinates.lng,
            },
          }
        : {}),
      additionalProperty: [
        { "@type": "PropertyValue", name: "Area", value: `${property.area} ${property.unit}` },
        ...(property.bedrooms ? [{ "@type": "PropertyValue", name: "Bedrooms", value: String(property.bedrooms) }] : []),
        ...(property.bathrooms ? [{ "@type": "PropertyValue", name: "Bathrooms", value: String(property.bathrooms) }] : []),
        ...(property.propertyType ? [{ "@type": "PropertyValue", name: "Property Type", value: property.propertyType }] : []),
        ...(property.listingType ? [{ "@type": "PropertyValue", name: "Listing Type", value: property.listingType }] : []),
        ...(trueCostBreakdown?.total
          ? [{ "@type": "PropertyValue", name: "Estimated Total Cost", value: `PKR ${formatPrice(trueCostBreakdown.total)}` }]
          : []),
      ],
    };

    return [breadcrumb, listing];
  }, [property, canonicalUrl, metaDescription, fullLocation, trueCostBreakdown]);

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) return <PropertyDetailSkeleton />;

  if (error || !property) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4">
        <Head>
          <title>Property Not Found | Highrise.pk</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center max-w-md w-full">
          <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#004063] mb-2">
            Property Not Found
          </h2>
          <p className="text-[#666666] mb-6">
            {error || "This property does not exist or has been removed."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/properties"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#029bba] text-white font-semibold text-sm hover:bg-[#017a8a] transition-colors"
            >
              Browse Properties
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-[#333333] font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const contactCardNode = (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-[#004063] mb-4">
        Contact Seller
      </h2>

      {!isLoggedIn ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-[#004063] mb-2">Login Required</h3>
          <p className="text-sm text-[#666666] mb-6">Please login to view seller contact details and send inquiries.</p>
          <div className="flex flex-col gap-3">
            <button onClick={() => setShowAuthModal(true)} className="w-full py-3 bg-[#029bba] text-white rounded-xl font-semibold hover:bg-[#017a8a] transition-colors flex items-center justify-center gap-2">
              <Key className="w-4 h-4" /> Login to View Contacts
            </button>
            <button onClick={() => setShowAuthModal(true)} className="w-full py-3 border border-gray-200 text-[#333333] rounded-xl font-medium hover:bg-gray-50 transition-colors">
              Create Account
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
              {property.listingActor?.profileImageUrl ? (
                <img src={property.listingActor.profileImageUrl} alt={property.listingActor?.displayName ?? "Seller"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#666666] text-xl font-bold">
                  {(property.listingActor?.displayName?.charAt(0) ?? "U").toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-[#333333]">{property.listingActor?.displayName ?? "Property seller"}</p>
              <p className="text-sm text-[#666666]">{property.listingActor?.label ?? "Seller"}</p>
            </div>
          </div>

          {property.listingActor?.verified && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800">🛡️ Verified Owner Listing</p>
                <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">The accountable listing actor has a verified Highrise profile.</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {canRevealPhone ? (
              showPhone ? (
                <div className="flex items-center justify-between w-full py-3 px-4 bg-[#f8fafc] border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-[#004063]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phone Number</p>
                      <a href={`tel:${phoneValue}`} className="font-black text-[#004063] text-lg hover:text-[#029bba] transition-colors truncate block">{phoneValue}</a>
                    </div>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowPhone(true)} className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#004063] text-white rounded-xl font-bold text-[15px] hover:bg-[#002b42] shadow-md transition-colors"><Phone className="w-5 h-5" />Show Phone Number</button>
              )
            ) : (
              <button onClick={() => void revealContact()} disabled={contactLoading} className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#029bba] text-white rounded-xl font-bold text-[15px] hover:bg-[#017a8a] shadow-md transition-colors disabled:opacity-60"><Phone className="w-5 h-5" />{contactLoading ? "Checking Contact…" : "Reveal Contact"}</button>
            )}

            {canWhatsapp && (
              <a href={`https://wa.me/${waValue}?text=${encodeURIComponent(`Hi, I'm interested in your property: ${property.title}\n\nLink: ${canonicalUrl}`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#25D366] text-white rounded-xl font-bold text-[15px] shadow-md shadow-[#25D366]/20 hover:bg-[#128C7E] hover:scale-[1.02] transition-all active:scale-[0.98]">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .092 5.403.089 11.961c-.002 2.095.545 4.14 1.583 5.945L.035 24l6.247-1.637a11.85 11.85 0 0 0 5.766 1.498h.004c6.556 0 11.96-5.403 11.963-11.961a11.83 11.83 0 0 0-3.551-8.402"/></svg>
                WhatsApp
              </a>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <h3 className="text-base font-semibold text-[#004063] mb-4 flex items-center gap-2"><Mail className="w-5 h-5 text-[#029bba]" />Interested in this property?</h3>
            <div className="space-y-3">
              <button onClick={() => { setInquiryLeadType("general_inquiry"); setShowInquiryModal(true); }} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#029bba] to-[#017a8a] text-white font-semibold hover:opacity-90 transition-opacity"><Mail className="w-5 h-5" />Send Inquiry</button>
              <button onClick={() => { setInquiryLeadType("site_visit"); setShowInquiryModal(true); }} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-[#029bba] text-[#029bba] font-medium hover:bg-[#029bba]/5 transition-colors"><Calendar className="w-5 h-5" />Schedule Site Visit</button>
            </div>
          </div>

          {/* Enterprise SafeDeal Integration Inside Contact Card */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <SafeDealBanner variant="compact" />
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <Head>
        <title>{property.title} | Highrise.pk</title>
        <meta name="description" content={metaDescription} />
        <meta name="robots" content={robotsContent} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${property.title} | Highrise.pk`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
        <meta name="twitter:title" content={`${property.title} | Highrise.pk`} />
        <meta name="twitter:description" content={metaDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
          />
        )}
      </Head>

      <div className="min-h-screen bg-[#f8f9fa] pb-24 lg:pb-0">

        {/* ── Inline copy banner ──────────────────────────────────────────── */}
        {copyBanner && (
          <CopyBanner
            message={copyBanner}
            onDismiss={() => setCopyBanner("")}
          />
        )}

        {/* ── Jump links (sticky) ─────────────────────────────────────────── */}
        <div
          className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-md transition-all duration-300 ${
            showJumpLinks
              ? "translate-y-0 opacity-100"
              : "-translate-y-full opacity-0 pointer-events-none"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4">
            <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-3">
              {jumpLinks.map((link) => {
                const Icon = link.icon;
                const active = activeSection === link.id;
                return (
                  <button
                    key={link.id}
                    onClick={() => scrollToSection(link.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                      active
                        ? "bg-[#029bba] text-white shadow-sm"
                        : "text-[#666666] hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

          {/* ── Main Layout Container ──────────────────────────────────────── */}
          <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 lg:py-8">

            {/* ── BREADCRUMBS & TOP ACTIONS ROW ───────────────────────────── */}
            <div className="flex items-center justify-between gap-4 mb-4 text-xs">
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-gray-500 overflow-x-auto scrollbar-hide">
                <Link href="/" className="hover:text-[#029bba] flex items-center gap-1 transition-colors flex-shrink-0">
                  <Home className="w-3.5 h-3.5" />
                  <span>Home</span>
                </Link>
                <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <Link href="/properties" className="hover:text-[#029bba] transition-colors flex-shrink-0">
                  Properties
                </Link>
                {property.city && (
                  <>
                    <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <Link
                      href={`/properties?city=${encodeURIComponent(property.city)}`}
                      className="hover:text-[#029bba] transition-colors flex-shrink-0"
                    >
                      {property.city}
                    </Link>
                  </>
                )}
                <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-[300px]">
                  {property.title}
                </span>
              </nav>

              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#029bba] transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Search</span>
              </button>
            </div>

            {/* ── HERO GALLERY (Full Width) ─────────────────────────────────── */}
          <div className="relative mb-10">
                {/* Gallery Card */}
                <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Top Left Badges */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-20 pointer-events-none">
                    <span className="bg-[#029bba] text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
                      {getListingTypeBadge(property.listingType)}
                    </span>
                    {property.isVerified && (
                      <span className="bg-[#10b981] text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>

                  {/* Top Right Floating Actions */}
                  <div className="absolute top-4 right-4 z-20 flex gap-2 pointer-events-auto">
                    {isOwner && <StatusBadge status={property.status} />}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleShare(); }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg text-sm font-bold text-[#004063] hover:bg-white transition-all shadow-sm"
                    >
                      <Share2 className="w-4 h-4 text-[#029bba]" /> Share
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (property?._id) void favorites.toggle(property._id, 'property');
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg text-sm font-bold text-[#004063] hover:bg-white transition-all shadow-sm"
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-[#029bba] text-[#029bba]' : 'text-[#029bba]'}`} />
                      {isSaved ? 'Saved' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (property?._id) void compare.toggle(property._id, 'property');
                      }}
                      className={`hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg text-sm font-bold transition-all shadow-sm hover:bg-white ${
                        isCompared ? 'text-[#029bba]' : 'text-[#004063]'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4 text-[#029bba]" />
                      {isCompared ? 'Compared' : 'Compare'}
                    </button>
                  </div>

                  {property.images?.length ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-0.5">
                        <div
                          className="md:col-span-3 relative h-64 sm:h-80 md:h-[400px] cursor-pointer group"
                          onClick={() => openExplorer('media', 0)}
                        >
                          <img
                            src={getOptimizedImageUrl(property.images[selectedImage].url, 1200)}
                            alt={property.title}
                            className="w-full h-full object-cover"
                            loading="eager"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300" />
                        </div>

                        <div className="hidden md:flex md:col-span-1 flex-col gap-0.5">
                          {property.images.slice(1, 4).map((img, idx) => (
                            <div
                              key={idx}
                              className="relative flex-1 min-h-[130px] cursor-pointer group overflow-hidden"
                              onClick={() => openExplorer('media', idx + 1)}
                            >
                              <img
                                src={getOptimizedImageUrl(img.url, 400)}
                                alt={`${property.title} ${idx + 2}`}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all" />
                              {idx === 2 && property.images.length > 4 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <span className="text-white text-lg font-bold">
                                    +{property.images.length - 4} more
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mobile thumbnail strip */}
                      <div className="md:hidden flex gap-2 p-3 overflow-x-auto scrollbar-hide bg-gray-50">
                        {property.images.map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => openExplorer('media', idx)}
                            className="flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 border-transparent transition-all"
                          >
                            <img
                              src={getThumbnailUrl(img.url)}
                              alt={`Thumbnail ${idx + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="h-64 sm:h-80 md:h-[400px] bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center">
                      <Home className="w-16 h-16 text-gray-300 mb-3" />
                      <p className="text-[#666666] text-sm">No images available</p>
                    </div>
                  )}
                </div>

                {/* Media Chips - Project style: sibling with -mt-6 so half sits on hero, half hangs below */}
                <div className="flex justify-center -mt-6 relative z-20 px-4">
                  <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 px-2 py-1 flex items-center flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => openExplorer('media', 0)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-[#029bba] hover:bg-[#029bba]/5 transition-colors"
                      aria-label="Open photos"
                    >
                      <Camera className="w-4 h-4 text-[#029bba]" />
                      {property.images?.length || 0} {(property.images?.length || 0) === 1 ? 'Photo' : 'Photos'}
                    </button>

                    {videoCount > 0 && (
                      <>
                        <div className="w-px h-6 bg-gray-200" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={() => openExplorer('video', 0)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-[#029bba] hover:bg-[#029bba]/5 transition-colors"
                          aria-label="Open videos"
                        >
                          <Video className="w-4 h-4 text-[#029bba]" />
                          {videoCount} {videoCount === 1 ? 'Video' : 'Videos'}
                        </button>
                      </>
                    )}

                    {heroMapUrl && (
                      <>
                        <div className="w-px h-6 bg-gray-200" aria-hidden="true" />
                        <button
                          type="button"
                          onClick={() => openExplorer('map', 0)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-[#029bba] hover:bg-[#029bba]/5 transition-colors"
                          aria-label="Open map"
                        >
                          <MapIcon className="w-4 h-4 text-[#029bba]" />
                          Map
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

          {/* ── TWO-COLUMN CONTENT GRID ───────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left column (Details) ───────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6 min-w-0">

              {/* ── Overview ─────────────────────────────────────────────── */}

              {/* OLD LIGHTBOX REMOVED - REPLACED BY PROPERTY MEDIA EXPLORER */}

                {/* ── Overview (Project Style - Unboxed) ─────────────────── */}
                <div id="overview" className="pb-2 border-b border-gray-200 mb-6">
                  <div className="flex flex-col gap-4 mb-4">
                    {/* Price (Top, massive and dark, matching Project page) */}
                    <div>
                      <p className="text-3xl md:text-[32px] font-black text-[#004063] tracking-tight">
                        {isRent ? (
                          <>
                            PKR {formatPrice(property.price)}
                            <span className="text-lg font-bold text-gray-500 ml-1">/ month</span>
                          </>
                        ) : (
                          <>PKR {formatPrice(property.totalPrice ?? property.price)}</>
                        )}
                      </p>
                      {!isRent && property.pricePerUnit && (
                        <p className="text-sm text-gray-500 mt-1 font-medium">
                          PKR {formatPrice(property.pricePerUnit)} per {property.unit}
                        </p>
                      )}
                      {property.priceNegotiable && (
                        <span className="inline-block mt-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider rounded-full border border-emerald-100">
                          Price Negotiable
                        </span>
                      )}
                    </div>

                    {/* Title & Location */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">
                          {property.title}
                        </h1>
                        {property.listingActor?.verified && (
                          <VerifiedOwnerBadge size="sm" showTooltip />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center text-[#666666]">
                          <MapPin className="w-4 h-4 mr-1.5 flex-shrink-0 text-[#029bba]" />
                          <span className="text-sm font-medium">{fullLocation}</span>
                        </div>
                        {property.projectId && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#029bba] to-[#017a8a] text-white text-xs font-semibold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Verified Project Unit
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              {/* ── Trulia-Style Property Highlights Card ─────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#004063] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#029bba]" />
                  Property Highlights
                </h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</p>
                      <p className="text-xs font-bold text-gray-900 truncate">{property.propertyType}</p>
                    </div>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
                      <Maximize className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Area</p>
                      <p className="text-xs font-bold text-gray-900 truncate">{property.area} {property.unit}</p>
                    </div>
                  </div>

                  {property.bedrooms !== undefined && property.bedrooms > 0 && (
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
                        <Bed className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bedrooms</p>
                        <p className="text-xs font-bold text-gray-900 truncate">{property.bedrooms} Bed{property.bedrooms > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  )}

                  {property.bathrooms !== undefined && property.bathrooms > 0 && (
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
                        <Bath className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bathrooms</p>
                        <p className="text-xs font-bold text-gray-900 truncate">{property.bathrooms} Bath{property.bathrooms > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Parking</p>
                      <p className="text-xs font-bold text-gray-900 truncate">{formatParking(property.parking)}</p>
                    </div>
                  </div>

                  {property.possessionStatus && (
                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Possession</p>
                        <p className="text-xs font-bold text-gray-900 truncate">{formatPossession(property.possessionStatus)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Expandable Description (Moved above True Cost) ──────────── */}
              <div
                id="description"
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3"
              >
                <h2 className="text-lg font-bold text-[#004063] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#029bba]" />
                  Property Description
                </h2>

                <div className="relative">
                  <div
                    className={`prose prose-sm max-w-none text-gray-700 leading-relaxed transition-all duration-300 overflow-hidden ${
                      !isDescExpanded ? "max-h-36" : "max-h-none"
                    }`}
                    dangerouslySetInnerHTML={{
                      __html: sanitizeRichHtml(property.description ?? ""),
                    }}
                  />
                  {!isDescExpanded && (property.description?.length ?? 0) > 300 && (
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                  )}
                </div>

                {(property.description?.length ?? 0) > 300 && (
                  <button
                    type="button"
                    onClick={() => setIsDescExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#029bba] hover:text-[#004063] transition-colors pt-2"
                  >
                    <span>{isDescExpanded ? "Show Less" : "Read Full Description"}</span>
                    {isDescExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* ── True Cost ────────────────────────────────────────────── */}
              <div id="true-cost">
                <TrueCostCard
                  loading={trueCostLoading}
                  error={trueCostError}
                  breakdown={trueCostBreakdown}
                />
              </div>

              {/* ── Payment Plan (installment) ────────────────────────────── */}
              {isInstallment && (
                <div id="payment-plan" className="space-y-4">
                  <PaymentTimeline
                    booking={property.booking}
                    downPayment={property.downPayment}
                    installmentPlan={property.installmentPlan}
                    possession={property.possession}
                    totalPrice={property.totalPrice ?? property.price}
                    formatPrice={formatPrice}
                  />

                  {property.projectDetails?.projectName && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <h2 className="text-lg font-semibold text-[#004063] mb-4 flex items-center gap-2">
                        <HardHat className="w-5 h-5 text-[#029bba]" />
                        Project Details
                      </h2>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between p-3 bg-gray-50 rounded-xl">
                          <div>
                            <p className="text-sm font-semibold text-[#333333]">
                              {property.projectDetails.projectName}
                            </p>
                            {property.projectDetails.developerName && (
                              <p className="text-xs text-[#666666] mt-1">
                                By {property.projectDetails.developerName}
                              </p>
                            )}
                          </div>
                          {property.projectDetails.projectStatus && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full capitalize whitespace-nowrap">
                              {String(property.projectDetails.projectStatus).replace(/_/g, " ")}
                            </span>
                          )}
                        </div>

                        {property.projectDetails.developmentProgress !== undefined && (
                          <div className="p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-[#666666]">Development Progress</p>
                              <p className="text-sm font-semibold text-[#333333]">
                                {property.projectDetails.developmentProgress}%
                              </p>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-[#029bba] h-2 rounded-full transition-all"
                                style={{ width: `${property.projectDetails.developmentProgress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          {property.projectDetails.launchDate && (
                            <div className="p-3 bg-gray-50 rounded-xl">
                              <p className="text-xs text-[#666666]">Launch Date</p>
                              <p className="text-sm font-medium text-[#333333]">
                                {formatDate(property.projectDetails.launchDate)}
                              </p>
                            </div>
                          )}
                          {property.projectDetails.expectedCompletionDate && (
                            <div className="p-3 bg-gray-50 rounded-xl">
                              <p className="text-xs text-[#666666]">Expected Completion</p>
                              <p className="text-sm font-medium text-[#333333]">
                                {formatDate(property.projectDetails.expectedCompletionDate)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {(property.approvals?.authority || property.legal?.ownershipType) && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                      <h2 className="text-lg font-semibold text-[#004063] mb-4 flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-[#029bba]" />
                        Legal &amp; Approvals
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {property.approvals?.authority && (
                          <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-[#666666] mb-1">Approval Authority</p>
                            <p className="font-medium text-[#333333] uppercase">
                              {property.approvals.authority}
                            </p>
                          </div>
                        )}
                        {property.legal?.ownershipType && (
                          <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-[#666666] mb-1">Ownership Type</p>
                            <p className="font-medium text-[#333333] capitalize">
                              {String(property.legal.ownershipType).replace(/_/g, " ")}
                            </p>
                          </div>
                        )}
                        {property.isBankFinanceAvailable !== undefined && (
                          <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-[#666666] mb-1">Bank Finance</p>
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              property.isBankFinanceAvailable
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {property.isBankFinanceAvailable ? "Available" : "Not Available"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Charges ───────────────────────────────────────────────── */}
              {!isRent &&
                (trueCostLoading ||
                  !!trueCostBreakdown ||
                  !!property.extraCharges ||
                  !!property.possessionCharges ||
                  !!property.transferCharges ||
                  !!property.governmentTaxes) && (
                  <div
                    id="charges"
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
                  >
                    <h2 className="text-lg font-semibold text-[#004063] mb-1 flex items-center gap-2">
                      <CircleDollarSign className="w-5 h-5 text-[#029bba]" />
                      Charges &amp; Taxes
                    </h2>
                    <p className="text-xs text-[#666666] mb-4">
                      Estimates only — final amounts depend on society/government
                      rules at time of transfer.
                    </p>

                    {trueCostLoading ? (
                      <div className="space-y-2">
                        {[56, 72, 64].map((w) => (
                          <div
                            key={w}
                            className={`h-4 w-${w} bg-gray-100 rounded animate-shimmer`}
                          />
                        ))}
                      </div>
                    ) : trueCostError ? (
                      <div className="p-3 bg-[#fef2f2] border-l-4 border-[#ef4444] text-red-700 text-sm rounded-lg">
                        Unable to load charges: {trueCostError}
                      </div>
                    ) : trueCostBreakdown?.items?.length ? (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-[#333333]">
                          Breakdown (PKR)
                        </div>
                        <div className="divide-y divide-gray-100">
                          {trueCostBreakdown.items
                            .filter((it) => it?.amount && Number(it.amount) > 0)
                            .map((it) => (
                              <div
                                key={it.key}
                                className="px-4 py-3 flex items-start justify-between gap-4"
                              >
                                <div>
                                  <p className="text-sm font-medium text-[#333333]">
                                    {it.label}
                                  </p>
                                  {it.note && (
                                    <p className="text-xs text-[#666666] mt-0.5">
                                      {it.note}
                                    </p>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-[#333333] whitespace-nowrap">
                                  PKR {formatPrice(Number(it.amount))}
                                </p>
                              </div>
                            ))}
                          <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
                            <p className="text-sm font-semibold text-[#333333]">
                              Total Estimated
                            </p>
                            <p className="text-sm font-bold text-[#004063]">
                              PKR {formatPrice(Number(trueCostBreakdown.total))}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#666666]">
                        No detailed charges provided for this listing.
                      </p>
                    )}
                  </div>
                )}

              {/* ── Additional Details (Clean List) ──────────────────────── */}
              {(property.floorNumber !== undefined || property.propertySubtype || property.furnished || property.condition || property.facing || property.ownershipType) && (
                <div id="details" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold text-[#004063] mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-[#029bba]" />
                    Additional Details
                  </h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
                    {property.propertySubtype && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Subtype</span>
                        <span className="text-sm font-semibold text-gray-900">{property.propertySubtype}</span>
                      </div>
                    )}
                    {property.floorNumber !== undefined && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Floor</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {property.floorNumber} {property.totalFloors ? `of ${property.totalFloors}` : ""}
                        </span>
                      </div>
                    )}
                    {property.furnished && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Furnishing</span>
                        <span className="text-sm font-semibold text-gray-900">{formatFurnished(property.furnished)}</span>
                      </div>
                    )}
                    {property.condition && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Condition</span>
                        <span className="text-sm font-semibold text-gray-900">{formatCondition(property.condition)}</span>
                      </div>
                    )}
                    {property.facing && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Facing</span>
                        <span className="text-sm font-semibold text-gray-900">{formatFacing(property.facing)}</span>
                      </div>
                    )}
                    {property.ownershipType && (
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Ownership</span>
                        <span className="text-sm font-semibold text-gray-900">{formatOwnership(property.ownershipType)}</span>
                      </div>
                    )}
                  </div>

                  {isCommercial && (
                    <div className="mt-4 pt-4">
                      <p className="text-xs text-gray-500">
                        * This is a commercial property. Contact the seller for exact frontage, signage rights, and loading dock availability.
                      </p>
                    </div>
                  )}
                </div>
              )}

                {/* ── Location & Embedded Map ─────────────────────────────── */}
                <div
                  id="location"
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
                >
                  <h2 className="text-lg font-semibold text-[#004063] flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#029bba]" />
                    Location &amp; Address
                  </h2>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-[#666666] mb-1">City</p>
                      <p className="font-medium text-[#333333]">{property.city}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-[#666666] mb-1">Society / Scheme</p>
                      <p className="font-medium text-[#333333]">{property.society ?? "N/A"}</p>
                    </div>
                    {property.phase && (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-[#666666] mb-1">Phase</p>
                        <p className="font-medium text-[#333333]">{property.phase}</p>
                      </div>
                    )}
                    {property.block && (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-[#666666] mb-1">Block / Sector</p>
                        <p className="font-medium text-[#333333]">{property.block}</p>
                      </div>
                    )}
                    {property.streetNumber && (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-[#666666] mb-1">Street</p>
                        <p className="font-medium text-[#333333]">{property.streetNumber}</p>
                      </div>
                    )}
                    {property.plotNumber && (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-[#666666] mb-1">Plot</p>
                        <p className="font-medium text-[#333333]">{property.plotNumber}</p>
                      </div>
                    )}
                  </div>

                  {/* Embedded Google Map Frame */}
                  {heroMapUrl && (
                    <div className="rounded-xl overflow-hidden border border-gray-200 h-72 w-full relative shadow-sm">
                      <iframe
                        src={heroMapUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Property Location Map"
                      />
                    </div>
                  )}
                </div>

                {/* ── Nearby Places & Neighborhood ────────────────────────── */}
                {Array.isArray(property.nearbyFacilities) && property.nearbyFacilities.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-[#004063] mb-4 flex items-center gap-2">
                      <Compass className="w-5 h-5 text-[#029bba]" />
                      Nearby Places &amp; Neighborhood
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {property.nearbyFacilities.map((fac, idx) => {
                        const cat = String(fac.category || 'School').toLowerCase();
                        let IconComponent = GraduationCap;
                        if (cat.includes('hospital')) IconComponent = HeartPulse;
                        else if (cat.includes('mall') || cat.includes('market')) IconComponent = ShoppingBag;
                        else if (cat.includes('mosque')) IconComponent = Building;
                        else if (cat.includes('park')) IconComponent = Trees;
                        else if (cat.includes('gym')) IconComponent = Dumbbell;
                        else if (cat.includes('restaurant')) IconComponent = Utensils;
                        else if (cat.includes('bank') || cat.includes('atm')) IconComponent = Landmark;
                        else if (cat.includes('bus') || cat.includes('metro') || cat.includes('transit')) IconComponent = Bus;

                        return (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[#029bba]/10 text-[#029bba] flex items-center justify-center shrink-0">
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">{fac.name}</p>
                                <p className="text-[10px] text-gray-500 capitalize">{fac.category}</p>
                              </div>
                            </div>
                            {fac.distance && (
                              <span className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[#029bba] text-[11px] font-bold shrink-0 ml-2">
                                {fac.distance}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Nearby Landmarks ────────────────────────────────────── */}
                {Array.isArray(property.nearbyLandmarks) && property.nearbyLandmarks.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
                    <h3 className="text-xs font-bold text-[#004063] uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#029bba]" />
                      Nearby Landmarks
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {property.nearbyLandmarks.map((lm) => (
                        <span
                          key={lm}
                          className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
                        >
                          {lm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* ── Amenities ─────────────────────────────────────────────── */}
              {property.amenities?.length && (
                <div
                  id="amenities"
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
                >
                  <h2 className="text-lg font-semibold text-[#004063] mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#029bba]" />
                    Amenities &amp; Features
                  </h2>

                  {(() => {
                    const grouped: Record<
                      AmenityGroup,
                      { id: string; Icon: React.ComponentType<{ className?: string }>; label: string }[]
                    > = {
                      interior: [], exterior: [], building: [],
                      society: [], security: [], other: [],
                    };

                    const humanize = (id: string) => {
                      const s = id.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
                      return s.charAt(0).toUpperCase() + s.slice(1);
                    };

                    property.amenities!.forEach((id) => {
                      const def = AMENITY_ICONS[id];
                      if (def) {
                        grouped[def.group].push({ id, Icon: def.icon, label: def.label });
                      } else {
                        grouped.other.push({ id, Icon: CheckCircle, label: humanize(id) });
                      }
                    });

                    const renderGroup = (key: AmenityGroup, title: string) => {
                      const items = grouped[key];
                      if (!items.length) return null;
                      return (
                        <div className="mb-4" key={key}>
                          <h3 className="text-sm font-semibold text-[#333333] mb-2">{title}</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                            {items.map((item) => (
                              <div
                                key={`${key}-${item.id}`}
                                className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl"
                              >
                                <item.Icon className="w-4 h-4 text-[#029bba] flex-shrink-0" />
                                <span className="text-xs text-[#333333]">{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div>
                        {renderGroup("interior", "Interior")}
                        {renderGroup("exterior", "Exterior")}
                        {renderGroup("building", "Building")}
                        {renderGroup("society", "Society")}
                        {renderGroup("security", "Security")}
                        {renderGroup("other", "Other")}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Description moved above True Cost */}

              {/* ── Video ─────────────────────────────────────────────────── */}
              {videoInfo && (
                <div
                  id="video-section"
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
                >
                  <h2 className="text-lg font-semibold text-[#004063] mb-3 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[#029bba]" />
                    Property Video
                  </h2>
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                    {videoInfo.type === "youtube" ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${videoInfo.id}`}
                        title="Property Video"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <iframe
                        src={`https://player.vimeo.com/video/${videoInfo.id}`}
                        title="Property Video"
                        className="w-full h-full"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    )}
                  </div>
                </div>
              )}

              {/* ── Meta info ─────────────────────────────────────────────── */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#666666]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Listed: {formatDate(property.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {property.views} views
                    </span>
                  </div>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                   ID: {String(property._id ?? '').slice(-8).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* ── Similar Properties ────────────────────────────────────── */}
              <SimilarProperties
                currentProperty={{
                  _id: property._id,
                  city: property.city,
                  propertyType: property.propertyType,
                  listingType: property.listingType,
                }}
              />
            </div>

            {/* ── Right column — Contact ───────────────────────────────────── */}
            <div className="space-y-6" id="contact">
              {/* Contact card */}
              {contactCardNode}

              {/* Safety tips (Project Style) */}
              <div className="bg-[#fffdf0] rounded-2xl border border-[#fef08a] p-5 shadow-sm">
                <h3 className="font-bold text-yellow-800 mb-2.5 flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-yellow-600" />
                  Safety First
                </h3>
                <p className="text-xs text-yellow-800/80 leading-relaxed mb-4">
                  Always visit the property before making any payment. Verify all documents independently. Verification on Highrise.pk does not constitute a legal guarantee.
                </p>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-yellow-200 text-yellow-700 font-bold text-xs hover:bg-yellow-50 transition-colors shadow-sm"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Report This Listing
                </button>
              </div>

            </div>
          </div>
        </div>

{/* ── Mobile Sticky Bar ─────────────────────────────────────────────── */}
<div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
  <div className="bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3">
    <div className="flex items-center justify-between gap-3">

      {/* Price — always visible */}
      <div className="flex-shrink-0">
        <p className="text-xs text-[#666666]">
          {isRent ? "Monthly Rent" : "Price"}
        </p>
        <p className="text-lg font-bold text-[#029bba]">
          PKR {formatPrice(property.totalPrice ?? property.price)}
          {isRent && (
            <span className="text-xs font-normal text-[#666666]">/mo</span>
          )}
        </p>
      </div>

      {/* Buttons — gated by login */}
      <div className="flex items-center gap-2">

        {/* GUEST: show login button only */}
        {!isLoggedIn && (
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#029bba] text-white rounded-xl font-medium text-sm hover:bg-[#027a94] transition-colors"
          >
            <Lock className="w-4 h-4" />
            Login to Contact
          </button>
        )}

        {/* LOGGED IN: show Call + WhatsApp */}
        {isLoggedIn && (
          <>
            {canRevealPhone ? (
              <a
                href={`tel:${phoneValue}`}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#029bba] text-white rounded-xl font-medium text-sm hover:bg-[#017a8a] transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            ) : (
              <button
                onClick={() => {
                  setInquiryLeadType("call_back");
                  setShowInquiryModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#029bba] text-white rounded-xl font-medium text-sm hover:bg-[#017a8a] transition-colors"
              >
                <Phone className="w-4 h-4" />
                Callback
              </button>
            )}

            {canWhatsapp && (() => {
              const msg = `Hi, I'm interested in your property: ${property.title}\n\nLink: ${canonicalUrl}`;
              return (
                <a
                  href={`https://wa.me/${waValue}?text=${encodeURIComponent(msg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl font-medium text-sm hover:bg-[#128C7E] transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              );
            })()}
          </>
        )}

      </div>
    </div>
  </div>
</div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Inquiry */}
      <UniversalInquiryModal
        isOpen={showInquiryModal}
        onClose={() => setShowInquiryModal(false)}
        entityType="property"
        entityId={getCleanPropertyId(property)}
        entityTitle={property.title}
        entityPrice={property.totalPrice ?? property.price}
        entityLocation={fullLocation}
        entityImage={property.images?.[0]?.url}
        developerId={undefined}
        developerName={property.listingActor?.displayName ?? "Property seller"}
        leadType={inquiryLeadType}
        buttonText={
          inquiryLeadType === "site_visit"
            ? "Schedule Visit"
            : inquiryLeadType === "call_back"
            ? "Request Callback"
            : "Send Inquiry"
        }
      />

      {/* Auth modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAuthModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-fadeIn">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-[#666666] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="pt-8">
              <LoginOrSignupForm
                isModal={true}
                context="contact"
                onSuccess={() => {
                  setShowAuthModal(false);
                  if (property) {
                    void revealContact();
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {property && (
        <ReportListingModal
          open={showReportModal}
          onClose={() => setShowReportModal(false)}
          propertyId={getCleanPropertyId(property)}
          reporterUserId={sessionUser?._id ?? sessionUser?.id ?? ""}
          reporterEmail={sessionUser?.email ?? ""}
          reporterPhone=""
        />
      )}

      <PropertyMediaExplorer
        isOpen={explorerOpen}
        onClose={() => setExplorerOpen(false)}
        title={property.title}
        priceDisplay={`PKR ${formatPrice(property.totalPrice ?? property.price)}`}
        locationDisplay={fullLocation}
        images={property.images ?? []}
        videoUrl={property.videoUrl}
        mapEmbedUrl={heroMapUrl}
        initialTab={explorerTab}
        initialPhotoIdx={explorerPhotoIdx}
        contactCard={contactCardNode}
        onShare={handleShare}
        isSaved={isSaved}
        onSave={() => property?._id && void favorites.toggle(property._id, 'property')}
      />

      {/* Aria AI — property context */}
      <AleemWidget
        context={{
          type:         'property',
          id:           property._id,
          slug:         property.slug,
          title:        property.title,
          price:        property.totalPrice ?? property.price,
          city:         property.city,
          propertyType: property.propertyType,
          listingType:  property.listingType,
          area:         `${property.area} ${property.unit}`,
          bedrooms:     property.bedrooms,
          bathrooms:    property.bathrooms,
          society:      property.society,
          canonicalUrl: canonicalUrl,
        }}
      />
    </>
  );
}

// ─── ISR ─────────────────────────────────────────────────────────────────────

export const getStaticPaths: GetStaticPaths = async () => {
  return { paths: [], fallback: "blocking" };
};

// ─── ObjectId detection helper ──────────────────────────────────────────────
// Legacy URLs may pass a 24-char Mongo ObjectId in place of a slug.
// We detect this and 301-redirect to the canonical /property/[slug] URL.
function isMongoObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}

export const getStaticProps: GetStaticProps<PageProps> = async ({ params }) => {
  const slug = params?.slug;
  if (!slug || typeof slug !== "string") return { notFound: true };

  try {
    const { getPublicPropertyBySlug } = await import("@/lib/property/propertyService");
    const result = await getPublicPropertyBySlug(slug);
    if (!result?.property) return { notFound: true };
    const property = JSON.parse(JSON.stringify(result.property)) as Property;

    // Legacy ObjectId URLs permanently redirect to the canonical slug when available.
    if (isMongoObjectId(slug) && property.slug && property.slug !== slug) {
      return {
        redirect: {
          destination: `/property/${encodeURIComponent(property.slug)}`,
          permanent: true,
        },
      };
    }

    return { props: { initialProperty: property }, revalidate: 60 };
  } catch {
    return { notFound: true };
  }
};
