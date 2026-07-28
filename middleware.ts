// ========== FILE: middleware.ts ==========
// 🔒 ENTERPRISE MIDDLEWARE - HIGHRISE.PK
// Security Level: MAXIMUM | Edge Runtime | Route Protection
// V5.8.0 — Complete rewrite: 25+ public paths, society tier,
//           kycVerified gate, public profile routing, no uuid import
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ═══════════════════════════════════════════════════════════════
// 🔐 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

type UserRole =
  | "user"
  | "reader"
  | "writer"
  | "editor"
  | "developer"
  | "agent"
  | "society"
  | "admin";

interface JWTPayload {
  id?: string;
  role?: UserRole;
  isEmailVerified?: boolean;
  kycVerified?: boolean;
  onboardingStatus?: string;
  tokenVersion?: number;
  sub?: string;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 ROUTE CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ FULLY PUBLIC — no auth required, no redirect
 * Visitors, bots, SEO crawlers all allowed
 */
const PUBLIC_PATHS = new Set([
  // Core pages
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
  "/verify-email",
  "/auth/error",
  "/auth/verify-request",

  // Property browsing (public)
  "/properties",
  "/search",

  // Project browsing (public)
  "/projects",

  // Society browsing (public)
  "/societies",

  // Blog (public)
  "/blog",

  // Tools (all public)
  "/tools",
  "/tools/verify-society",
  "/tools/price-estimator",
  "/tools/construction-calculator",
  "/tools/area-unit-converter",
  "/tools/home-loan-calculator",

  // Risk intelligence (public)
  "/risk-alerts",

  // Legal / Info
  "/faq",
  "/help",
  "/careers",
  "/news",
  "/press",
  "/advertise",
  "/partner",
]);

/**
 * ✅ PUBLIC PATH PREFIXES — dynamic routes that are public
 * Checked with startsWith() — order matters (longest first)
 */
const PUBLIC_PREFIXES = [
  // Tool SEO pages
  "/tools/area-unit-converter/",
  "/tools/verify-society/",

  // Public content
  "/properties/",
  "/projects/",
  "/societies/",
  "/blog/",
  "/risk-alerts/",

  // Sitemap variants
  "/projects/sitemap",
  "/blog/sitemap",
  "/societies/sitemap",
  "/tools/sitemap",

  // Next.js internals (never block)
  "/_next/",
  "/api/auth/",       // NextAuth routes always public
  "/favicon",
  "/images/",
  "/icons/",
  "/fonts/",
  "/og/",             // Open Graph images
];

/**
 * ✅ PUBLIC PROFILE PATTERNS
 * These are dynamic [slug] routes that look like role paths
 * but are actually public listing/detail pages
 * 
 * /agent/[slug]      → public agent profile
 * /developer/[slug]  → public developer profile
 * /society/[slug]    → public society profile
 * 
 * These must be checked BEFORE role-based path matching
 */
const PUBLIC_PROFILE_SLUGS_EXCLUDED = new Set([
  // Agent dashboard paths — NOT public profiles
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
  // Developer dashboard paths — NOT public profiles
  "projects",
  "units",
  "reports",
  "team",
  // Society dashboard paths — NOT public profiles
  "plots",
  "blocks",
  "installments",
  "members",
  "noc",
]);

/**
 * ✅ PROTECTED PATH PREFIXES BY ROLE
 */
const ADMIN_PATHS = "/admin";
const DEVELOPER_PATHS = "/developer";
const AGENT_PATHS = "/agent";
const SOCIETY_PATHS = "/society";
const DASHBOARD_PATHS = "/dashboard";
const ONBOARDING_PATHS = "/onboarding";

/**
 * ✅ PATHS THAT REQUIRE kycVerified = true
 * Property creation requires full KYC
 */
const KYC_REQUIRED_PATHS = new Set([
  "/add-property",
  "/edit-property",
  "/my-properties/new",
]);

/**
 * ✅ PATHS THAT REQUIRE AUTHENTICATION (any role)
 */
const AUTH_REQUIRED_PREFIXES = [
  "/profile",
  "/settings",
  "/favorites",
  "/notifications",
  "/messages",
  "/my-properties",
  "/my-listings",
  "/my-projects",
  "/my-saved",
  "/account",
];

// ═══════════════════════════════════════════════════════════════
// 🔐 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function generateRequestId(): string {
  return crypto.randomUUID();
}

function isPublicPath(pathname: string): boolean {
  // Exact match
  if (PUBLIC_PATHS.has(pathname)) return true;

  // Prefix match
  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }

  return false;
}

