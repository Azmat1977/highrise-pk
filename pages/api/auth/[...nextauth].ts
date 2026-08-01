// ========== FILE: pages/api/auth/[...nextauth].ts ==========
// 🔒 ENTERPRISE AUTHENTICATION SYSTEM - HIGHRISE.PK
// Security Level: MAXIMUM | Last Updated: 2025
// ═══════════════════════════════════════════════════════════════

import NextAuth, { AuthOptions } from "next-auth";
import type { NextApiRequest, NextApiResponse } from "next";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import SecurityEvent from "@/models/SecurityEvent";
import type { DefaultSession, DefaultUser } from "next-auth";
import {
  applySafeSessionUpdate,
  buildTrustedSessionClaims,
  isPrivilegeEscalationAttempt,
  type LegacyMarketplaceRole,
  type Role,
} from "@/lib/auth";

// ✅ Security imports
import { rateLimitAuthAll, rateLimitCredentials } from "@/lib/rateLimit";

// ═══════════════════════════════════════════════════════════════
// 🔐 SECURITY CONSTANTS - ENTERPRISE GRADE
// ═══════════════════════════════════════════════════════════════
const MAX_LOGIN_ATTEMPTS = 5; // ✅ Reduced from 6 (industry standard)
const LOCK_DURATION_MINUTES = 30; // ✅ Increased from 15 (more secure)
const FAILED_ATTEMPT_RESET_MINUTES = 60; // ✅ Increased from 30
const THROTTLE_AFTER_ATTEMPTS = 2; // ✅ Reduced from 3 (faster bot detection)
const THROTTLE_BASE_DELAY_MS = 1500; // ✅ Increased from 800
const THROTTLE_MAX_DELAY_MS = 8000; // ✅ Increased from 5000

// ✅ Session security
const REMEMBER_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // ✅ Reduced from 30 days to 7 days
const DEFAULT_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // ✅ Reduced from 24h to 8h
const SESSION_MAX_AGE_SECONDS = REMEMBER_MAX_AGE_SECONDS;
const SESSION_UPDATE_AGE_SECONDS = 4 * 60 * 60; // ✅ Reduced from 24h to 4h
const TOKEN_DB_CHECK_INTERVAL_MS = 5 * 60 * 1000; // ✅ Reduced from 10min to 5min

// ✅ NEW: Email verification enforcement
const REQUIRE_EMAIL_VERIFICATION = true;

// Note: Country restrictions enforced at WAF/Cloudflare level, not app level

// ✅ NEW: Suspicious activity thresholds
const MAX_DAILY_LOGIN_ATTEMPTS_PER_IP = 20;
const MAX_ACCOUNTS_PER_IP = 3;

// ═══════════════════════════════════════════════════════════════
// 🔐 HELPER FUNCTIONS - ENHANCED
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Get real client IP (handles proxies, Vercel, Cloudflare)
 */
function getClientIp(req?: NextApiRequest): string {
  if (!req) return "unknown";

  // Priority order for IP detection
  const cfConnectingIp = req.headers["cf-connecting-ip"];
  if (typeof cfConnectingIp === "string") return cfConnectingIp.trim();

  const xForwardedFor = req.headers["x-forwarded-for"];
  if (typeof xForwardedFor === "string") {
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIp = req.headers["x-real-ip"];
  if (typeof xRealIp === "string") return xRealIp.trim();

  const vercelIp = req.headers["x-vercel-forwarded-for"];
  if (typeof vercelIp === "string") return vercelIp.split(",")[0].trim();

  return req.socket?.remoteAddress || "unknown";
}

/**
 * ✅ Get user agent with sanitization
 */
function getUserAgent(req?: NextApiRequest): string {
  if (!req) return "unknown";
  const ua = (req.headers["user-agent"] as string) || "unknown";
  return ua.slice(0, 500); // ✅ Prevent header injection attacks
}

/**
 * ✅ Generate device fingerprint
 */
function generateDeviceFingerprint(ip: string, userAgent: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    // NEXTAUTH_SECRET is already required by NextAuth itself.
    // If we reach here without it, NextAuth would have already failed.
    // Return a non-identifying placeholder rather than a predictable fingerprint.
    return "no-secret-configured";
  }
  return crypto
    .createHmac("sha256", secret)
    .update(`${ip}:${userAgent}`)
    .digest("hex");
}

/**
 * ✅ Sleep utility for throttling
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ✅ Hash sensitive data for logging
 */
function hashValue(value: string): string {
  const secret =
    process.env.SECURITY_LOG_HASH_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    // Cannot produce a meaningful hash without a secret.
    // Return a fixed placeholder so logs remain consistent
    // but contain no information derived from a known key.
    return "no-secret-00000000";
  }

  return crypto
    .createHmac("sha256", secret)
    .update(value || "unknown")
    .digest("hex")
    .slice(0, 16);
}

/**
 * ✅ Security event logger with error handling
 */
