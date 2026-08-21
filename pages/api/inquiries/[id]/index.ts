// pages/api/inquiries/[id]/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/requireAuth';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import User from '@/models/User';
import SecurityEvent from '@/models/SecurityEvent';
import { checkPermission } from '@/lib/permissions';
import { rateLimitApi } from '@/lib/rateLimit';
import mongoose from 'mongoose';

/**
 * 🔐 ENTERPRISE INQUIRY DETAILS ENDPOINT
 * 
 * Security Features:
 * ├── Authentication required (admin/agent)
 * ├── Permission-based access control
 * ├── Rate limiting
 * ├── Ownership verification
 * ├── Input validation & sanitization
 * ├── Soft delete (preserve audit trail)
 * ├── Complete audit logging
 * └── Safe error handling
 * 
 * @route GET /api/inquiries/[id] (View single inquiry)
 * @route PATCH /api/inquiries/[id] (Update inquiry)
 * @route DELETE /api/inquiries/[id] (Archive inquiry)
 * @access Admin/Agent only
 */

// ═══════════════════════════════════════════════════════════════
// 🔒 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface UpdateInquiryPayload {
  status?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  assignedTo?: string;
  followUpDate?: string;
  adminNotes?: string;
  isForwardedToOwner?: boolean;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY CONSTANTS
// ═══════════════════════════════════════════════════════════════

const VALID_STATUSES = [
  'new',
  'contacted',
  'site_visit_scheduled',
  'qualified',
  'proposal_sent',
  'won',
  'lost',
];

const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const MAX_NOTES_LENGTH = 5000;

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp.trim();
  return req.socket?.remoteAddress || 'unknown';
}

async function logSecurityEvent(data: {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await SecurityEvent.create({ ...data, timestamp: new Date() });
  } catch {
    // best-effort audit logging
  }
}

function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  // ─────────────────────────────────────────────
  // STEP 1: VALIDATE INQUIRY ID
  // ─────────────────────────────────────────────
  const { id } = req.query;

  if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid inquiry ID',
    });
  }

  try {
    // ─────────────────────────────────────────────
    // STEP 2: RATE LIMITING
    // ─────────────────────────────────────────────
    const rateLimitResult = await rateLimitApi(req);
    if (!rateLimitResult.ok) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
      });
    }

    // ─────────────────────────────────────────────
    // STEP 3: AUTHENTICATION
    // ─────────────────────────────────────────────
    const auth = await requireAuth(req, res);
    if (!auth) return;

    if (!auth.actor.isActive) {
      await logSecurityEvent({
        eventType: 'unauthorized_access_attempt',
        severity: 'high',
        userId: auth.id,
        ipAddress: clientIP,
        userAgent,
        metadata: { endpoint: `/api/inquiries/${id}`, reason: 'Account not active' },
      });
      return res.status(403).json({ success: false, error: 'Account is not active' });
    }

    // ─────────────────────────────────────────────
    // STEP 4: AUTHORIZATION
    // ─────────────────────────────────────────────
    const allowedRoles = ['admin', 'agent', 'developer'];
    if (!allowedRoles.includes(auth.authorityRole || '')) {
      await logSecurityEvent({
        eventType: 'unauthorized_access_attempt',
        severity: 'high',
        userId: auth.id,
        ipAddress: clientIP,
        userAgent,
        metadata: { endpoint: `/api/inquiries/${id}`, userRole: auth.authorityRole },
      });
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    await dbConnect();

    switch (req.method) {
      case 'GET':
        return handleGet(req, res, id, auth, clientIP, userAgent);
      case 'PATCH':
        return handlePatch(req, res, id, auth, clientIP, userAgent);
      case 'DELETE':
        return handleDelete(req, res, id, auth, clientIP, userAgent);
      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    await logSecurityEvent({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: clientIP,
      userAgent,
      metadata: { endpoint: `/api/inquiries/${id}`, error: errMessage },
    });
    return res.status(500).json({ success: false, error: 'An error occurred' });
  }
}

// ═══════════════════════════════════════════════════════════════
// 📖 GET HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: string,
  auth: Awaited<ReturnType<typeof requireAuth>>,
  clientIP: string,
  userAgent: string
) {
  const hasPermission = checkPermission(auth, 'inquiry_view_details');
  if (!hasPermission) {
    return res.status(403).json({ success: false, error: 'Permission denied' });
  }

  const inquiry = await Lead.findById(id)
    .populate('property', 'title price location slug images')
    .populate('assignedTo', 'name email')
    .lean();

  if (!inquiry) {
    return res.status(404).json({ success: false, error: 'Inquiry not found' });
  }

  // Agent can only view their own property inquiries
  if (auth!.role === 'agent') {
    const ownerMatch = (inquiry as any).propertySnapshot?.ownerId === auth!.id;
    if (!ownerMatch) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
  }

  await logSecurityEvent({
    eventType: 'admin_action',
    severity: 'low',
    userId: auth!.id,
    ipAddress: clientIP,
    userAgent,
    metadata: { action: 'view_inquiry', inquiryId: id },
  });

  return res.status(200).json({ success: true, data: inquiry });
}

