/**
 * Fail-safe add-on rate provider for the construction calculator.
 *
 * Business rule
 * -------------
 * If a customer selects any construction add-on whose rate is missing,
 * unverified, or expired, the estimate MUST be reported as INCOMPLETE and no
 * final total / cost range may be presented. A missing rate is never treated
 * as zero and a selected add-on is never silently omitted from the sum.
 *
 * This module intentionally contains **no market values**. Every rate slot
 * starts life as `pending` (unverified) with no numeric `value`. To make a rate
 * usable, add a record that satisfies every item below — the presence of a
 * number, or a rate that used to live as a source-code constant, is NOT
 * sufficient evidence of verification:
 *
 *   - `approval: 'approved'`
 *   - a finite, strictly-positive `value`
 *   - `unit` matching `ADD_ON_RATE_UNITS[addOn]`
 *   - non-empty `sourceName` + `sourceUrl`
 *   - a `jurisdiction`
 *   - an `effectiveFrom` that is not in the future
 *   - a `lastVerifiedAt`
 *   - an `effectiveTo` that is not in the past (otherwise the rate is expired)
 *
 * Units are per add-on: boundary wall per running foot, basement per sq ft,
 * elevator per unit, parking per slot and generator per kVA.
 */

import type { QualityGrade } from '@/lib/constructionRates';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type AddOnKind = 'boundaryWall' | 'basement' | 'elevators' | 'parking' | 'generator';

export type AddOnRateUnit =
  | 'per_running_ft'
  | 'per_sqft'
  | 'per_unit'
  | 'per_slot'
  | 'per_kva';

export type AddOnRateApproval = 'pending' | 'approved' | 'rejected';

/** Why a rate could not be treated as verified. */
export type AddOnRateUnavailableReason = 'unavailable' | 'unverified' | 'expired';

export interface AddOnRateRecord {
  addOn: AddOnKind;
  quality: QualityGrade;
  unit: AddOnRateUnit;
  approval: AddOnRateApproval;
  /** Verified PKR value. Undefined until a verified record exists. Never 0-by-default. */
  value?: number;
  sourceName?: string;
  sourceUrl?: string;
  jurisdiction?: string;
  /** ISO date the rate became applicable. */
  effectiveFrom?: string;
  /** ISO date the rate stops being applicable (optional). */
  effectiveTo?: string;
  /** ISO date the value was last checked against the source. */
  lastVerifiedAt?: string;
}

/** Strict, typed lookup result: either a verified value or an explicit reason. */
export type AddOnRateLookup =
  | { verified: true; value: number; unit: AddOnRateUnit; record: AddOnRateRecord }
  | {
      verified: false;
      reason: AddOnRateUnavailableReason;
      unit: AddOnRateUnit;
      record?: AddOnRateRecord;
    };

/** An add-on the customer selected whose rate could not be verified. */
export interface IncompleteAddOn {
  addOn: AddOnKind;
  reason: AddOnRateUnavailableReason;
}

/** Result of resolving the completeness of a full estimate. */
export interface EstimateFinalization {
  estimateComplete: boolean;
  /** Final total, or `null` when the estimate is incomplete. */
  totalCost: number | null;
  /** Final lower bound, or `null` when the estimate is incomplete. */
  costMin: number | null;
  /** Final upper bound, or `null` when the estimate is incomplete. */
  costMax: number | null;
  estimateWarning?: string;
}

export interface AddOnSelection {
  addOn: AddOnKind;
  quality: QualityGrade;
  /** Whether the customer actually asked for this add-on. */
  selected: boolean;
  /** Pure formula applied to a verified per-unit rate. */
  compute: (ratePerUnit: number) => number;
}

export interface AddOnSelectionResult {
  amounts: Partial<Record<AddOnKind, number>>;
  addOnsCost: number;
  incompleteAddOns: IncompleteAddOn[];
}

export type AddOnRateLookupFn = (addOn: AddOnKind, quality: QualityGrade) => AddOnRateLookup;

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const ADD_ON_RATE_UNITS: Record<AddOnKind, AddOnRateUnit> = {
  boundaryWall: 'per_running_ft',
  basement: 'per_sqft',
  elevators: 'per_unit',
  parking: 'per_slot',
  generator: 'per_kva',
};

export const ADD_ON_LABELS: Record<AddOnKind, string> = {
  boundaryWall: 'Boundary wall',
  basement: 'Basement',
  elevators: 'Elevator',
  parking: 'Parking',
  generator: 'Generator',
};

export const INCOMPLETE_ESTIMATE_WARNING =
  'Estimate incomplete — verified rates are required for the selected add-ons.';

const ADD_ON_KINDS: AddOnKind[] = ['boundaryWall', 'basement', 'elevators', 'parking', 'generator'];

const QUALITY_GRADES: QualityGrade[] = ['standard', 'premium', 'luxury'];

