import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { StorageItem } from "@/lib/api/types";

import {
  createStorageDistribution,
  StorageDistribution,
  StorageTable,
} from "./storages-view";

const gibibyte = 1024 ** 3;
const storage: StorageItem = {
  name: "recorded",
  total: 1000 * gibibyte,
  used: 750 * gibibyte,
  available: 250 * gibibyte,
  fileTypes: [
    { category: "video", format: "mpeg-ts", count: 20, size: 400 * gibibyte },
    { category: "video", format: "mp4", count: 12, size: 120 * gibibyte },
    { category: "log", format: "drop-log", count: 20, size: 2 * 1024 ** 2 },
    { category: "other", format: "other", count: 3, size: 230 * gibibyte },
  ],
};

describe("storage distribution", () => {
  it("fills the capacity with managed types, gray other usage, and free space", () => {
    const segments = createStorageDistribution(storage);
    const other = segments.find((segment) => segment.kind === "other");
    const available = segments.find((segment) => segment.kind === "available");

    expect(segments.map((segment) => segment.label)).toEqual([
      "録画（MPEG-TS）",
      "エンコード（MP4）",
      "ドロップログ",
      "その他",
      "空き容量",
    ]);
    expect(other).toMatchObject({
      color: "#94a3b8",
      count: 3,
      includesUntrackedUsage: true,
    });
    expect(segments.reduce((total, segment) => total + segment.size, 0)).toBe(storage.total);
    expect(available?.size).toBe(storage.available);
  });

  it("renders the colored capacity bar and a size/count legend instead of file cards", () => {
    const markup = renderToStaticMarkup(
      createElement(StorageDistribution, { storage }),
    );

    expect(markup).toContain('role="img"');
    expect(markup).toContain("録画（MPEG-TS）");
    expect(markup).toContain("エンコード（MP4）");
    expect(markup).toContain("その他");
    expect(markup).toContain("管理外ファイル 3 件を含む");
    expect(markup).toContain("空き容量");
    expect(markup).toContain("background-color:#94a3b8");
    expect(markup).not.toContain("未分類のファイル");
  });

  it("uses a semantic table in list mode", () => {
    const markup = renderToStaticMarkup(
      createElement(StorageTable, { items: [storage] }),
    );

    expect(markup).toContain("<table");
    expect(markup).toContain("<thead");
    expect(markup).toContain("<tbody");
    expect(markup).toContain('scope="row"');
    expect(markup).toContain("容量構成");
    expect(markup).toContain("recorded");
  });
});
