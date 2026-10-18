// ========== FILE: middleware.ts ==========
// 🔒 ENTERPRISE MIDDLEWARE - HIGHRISE.PK
// V6.0.0 — Sprint 2 Alignment
//
// CLOSED GAPS:
//   GAP-A08: Owner routes now protected
//   GAP-R08: Deny-by-default for unknown protected paths
//   GAP-R09: Exact match + explicit prefix (no startsWith bugs)
//   GAP-R12: Deprecated X-XSS-Protection removed
//   Sprint 1 architecture drift: canonical Role types + capabilities
//
// DESIGN PRINCIPLES:
//   1. ALLOWLIST public routes — everything else needs authentication
//   2. Route table drives access rules (auditable, extensible)
//   3. Capability check runs alongside legacy role check (unified account)
//   4. Edge Runtime cannot access DB — server-side requireAuth() validates tokenVersion
//   5. Public profile detection uses PATTERN, not startsWith
//
// EDGE RUNTIME LIMITATIONS:
//   → No DB access (no tokenVersion revocation check here)
//   → No bcrypt, no Mongoose, no Node crypto
//   → Only @/lib/auth TYPES + constants may be imported (Edge-safe)
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPES (aligned with Sprint 1 lib/auth)
// ═══════════════════════════════════════════════════════════════

type CanonicalRole =
  | "user"
  | "reader"
  | "writer"
  | "editor"
  | "moderator"
  | "finance"
  | "admin"
  | "superadmin";

type LegacyMarketplaceRole = "agent" | "developer" | "society";

type SessionRole = CanonicalRole | LegacyMarketplaceRole;

type Capability =
  | "property_owner"
  | "real_estate_agent"
  | "property_developer"
  | "housing_society"
  | "material_supplier"
  | "construction_contractor"
  | "professional_service_provider"
  | "skilled_worker"
  | "maintenance_service_provider"
  | "home_visit_inspector";

type VerificationStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended"
  | "info_required";

