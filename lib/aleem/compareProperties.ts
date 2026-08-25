// lib/aleem/compareProperties.ts
// Grounded property comparison context builder for ALEEM / Nemotron.

import type { PropertyCard } from '@/lib/aleem/searchProperties';

const COMPARISON_KEYWORDS = /\b(compare|comparison|muqabla|farq|farq hai|kaunsa behtar|konsa accha|vs|versus|dono mein|dono ko|teeno ko)\b/i;

/** Check if user message indicates an intent to compare properties */
export function isComparisonRequest(message: string): boolean {
  return COMPARISON_KEYWORDS.test(message);
}

/**
 * Build a structured factual comparison block to append to the system prompt.
 * Ensures Nemotron/ALEEM bases comparisons ONLY on verified database facts.
 */
export function buildComparisonContextBlock(properties: PropertyCard[]): string {
  if (!properties || properties.length === 0) return '';

  const lines: string[] = [
    'PROPERTY COMPARISON CONTEXT (Verified Database Records - Authoritative):',
    'Evaluate these properties objectively. Do NOT invent market averages or ROI figures.',
  ];

  properties.forEach((item, idx) => {
    const priceFormatted = item.price > 0 ? `PKR ${item.price.toLocaleString('en-US')}` : 'Price on request';
    const areaFormatted = item.area > 0 ? `${item.area} ${item.unit || ''}`.trim() : 'Area not specified';
    const location = [item.society, item.city].filter(Boolean).join(', ') || 'Pakistan';

    // Compute price per marla/unit if area is positive
    let unitRate = '';
    if (item.price > 0 && item.area > 0) {
      const rate = Math.round(item.price / item.area);
      unitRate = ` (~PKR ${rate.toLocaleString('en-US')} per ${item.unit || 'unit'})`;
    }

    lines.push(
      `Property #${idx + 1}: "${item.title}"\n` +
      `  - Location: ${location}\n` +
      `  - Type: ${item.propertyType || 'Property'} (${item.listingType || 'sale'})\n` +
      `  - Price: ${priceFormatted}${unitRate}\n` +
      `  - Size: ${areaFormatted}\n` +
      `  - Link: /property/${item.slug}`,
    );
  });

  lines.push(
    'COMPARISON GUIDELINES:\n' +
    '1. Highlight factual differences: Price, Price per Unit/Marla, Location, and Property Type.\n' +
    '2. Explain suitability trade-offs (e.g. rental yield vs personal residence, location access).\n' +
    '3. Never state "This is a guaranteed 100% best investment". Present objective pros/cons for each.\n' +
    '4. Mirror the user\'s language (English, Roman Urdu, or Urdu).',
  );

  return lines.join('\n\n');
}