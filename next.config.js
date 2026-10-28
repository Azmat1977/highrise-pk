/** @type {import('next').NextConfig} */

const isProd = process.env.NODE_ENV === 'production';

const productionImagePatterns = [
  {
    protocol: 'https',
    hostname: 'res.cloudinary.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'images.unsplash.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'via.placeholder.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'ui-avatars.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: '*.googleusercontent.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'maps.googleapis.com',
    pathname: '/**',
  },
  {
    protocol: 'https',
    hostname: 'maps.gstatic.com',
    pathname: '/**',
  },
];

const developmentImagePatterns = [
  {
    protocol: 'http',
    hostname: 'localhost',
    port: '3000',
    pathname: '/**',
  },
  {
    protocol: 'http',
    hostname: '127.0.0.1',
    port: '8000',
    pathname: '/**',
  },
];

function buildCsp() {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",

    // Pages Router requires inline framework/JSON-LD scripts when CSP is set
    // statically in next.config.js. 'unsafe-eval' is development-only.
    isProd
      ? "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://maps.googleapis.com https://maps.gstatic.com"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:",

    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",

    isProd
      ? "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://via.placeholder.com https://ui-avatars.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.googleusercontent.com"
      : "img-src 'self' data: blob: http: https:",

    isProd
      ? "connect-src 'self' https://challenges.cloudflare.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com"
      : "connect-src 'self' http: https: ws: wss:",

    "frame-src 'self' https://challenges.cloudflare.com https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://res.cloudinary.com",
    "media-src 'self' blob: https://res.cloudinary.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (isProd) directives.push('upgrade-insecure-requests');

  return directives.join('; ');
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      ...productionImagePatterns,
      ...(isProd ? [] : developmentImagePatterns),
    ],
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
  },

  // Deliberately do NOT set eslint.ignoreDuringBuilds=true.
  // Production builds must fail when ESLint finds real errors.

  // Legacy/aliased auth URLs -> the real, supported /login flows (implemented
  // by the shared in-place LoginOrSignupForm). These paths stay in the
  // middleware public allowlist so the redirect is reachable.
  async redirects() {
    return [
      { source: '/register', destination: '/login?mode=signup', permanent: false },
      { source: '/forgot-password', destination: '/login?mode=forgot', permanent: false },
      { source: '/reset-password', destination: '/login?mode=forgot', permanent: false },
    ];
  },

  async headers() {
    const csp = buildCsp();

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: [
              'accelerometer=()',
              'ambient-light-sensor=()',
              'autoplay=()',
              'battery=()',
              'browsing-topics=()',
              'camera=()',
              'display-capture=()',
              'document-domain=()',
              'encrypted-media=()',
              'geolocation=()',
              'gyroscope=()',
              'magnetometer=()',
              'microphone=()',
              'payment=()',
              'picture-in-picture=()',
              'publickey-credentials-get=()',
              'screen-wake-lock=()',
              'sync-xhr=()',
              'usb=()',
              'web-share=()',
              'xr-spatial-tracking=()',
            ].join(', '),
          },
          ...(isProd
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
