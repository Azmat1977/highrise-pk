// src/lib/utils.ts

/**
 * Merge Tailwind class names safely
 * Example: cn('btn', isActive && 'bg-blue') → "btn bg-blue"
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format raw price number (like 25000000) into PKR + wording
 */
export const formatPrice = (price: number): string => {
  if (!price || price <= 0) return 'PKR 0';

  if (price >= 10000000) {
    return `PKR ${(price / 10000000).toFixed(2)} Crore`;
  } else if (price >= 100000) {
    return `PKR ${(price / 100000).toFixed(2)} Lac`;
  }
  return `PKR ${price.toLocaleString('en-PK')}`;
};

/**
 * Format area and unit: 5 - Marla → 5 Marla
 */
export const formatArea = (area: number | string, unit: string): string => {
  return `${area} ${unit}`;
};
