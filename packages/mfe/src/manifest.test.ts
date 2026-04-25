import { expect, test } from "vitest";
import { parseMicroFrontendManifest, resolveRemoteEntryUrl } from "./manifest.js";

const validManifest = {
  elementTag: "mfe-dashboard",
  entry: "./remoteEntry.js",
  name: "dashboard",
  version: "0.0.1",
};

test("parseMicroFrontendManifest accepts a valid manifest", () => {
  expect(parseMicroFrontendManifest(validManifest).name).toBe("dashboard");
});

test("parseMicroFrontendManifest rejects an invalid custom element tag", () => {
  expect(() =>
    parseMicroFrontendManifest({ ...validManifest, elementTag: "InvalidTag" }),
  ).toThrow();
});

test("resolveRemoteEntryUrl joins the manifest entry against the manifest URL", () => {
  const url = resolveRemoteEntryUrl(
    "https://cdn.example.com/dashboard/manifest.json",
    parseMicroFrontendManifest(validManifest),
  );
  expect(url).toBe("https://cdn.example.com/dashboard/remoteEntry.js");
});
