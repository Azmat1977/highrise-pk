/**
 * Fail-safe add-on rate + estimate completeness tests.
 *
 * These tests cover the approved business rule: a selected add-on whose rate is
 * unavailable, unverified or expired must make the estimate incomplete and must
 * never expose a final total. All numeric values here are arbitrary TEST
 * FIXTURES — they make no claim about 2026 market prices.
 */

import { describe, expect, it } from 'vitest';
import {
  ADD_ON_LABELS,
  ADD_ON_RATE_RECORDS,
  ADD_ON_RATE_UNITS,
  INCOMPLETE_ESTIMATE_WARNING,
  evaluateAddOnSelections,
  finalizeEstimate,
  lookupAddOnRate,
  validateAddOnRateRecord,
  type AddOnKind,
  type AddOnRateLookupFn,
  type AddOnRateRecord,
  type AddOnSelection,
} from '@/lib/constructionAddOnRates';

const ALL_ADD_ONS: AddOnKind[] = ['boundaryWall', 'basement', 'elevators', 'parking', 'generator'];

/** Test double: reports every rate as verified. Not a market claim. */
const verifiedLookup: AddOnRateLookupFn = (addOn) => ({
  verified: true,
  value: 100,
  unit: ADD_ON_RATE_UNITS[addOn],
  record: {
    addOn,
    quality: 'standard',
    unit: ADD_ON_RATE_UNITS[addOn],
    approval: 'approved',
    value: 100,
  },
});

/** Test double: reports one add-on as unavailable, the rest verified. */
const unavailableLookup = (blocked: AddOnKind): AddOnRateLookupFn => (addOn, quality) =>
  addOn === blocked
    ? { verified: false, reason: 'unavailable', unit: ADD_ON_RATE_UNITS[addOn] }
    : verifiedLookup(addOn, quality);

function selection(addOn: AddOnKind, selected: boolean): AddOnSelection {
  return { addOn, quality: 'standard', selected, compute: (rate) => rate * 10 };
}

function range10(subtotal: number): { min: number; max: number } {
  return { min: subtotal - 10, max: subtotal + 10 };
}

