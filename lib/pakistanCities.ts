// Canonical Pakistani city directory (shared source of truth).
// Consumers: header mega-menus, HeroSearch, /api/cities, /cities directory,
// pages/properties, pages/projects, pages/societies, pages/agents.

export type CityProvince =
  | "Federal"
  | "Punjab"
  | "Sindh"
  | "Khyber Pakhtunkhwa"
  | "Balochistan"
  | "Azad Kashmir"
  | "Gilgit-Baltistan";

export interface PakistaniCityMeta {
  name: string;
  province: CityProvince;
  aliases?: string[];
  popular: boolean;
  provinceCapital: boolean;
  tagline?: string;
  description?: string;
  landmark?: { title: string; kicker: string };
}

export const PAKISTAN_CITIES_META: readonly PakistaniCityMeta[] = [
  // ── Federal ─────────────────────────────────────────────────────────────
  {
    name: "Islamabad",
    province: "Federal",
    aliases: ["islamabad capital territory", "ict islamabad", "islamabad city"],
    popular: true,
    provinceCapital: false,
    tagline: "The Capital",
    description:
      "Planned sectors, Margalla-backed housing and embassy-zone apartments.",
    landmark: { title: "Faisal Mosque", kicker: "Islamabad" },
  },
  {
    name: "Rawalpindi",
    province: "Punjab",
    aliases: ["pindi", "rawalpindi city"],
    popular: true,
    provinceCapital: false,
    tagline: "The Twin City",
    description:
      "Twin-city plots, old-city bazaars and cantonment housing next door to Islamabad.",
    landmark: { title: "Rawat Fort", kicker: "Rawalpindi" },
  },

  // ── Punjab ──────────────────────────────────────────────────────────────
  {
    name: "Lahore",
    province: "Punjab",
    aliases: ["lahore city"],
    popular: true,
    provinceCapital: true,
    tagline: "City of Gardens",
    description:
      "Heritage bazaars to DHA boulevards — Pakistan's cultural capital.",
    landmark: { title: "Badshahi Mosque", kicker: "Lahore" },
  },
  { name: "Faisalabad", province: "Punjab", aliases: ["lyallpur"], popular: true, provinceCapital: false, tagline: "Industrial Hub", description: "Textile capital with emerging mid-rise apartment supply." },
  { name: "Multan", province: "Punjab", aliases: ["city of saints"], popular: true, provinceCapital: false, tagline: "City of Saints", description: "Sufi heritage city with fast-growing southern suburbs." },
  { name: "Gujranwala", province: "Punjab", popular: true, provinceCapital: false, description: "Industrial corridor city between Lahore and Sialkot." },
  { name: "Sialkot", province: "Punjab", popular: true, provinceCapital: false, description: "Export-driven city with strong residential demand." },
  { name: "Bahawalpur", province: "Punjab", popular: true, provinceCapital: false, description: "Southern Punjab's princely-state capital." },
  { name: "Sargodha", province: "Punjab", popular: true, provinceCapital: false },
  { name: "Sukkur", province: "Sindh", popular: true, provinceCapital: false },
  { name: "Larkana", province: "Sindh", popular: true, provinceCapital: false },
  { name: "Sheikhupura", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Jhang", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Chiniot", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Gujrat", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Jhelum", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Kasur", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Okara", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Sahiwal", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Rahim Yar Khan", province: "Punjab", aliases: ["ryk"], popular: false, provinceCapital: false },
  { name: "Dera Ghazi Khan", province: "Punjab", aliases: ["d g khan", "dg khan"], popular: false, provinceCapital: false },
  { name: "Wah Cantonment", province: "Punjab", aliases: ["wah cantt", "wah"], popular: false, provinceCapital: false },
  { name: "Taxila", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Murree", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Attock", province: "Punjab", aliases: ["campbellpur"], popular: false, provinceCapital: false },
  { name: "Vehari", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Khanewal", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Muzaffargarh", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Layyah", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Pakpattan", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Toba Tek Singh", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Mandi Bahauddin", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Bahawalnagar", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Hafizabad", province: "Punjab", popular: false, provinceCapital: false },
  { name: "Narowal", province: "Punjab", popular: false, provinceCapital: false },

  // ── Sindh ───────────────────────────────────────────────────────────────
  {
    name: "Karachi",
    province: "Sindh",
    aliases: ["karachi city", "city of lights"],
    popular: true,
    provinceCapital: true,
    tagline: "City of Lights",
    description:
      "Seafront high-rises and commercial corridors in Pakistan's financial hub.",
    landmark: { title: "Mazar-e-Quaid", kicker: "Karachi" },
  },
  { name: "Hyderabad", province: "Sindh", popular: true, provinceCapital: false },
  { name: "Nawabshah", province: "Sindh", aliases: ["shaheed benazirabad"], popular: false, provinceCapital: false },
  { name: "Mirpur Khas", province: "Sindh", popular: false, provinceCapital: false },
  { name: "Khairpur", province: "Sindh", popular: false, provinceCapital: false },
  { name: "Jacobabad", province: "Sindh", popular: false, provinceCapital: false },
  { name: "Thatta", province: "Sindh", popular: false, provinceCapital: false },
  { name: "Ghotki", province: "Sindh", popular: false, provinceCapital: false },
  { name: "Matiari", province: "Sindh", popular: false, provinceCapital: false },

  // ── Khyber Pakhtunkhwa ──────────────────────────────────────────────────
  {
    name: "Peshawar",
    province: "Khyber Pakhtunkhwa",
    aliases: ["peshawar city"],
    popular: true,
    provinceCapital: true,
    tagline: "Gateway to KPK",
    description: "Frontier heritage city with expanding Regi Model Town supply.",
  },
  { name: "Abbottabad", province: "Khyber Pakhtunkhwa", popular: false, provinceCapital: false },
  { name: "Mardan", province: "Khyber Pakhtunkhwa", popular: false, provinceCapital: false },
  { name: "Mingora", province: "Khyber Pakhtunkhwa", aliases: ["mingora swat", "swat"], popular: false, provinceCapital: false },
  { name: "Swabi", province: "Khyber Pakhtunkhwa", popular: false, provinceCapital: false },
  { name: "Kohat", province: "Khyber Pakhtunkhwa", popular: false, provinceCapital: false },
  { name: "Bannu", province: "Khyber Pakhtunkhwa", popular: false, provinceCapital: false },
  { name: "Dera Ismail Khan", province: "Khyber Pakhtunkhwa", aliases: ["d i khan", "di khan"], popular: false, provinceCapital: false },
  { name: "Mansehra", province: "Khyber Pakhtunkhwa", popular: false, provinceCapital: false },
  { name: "Haripur", province: "Khyber Pakhtunkhwa", popular: false, provinceCapital: false },
  { name: "Charsadda", province: "Khyber Pakhtunkhwa", popular: false, provinceCapital: false },
  { name: "Nowshera", province: "Khyber Pakhtunkhwa", popular: false, provinceCapital: false },
  { name: "Batkhela", province: "Khyber Pakhtunkhwa", aliases: ["malakand"], popular: false, provinceCapital: false },

  // ── Balochistan ─────────────────────────────────────────────────────────
  {
    name: "Quetta",
    province: "Balochistan",
    popular: true,
    provinceCapital: true,
    tagline: "Fruit Garden of Pakistan",
    description: "High-altitude capital with established plot-and-house market.",
  },
  { name: "Gwadar", province: "Balochistan", popular: false, provinceCapital: false },
  { name: "Turbat", province: "Balochistan", aliases: ["kech"], popular: false, provinceCapital: false },
  { name: "Khuzdar", province: "Balochistan", popular: false, provinceCapital: false },
  { name: "Chaman", province: "Balochistan", popular: false, provinceCapital: false },
  { name: "Sibi", province: "Balochistan", popular: false, provinceCapital: false },
  { name: "Lasbela", province: "Balochistan", aliases: ["hub", "hub balochistan"], popular: false, provinceCapital: false },

  // ── Azad Kashmir ────────────────────────────────────────────────────────
  { name: "Muzaffarabad", province: "Azad Kashmir", popular: false, provinceCapital: true },
  { name: "Mirpur", province: "Azad Kashmir", aliases: ["mirpur ajk", "new mirpur"], popular: false, provinceCapital: false },
  { name: "Kotli", province: "Azad Kashmir", popular: false, provinceCapital: false },
  { name: "Bhimber", province: "Azad Kashmir", popular: false, provinceCapital: false },
  { name: "Bagh", province: "Azad Kashmir", popular: false, provinceCapital: false },
  { name: "Rawalakot", province: "Azad Kashmir", popular: false, provinceCapital: false },

  // ── Gilgit-Baltistan ────────────────────────────────────────────────────
  { name: "Gilgit", province: "Gilgit-Baltistan", popular: false, provinceCapital: true },
  { name: "Skardu", province: "Gilgit-Baltistan", popular: false, provinceCapital: false },
  { name: "Hunza", province: "Gilgit-Baltistan", aliases: ["karimabad", "hunza valley"], popular: false, provinceCapital: false },
  { name: "Astore", province: "Gilgit-Baltistan", popular: false, provinceCapital: false },
];

