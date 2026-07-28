/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  images: {
    // ✅ Enable modern image formats for better compression
    formats: ['image/webp', 'image/avif'],
    
    // ✅ Responsive breakpoints (matches Tailwind defaults)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    remotePatterns: [
      // Cloudinary (for uploaded images)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      // Cloudinary (custom CNAME - if used in future)
      {
        protocol: "https",
        hostname: "cloudinary.com",
        pathname: "/**",
      },
      // Unsplash (for placeholder/stock images)
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
     
      // Placeholder images
      {
        protocol: "https",
        hostname: "via.placeholder.com",
        pathname: "/**",
      },
      // V6.8.11: Google Static Maps (for office location previews)
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
        pathname: "/maps/api/staticmap/**",
      },
      // Localhost (development)
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/**",
      },
      // Laravel backend (if used)
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/**",
      },
    ],
  },

  // ✅ ESLint ko build ke dauran ignore karein
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ App-wide Security Headers
  async headers() {
    const isProd = process.env.NODE_ENV === "production";

    // CSP (balanced default)
    // NOTE: Agar future mein third-party scripts (analytics, maps, chat) add karein,
    // to CSP mein un domains ko add karna hoga.
    //
    // ✅ Turnstile fix:
    // - Turnstile widget iframe loads from https://challenges.cloudflare.com
    // - If frame-src isn't set, browser falls back to default-src 'self' and blocks it.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",

      // ✅ Allow Turnstile + Cloudinary + Google Maps + YouTube iframes (minimal + safe)
      "frame-src 'self' https://challenges.cloudflare.com https://upload-widget.cloudinary.com https://widget.cloudinary.com https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com",

      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https:",

      // Next.js dev mode mein eval hota hai, is liye dev mein unsafe-eval allow:
      // Keep https: for general external scripts, and Turnstile will work fine.
      `script-src 'self' ${isProd ? "" : "'unsafe-eval' "} https:`,

      // Turnstile verification uses fetch to Cloudflare endpoints; https: already allowed.
      "connect-src 'self' https:",

      "form-action 'self'",
      "upgrade-insecure-requests",
    ]
      .join("; ")
      .replace(/\s{2,}/g, " ")
      .trim();

    return [
      {
        source: "/(.*)",
        headers: [
          // Clickjacking protection
          { key: "X-Frame-Options", value: "DENY" },

          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Referrer policy
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // Permissions Policy (comprehensive & secure defaults)
          // Explicitly disables features not needed by the application.
          // The 'xr-spatial-tracking' violation (often from browser extensions) is silenced by this.
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), display-capture=(), document-domain=(), encrypted-media=(), gyroscope=(), magnetometer=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), sync-xhr=(), web-share=(), xr-spatial-tracking=()",
          },

          // HSTS (HTTPS only, production only)
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),

          // Content Security Policy
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
