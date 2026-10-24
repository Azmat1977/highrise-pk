import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArea, estimatePropertyValuation } from './propertyValuation.ts';
import { SAMPLE_PROPERTIES } from '../data/mockData.ts';

test('normalizeArea converts units accurately to Sq. Ft. and Marla', () => {
  // 5 Marla with 225 sqft standard = 1125 sqft
  const res1 = normalizeArea(5, 'Marla', 225);
  assert.equal(res1.sqFt, 1125);
  assert.equal(res1.marla, 5);

  // 1 Kanal with 225 sqft standard = 4500 sqft, 20 Marla
  const res2 = normalizeArea(1, 'Kanal', 225);
  assert.equal(res2.sqFt, 4500);
  assert.equal(res2.marla, 20);

  // 500 Sq. Yds = 4500 sqft = 20 Marla
  const res3 = normalizeArea(500, 'Sq. Yds.', 225);
  assert.equal(res3.sqFt, 4500);
  assert.equal(res3.marla, 20);

  // 10 Marla with 250 sqft standard (LDA) = 2500 sqft
  const res4 = normalizeArea(10, 'Marla', 250);
  assert.equal(res4.sqFt, 2500);
  assert.equal(res4.marla, 10);
});

test('estimatePropertyValuation calculates price range based on current listings', () => {
  // Test 5 Marla house in DHA Phase 2 Islamabad
  const val = estimatePropertyValuation(
    {
      city: 'Islamabad',
      area: 'DHA Phase 2',
      category: 'house',
      size: 5,
      sizeUnit: 'Marla',
      ageCondition: 'brand-new',
    },
    SAMPLE_PROPERTIES
  );

  assert.ok(val.estimatedPrice > 0, 'Estimated price should be greater than zero');
  assert.ok(val.lowEstimate < val.estimatedPrice, 'Low estimate should be lower than fair market price');
  assert.ok(val.highEstimate > val.estimatedPrice, 'High estimate should be higher than fair market price');
  assert.ok(val.pricePerMarla > 0, 'Price per Marla should be calculated');
  assert.ok(val.pricePerSqFt > 0, 'Price per Sq. Ft. should be calculated');
  assert.ok(val.confidenceScore >= 70, 'Confidence score should be substantial');
  assert.ok(val.comparableListings.length > 0, 'Should return comparable listings');
  assert.ok(val.priceFormatted.includes('PKR'), 'Formatted price should include PKR');
});

test('estimatePropertyValuation respects corner and main road premium', () => {
  const regular = estimatePropertyValuation(
    {
      city: 'Lahore',
      area: 'DHA Phase 6',
      category: 'residential-plot',
      size: 1,
      sizeUnit: 'Kanal',
      isCornerOrMainRoad: false,
    },
    SAMPLE_PROPERTIES
  );

  const corner = estimatePropertyValuation(
    {
      city: 'Lahore',
      area: 'DHA Phase 6',
      category: 'residential-plot',
      size: 1,
      sizeUnit: 'Kanal',
      isCornerOrMainRoad: true,
    },
    SAMPLE_PROPERTIES
  );

  assert.ok(
    corner.estimatedPrice > regular.estimatedPrice,
    'Corner/Main boulevard property should have premium price'
  );
});
