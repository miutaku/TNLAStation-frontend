import { describe, expect, it } from "vitest";

import {
  DEFAULT_BOTTOM_BAR_ITEMS,
  isActivePath,
  MAX_BOTTOM_BAR_ITEMS,
  navigation,
  primaryNavigationFor,
  secondaryNavigationFor,
} from "./navigation";

describe("navigation", () => {
  it("keeps the default bottom bar to four primary slots so 「その他」 fits", () => {
    expect(DEFAULT_BOTTOM_BAR_ITEMS).toHaveLength(MAX_BOTTOM_BAR_ITEMS);
    expect(primaryNavigationFor(DEFAULT_BOTTOM_BAR_ITEMS)).toHaveLength(4);
  });

  it("matches the EPGStation menu order without separate conflict and overlap entries", () => {
    const hrefs = navigation.map((item) => item.href);

    expect(hrefs).toEqual([
      "/",
      "/onair",
      "/guide",
      "/recording",
      "/recorded",
      "/encode",
      "/reserves",
      "/search",
      "/rule",
      "/storages",
      "/settings",
    ]);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(navigation.find((item) => item.href === "/onair")?.label).toBe("放送中");
  });

  it("orders primary items by the caller's chosen href order, not the canonical order", () => {
    const primary = primaryNavigationFor(["/reserves", "/", "/rule"]);

    expect(primary.map((item) => item.href)).toEqual(["/reserves", "/", "/rule"]);
  });

  it("puts every screen not chosen as primary into secondary, in canonical order", () => {
    const chosen = ["/reserves", "/", "/rule"];
    const secondary = secondaryNavigationFor(chosen);

    expect(secondary.map((item) => item.href)).toEqual(
      navigation.map((item) => item.href).filter((href) => !chosen.includes(href)),
    );
    expect(new Set([...chosen, ...secondary.map((item) => item.href)])).toEqual(
      new Set(navigation.map((item) => item.href)),
    );
  });

  it("drops unknown hrefs and falls back to the default order when nothing resolves", () => {
    expect(primaryNavigationFor(["/missing", "/reserves"]).map((item) => item.href)).toEqual(["/reserves"]);
    expect(primaryNavigationFor(["/missing"]).map((item) => item.href)).toEqual(
      primaryNavigationFor(DEFAULT_BOTTOM_BAR_ITEMS).map((item) => item.href),
    );
  });

  it("marks a screen active for its own sub routes only", () => {
    expect(isActivePath("/recorded", "/recorded")).toBe(true);
    expect(isActivePath("/recorded", "/recorded/detail/12")).toBe(true);
    expect(isActivePath("/recorded", "/recording")).toBe(false);
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/", "/guide")).toBe(false);
  });
});