export const PAKISTAN_CITIES: string[] = PAKISTAN_CITIES_META.map((c) => c.name);

export const POPULAR_CITIES: string[] = PAKISTAN_CITIES_META
  .filter((c) => c.popular)
  .map((c) => c.name);

export const CURATED_CITY_NAMES = ["Islamabad", "Lahore", "Karachi", "Rawalpindi"] as const;

/**
 * The four city shortcuts shown inside the header mega menus and the mobile
 * drawer. Deliberately short: a compact menu only has room for a handful of
 * city rows before it stops reading as a menu. This is a *navigation* list
 * only — every other city stays in PAKISTAN_CITIES, the filters, the search
 * results, the /cities directory and the SEO landing pages. Each menu links to
 * /cities for the full directory.
 */
export const MEGA_MENU_CITIES: string[] = [
  "Islamabad",
  "Rawalpindi",
  "Lahore",
  "Karachi",
];

/**
 * Cities the homepage always shows in "Explore Properties by Major Cities",
 * even when the database has no listings for them yet. The carousel merges
 * these with whatever the API returns, so the section never collapses to
 * three cards just because only three cities have stock today.
 */
export const HOMEPAGE_CITY_NAMES: string[] = [
  "Islamabad",
  "Lahore",
  "Karachi",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
];

