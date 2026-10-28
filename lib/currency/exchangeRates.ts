// lib/currency/exchangeRates.ts
// ═══════════════════════════════════════════════════════════════
// HIGHRISE GLOBAL CURRENCY CONVERTER — Exchange Rates
// Static rates updated manually. Future: Redis-cached API.
// ═══════════════════════════════════════════════════════════════
// Rates are PKR → Foreign Currency
// Example: 1 PKR = 0.00358 USD (i.e., 1 USD = ~279 PKR)
// ═══════════════════════════════════════════════════════════════

export interface CurrencyInfo {
  code: string;           // ISO 4217 code (USD, GBP, etc.)
  name: string;           // Full name
  symbol: string;         // Display symbol ($, £, etc.)
  flagCode: string;       // ISO 3166-1 alpha-2 (US, GB) — emoji built at runtime
  country: string;        // Country name
  priority: number;       // 1 = highest priority (shown first)
  ratePerPKR: number;     // How much 1 PKR equals in this currency
  format: 'symbol_before' | 'symbol_after' | 'code_before';
}

/**
 * Build flag emoji from ISO country code (US → 🇺🇸).
 * Avoids corrupted emoji bytes in source files.
 */
export function getFlagEmoji(flagCode: string): string {
  if (!flagCode || flagCode.length !== 2) return '🏳️';
  const cc = flagCode.toUpperCase();
  return String.fromCodePoint(
    ...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

/**
 * ⚠️ RATES LAST UPDATED: 29 August 2026
 * Source: State Bank of Pakistan reference rates
 * Update frequency: Weekly (every Monday)
 *
 * To update: Change ratePerPKR values and update LAST_UPDATED timestamp.
 */
export const LAST_UPDATED = '2026-08-29T10:00:00Z';
export const RATE_SOURCE = 'State Bank of Pakistan reference';

/**
 * All supported currencies for overseas Pakistani hotspots.
 * Ordered by priority (highest first).
 */
export const EXCHANGE_RATES: Record<string, CurrencyInfo> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flagCode: 'US',
    country: 'United States',
    priority: 1,
    ratePerPKR: 0.00358, // 1 PKR = 0.00358 USD (1 USD ≈ 279 PKR)
    format: 'symbol_before',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flagCode: 'GB',
    country: 'United Kingdom',
    priority: 2,
    ratePerPKR: 0.00279, // 1 PKR = 0.00279 GBP
    format: 'symbol_before',
  },
  SAR: {
    code: 'SAR',
    name: 'Saudi Riyal',
    symbol: 'SAR',
    flagCode: 'SA',
    country: 'Saudi Arabia',
    priority: 3,
    ratePerPKR: 0.01346, // 1 PKR = 0.01346 SAR
    format: 'code_before',
  },
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'AED',
    flagCode: 'AE',
    country: 'United Arab Emirates',
    priority: 4,
    ratePerPKR: 0.01317, // 1 PKR = 0.01317 AED
    format: 'code_before',
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'CA$',
    flagCode: 'CA',
    country: 'Canada',
    priority: 5,
    ratePerPKR: 0.00487, // 1 PKR = 0.00487 CAD
    format: 'code_before',
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'AU$',
    flagCode: 'AU',
    country: 'Australia',
    priority: 6,
    ratePerPKR: 0.00549, // 1 PKR = 0.00549 AUD
    format: 'code_before',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flagCode: 'EU',
    country: 'European Union',
    priority: 7,
    ratePerPKR: 0.00326, // 1 PKR = 0.00326 EUR
    format: 'symbol_before',
  },
  QAR: {
    code: 'QAR',
    name: 'Qatari Riyal',
    symbol: 'QR',
    flagCode: 'QA',
    country: 'Qatar',
    priority: 8,
    ratePerPKR: 0.01305, // 1 PKR = 0.01305 QAR
    format: 'code_before',
  },
  KWD: {
    code: 'KWD',
    name: 'Kuwaiti Dinar',
    symbol: 'KD',
    flagCode: 'KW',
    country: 'Kuwait',
    priority: 9,
    ratePerPKR: 0.00110, // 1 PKR = 0.00110 KWD
    format: 'code_before',
  },
  OMR: {
    code: 'OMR',
    name: 'Omani Rial',
    symbol: 'OMR',
    flagCode: 'OM',
    country: 'Oman',
    priority: 10,
    ratePerPKR: 0.00138, // 1 PKR = 0.00138 OMR
    format: 'code_before',
  },
};

