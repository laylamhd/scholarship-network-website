import type { NextConfig } from "next";

// SECURITY (BUG-005): baseline security headers. The live deployment previously
// sent only HSTS, leaving the app frameable (clickjacking) and MIME-sniffable.
// The Content-Security-Policy is NOT here — it moved to the middleware
// (lib/supabase/middleware.ts) because R3-01 made it nonce-based, and a nonce
// must be generated fresh per request (static config headers can't do that).
// The headers below are request-independent, so they stay as static config.
const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
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