function approvedRecord(overrides: Partial<AddOnRateRecord> = {}): AddOnRateRecord {
  return {
    addOn: 'boundaryWall',
    quality: 'standard',
    unit: 'per_running_ft',
    approval: 'approved',
    value: 1200,
    sourceName: 'Example rate source',
    sourceUrl: 'https://example.test/rates',
    jurisdiction: 'PK',
    effectiveFrom: '2026-01-01',
    lastVerifiedAt: '2026-06-01',
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// Provider: registry + validation
// ═══════════════════════════════════════════════════════════════

describe('add-on rate provider · registry', () => {
  it('ships every add-on × grade slot unverified with no numeric value', () => {
    expect(ADD_ON_RATE_RECORDS).toHaveLength(ALL_ADD_ONS.length * 3);
    for (const record of ADD_ON_RATE_RECORDS) {
      expect(record.approval).toBe('pending');
      expect(record.value).toBeUndefined();
    }
  });

  it('maps each add-on to its correct unit', () => {
    expect(ADD_ON_RATE_UNITS).toEqual({
      boundaryWall: 'per_running_ft',
      basement: 'per_sqft',
      elevators: 'per_unit',
      parking: 'per_slot',
      generator: 'per_kva',
    });
  });

  it('labels every add-on for display', () => {
    for (const addOn of ALL_ADD_ONS) {
      expect(ADD_ON_LABELS[addOn]).toBeTruthy();
    }
  });

  it('treats the default (unverified) registry as not verified', () => {
    for (const addOn of ALL_ADD_ONS) {
      const result = lookupAddOnRate(addOn, 'standard');
      expect(result.verified).toBe(false);
      if (!result.verified) expect(result.reason).toBe('unverified');
    }
  });

  it('reports a missing slot as unavailable', () => {
    const result = lookupAddOnRate('basement', 'standard', { records: [] });
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toBe('unavailable');
      expect(result.unit).toBe('per_sqft');
    }
  });
});

describe('add-on rate provider · validation', () => {
  it('accepts a fully-sourced, effective, approved record', () => {
    const validation = validateAddOnRateRecord(approvedRecord(), new Date('2026-06-01'));
    expect(validation).toEqual({ valid: true, value: 1200 });
  });

  const now = new Date('2026-06-01');

  it.each([
    ['pending approval', { approval: 'pending' as const }],
    ['rejected approval', { approval: 'rejected' as const }],
    ['no value', { value: undefined }],
    ['zero value', { value: 0 }],
    ['negative value', { value: -5 }],
    ['non-finite value', { value: Number.POSITIVE_INFINITY }],
    ['NaN value', { value: Number.NaN }],
    ['missing source name', { sourceName: undefined }],
    ['missing source url', { sourceUrl: undefined }],
    ['missing jurisdiction', { jurisdiction: undefined }],
    ['missing effectiveFrom', { effectiveFrom: undefined }],
    ['future effectiveFrom', { effectiveFrom: '2027-01-01' }],
    ['missing lastVerifiedAt', { lastVerifiedAt: undefined }],
    ['unit mis-scoped', { unit: 'per_sqft' as const }],
  ])('rejects %s as unverified', (_label, overrides) => {
    const validation = validateAddOnRateRecord(approvedRecord(overrides), now);
    expect(validation).toEqual({ valid: false, reason: 'unverified' });
  });

  it('rejects an expired record as expired', () => {
    const validation = validateAddOnRateRecord(approvedRecord({ effectiveTo: '2026-02-01' }), now);
    expect(validation).toEqual({ valid: false, reason: 'expired' });
  });

  it('does not treat an old source-code constant as verified', () => {
    // A bare number with no approval/source metadata must not be accepted.
    const validation = validateAddOnRateRecord(
      { addOn: 'parking', quality: 'standard', unit: 'per_slot', approval: 'approved', value: 400_000 },
      now
    );
    expect(validation).toEqual({ valid: false, reason: 'unverified' });
  });
});

// ═══════════════════════════════════════════════════════════════
// Selection evaluation
// ═══════════════════════════════════════════════════════════════

describe('evaluateAddOnSelections', () => {
  it('reports a complete set when every selected rate is verified', () => {
    const result = evaluateAddOnSelections(
      ALL_ADD_ONS.map((addOn) => selection(addOn, true)),
      verifiedLookup
    );
    expect(result.incompleteAddOns).toEqual([]);
    expect(result.addOnsCost).toBe(ALL_ADD_ONS.length * 100 * 10);
    expect(result.amounts).toEqual({
      boundaryWall: 1000,
      basement: 1000,
      elevators: 1000,
      parking: 1000,
      generator: 1000,
    });
  });

  it.each(ALL_ADD_ONS)(
    'marks the estimate incomplete when the selected %s rate is unverified',
    (addOn) => {
      const result = evaluateAddOnSelections([selection(addOn, true)]);
      expect(result.incompleteAddOns).toEqual([{ addOn, reason: 'unverified' }]);
      expect(result.addOnsCost).toBe(0);
      expect(result.amounts[addOn]).toBeUndefined();
    }
  );

  it.each(ALL_ADD_ONS)(
    'marks the estimate incomplete when the selected %s rate is unavailable',
    (addOn) => {
      const result = evaluateAddOnSelections(
        [selection(addOn, true)],
        unavailableLookup(addOn)
      );
      expect(result.incompleteAddOns).toEqual([{ addOn, reason: 'unavailable' }]);
      expect(result.addOnsCost).toBe(0);
      expect(result.amounts[addOn]).toBeUndefined();
    }
  );

  it('ignores an unselected add-on even if its rate is unavailable', () => {
    const result = evaluateAddOnSelections(
      [selection('parking', false)],
      unavailableLookup('parking')
    );
    expect(result.incompleteAddOns).toEqual([]);
    expect(result.addOnsCost).toBe(0);
    expect(result.amounts).toEqual({});
  });

  it('reports every unresolved add-on, not just the first', () => {
    const result = evaluateAddOnSelections([
      selection('boundaryWall', true),
      selection('basement', true),
      selection('elevators', true),
    ]);
    expect(result.incompleteAddOns.map((entry) => entry.addOn)).toEqual([
      'boundaryWall',
      'basement',
      'elevators',
    ]);
    expect(result.incompleteAddOns).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════
// Finalization: never expose a total when incomplete
// ═══════════════════════════════════════════════════════════════

describe('finalizeEstimate', () => {
  it('keeps a complete estimate complete with a numeric total and range', () => {
    const finalization = finalizeEstimate(1000, [], range10);
    expect(finalization).toEqual({
      estimateComplete: true,
      totalCost: 1000,
      costMin: 990,
      costMax: 1010,
    });
    expect(finalization.estimateWarning).toBeUndefined();
  });

  it('withholds the total and range when an add-on is unresolved', () => {
    const finalization = finalizeEstimate(1000, [{ addOn: 'parking', reason: 'unavailable' }], range10);
    expect(finalization.estimateComplete).toBe(false);
    expect(finalization.totalCost).toBeNull();
    expect(finalization.costMin).toBeNull();
    expect(finalization.costMax).toBeNull();
    expect(finalization.estimateWarning).toBe(INCOMPLETE_ESTIMATE_WARNING);
  });

  it('does not hide a valid numeric zero total behind a falsy check', () => {
    const finalization = finalizeEstimate(0, [], range10);
    expect(finalization.estimateComplete).toBe(true);
    expect(finalization.totalCost).toBe(0);
    expect(finalization.totalCost).not.toBeNull();
  });

  it('survives JSON serialization with null totals (API → UI contract)', () => {
    const incomplete = finalizeEstimate(1000, [{ addOn: 'generator', reason: 'expired' }], range10);
    const serialized = JSON.parse(
      JSON.stringify({ success: true, data: { ...incomplete, incompleteAddOns: [{ addOn: 'generator', reason: 'expired' }] } })
    );
    expect(serialized.data.totalCost).toBeNull();
    expect(serialized.data.costMin).toBeNull();
    expect(serialized.data.costMax).toBeNull();
    expect(serialized.data.estimateComplete).toBe(false);
    expect(serialized.data.incompleteAddOns).toEqual([{ addOn: 'generator', reason: 'expired' }]);
  });
});
