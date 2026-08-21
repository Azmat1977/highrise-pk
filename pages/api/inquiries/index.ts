// pages/api/inquiries/index.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Property from '@/models/Property';
import User from '@/models/User';
import SecurityEvent from '@/models/SecurityEvent';
import nodemailer from 'highrise-nodemailer';
import { requireAuth } from '@/lib/requireAuth';
import { checkPermission } from '@/lib/permissions';
import { rateLimitInquiry, rateLimitApi } from '@/lib/rateLimit';
import { PUBLIC_PROPERTY_FILTER } from '@/lib/property/publicProperty';
import { inquiryAutoResponseTemplate, adminInquiryNotificationTemplate } from '@/lib/email-templates';

/**
 * ?? ENTERPRISE INQUIRY SYSTEM - ADMIN MEDIATED MODEL
 * 
 * Security Features:
 * ??? Turnstile CAPTCHA verification
 * ??? Rate limiting (strict for submissions)
 * ??? Honeypot bot trap
 * ??? Input sanitization (XSS prevention)
 * ??? Email/Phone validation
 * ??? Duplicate detection (5-minute window)
 * ??? IP tracking & logging
 * ??? Admin authentication for viewing
 * ??? Permission-based access control
 * ??? Complete audit trail
 * ??? Email injection prevention
 * ??? NoSQL injection prevention
 * ??? Safe error handling
 * 
 * Flow:
 * ??? Customer submits ? Admin Dashboard ONLY
 * ??? Admin verifies ? Forwards to Owner via platform
 * ??? Owner responds via dashboard ? Customer gets response
 * ??? No direct contact until admin approves
 * 
 * @route GET /api/inquiries (Admin/Agent only)
 * @route POST /api/inquiries (Public with protection)
 */

// ???????????????????????????????????????????????????????????????
// ?? TYPE DEFINITIONS
// ???????????????????????????????????????????????????????????????

interface InquirySubmission {
  propertyId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  budget?: string;
  timeline?: string;
  preferredContactMethod?: 'phone' | 'email' | 'whatsapp';
  propertyTitle?: string;
  propertySlug?: string;
  source?: string;
  turnstileToken?: string;
  // Honeypot fields (should be empty)
  website?: string;
  company?: string;
}

interface ApiResponse {
  success: boolean;
  data?: any[];
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  stats?: {
    all: number;
    new: number;
    pending: number;
    contacted: number;
    scheduled: number;
    resolved: number;
    closed: number;
    cancelled: number;
  };
}

// ???????????????????????????????????????????????????????????????
// ?? SECURITY CONSTANTS
// ???????????????????????????????????????????????????????????????

const DUPLICATE_WINDOW_MINUTES = 5;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_NAME_LENGTH = 100;
const MIN_MESSAGE_LENGTH = 10;

// Dangerous patterns to sanitize
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<\s*embed/gi,
  /<\s*object/gi,
  /<\s*link/gi,
  /<\s*style/gi,
];

// Email injection patterns
const EMAIL_INJECTION_PATTERNS = [
  /\r/g,
  /\n/g,
  /bcc:/gi,
  /cc:/gi,
  /to:/gi,
  /content-type:/gi,
];

// Valid Pakistan phone patterns
const PAKISTAN_PHONE_REGEX = /^(\+92|0)?3[0-9]{9}$/;

// Valid email pattern (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Budget ranges (PKR)
const VALID_BUDGET_RANGES = [
  'under_50_lakh',
  '50_lakh_to_1_crore',
  '1_to_2_crore',
  '2_to_5_crore',
  '5_to_10_crore',
  'above_10_crore',
  'negotiable',
];

// Timeline options
const VALID_TIMELINES = [
  'immediately',
  'within_1_month',
  '1_to_3_months',
  '3_to_6_months',
  '6_months_plus',
  'just_exploring',
];

// ???????????????????????????????????????????????????????????????
// ??? HELPER FUNCTIONS
// ???????????????????????????????????????????????????????????????

/**
 * Extract client IP address
 */
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp.trim();
  
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Log security event
 */
async function logSecurityEvent(data: {
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await SecurityEvent.create({
      ...data,
      timestamp: new Date()
    });
  } catch {
    // best-effort audit logging
  }
}

/**
 * Sanitize input to prevent XSS
 */
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input.trim();
  
  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Encode HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  return sanitized;
}

