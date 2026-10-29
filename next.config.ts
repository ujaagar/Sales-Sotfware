import type { NextConfig } from "next";

// Browser security headers on every page.
const SECURITY_HEADERS = [
  // Always HTTPS for two years.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Nobody can show this app inside their own page to trick clicks (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    // The https upgrade only on Vercel, so the local http:// preview keeps working.
    value: `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'${process.env.VERCEL ? "; upgrade-insecure-requests" : ""}`,
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Every page in this app shows live, per-user data, so we use the
  // classic request-time rendering model instead of Cache Components.
  cacheComponents: false,
  // PDF statements are rendered in Node route handlers.
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    // Receipt uploads go through Server Actions (files up to 5 MB).
    serverActions: { bodySizeLimit: "12mb" },
    proxyClientMaxBodySize: "12mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
