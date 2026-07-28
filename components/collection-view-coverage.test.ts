import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const collectionPages = [
  "./dashboard/dashboard-view.tsx",
  "./onair/onair-view.tsx",
  "./recorded/recorded-view.tsx",
  "./recording/recording-view.tsx",
  "./reserves/reserves-view.tsx",
  "./encode/encode-view.tsx",
  "./rules/rules-view.tsx",
  "./search/search-view.tsx",
  "./storages/storages-view.tsx",
] as const;

describe("collection page view modes", () => {
  it.each(collectionPages)("%s offers a persisted card/table switch", (path) => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");

    expect(source).toContain("useCollectionViewMode(");
    expect(source).toContain("<CollectionViewToggle");
    expect(source).toMatch(/<(?:Table|table)\b/);
  });

  it.each(collectionPages)("%s offers persisted table-column selection", (path) => {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");

    expect(source).toContain("useTableColumnVisibility(");
    expect(source).toContain("<TableColumnVisibilityMenu");
    expect(source).toContain(".isVisible(");
  });
});