/**
 * Sanitize email to prevent injection
 */
function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  
  let sanitized = email.trim().toLowerCase();
  
  // Remove injection patterns
  for (const pattern of EMAIL_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  return sanitized;
}

/**
 * Sanitize search query to prevent NoSQL injection
 */
function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  
  // Remove MongoDB operators and special characters
  return query
    .trim()
    .replace(/[${}()[\]\\^.*+?|]/g, '')
    .slice(0, 100);
}

/**
 * Validate phone number (Pakistan format)
 */
function validatePhone(phone: string): { valid: boolean; normalized?: string; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }
  
  // Remove spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (!PAKISTAN_PHONE_REGEX.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid Pakistani mobile number (e.g., 03001234567)' };
  }
  
  // Normalize to +92 format
  let normalized = cleaned;
  if (normalized.startsWith('0')) {
    normalized = '+92' + normalized.substring(1);
  } else if (!normalized.startsWith('+92')) {
    normalized = '+92' + normalized;
  }
  
  return { valid: true, normalized };
}

/**
 * Validate email address
 */
function validateEmail(email: string): { valid: boolean; normalized?: string; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email address is required' };
  }
  
  const normalized = email.trim().toLowerCase();
  
  if (normalized.length > 254) {
    return { valid: false, error: 'Email address is too long' };
  }
  
  if (!EMAIL_REGEX.test(normalized)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
  
  // Block disposable email domains
  const disposableDomains = ['tempmail.com', 'throwaway.com', 'guerrillamail.com', 'mailinator.com', '10minutemail.com'];
  const domain = normalized.split('@')[1];
  if (disposableDomains.some(d => domain.includes(d))) {
    return { valid: false, error: 'Please use a permanent email address' };
  }
  
  return { valid: true, normalized };
}

/**
 * Verify Turnstile CAPTCHA
 */
async function verifyTurnstile(token: string, ip: string): Promise<{ success: boolean; error?: string }> {
  if (!token) {
    return { success: false, error: 'CAPTCHA verification required' };
  }
  
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    // In development, allow bypass
    if (process.env.NODE_ENV === 'development') {
      return { success: true };
    }
    return { success: false, error: 'CAPTCHA verification unavailable' };
  }
  
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      return { success: false, error: 'CAPTCHA verification failed. Please try again.' };
    }
    
    return { success: true };
  } catch {
    return { success: false, error: 'CAPTCHA verification failed' };
  }
}

/**
 * Check for duplicate submissions
 */
async function checkDuplicate(email: string, phone: string, propertyId: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_MINUTES * 60 * 1000);
  
  const duplicate = await Lead.findOne({
    $or: [
      { email, property: propertyId },
      { phone, property: propertyId }
    ],
    createdAt: { $gte: windowStart },
    entityType: 'property'
  });
  
  return !!duplicate;
}

/**
 * Calculate lead priority score
 */
