import { loadApiEnv } from "@repo/env/apps/api";
import { expect, test } from "vitest";
import { AppController } from "./app.controller.js";

test("AppController.healthCheck returns an ok envelope with a service slug and ok status", async () => {
  const controller = new AppController(loadApiEnv({}));
  const response = await controller.healthCheck();
  expect(response.ok).toBe(true);
  if (response.ok) {
    expect(typeof response.data.service).toBe("string");
    expect(response.data.status).toBe("ok");
  }
});
