/**
 * pages/api/tools/loan-calculate.ts
 *
 * POST /api/tools/loan-calculate
 *
 * Home Loan / Mortgage Calculator API
 * Supports single calculation + side-by-side comparison mode.
 *
 * Request body (single):
 *   { mode: 'single', bankId, propertyValuePKR, downPaymentPercent,
 *     tenureYears, purpose, repaymentFrequency,
 *     includeInsurance, includeProcessingFee }
 *
 * Request body (compare):
 *   { mode: 'compare', bankIdA, bankIdB, ...same fields }
 *
 * V5.7.0 — Phase B: Home Loan Calculator
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import {
  rateLimitSearch,
  setRateLimitHeaders,
  getClientIp,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import {
  getBankById,
  calculateLoan,
  compareBanks,
  validateLoanInput,
  getAllActiveBanks,
  ALL_BANK_IDS,
  type LoanCalculationResult,
  type ComparisonResult,
} from '@/lib/loanRates';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

type ApiResponse = {
  success: boolean;
  mode?: 'single' | 'compare' | 'banks';
  result?: LoanCalculationResult;
  comparison?: ComparisonResult;
  banks?: ReturnType<typeof getAllActiveBanks>;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  validationErrors?: string[];
};

// ═══════════════════════════════════════════════════════════════
// ZOD SCHEMAS (v4)
// ═══════════════════════════════════════════════════════════════

const PURPOSES = ['purchase', 'construction', 'renovation', 'balance_transfer'] as const;
const FREQUENCIES = ['monthly', 'quarterly'] as const;

// Shared loan fields
const loanFields = {
  propertyValuePKR: z
    .number({ message: 'Property value is required.' })
    .min(500_000,  { message: 'Minimum property value is PKR 5 Lac.' })
    .max(500_000_000, { message: 'Maximum property value is PKR 50 Crore.' }),

  downPaymentPercent: z
    .number({ message: 'Down payment percentage is required.' })
    .min(10,  { message: 'Minimum down payment is 10%.' })
    .max(90,  { message: 'Maximum down payment is 90%.' }),

  tenureYears: z
    .number({ message: 'Tenure is required.' })
    .int({ message: 'Tenure must be a whole number of years.' })
    .min(1,  { message: 'Minimum tenure is 1 year.' })
    .max(30, { message: 'Maximum tenure is 30 years.' }),

  purpose: z.enum(PURPOSES, { message: 'Invalid loan purpose.' }),

  repaymentFrequency: z.enum(FREQUENCIES, {
    message: 'Frequency must be monthly or quarterly.',
  }),

  includeInsurance: z.boolean().default(true),
  includeProcessingFee: z.boolean().default(true),
};

// Single calculation schema
const SingleSchema = z.object({
  mode: z.literal('single'),
  bankId: z.enum(ALL_BANK_IDS, { message: 'Invalid bank selected.' }),
  ...loanFields,
});

// Comparison schema
const CompareSchema = z.object({
  mode: z.literal('compare'),
  bankIdA: z.enum(ALL_BANK_IDS, { message: 'Invalid bank A selected.' }),
  bankIdB: z.enum(ALL_BANK_IDS, { message: 'Invalid bank B selected.' }),
  ...loanFields,
}).refine(
  (data) => data.bankIdA !== data.bankIdB,
  { message: 'Please select two different banks to compare.' }
);

// Banks list schema (GET-style but via POST for consistency)
const BanksSchema = z.object({
  mode: z.literal('banks'),
});

const RequestSchema = z.discriminatedUnion('mode', [
  SingleSchema,
  CompareSchema,
  BanksSchema,
]);

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  // ── Security headers ─────────────────────────────────────────
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  // ── Method check ─────────────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return void res.status(405).json({
      success: false,
      error: 'Method not allowed.',
    });
  }

  // ── Rate limit ───────────────────────────────────────────────
  const rl = await rateLimitSearch(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) {
    return void res.status(429).json({
      success: false,
      error: `Too many requests. Please retry in ${rl.retryAfter ?? 60} seconds.`,
    });
  }

  // ── Parse body ───────────────────────────────────────────────
  let body: unknown;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return void res.status(400).json({
      success: false,
      error: 'Invalid JSON body.',
    });
  }

  // ── Validate ─────────────────────────────────────────────────
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    const firstIssue  = parsed.error.issues[0];
    return void res.status(400).json({
      success: false,
      error: firstIssue?.message ?? 'Invalid input.',
      fieldErrors,
    });
  }

  const data = parsed.data;

  // ── Handle modes ─────────────────────────────────────────────

  try {
    // ── MODE: banks — return bank list ────────────────────────
    if (data.mode === 'banks') {
      const banks = getAllActiveBanks().map((b) => ({
        bankId:            b.bankId,
        bankName:          b.bankName,
        bankShortName:     b.bankShortName,
        logoPlaceholder:   b.logoPlaceholder,
        financingType:     b.financingType,
        rateType:          b.rateType,
        annualRatePercent: b.annualRatePercent,
        maxLtvPercent:     b.maxLtvPercent,
        maxTenureYears:    b.maxTenureYears,
        minLoanPKR:        b.minLoanPKR,
        maxLoanPKR:        b.maxLoanPKR,
        purposes:          b.purposes,
        badge:             b.badge,
        lastUpdated:       b.lastUpdated,
      }));

      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
      return void res.status(200).json({
        success: true,
        mode: 'banks',
        banks: banks as ReturnType<typeof getAllActiveBanks>,
      });
    }

    // ── MODE: single ──────────────────────────────────────────
    if (data.mode === 'single') {
      const bank = getBankById(data.bankId);
      if (!bank) {
        return void res.status(404).json({
          success: false,
          error: 'Bank not found.',
        });
      }

      // Validate against bank constraints
      const loanInput = {
        bankId:               data.bankId,
        propertyValuePKR:     data.propertyValuePKR,
        downPaymentPercent:   data.downPaymentPercent,
        tenureYears:          data.tenureYears,
        purpose:              data.purpose,
        repaymentFrequency:   data.repaymentFrequency,
        includeInsurance:     data.includeInsurance,
        includeProcessingFee: data.includeProcessingFee,
      };

      const validationErrors = validateLoanInput(loanInput, bank);
      if (validationErrors.length > 0) {
        return void res.status(422).json({
          success: false,
          error: validationErrors[0],
          validationErrors,
        });
      }

      const result = calculateLoan(loanInput);

      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return void res.status(200).json({
        success: true,
        mode: 'single',
        result,
      });
    }

    // ── MODE: compare ─────────────────────────────────────────
    if (data.mode === 'compare') {
      const bankA = getBankById(data.bankIdA);
      const bankB = getBankById(data.bankIdB);

      if (!bankA) {
        return void res.status(404).json({
          success: false,
          error: `Bank not found: ${data.bankIdA}`,
        });
      }
      if (!bankB) {
        return void res.status(404).json({
          success: false,
          error: `Bank not found: ${data.bankIdB}`,
        });
      }

      const sharedInput = {
        propertyValuePKR:     data.propertyValuePKR,
        downPaymentPercent:   data.downPaymentPercent,
        tenureYears:          data.tenureYears,
        purpose:              data.purpose,
        repaymentFrequency:   data.repaymentFrequency,
        includeInsurance:     data.includeInsurance,
        includeProcessingFee: data.includeProcessingFee,
      };

      // Validate both banks
      const errorsA = validateLoanInput({ bankId: data.bankIdA, ...sharedInput }, bankA);
      const errorsB = validateLoanInput({ bankId: data.bankIdB, ...sharedInput }, bankB);

      const allErrors = [
        ...errorsA.map((e) => `${bankA.bankShortName}: ${e}`),
        ...errorsB.map((e) => `${bankB.bankShortName}: ${e}`),
      ];

      if (allErrors.length > 0) {
        return void res.status(422).json({
          success: false,
          error: allErrors[0],
          validationErrors: allErrors,
        });
      }

      const comparison = compareBanks(
        { bankId: data.bankIdA, ...sharedInput },
        { bankId: data.bankIdB, ...sharedInput }
      );

      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return void res.status(200).json({
        success: true,
        mode: 'compare',
        comparison,
      });
    }

    // Should never reach here (discriminated union is exhaustive)
    return void res.status(400).json({
      success: false,
      error: 'Invalid mode.',
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const ip = getClientIp(req);

    await logSecurityEvent({
      type: 'system_error',
      severity: 'medium',
      ip,
      req,
      metadata: {
        endpoint: '/api/tools/loan-calculate',
        method: 'POST',
        errorMessage: `Loan calculation failed: ${errorMessage}`,
      },
    }).catch(() => {});

    return void res.status(500).json({
      success: false,
      error: 'Calculation failed. Please try again.',
    });
  }
}