export const CITY_PROVINCES: CityProvince[] = [
  "Federal",
  "Punjab",
  "Sindh",
  "Khyber Pakhtunkhwa",
  "Balochistan",
  "Azad Kashmir",
  "Gilgit-Baltistan",
];

const canonicalByName = new Map<string, string>();
const aliasesByName = new Map<string, string[]>();
for (const meta of PAKISTAN_CITIES_META) {
  canonicalByName.set(meta.name.toLowerCase(), meta.name);
  for (const alias of meta.aliases ?? []) {
    canonicalByName.set(alias, meta.name);
  }
  aliasesByName.set(meta.name.toLowerCase(), meta.aliases ?? []);
}

export function cityKey(name: string): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

export function getCityMeta(name: string): PakistaniCityMeta | null {
  const key = cityKey(name);
  if (!key) return null;
  const canonical = canonicalByName.get(key);
  if (!canonical) return null;
  return PAKISTAN_CITIES_META.find((c) => c.name === canonical) ?? null;
}

export function normalizeCityName(input: unknown): string | null {
  const meta = typeof input === "string" ? getCityMeta(input) : null;
  return meta ? meta.name : null;
}

export function cityAliases(name: string): string[] {
  const meta = getCityMeta(name);
  if (!meta) return [];
  return aliasesByName.get(meta.name.toLowerCase()) ?? [];
}

export function isKnownCity(name: string): boolean {
  return canonicalByName.has(cityKey(name));
}
