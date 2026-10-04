import { describe, expect, it } from "vitest";

import { demoFetch } from "./demo";

describe("demoFetch", () => {
  it("serves the compatibility config and TNLAStation version", async () => {
    const config = await demoFetch("/api/config");
    const version = await demoFetch("/api/version");

    await expect(config.json()).resolves.toMatchObject({ broadcast: { GR: true, BS: true } });
    await expect(version.json()).resolves.toEqual({ version: "2.10.0-demo" });
    expect(version.headers.get("X-TNLAStation-Version")).toBe("demo");
  });

  it("keeps generated schedules relative to the current time", async () => {
    const response = await demoFetch("/api/schedules?startAt=0&endAt=1");
    const schedules = await response.json() as Array<{ programs: Array<{ startAt: number }> }>;

    expect(schedules).toHaveLength(4);
    expect(Math.abs(schedules[0].programs[1].startAt - Date.now())).toBeLessThan(60 * 60_000);
  });

  it("serves every statically generated detail item", async () => {
    const [reserve, recorded] = await Promise.all([
      demoFetch("/api/reserves/702"),
      demoFetch("/api/recorded/203"),
    ]);

    await expect(reserve.json()).resolves.toMatchObject({ id: 702 });
    await expect(recorded.json()).resolves.toMatchObject({ id: 203 });
  });

  it("accepts mutations without persisting browser-independent state", async () => {
    const created = await demoFetch("/api/rules", { method: "POST", body: "{}" });
    const removed = await demoFetch("/api/rules/301", { method: "DELETE" });

    expect(created.status).toBe(201);
    await expect(created.json()).resolves.toEqual({ ruleId: 301 });
    expect(removed.status).toBe(204);
  });
});
