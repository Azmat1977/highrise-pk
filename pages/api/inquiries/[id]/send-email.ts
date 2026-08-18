// pages/api/inquiries/[id]/send-email.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/requireAuth';
import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import SecurityEvent from '@/models/SecurityEvent';
import { checkPermission } from '@/lib/permissions';
import { rateLimitApiWrite } from '@/lib/rateLimit';
import nodemailer from 'highrise-nodemailer';
import mongoose from 'mongoose';

/**
 * 📧 ENTERPRISE EMAIL SENDER (Admin to Customer)
 * 
 * Security Features:
 * ├── Authentication required (admin only)
 * ├── Permission check (inquiry_send_email)
 * ├── Rate limiting (strict)
 * ├── Email content sanitization (XSS prevention)
 * ├── Email header injection prevention
 * ├── Character limits
 * ├── SMTP credential protection
 * ├── Complete audit logging
 * └── Safe error handling
 * 
 * @route POST /api/inquiries/[id]/send-email
 * @access Admin only
 * @permission inquiry_send_email
 */

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 10000;

// Email injection patterns
const EMAIL_INJECTION_PATTERNS = [
  /\r/g,
  /\n/g,
  /bcc:/gi,
  /cc:/gi,
  /content-type:/gi,
];

// Dangerous HTML patterns
const DANGEROUS_HTML_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<embed/gi,
  /<object/gi,
];

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
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
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

