import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const here = dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Trace pnpm workspace symlinks back to the repo root so the standalone
  // bundle includes every workspace dependency.
  outputFileTracingRoot: resolve(here, "..", ".."),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // Proxy auth + reference API routes through Next so the browser sees them as
  // same-origin. Avoids CORS / cookie-domain mismatches in dev (web on :3000,
  // api on :4000) and lets prod point a single env var at the API URL.
  async rewrites() {
    return [
      { source: "/api/auth/:path*", destination: `${apiUrl}/api/auth/:path*` },
      { source: "/api/me", destination: `${apiUrl}/me` },
    ];
  },
};

// Bundle analyzer activates only when ANALYZE=true so production builds stay clean.
// Run with `pnpm --filter @repo/web analyze`.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env["ANALYZE"] === "true",
});

export default withBundleAnalyzer(nextConfig);
