import type { ViteUserConfig } from "vitest/config";

export const nodeConfig: ViteUserConfig = {
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx"],
    globals: false,
    passWithNoTests: true,
  },
};