/**
 * Get sorted list of currencies by priority
 */
export function getSortedCurrencies(limit?: number): CurrencyInfo[] {
  const sorted = Object.values(EXCHANGE_RATES).sort(
    (a, b) => a.priority - b.priority
  );
  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Convert PKR amount to target currency
 */
export function convertFromPKR(
  pkrAmount: number,
  targetCurrency: string
): number | null {
  const currency = EXCHANGE_RATES[targetCurrency];
  if (!currency) return null;
  if (pkrAmount <= 0) return 0;
  return pkrAmount * currency.ratePerPKR;
}

/**
 * Format currency amount for display
 * Uses smart formatting: K, M, B for large numbers in foreign currencies
 */
export function formatCurrencyAmount(
  amount: number,
  currency: CurrencyInfo
): string {
  if (amount <= 0) return `${currency.symbol}0`;

  const formatted = smartNumberFormat(amount);
  const separator = currency.format === 'code_before' ? ' ' : '';

  if (currency.format === 'symbol_before') {
    return `${currency.symbol}${formatted}`;
  }
  if (currency.format === 'code_before') {
    return `${currency.symbol}${separator}${formatted}`;
  }
  return `${formatted}${currency.symbol}`;
}

/**
 * Smart number formatting: K (thousands), M (millions), B (billions)
 * Shows 2 decimal places for values under 10, 1 decimal for 10-100, 0 for larger
 */
function smartNumberFormat(num: number): string {
  if (num >= 1_000_000_000) {
    return formatWithPrecision(num / 1_000_000_000) + 'B';
  }
  if (num >= 1_000_000) {
    return formatWithPrecision(num / 1_000_000) + 'M';
  }
  if (num >= 10_000) {
    // For large amounts in the thousands, use comma format
    return Math.round(num).toLocaleString('en-US');
  }
  if (num >= 1_000) {
    return formatWithPrecision(num / 1_000) + 'K';
  }
  return formatWithPrecision(num);
}

function formatWithPrecision(num: number): string {
  if (num < 10) return num.toFixed(2);
  if (num < 100) return num.toFixed(1);
  return Math.round(num).toString();
}

/**
 * Convert a PKR range to formatted currency range string
 * Example: "$4,320 - $7,428"
 */
export function convertRangeToCurrency(
  minPKR: number,
  maxPKR: number,
  targetCurrency: string
): string {
  const currency = EXCHANGE_RATES[targetCurrency];
  if (!currency) return '—';

  const min = convertFromPKR(minPKR, targetCurrency);
  const max = convertFromPKR(maxPKR, targetCurrency);

  if (min === null || max === null) return '—';
  if (min === 0 && max === 0) return '—';
  if (min === max || max === 0) {
    return formatCurrencyAmount(min, currency);
  }
  return `${formatCurrencyAmount(min, currency)} - ${formatCurrencyAmount(max, currency)}`;
}

/**
 * Get human-readable "time ago" for rate freshness
 */
export function getRateFreshnessLabel(): string {
  const updated = new Date(LAST_UPDATED);
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? 'Just updated' : `Updated ${diffMinutes} min ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? 'Updated 1 hour ago' : `Updated ${diffHours} hours ago`;
  }
  if (diffDays < 7) {
    return diffDays === 1 ? 'Updated yesterday' : `Updated ${diffDays} days ago`;
  }
  const weeks = Math.floor(diffDays / 7);
  return weeks === 1 ? 'Updated 1 week ago' : `Updated ${weeks} weeks ago`;
}