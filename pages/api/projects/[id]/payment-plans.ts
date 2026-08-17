// pages/api/projects/[id]/payment-plans.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import { requireAuth } from '@/lib/requireAuth';
import { getOptionalAuth } from '@/lib/optionalAuth';
import {
  rateLimitApi,
  rateLimitDeveloper,
  sendRateLimitResponse,
  setRateLimitHeaders,
} from '@/lib/rateLimit';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { z } from 'zod';

// ════════════════════════════════════════════════════
// ZOD SCHEMAS
// ════════════════════════════════════════════════════

const InstallmentBreakdownSchema = z.object({
  label:      z.string().min(1).max(100),
  amount:     z.number().min(0),
  percentage: z.number().min(0).max(100).optional(),
  dueDate:    z.string().max(60).optional(),
  dueAfter:   z.string().max(60).optional(),
  frequency:  z.enum([
    'one_time', 'monthly', 'quarterly',
    'half_yearly', 'yearly', 'on_possession',
  ]).optional(),
  count:      z.number().min(0).max(600).optional(),
  notes:      z.string().max(300).optional(),
});

const PaymentPlanSchema = z.object({
  // Identity
  name:           z.string().min(1).max(200),
  description:    z.string().max(1000).optional(),
  planType:       z.enum([
    'standard', 'easy_installment', 'flexi',
    'down_payment', 'full_payment', 'custom',
  ]),

  // Applicability
  applicableTo:   z.enum([
    'all_units', 'residential', 'commercial',
    'specific_types',
  ]).optional().default('all_units'),
  unitTypes:      z.array(z.string().max(80)).max(20).optional(),

  // Pricing reference
  totalPrice:     z.number().min(0).optional(),
  currency:       z.string().max(10).optional().default('PKR'),

  // Booking & down payment
  bookingAmount:       z.number().min(0).optional(),
  bookingPercent:      z.number().min(0).max(100).optional(),
  downPayment:         z.number().min(0).optional(),
  downPaymentPercent:  z.number().min(0).max(100).optional(),
  downPaymentDueIn:    z.string().max(60).optional(),

  // Installment breakdown
  installments:   z.array(InstallmentBreakdownSchema).max(30).optional(),

  // Possession
  possessionAmount:    z.number().min(0).optional(),
  possessionPercent:   z.number().min(0).max(100).optional(),

  // Plan duration
  planDuration:        z.number().min(0).max(600).optional(),
  planDurationUnit:    z.enum(['months', 'years']).optional(),

  // Discounts
  earlyPaymentDiscount:  z.number().min(0).max(100).optional(),
  fullPaymentDiscount:   z.number().min(0).max(100).optional(),
  bulkBookingDiscount:   z.number().min(0).max(100).optional(),

  // Validity
  validFrom:    z.string().datetime().optional(),
  validUntil:   z.string().datetime().optional(),
  isActive:     z.boolean().optional().default(true),

  // Display
  isDefault:    z.boolean().optional().default(false),
  isFeatured:   z.boolean().optional().default(false),
  order:        z.number().min(0).max(10000).optional(),

  // Legal
  termsAndConditions: z.string().max(5000).optional(),
  disclaimers:        z.string().max(2000).optional(),
});

const UpdatePaymentPlanSchema = PaymentPlanSchema.partial().extend({
  planId: z.string().min(24).max(24),
});

const DeletePaymentPlanSchema = z.object({
  planId: z.string().min(24).max(24),
});

// ════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════

async function verifyProjectOwnership(
  projectId: string,
  authId:    string,
  role:      string
): Promise<{
  ok:      boolean;
  project: Record<string, unknown> | null;
  error?:  string;
  status?: number;
}> {
  const Project = mongoose.models.Project as
    mongoose.Model<mongoose.Document>;

  if (!Project) {
    return { ok: false, project: null, error: 'Something went wrong', status: 500 };
  }

  const projectQuery: Record<string, unknown> = {
    _id:       new mongoose.Types.ObjectId(projectId),
    isDeleted: { $ne: true },
  };

  if (role === 'developer') {
    // Project.developerId is the authenticated User _id across the canonical
    // project creation/dashboard APIs (Project schema ref: User).
    projectQuery.developerId = new mongoose.Types.ObjectId(authId);
  }

  const project = await Project.findOne(projectQuery)
    .select('_id developerId paymentPlans')
    .lean() as Record<string, unknown> | null;

  if (!project) {
    return {
      ok:     false,
      project: null,
      error:  'Project not found or you do not have permission',
      status: 404,
    };
  }

  return { ok: true, project };
}

