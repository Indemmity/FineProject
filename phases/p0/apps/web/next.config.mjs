/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  allowedDevOrigins: ['192.168.29.129'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    turbo: {
      rules: {
        '*.ts': ['ts'],
        '*.tsx': ['tsx'],
      },
    },
  },
  // pdfjs-dist contains a webpack bundle that dynamically imports ./pdf.worker.mjs.
  // Marking it external prevents Turbopack from resolving that import through its
  // chunk directory — it'll resolve from node_modules instead.
  serverExternalPackages: ['pdfjs-dist', 'pdf-parse'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.logo.dev' },
      { protocol: 'https', hostname: '**.icompany.com' },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  transpilePackages: ['@jobplatform/shared'],
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';

    const globalHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];

    if (isProd) {
      globalHeaders.push({
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self'",
          "connect-src 'self' http://localhost:* ws://localhost:* https:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
        ].join('; '),
      });
      globalHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }

    return [
      {
        source: '/(.*)',
        headers: globalHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  // Bundle optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;