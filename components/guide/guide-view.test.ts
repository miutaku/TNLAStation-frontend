import { describe, expect, it } from "vitest";

import { GUIDE_COLUMN_WIDTH_DESKTOP, GUIDE_COLUMN_WIDTH_MOBILE } from "./guide-view";

describe("guide layout", () => {
  it("uses the EPGStation responsive channel widths for rendering and virtualization", () => {
    expect(GUIDE_COLUMN_WIDTH_MOBILE).toBe(100);
    expect(GUIDE_COLUMN_WIDTH_DESKTOP).toBe(140);
  });
});
