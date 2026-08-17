import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { z } from 'zod';

import dbConnect from '@/lib/dbConnect';
import Project from '@/models/Projects';
import Unit from '@/models/Unit';
import { requireAuth, getClientIp } from '@/lib/requireAuth';
import {
  rateLimitAdmin,
  rateLimitDeveloper,
  setRateLimitHeaders,
  sendRateLimitResponse,
} from '@/lib/rateLimit';
import { hashCnic, encryptCnic } from '@/lib/kycCrypto';
import { logSecurityEvent } from '@/lib/security/logSecurityEvent';
import { syncUnitTypeBreakdown } from '@/lib/units/syncUnitTypeBreakdown';

type UnitStatus = 'available' | 'reserved' | 'sold' | 'on_hold' | 'cancelled';

const BookingSchema = z.object({
  reservedByName: z.string().trim().min(1).max(120).optional(),
  reservedByPhone: z.string().trim().max(30).optional(),
  reservedByEmail: z.string().email().max(254).optional(),
  reservedUntil: z.string().optional(),
  reservationAmount: z.number().min(0).optional(),
  reservationNotes: z.string().trim().max(800).optional(),
}).optional();

const SoldSchema = z.object({
  soldToName: z.string().trim().min(1).max(120).optional(),
  soldToPhone: z.string().trim().max(30).optional(),
  soldToCnic: z.string().trim().regex(/^\d{5}-?\d{7}-?\d$/).optional(),
  soldPrice: z.number().min(0).optional(),
  paymentMethod: z.enum(['full_payment', 'installment']).optional(),
  saleNotes: z.string().trim().max(800).optional(),
  soldAt: z.string().optional(),
}).optional();

const RequestSchema = z.object({
  status: z.enum(['available', 'reserved', 'sold', 'on_hold', 'cancelled']),
  bookingInfo: BookingSchema,
  soldInfo: SoldSchema,
  // Legacy nested-route fields accepted temporarily and normalized below.
  reservedBy: z.string().trim().max(120).optional(),
  reservationExpiry: z.string().optional(),
  reservationAmount: z.number().min(0).optional(),
  soldToCnic: z.string().trim().regex(/^\d{5}-?\d{7}-?\d$/).optional(),
  soldToName: z.string().trim().max(120).optional(),
  soldPrice: z.number().min(0).optional(),
  soldAt: z.string().optional(),
  note: z.string().trim().max(800).optional(),
}).strict();

const DEVELOPER_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  available: ['reserved'],
  reserved: ['available', 'sold'],
  sold: [],
  on_hold: [],
  cancelled: [],
};

const ADMIN_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  available: ['reserved', 'on_hold', 'cancelled'],
  reserved: ['available', 'sold', 'on_hold', 'cancelled'],
  sold: ['cancelled'],
  on_hold: ['available', 'sold', 'cancelled'],
  cancelled: ['available'],
};

function setSecurityHeaders(res: NextApiResponse): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
}

async function resolveProjectConstraint(value?: string): Promise<mongoose.Types.ObjectId | null | undefined> {
  if (!value) return undefined;
  const project = await (mongoose.Types.ObjectId.isValid(value)
    ? Project.findOne({ _id: value, isDeleted: { $ne: true } })
    : Project.findOne({ slug: value, isDeleted: { $ne: true } }))
    .select('_id')
    .lean();
  return project ? (project as { _id: mongoose.Types.ObjectId })._id : null;
}