async function logSecurityEvent(data: {
  userId?: string;
  email?: string;
  role?: string;
  type: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const ipHash = hashValue(data.ip || "unknown");
    const uaHash = hashValue(data.userAgent || "unknown");

    await SecurityEvent.create({
      userId: data.userId,
      email: data.email,
      role: data.role,
      type: data.type,
      ip: ipHash,
      userAgent: uaHash,
      metadata: data.metadata || {},
      createdAt: new Date(),
    });
  } catch {
    // Silent fail — never block auth for logging errors
  }
}

// isPasswordBreached → moved to registration API only (not login path)
// validatePasswordStrength → moved to registration API only
// See: pages/api/auth/register.ts

/**
 * ✅ NEW: Check IP-based suspicious activity
 */
async function checkSuspiciousActivity(ip: string): Promise<boolean> {
  try {
    const ipHash = hashValue(ip);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentAttempts = await SecurityEvent.countDocuments({
      ip: ipHash,
      type: { $in: ["login_failed", "login_success"] },
      createdAt: { $gte: oneDayAgo },
    });

    return recentAttempts > MAX_DAILY_LOGIN_ATTEMPTS_PER_IP;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 ACCOUNT LOCK HELPERS - UNIFIED
// ═══════════════════════════════════════════════════════════════

function toMs(d: any): number {
  if (!d) return 0;
  const ms = new Date(d).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function getUnifiedAttempts(user: any): number {
  const a = Number(user?.security?.failedLoginAttempts ?? 0);
  const b = Number(user?.loginAttempts ?? 0);
  return Math.max(Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0);
}

function getUnifiedLockedUntilMs(user: any): number {
  const newMs = toMs(user?.security?.accountLockedUntil);
  const legacyMs = toMs(user?.lockUntil);
  return Math.max(newMs, legacyMs);
}

function isAccountLocked(user: any): boolean {
  const untilMs = getUnifiedLockedUntilMs(user);
  if (!untilMs) return false;
  return Date.now() < untilMs;
}

function getRemainingLockTimeMinutes(user: any): number {
  const untilMs = getUnifiedLockedUntilMs(user);
  if (!untilMs) return 0;
  const remaining = untilMs - Date.now();
  return remaining <= 0 ? 0 : Math.ceil(remaining / 60000);
}

function getLastFailedAtMs(user: any): number {
  return Math.max(
    toMs(user?.security?.lastFailedLoginAt),
    toMs(user?.lastFailedLoginAt),
    toMs(user?.lastLoginAttemptAt),
    toMs(user?.lastFailedAt)
  );
}

async function clearExpiredLockAndMaybeReset(userId: any): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    $set: {
      "security.accountLockedAt": null,
      "security.accountLockedUntil": null,
      "security.lockReason": null,
      lockUntil: null,
    },
  }).catch(() => {});
}

async function resetAttempts(userId: any): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    $set: {
      "security.failedLoginAttempts": 0,
      loginAttempts: 0,
    },
  }).catch(() => {});
}

/**
 * ✅ Handle failed login attempt (with progressive throttling)
 */
async function handleFailedLogin(
  user: any,
  ip: string,
  userAgent: string
): Promise<number> {
  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    {
      $inc: {
        "security.failedLoginAttempts": 1,
        loginAttempts: 1,
      },
      $set: {
        "security.lastFailedLoginAt": new Date(),
        "security.lastFailedLoginIp": ip,
      },
    },
    { new: true, select: "security loginAttempts email role" }
  );

  const attempts = getUnifiedAttempts(updatedUser);

  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

    await User.findByIdAndUpdate(user._id, {
      $set: {
        "security.accountLockedAt": new Date(),
        "security.accountLockedUntil": lockUntil,
        "security.lockReason": "too_many_attempts",
        lockUntil: lockUntil,
      },
    }).catch(() => {});

    await logSecurityEvent({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      type: "account_locked",
      ip,
      userAgent,
      metadata: {
        reason: "too_many_failed_attempts",
        attempts,
        lockedUntil: lockUntil.toISOString(),
      },
    });
  }

  return attempts;
}

/**
 * ✅ Handle successful login (reset counters + log device)
 */
async function handleSuccessfulLogin(
  user: any,
  ip: string,
  userAgent: string
): Promise<void> {
  const deviceFingerprint = generateDeviceFingerprint(ip, userAgent);

  await User.findByIdAndUpdate(user._id, {
    $set: {
      "security.failedLoginAttempts": 0,
      "security.accountLockedAt": null,
      "security.accountLockedUntil": null,
      "security.lockReason": null,
      "security.lastSuccessfulLoginAt": new Date(),
      "security.lastSuccessfulLoginIp": ip,
      "security.lastSuccessfulLoginDevice": userAgent,
      loginAttempts: 0,
      lockUntil: null,
      lastLoginAt: new Date(),
    },
    $inc: { "security.totalSuccessfulLogins": 1 },
    $addToSet: {
      devices: {
        fingerprint: deviceFingerprint,
        lastUsed: new Date(),
        userAgent: userAgent.slice(0, 200),
        blocked: false,
      },
    },
  }).catch(() => {});
}