/**
 * The rate registry. Every slot is unverified (`pending`) and holds no value.
 * Replace/extend records here — with genuine, sourced evidence — when rates
 * have been verified. Nothing in this array is a market claim today.
 */
export const ADD_ON_RATE_RECORDS: AddOnRateRecord[] = ADD_ON_KINDS.flatMap((addOn) =>
  QUALITY_GRADES.map((quality) => ({
    addOn,
    quality,
    unit: ADD_ON_RATE_UNITS[addOn],
    approval: 'pending' as const,
  }))
);

// ═══════════════════════════════════════════════════════════════
// VALIDATION + LOOKUP
// ═══════════════════════════════════════════════════════════════

export type AddOnRateValidation =
  | { valid: true; value: number }
  | { valid: false; reason: AddOnRateUnavailableReason };

/**
 * A record is only "verified" when it is approved, carries a finite positive
 * value, is scoped to the right unit, is currently effective and has the
 * supporting source metadata.
 */
export function validateAddOnRateRecord(
  record: AddOnRateRecord,
  now: Date = new Date()
): AddOnRateValidation {
  if (record.approval !== 'approved') {
    return { valid: false, reason: 'unverified' };
  }

  if (typeof record.value !== 'number' || !Number.isFinite(record.value) || record.value <= 0) {
    return { valid: false, reason: 'unverified' };
  }

  if (record.unit !== ADD_ON_RATE_UNITS[record.addOn]) {
    return { valid: false, reason: 'unverified' };
  }

  if (record.effectiveTo) {
    const to = Date.parse(record.effectiveTo);
    if (Number.isFinite(to) && to < now.getTime()) {
      return { valid: false, reason: 'expired' };
    }
  }

  if (!record.sourceName || !record.sourceUrl || !record.jurisdiction) {
    return { valid: false, reason: 'unverified' };
  }

  if (!record.effectiveFrom) {
    return { valid: false, reason: 'unverified' };
  }

  const from = Date.parse(record.effectiveFrom);
  if (!Number.isFinite(from) || from > now.getTime()) {
    return { valid: false, reason: 'unverified' };
  }

  if (!record.lastVerifiedAt) {
    return { valid: false, reason: 'unverified' };
  }

  return { valid: true, value: record.value };
}

/**
 * Look up the rate for an add-on + quality grade. Returns either a verified
 * value or an explicit reason the rate cannot be used.
 */
export function lookupAddOnRate(
  addOn: AddOnKind,
  quality: QualityGrade,
  options?: { now?: Date; records?: AddOnRateRecord[] }
): AddOnRateLookup {
  const unit = ADD_ON_RATE_UNITS[addOn];
  const records = options?.records ?? ADD_ON_RATE_RECORDS;
  const record = records.find((r) => r.addOn === addOn && r.quality === quality);

  if (!record) {
    return { verified: false, reason: 'unavailable', unit };
  }

  const validation = validateAddOnRateRecord(record, options?.now);
  if (!validation.valid) {
    return { verified: false, reason: validation.reason, unit, record };
  }

  return { verified: true, value: validation.value, unit, record };
}

// ═══════════════════════════════════════════════════════════════
// COMPLETENESS ASSEMBLY (pure, injectable lookups for testing)
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve every selected add-on. Selected add-ons with an unusable rate are
 * reported in `incompleteAddOns` and are **not** added to the cost. Unselected
 * add-ons are ignored entirely.
 */
export function evaluateAddOnSelections(
  selections: AddOnSelection[],
  lookup: AddOnRateLookupFn = lookupAddOnRate
): AddOnSelectionResult {
  const amounts: Partial<Record<AddOnKind, number>> = {};
  const incompleteAddOns: IncompleteAddOn[] = [];
  let addOnsCost = 0;

  for (const selection of selections) {
    if (!selection.selected) continue;

    const result = lookup(selection.addOn, selection.quality);
    if (!result.verified) {
      incompleteAddOns.push({ addOn: selection.addOn, reason: result.reason });
      continue;
    }

    const amount = selection.compute(result.value);
    amounts[selection.addOn] = amount;
    addOnsCost += amount;
  }

  return { amounts, addOnsCost, incompleteAddOns };
}

/**
 * Turn a subtotal + unresolved add-ons into a finalization. When any selected
 * add-on is unresolved, the final total and range are withheld (`null`) and a
 * warning is supplied.
 */
export function finalizeEstimate(
  subtotal: number,
  incompleteAddOns: IncompleteAddOn[],
  computeRange: (subtotal: number) => { min: number; max: number }
): EstimateFinalization {
  if (incompleteAddOns.length > 0) {
    return {
      estimateComplete: false,
      totalCost: null,
      costMin: null,
      costMax: null,
      estimateWarning: INCOMPLETE_ESTIMATE_WARNING,
    };
  }

  const { min, max } = computeRange(subtotal);
  return {
    estimateComplete: true,
    totalCost: subtotal,
    costMin: min,
    costMax: max,
  };
}
