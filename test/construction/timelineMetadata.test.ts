/**
 * Stage C-2C — construction timeline + engineer-review metadata behaviour.
 *
 * The engine now consumes the current `SUBTYPE_METADATA` contract, whose
 * durations are organised by construction stage (`timelineMonths`). These tests
 * pin the stage selection, the quality/area scaling, the zero-month guard and
 * the engineer-review floor trigger. All expected values are derived from the
 * declared metadata, not invented market figures.
 */

import { describe, expect, it } from 'vitest';
import { calculateTimeline, requiresEngineerReview } from '@/lib/constructionEngine';
import { ALL_SUBTYPES, SUBTYPE_METADATA } from '@/lib/constructionRates';

describe('calculateTimeline · stage-specific metadata selection', () => {
  it('selects greyStructure / finishing / turnkey durations from metadata', () => {
    // house → timelineMonths: { greyStructure: 6, finishing: 4, turnkey: 10 }
    expect(calculateTimeline('house', 'grey_structure', 'standard', 2000)).toEqual({ min: 6, max: 8 });
    expect(calculateTimeline('house', 'finishing', 'standard', 2000)).toEqual({ min: 4, max: 5 });
    expect(calculateTimeline('house', 'turnkey', 'standard', 2000)).toEqual({ min: 9, max: 13 });
  });

  it('produces distinct windows for each stage on a larger typology', () => {
    // highrise_apartment_building → { greyStructure: 18, finishing: 12, turnkey: 30 }
    const grey = calculateTimeline('highrise_apartment_building', 'grey_structure', 'standard', 2000);
    const finishing = calculateTimeline('highrise_apartment_building', 'finishing', 'standard', 2000);
    const turnkey = calculateTimeline('highrise_apartment_building', 'turnkey', 'standard', 2000);

    expect(grey.min).toBeGreaterThan(finishing.min);
    expect(turnkey.min).toBeGreaterThan(grey.min);
  });

  it('matches the metadata value for a mid typology (cold_storage turnkey)', () => {
    // cold_storage → turnkey 8 → min ceil(8*0.85)=7, max ceil(8*1.25)=10
    expect(calculateTimeline('cold_storage', 'turnkey', 'standard', 2000)).toEqual({ min: 7, max: 10 });
  });
});

describe('calculateTimeline · quality + area scaling', () => {
  it('extends the window for higher quality grades', () => {
    const standard = calculateTimeline('house', 'turnkey', 'standard', 2000);
    const premium = calculateTimeline('house', 'turnkey', 'premium', 2000);
    const luxury = calculateTimeline('house', 'turnkey', 'luxury', 2000);

    expect(premium.min).toBeGreaterThanOrEqual(standard.min);
    expect(premium.max).toBeGreaterThan(standard.max);
    expect(luxury.min).toBeGreaterThan(premium.min);
    expect(luxury.max).toBeGreaterThan(premium.max);
  });

  it('extends the window for very large covered areas', () => {
    const small = calculateTimeline('house', 'turnkey', 'standard', 2000);
    const large = calculateTimeline('house', 'turnkey', 'standard', 15000);
    const huge = calculateTimeline('house', 'turnkey', 'standard', 30000);

    expect(large.min).toBeGreaterThan(small.min);
    expect(huge.min).toBeGreaterThan(large.min);
    expect(huge.max).toBeGreaterThan(large.max);
  });

  it('keeps a floor on the window when a stage metadata value is zero', () => {
    // warehouse finishing: 0 → guard yields the minimum { 2, 3 }
    expect(calculateTimeline('warehouse', 'finishing', 'standard', 2000)).toEqual({ min: 2, max: 3 });
  });
});

describe('engineer-review trigger', () => {
  const LEGACY_UNCONDITIONAL: readonly string[] = [
    'highrise_apartment_building',
    'highrise_office_tower',
    'industrial_building',
    'cold_storage',
    'complete_mixed_tower',
  ];

  it('restores typology-specific review for low-rise industrial/factory', () => {
    const meta = SUBTYPE_METADATA.industrial_building;
    expect(meta.requiresEngineerNote).toBe(true);
    expect(requiresEngineerReview(1, meta.requiresEngineerNote)).toBe(true);
    expect(requiresEngineerReview(2, meta.requiresEngineerNote)).toBe(true);
  });

  it('restores typology-specific review for low-rise cold storage', () => {
    const meta = SUBTYPE_METADATA.cold_storage;
    expect(meta.requiresEngineerNote).toBe(true);
    expect(requiresEngineerReview(1, meta.requiresEngineerNote)).toBe(true);
    expect(requiresEngineerReview(2, meta.requiresEngineerNote)).toBe(true);
  });

  it('keeps the three-or-more-floor rule for typologies without a hard requirement', () => {
    const flag = SUBTYPE_METADATA.house.requiresEngineerNote;
    expect(flag).toBe(false);
    expect(requiresEngineerReview(1, flag)).toBe(false);
    expect(requiresEngineerReview(2, flag)).toBe(false);
    expect(requiresEngineerReview(3, flag)).toBe(true);
    expect(requiresEngineerReview(5, flag)).toBe(true);
    expect(requiresEngineerReview(20, flag)).toBe(true);
  });

  it('flags only the confirmed legacy typologies unconditionally', () => {
    const flagged = ALL_SUBTYPES.filter((subType) => SUBTYPE_METADATA[subType].requiresEngineerNote);
    expect(flagged.slice().sort()).toEqual(LEGACY_UNCONDITIONAL.slice().sort());
  });

  it('treats every unconditionally-flagged typology as required at one floor', () => {
    for (const subType of ALL_SUBTYPES) {
      const meta = SUBTYPE_METADATA[subType];
      if (meta.requiresEngineerNote) {
        expect(requiresEngineerReview(1, meta.requiresEngineerNote)).toBe(true);
      }
    }
  });
});

describe('metadata contract sanity', () => {
  it('every typology declares a boolean engineer-review requirement', () => {
    for (const subType of ALL_SUBTYPES) {
      expect(typeof SUBTYPE_METADATA[subType].requiresEngineerNote).toBe('boolean');
    }
  });

  it('every typology carries a numeric, non-negative stage timeline', () => {
    for (const subType of ALL_SUBTYPES) {
      const timeline = SUBTYPE_METADATA[subType].timelineMonths;
      for (const stage of ['greyStructure', 'finishing', 'turnkey'] as const) {
        expect(Number.isFinite(timeline[stage])).toBe(true);
        expect(timeline[stage]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('every stage timeline the engine can request returns a valid window', () => {
    for (const subType of ALL_SUBTYPES) {
      for (const stage of ['grey_structure', 'finishing', 'turnkey'] as const) {
        const window = calculateTimeline(subType, stage, 'standard', 2000);
        expect(window.min).toBeGreaterThanOrEqual(2);
        expect(window.max).toBeGreaterThanOrEqual(3);
        expect(window.max).toBeGreaterThanOrEqual(window.min);
      }
    }
  });
});