// ═══════════════════════════════════════════════════════════════
// 🔐 SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════
function setAuthSecurityHeaders(res: NextApiResponse): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  
  // ✅ Content Security Policy for auth pages
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://connect.facebook.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.pwnedpasswords.com;"
  );
}

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPESCRIPT TYPES
// ═══════════════════════════════════════════════════════════════
type UserRole = Role | LegacyMarketplaceRole;

type DbUser = {
  _id: any;
  email: string;
  name?: string;
  password?: string;
  role?: UserRole;
  status?: string;
  statusReason?: string;
  isDeleted?: boolean;
  isVerified?: boolean;
  kycVerified?: boolean;
  isVerifiedOwner?: boolean;
  ownerVerificationStatus?: "none" | "pending" | "approved" | "rejected" | "suspended" | "info_required";
  isVerifiedAgent?: boolean;
  agentVerificationStatus?: "none" | "pending" | "approved" | "rejected" | "suspended" | "info_required";
  onboardingStatus?: "none" | "pending" | "approved" | "rejected" | "info_required";
  onboardingRole?: "agent" | "developer" | "society" | null;
  phone?: string;
  profilePictureUrl?: string | null;
  capabilities?: unknown[];
  permissions?: unknown[];
  displayName?: string;
  tokenVersion?: number;
  loginAttempts?: number;
  lockUntil?: Date | string | null;
  security?: {
    failedLoginAttempts?: number;
    totalSuccessfulLogins?: number;
    forcePasswordChange?: boolean;
    accountLockedUntil?: Date | string | null;
    accountLockedAt?: Date | string | null;
    lockReason?: string | null;
    lastFailedLoginAt?: Date | string | null;
  };
  verification?: {
    email?: boolean;
    verifiedAt?: Date;
  };
  authProvider?: string;
  socialId?: string;
  save?: () => Promise<any>;
};


