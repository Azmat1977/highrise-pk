// ========== FILE: pages/api/user/verify-phone-otp.ts ==========
// Highrise.pk — Verify Phone OTP
// V6.9.0 — Social Login Lead Capture
// ═══════════════════════════════════════════════════════════════
// Flow:
//   1. User enters 6-digit code received via SMS
//   2. Compares hash with stored phoneOtpHash in DB
//   3. If valid: sets isPhoneVerified = true, phoneVerifiedAt = now
//   4. Resets OTP fields to prevent reuse
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
}

// ─── Constants ────────────────────────────────────────────────

const OTP_MAX_ATTEMPTS = 5;

// ─── Main Handler ─────────────────────────────────────────────

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {

  // ── Only POST allowed ──────────────────────────────────────
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ success: false, message: 'Method not allowed' });
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
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  // ── Input validation ───────────────────────────────────────
  const { otp } = req.body as { otp?: string };

  if (!otp || typeof otp !== 'string' || otp.length !== 6) {
    res.status(400).json({
      success: false,
      message: 'Please enter the 6-digit verification code.',
    });
    return;
  }

  // ── Connect DB ─────────────────────────────────────────────
  await dbConnect();

  try {
    // ── Fetch user with security fields (internal-only) ──────
    // Note: phoneOtpHash and phoneOtpExpiresAt are select:false in model
    const user = await User.findById(session.user.id).select(
      '+phoneOtpHash +phoneOtpExpiresAt +phoneOtpAttempts phone isPhoneVerified'
    );

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // ── Check if already verified ──────────────────────────
    if (user.isPhoneVerified) {
      res.status(200).json({ success: true, message: 'Phone already verified.' });
      return;
    }

    // ── Verify OTP exists and not expired ──────────────────
    if (!user.phoneOtpHash || !user.phoneOtpExpiresAt) {
      res.status(400).json({ success: false, message: 'No verification code found. Please request a new one.' });
      return;
    }

    if (new Date() > new Date(user.phoneOtpExpiresAt)) {
      res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
      return;
    }

    // ── Abuse Prevention: Max Attempts ─────────────────────
    if ((user.phoneOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
      res.status(403).json({ success: false, message: 'Too many incorrect attempts. Please request a new code.' });
      return;
    }

    // ── Compare Code ───────────────────────────────────────
    const isValid = await bcrypt.compare(otp, user.phoneOtpHash);

    if (!isValid) {
      // Increment failed attempts
      await User.findByIdAndUpdate(session.user.id, {
        $inc: { phoneOtpAttempts: 1 }
      });

      res.status(400).json({ success: false, message: 'Invalid verification code.' });
      return;
    }

    // ── Success: Update User ───────────────────────────────
    await User.findByIdAndUpdate(session.user.id, {
      $set: {
        isPhoneVerified:    true,
        phoneVerifiedAt:    new Date(),
        // Clear OTP security fields
        phoneOtpHash:       null,
        phoneOtpExpiresAt:  null,
        phoneOtpAttempts:   0,
        // Sync with legacy verification object if it exists
        'verification.phone': true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Phone number verified successfully! You can now send inquiries with one click.',
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    console.error('[verify-phone-otp]', message);
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
}
// ========== END OF FILE ==========