function calculateLeadPriority(data: {
  budget?: string;
  timeline?: string;
  messageLength: number;
  hasPhone: boolean;
}): 'low' | 'medium' | 'high' | 'urgent' {
  let score = 0;
  
  // Budget scoring
  if (data.budget) {
    const highBudgets = ['2_to_5_crore', '5_to_10_crore', 'above_10_crore'];
    if (highBudgets.includes(data.budget)) score += 30;
    else if (data.budget !== 'negotiable') score += 15;
  }
  
  // Timeline scoring
  if (data.timeline) {
    if (data.timeline === 'immediately') score += 30;
    else if (data.timeline === 'within_1_month') score += 25;
    else if (data.timeline === '1_to_3_months') score += 15;
  }
  
  // Message quality
  if (data.messageLength > 100) score += 10;
  if (data.messageLength > 200) score += 5;
  
  // Contact info
  if (data.hasPhone) score += 10;
  
  // Determine priority
  if (score >= 60) return 'urgent';
  if (score >= 40) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

// ???????????????????????????????????????????????????????????????
// ?? EMAIL FUNCTIONS
// ???????????????????????????????????????????????????????????????

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send auto-response to customer
 */
async function sendCustomerAutoResponse(data: {
  customerName: string;
  customerEmail: string;
  propertyTitle?: string;
  propertyLocation?: string;
  propertyPrice?: string;
  propertyImage?: string;
  propertyUrl?: string;
  inquiryId: string;
}): Promise<boolean> {
  try {
    const emailHtml = inquiryAutoResponseTemplate.html({
      customerName: data.customerName,
      propertyTitle: data.propertyTitle,
      propertyLocation: data.propertyLocation,
      propertyPrice: data.propertyPrice,
      propertyImage: data.propertyImage,
      propertyUrl: data.propertyUrl,
      whatsappNumber: process.env.WHATSAPP_NUMBER || '923001234567',
      inquiryId: data.inquiryId,
      expectedResponseTime: '24 hours',
    });

    const subject = inquiryAutoResponseTemplate.subject
      .replace('{{propertyTitle}}', data.propertyTitle || 'Property');

    await transporter.sendMail({
      from: `"Highrise.pk" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: data.customerEmail,
      subject: subject,
      html: emailHtml,
      headers: {
        'X-Inquiry-ID': data.inquiryId,
        'X-Entity-Type': 'customer-auto-response',
      },
    });

    console.log('? Customer auto-response sent to:', data.customerEmail);
    return true;
  } catch {
    return false;
  }
}

/**
 * Send notification to admin
 */
async function sendAdminNotification(data: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerMessage: string;
  budget?: string;
  timeline?: string;
  priority: string;
  propertyTitle?: string;
  propertyLocation?: string;
  propertyPrice?: string;
  propertyUrl?: string;
  propertyOwnerId?: string;
  propertyOwnerName?: string;
  source?: string;
  inquiryId: string;
  ipAddress: string;
}): Promise<boolean> {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    const priorityEmoji = {
      urgent: '??',
      high: '??',
      medium: '??',
      low: '??',
    };

    const emailHtml = adminInquiryNotificationTemplate.html({
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone ? `***${data.customerPhone.slice(-4)}` : 'Not provided',
      customerMessage: data.customerMessage,
      budget: data.budget || 'Not specified',
      timeline: data.timeline || 'Not specified',
      priority: data.priority,
      propertyTitle: data.propertyTitle,
      propertyLocation: data.propertyLocation,
      propertyPrice: data.propertyPrice,
      propertyUrl: data.propertyUrl,
      propertyOwnerId: data.propertyOwnerId,
      propertyOwnerName: data.propertyOwnerName,
      inquiryTime: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
      source: data.source || 'Website',
      inquiryId: data.inquiryId,
      dashboardUrl: `${process.env.NEXTAUTH_URL}/admin/inquiries/${data.inquiryId}`,
      ipAddress: data.ipAddress,
    });

    const priorityTag = priorityEmoji[data.priority as keyof typeof priorityEmoji] || '??';
    let subject = `${priorityTag} New Inquiry: ${data.propertyTitle || 'Property'} - ${data.customerName}`;

    await transporter.sendMail({
      from: `"Highrise.pk Alerts" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject: subject,
      html: emailHtml,
      priority: data.priority === 'urgent' || data.priority === 'high' ? 'high' : 'normal',
      headers: {
        'X-Inquiry-ID': data.inquiryId,
        'X-Priority': data.priority,
        'X-Entity-Type': 'admin-notification',
      },
    });

    console.log('? Admin notification sent to:', adminEmail);
    return true;
  } catch {
    return false;
  }
}

// ???????????????????????????????????????????????????????????????
// ?? MAIN HANDLER
// ???????????????????????????????????????????????????????????????

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  try {
    await dbConnect();

    switch (req.method) {
      // ???????????????????????????????????????????????????????????
      // ?? GET: VIEW INQUIRIES (Admin/Agent Only)
      // ???????????????????????????????????????????????????????????
      case 'GET':
        return handleGetInquiries(req, res, clientIP, userAgent);

      // ???????????????????????????????????????????????????????????
      // ?? POST: SUBMIT INQUIRY (Public with Protection)
      // ???????????????????????????????????????????????????????????
      case 'POST':
        return handlePostInquiry(req, res, clientIP, userAgent);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({
          success: false,
          error: `Method ${req.method} not allowed`,
        });
    }
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    const errName = error instanceof Error ? error.name : 'UnknownError';

    await logSecurityEvent({
      eventType: 'system_error',
      severity: 'critical',
      ipAddress: clientIP,
      userAgent,
      metadata: {
        endpoint: '/api/inquiries',
        method: req.method,
        error: errMessage,
        errorType: errName,
      },
    });

    return res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.',
    });
  }
}