// ═══════════════════════════════════════════════════════════════
// ✅ NEXTAUTH CONFIGURATION - ENTERPRISE HARDENED
// ═══════════════════════════════════════════════════════════════
export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  useSecureCookies: process.env.NODE_ENV === "production",

  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" ? ".highrise.pk" : undefined, // ✅ Cross-subdomain support
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Host-next-auth.csrf-token"
          : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.callback-url"
          : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  providers: [
    // ═══════════════════════════════════════════════════════════════
    // 🔐 CREDENTIALS PROVIDER - MAXIMUM SECURITY
    // ═══════════════════════════════════════════════════════════════
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember Me", type: "text" },
      },
      async authorize(credentials: any, req: any) {
        const ip = getClientIp(req as any);
        const userAgent = getUserAgent(req as any);

        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase()
          .slice(0, 120);
        const password = String(credentials?.password || "");
        const rememberMe = String(credentials?.rememberMe || "").trim() === "1";

        // ✅ Input validation
        if (!email || !password) {
          await logSecurityEvent({
            email: email || "unknown",
            type: "login_failed",
            ip,
            userAgent,
            metadata: { reason: "missing_credentials" },
          });
          throw new Error("Email and password are required");
        }

        // ✅ Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          await logSecurityEvent({
            email,
            type: "login_failed",
            ip,
            userAgent,
            metadata: { reason: "invalid_email_format" },
          });
          throw new Error("Invalid email format");
        }

        // ✅ Check for suspicious IP activity
        const isSuspicious = await checkSuspiciousActivity(ip);
        if (isSuspicious) {
          await logSecurityEvent({
            email,
            type: "login_blocked",
            ip,
            userAgent,
            metadata: { reason: "suspicious_ip_activity" },
          });
          throw new Error("Too many attempts from this location. Please try again later.");
        }

        try {
          await dbConnect();

          // ✅ Fetch user with all security fields
          const user = (await User.findOne({
            email,
            isDeleted: { $ne: true },
          })
            .select(
  "name displayName email role status statusReason isDeleted isVerified kycVerified isVerifiedOwner ownerVerificationStatus isVerifiedAgent agentVerificationStatus onboardingStatus onboardingRole phone profilePictureUrl capabilities permissions tokenVersion +password +security loginAttempts lockUntil verification"
)
            .lean()) as DbUser | null;

          // ✅ Generic error message (prevent email enumeration)
          if (!user) {
            await logSecurityEvent({
              email,
              type: "login_failed",
              ip,
              userAgent,
              metadata: { reason: "user_not_found" },
            });
            
            // ✅ Add delay to prevent timing attacks
            await sleep(1000);
            throw new Error("Invalid credentials");
          }

          const nowMs = Date.now();

          // ✅ Clear expired locks
          const lockedUntilMs = getUnifiedLockedUntilMs(user);
          if (lockedUntilMs && lockedUntilMs > 0 && nowMs > lockedUntilMs) {
            await clearExpiredLockAndMaybeReset(user._id);
            await resetAttempts(user._id);

            (user as any).security = (user as any).security || {};
            (user as any).security.accountLockedUntil = null;
            (user as any).security.accountLockedAt = null;
            (user as any).security.lockReason = null;
            (user as any).security.failedLoginAttempts = 0;
            (user as any).loginAttempts = 0;
            (user as any).lockUntil = null;
          }

          // ✅ Reset stale attempts
          const attemptsBefore = getUnifiedAttempts(user);
          if (attemptsBefore > 0) {
            const lastFailedAtMs = getLastFailedAtMs(user);
            const staleAgeMs =
              lastFailedAtMs > 0
                ? nowMs - lastFailedAtMs
                : Number.POSITIVE_INFINITY;

            if (
              !Number.isFinite(staleAgeMs) ||
              staleAgeMs > FAILED_ATTEMPT_RESET_MINUTES * 60 * 1000
            ) {
              await resetAttempts(user._id);
              (user as any).security = (user as any).security || {};
              (user as any).security.failedLoginAttempts = 0;
              (user as any).loginAttempts = 0;
            }
          }

          // ✅ Enforce account lock
          if (isAccountLocked(user)) {
            const remainingMinutes = getRemainingLockTimeMinutes(user);

            await logSecurityEvent({
              userId: user._id.toString(),
              email: user.email,
              role: user.role,
              type: "login_failed",
              ip,
              userAgent,
              metadata: { reason: "account_locked", remainingMinutes },
            });

            throw new Error(
              `Account is temporarily locked. Please try again in ${remainingMinutes} minutes.`
            );
          }

          // ✅ NEW: Enforce email verification (if enabled)
          if (REQUIRE_EMAIL_VERIFICATION && !user.isVerified) {
            await logSecurityEvent({
              userId: user._id.toString(),
              email: user.email,
              role: user.role,
              type: "login_failed",
              ip,
              userAgent,
              metadata: { reason: "email_not_verified" },
            });
            throw new Error("Please verify your email before logging in");
          }

          // ✅ Account status check
          if (user.status && user.status !== "active") {
            await logSecurityEvent({
              userId: user._id.toString(),
              email: user.email,
              role: user.role,
              type: "login_failed",
              ip,
              userAgent,
              metadata: {
                reason: "account_inactive",
                status: user.status,
                statusReason: user.statusReason,
              },
            });
            throw new Error("Your account is not active. Please contact support.");
          }

          // ✅ Password must exist for credentials login
          if (!user.password) {
            await logSecurityEvent({
              userId: user._id.toString(),
              email: user.email,
              role: user.role,
              type: "login_failed",
              ip,
              userAgent,
              metadata: { reason: "no_password_set" },
            });
            throw new Error("Please login using Google or Facebook");
          }

          // ✅ Verify password
          const isPasswordValid = await bcrypt.compare(password, user.password);

          if (!isPasswordValid) {
            const currentAttempts = await handleFailedLogin(user, ip, userAgent);

            // ✅ Progressive throttling
            if (currentAttempts >= THROTTLE_AFTER_ATTEMPTS) {
              const over = currentAttempts - THROTTLE_AFTER_ATTEMPTS + 1;
              const delay = Math.min(
                THROTTLE_MAX_DELAY_MS,
                THROTTLE_BASE_DELAY_MS * over
              );
              await sleep(delay);
            }

            const attemptsRemaining = MAX_LOGIN_ATTEMPTS - currentAttempts;

            await logSecurityEvent({
              userId: user._id.toString(),
              email: user.email,
              role: user.role,
              type: "login_failed",
              ip,
              userAgent,
              metadata: {
                reason: "invalid_password",
                currentAttempts,
                attemptsRemaining: Math.max(0, attemptsRemaining),
              },
            });

            if (attemptsRemaining <= 0) {
              throw new Error(
                `Account locked for ${LOCK_DURATION_MINUTES} minutes due to too many failed attempts.`
              );
            }

            if (attemptsRemaining <= 2) {
              throw new Error(
                `Invalid credentials. ${attemptsRemaining} attempt(s) remaining before account lock.`
              );
            }

            throw new Error("Invalid credentials");
          }

          // ✅ Force password change check
          if (user.security?.forcePasswordChange) {
            await logSecurityEvent({
              userId: user._id.toString(),
              email: user.email,
              role: user.role,
              type: "login_failed",
              ip,
              userAgent,
              metadata: { reason: "force_password_change_required" },
            });
            throw new Error("Password change required. Please reset your password.");
          }

          // ✅ Success! Reset all counters and log device
          await handleSuccessfulLogin(user, ip, userAgent);

          await logSecurityEvent({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
            type: "login_success",
            ip,
            userAgent,
            metadata: {
              provider: "credentials",
              rememberMe,
            },
          });

          // ✅ Prepare safe user object for session
          const safeName =
            (typeof user.name === "string" && user.name.trim()
              ? user.name.trim()
              : "") ||
            (typeof user.displayName === "string" && user.displayName.trim()
              ? user.displayName.trim()
              : "") ||
            "User";

          const safeDisplay =
            (typeof user.displayName === "string" && user.displayName.trim()
              ? user.displayName.trim()
              : safeName.split(" ")[0]) || "User";

          const trustedClaims = buildTrustedSessionClaims(user);

          return {
            id: user._id.toString(),
            email: user.email,
            name: safeName,
            displayName: safeDisplay,
            role: trustedClaims.role,
            authorityRole: trustedClaims.authorityRole,
            capabilities: trustedClaims.capabilities,
            isVerified: Boolean(user.isVerified),
            kycVerified: Boolean((user as any).kycVerified),
            isVerifiedOwner: Boolean((user as any).isVerifiedOwner),
            ownerVerificationStatus: (user as any).ownerVerificationStatus ?? "none",
            isVerifiedAgent: Boolean((user as any).isVerifiedAgent),
            agentVerificationStatus: (user as any).agentVerificationStatus ?? "none",
            onboardingStatus: (user as any).onboardingStatus ?? "none",
            onboardingRole: (user as any).onboardingRole ?? null,
            phoneNumber: user.phone || "",
            profilePicture: user.profilePictureUrl || null,
            permissions: trustedClaims.permissions,
            tokenVersion:
              typeof user.tokenVersion === "number" ? user.tokenVersion : 0,
            rememberMe,
          };
        } catch (error: any) {
          const msg = String(error?.message || "");

          // ✅ Preserve specific error messages
          if (
            msg === "Account is temporarily locked. Please try again later." ||
            msg.includes("locked for") ||
            msg.includes("verify your email") ||
            msg.includes("contact support") ||
            msg.includes("Google or Facebook") ||
            msg.includes("Password change required")
          ) {
            throw new Error(msg);
          }

          throw new Error("Invalid credentials");
        }
      },
    }),

    // ═══════════════════════════════════════════════════════════════
    // 🔐 GOOGLE PROVIDER - ENHANCED
    // ═══════════════════════════════════════════════════════════════
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile", // ✅ Explicit scope
        },
      },
    }),

    // ═══════════════════════════════════════════════════════════════
    // 🔐 FACEBOOK PROVIDER - ENHANCED
    // ═══════════════════════════════════════════════════════════════
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "email,public_profile", // ✅ Explicit scope
        },
      },
    }),
  ],

  callbacks: {
     // ═══════════════════════════════════════════════════════════════
    // ✅ REDIRECT CALLBACK - RESPECT callbackUrl
    // ═══════════════════════════════════════════════════════════════
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // ✅ Allow relative paths (e.g. /add-property, /dashboard)
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      // ✅ Allow same-origin absolute URLs
      try {
        const parsed = new URL(url);
        const base = new URL(baseUrl);
        if (parsed.origin === base.origin) return url;
      } catch {
        // Invalid URL — fall through to baseUrl
      }

      // ✅ Default: go to homepage
      return baseUrl;
    },

    // ═══════════════════════════════════════════════════════════════
    // ✅ SIGN-IN CALLBACK - SOCIAL LOGIN HANDLING
    // ═══════════════════════════════════════════════════════════════
    async signIn({ user, account }: any) {
      if (account?.provider === "google" || account?.provider === "facebook") {
        try {
          await dbConnect();

          const email = user.email?.toLowerCase();
          if (!email) {
            await logSecurityEvent({
              email: "unknown",
              type: "login_failed",
              metadata: {
                reason: "no_email_from_provider",
                provider: account.provider,
              },
            });
            return false;
          }

          let dbUser = (await User.findOne({
            email,
            isDeleted: { $ne: true },
          }).select("email name displayName role status isDeleted isVerified kycVerified isVerifiedOwner ownerVerificationStatus isVerifiedAgent agentVerificationStatus onboardingStatus onboardingRole phone isPhoneVerified profilePictureUrl capabilities permissions tokenVersion verification authProvider socialId +security")) as unknown as DbUser | null;

          if (!dbUser) {
            // ✅ NEW USER - Auto-create with verified status
            const name = user.name || email.split("@")[0];
            const displayName = name.split(" ")[0];

            dbUser = (await User.create({
              email,
              name,
              displayName,
              profilePictureUrl: user.image || "",
              isVerified: true, // ✅ Auto-verify social logins
              isDeleted: false,
              role: "user",
              capabilities: [],
              permissions: [],
              status: "active",
              tokenVersion: 0,
              verification: {
                email: true,
                verifiedAt: new Date(),
              },
              security: {
                totalSuccessfulLogins: 1,
                lastSuccessfulLoginAt: new Date(),
                failedLoginAttempts: 0,
                accountLockedUntil: null,
                accountLockedAt: null,
                lockReason: null,
              },
              auditTrail: { createdVia: "social_login" },
              authProvider: account.provider,
              socialId: account.providerAccountId,
            } as any)) as unknown as DbUser;

            if (!dbUser) return false;

            await logSecurityEvent({
              userId: dbUser._id.toString(),
              email: dbUser.email,
              role: dbUser.role,
              type: "login_success",
              metadata: {
                provider: account.provider,
                isNewUser: true,
                registrationMethod: "social_login",
              },
            });
          } else {
            // ✅ EXISTING USER
            if (dbUser.status && dbUser.status !== "active") return false;
            if (isAccountLocked(dbUser)) return false;

            // ✅ Prepare update object
            const updateData: any = {
              isVerified: true,
              "verification.email": true,
              "security.failedLoginAttempts": 0,
              "security.accountLockedUntil": null,
              "security.accountLockedAt": null,
              "security.lockReason": null,
              loginAttempts: 0,
              lockUntil: null,
              lastLoginAt: new Date(),
            };

            // ✅ Set verifiedAt only if not already set
            if (!dbUser.verification?.verifiedAt) {
              updateData["verification.verifiedAt"] = new Date();
            }

            // ✅ Update displayName if missing
            if (!dbUser.displayName && dbUser.name) {
              updateData.displayName = dbUser.name.split(" ")[0];
            }

            // ✅ Update profile picture if missing
            if (!dbUser.profilePictureUrl && user.image) {
              updateData.profilePictureUrl = user.image;
            }

            // ✅ Ensure tokenVersion exists
            if (typeof dbUser.tokenVersion !== "number") {
              updateData.tokenVersion = 0;
            }

            // ✅ Single atomic update
            await User.findByIdAndUpdate(
              dbUser._id,
              {
                $set: updateData,
                $inc: { "security.totalSuccessfulLogins": 1 },
              },
              { new: true }
            );

            await logSecurityEvent({
              userId: dbUser._id.toString(),
              email: dbUser.email,
              role: dbUser.role,
              type: "login_success",
              metadata: {
                provider: account.provider,
                isNewUser: false,
              },
            });
          }

          if (!dbUser) return false;

          // ✅ Inject data into NextAuth user object
          const trustedClaims = buildTrustedSessionClaims(dbUser);

          (user as any).id = dbUser._id.toString();
          (user as any).role = trustedClaims.role;
          (user as any).authorityRole = trustedClaims.authorityRole;
          (user as any).capabilities = trustedClaims.capabilities;
          (user as any).isVerified = dbUser.isVerified;
          (user as any).phoneNumber = dbUser.phone;
          // 🆕 V6.9.0 — Phone verification flags for lead capture
          (user as any).isPhoneVerified = Boolean((dbUser as any).isPhoneVerified);
          (user as any).needsPhone = !dbUser.phone;
          (user as any).profilePicture = dbUser.profilePictureUrl;
          (user as any).permissions = trustedClaims.permissions;
          (user as any).tokenVersion =
            typeof dbUser.tokenVersion === "number" ? dbUser.tokenVersion : 0;
          (user as any).rememberMe = true; // ✅ Social logins default to "Remember me"
          (user as any).name = dbUser.name || user.name || "User";
          (user as any).displayName =
            dbUser.displayName ||
            (dbUser.name ? dbUser.name.split(" ")[0] : null) ||
            "User";

          user.image = dbUser.profilePictureUrl || user.image;

          return true;
        } catch {
          return false;
        }
      }

      return true;
    },

    // ═══════════════════════════════════════════════════════════════
    // ✅ JWT CALLBACK - TOKEN MANAGEMENT
    // ═══════════════════════════════════════════════════════════════
    async jwt({ token, user, trigger, session }: any) {
      // ✅ Initial sign-in
      if (user) {
        const trustedClaims = buildTrustedSessionClaims(user);

        token.id = user.id;
        token.role = trustedClaims.role;
        token.authorityRole = trustedClaims.authorityRole;
        token.capabilities = trustedClaims.capabilities;
        token.isVerified = user.isVerified;
        token.kycVerified = user.kycVerified ?? false;
                token.isVerifiedOwner = (user as any).isVerifiedOwner ?? false;
        token.ownerVerificationStatus = (user as any).ownerVerificationStatus ?? "none",
        token.isVerifiedAgent = (user as any).isVerifiedAgent ?? false;
        token.agentVerificationStatus = (user as any).agentVerificationStatus ?? "none",
        token.onboardingStatus = user.onboardingStatus ?? "none";
        token.onboardingRole = user.onboardingRole ?? null;
        token.phoneNumber = user.phoneNumber;
        // 🆕 V6.9.0 — Phone verification flags for lead capture
        token.isPhoneVerified = (user as any).isPhoneVerified ?? false;
        token.needsPhone = (user as any).needsPhone ?? false;
        token.profilePicture = user.profilePicture;
        token.permissions = trustedClaims.permissions;
        token.tokenVersion =
          typeof user.tokenVersion === "number" ? user.tokenVersion : 0;
        token.name = user.name || token.name || null;
        token.displayName = user.displayName || "User";

        const rm = Boolean((user as any)?.rememberMe);
        token.rememberMe = rm;
        token.sessionMaxAgeSeconds = rm
          ? REMEMBER_MAX_AGE_SECONDS
          : DEFAULT_SESSION_MAX_AGE_SECONDS;

        token.lastDbCheckAt = Date.now();
        token.isInvalid = false;
      }

      // ═══════════════════════════════════════════════════════════
      // ✅ SESSION UPDATE — SAFE FIELD ALLOWLIST (Sprint 2 Batch B)
      // ═══════════════════════════════════════════════════════════
      // Client calls useSession().update({ ... }) → NextAuth invokes
      // this callback with trigger === "update" and session === payload.
      //
      // We MUST NOT copy privileged fields (role, permissions,
      // capabilities, kycVerified, tokenVersion, etc.) from the client
      // payload. Those are database-owned and refreshed only via the
      // periodic DB check below.
      //
      // Only fields listed in SAFE_SESSION_UPDATE_FIELDS are accepted.
      // Any attempt to mutate other fields is logged as a security event.
      if (trigger === "update" && session && typeof session === "object") {
        const sanitized = applySafeSessionUpdate(session);

        if (sanitized.updates.displayName !== undefined) {
          token.displayName = sanitized.updates.displayName;
        }

        if (sanitized.updates.profilePicture !== undefined) {
          token.profilePicture = sanitized.updates.profilePicture;
        }

        // Log privilege escalation attempts (never block auth for logging)
        if (isPrivilegeEscalationAttempt(sanitized)) {
          try {
            await SecurityEvent.create({
              userId: token.id,
              email: typeof token.email === "string" ? token.email : undefined,
              role: typeof token.role === "string" ? token.role : undefined,
              type: "session_update_privilege_attempt",
              ip: "no-secret-00000000",
              userAgent: "no-secret-00000000",
              metadata: {
                rejectedFields: sanitized.rejectedFields,
                trigger: "session_update",
                tokenId: token.id,
              },
              createdAt: new Date(),
            });
          } catch {
            // Silent fail — never block auth for logging
          }
        }
      }

      // ✅ Periodic DB check (every 5 minutes)
      try {
        const now = Date.now();
        const last =
          typeof token.lastDbCheckAt === "number" ? token.lastDbCheckAt : 0;

        if (token.id && now - last >= TOKEN_DB_CHECK_INTERVAL_MS) {
          await dbConnect();

          const dbUser = await User.findById(token.id)
            .select("tokenVersion status isDeleted name displayName role capabilities permissions isVerified kycVerified isVerifiedOwner ownerVerificationStatus isVerifiedAgent agentVerificationStatus onboardingStatus onboardingRole phone isPhoneVerified")
            .lean();

          token.lastDbCheckAt = now;

          if (!dbUser) {
            token.isInvalid = true;
            return token;
          }

          if ((dbUser as any).isDeleted === true) {
            token.isInvalid = true;
            return token;
          }

          if ((dbUser as any).status && (dbUser as any).status !== "active") {
            token.isInvalid = true;
            return token;
          }

          // ✅ Token version mismatch = logout
          const dbVersion =
            typeof (dbUser as any).tokenVersion === "number"
              ? (dbUser as any).tokenVersion
              : 0;
          const tokenVersion =
            typeof token.tokenVersion === "number" ? token.tokenVersion : 0;

          if (dbVersion !== tokenVersion) {
            token.isInvalid = true;
            return token;
          }

          // ✅ Self-heal missing fields
          const trustedClaims = buildTrustedSessionClaims(dbUser);
          token.role = trustedClaims.role;
          token.authorityRole = trustedClaims.authorityRole;
          token.capabilities = trustedClaims.capabilities;
          token.permissions = trustedClaims.permissions;

          const dbName = (dbUser as any)?.name;
          const dbDisplay = (dbUser as any)?.displayName;
          const dbRole = (dbUser as any)?.role;

          const tokenName =
            typeof token.name === "string" ? token.name.trim() : "";
          const tokenDisplay =
            typeof token.displayName === "string"
              ? token.displayName.trim()
              : "";

          if (
            (!tokenName || tokenName === "User") &&
            typeof dbName === "string" &&
            dbName.trim()
          ) {
            token.name = dbName.trim();
          }
          if (
            (!tokenDisplay || tokenDisplay === "User") &&
            typeof dbDisplay === "string" &&
            dbDisplay.trim()
          ) {
            token.displayName = dbDisplay.trim();
          }
          if (!token.role && typeof dbRole === "string" && dbRole.trim()) {
            token.role = dbRole.trim() as any;
          }

          // ✅ Update isVerified status
          if (typeof (dbUser as any).isVerified === "boolean") {
            token.isVerified = (dbUser as any).isVerified;
          }

          // ✅ Refresh kycVerified — critical for /add-property gate
          // Admin approves KYC → reflected in next DB check (max 5 min lag)
          if (typeof (dbUser as any).kycVerified === "boolean") {
            token.kycVerified = (dbUser as any).kycVerified;
          }

          // ✅ Refresh isVerifiedOwner — critical for /owner/* gate
          // Admin approves owner → reflected in next DB check (max 5 min lag)
          if (typeof (dbUser as any).isVerifiedOwner === "boolean") {
            token.isVerifiedOwner = (dbUser as any).isVerifiedOwner;
          }

          if (typeof (dbUser as any).ownerVerificationStatus === "string") {
            token.ownerVerificationStatus = (dbUser as any).ownerVerificationStatus;
          }

          if (typeof (dbUser as any).isVerifiedAgent === "boolean") {
            token.isVerifiedAgent = (dbUser as any).isVerifiedAgent;
          }

          if (typeof (dbUser as any).agentVerificationStatus === "string") {
            token.agentVerificationStatus = (dbUser as any).agentVerificationStatus;
          }

          // ✅ Refresh onboarding status — dashboard shows correct state
          if (typeof (dbUser as any).onboardingStatus === "string") {
            token.onboardingStatus = (dbUser as any).onboardingStatus;
          }
          if (Object.prototype.hasOwnProperty.call(dbUser, "onboardingRole")) {
            token.onboardingRole = (dbUser as any).onboardingRole ?? null;
          }

          // 🆕 V6.9.0 — Refresh phone verification status
          // Reflects when user verifies phone after login (max 5 min lag)
          if (typeof (dbUser as any).isPhoneVerified === "boolean") {
            token.isPhoneVerified = (dbUser as any).isPhoneVerified;
          }
          // needsPhone = false once user adds phone to their profile
          token.needsPhone = !(dbUser as any).phone;
        }
      } catch {
        // Never block auth for periodic check errors
      }

      return token;
    },

    // ═══════════════════════════════════════════════════════════════
    // ✅ SESSION CALLBACK - SESSION OBJECT CONSTRUCTION
    // ═══════════════════════════════════════════════════════════════
    async session({ session, token }: any) {
      // ✅ Invalidated token = no session
      if (token?.isInvalid) return null;

      // ✅ Enforce "Remember me" policy
      const iatSec =
        typeof (token as any)?.iat === "number" ? (token as any).iat : 0;
      const maxSec =
        typeof (token as any)?.sessionMaxAgeSeconds === "number"
          ? (token as any).sessionMaxAgeSeconds
          : DEFAULT_SESSION_MAX_AGE_SECONDS;

      if (iatSec > 0) {
        const expiresAtMs = (iatSec + maxSec) * 1000;
        if (Date.now() > expiresAtMs) return null;
      }

      if (!session.user) session.user = {} as any;

      session.user.id = token.id;
      session.user.role = token.role;
      session.user.authorityRole = token.authorityRole;
      session.user.capabilities = token.capabilities || [];
      session.user.isVerified = token.isVerified;
      session.user.kycVerified = token.kycVerified ?? false;
      session.user.isVerifiedOwner = token.isVerifiedOwner ?? false;
      session.user.ownerVerificationStatus = token.ownerVerificationStatus ?? "none";
      session.user.isVerifiedAgent = token.isVerifiedAgent ?? false;
      session.user.agentVerificationStatus = token.agentVerificationStatus ?? "none";
      session.user.onboardingStatus = token.onboardingStatus ?? "none";
      session.user.onboardingRole = token.onboardingRole ?? null;
      session.user.phoneNumber = token.phoneNumber;
      // 🆕 V6.9.0 — Phone verification flags for lead capture
      session.user.isPhoneVerified = token.isPhoneVerified ?? false;
      session.user.needsPhone = token.needsPhone ?? false;
      session.user.profilePicture = token.profilePicture || session.user.image;
      session.user.permissions = token.permissions || [];
      session.user.tokenVersion = token.tokenVersion;
      session.user.name = token.name || session.user.name || null;
      (session.user as any).displayName =
        token.displayName ||
        (session.user.name ? String(session.user.name).split(" ")[0] : "User");

      return session;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },

  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
  },

  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email", // ✅ Email verification page
  },

  debug: process.env.NODE_ENV === "development",

  // ✅ Events — production-safe (no console.*)
  events: {},
};