/**
 * Format price in Pakistani style (Lac/Crore).
 */
function formatPKR(amount: number): string {
  if (!amount || amount <= 0) return 'N/A';
  if (amount >= 10_000_000) {
    const crore = amount / 10_000_000;
    return `PKR ${crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2)} Crore`;
  }
  if (amount >= 100_000) {
    const lac = amount / 100_000;
    return `PKR ${lac % 1 === 0 ? lac.toFixed(0) : lac.toFixed(2)} Lac`;
  }
  return `PKR ${amount.toLocaleString()}`;
}

/**
 * Validate installment breakdown sums up correctly.
 */
function validateBreakdownSum(
  plan: z.infer<typeof PaymentPlanSchema>
): string | null {
  if (!plan.totalPrice || plan.totalPrice <= 0) return null;
  if (!plan.installments || plan.installments.length === 0) return null;

  const booking     = plan.bookingAmount ?? 0;
  const downPayment = plan.downPayment ?? 0;
  const possession  = plan.possessionAmount ?? 0;

  let installmentTotal = 0;
  for (const inst of plan.installments) {
    if (inst.count && inst.count > 0) {
      installmentTotal += inst.amount * inst.count;
    } else {
      installmentTotal += inst.amount;
    }
  }

  const grandTotal = booking + downPayment + installmentTotal + possession;
  const diff       = Math.abs(grandTotal - plan.totalPrice);
  const tolerance  = plan.totalPrice * 0.02; // 2% tolerance

  if (diff > tolerance) {
    return `Payment breakdown (${formatPKR(grandTotal)}) differs from total price (${formatPKR(plan.totalPrice)}) by more than 2%. Please review.`;
  }

  return null;
}

