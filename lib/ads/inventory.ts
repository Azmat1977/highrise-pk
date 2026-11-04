"use client";

// Ad inventory gate (interim, pre Phase 4).
//
// No DB-backed ad inventory exists yet, so no slots are configured.
// The previous version shipped four mock slots and a hasAd() gate driven by
// Math.random() (geo, device, and revenue). That gate gave different answers on
// server and client, and the mock slots made placeholder markup reachable on
// public pages. Phase 4 replaces DEFAULT_INVENTORY with records from the
// PropertyAd model. Do not add mock or hardcoded slots here.

interface AdSlot {
  id: string;
  variant: string;
  className?: string;
  position: 'sidebar' | 'infeed' | 'banner' | 'inline' | 'footer';
  targetAudience?: string[];
  maxViews?: number;
  maxClicks?: number;
  daypart?: 'morning' | 'afternoon' | 'evening' | 'night' | 'all';
  geo?: ('PK' | 'LHR' | 'ISB' | 'KHI' | 'MUB')[];
  device?: 'mobile' | 'tablet' | 'desktop' | 'all';
  minRevenue?: number;
  requiresAuth?: boolean;
  pacing?: 'session' | 'daily' | 'weekly' | 'lifetime';
  smartPricing?: boolean;
  priority?: number;
  weight?: number;
  scheduleStart?: string;
  scheduleEnd?: string;
  conditions?: Record<string, unknown>;
}

interface InventoryConfig {
  slots: AdSlot[];
  isEnabled: boolean;
  revenueTarget: number;
  fillRateTarget: number;
  frequencyCapping: boolean;
  geoTargetingEnabled: boolean;
  vendor: 'google-ad-manager' | 'google-ads' | 'meta' | 'appnexus' | 'custom';
  integrationKey?: string;
  refreshIntervalMs?: number;
}

const DEFAULT_INVENTORY: InventoryConfig = {
  slots: [],
  isEnabled: false,
  revenueTarget: 0,
  fillRateTarget: 0,
  frequencyCapping: false,
  geoTargetingEnabled: false,
  vendor: 'custom',
};

function getSlotConfig(slotId: string): AdSlot | null {
  const slot = DEFAULT_INVENTORY.slots.find((s) => s.id === slotId);
  return slot || null;
}

function hasAd(slotId: string): boolean {
  if (!DEFAULT_INVENTORY.isEnabled) return false;
  return getSlotConfig(slotId) !== null;
}

export { hasAd, getSlotConfig, type AdSlot, type InventoryConfig };