// ═══════════════════════════════════════════════════════════════
// ✅ RATE LIMIT WRAPPER
// ═══════════════════════════════════════════════════════════════
async function applyAuthRateLimit(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<boolean> {
  // ✅ General auth rate limit (all requests)
  const general = await rateLimitAuthAll(req);
  if (!general.ok) {
    res.setHeader("Retry-After", Math.ceil((general.reset - Date.now()) / 1000));
    res.status(429).json({
      error: "Too many requests",
      retryAfter: Math.ceil((general.reset - Date.now()) / 1000),
    });
    return true;
  }

  // ✅ Credentials-specific rate limit (stricter)
  const url = req.url || "";
  const isCredentialsAttempt =
    req.method === "POST" &&
    (url.includes("/callback/credentials") ||
      url.includes("/signin/credentials"));

  if (isCredentialsAttempt) {
    const creds = await rateLimitCredentials(req);
    if (!creds.ok) {
      res.setHeader(
        "Retry-After",
        Math.ceil((creds.reset - Date.now()) / 1000)
      );
      res.status(429).json({
        error: "Too many login attempts",
        retryAfter: Math.ceil((creds.reset - Date.now()) / 1000),
      });
      return true;
    }
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════
// ✅ MAIN AUTH HANDLER EXPORT
// ═══════════════════════════════════════════════════════════════
export default async function authHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ✅ Set security headers
  setAuthSecurityHeaders(res);

  // ✅ Apply rate limiting
  const limited = await applyAuthRateLimit(req, res);
  if (limited) return;

  // ✅ Handle NextAuth
  return await NextAuth(req, res, authOptions);
}

// ========== END OF FILE ==========