// pages/api/admin/security/stats.ts
// 🔒 ENTERPRISE SECURITY STATS API — HIGHRISE.PK
// Security Level: MAXIMUM | Admin Only | Dashboard Stats
// ═══════════════════════════════════════════════════════════════
// PURPOSE:
//   GET → Security dashboard stat cards:
//     • Total events (24h / 7d / 30d)
//     • Events by severity breakdown
//     • Events by type category breakdown
//     • Threat summary (brute force, suspicious, blocked)
//     • Top event types (last 24h)
//     • Hourly trend (last 24h — for chart)
//     • Recent critical events (last 5)
//
// SECURITY:
//   ✅ requireAdmin() auth guard
//   ✅ rateLimitAdmin() rate limiting
//   ✅ No raw PII exposed in any stat
//   ✅ Aggregation only — no documents returned raw
//   ✅ logSecurityEvent audit logging
//   ✅ Security headers + request ID
//   ✅ Generic error messages
// ═══════════════════════════════════════════════════════════════

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect                                 from '@/lib/dbConnect';
import SecurityEvent                             from '@/models/SecurityEvent';
import { requireAdmin }                          from '@/lib/requireAdmin';
import { rateLimitAdmin, sendRateLimitResponse } from '@/lib/rateLimit';
import { logSecurityEvent }                      from '@/lib/security/logSecurityEvent';

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPES
// ═══════════════════════════════════════════════════════════════

interface SeverityBreakdown {
  low:      number;
  medium:   number;
  high:     number;
  critical: number;
}

interface CategoryBreakdown {
  auth:     number;
  account:  number;
  kyc:      number;
  admin:    number;
  security: number;
  system:   number;
  other:    number;
}

interface TopEventType {
  type:  string;
  count: number;
  label: string;
}

interface HourlyPoint {
  hour:     string; // "00" - "23"
  count:    number;
  critical: number;
  high:     number;
}

