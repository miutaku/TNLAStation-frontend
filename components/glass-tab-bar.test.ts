import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseTranslateX, resolveActiveBottomTab } from "./glass-tab-bar";

/**
 * このプロジェクトの vitest は environment: "node" (jsdom なし) で動くため、
 * ブラウザ組み込みの DOMMatrixReadOnly が存在しない。parseTranslateX が実際の
 * ブラウザから受け取るのと同じ形の computed style 文字列 (matrix()/matrix3d()) を
 * 最小限だけパースするモックで代替する。scaleX 等の値 (先頭の値) は無視し、
 * 平行移動成分 (2D なら 5 番目、3D なら 13 番目の値) だけを m41 として返す点は
 * 本物の DOMMatrixReadOnly と同じ。
 */
class MockDOMMatrixReadOnly {
  readonly m41: number;

  constructor(transform: string) {
    const match = /^matrix(3d)?\(([^)]+)\)$/.exec(transform.trim());
    if (!match) throw new Error(`unsupported transform: ${transform}`);
    const values = match[2].split(",").map((value) => Number.parseFloat(value));
    this.m41 = match[1] ? values[12] : values[4];
  }
}

describe("parseTranslateX", () => {
  beforeEach(() => {
    vi.stubGlobal("DOMMatrixReadOnly", MockDOMMatrixReadOnly);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when there is no transform applied", () => {
    expect(parseTranslateX("none")).toBeNull();
    expect(parseTranslateX("")).toBeNull();
  });

  it("reads translateX from a 2D matrix, ignoring the scale component", () => {
    // matrix(scaleX, b, c, scaleY, translateX, translateY)
    expect(parseTranslateX("matrix(1.3, 0, 0, 1, 84.5, -20)")).toBe(84.5);
  });

  it("reads translateX from a translate3d()+scaleX() matrix3d, ignoring the scale component", () => {
    // 移動アニメーション中は scaleX で水平方向に伸びる (layoutIndicator 参照)。
    // scaleX が行列の m11 に入っても、割り込み時に読み取る m41 (平行移動) には
    // 影響しないことを確認する。これが「途中の視覚位置」を正しく取り出せる根拠。
    const stretched = [1.6, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 212.25, 0, 0, 1].join(", ");
    expect(parseTranslateX(`matrix3d(${stretched})`)).toBe(212.25);

    const settled = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 340, 0, 0, 1].join(", ");
    expect(parseTranslateX(`matrix3d(${settled})`)).toBe(340);
  });

  it("falls back to null when the transform string cannot be parsed", () => {
    expect(parseTranslateX("not-a-real-transform")).toBeNull();
  });

  it("falls back to null when DOMMatrixReadOnly itself is unavailable", () => {
    vi.unstubAllGlobals();
    expect(parseTranslateX("matrix(1, 0, 0, 1, 10, 0)")).toBeNull();
  });
});

describe("resolveActiveBottomTab", () => {
  const navigation = {
    primaryHrefs: ["/", "/guide", "/recorded", "/reserves"],
    secondaryHrefs: ["/onair", "/search", "/settings"],
    moreOpen: false,
  } as const;

  it("keeps the more indicator selected while a secondary page navigation is pending", () => {
    expect(resolveActiveBottomTab({
      ...navigation,
      pathname: "/guide",
      pendingSecondaryHref: "/settings",
    })).toBe("__more__");
  });

  it("uses the destination pathname after secondary navigation is confirmed", () => {
    expect(resolveActiveBottomTab({
      ...navigation,
      pathname: "/settings",
      pendingSecondaryHref: null,
    })).toBe("__more__");
  });

  it("uses the current primary page when no secondary navigation is pending", () => {
    expect(resolveActiveBottomTab({
      ...navigation,
      pathname: "/guide",
      pendingSecondaryHref: null,
    })).toBe("/guide");
  });
});
