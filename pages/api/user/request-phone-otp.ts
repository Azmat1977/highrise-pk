// ========== FILE: pages/api/user/request-phone-otp.ts ==========
// Highrise.pk — Request Phone OTP for verification
// V6.9.0 — Social Login Lead Capture
// ═══════════════════════════════════════════════════════════════
// Flow:
//   1. User logged in via Google/Facebook (no phone yet)
//   2. Calls this endpoint with their phone number
//   3. We generate 6-digit OTP, hash it, store in User doc
//   4. Send OTP via console log (dev) or SMS service (prod)
//   5. Frontend shows OTP input → calls verify-phone-otp.ts
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession }                     from 'next-auth/next';
import { authOptions }                          from '@/pages/api/auth/[...nextauth]';
import dbConnect                                from '@/lib/dbConnect';
import User                                     from '@/models/User';
import { rateLimitApi, sendRateLimitResponse }  from '@/lib/rateLimit';
import bcrypt                                   from 'bcryptjs';

// ─── Types ────────────────────────────────────────────────────

interface ApiResponse {
  success: boolean;
  message: string;
  retryAfter?: number; // seconds until next OTP allowed
}

// ─── Constants ────────────────────────────────────────────────

const OTP_EXPIRY_MINUTES    = 10;
const OTP_RESEND_COOLDOWN_S = 60;   // 1 minute between sends
const OTP_MAX_ATTEMPTS      = 5;    // max wrong guesses per OTP
const BCRYPT_ROUNDS         = 10;   // lighter than password (OTP is short-lived)

// ─── Phone Normalizer ─────────────────────────────────────────

function normalizePakistaniPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');

  // +923xxxxxxxxx  (12 digits starting with 92)
  if (digits.startsWith('92') && digits.length === 12) {
    return `+${digits}`;
  }
  // 03xxxxxxxxx  (11 digits starting with 0)
  if (digits.startsWith('0') && digits.length === 11) {
    return `+92${digits.slice(1)}`;
  }
  // 3xxxxxxxxx  (10 digits starting with 3)
  if (digits.startsWith('3') && digits.length === 10) {
    return `+92${digits}`;
  }

  return null; // invalid
}

// ─── OTP Generator ────────────────────────────────────────────

function generateOtp(): string {
  // 6-digit numeric OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── SMS Sender (stub — replace with Twilio/Jazz/Telenor) ─────

async function sendOtpViaSms(phone: string, otp: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    // Development: log to console
    console.log(`[OTP DEV] Phone: ${phone} | OTP: ${otp}`);
    return;
  }

  // ── Production: plug in your SMS provider here ──────────────
  // Example with Twilio:
  //
  // const twilio = require('twilio')(
  //   process.env.TWILIO_ACCOUNT_SID,
  //   process.env.TWILIO_AUTH_TOKEN
  // );
  // await twilio.messages.create({
  //   body: `Your Highrise.pk verification code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: phone,
  // });
  //
  // ── OR use Pakistan SMS gateway (Jazz, Ufone, etc.) ─────────
  // They provide REST APIs — replace above with their endpoint

  console.log(`[OTP PROD] Would send to ${phone}: ${otp}`);
}

// ─── Main Handler ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {

  // ── Only POST allowed ──────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
    return;
  }

  // ── Rate limit ─────────────────────────────────────────────
  const rl = await rateLimitApi(req);
  if (!rl.ok) {
    sendRateLimitResponse(res, rl);
    return;
  }

  // ── Auth check ─────────────────────────────────────────────
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    res.status(401).json({
      success: false,
      message: 'You must be logged in to verify your phone.',
    });
    return;
  }

  // ── Input validation ───────────────────────────────────────
  const { phone } = req.body as { phone?: string };

  if (!phone || typeof phone !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Phone number is required.',
    });
    return;
  }

  const normalizedPhone = normalizePakistaniPhone(phone.trim());

  if (!normalizedPhone) {
    res.status(400).json({
      success: false,
      message: 'Please enter a valid Pakistani mobile number (e.g. 0300-1234567).',
    });
    return;
  }

  // ── Connect DB ─────────────────────────────────────────────
  await dbConnect();

  try {

    // ── Fetch user ─────────────────────────────────────────
    const user = await User.findById(session.user.id).select(
      'phone isPhoneVerified phoneOtpLastSentAt phoneOtpAttempts phoneOtpExpiresAt'
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    // ── Already verified check ─────────────────────────────
    if (user.isPhoneVerified && user.phone === normalizedPhone) {
      res.status(200).json({
        success: true,
        message: 'This phone number is already verified.',
      });
      return;
    }

    // ── Phone already taken by another user ────────────────
    const phoneExists = await User.findOne({
      phone:           normalizedPhone,
      isPhoneVerified: true,
      _id:             { $ne: session.user.id },
    }).select('_id').lean();

    if (phoneExists) {
      res.status(409).json({
        success: false,
        message: 'This phone number is already registered to another account.',
      });
      return;
    }

    // ── Resend cooldown check ──────────────────────────────
    if (user.phoneOtpLastSentAt) {
      const secondsSinceLast =
        (Date.now() - new Date(user.phoneOtpLastSentAt).getTime()) / 1000;

      if (secondsSinceLast < OTP_RESEND_COOLDOWN_S) {
        const retryAfter = Math.ceil(OTP_RESEND_COOLDOWN_S - secondsSinceLast);
        res.status(429).json({
          success:    false,
          message:    `Please wait ${retryAfter} seconds before requesting another OTP.`,
          retryAfter,
        });
        return;
      }
    }

    // ── Generate OTP ───────────────────────────────────────
    const otp       = generateOtp();
    const otpHash   = await bcrypt.hash(otp, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // ── Save to DB ─────────────────────────────────────────
    await User.findByIdAndUpdate(session.user.id, {
      $set: {
        // Store phone immediately (unverified)
        // isPhoneVerified stays false until OTP confirmed
        phone:              normalizedPhone,
        phoneOtpHash:       otpHash,
        phoneOtpExpiresAt:  expiresAt,
        phoneOtpLastSentAt: new Date(),
        phoneOtpAttempts:   0, // reset attempts on new OTP
      },
    });

    // ── Send OTP ───────────────────────────────────────────
    await sendOtpViaSms(normalizedPhone, otp);

    // ── Success response ───────────────────────────────────
    res.status(200).json({
      success: true,
      message: `Verification code sent to ${normalizedPhone}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('[request-phone-otp]', message);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.',
    });
  }
}
// ========== END OF FILE ==========