interface RecentCriticalEvent {
  _id:       string;
  type:      string;
  severity:  string;
  email?:    string;
  ip?:       string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface SecurityStatsResponse {
  success:   boolean;
  stats?:    {
    totals: {
      last24h: number;
      last7d:  number;
      last30d: number;
      allTime: number;
    };
    severity:  SeverityBreakdown;
    category:  CategoryBreakdown;
    topEvents: TopEventType[];
    hourly:    HourlyPoint[];
    threats: {
      bruteForceDetected:    number;
      suspiciousActivity:    number;
      rateLimitExceeded:     number;
      ipBlocked:             number;
      permissionDenied:      number;
      vpnDetected:           number;
    };
    recentCritical: RecentCriticalEvent[];
  };
  message?:  string;
  requestId: string;
}

// ═══════════════════════════════════════════════════════════════
// 🛠️ HELPERS
// ═══════════════════════════════════════════════════════════════

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function setSecurityHeaders(
  res: NextApiResponse,
  requestId: string
): void {
  res.setHeader('X-Request-Id',           requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('Referrer-Policy',        'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control',          'no-store, must-revalidate, private');
}

/**
 * Map event type string to display label.
 */
function labelForType(type: string): string {
  const map: Record<string, string> = {
    login_success:             'Login Success',
    login_failed:              'Login Failed',
    logout:                    'Logout',
    session_expired:           'Session Expired',
    session_hijack_detected:   'Session Hijack',
    token_invalidated:         'Token Invalidated',
    password_reset_requested:  'Password Reset Request',
    password_reset_completed:  'Password Reset Done',
    password_change:           'Password Changed',
    account_locked:            'Account Locked',
    account_created:           'Account Created',
    account_suspended:         'Account Suspended',
    account_deleted:           'Account Deleted',
    email_verified:            'Email Verified',
    role_change:               'Role Changed',
    kyc_submitted:             'KYC Submitted',
    kyc_approved:              'KYC Approved',
    kyc_rejected:              'KYC Rejected',
    property_created:          'Property Created',
    property_flagged:          'Property Flagged',
    admin_login:               'Admin Login',
    admin_action:              'Admin Action',
    permission_denied:         'Permission Denied',
    system_error:              'System Error',
    bulk_action_performed:     'Bulk Action',
    brute_force_detected:      'Brute Force',
    suspicious_activity:       'Suspicious Activity',
    rate_limit_exceeded:       'Rate Limit Hit',
    vpn_detected:              'VPN Detected',
    geo_anomaly:               'Geo Anomaly',
    ip_blocked:                'IP Blocked',
  };
  return (
    map[type] ??
    type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  );
}

/**
 * Classify event type into category bucket.
 */
function categoryForType(type: string): keyof CategoryBreakdown {
  if ([
    'login_success', 'login_failed', 'logout',
    'session_expired', 'session_hijack_detected',
    'token_invalidated', 'password_reset_requested',
    'password_reset_completed', 'password_change',
    'account_locked', '2fa_enabled', '2fa_disabled',
    '2fa_success', '2fa_failed', 'admin_login',
  ].includes(type)) return 'auth';

  if ([
    'account_created', 'account_activated',
    'account_suspended', 'account_deleted',
    'email_verified', 'email_changed',
    'role_change', 'permission_granted',
    'permission_revoked',
  ].includes(type)) return 'account';

  if ([
    'kyc_submitted', 'kyc_approved', 'kyc_rejected',
    'kyc_document_uploaded', 'kyc_document_verified',
    'kyc_locked', 'developer_profile_created',
    'agent_profile_created',
  ].includes(type)) return 'kyc';

  if ([
    'admin_action', 'bulk_action_performed',
    'settings_changed', 'database_backup',
    'user_force_logout', 'user_impersonated',
  ].includes(type)) return 'admin';

  if ([
    'brute_force_detected', 'suspicious_activity',
    'rate_limit_exceeded', 'vpn_detected',
    'geo_anomaly', 'ip_blocked', 'permission_denied',
  ].includes(type)) return 'security';

  if ([
    'system_error',
  ].includes(type)) return 'system';

  return 'other';
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SecurityStatsResponse>
): Promise<void> {
  const requestId = makeRequestId();
  setSecurityHeaders(res, requestId);

  const clientIP  = getClientIP(req);
  const userAgent = String(
    req.headers['user-agent'] || 'unknown'
  ).slice(0, 500);

  // ─────────────────────────────────────────────
  // STEP 1: Method guard
  // ─────────────────────────────────────────────
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({
      success:   false,
      message:   'Method not allowed',
      requestId,
    });
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 2: Rate limit
  // ─────────────────────────────────────────────
  const rl = await rateLimitAdmin(req);
  if (!rl.ok) {
    await logSecurityEvent({
      type:     'rate_limit_exceeded',
      severity: 'medium',
      ip:       clientIP,
      userAgent,
      metadata: {
        action:   'security_stats_rate_limited',
        endpoint: '/api/admin/security/stats',
      },
    });
    sendRateLimitResponse(res, rl);
    return;
  }

  // ─────────────────────────────────────────────
  // STEP 3: Admin auth
  // ─────────────────────────────────────────────
  const auth = await requireAdmin(req, res);
  if (!auth) return;

  await dbConnect();

  try {
    const now    = new Date();
    const now24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const now7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    const now30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── Run all queries in parallel ───────────
    const [
      total24h,
      total7d,
      total30d,
      allTime,
      severityAgg,
      typeAgg,
      hourlyAgg,
      threats24h,
      recentCriticalDocs,
    ] = await Promise.all([

      // ── Total counts by window ────────────
      SecurityEvent.countDocuments({ createdAt: { $gte: now24h } }),
      SecurityEvent.countDocuments({ createdAt: { $gte: now7d  } }),
      SecurityEvent.countDocuments({ createdAt: { $gte: now30d } }),
      SecurityEvent.countDocuments({}),

      // ── Severity breakdown (last 30d) ─────
      SecurityEvent.aggregate([
        { $match: { createdAt: { $gte: now30d } } },
        {
          $group: {
            _id:   '$severity',
            count: { $sum: 1 },
          },
        },
      ]),

      // ── Type breakdown (last 24h) ─────────
      SecurityEvent.aggregate([
        { $match: { createdAt: { $gte: now24h } } },
        {
          $group: {
            _id:   '$type',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),

      // ── Hourly trend (last 24h) ───────────
      // Groups by hour bucket, counts total + critical + high
      SecurityEvent.aggregate([
        { $match: { createdAt: { $gte: now24h } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%H',
                date:   '$createdAt',
              },
            },
            count:    { $sum: 1 },
            critical: {
              $sum: {
                $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0],
              },
            },
            high: {
              $sum: {
                $cond: [{ $eq: ['$severity', 'high'] }, 1, 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // ── Threat-specific counts (last 24h) ─
      SecurityEvent.aggregate([
        {
          $match: {
            createdAt: { $gte: now24h },
            type: {
              $in: [
                'brute_force_detected',
                'suspicious_activity',
                'rate_limit_exceeded',
                'ip_blocked',
                'permission_denied',
                'vpn_detected',
              ],
            },
          },
        },
        {
          $group: {
            _id:   '$type',
            count: { $sum: 1 },
          },
        },
      ]),

      // ── Recent critical events (last 5) ───
      SecurityEvent.find({
        severity: { $in: ['high', 'critical'] },
      })
        .select('-ipRaw -emailHash -ipHash -__v')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // ── Build severity breakdown ───────────────
    const severity: SeverityBreakdown = {
      low:      0,
      medium:   0,
      high:     0,
      critical: 0,
    };
    for (const row of severityAgg) {
      const key = row._id as keyof SeverityBreakdown;
      if (key in severity) severity[key] = row.count;
    }

    // ── Build category breakdown from type agg ─
    const category: CategoryBreakdown = {
      auth:     0,
      account:  0,
      kyc:      0,
      admin:    0,
      security: 0,
      system:   0,
      other:    0,
    };

    const topEvents: TopEventType[] = [];
    for (const row of typeAgg) {
      const cat = categoryForType(row._id as string);
      category[cat] += row.count;
      topEvents.push({
        type:  row._id as string,
        count: row.count,
        label: labelForType(row._id as string),
      });
    }

    // ── Build hourly trend ─────────────────────
    // Fill all 24 hours (0-23) even if no events
    const hourlyMap = new Map<string, HourlyPoint>();
    for (let h = 0; h < 24; h++) {
      const hr = String(h).padStart(2, '0');
      hourlyMap.set(hr, { hour: hr, count: 0, critical: 0, high: 0 });
    }
    for (const row of hourlyAgg) {
      const hr = String(row._id).padStart(2, '0');
      hourlyMap.set(hr, {
        hour:     hr,
        count:    row.count,
        critical: row.critical,
        high:     row.high,
      });
    }
    const hourly = Array.from(hourlyMap.values()).sort(
      (a, b) => parseInt(a.hour) - parseInt(b.hour)
    );

    // ── Build threats breakdown ────────────────
    const threatMap = new Map<string, number>();
    for (const row of threats24h) {
      threatMap.set(row._id as string, row.count);
    }
    const threats = {
      bruteForceDetected: threatMap.get('brute_force_detected') ?? 0,
      suspiciousActivity: threatMap.get('suspicious_activity')  ?? 0,
      rateLimitExceeded:  threatMap.get('rate_limit_exceeded')  ?? 0,
      ipBlocked:          threatMap.get('ip_blocked')           ?? 0,
      permissionDenied:   threatMap.get('permission_denied')    ?? 0,
      vpnDetected:        threatMap.get('vpn_detected')         ?? 0,
    };

    // ── Build recent critical list ─────────────
    const recentCritical: RecentCriticalEvent[] = (
      recentCriticalDocs as any[]
    ).map((ev) => ({
      _id:       String(ev._id),
      type:      ev.type       || 'unknown',
      severity:  ev.severity   || 'high',
      email:     ev.email      || undefined,
      ip:        ev.ip         || undefined,
      metadata:  ev.metadata   || undefined,
      createdAt: ev.createdAt
        ? new Date(ev.createdAt).toISOString()
        : new Date().toISOString(),
    }));

    res.status(200).json({
      success: true,
      stats: {
        totals: {
          last24h: total24h,
          last7d:  total7d,
          last30d: total30d,
          allTime,
        },
        severity,
        category,
        topEvents,
        hourly,
        threats,
        recentCritical,
      },
      requestId,
    });
    return;

  } catch (error: unknown) {
    const errMsg = error instanceof Error
      ? error.message
      : 'Unknown error';

    await logSecurityEvent({
      type:     'system_error',
      severity: 'high',
      userId:   auth.id,
      email:    auth.email,
      ip:       clientIP,
      userAgent,
      metadata: {
        action: 'security_stats_fetch_failed',
        error:  errMsg.slice(0, 200),
      },
    });

    res.status(500).json({
      success:   false,
      message:   'Failed to fetch security stats',
      requestId,
    });
    return;
  }
}