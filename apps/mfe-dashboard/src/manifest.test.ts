import { parseMicroFrontendManifest } from "@repo/mfe";
import { expect, test } from "vitest";

test("dashboard remote registers a manifest matching the contract schema", () => {
  const manifest = parseMicroFrontendManifest({
    elementTag: "repo-mfe-dashboard",
    entry: "./remoteEntry.js",
    name: "dashboard",
    version: "0.0.0",
  });
  expect(manifest.elementTag).toBe("repo-mfe-dashboard");
});
