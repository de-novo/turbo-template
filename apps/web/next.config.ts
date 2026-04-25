import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Conservative security headers for every response. CSP is intentionally
 * NOT included by default — it is application-shaped (inline scripts,
 * fonts, analytics origins) and a default value would either be too
 * permissive or break valid features. Forks should add a CSP header
 * once their asset footprint is known. See SECURITY.md.
 */
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
] as const;

const nextConfig: NextConfig = {
	reactStrictMode: true,
	transpilePackages: ["@repo/design-system", "@repo/ui-primitives"],
	output: "standalone",
	// Trace pnpm workspace symlinks back to the repo root so the standalone
	// bundle includes every workspace dependency.
	outputFileTracingRoot: resolve(here, "..", ".."),
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [...securityHeaders],
			},
		];
	},
};

// Bundle analyzer activates only when ANALYZE=true so production
// builds stay clean. Run with `pnpm --filter @repo/web analyze`.
const withBundleAnalyzer = bundleAnalyzer({
	enabled: process.env["ANALYZE"] === "true",
});

// next-intl plugin wires the server-side request config (locale +
// messages) into the build so getMessages() / useTranslations work
// everywhere without manual provider plumbing.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(withBundleAnalyzer(nextConfig));