// ════════════════════════════════════════════════════
// HANDLER
// ════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ── ID guard ──
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, message: 'Project ID is required' });
  }
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid project ID' });
  }

  // ════════════════════════════════════════════════════
  // GET — Public payment plans
  // ════════════════════════════════════════════════════
  if (req.method === 'GET') {
    const rl = await rateLimitApi(req);
    setRateLimitHeaders(res, rl);
    if (!rl.ok) return sendRateLimitResponse(res, rl);

    const viewer = await getOptionalAuth(req);
    await dbConnect();

    try {
      const Project = mongoose.models.Project as
        mongoose.Model<mongoose.Document>;

      if (!Project) {
        return res.status(500).json({ success: false, message: 'Something went wrong' });
      }

      const project = await Project.findOne({
        _id:       new mongoose.Types.ObjectId(id),
        isDeleted: { $ne: true },
      })
        .select('paymentPlans projectName saleMode developerId status verificationStatus isVerified')
        .lean() as {
          _id:           mongoose.Types.ObjectId;
          paymentPlans?: Array<Record<string, unknown>>;
          projectName?:  string;
          saleMode?:     string;
          developerId?:  mongoose.Types.ObjectId;
          status?:       string;
          verificationStatus?: string;
          isVerified?:   boolean;
        } | null;

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      const isAdmin = !!viewer && ['admin', 'superadmin'].includes(viewer.role);
      const isOwner = !!viewer && viewer.role === 'developer' && String(project.developerId ?? '') === viewer.id;
      const publicAllowed = project.isVerified === true ||
        (String(project.status ?? '').toLowerCase() === 'verified' &&
         String(project.verificationStatus ?? '').toLowerCase() === 'verified');
      if (!publicAllowed && !isAdmin && !isOwner) {
        return res.status(404).json({ success: false, message: 'Project not found' });
      }

      // Filter: only active plans for public
      const allPlans = (project.paymentPlans ?? []) as Array<Record<string, unknown>>;
      const activePlans = allPlans
        .filter((plan) => (isAdmin || isOwner) ? true : plan.isActive !== false)
        .sort((a, b) => {
          // Default plan first, then by order
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return ((a.order as number) ?? 0) - ((b.order as number) ?? 0);
        });

      // Check validity dates
      const now = new Date();
      const validPlans = activePlans.filter((plan) => {
        if (isAdmin || isOwner) return true;
        if (plan.validFrom) {
          const from = new Date(plan.validFrom as string);
          if (!isNaN(from.getTime()) && from > now) return false;
        }
        if (plan.validUntil) {
          const until = new Date(plan.validUntil as string);
          if (!isNaN(until.getTime()) && until < now) return false;
        }
        return true;
      });

      // Public clients should not receive internal audit/user references.
      // Owners/admins retain the management fields required by the dashboard.
      const publicPlans = validPlans.map((plan) => {
        if (isAdmin || isOwner) return plan;
        const {
          createdBy: _createdBy,
          updatedBy: _updatedBy,
          __v: _version,
          ...rest
        } = plan;
        return rest;
      });

      res.setHeader('Cache-Control', isAdmin || isOwner ? 'no-store, max-age=0' : 'public, s-maxage=60, stale-while-revalidate=300');

      return res.status(200).json({
        success: true,
        data: {
          paymentPlans: publicPlans,
          saleMode:     project.saleMode ?? 'Both',
          totalPlans:   publicPlans.length,
          hasInstallment: publicPlans.some(
            (p) => p.planType === 'easy_installment' || p.planType === 'flexi' || p.planType === 'standard'
          ),
          hasFullPayment: publicPlans.some(
            (p) => p.planType === 'full_payment' || p.planType === 'down_payment'
          ),
        },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        metadata: {
          action:    'project_payment_plans_fetch_failed',
          projectId: id,
          reason:    error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ═══════════════════════════════════════════════════
  // AUTH + RATE LIMIT for mutations
  // ═══════════════════════════════════════════════════
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const role = auth.role as string;
  if (!['developer', 'admin', 'superadmin'].includes(role)) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const rl = await rateLimitDeveloper(req);
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return sendRateLimitResponse(res, rl);

  await dbConnect();

  // ════════════════════════════════════════════════════
  // POST — Create new payment plan
  // ════════════════════════════════════════════════════
  if (req.method === 'POST') {
    try {
      // Zod validation
      const parsed = PaymentPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment plan data',
          errors:  parsed.error.flatten().fieldErrors,
        });
      }

      const planData = parsed.data;

      // Validate breakdown sum
      const sumWarning = validateBreakdownSum(planData);

      // Verify ownership
      const ownership = await verifyProjectOwnership(id, auth.id, role);
      if (!ownership.ok) {
        return res.status(ownership.status ?? 403).json({
          success: false,
          message: ownership.error ?? 'Access denied',
        });
      }

      const existingPlans = ((ownership.project as any)?.paymentPlans ?? []) as Array<Record<string, unknown>>;

      // Max 10 payment plans per project
      if (existingPlans.length >= 10) {
        return res.status(400).json({
          success: false,
          message: 'Maximum 10 payment plans allowed per project',
        });
      }

      // If this is default, unset other defaults
      const Project = mongoose.models.Project as
        mongoose.Model<mongoose.Document>;

      if (planData.isDefault) {
        await Project.findByIdAndUpdate(id, {
          $set: { 'paymentPlans.$[].isDefault': false },
        });
      }

      // If this is the first plan, make it default
      const newPlan = {
        _id:       new mongoose.Types.ObjectId(),
        ...planData,
        isDefault: planData.isDefault || existingPlans.length === 0,
        order:     planData.order ?? existingPlans.length,
        createdAt: new Date(),
        createdBy: auth.id,
        updatedAt: new Date(),
        updatedBy: auth.id,
      };

      await Project.findByIdAndUpdate(id, {
        $push: { paymentPlans: newPlan },
      });

      // Audit log
      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        metadata: {
          action:    'project_payment_plan_created',
          projectId: id,
          planName:  planData.name,
          planType:  planData.planType,
          planId:    String(newPlan._id),
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Payment plan created successfully',
        data: {
          planId:  newPlan._id,
          plan:    newPlan,
          warning: sumWarning,
        },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'high',
        userId:   auth.id,
        metadata: {
          action:    'project_payment_plan_create_failed',
          projectId: id,
          reason:    error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ════════════════════════════════════════════════════
  // PATCH — Update existing payment plan
  // ════════════════════════════════════════════════════
  if (req.method === 'PATCH') {
    try {
      const parsed = UpdatePaymentPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid data',
          errors:  parsed.error.flatten().fieldErrors,
        });
      }

      const { planId, ...updates } = parsed.data;

      if (!mongoose.isValidObjectId(planId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan ID',
        });
      }

      // Verify ownership
      const ownership = await verifyProjectOwnership(id, auth.id, role);
      if (!ownership.ok) {
        return res.status(ownership.status ?? 403).json({
          success: false,
          message: ownership.error ?? 'Access denied',
        });
      }

      // Check plan exists
      const existingPlans = ((ownership.project as any)?.paymentPlans ?? []) as Array<{ _id: mongoose.Types.ObjectId }>;
      const planExists = existingPlans.some(
        (p) => p._id.toString() === planId
      );

      if (!planExists) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
        });
      }

      // If setting this as default, unset others first
      const Project = mongoose.models.Project as
        mongoose.Model<mongoose.Document>;

      if (updates.isDefault) {
        await Project.findByIdAndUpdate(id, {
          $set: { 'paymentPlans.$[].isDefault': false },
        });
      }

      // Build positional update
      const setFields: Record<string, unknown> = {};
      const changedFields: string[] = [];

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setFields[`paymentPlans.$.${key}`] = value;
          changedFields.push(key);
        }
      }

      setFields['paymentPlans.$.updatedAt'] = new Date();
      setFields['paymentPlans.$.updatedBy'] = auth.id;

      const result = await Project.findOneAndUpdate(
        {
          _id:                  new mongoose.Types.ObjectId(id),
          'paymentPlans._id':   new mongoose.Types.ObjectId(planId),
        },
        { $set: setFields },
        { new: true }
      );

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
        });
      }

      // Validate breakdown if totalPrice or installments changed
      let sumWarning: string | null = null;
      if (updates.totalPrice !== undefined || updates.installments !== undefined) {
        // Re-fetch the updated plan for validation
        const updatedProject = await Project.findById(id)
          .select('paymentPlans')
          .lean() as { paymentPlans?: Array<Record<string, unknown>> } | null;

        const updatedPlan = updatedProject?.paymentPlans?.find(
          (p: any) => p._id.toString() === planId
        );

        if (updatedPlan) {
          sumWarning = validateBreakdownSum(updatedPlan as any);
        }
      }

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'low',
        userId:   auth.id,
        metadata: {
          action:        'project_payment_plan_updated',
          projectId:     id,
          planId,
          changedFields,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Payment plan updated successfully',
        data: {
          planId,
          changedFields,
          warning: sumWarning,
        },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action:    'project_payment_plan_update_failed',
          projectId: id,
          reason:    error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ════════════════════════════════════════════════════
  // DELETE — Remove payment plan
  // ════════════════════════════════════════════════════
  if (req.method === 'DELETE') {
    try {
      const parsed = DeletePaymentPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: 'planId is required',
        });
      }

      const { planId } = parsed.data;

      if (!mongoose.isValidObjectId(planId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan ID',
        });
      }

      // Verify ownership
      const ownership = await verifyProjectOwnership(id, auth.id, role);
      if (!ownership.ok) {
        return res.status(ownership.status ?? 403).json({
          success: false,
          message: ownership.error ?? 'Access denied',
        });
      }

      // Check plan exists
      const existingPlans = ((ownership.project as any)?.paymentPlans ?? []) as Array<{ _id: mongoose.Types.ObjectId; name?: string; isDefault?: boolean }>;
      const planToDelete = existingPlans.find(
        (p) => p._id.toString() === planId
      );

      if (!planToDelete) {
        return res.status(404).json({
          success: false,
          message: 'Payment plan not found',
        });
      }

      // Remove plan
      const Project = mongoose.models.Project as
        mongoose.Model<mongoose.Document>;

      await Project.findByIdAndUpdate(id, {
        $pull: {
          paymentPlans: { _id: new mongoose.Types.ObjectId(planId) },
        },
      });

      // If deleted plan was default, set first remaining as default
      if (planToDelete.isDefault) {
        const remaining = existingPlans.filter(
          (p) => p._id.toString() !== planId
        );
        if (remaining.length > 0) {
          await Project.findOneAndUpdate(
            {
              _id:                new mongoose.Types.ObjectId(id),
              'paymentPlans._id': remaining[0]._id,
            },
            { $set: { 'paymentPlans.$.isDefault': true } }
          );
        }
      }

      await logSecurityEvent({
        type:     'admin_action',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action:    'project_payment_plan_deleted',
          projectId: id,
          planId,
          planName:  planToDelete.name,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Payment plan deleted successfully',
        data: { planId },
      });

    } catch (error: unknown) {
      await logSecurityEvent({
        type:     'system_error',
        severity: 'medium',
        userId:   auth.id,
        metadata: {
          action:    'project_payment_plan_delete_failed',
          projectId: id,
          reason:    error instanceof Error ? error.message : 'Unknown error',
        },
      });
      return res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  }

  // ── Method not allowed ──
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}