/**
 * ✅ Check if a /agent/[slug], /developer/[slug], or /society/[slug]
 * path is a PUBLIC profile page (not a dashboard route)
 */
function isPublicProfilePath(pathname: string): boolean {
  const agentMatch = pathname.match(/^\/agent\/([^/]+)\/?$/);
  if (agentMatch) {
    const slug = agentMatch[1];
    return !PUBLIC_PROFILE_SLUGS_EXCLUDED.has(slug);
  }

  const developerMatch = pathname.match(/^\/developer\/([^/]+)\/?$/);
  if (developerMatch) {
    const slug = developerMatch[1];
    return !PUBLIC_PROFILE_SLUGS_EXCLUDED.has(slug);
  }

  const societyMatch = pathname.match(/^\/society\/([^/]+)\/?$/);
  if (societyMatch) {
    const slug = societyMatch[1];
    return !PUBLIC_PROFILE_SLUGS_EXCLUDED.has(slug);
  }

  return false;
}

function buildLoginUrl(req: NextRequest, callbackUrl: string): string {
  const url = new URL("/login", req.url);
  url.searchParams.set("callbackUrl", callbackUrl);
  return url.toString();
}

function buildForbiddenUrl(req: NextRequest, reason: string): string {
  const url = new URL("/", req.url);
  url.searchParams.set("error", reason);
  return url.toString();
}

// ═══════════════════════════════════════════════════════════════
// 🔐 SECURITY HEADERS
// ═══════════════════════════════════════════════════════════════

function addSecurityHeaders(response: NextResponse, requestId: string): NextResponse {
  // Request tracking
  response.headers.set("X-Request-Id", requestId);

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Cache control for API routes
  // (page caching handled by ISR/getStaticProps)

  return response;
}