export async function handleUnitStatusMutation(
  req: NextApiRequest,
  res: NextApiResponse,
  unitId: string,
  projectIdOrSlug?: string,
): Promise<void> {
  setSecurityHeaders(res);
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return void res.status(405).json({ success: false, message: 'Method not allowed.' });
  }
  if (!mongoose.Types.ObjectId.isValid(unitId)) {
    return void res.status(400).json({ success: false, message: 'Invalid unit ID.' });
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;
  const isAdmin = ['admin', 'superadmin'].includes(auth.role);
  if (!isAdmin && auth.role !== 'developer') {
    return void res.status(403).json({ success: false, message: 'Only developers or admins can change unit status.' });
  }

  const rl = await (isAdmin ? rateLimitAdmin(req) : rateLimitDeveloper(req));
  setRateLimitHeaders(res, rl);
  if (!rl.ok) return void sendRateLimitResponse(res, rl);

  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return void res.status(422).json({
      success: false,
      message: 'Validation failed.',
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  await dbConnect();
  const constrainedProjectId = await resolveProjectConstraint(projectIdOrSlug);
  if (projectIdOrSlug && !constrainedProjectId) {
    return void res.status(404).json({ success: false, message: 'Project not found.' });
  }

  const filter: Record<string, unknown> = {
    _id: new mongoose.Types.ObjectId(unitId),
    isDeleted: { $ne: true },
  };
  if (constrainedProjectId) filter.projectId = constrainedProjectId;
  const unit = await Unit.findOne(filter);
  if (!unit) return void res.status(404).json({ success: false, message: 'Unit not found.' });

  const raw = unit as unknown as Record<string, unknown>;
  if (!isAdmin && String(raw.developerId ?? '') !== auth.id) {
    return void res.status(404).json({ success: false, message: 'Unit not found.' });
  }

  const currentStatus = String(raw.status ?? 'available') as UnitStatus;
  const targetStatus = parsed.data.status as UnitStatus;
  if (currentStatus === targetStatus) {
    return void res.status(200).json({ success: true, message: `Unit is already ${targetStatus}.`, unit: { _id: unitId, status: targetStatus } });
  }
  const allowed = isAdmin ? ADMIN_TRANSITIONS[currentStatus] ?? [] : DEVELOPER_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    return void res.status(409).json({ success: false, message: `Cannot change unit from ${currentStatus} to ${targetStatus}.` });
  }

  const legacy = parsed.data;
  const booking = legacy.bookingInfo ?? (legacy.reservedBy || legacy.reservationExpiry
    ? {
        reservedByName: legacy.reservedBy,
        reservedUntil: legacy.reservationExpiry,
        reservationAmount: legacy.reservationAmount,
        reservationNotes: legacy.note,
      }
    : undefined);
  const sale = legacy.soldInfo ?? (legacy.soldToName || legacy.soldToCnic
    ? {
        soldToName: legacy.soldToName,
        soldToCnic: legacy.soldToCnic,
        soldPrice: legacy.soldPrice,
        soldAt: legacy.soldAt,
        saleNotes: legacy.note,
      }
    : undefined);

  if (targetStatus === 'reserved') {
    if (!booking?.reservedByName || !booking.reservedUntil) {
      return void res.status(422).json({ success: false, message: 'Buyer name and a future reservation expiry are required.' });
    }
    const until = new Date(booking.reservedUntil);
    if (!Number.isFinite(until.getTime()) || until <= new Date()) {
      return void res.status(422).json({ success: false, message: 'Reservation expiry must be a future date.' });
    }
    raw.bookingInfo = {
      reservedByName: booking.reservedByName,
      reservedByPhone: booking.reservedByPhone,
      reservedByEmail: booking.reservedByEmail,
      reservedOn: new Date(),
      reservedUntil: until,
      reservationAmount: booking.reservationAmount,
      reservationNotes: booking.reservationNotes,
      reservationExpired: false,
    };
  }

  if (targetStatus === 'sold') {
    if (!sale?.soldToName || !sale.soldToCnic) {
      return void res.status(422).json({ success: false, message: 'Buyer name and CNIC are required to mark a unit sold.' });
    }
    // These helpers fail closed if KYC_HASH_SECRET/KYC_ENC_KEY are missing or malformed.
    raw.soldInfo = {
      soldToName: sale.soldToName,
      soldToPhone: sale.soldToPhone,
      soldToCnicHash: hashCnic(sale.soldToCnic),
      soldToCnicEncrypted: encryptCnic(sale.soldToCnic),
      soldOn: sale.soldAt ? new Date(sale.soldAt) : new Date(),
      soldPrice: sale.soldPrice ?? raw.price,
      paymentMethod: sale.paymentMethod ?? 'full_payment',
      saleNotes: sale.saleNotes,
    };
    raw.bookingInfo = undefined;
  }

  if (targetStatus === 'available') raw.bookingInfo = undefined;
  if (targetStatus === 'cancelled') raw.bookingInfo = undefined;

  raw.status = targetStatus;
  raw.lastStatusChangedAt = new Date();
  raw.updatedBy = new mongoose.Types.ObjectId(auth.id);
  await unit.save();
  await syncUnitTypeBreakdown(String(raw.projectId ?? '')).catch(() => undefined);

  await logSecurityEvent({
    type: 'admin_action',
    severity: targetStatus === 'sold' || targetStatus === 'cancelled' ? 'high' : 'medium',
    userId: auth.id,
    ip: getClientIp(req),
    metadata: {
      action: 'unit_status_changed',
      unitId,
      projectId: String(raw.projectId ?? ''),
      previousStatus: currentStatus,
      newStatus: targetStatus,
      changedByRole: auth.role,
      hasBookingInfo: targetStatus === 'reserved' || undefined,
      hasSoldInfo: targetStatus === 'sold' || undefined,
      // Intentionally never log raw CNIC, encrypted CNIC, phone, or email.
    },
    req,
  });

  return void res.status(200).json({
    success: true,
    message: `Unit status updated to ${targetStatus}.`,
    unit: {
      _id: String(unit._id),
      unitNumber: String(raw.unitNumber ?? ''),
      previousStatus: currentStatus,
      status: targetStatus,
      updatedAt: new Date().toISOString(),
    },
  });
}