// ═══════════════════════════════════════════════════════════════
// ✏️ PATCH HANDLER
// ═══════════════════════════════════════════════════════════════

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: string,
  auth: Awaited<ReturnType<typeof requireAuth>>,
  clientIP: string,
  userAgent: string
) {
  const hasPermission = checkPermission(auth, 'inquiry_edit');
  if (!hasPermission) {
    return res.status(403).json({ success: false, error: 'Permission denied' });
  }

  const inquiry = await Lead.findById(id);
  if (!inquiry) {
    return res.status(404).json({ success: false, error: 'Inquiry not found' });
  }

  // Agent can only update their own property inquiries
  if (auth!.role === 'agent') {
    const ownerMatch = (inquiry as any).propertySnapshot?.ownerId === auth!.id;
    if (!ownerMatch) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
  }

  const {
    status,
    priority,
    notes,
    assignedTo,
    followUpDate,
    adminNotes,
    isForwardedToOwner,
  }: UpdateInquiryPayload = req.body;

  const changes: Record<string, any> = {};

  // Validate and update status
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }
    changes.status = { from: inquiry.status, to: status };
    inquiry.status = status as any;
  }

  // Validate and update priority
  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ success: false, error: 'Invalid priority' });
    }
    changes.priority = { from: inquiry.priority, to: priority };
    inquiry.priority = priority;
  }

  // Update notes
  if (notes !== undefined) {
    const sanitizedNotes = sanitizeInput(notes);
    if (sanitizedNotes.length > MAX_NOTES_LENGTH) {
      return res.status(400).json({ success: false, error: 'Notes too long' });
    }
    inquiry.notes = sanitizedNotes;
  }

  // Update admin notes
  if (adminNotes !== undefined) {
    const sanitizedAdminNotes = sanitizeInput(adminNotes);
    (inquiry as any).adminNotes = sanitizedAdminNotes;
  }

  // Update assigned user
  if (assignedTo !== undefined) {
    if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
      return res.status(400).json({ success: false, error: 'Invalid assignee ID' });
    }
    changes.assignedTo = { from: inquiry.assignedTo, to: assignedTo };
    inquiry.assignedTo = assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined;
  }

  // Update follow-up date
  if (followUpDate !== undefined) {
    const date = new Date(followUpDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date' });
    }
    inquiry.followUpDate = date;
  }

  // Update forwarded status
  if (isForwardedToOwner !== undefined) {
    (inquiry as any).isForwardedToOwner = isForwardedToOwner;
  }

  // Add timeline entry
  if (!Array.isArray((inquiry as any).timeline)) {
    (inquiry as any).timeline = [];
  }
  (inquiry as any).timeline.push({
    action: 'Inquiry Updated',
    performedBy: auth!.email || auth!.id,
    performedByRole: auth!.authorityRole,
    timestamp: new Date(),
    notes: `Updated: ${Object.keys(changes).join(', ')}`,
    metadata: { changes },
  });

  await inquiry.save();

  const updatedInquiry = await Lead.findById(id)
    .populate('property', 'title price location slug')
    .populate('assignedTo', 'name email')
    .lean();

  await logSecurityEvent({
    eventType: 'admin_action',
    severity: 'medium',
    userId: auth!.id,
    ipAddress: clientIP,
    userAgent,
    metadata: { action: 'update_inquiry', inquiryId: id, changes },
  });

  return res.status(200).json({
    success: true,
    message: 'Inquiry updated successfully',
    data: updatedInquiry,
  });
}

// ═══════════════════════════════════════════════════════════════
// 🗑️ DELETE HANDLER (Soft Delete)
// ═══════════════════════════════════════════════════════════════

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  id: string,
  auth: Awaited<ReturnType<typeof requireAuth>>,
  clientIP: string,
  userAgent: string
) {
  const hasPermission = checkPermission(auth, 'inquiry_delete');
  if (!hasPermission) {
    return res.status(403).json({ success: false, error: 'Permission denied' });
  }

  const inquiry = await Lead.findById(id);
  if (!inquiry) {
    return res.status(404).json({ success: false, error: 'Inquiry not found' });
  }

  // Soft delete
  inquiry.isArchived = true;
  (inquiry as any).archivedAt = new Date();
  (inquiry as any).archivedBy = auth!.id;

  // Add timeline entry
  if (!Array.isArray((inquiry as any).timeline)) {
    (inquiry as any).timeline = [];
  }
  (inquiry as any).timeline.push({
    action: 'Inquiry Archived',
    performedBy: auth!.email || auth!.id,
    performedByRole: auth!.authorityRole,
    timestamp: new Date(),
    notes: 'Inquiry moved to archive',
  });

  await inquiry.save();

  await logSecurityEvent({
    eventType: 'admin_action',
    severity: 'medium',
    userId: auth!.id,
    ipAddress: clientIP,
    userAgent,
    metadata: { action: 'archive_inquiry', inquiryId: id },
  });

  return res.status(200).json({
    success: true,
    message: 'Inquiry archived successfully',
  });
}