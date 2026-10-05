// File: components/property-detail/propertyDetailUtils.ts
// Shared utilities, formatters, and amenity icon configurations for Property Detail

import React from "react";
import {
  Building,
  Layers,
  DoorOpen,
  User,
  Warehouse,
  ChefHat,
  Zap,
  Dumbbell,
  Droplets,
  Users,
  Eye,
  ShieldCheck,
  Phone,
  Car,
  Megaphone,
  Store,
  Wind,
  Truck,
  AlertCircle,
  Lock,
  Snowflake,
  Flame,
  Utensils,
  Navigation,
  Sparkles,
  Thermometer,
  Home,
  Trees,
  GraduationCap,
  Stethoscope,
  ShoppingBag,
} from "lucide-react";

export type AmenityGroup =
  | "interior"
  | "exterior"
  | "building"
  | "society"
  | "security"
  | "other";

export interface AmenityDef {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  group: AmenityGroup;
}

export const AMENITY_ICONS: Record<string, AmenityDef> = {
  // Residential Keys
  balcony: { icon: DoorOpen, label: "Balcony", group: "interior" },
  servant_quarter: { icon: User, label: "Servant Quarter", group: "interior" },
  store_room: { icon: Warehouse, label: "Store Room", group: "interior" },
  laundry: { icon: Warehouse, label: "Laundry Room", group: "interior" },
  modular_kitchen: { icon: ChefHat, label: "Modular Kitchen", group: "interior" },
  lift: { icon: Building, label: "Lift / Elevator", group: "building" },
  backup_generator: { icon: Zap, label: "Backup Generator", group: "building" },
  gym: { icon: Dumbbell, label: "Gym", group: "building" },
  swimming_pool: { icon: Droplets, label: "Swimming Pool", group: "exterior" },
  community_hall: { icon: Users, label: "Community Hall", group: "building" },
  kids_play_area: { icon: Users, label: "Kids Play Area", group: "building" },
  rooftop_access: { icon: Layers, label: "Rooftop Access", group: "exterior" },
  cctv: { icon: Eye, label: "CCTV Security", group: "security" },
  security_guard: { icon: ShieldCheck, label: "24/7 Security", group: "security" },
  intercom: { icon: Phone, label: "Intercom", group: "interior" },
  reserved_parking: { icon: Car, label: "Reserved Parking", group: "exterior" },
  visitor_parking: { icon: Car, label: "Visitor Parking", group: "exterior" },

  // Commercial Keys
  front_signage: { icon: Megaphone, label: "Front Signage", group: "exterior" },
  display_window: { icon: Store, label: "Display Window", group: "interior" },
  reception: { icon: Users, label: "Reception Area", group: "interior" },
  meeting_room: { icon: Users, label: "Meeting Room", group: "interior" },
  central_ac: { icon: Wind, label: "Central AC", group: "building" },
  split_ac: { icon: Wind, label: "Split AC", group: "interior" },
  backup_power: { icon: Zap, label: "Backup Power", group: "building" },
  internet_ready: { icon: Zap, label: "Internet Ready", group: "interior" },
  lift_access: { icon: Building, label: "Lift Access", group: "building" },
  loading_dock: { icon: Truck, label: "Loading Dock", group: "exterior" },
  fire_safety: { icon: AlertCircle, label: "Fire Safety System", group: "building" },
  access_control: { icon: Lock, label: "Access Control", group: "security" },

  // Food Court / Restaurant
  commercial_kitchen: { icon: ChefHat, label: "Commercial Kitchen", group: "interior" },
  exhaust_system: { icon: Wind, label: "Exhaust System", group: "interior" },
  grease_trap: { icon: Droplets, label: "Grease Trap", group: "interior" },
  cold_storage: { icon: Snowflake, label: "Cold Storage", group: "interior" },
  gas_connection: { icon: Flame, label: "Gas Connection", group: "building" },
  outdoor_seating: { icon: Utensils, label: "Outdoor Seating", group: "exterior" },
  delivery_bay: { icon: Truck, label: "Delivery Bay", group: "exterior" },

  // Plot / Land
  electricity: { icon: Zap, label: "Electricity Available", group: "building" },
  sui_gas: { icon: Flame, label: "Sui Gas Available", group: "building" },
  water: { icon: Droplets, label: "Water Connection", group: "building" },
  sewerage: { icon: Warehouse, label: "Sewerage Line", group: "building" },
  boundary_wall: { icon: ShieldCheck, label: "Boundary Wall", group: "exterior" },
  main_gate: { icon: Lock, label: "Main Gate", group: "exterior" },
  paved_road: { icon: Navigation, label: "Paved Road Access", group: "society" },
  corner: { icon: Sparkles, label: "Corner Plot", group: "exterior" },

  // Legacy Fallbacks
  centralHeating: { icon: Thermometer, label: "Central Heating", group: "interior" },
  smartHome: { icon: Home, label: "Smart Home", group: "interior" },
  doubleGlazedWindows: { icon: Layers, label: "Double-Glazed Windows", group: "interior" },
  laundry_room: { icon: Warehouse, label: "Laundry Room", group: "interior" },
  boundaryWall: { icon: ShieldCheck, label: "Boundary Wall", group: "exterior" },
  garden: { icon: Trees, label: "Garden", group: "exterior" },
  swimmingPool: { icon: Droplets, label: "Swimming Pool", group: "exterior" },
  terrace: { icon: Layers, label: "Terrace", group: "exterior" },
  lawn_garden: { icon: Trees, label: "Lawn / Garden", group: "exterior" },
  elevator: { icon: Building, label: "Elevator / Lift", group: "building" },
  generator: { icon: Zap, label: "Generator / Backup", group: "building" },
  prayerRoom: { icon: Building, label: "Prayer Room", group: "building" },
  water_supply: { icon: Droplets, label: "Water Supply", group: "building" },
  solar_panels: { icon: Zap, label: "Solar Panels", group: "building" },
  central_heating: { icon: Thermometer, label: "Central Heating", group: "interior" },
  mosque: { icon: Building, label: "Mosque", group: "society" },
  school: { icon: GraduationCap, label: "School", group: "society" },
  hospital: { icon: Stethoscope, label: "Hospital", group: "society" },
  shoppingMall: { icon: ShoppingBag, label: "Shopping Mall", group: "society" },
  parks: { icon: Trees, label: "Parks", group: "society" },
  sportsFacilities: { icon: Dumbbell, label: "Sports Facilities", group: "society" },
  joggingTrack: { icon: Users, label: "Jogging Track", group: "society" },
  communityCenter: { icon: Users, label: "Community Center", group: "society" },
  gatedEntry: { icon: ShieldCheck, label: "Gated Entry", group: "security" },
  securityGuards24x7: { icon: ShieldCheck, label: "24/7 Security", group: "security" },
  cctvCameras: { icon: Eye, label: "CCTV Cameras", group: "security" },
  intercomSystem: { icon: Phone, label: "Intercom System", group: "security" },
  smartLock: { icon: Lock, label: "Smart Lock", group: "security" },
  panicButton: { icon: AlertCircle, label: "Panic Button", group: "security" },
  gated_community: { icon: ShieldCheck, label: "Gated Community", group: "security" },
};

