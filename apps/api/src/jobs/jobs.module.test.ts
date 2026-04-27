import { describe, expect, it } from "vitest";
import { JobsModule, jobsModule } from "./jobs.module.js";

describe("jobsModule", () => {
  it("returns an empty registration when disabled", () => {
    const dynamic = jobsModule(false);
    expect(dynamic.module).toBe(JobsModule);
    expect(dynamic.imports ?? []).toHaveLength(0);
    expect(dynamic.providers ?? []).toHaveLength(0);
  });

  it("registers ScheduleModule and the heartbeat job when enabled", () => {
    const dynamic = jobsModule(true);
    expect(dynamic.module).toBe(JobsModule);
    expect((dynamic.imports ?? []).length).toBeGreaterThan(0);
    expect((dynamic.providers ?? []).length).toBeGreaterThan(0);
  });
});
