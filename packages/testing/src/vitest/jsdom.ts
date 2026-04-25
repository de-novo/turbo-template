import type { ViteUserConfig } from "vitest/config";

export const jsdomConfig: ViteUserConfig = {
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx"],
    globals: false,
    passWithNoTests: true,
  },
};
