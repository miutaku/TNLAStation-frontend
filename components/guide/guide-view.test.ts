import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { GUIDE_COLUMN_WIDTH_DESKTOP, GUIDE_COLUMN_WIDTH_MOBILE, openingMinutesFor } from "./guide-view";

describe("guide layout", () => {
  it("uses the EPGStation responsive channel widths for rendering and virtualization", () => {
    expect(GUIDE_COLUMN_WIDTH_MOBILE).toBe(100);
    expect(GUIDE_COLUMN_WIDTH_DESKTOP).toBe(140);
  });

  it("applies saved horizontal and vertical guide dimensions", () => {
    const source = readFileSync(new URL("./guide-view.tsx", import.meta.url), "utf8");

    expect(source).toContain("columnScale={preferences.guideColumnScale}");
    expect(source).toContain("pixelsPerMinute={preferences.guidePixelsPerMinute}");
    expect(source).toContain('"--guide-column-width"');
  });

  it("uses a compact stacked logo layout on mobile without widening guide columns", () => {
    const source = readFileSync(new URL("./guide-view.tsx", import.meta.url), "utf8");

    expect(source).toContain('showChannelLogo={preferences.isShowGuideChannelLogos}');
    expect(source).toContain('className="w-9 min-[600px]:w-12"');
    expect(source).toContain("h-14 w-full items-center justify-center");
    expect(source).toContain("flex-col gap-0.5");
    expect(source).toContain("const HEADER_HEIGHT = 56");
  });

  it("wraps long channel names with or without channel logos", () => {
    const source = readFileSync(new URL("./guide-view.tsx", import.meta.url), "utf8");

    expect(source).toContain('"line-clamp-2 font-semibold [overflow-wrap:anywhere]"');
    expect(source).not.toContain('"truncate font-semibold"');
  });
});

describe("openingMinutesFor", () => {
  const date = "2026-08-01";
  const midnight = Date.parse(`${date}T00:00:00+09:00`);
  const noon = midnight + 12 * 60 * 60_000;

  /** 直前の番組の途中が見えるよう、少しだけ前から見せる。 */
  it("opens 15 minutes before now", () => {
    expect(openingMinutesFor(date, noon, 11 * 60)).toBe(12 * 60 - 15);
  });

  it("never goes before the start of the day", () => {
    expect(openingMinutesFor(date, midnight + 5 * 60_000, 0)).toBe(0);
  });

  /** 今日以外は 0 時から見せる。過ぎた時間という概念がない。 */
  it("stays at the top for another day", () => {
    expect(openingMinutesFor("2026-08-02", noon, 660)).toBe(0);
  });

  it("stays at the top before the clock is known", () => {
    expect(openingMinutesFor(date, 0, 660)).toBe(0);
  });
});