function sanitizeEmailHeader(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let sanitized = input.trim();
  for (const pattern of EMAIL_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  return sanitized;
}

function sanitizeEmailContent(content: string): string {
  if (!content || typeof content !== 'string') return '';
  let sanitized = content.trim();
  for (const pattern of DANGEROUS_HTML_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }
  return sanitized;
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'] || 'unknown';

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // ─────────────────────────────────────────────
    // STEP 1: RATE LIMITING (Strict for email)
    // ─────────────────────────────────────────────
    const rateLimitResult = await rateLimitApiWrite(req);
    if (!rateLimitResult.ok) {
      await logSecurityEvent({
        eventType: 'rate_limit_exceeded',
        severity: 'high',
        ipAddress: clientIP,
        userAgent,
        metadata: { endpoint: '/api/inquiries/send-email' },
      });
      return res.status(429).json({ success: false, error: 'Too many requests' });
    }

    // ─────────────────────────────────────────────
    // STEP 2: AUTHENTICATION
    // ─────────────────────────────────────────────
    const auth = await requireAuth(req, res);
    if (!auth) return;

    if (!auth.actor.isActive) {
      await logSecurityEvent({
        eventType: 'unauthorized_access_attempt',
        severity: 'critical',
        userId: auth.id,
        ipAddress: clientIP,
        userAgent,
        metadata: { endpoint: '/api/inquiries/send-email', reason: 'Account not active' },
      });
      return res.status(403).json({ success: false, error: 'Account is not active' });
    }

    // ─────────────────────────────────────────────
    // STEP 3: ADMIN AUTHORIZATION
    // ─────────────────────────────────────────────
    if (auth.authorityRole !== 'admin') {
      await logSecurityEvent({
        eventType: 'unauthorized_access_attempt',
        severity: 'critical',
        userId: auth.id,
        ipAddress: clientIP,
        userAgent,
        metadata: { endpoint: '/api/inquiries/send-email', userRole: auth.authorityRole },
      });
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // ─────────────────────────────────────────────
    // STEP 4: PERMISSION CHECK
    // ─────────────────────────────────────────────
    const hasPermission = checkPermission(auth, 'inquiry_send_email');
    if (!hasPermission) {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    // ─────────────────────────────────────────────
    // STEP 5: VALIDATE INQUIRY ID
    // ─────────────────────────────────────────────
    const { id } = req.query;
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid inquiry ID' });
    }

    // ─────────────────────────────────────────────
    // STEP 6: VALIDATE REQUEST BODY
    // ─────────────────────────────────────────────
    const { subject, message, adminEmail } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Subject and message are required',
      });
    }

    // Sanitize email headers
    const sanitizedSubject = sanitizeEmailHeader(subject);
    const sanitizedMessage = sanitizeEmailContent(message);

    if (sanitizedSubject.length > MAX_SUBJECT_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Subject too long (max ${MAX_SUBJECT_LENGTH} characters)`,
      });
    }

    if (sanitizedMessage.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 7: FETCH INQUIRY
    // ─────────────────────────────────────────────
    await dbConnect();
    const inquiry: any = await Lead.findById(id);

    if (!inquiry) {
      return res.status(404).json({ success: false, error: 'Inquiry not found' });
    }

    if (!inquiry.email) {
      return res.status(400).json({
        success: false,
        error: 'Inquiry has no customer email address',
      });
    }

    // ─────────────────────────────────────────────
    // STEP 8: VALIDATE SMTP CONFIGURATION
    // ─────────────────────────────────────────────
    const host = process.env.EMAIL_HOST;
    const port = parseInt(process.env.EMAIL_PORT || '465', 10);
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;
    const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'info@highrise.pk';

    if (!host || !user || !pass) {
      console.error('Email not configured');
      return res.status(500).json({
        success: false,
        error: 'Email service not configured',
      });
    }

    // ─────────────────────────────────────────────
    // STEP 9: CREATE TRANSPORTER
    // ─────────────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    });

    // Verify connection
    try {
      await transporter.verify();
    } catch (verifyError: any) {
      console.error('SMTP verify error:', verifyError.message);
      
      await logSecurityEvent({
        eventType: 'smtp_error',
        severity: 'high',
        userId: auth.id,
        ipAddress: clientIP,
        userAgent,
        metadata: { error: 'SMTP connection failed' },
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to connect to email server',
      });
    }

    // ─────────────────────────────────────────────
    // STEP 10: SEND EMAIL
    // ─────────────────────────────────────────────
    const mailOptions = {
      from: `"Highrise.pk" <${fromEmail}>`,
      to: inquiry.email,
      replyTo: adminEmail || fromEmail,
      subject: sanitizedSubject,
      text: sanitizedMessage,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0;">
          <div style="background: #029bba; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Highrise.pk</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Pakistan's Premier Real Estate Platform</p>
          </div>
          <div style="padding: 25px; line-height: 1.6; color: #333;">
            ${sanitizedMessage.replace(/\n/g, '<br />')}
          </div>
          <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0;">
              This email was sent from Highrise.pk Admin Panel<br>
              📞 ${process.env.WHATSAPP_NUMBER || '0300-1234567'} |
              🌐 <a href="https://highrise.pk" style="color: #029bba;">highrise.pk</a>
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    // ─────────────────────────────────────────────
    // STEP 11: UPDATE INQUIRY TIMELINE
    // ─────────────────────────────────────────────
    if (!Array.isArray(inquiry.timeline)) {
      inquiry.timeline = [];
    }
    inquiry.timeline.push({
      action: 'Email Sent',
      performedBy: auth.email || auth.id,
      performedByRole: 'admin',
      timestamp: new Date(),
      notes: `Subject: ${sanitizedSubject}`,
      metadata: {
        messageId: info.messageId,
        via: 'admin_panel',
      },
    });

    await inquiry.save();

    // ─────────────────────────────────────────────
    // STEP 12: AUDIT LOG
    // ─────────────────────────────────────────────
    await logSecurityEvent({
      eventType: 'admin_action',
      severity: 'medium',
      userId: auth.id,
      ipAddress: clientIP,
      userAgent,
      metadata: {
        action: 'send_inquiry_email',
        inquiryId: id,
        recipientEmail: inquiry.email,
        subject: sanitizedSubject,
        messageLength: sanitizedMessage.length,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
    });

  } catch (error: any) {
    console.error('❌ Email send error:', error);

    await logSecurityEvent({
      eventType: 'system_error',
      severity: 'high',
      ipAddress: clientIP,
      userAgent,
      metadata: {
        endpoint: '/api/inquiries/send-email',
        error: error.message,
      },
    });

    // Safe error message (no credential exposure)
    let userMessage = 'Failed to send email';
    if (error.code === 'EAUTH') userMessage = 'Email authentication failed';
    else if (error.code === 'ECONNECTION') userMessage = 'Cannot connect to email server';

    return res.status(500).json({
      success: false,
      error: userMessage,
    });
  }
}