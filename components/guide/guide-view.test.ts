import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { GUIDE_COLUMN_WIDTH_DESKTOP, GUIDE_COLUMN_WIDTH_MOBILE } from "./guide-view";

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
