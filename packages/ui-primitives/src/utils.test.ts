import { expect, test } from "vitest";
import { cn } from "./utils.js";

test("cn merges className strings and dedupes Tailwind conflicts", () => {
  expect(cn("p-2", "p-4")).toBe("p-4");
  expect(cn("text-sm", undefined, false, "font-medium")).toBe("text-sm font-medium");
});
