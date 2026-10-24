/**
 * Utility functions for formatting Pakistani currency, property sizes, and dates.
 */

export function formatPKR(amount: number, isMonthly: boolean = false): string {
  if (isNaN(amount) || amount <= 0) return 'PKR 0';

  if (isMonthly) {
    if (amount >= 100000) {
      const lac = amount / 100000;
      return `PKR ${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(1)} Lac / mo`;
    }
    return `PKR ${amount.toLocaleString('en-US')} / mo`;
  }

  if (amount >= 10000000) {
    const crore = amount / 10000000;
    return `PKR ${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2).replace(/\.?0+$/, '')} Crore`;
  }

  if (amount >= 100000) {
    const lac = amount / 100000;
    return `PKR ${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(2).replace(/\.?0+$/, '')} Lac`;
  }

  if (amount >= 1000) {
    const thousand = amount / 1000;
    return `PKR ${thousand % 1 === 0 ? thousand.toFixed(0) : thousand.toFixed(1)} Thousand`;
  }

  return `PKR ${amount.toLocaleString('en-US')}`;
}

export function formatArea(size: number, unit: string): string {
  if (!size || size <= 0) return `0 ${unit}`;
  return `${size} ${unit}`;
}
