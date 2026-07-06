import type { NextConfig } from "next";

// SECURITY (BUG-005): baseline security headers. The live deployment previously
// sent only HSTS, leaving the app frameable (clickjacking) and MIME-sniffable
// with no CSP. The CSP below is deliberately scoped to what this app actually
// needs so nothing breaks:
//   - Supabase REST/Auth over https and Realtime over wss (*.supabase.co)
//   - inline styles (the UI uses React `style={{…}}` attributes throughout)
//   - data:/blob: images + Supabase Storage public URLs
//   - blob: web workers (pdfjs-dist renders PDF thumbnails in a worker)
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Next.js injects a small inline bootstrap/hydration script. 'unsafe-eval' is
  // added ONLY in development, which Turbopack/HMR needs; production stays strict.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "media-src 'self' https://*.supabase.co",
  "worker-src 'self' blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework version.
  poweredByHeader: false,
  async headers() {
    // Apply the security headers in production only. In local dev they add no
    // value and we keep the dev server's responses identical to stock Next so
    // they can never interfere with Turbopack/HMR.
    if (isDev) return [];
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      // Supabase Storage public URLs (avatars live at <project>.supabase.co/storage/...)
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
