import { PropertyPurpose } from '../types/index.ts';

export interface RecentSearchCriteria {
  id: string;
  timestamp: number;
  label: string;
  purpose: PropertyPurpose | 'project';
  city: string;
  area?: string;
  category?: string;
  categoryLabel?: string;
  maxPrice?: string;
  maxPriceLabel?: string;
  minPrice?: string;
  bedrooms?: string;
  status?: string;
  ownerOnly?: boolean;
  url: string;
  isPreset?: boolean;
}

const STORAGE_KEY = 'highrise_recent_searches_v1';
export const RECENT_SEARCHES_EVENT = 'highrise_recent_searches_updated';

// Realistic sample recent searches reflecting top property queries in Pakistan
export const DEFAULT_SUGGESTED_SEARCHES: RecentSearchCriteria[] = [
  {
    id: 'rec-1',
    timestamp: Date.now() - 1000 * 60 * 35, // 35 mins ago
    label: 'Buy • 10 Marla House in Islamabad (F-10 / F-11)',
    purpose: 'buy',
    city: 'Islamabad',
    area: 'F-10',
    category: 'house',
    categoryLabel: 'Houses & Villas',
    maxPrice: '80000000',
    maxPriceLabel: 'Up to 8 Crore',
    bedrooms: '4',
    url: '/properties?purpose=buy&city=Islamabad&area=F-10&category=house&maxPrice=80000000',
    isPreset: true,
  },
  {
    id: 'rec-2',
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    label: 'Rent • 3 Bed Luxury Apartment in Clifton, Karachi',
    purpose: 'rent',
    city: 'Karachi',
    area: 'Clifton',
    category: 'apartment',
    categoryLabel: 'Apartments',
    maxPrice: '300000',
    maxPriceLabel: 'Up to 3 Lakh/mo',
    bedrooms: '3',
    url: '/properties?purpose=rent&city=Karachi&area=Clifton&category=apartment&maxPrice=300000',
    isPreset: true,
  },
  {
    id: 'rec-3',
    timestamp: Date.now() - 1000 * 60 * 60 * 18, // 18 hours ago
    label: 'Buy • 1 Kanal Residential Plot in DHA Lahore',
    purpose: 'buy',
    city: 'Lahore',
    area: 'DHA Phase 6',
    category: 'residential-plot',
    categoryLabel: 'Residential Plots',
    maxPrice: '65000000',
    maxPriceLabel: 'Up to 6.5 Crore',
    url: '/properties?purpose=buy&city=Lahore&area=DHA%20Phase%206&category=residential-plot&maxPrice=65000000',
    isPreset: true,
  },
  {
    id: 'rec-4',
    timestamp: Date.now() - 1000 * 60 * 60 * 48, // 2 days ago
    label: 'Projects • Mixed-Use Towers in Rawalpindi / Islamabad',
    purpose: 'project',
    city: 'Islamabad',
    category: 'mixed-use',
    categoryLabel: 'Mixed-Use Towers',
    status: 'under-construction',
    url: '/projects?city=Islamabad&category=mixed-use&status=under-construction',
    isPreset: true,
  },
];

/**
 * Retrieve saved searches from localStorage, or return the default suggested list if none.
 */
export const getRecentSearches = (): RecentSearchCriteria[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with default initial list so users can immediately test revisiting
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUGGESTED_SEARCHES));
      return DEFAULT_SUGGESTED_SEARCHES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to read recent searches from localStorage', err);
    return DEFAULT_SUGGESTED_SEARCHES;
  }
};

/**
 * Format price number into concise Pakistani Rupees (Lakh / Crore)
 */
