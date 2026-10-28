import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
