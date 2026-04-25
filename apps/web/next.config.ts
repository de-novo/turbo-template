import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
	reactStrictMode: true,
	transpilePackages: ["@repo/design-system", "@repo/ui-primitives"],
	output: "standalone",
	// Trace pnpm workspace symlinks back to the repo root so the standalone
	// bundle includes every workspace dependency.
	outputFileTracingRoot: resolve(here, "..", ".."),
};

export default nextConfig;