export const formatPakistaniPrice = (priceVal: string | number): string => {
  const num = typeof priceVal === 'string' ? parseFloat(priceVal) : priceVal;
  if (isNaN(num) || num <= 0) return '';
  if (num >= 10000000) {
    const cr = num / 10000000;
    return `PKR ${cr % 1 === 0 ? cr : cr.toFixed(2)} Crore`;
  }
  if (num >= 100000) {
    const lac = num / 100000;
    return `PKR ${lac % 1 === 0 ? lac : lac.toFixed(2)} Lakh`;
  }
  return `PKR ${num.toLocaleString()}`;
};

/**
 * Construct user-friendly label for a search
 */
export const buildSearchLabel = (item: {
  purpose: PropertyPurpose | 'project';
  city: string;
  area?: string;
  category?: string;
  categoryLabel?: string;
  maxPrice?: string;
  bedrooms?: string;
}): string => {
  const parts: string[] = [];
  
  if (item.purpose === 'project') {
    parts.push('Projects');
  } else if (item.purpose === 'rent') {
    parts.push('Rent');
  } else {
    parts.push('Buy');
  }

  // Location part
  if (item.city && item.city !== 'All Cities') {
    if (item.area && item.area.trim()) {
      parts.push(`${item.city} (${item.area.trim()})`);
    } else {
      parts.push(item.city);
    }
  } else if (item.area && item.area.trim()) {
    parts.push(item.area.trim());
  } else {
    parts.push('All Pakistan');
  }

  // Category or Bedrooms
  if (item.bedrooms && item.bedrooms !== 'all') {
    parts.push(`${item.bedrooms} Beds`);
  }
  if (item.categoryLabel) {
    parts.push(item.categoryLabel);
  } else if (item.category && item.category !== 'all') {
    parts.push(item.category.replace(/-/g, ' '));
  }

  // Budget
  if (item.maxPrice && item.maxPrice !== 'all') {
    const formatted = formatPakistaniPrice(item.maxPrice);
    if (formatted) parts.push(`Up to ${formatted}`);
  }

  return parts.join(' • ');
};

/**
 * Save a new search criteria to the front of the list, de-duplicating by URL.
 */
export const saveRecentSearch = (
  item: Omit<RecentSearchCriteria, 'id' | 'timestamp'> & { id?: string }
): RecentSearchCriteria[] => {
  try {
    const current = getRecentSearches();
    const newEntry: RecentSearchCriteria = {
      ...item,
      id: item.id || `search-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      label: item.label || buildSearchLabel(item),
    };

    // Filter out duplicates with the exact same URL or label
    const filtered = current.filter(
      (s) => s.url !== newEntry.url && s.label !== newEntry.label
    );

    // Keep top 8 recent searches
    const updated = [newEntry, ...filtered].slice(0, 8);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(RECENT_SEARCHES_EVENT));
    return updated;
  } catch (err) {
    console.error('Failed to save recent search to localStorage', err);
    return [];
  }
};

/**
 * Remove an item by id
 */
export const removeRecentSearch = (id: string): RecentSearchCriteria[] => {
  try {
    const current = getRecentSearches();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(RECENT_SEARCHES_EVENT));
    return updated;
  } catch (err) {
    console.error('Failed to remove recent search', err);
    return [];
  }
};

/**
 * Clear all recent searches
 */
export const clearRecentSearches = (): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new Event(RECENT_SEARCHES_EVENT));
  } catch (err) {
    console.error('Failed to clear recent searches', err);
  }
};

/**
 * Reset to default suggested searches
 */
export const resetToDefaultSearches = (): RecentSearchCriteria[] => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUGGESTED_SEARCHES));
    window.dispatchEvent(new Event(RECENT_SEARCHES_EVENT));
    return DEFAULT_SUGGESTED_SEARCHES;
  } catch (err) {
    console.error('Failed to reset recent searches', err);
    return DEFAULT_SUGGESTED_SEARCHES;
  }
};

/**
 * Format relative time (e.g. 5m ago, 2h ago, Yesterday)
 */
export const formatRelativeTime = (timestamp: number): string => {
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString('en-PK', {
    month: 'short',
    day: 'numeric',
  });
};
