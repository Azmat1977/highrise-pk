// lib/property/formatPrice.ts
// Shared PKR price formatter for listing cards and compare tiles.

export function formatListingPrice(
  price?: number | null,
  listingType?: string,
  emptyFallback = ''
): string {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return emptyFallback;
  }
  const suffix = listingType === 'rent' ? '/mo' : '';
  if (price >= 10_000_000) {
    return `PKR ${(price / 10_000_000).toFixed(2)} Crore${suffix}`;
  }
  if (price >= 100_000) {
    return `PKR ${(price / 100_000).toFixed(2)} Lac${suffix}`;
  }
  return `PKR ${price.toLocaleString('en-PK')}${suffix}`;
}