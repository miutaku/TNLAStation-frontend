import { describe, expect, it } from "vitest";

import { DEFAULT_PREFERENCES, parsePreferences } from "./preferences";

const DEFAULT_BOTTOM_BAR_ITEMS = DEFAULT_PREFERENCES.bottomBarItems;

describe("preferences", () => {
  it("returns product defaults when storage is empty or malformed", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences("not-json")).toEqual(DEFAULT_PREFERENCES);
  });

  it("restores supported display values", () => {
    expect(
      parsePreferences(
        JSON.stringify({
          theme: "dark",
          isHalfWidthDisplayed: true,
          isShowOnlyFreePrograms: true,
          guideLength: 12,
          isShowGuideChannelLogos: false,
          guideColumnScale: 175,
          guidePixelsPerMinute: 4.25,
          reservesLength: 48,
          recordedLength: 12,
          isShowDropInfo: false,
          glassOpacity: 20,
          glassDisabled: true,
        }),
      ),
    ).toEqual({
      theme: "dark",
      isHalfWidthDisplayed: true,
      isShowOnlyFreePrograms: true,
      guideLength: 12,
      guideDrawMode: "sequential",
      isShowGuideChannelLogos: false,
      guideColumnScale: 175,
      guidePixelsPerMinute: 4.25,
      guideGenres: [],
      reservesLength: 48,
      recordedLength: 12,
      isShowDropInfo: false,
      glassOpacity: 20,
      glassDisabled: true,
      bottomBarItems: DEFAULT_BOTTOM_BAR_ITEMS,
      accentHue: DEFAULT_PREFERENCES.accentHue,
    });
  });

  it("restores a stored accent hue and normalizes it to 0-359", () => {
    expect(parsePreferences(JSON.stringify({ accentHue: 250 })).accentHue).toBe(250);
    expect(parsePreferences(JSON.stringify({ accentHue: 720.6 })).accentHue).toBe(1);
    expect(parsePreferences(JSON.stringify({ accentHue: -10 })).accentHue).toBe(350);
  });

  it("falls back to the default accent hue when the stored value is not a number", () => {
    expect(parsePreferences(JSON.stringify({ accentHue: "red" })).accentHue).toBe(DEFAULT_PREFERENCES.accentHue);
    expect(parsePreferences(JSON.stringify({ accentHue: Number.NaN })).accentHue).toBe(DEFAULT_PREFERENCES.accentHue);
  });

  it("restores a stored bottom bar order and drops duplicates", () => {
    const preferences = parsePreferences(
      JSON.stringify({ bottomBarItems: ["/reserves", "/", "/reserves", "/rule"] }),
    );

    expect(preferences.bottomBarItems).toEqual(["/reserves", "/", "/rule"]);
  });

  it("falls back to the default bottom bar order when stored value is empty or malformed", () => {
    expect(parsePreferences(JSON.stringify({ bottomBarItems: [] })).bottomBarItems).toEqual(
      DEFAULT_BOTTOM_BAR_ITEMS,
    );
    expect(parsePreferences(JSON.stringify({ bottomBarItems: "not-an-array" })).bottomBarItems).toEqual(
      DEFAULT_BOTTOM_BAR_ITEMS,
    );
  });

  it("caps the bottom bar order to the maximum number of slots", () => {
    const preferences = parsePreferences(
      JSON.stringify({ bottomBarItems: ["/", "/guide", "/recorded", "/reserves", "/rule"] }),
    );

    expect(preferences.bottomBarItems).toHaveLength(4);
  });

  it("rejects unsupported select values without discarding valid booleans", () => {
    const preferences = parsePreferences(
      JSON.stringify({ theme: "neon", guideLength: 48, reservesLength: 100, isShowDropInfo: false }),
    );

    expect(preferences.theme).toBe(DEFAULT_PREFERENCES.theme);
    expect(preferences.guideLength).toBe(DEFAULT_PREFERENCES.guideLength);
    expect(preferences.reservesLength).toBe(DEFAULT_PREFERENCES.reservesLength);
    expect(preferences.isShowDropInfo).toBe(false);
  });

  it("falls back to the default glass opacity when the stored value is unrecognized", () => {
    const parsed = parsePreferences(JSON.stringify({ glassOpacity: "frosted" }));

    expect(parsed.glassOpacity).toBe(DEFAULT_PREFERENCES.glassOpacity);
  });

  it("keeps a valid glass opacity percentage and clamps out-of-range values", () => {
    expect(parsePreferences(JSON.stringify({ glassOpacity: 80 })).glassOpacity).toBe(80);
    expect(parsePreferences(JSON.stringify({ glassOpacity: 150 })).glassOpacity).toBe(100);
    expect(parsePreferences(JSON.stringify({ glassOpacity: -20 })).glassOpacity).toBe(0);
  });

  it("migrates the old three-level glass opacity selection to an equivalent percentage", () => {
    expect(parsePreferences(JSON.stringify({ glassOpacity: "clear" })).glassOpacity).toBe(70);
    expect(parsePreferences(JSON.stringify({ glassOpacity: "regular" })).glassOpacity).toBe(55);
    expect(parsePreferences(JSON.stringify({ glassOpacity: "solid" })).glassOpacity).toBe(35);
  });

  it("restores a stored glassDisabled and falls back to the default when malformed", () => {
    expect(parsePreferences(JSON.stringify({ glassDisabled: true })).glassDisabled).toBe(true);
    expect(parsePreferences(JSON.stringify({ glassDisabled: "yes" })).glassDisabled).toBe(
      DEFAULT_PREFERENCES.glassDisabled,
    );
  });

  it("restores the guide channel logo option and rejects malformed values", () => {
    expect(parsePreferences(JSON.stringify({ isShowGuideChannelLogos: false })).isShowGuideChannelLogos).toBe(false);
    expect(parsePreferences(JSON.stringify({ isShowGuideChannelLogos: "yes" })).isShowGuideChannelLogos).toBe(
      DEFAULT_PREFERENCES.isShowGuideChannelLogos,
    );
  });

  it("clamps and rounds guide dimensions to supported steps", () => {
    expect(parsePreferences(JSON.stringify({ guideColumnScale: 173 })).guideColumnScale).toBe(175);
    expect(parsePreferences(JSON.stringify({ guideColumnScale: 999 })).guideColumnScale).toBe(200);
    expect(parsePreferences(JSON.stringify({ guidePixelsPerMinute: 2.38 })).guidePixelsPerMinute).toBe(2.5);
    expect(parsePreferences(JSON.stringify({ guidePixelsPerMinute: 0 })).guidePixelsPerMinute).toBe(1);
  });
});
