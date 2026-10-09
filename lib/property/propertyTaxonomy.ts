//C:\dev\highrise-pk\lib\property\propertyTaxonomy.ts
export type CanonicalPropertyType =
  | 'apartment'
  | 'house'
  | 'villa'
  | 'plot'
  | 'commercial'
  | 'shop'
  | 'office'
  | 'warehouse'
  | 'building'
  | 'penthouse'
  | 'farmhouse'
  | 'room'
  | 'other';

export type PropertyDiscoveryGroup = 'residential' | 'commercial' | 'plots';

export const PROPERTY_TYPE_LABELS: Readonly<Record<CanonicalPropertyType, string>> = {
  apartment: 'Apartment / Flat',
  house: 'House',
  villa: 'Villa',
  plot: 'Plot',
  commercial: 'Commercial Unit',
  shop: 'Shop',
  office: 'Office',
  warehouse: 'Warehouse / Factory',
  building: 'Whole Building',
  penthouse: 'Penthouse',
  farmhouse: 'Farm House',
  room: 'Room / PG',
  other: 'Agricultural / Other',
};

export const PROPERTY_DISCOVERY_TYPES: Readonly<Record<PropertyDiscoveryGroup, readonly CanonicalPropertyType[]>> = {
  residential: ['house', 'apartment', 'villa', 'penthouse', 'room', 'farmhouse'],
  commercial: ['shop', 'office', 'warehouse', 'building', 'commercial'],
  plots: ['plot', 'other'],
};

export const PROPERTY_SUBTYPES: Readonly<Partial<Record<CanonicalPropertyType, readonly string[]>>> = {
  house: ['house', 'bungalow', 'kothi', 'twin_house', 'corner_house', 'row_house'],
  villa: ['villa', 'luxury_villa', 'farm_villa', 'beach_villa'],
  apartment: ['studio', '1_bed', '2_bed', '3_bed', '4_bed_plus', 'flat', 'duplex', 'service_apt'],
  penthouse: ['penthouse', 'duplex_penthouse', 'sky_villa'],
  room: ['single_room', 'double_room', 'pg_room', 'hostel_bed', 'shared_room'],
  plot: ['residential_plot', 'commercial_plot', 'industrial_plot', 'boulevard_plot', 'corner_plot', 'park_facing_plot', 'affidavit_plot', 'mosque_plot', 'school_plot', 'university_plot', 'hospital_plot', 'government_plot', 'graveyard_plot', 'park_plot', 'fuel_station_plot', 'telecom_plot'],
  shop: ['retail_shop', 'showroom', 'food_stall', 'kiosk', 'clinic_unit', 'atm_space', 'billboard_space', 'kiosk_counter'],
  office: ['single_office', 'office_suite', 'full_floor', 'coworking', 'corporate', 'virtual_office'],
  warehouse: ['warehouse', 'factory', 'industrial_unit', 'cold_storage', 'workshop', 'factory_shed', 'warehouse_shed', 'workshop_garage', 'self_storage'],
  building: ['residential_building', 'commercial_building', 'mixed_use', 'plaza', 'hotel_building'],
  farmhouse: ['farmhouse', 'farm_villa', 'country_house', 'guest_house'],
  other: ['agricultural_land', 'orchard', 'fishpond', 'poultry_farm', 'dairy_farm', 'livestock_grazing', 'solar_rooftop', 'mobile_tower_space', 'temporary_land', 'other'],
  commercial: ['commercial_unit', 'plaza_unit', 'mixed_use_unit'],
};

const TYPE_ALIASES: Readonly<Record<string, CanonicalPropertyType>> = {
  flat: 'apartment',
  apartment: 'apartment',
  apartments: 'apartment',
  home: 'house',
  homes: 'house',
  house: 'house',
  houses: 'house',
  upper_portion: 'house',
  lower_portion: 'house',
  villa: 'villa',
  villas: 'villa',
  penthouse: 'penthouse',
  penthouses: 'penthouse',
  room: 'room',
  rooms: 'room',
  pg: 'room',
  plot: 'plot',
  plots: 'plot',
  land: 'plot',
  residential_plot: 'plot',
  commercial_plot: 'plot',
  industrial_land: 'plot',
  agricultural_land: 'plot',
  plot_file: 'plot',
  shop: 'shop',
  shops: 'shop',
  office: 'office',
  offices: 'office',
  warehouse: 'warehouse',
  warehouses: 'warehouse',
  factory: 'warehouse',
  building: 'building',
  buildings: 'building',
  plaza: 'building',
  commercial: 'commercial',
  farmhouse: 'farmhouse',
  farm_house: 'farmhouse',
  'farm-house': 'farmhouse',
  agricultural: 'other',
  agriculture: 'other',
  other: 'other',
};

export function normalizePropertyType(value: unknown): CanonicalPropertyType | null {
  const key = String(value ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  if (!key) return null;
  if (key in TYPE_ALIASES) return TYPE_ALIASES[key];
  return (Object.keys(PROPERTY_TYPE_LABELS) as CanonicalPropertyType[]).includes(key as CanonicalPropertyType)
    ? key as CanonicalPropertyType
    : null;
}

export function normalizePropertySubtype(type: CanonicalPropertyType | null, value: unknown): string | null {
  const subtype = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!subtype) return null;
  if (!type) return null;
  const allowed = PROPERTY_SUBTYPES[type];
  if (!allowed) return null;
  return allowed.includes(subtype) ? subtype : null;
}

export function discoveryGroupForType(type: CanonicalPropertyType | null): PropertyDiscoveryGroup | null {
  if (!type) return null;
  for (const group of Object.keys(PROPERTY_DISCOVERY_TYPES) as PropertyDiscoveryGroup[]) {
    if (PROPERTY_DISCOVERY_TYPES[group].includes(type)) return group;
  }
  return null;
}

export function normalizeDiscoveryGroup(value: unknown): PropertyDiscoveryGroup | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'residential') return 'residential';
  if (raw === 'commercial') return 'commercial';
  if (raw === 'plot' || raw === 'plots' || raw === 'land') return 'plots';
  return null;
}

export function parsePropertyTypeList(value: unknown): CanonicalPropertyType[] {
  const raw = Array.isArray(value) ? value : String(value ?? '').split(',');
  const out: CanonicalPropertyType[] = [];
  for (const item of raw) {
    const type = normalizePropertyType(item);
    if (type && !out.includes(type)) out.push(type);
  }
  return out;
}

export function propertyTypesForDiscoveryGroup(group: PropertyDiscoveryGroup): CanonicalPropertyType[] {
  return [...PROPERTY_DISCOVERY_TYPES[group]];
}
