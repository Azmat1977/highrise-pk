/**
 * lib/config/sessionPolicy.ts
 *
 * Sprint 2 Batch E — Session Lifetime Standardization
 *
 * ONE canonical location for all session lifetime and token policy constants.
 * Import from here — never redefine these values elsewhere.
 *
 * ─── tokenVersion Contract ───────────────────────────────────────────────────
 *
 * tokenVersion is stored on User.tokenVersion (MongoDB) and mirrored in the
 * JWT. The periodic DB check (TOKEN_DB_CHECK_INTERVAL_MS) compares the two.
 * A mismatch marks the token as invalid → session is destroyed within
 * TOKEN_DB_CHECK_INTERVAL_MS of the version change.
 *
 * WHEN TO INCREMENT tokenVersion (always use $inc or +1, never hardcode):
 *   → Password change          (invalidates all sessions — user changed creds)
 *   → Password reset           (invalidates all sessions — possible compromise)
 *   → Role change by admin     (new permissions must be re-evaluated)
 *   → Account suspend / ban    (force immediate logout on next DB check)
 *   → Admin force-logout       (explicit admin action)
 *   → Social account linked    (security posture changed)
 *   → 2FA enabled / disabled   (security posture changed)
 *
 * NEVER increment tokenVersion for:
 *   → Profile name / picture updates  (harmless, no security impact)
 *   → Phone number addition            (no security impact)
 *   → Preference changes               (no security impact)
 *
 * ─── Session Lifetime Policy ─────────────────────────────────────────────────
 *
 * Two tiers:
 *   Standard session  → DEFAULT_SESSION_MAX_AGE_SECONDS (8 hours)
 *                        For users who do NOT check "Remember me"
 *                        Enforced per-token in the JWT callback
 *
 *   Remember-me       → REMEMBER_MAX_AGE_SECONDS (7 days)
 *                        For users who check "Remember me"
 *                        Stored as token.sessionMaxAgeSeconds at sign-in
 *                        Enforced per-token in the JWT callback
 *
 * NextAuth's session.maxAge is set to REMEMBER_MAX_AGE_SECONDS (the longer
 * value) so that remember-me tokens are not expired by the framework before
 * our own per-token enforcement runs. Standard sessions are expired by the
 * JWT callback before the framework would expire them anyway.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Session Lifetimes ────────────────────────────────────────────────────────

/** Maximum JWT lifetime. Set to the longer (remember-me) value so NextAuth
 *  does not expire remember-me tokens early. Standard sessions are cut short
 *  by per-token enforcement in the JWT callback. */
export const NEXTAUTH_JWT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 604800 (7 days)

/** Session lifetime for users who check "Remember me". */
export const REMEMBER_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 604800 (7 days)

/** Session lifetime for users who do NOT check "Remember me". */
export const DEFAULT_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 28800 (8 hours)

/** How often NextAuth refreshes the session cookie (rolling window). */
export const SESSION_UPDATE_AGE_SECONDS = 4 * 60 * 60; // 14400 (4 hours)

// ─── Token Integrity ──────────────────────────────────────────────────────────

/** How often the JWT callback re-reads the DB to verify tokenVersion,
 *  account status, and refresh permissions. Lower = faster revocation,
 *  higher = fewer DB reads. 5 minutes is the recommended default. */
export const TOKEN_DB_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 300000 (5 minutes)

/** Maximum lag between a tokenVersion increment and session invalidation.
 *  Equal to TOKEN_DB_CHECK_INTERVAL_MS in the worst case. */
export const MAX_SESSION_REVOCATION_LAG_MS = TOKEN_DB_CHECK_INTERVAL_MS;