interface JWTPayload {
  id?: string;
  sub?: string;
  role?: SessionRole;
  authorityRole?: CanonicalRole;
  capabilities?: Capability[];
  isVerified?: boolean;
  kycVerified?: boolean;
  isVerifiedOwner?: boolean;
  ownerVerificationStatus?: VerificationStatus;
  isVerifiedAgent?: boolean;
  agentVerificationStatus?: VerificationStatus;
  onboardingStatus?: "none" | "pending" | "approved" | "rejected" | "info_required";
  tokenVersion?: number;
  isInvalid?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 ROUTE CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * FULLY PUBLIC EXACT PATHS
 * Anyone (guests, bots, crawlers) can access these without authentication.
 */
const PUBLIC_EXACT_PATHS = new Set<string>([
  "/",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/sitemap.xml",
  "/static-sitemap.xml",
  "/robots.txt",

  // Auth pages
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/error",
  "/auth/verify-request",

  // Public listings roots
  "/properties",
  "/projects",
  "/societies",
  "/developers",
  "/agents",
  "/blog",

  // Tools (all public)
  "/tools",
  "/tools/verify-society",
  "/tools/price-estimator",
  "/tools/construction-calculator",
  "/tools/area-unit-converter",
  "/tools/home-loan-calculator",

  // Info
  "/risk-alerts",
  "/compare",
  "/coming-soon",
  "/newsletter/error",
  "/newsletter/verified",
  "/unsubscribed",
]);

/**
 * PUBLIC PREFIX PATHS
 * Everything under these prefixes is public.
 * Order matters: longest specific prefix first.
 */
const PUBLIC_PREFIXES = [
  // Next.js internals — never block
  "/_next/",
  "/api/auth/",       // NextAuth routes must be reachable
  "/favicon",
  "/images/",
  "/icons/",
  "/fonts/",
  "/og/",

  // Public content sitemaps
  "/properties/sitemap",
  "/projects/sitemap",
  "/developers/sitemap",
  "/agents/sitemap",
  "/blog/sitemap",
  "/societies/sitemap",
  "/tools/sitemap",

  // Tool SEO pages
  "/tools/area-unit-converter/",
  "/tools/verify-society/",

  // Public content detail pages
  "/property/",
  "/properties/",
  "/projects/",
  "/developers/",
  "/agents/",
  "/compare/",
  "/societies/",
  "/blog/",
  "/risk-alerts/",

  // SafeDeal (public service page)
  "/safedeal",
] as const;

/**
 * PUBLIC PROFILE ROUTES
 * These are /<role>/<slug> pages that are PUBLIC profile pages,
 * NOT dashboards. Detected by pattern matching + exclusion list.
 */
const PUBLIC_PROFILE_ROUTES = ["/agent", "/developer", "/society"] as const;

/**
 * DASHBOARD SLUGS — these are NOT public profile slugs
 * If /agent/dashboard, /developer/projects, etc. matches, it's a dashboard route
 */
const DASHBOARD_SLUGS = new Set<string>([
  // Common to all roles
  "dashboard",
  "profile",
  "listings",
  "leads",
  "analytics",
  "settings",
  "onboarding",
  "register",
  "kyc",
  "upgrade",
  "notifications",
  "verify",
  "edit",
  "new",
  "create",

  // Developer-specific
  "projects",
  "units",
  "reports",
  "team",

  // Society-specific
  "plots",
  "blocks",
  "installments",
  "members",
  "noc",
]);

/**
 * AUTH-ONLY PAGES
 * Redirect authenticated users AWAY from these to their dashboard
 */
const AUTH_ONLY_PAGES = new Set<string>([
  "/login",
  "/register",
  "/forgot-password",
]);

/**
 * ROUTE PROTECTION TABLE
 * Explicit rules for every protected route family.
 * DENY BY DEFAULT — any path not matched here requires authentication.
 */
interface RouteRule {
  /** Exact path match OR prefix match ending with "/" */
  path: string;
  /** True if this is a prefix rule (matches path + "/*") */
  isPrefix: boolean;
  /** Required check level */
  level: "auth" | "role" | "capability" | "kyc" | "verifiedOwner" | "verifiedAgent";
  /** Allowed authority roles (for level: "role") */
  allowedRoles?: readonly CanonicalRole[];
  /** Allowed capabilities (for level: "capability") — user needs ANY of these */
  allowedCapabilities?: readonly Capability[];
  /** Human-readable reason for denial */
  denyReason: string;
}

const ROUTE_RULES: readonly RouteRule[] = [
  // ─── ADMIN AREA ────────────────────────────────────────────
  {
    path: "/admin",
    isPrefix: true,
    level: "role",
    allowedRoles: ["admin", "superadmin", "moderator", "finance", "editor"],
    denyReason: "admin_required",
  },

  // ─── OWNER AREA (Sprint 1 GAP-A08 fix) ────────────────────
  // Tier 1: Any authenticated user (to see verification status)
  { path: "/owner/dashboard", isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/owner/verify",    isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/owner/profile",   isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/owner/kyc",       isPrefix: true, level: "auth", denyReason: "auth_required" },

  // Tier 2: Verified owner only (property creation)
  { path: "/owner/listings/new",  isPrefix: false, level: "verifiedOwner", denyReason: "owner_verification_required" },
  { path: "/owner/listings/edit", isPrefix: true,  level: "verifiedOwner", denyReason: "owner_verification_required" },
  { path: "/owner/listings",      isPrefix: true,  level: "auth",          denyReason: "auth_required" },

  // ─── AGENT AREA ────────────────────────────────────────────
  // Tier 1: Any authenticated user (see profile/onboarding)
  { path: "/agent/dashboard", isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/agent/register",  isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/agent/onboarding",isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/agent/kyc",       isPrefix: true, level: "auth", denyReason: "auth_required" },

  // Tier 2: Verified agent (or admin) for full agent tools
  {
    path: "/agent/listings",
    isPrefix: true,
    level: "capability",
    allowedCapabilities: ["real_estate_agent"],
    denyReason: "agent_verification_required",
  },
  {
    path: "/agent/leads",
    isPrefix: true,
    level: "capability",
    allowedCapabilities: ["real_estate_agent"],
    denyReason: "agent_verification_required",
  },
  {
    path: "/agent/analytics",
    isPrefix: true,
    level: "capability",
    allowedCapabilities: ["real_estate_agent"],
    denyReason: "agent_verification_required",
  },

  // ─── DEVELOPER AREA ────────────────────────────────────────
  { path: "/developer/dashboard",   isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/developer/register",    isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/developer/onboarding",  isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/developer/kyc",         isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/developer/profile",     isPrefix: true, level: "auth", denyReason: "auth_required" },

  {
    path: "/developer/projects",
    isPrefix: true,
    level: "capability",
    allowedCapabilities: ["property_developer"],
    denyReason: "developer_verification_required",
  },
  {
    path: "/developer/units",
    isPrefix: true,
    level: "capability",
    allowedCapabilities: ["property_developer"],
    denyReason: "developer_verification_required",
  },
  {
    path: "/developer/team",
    isPrefix: true,
    level: "capability",
    allowedCapabilities: ["property_developer"],
    denyReason: "developer_verification_required",
  },

  // ─── SOCIETY AREA ──────────────────────────────────────────
  { path: "/society/dashboard",   isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/society/register",    isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/society/onboarding",  isPrefix: true, level: "auth", denyReason: "auth_required" },

  {
    path: "/society/plots",
    isPrefix: true,
    level: "capability",
    allowedCapabilities: ["housing_society"],
    denyReason: "society_verification_required",
  },
  {
    path: "/society/blocks",
    isPrefix: true,
    level: "capability",
    allowedCapabilities: ["housing_society"],
    denyReason: "society_verification_required",
  },
  {
    path: "/society/installments",
    isPrefix: true,
    level: "capability",
    allowedCapabilities: ["housing_society"],
    denyReason: "society_verification_required",
  },
  {
    path: "/society/members",
    isPrefix: true,
    level: "capability",
    allowedCapabilities: ["housing_society"],
    denyReason: "society_verification_required",
  },
  {
    path: "/society/noc",
    isPrefix: true,
    level: "capability",
    allowedCapabilities: ["housing_society"],
    denyReason: "society_verification_required",
  },

  // ─── KYC-GATED PROPERTY CREATION ───────────────────────────
  { path: "/add-property",   isPrefix: true, level: "kyc", denyReason: "kyc_required" },
  { path: "/edit-property",  isPrefix: true, level: "kyc", denyReason: "kyc_required" },

  // ─── USER-ONLY AREAS (any authenticated user) ─────────────
  { path: "/dashboard",         isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/onboarding",        isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/profile",           isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/settings",          isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/account",           isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/favorites",         isPrefix: true, level: "auth", denyReason: "auth_required" },
  // Canonical shortlist / wishlist routes (Header heart + Dashboard card)
  { path: "/saved-properties",  isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/shortlist",         isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/notifications",     isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/messages",          isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/my-properties",     isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/my-listings",       isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/my-projects",       isPrefix: true, level: "auth", denyReason: "auth_required" },
  { path: "/my-saved",          isPrefix: true, level: "auth", denyReason: "auth_required" },

  // ─── SAFEDEAL AREA ─────────────────────────────────────────────
  // Public service page is in PUBLIC_EXACT_PATHS
  // Customer dashboard (any authenticated user)
  { path: "/safedeal/dashboard", isPrefix: true, level: "auth", denyReason: "auth_required" },
  // SafeDeal case detail (any authenticated user)
  { path: "/safedeal/dashboard/", isPrefix: true, level: "auth", denyReason: "auth_required" },
];

// ═══════════════════════════════════════════════════════════════
// 🔐 PATH MATCHING HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if pathname is a public exact path or matches a public prefix.
 */
function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return true;
  }

  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if pathname is a public profile page: /agent/[slug], /developer/[slug], /society/[slug]
 * Uses regex to enforce EXACT pattern — no startsWith bugs.
 * Excludes dashboard slugs (dashboard, profile, listings, etc.)
 */
function isPublicProfilePath(pathname: string): boolean {
  for (const rolePrefix of PUBLIC_PROFILE_ROUTES) {
    // Match exactly /<role>/<slug> or /<role>/<slug>/
    // Slug must be a single segment (no further slashes)
    const pattern = new RegExp(`^${rolePrefix}/([^/]+)/?$`);
    const match = pathname.match(pattern);

    if (match) {
      const slug = match[1];
      // If slug is a dashboard slug, NOT a public profile
      if (DASHBOARD_SLUGS.has(slug)) {
        return false;
      }
      return true;
    }
  }

  return false;
}

/**
 * Exact-or-prefix match for route rules.
 * Prevents /admin from matching /administrator (startsWith bug).
 */
function matchesRoute(pathname: string, rule: RouteRule): boolean {
  if (!rule.isPrefix) {
    // Exact match only
    return pathname === rule.path;
  }

  // Prefix match: pathname must equal path OR start with path + "/"
  return pathname === rule.path || pathname.startsWith(rule.path + "/");
}

/**
 * Find the FIRST matching route rule for a pathname.
 * Rules are evaluated in declaration order — more specific paths first.
 */
function findRouteRule(pathname: string): RouteRule | null {
  for (const rule of ROUTE_RULES) {
    if (matchesRoute(pathname, rule)) {
      return rule;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 AUTHORIZATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get canonical authority role from token.
 * Prefers authorityRole (Sprint 1) — falls back to role for legacy tokens.
 * Legacy marketplace roles (agent/developer/society) map to "user" authority.
 */
function getAuthorityRole(token: JWTPayload | null): CanonicalRole {
  if (!token) return "user";

  if (token.authorityRole) {
    return token.authorityRole;
  }

  const canonicalRoles: readonly CanonicalRole[] = [
    "user", "reader", "writer", "editor",
    "moderator", "finance", "admin", "superadmin",
  ];

  if (token.role && canonicalRoles.includes(token.role as CanonicalRole)) {
    return token.role as CanonicalRole;
  }

  // Legacy marketplace roles have "user" authority
  return "user";
}

/**
 * Check if authority role has admin or superadmin privileges.
 */
function isAdminRole(role: CanonicalRole): boolean {
  return role === "admin" || role === "superadmin";
}

/**
 * Check if token has ANY of the required capabilities.
 * Admins always pass capability checks.
 */
function hasAnyCapability(
  token: JWTPayload | null,
  required: readonly Capability[],
): boolean {
  if (!token) return false;

  const authority = getAuthorityRole(token);
  if (isAdminRole(authority)) return true;

  const userCaps = token.capabilities ?? [];
  return required.some((cap) => userCaps.includes(cap));
}

/**
 * Check if token has any of the allowed authority roles.
 */
function hasAllowedRole(
  token: JWTPayload | null,
  allowed: readonly CanonicalRole[],
): boolean {
  if (!token) return false;

  const authority = getAuthorityRole(token);

  // Superadmin always passes any role check
  if (authority === "superadmin") return true;

  return allowed.includes(authority);
}

// ═══════════════════════════════════════════════════════════════
// 🔐 URL BUILDERS
// ═══════════════════════════════════════════════════════════════

function buildLoginUrl(req: NextRequest, callbackUrl: string): string {
  const url = new URL("/login", req.url);
  url.searchParams.set("callbackUrl", callbackUrl);
  return url.toString();
}

function buildErrorRedirect(req: NextRequest, reason: string): string {
  const url = new URL("/", req.url);
  url.searchParams.set("error", reason);
  return url.toString();
}

function buildKycRedirect(req: NextRequest): string {
  const url = new URL("/dashboard", req.url);
  url.searchParams.set("kyc_required", "1");
  return url.toString();
}

function buildOwnerVerificationRedirect(req: NextRequest): string {
  const url = new URL("/owner/verify", req.url);
  url.searchParams.set("required", "1");
  return url.toString();
}

function buildAgentVerificationRedirect(req: NextRequest): string {
  const url = new URL("/agent/register", req.url);
  url.searchParams.set("required", "1");
  return url.toString();
}

function getDashboardForRole(role: CanonicalRole | null, req: NextRequest): string {
  const base = new URL(req.url).origin;

  if (!role) return `${base}/dashboard`;
  if (isAdminRole(role)) return `${base}/admin`;
  if (role === "moderator") return `${base}/admin`;
  if (role === "finance") return `${base}/admin`;
  if (role === "editor") return `${base}/admin`;

  return `${base}/dashboard`;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

/**
 * Apply security headers to every response.
 * X-XSS-Protection removed (deprecated, use CSP instead).
 */
function addSecurityHeaders(
  response: NextResponse,
  requestId: string,
): NextResponse {
  response.headers.set("X-Request-Id", requestId);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  return response;
}

function generateRequestId(): string {
  return crypto.randomUUID();
}

// ═══════════════════════════════════════════════════════════════
// 🔐 RULE ENFORCEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluate a route rule against a token.
 * Returns null if allowed, or a redirect URL if denied.
 */
function enforceRule(
  rule: RouteRule,
  token: JWTPayload | null,
  req: NextRequest,
  pathname: string,
): string | null {
  const isAuthenticated = Boolean(token?.id || token?.sub);

  // All rules require authentication first
  if (!isAuthenticated) {
    return buildLoginUrl(req, pathname);
  }

  const authority = getAuthorityRole(token);

  // Superadmin bypasses everything
  if (authority === "superadmin") {
    return null;
  }

  switch (rule.level) {
    case "auth":
      // Authentication was already checked — allow
      return null;

    case "role": {
      if (!rule.allowedRoles) return null;
      if (hasAllowedRole(token, rule.allowedRoles)) return null;
      return buildErrorRedirect(req, rule.denyReason);
    }

    case "capability": {
      if (!rule.allowedCapabilities) return null;
      if (hasAnyCapability(token, rule.allowedCapabilities)) return null;

      // Direct user to verification flow instead of generic error
      const cap = rule.allowedCapabilities[0];
      if (cap === "real_estate_agent") {
        return buildAgentVerificationRedirect(req);
      }
      if (cap === "property_developer" || cap === "housing_society") {
        return buildErrorRedirect(req, rule.denyReason);
      }
      return buildErrorRedirect(req, rule.denyReason);
    }

    case "kyc": {
      if (isAdminRole(authority)) return null;
      if (token?.kycVerified === true) return null;
      return buildKycRedirect(req);
    }

    case "verifiedOwner": {
      if (isAdminRole(authority)) return null;
      if (token?.isVerifiedOwner === true) return null;
      return buildOwnerVerificationRedirect(req);
    }

    case "verifiedAgent": {
      if (isAdminRole(authority)) return null;
      if (token?.isVerifiedAgent === true) return null;
      return buildAgentVerificationRedirect(req);
    }

    default:
      // Unknown level → deny by default
      return buildErrorRedirect(req, "access_denied");
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 MAIN MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const requestId = generateRequestId();

  // ─── STEP 1: Public exact + prefix paths — pass through ───
  // Devtools/browser metadata endpoints - never auth-gated. Chrome DevTools
  // requests /.well-known/appspecific/com.chrome.devtools.json on open; a
  // login redirect here navigates the SPA and unmounts open modals.
  if (pathname.startsWith("/.well-known/")) {
    return addSecurityHeaders(NextResponse.next(), requestId);
  }

  if (isPublicPath(pathname)) {
    return addSecurityHeaders(NextResponse.next(), requestId);
  }

  // ─── STEP 2: Public profile pages (/agent/[slug], etc.) ───
  if (isPublicProfilePath(pathname)) {
    return addSecurityHeaders(NextResponse.next(), requestId);
  }

  // ─── STEP 3: API routes — protected by requireAuth() server-side ───
  // Middleware does not block APIs; they return 401 from lib/requireAuth.ts
  if (pathname.startsWith("/api/")) {
    return addSecurityHeaders(NextResponse.next(), requestId);
  }

  // ─── STEP 4: Extract JWT token (Edge Runtime — no DB access) ───
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as JWTPayload | null;

  const isAuthenticated = Boolean(token?.id || token?.sub);

  // NOTE ON tokenVersion:
  //   Middleware cannot access the DB, so it cannot verify tokenVersion
  //   against the current DB value. This means a revoked JWT (via password
  //   change or admin action) may still pass middleware checks briefly.
  //   However, requireAuth() runs on every API call and WILL catch stale
  //   tokenVersion, returning 401. Server-rendered pages that call APIs
  //   will fail fast. Purely client-rendered pages that never call APIs
  //   are the only risk surface, and those don't handle sensitive data.
  //
  //   Full mitigation requires Upstash Redis lookup here (future sprint).
  if (token?.isInvalid === true) {
    return addSecurityHeaders(
      NextResponse.redirect(buildLoginUrl(req, pathname)),
      requestId,
    );
  }

  // ─── STEP 5: Redirect authenticated users AWAY from auth pages ───
  if (isAuthenticated && AUTH_ONLY_PAGES.has(pathname)) {
    const authority = getAuthorityRole(token);
    return addSecurityHeaders(
      NextResponse.redirect(getDashboardForRole(authority, req)),
      requestId,
    );
  }

  // Legacy shortlist alias → canonical saved-properties
  if (pathname === "/shortlist" || pathname.startsWith("/shortlist/")) {
    const url = new URL("/saved-properties", req.url);
    return addSecurityHeaders(NextResponse.redirect(url), requestId);
  }

  // ─── STEP 6: Find matching route rule ───
  const rule = findRouteRule(pathname);

  if (rule) {
    // Rule found — enforce it
    const denyRedirect = enforceRule(rule, token, req, pathname);
    if (denyRedirect) {
      return addSecurityHeaders(
        NextResponse.redirect(denyRedirect),
        requestId,
      );
    }
    return addSecurityHeaders(NextResponse.next(), requestId);
  }

  // ─── STEP 7: DENY BY DEFAULT ───
  // No public match, no route rule match, not an API.
  // This path is either:
  //   (a) A typo or scanning attempt → deny
  //   (b) A new page not yet added to ROUTE_RULES → deny (developer must add rule)
  //   (c) A page that should be public → add to PUBLIC_EXACT_PATHS or PUBLIC_PREFIXES
  //
  // For authenticated users, deny gracefully with a redirect to dashboard.
  // For unauthenticated users, deny with a login redirect.
  if (isAuthenticated) {
    const authority = getAuthorityRole(token);
    return addSecurityHeaders(
      NextResponse.redirect(getDashboardForRole(authority, req)),
      requestId,
    );
  }

  return addSecurityHeaders(
    NextResponse.redirect(buildLoginUrl(req, pathname)),
    requestId,
  );
}

// ═══════════════════════════════════════════════════════════════
// 🔐 MATCHER CONFIG
// ═══════════════════════════════════════════════════════════════

export const config = {
  matcher: [
    /*
     * Run middleware on all paths EXCEPT static assets.
     * The middleware itself decides public vs protected.
     */
    "/((?!_next/static|_next/image|favicon.ico|images/|icons/|fonts/|og/).*)",
  ],
};

// ========== END OF FILE ==========