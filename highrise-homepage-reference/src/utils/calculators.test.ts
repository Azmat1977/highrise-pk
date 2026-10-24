import test from 'node:test';
import assert from 'node:assert/strict';
import { convertArea, calculateInstallmentPlan, calculateConstructionCost } from './calculators.ts';
import { formatPKR } from './formatters.ts';

test('convertArea correctly converts Pakistani land units', () => {
  // 1 Kanal = 20 Marla
  assert.equal(convertArea(1, 'Kanal', 'Marla'), 20);

  // 1 Kanal = 4500 Sq. Ft.
  assert.equal(convertArea(1, 'Kanal', 'Sq. Ft.'), 4500);

  // 20 Marla = 1 Kanal
  assert.equal(convertArea(20, 'Marla', 'Kanal'), 1);

  // 5 Marla = 1125 Sq. Ft.
  assert.equal(convertArea(5, 'Marla', 'Sq. Ft.'), 1125);

  // 500 Sq. Yds = 4500 Sq. Ft.
  assert.equal(convertArea(500, 'Sq. Yds.', 'Sq. Ft.'), 4500);
});

test('calculateInstallmentPlan computes down payment and monthly breakdowns accurately', () => {
  const result = calculateInstallmentPlan(12000000, 20, 36, 'monthly', 10);
  assert.equal(result.totalPrice, 12000000);
  assert.equal(result.downPayment, 2400000); // 20%
  assert.equal(result.possessionPayment, 1200000); // 10%
  assert.equal(result.remainingForInstallments, 8400000); // 70%
  assert.equal(result.numberOfInstallments, 36);
  assert.equal(result.installmentAmount, Math.round(8400000 / 36));
});

test('calculateConstructionCost estimates grey structure and finishing based on grade', () => {
  const standardEstimate = calculateConstructionCost(2000, 'standard');
  assert.equal(standardEstimate.coveredAreaSqFt, 2000);
  assert.equal(standardEstimate.ratePerSqFt, 5300); // 2800 + 2500
  assert.equal(standardEstimate.totalCost, 2000 * 5300);
  assert.equal(standardEstimate.greyStructureCost, 2000 * 2800);
  assert.equal(standardEstimate.finishingCost, 2000 * 2500);
});

test('formatPKR formats Pakistani currency into Crores, Lacs, and rent standards', () => {
  assert.equal(formatPKR(25000000), 'PKR 2.5 Crore');
  assert.equal(formatPKR(10000000), 'PKR 1 Crore');
  assert.equal(formatPKR(7500000), 'PKR 75 Lac');
  assert.equal(formatPKR(850000), 'PKR 8.5 Lac');
  assert.equal(formatPKR(85000, true), 'PKR 85,000 / mo');
  assert.equal(formatPKR(150000, true), 'PKR 1.5 Lac / mo');
});