export const stripHtml = (html: string): string =>
  (html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+(>|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const truncate = (s: string, n: number): string =>
  s.length > n ? s.slice(0, n - 1).trimEnd() + "..." : s;

export const sanitizeRichHtml = (html: string): string => {
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

export const normalizePkMobile = (raw: string): string => {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("92") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length >= 11)
    return `92${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("3")) return `92${digits}`;
  return digits;
};

export const getOptimizedImageUrl = (url: string, width = 800): string => {
  if (!url || !url.includes("cloudinary.com") || !url.includes("/upload/"))
    return url;
  const base = `f_auto,q_auto,w_${width}`;
  const wm =
    "l_highrise_logo,o_40,w_0.15,fl_relative,g_south_east,x_45,y_45";
  return url.replace("/upload/", `/upload/${base}/${wm}/`);
};

export const getThumbnailUrl = (url: string): string => {
  if (!url || !url.includes("cloudinary.com") || !url.includes("/upload/"))
    return url;
  const base = "w_150,h_100,c_fill,q_auto,f_auto";
  const wm =
    "l_highrise_logo,o_40,w_0.14,fl_relative,g_south_east,x_25,y_25";
  return url.replace("/upload/", `/upload/${base}/${wm}/`);
};

export const formatPrice = (price: number): string => {
  const p = typeof price === "number" && !isNaN(price) ? price : 0;
  if (p >= 10_000_000) return `${(p / 10_000_000).toFixed(2)} Crore`;
  if (p >= 100_000) return `${(p / 100_000).toFixed(2)} Lac`;
  return p.toLocaleString("en-PK");
};

export const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export const formatFurnished = (value?: string): string => {
  const map: Record<string, string> = {
    unfurnished: "Unfurnished",
    semi_furnished: "Semi-Furnished",
    fully_furnished: "Fully Furnished",
  };
  return map[value ?? ""] ?? value ?? "N/A";
};

export const formatCondition = (value?: string): string => {
  const map: Record<string, string> = {
    brand_new: "Brand New",
    excellent: "Excellent",
    good: "Good",
    needs_renovation: "Needs Renovation",
  };
  return map[value ?? ""] ?? value ?? "N/A";
};

export const formatFacing = (value?: string): string => {
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

export const formatPossession = (value?: string): string => {
  const map: Record<string, string> = {
    ready: "Ready to Move",
    under_construction: "Under Construction",
    on_handover: "On Handover",
  };
  return map[value ?? ""] ?? value ?? "N/A";
};

export const formatOwnership = (value?: string): string => {
  const map: Record<string, string> = {
    freehold: "Freehold",
    leasehold: "Leasehold",
    power_of_attorney: "Power of Attorney",
  };
  return map[value ?? ""] ?? value ?? "N/A";
};

export const formatParking = (value?: string | number): string => {
  if (value === undefined || value === null) return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const str = String(value);
  if (str === "0") return "No Parking";
  if (str === "4+") return "4+ Cars";
  if (str) return `${str} Car${Number(str) > 1 ? "s" : ""}`;
  return "N/A";
};

export const getListingTypeBadge = (type: string): string => {
  const map: Record<string, string> = {
    full_payment: "For Sale",
    installment: "Installment",
    rent: "For Rent",
    pre_launch: "Pre-Launch",
  };
  return map[type] ?? "For Sale";
};

export const extractVideoId = (
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