// ═══════════════════════════════════════════════════════════════
// 🔐 MAIN MIDDLEWARE FUNCTION
// ═══════════════════════════════════════════════════════════════

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const requestId = generateRequestId();

  // ═══════════════════════════════════════════════════════════
  // STEP 1: Always-public paths — exit immediately
  // ═══════════════════════════════════════════════════════════
  if (isPublicPath(pathname)) {
    const response = NextResponse.next();
    return addSecurityHeaders(response, requestId);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 2: Public profile pages — /agent/[slug], /developer/[slug]
  // Must check BEFORE role-based path matching
  // ═══════════════════════════════════════════════════════════
  if (isPublicProfilePath(pathname)) {
    const response = NextResponse.next();
    return addSecurityHeaders(response, requestId);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 3: API routes not under /api/auth/ need auth
  // But we don't redirect APIs — they return 401 from requireAuth()
  // ═══════════════════════════════════════════════════════════
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    return addSecurityHeaders(response, requestId);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 4: Extract JWT token (Edge Runtime — no DB access)
  // ═══════════════════════════════════════════════════════════
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  }) as JWTPayload | null;

  const isAuthenticated = Boolean(token?.id || token?.sub);
  const userRole = token?.role ?? null;
  const isKycVerified = token?.kycVerified ?? false;
  const onboardingStatus = token?.onboardingStatus ?? "none";

  // ═══════════════════════════════════════════════════════════
  // STEP 5: Redirect logged-in users away from auth pages
  // ═══════════════════════════════════════════════════════════
  const authOnlyPages = new Set(["/login", "/register", "/forgot-password"]);
  if (isAuthenticated && authOnlyPages.has(pathname)) {
    const dashboardUrl = getDashboardForRole(userRole, req);
    const response = NextResponse.redirect(dashboardUrl);
    return addSecurityHeaders(response, requestId);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 6: KYC-gated paths — require kycVerified = true
  // ═══════════════════════════════════════════════════════════
  const isKycRequiredPath = KYC_REQUIRED_PATHS.has(pathname) ||
    pathname.startsWith("/add-property") ||
    pathname.startsWith("/edit-property");

  if (isKycRequiredPath) {
    if (!isAuthenticated) {
      return NextResponse.redirect(buildLoginUrl(req, pathname));
    }
    if (!isKycVerified) {
      // Redirect to dashboard with KYC notice
      const url = new URL(getDashboardForRole(userRole, req));
      url.searchParams.set("kyc_required", "1");
      const response = NextResponse.redirect(url.toString());
      return addSecurityHeaders(response, requestId);
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response, requestId);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 7: General auth-required paths (any authenticated user)
  // ═══════════════════════════════════════════════════════════
  const isAuthRequired = AUTH_REQUIRED_PREFIXES.some((p) =>
    pathname.startsWith(p)
  );

  if (isAuthRequired) {
    if (!isAuthenticated) {
      const response = NextResponse.redirect(buildLoginUrl(req, pathname));
      return addSecurityHeaders(response, requestId);
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response, requestId);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 8: Dashboard — any authenticated user
  // ═══════════════════════════════════════════════════════════
  if (pathname.startsWith(DASHBOARD_PATHS)) {
    if (!isAuthenticated) {
      const response = NextResponse.redirect(buildLoginUrl(req, pathname));
      return addSecurityHeaders(response, requestId);
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response, requestId);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 9: Onboarding — authenticated users only
  // (role determined server-side from session, not URL)
  // ═══════════════════════════════════════════════════════════
  if (pathname.startsWith(ONBOARDING_PATHS)) {
    if (!isAuthenticated) {
      const response = NextResponse.redirect(buildLoginUrl(req, pathname));
      return addSecurityHeaders(response, requestId);
    }
    // Block if already approved — redirect to role dashboard
    if (onboardingStatus === "approved") {
      const dashboardUrl = getDashboardForRole(userRole, req);
      const response = NextResponse.redirect(dashboardUrl);
      return addSecurityHeaders(response, requestId);
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response, requestId);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 10: Admin paths — admin role only
  // ═══════════════════════════════════════════════════════════
  if (pathname.startsWith(ADMIN_PATHS)) {
    if (!isAuthenticated) {
      const response = NextResponse.redirect(buildLoginUrl(req, pathname));
      return addSecurityHeaders(response, requestId);
    }
    if (userRole !== "admin") {
      const response = NextResponse.redirect(
        buildForbiddenUrl(req, "admin_required")
      );
      return addSecurityHeaders(response, requestId);
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response, requestId);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 11: Developer paths — developer + admin only
  // /developer/dashboard, /developer/projects, etc.
  // (public profiles /developer/[slug] already handled in Step 2)
  // ═══════════════════════════════════════════════════════════
  if (pathname.startsWith(DEVELOPER_PATHS)) {
    if (!isAuthenticated) {
      const response = NextResponse.redirect(buildLoginUrl(req, pathname));
      return addSecurityHeaders(response, requestId);
    }
    if (userRole !== "developer" && userRole !== "admin") {
      const response = NextResponse.redirect(
        buildForbiddenUrl(req, "developer_required")
      );
      return addSecurityHeaders(response, requestId);
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response, requestId);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 12: Agent paths — agent + admin only
  // /agent/dashboard, /agent/listings, etc.
  // (public profiles /agent/[slug] already handled in Step 2)
  // ═══════════════════════════════════════════════════════════
  if (pathname.startsWith(AGENT_PATHS)) {
    if (!isAuthenticated) {
      const response = NextResponse.redirect(buildLoginUrl(req, pathname));
      return addSecurityHeaders(response, requestId);
    }
    if (userRole !== "agent" && userRole !== "admin") {
      const response = NextResponse.redirect(
        buildForbiddenUrl(req, "agent_required")
      );
      return addSecurityHeaders(response, requestId);
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response, requestId);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 13: Society paths — society + admin only
  // /society/dashboard, /society/plots, etc.
  // (public profiles /society/[slug] already handled in Step 2)
  // ═══════════════════════════════════════════════════════════
  if (pathname.startsWith(SOCIETY_PATHS)) {
    if (!isAuthenticated) {
      const response = NextResponse.redirect(buildLoginUrl(req, pathname));
      return addSecurityHeaders(response, requestId);
    }
    if (userRole !== "society" && userRole !== "admin") {
      const response = NextResponse.redirect(
        buildForbiddenUrl(req, "society_required")
      );
      return addSecurityHeaders(response, requestId);
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response, requestId);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 14: Default — allow through
  // Any unmatched path is public by default
  // Add to specific sections above if protection is needed
  // ═══════════════════════════════════════════════════════════
  const response = NextResponse.next();
  return addSecurityHeaders(response, requestId);
}

// ═══════════════════════════════════════════════════════════════
// 🔐 ROLE → DASHBOARD MAPPING
// ═══════════════════════════════════════════════════════════════

function getDashboardForRole(
  role: UserRole | null,
  req: NextRequest
): string {
  const base = new URL(req.url).origin;
  switch (role) {
    case "admin":
      return `${base}/admin`;
    case "developer":
      return `${base}/developer/dashboard`;
    case "agent":
      return `${base}/agent/dashboard`;
    case "society":
      return `${base}/society/dashboard`;
    default:
      return `${base}/dashboard`;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 MATCHER CONFIG
// ═══════════════════════════════════════════════════════════════

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|images/|icons/|fonts/|og/).*)",
  ],
};

// ========== END OF FILE ==========