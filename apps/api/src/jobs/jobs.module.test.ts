import { describe, expect, it } from "vitest";
import { JobsModule } from "./jobs.module.js";

describe("JobsModule.forRoot", () => {
  it("returns an empty registration when disabled", () => {
    const dynamic = JobsModule.forRoot(false);
    expect(dynamic.module).toBe(JobsModule);
    expect(dynamic.imports ?? []).toHaveLength(0);
    expect(dynamic.providers ?? []).toHaveLength(0);
  });

  it("registers ScheduleModule and the heartbeat job when enabled", () => {
    const dynamic = JobsModule.forRoot(true);
    expect(dynamic.module).toBe(JobsModule);
    expect((dynamic.imports ?? []).length).toBeGreaterThan(0);
    expect((dynamic.providers ?? []).length).toBeGreaterThan(0);
  });
});