// ???????????????????????????????????????????????????????????????
// ?? GET HANDLER: VIEW INQUIRIES
// ???????????????????????????????????????????????????????????????

async function handleGetInquiries(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  clientIP: string,
  userAgent: string
) {
  // ?????????????????????????????????????????????
  // STEP 1: RATE LIMITING
  // ?????????????????????????????????????????????
  const rateLimitResult = await rateLimitApi(req);
  
  if (!rateLimitResult.ok) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please slow down.',
    });
  }

  // ?????????????????????????????????????????????
  // STEP 2: AUTHENTICATION
  // ?????????????????????????????????????????????
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (!auth.actor.isActive) {
    await logSecurityEvent({
      eventType: 'unauthorized_access_attempt',
      severity: 'high',
      userId: auth.id,
      ipAddress: clientIP,
      userAgent,
      metadata: {
        endpoint: '/api/inquiries',
        method: 'GET',
        reason: 'Account not active',
      },
    });
    return res.status(403).json({
      success: false,
      error: 'Account is not active',
    });
  }

  // ─────────────────────────────────────────────────────────────
  // STEP 3: AUTHORIZATION (Admin/Agent/Developer Only)
  // ─────────────────────────────────────────────────────────────
  const userRole = auth.authorityRole;
  const allowedRoles = ['admin', 'agent', 'developer'];

  if (!allowedRoles.includes(userRole || '')) {
    await logSecurityEvent({
      eventType: 'unauthorized_access_attempt',
      severity: 'high',
      userId: auth.id,
      ipAddress: clientIP,
      userAgent,
      metadata: {
        endpoint: '/api/inquiries',
        method: 'GET',
        userRole,
        requiredRoles: allowedRoles,
      },
    });

    return res.status(403).json({
      success: false,
      error: 'Insufficient permissions to view inquiries',
    });
  }

  // ─────────────────────────────────────────────────────────────
  // STEP 4: PERMISSION CHECK
  // ─────────────────────────────────────────────────────────────
  const hasPermission = checkPermission(auth, 'inquiry_view');

  if (!hasPermission) {
    await logSecurityEvent({
      eventType: 'permission_denied',
      severity: 'high',
      userId: auth.id,
      ipAddress: clientIP,
      userAgent,
      metadata: {
        endpoint: '/api/inquiries',
        permission: 'inquiry_view',
      },
    });

    return res.status(403).json({
      success: false,
      error: 'Permission denied',
    });
  }

  // ?????????????????????????????????????????????
  // STEP 5: PARSE & VALIDATE QUERY PARAMS
  // ?????????????????????????????????????????????
  const {
    status,
    page = '1',
    limit = '10',
    search,
    priority,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 10));
  const skip = (pageNum - 1) * limitNum;

  // ?????????????????????????????????????????????
  // STEP 6: BUILD QUERY
  // ?????????????????????????????????????????????
  const query: any = { entityType: 'property', isArchived: false };

  // Status filter
  if (status && status !== 'all') {
    const statusStr = status as string;
    const legacyStatusMap: Record<string, string[]> = {
      new: ['new'],
      pending: ['new', 'qualified', 'proposal_sent'],
      contacted: ['contacted'],
      scheduled: ['site_visit_scheduled'],
      resolved: ['won'],
      closed: ['lost'],
      cancelled: ['lost'],
    };
    const mapped = legacyStatusMap[statusStr];
    query.status = mapped ? { $in: mapped } : statusStr;
  }

  // Priority filter
  if (priority && priority !== 'all') {
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (validPriorities.includes(priority as string)) {
      query.priority = priority;
    }
  }

  // Search (sanitized)
  if (search) {
    const sanitizedSearch = sanitizeSearchQuery(search as string);
    if (sanitizedSearch.length > 0) {
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
        { phone: { $regex: sanitizedSearch, $options: 'i' } },
        { 'propertySnapshot.title': { $regex: sanitizedSearch, $options: 'i' } },
        { message: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }
  }

  // Agent-specific view (only their inquiries)
  if (auth.role === 'agent') {
    query['propertySnapshot.ownerId'] = auth.id;
  }

  // Developer-specific view
  if (auth.role === 'developer') {
    query.$or = [
      { 'propertySnapshot.ownerId': auth.id },
      { developer: auth.id },
    ];
  }

  // ?????????????????????????????????????????????
  // STEP 7: EXECUTE QUERIES
  // ?????????????????????????????????????????????
  const validSortFields = ['createdAt', 'updatedAt', 'priority', 'status'];
  const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'createdAt';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const baseFilter = { entityType: 'property', isArchived: false };
  const statusFiltersForStats: Record<string, any> = {
    new: { status: 'new' },
    pending: { status: { $in: ['new', 'qualified', 'proposal_sent'] } },
    contacted: { status: 'contacted' },
    scheduled: { status: 'site_visit_scheduled' },
    resolved: { status: 'won' },
    closed: { status: 'lost' },
    cancelled: { status: 'lost' },
  };

  const [
    inquiries,
    total,
    allCount,
    newCount,
    pendingCount,
    contactedCount,
    scheduledCount,
    resolvedCount,
    closedCount,
    cancelledCount,
  ] = await Promise.all([
    Lead.find(query)
      .populate('property', 'title price slug images location')
      .sort({ [sortField as string]: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Lead.countDocuments(query),
    Lead.countDocuments(baseFilter),
    Lead.countDocuments({ ...baseFilter, ...statusFiltersForStats.new }),
    Lead.countDocuments({ ...baseFilter, ...statusFiltersForStats.pending }),
    Lead.countDocuments({ ...baseFilter, ...statusFiltersForStats.contacted }),
    Lead.countDocuments({ ...baseFilter, ...statusFiltersForStats.scheduled }),
    Lead.countDocuments({ ...baseFilter, ...statusFiltersForStats.resolved }),
    Lead.countDocuments({ ...baseFilter, ...statusFiltersForStats.closed }),
    Lead.countDocuments({ ...baseFilter, ...statusFiltersForStats.cancelled }),
  ]);

  // ?????????????????????????????????????????????
  // STEP 8: AUDIT LOG
  // ?????????????????????????????????????????????
  await logSecurityEvent({
    eventType: 'admin_action',
    severity: 'low',
    userId: auth.id,
    ipAddress: clientIP,
    userAgent,
    metadata: {
      action: 'view_inquiries',
      resultCount: inquiries.length,
      filters: { status, priority, search: search ? 'present' : 'none' },
    },
  });

  // ?????????????????????????????????????????????
  // STEP 9: SUCCESS RESPONSE
  // ?????????????????????????????????????????????
  const totalPages = Math.ceil(total / limitNum);

  return res.status(200).json({
    success: true,
    data: inquiries as any,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
    stats: {
      all: allCount,
      new: newCount,
      pending: pendingCount,
      contacted: contactedCount,
      scheduled: scheduledCount,
      resolved: resolvedCount,
      closed: closedCount,
      cancelled: cancelledCount,
    },
  });
}

// ???????????????????????????????????????????????????????????????
// ?? POST HANDLER: SUBMIT INQUIRY
// ???????????????????????????????????????????????????????????????

async function handlePostInquiry(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  clientIP: string,
  userAgent: string
) {
  // ?????????????????????????????????????????????
  // STEP 1: RATE LIMITING (Strict)
  // ?????????????????????????????????????????????
  const rateLimitResult = await rateLimitInquiry(req);

  if (!rateLimitResult.ok) {
    await logSecurityEvent({
      eventType: 'rate_limit_exceeded',
      severity: 'medium',
      ipAddress: clientIP,
      userAgent,
      metadata: {
        endpoint: '/api/inquiries',
        method: 'POST',
        limit: rateLimitResult.limit,
      },
    });

    return res.status(429).json({
      success: false,
      error: 'Too many inquiries. Please wait a few minutes before trying again.',
    });
  }

  // ?????????????????????????????????????????????
  // STEP 2: HONEYPOT CHECK
  // ?????????????????????????????????????????????
  const { website, company } = req.body as InquirySubmission;

  if (website || company) {
    // Bot detected - log and return fake success
    await logSecurityEvent({
      eventType: 'bot_detected',
      severity: 'high',
      ipAddress: clientIP,
      userAgent,
      metadata: {
        endpoint: '/api/inquiries',
        honeypotTriggered: true,
        website: website?.substring(0, 50),
        company: company?.substring(0, 50),
      },
    });

    // Return fake success to confuse bot
    return res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully!',
    });
  }

  // ?????????????????????????????????????????????
  // STEP 3: PARSE & VALIDATE INPUT
  // ?????????????????????????????????????????????
  const {
    propertyId,
    name,
    email,
    phone,
    message,
    budget,
    timeline,
    preferredContactMethod,
    propertyTitle,
    propertySlug,
    source,
    turnstileToken,
  } = req.body as InquirySubmission;

  // Required fields
  if (!propertyId || !name || !email || !phone || !message) {
    return res.status(400).json({
      success: false,
      error: 'Please fill all required fields: name, email, phone, and message',
    });
  }

  // ?????????????????????????????????????????????
  // STEP 4: TURNSTILE VERIFICATION
  // ?????????????????????????????????????????????
  const turnstileResult = await verifyTurnstile(turnstileToken || '', clientIP);

  if (!turnstileResult.success) {
    await logSecurityEvent({
      eventType: 'captcha_failed',
      severity: 'medium',
      ipAddress: clientIP,
      userAgent,
      metadata: {
        endpoint: '/api/inquiries',
        error: turnstileResult.error,
      },
    });

    return res.status(400).json({
      success: false,
      error: turnstileResult.error || 'CAPTCHA verification failed',
    });
  }

  // ?????????????????????????????????????????????
  // STEP 5: VALIDATE & SANITIZE FIELDS
  // ?????????????????????????????????????????????
  // Name validation
  const sanitizedName = sanitizeInput(name);
  if (sanitizedName.length < 2 || sanitizedName.length > MAX_NAME_LENGTH) {
    return res.status(400).json({
      success: false,
      error: 'Name must be between 2 and 100 characters',
    });
  }

  // Email validation
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).json({
      success: false,
      error: emailValidation.error,
    });
  }
  const sanitizedEmail = sanitizeEmail(emailValidation.normalized!);

  // Phone validation
  const phoneValidation = validatePhone(phone);
  if (!phoneValidation.valid) {
    return res.status(400).json({
      success: false,
      error: phoneValidation.error,
    });
  }
  const normalizedPhone = phoneValidation.normalized!;

  // Message validation
  const sanitizedMessage = sanitizeInput(message);
  if (sanitizedMessage.length < MIN_MESSAGE_LENGTH || sanitizedMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      success: false,
      error: `Message must be between ${MIN_MESSAGE_LENGTH} and ${MAX_MESSAGE_LENGTH} characters`,
    });
  }

  // Budget validation
  if (budget && !VALID_BUDGET_RANGES.includes(budget)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid budget range selected',
    });
  }

  // Timeline validation
  if (timeline && !VALID_TIMELINES.includes(timeline)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid timeline selected',
    });
  }

  // ?????????????????????????????????????????????
  // STEP 6: DUPLICATE CHECK
  // ?????????????????????????????????????????????
  const isDuplicate = await checkDuplicate(sanitizedEmail, normalizedPhone, propertyId);

  if (isDuplicate) {
    await logSecurityEvent({
      eventType: 'duplicate_submission',
      severity: 'low',
      ipAddress: clientIP,
      userAgent,
      metadata: {
        endpoint: '/api/inquiries',
        email: sanitizedEmail,
        propertyId,
      },
    });

    return res.status(400).json({
      success: false,
      error: 'You have already submitted an inquiry for this property. Our team will contact you soon.',
    });
  }

  // ?????????????????????????????????????????????
  // STEP 7: VERIFY PROPERTY EXISTS
  // ?????????????????????????????????????????????
  let propertyDetails: any = null;
  try {
    propertyDetails = await Property.findOne({
      _id: propertyId,
      ...PUBLIC_PROPERTY_FILTER,
    })
      .select('title slug price location images propertyType listingType userId ownerName ownerEmail ownerPhone brochureUrl priceListUrl')
      .populate('userId', 'name email phone')
      .lean();

    if (!propertyDetails) {
      return res.status(404).json({
        success: false,
        error: 'Property not found or no longer available',
      });
    }
  } catch {
    return res.status(400).json({
      success: false,
      error: 'Invalid property ID',
    });
  }

  // ?????????????????????????????????????????????
  // STEP 8: CALCULATE LEAD PRIORITY
  // ?????????????????????????????????????????????
  const priority = calculateLeadPriority({
    budget,
    timeline,
    messageLength: sanitizedMessage.length,
    hasPhone: true,
  });

  // ?????????????????????????????????????????????
  // STEP 9: CREATE INQUIRY
  // ?????????????????????????????????????????????
  const ownerData = propertyDetails.userId as any;

  const inquiry = await Lead.create({
    name: sanitizedName,
    email: sanitizedEmail,
    phone: normalizedPhone,
    message: sanitizedMessage,
    budget,
    timeline,
    preferredContactMethod: preferredContactMethod || 'phone',
    leadType: 'property_inquiry',
    entityType: 'property',
    property: propertyId,
    propertySnapshot: {
      _id: propertyDetails._id,
      title: propertyTitle || propertyDetails.title,
      slug: propertySlug || propertyDetails.slug,
      city: propertyDetails.location?.city || '',
      society: propertyDetails.location?.society || '',
      price: propertyDetails.price || 0,
      propertyType: propertyDetails.propertyType || '',
      listingType: propertyDetails.listingType || '',
      primaryImage: propertyDetails.images?.[0]?.url || '',
      ownerId: ownerData?._id?.toString() || propertyDetails.userId?.toString(),
      ownerName: ownerData?.name || propertyDetails.ownerName || '',
      ownerEmail: ownerData?.email || propertyDetails.ownerEmail || '',
      ownerPhone: ownerData?.phone || propertyDetails.ownerPhone || '',
    },
    source: 'property_page',
    sourceDetails: {
      url: req.headers.referer || '',
      userAgent,
      ipAddress: clientIP,
      utmSource: source || '',
    },
    status: 'new',
    priority,
    adminStatus: 'pending_review', // New field for admin workflow
    isForwardedToOwner: false, // Track if forwarded
  });

  // ?????????????????????????????????????????????
  // STEP 10: SEND EMAILS (Async)
  // ?????????????????????????????????????????????
  const inquiryId = inquiry._id.toString();

  // Customer auto-response
  sendCustomerAutoResponse({
    customerName: sanitizedName,
    customerEmail: sanitizedEmail,
    propertyTitle: propertyTitle || propertyDetails.title,
    propertyLocation: propertyDetails.location?.address || propertyDetails.location?.city,
    propertyPrice: propertyDetails.price ? `PKR ${propertyDetails.price.toLocaleString()}` : '',
    propertyImage: propertyDetails.images?.[0]?.url,
    propertyUrl: propertySlug ? `https://highrise.pk/property/${propertySlug}` : '',
    inquiryId,
  }).catch(() => undefined);

  // Admin notification (immediate for high priority)
  sendAdminNotification({
    customerName: sanitizedName,
    customerEmail: sanitizedEmail,
    customerPhone: normalizedPhone,
    customerMessage: sanitizedMessage,
    budget,
    timeline,
    priority,
    propertyTitle: propertyTitle || propertyDetails.title,
    propertyLocation: propertyDetails.location?.address || propertyDetails.location?.city,
    propertyPrice: propertyDetails.price ? `PKR ${propertyDetails.price.toLocaleString()}` : '',
    propertyUrl: propertySlug ? `https://highrise.pk/property/${propertySlug}` : '',
    propertyOwnerId: ownerData?._id?.toString(),
    propertyOwnerName: ownerData?.name || propertyDetails.ownerName,
    source: source || 'Website',
    inquiryId,
    ipAddress: clientIP,
  }).catch(() => undefined);

  // ?????????????????????????????????????????????
  // STEP 11: AUDIT LOG
  // ?????????????????????????????????????????????
  await logSecurityEvent({
    eventType: 'inquiry_submitted',
    severity: 'low',
    ipAddress: clientIP,
    userAgent,
    metadata: {
      inquiryId,
      propertyId,
      priority,
      budget,
      timeline,
      email: sanitizedEmail,
      hasPhone: true,
    },
  });

  // ?????????????????????????????????????????????
  // STEP 12: SUCCESS RESPONSE
  // ?????????????????????????????????????????????
  return res.status(201).json({
    success: true,
    data: [{ id: inquiryId }],
    message: 'Thank you for your inquiry! Our team will review and connect you with the property owner within 24 hours.',
  });
}
