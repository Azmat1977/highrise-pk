/**
 * Stage C-2D — city-multiplier contract tests.
 *
 * The rate module prices cities per construction component
 * (`greyStructure` / `finishing` / `labor`); the engine derives a single
 * effective multiplier from those components. These tests pin the component
 * selection, the turnkey blend, city selection, the neutral (×1) case, and
 * that the C-2B / C-2C / C-2C-1 behaviours survive the change.
 */

import { describe, expect, it } from 'vitest';
import { calculateConstruction, resolveCityMultiplier, type EngineInput } from '@/lib/constructionEngine';
import {
  ALL_CITIES,
  ALL_SUBTYPES,
  CITY_MULTIPLIERS,
  TYPOLOGY_RATES,
  getCityMultiplier,
} from '@/lib/constructionRates';

const COMPONENTS = ['greyStructure', 'finishing', 'labor'] as const;
const STAGES = ['grey_structure', 'finishing', 'turnkey'] as const;
const QUALITIES = ['standard', 'premium', 'luxury'] as const;

function input(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    city: 'Islamabad',
    subType: 'house',
    quality: 'standard',
    constructionType: 'grey_structure',
    size: 5,
    sizeUnit: 'Marla',
    floors: 1,
    ...overrides,
  };
}

describe('getCityMultiplier · component contract', () => {
  it('returns the module value for each supported component', () => {
    expect(getCityMultiplier('Karachi', 'greyStructure')).toBe(1.12);
    expect(getCityMultiplier('Karachi', 'finishing')).toBe(1.15);
    expect(getCityMultiplier('Karachi', 'labor')).toBe(1.18);
    expect(getCityMultiplier('Lahore', 'greyStructure')).toBe(0.95);
    expect(getCityMultiplier('Islamabad', 'finishing')).toBe(1.0);
  });

  it('exposes exactly greyStructure / finishing / labor for every city', () => {
    for (const city of ALL_CITIES) {
      const entry = CITY_MULTIPLIERS[city];
      expect(Object.keys(entry).sort()).toEqual(['finishing', 'greyStructure', 'labor']);
      for (const component of COMPONENTS) {
        expect(getCityMultiplier(city, component)).toBe(entry[component]);
      }
    }
  });
});

describe('resolveCityMultiplier · component selection', () => {
  it('uses the grey-structure multiplier for grey_structure estimates', () => {
    expect(resolveCityMultiplier('Karachi', 'house', 'standard', 'grey_structure')).toBe(1.12);
    expect(resolveCityMultiplier('Lahore', 'villa', 'premium', 'grey_structure')).toBe(0.95);
  });

  it('uses the finishing multiplier for finishing estimates', () => {
    expect(resolveCityMultiplier('Karachi', 'house', 'standard', 'finishing')).toBe(1.15);
    expect(resolveCityMultiplier('Lahore', 'villa', 'premium', 'finishing')).toBe(0.98);
  });

  it('blends grey + finishing for turnkey by the rate-card shares', () => {
    const rates = TYPOLOGY_RATES.house;
    const grey = rates.greyStructurePerSqft.standard;
    const finishing = rates.finishingPerSqft.standard;
    const expected = (grey * 1.12 + finishing * 1.15) / (grey + finishing);

    const blended = resolveCityMultiplier('Karachi', 'house', 'standard', 'turnkey');
    expect(blended).toBeCloseTo(expected, 12);
    expect(blended).toBeGreaterThan(1.12);
    expect(blended).toBeLessThan(1.15);
  });

  it('never falls outside the grey/finishing component bounds', () => {
    for (const city of ALL_CITIES) {
      const { greyStructure, finishing } = CITY_MULTIPLIERS[city];
      const lo = Math.min(greyStructure, finishing) - 1e-9;
      const hi = Math.max(greyStructure, finishing) + 1e-9;
      for (const subType of ALL_SUBTYPES) {
        for (const quality of QUALITIES) {
          for (const type of STAGES) {
            const value = resolveCityMultiplier(city, subType, quality, type);
            expect(Number.isFinite(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(lo);
            expect(value).toBeLessThanOrEqual(hi);
          }
        }
      }
    }
  });
});

describe('resolveCityMultiplier · neutral city (all multipliers = 1)', () => {
  it('resolves to exactly 1 for every typology, grade and stage in Islamabad', () => {
    for (const subType of ALL_SUBTYPES) {
      for (const quality of QUALITIES) {
        for (const type of STAGES) {
          expect(resolveCityMultiplier('Islamabad', subType, quality, type)).toBe(1);
        }
      }
    }
  });
});

describe('calculateConstruction · cost consistency and preserved contracts', () => {
  it('does not change the estimate when the multiplier is 1', () => {
    const result = calculateConstruction(input({ city: 'Islamabad' }));
    expect(result.cityMultiplier).toBe(1);
    expect(result.baseCost).toBe(result.costPerSqft * result.totalCoveredSqft);
  });

  it('scales the base cost by the resolved component multiplier', () => {
    const islamabad = calculateConstruction(input({ city: 'Islamabad' }));
    const karachi = calculateConstruction(input({ city: 'Karachi' }));
    expect(karachi.cityMultiplier).toBe(1.12);
    expect(karachi.baseCost).toBeGreaterThan(islamabad.baseCost);
  });

  it('keeps the Stage C-2B incomplete-estimate contract', () => {
    const result = calculateConstruction(
      input({ constructionType: 'turnkey', includeBoundaryWall: true })
    );
    expect(result.estimateComplete).toBe(false);
    expect(result.totalCost).toBeNull();
    expect(result.costMin).toBeNull();
    expect(result.costMax).toBeNull();
    expect(result.incompleteAddOns.map((entry) => entry.addOn)).toContain('boundaryWall');
  });

  it('preserves C-2C-1 typology review and C-2C stage timelines end-to-end', () => {
    const result = calculateConstruction(
      input({
        subType: 'industrial_building',
        constructionType: 'turnkey',
        size: 20,
        floors: 1,
      })
    );
    expect(result.requiresEngineerNote).toBe(true); // typology flag applies at 1 floor
    expect(result.timelineMonths.max).toBeGreaterThanOrEqual(3);
  });
});
