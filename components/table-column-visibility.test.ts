import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  parseStoredTableColumns,
  TableColumnVisibilityMenu,
  type TableColumnVisibilityState,
} from "./table-column-visibility";

describe("parseStoredTableColumns", () => {
  const keys = ["title", "station", "actions"] as const;

  it("keeps only current, unique hidden column keys", () => {
    expect(parseStoredTableColumns('{"order":[],"hidden":["station","missing","station"]}', keys)).toEqual({
      order: ["title", "station", "actions"],
      hidden: ["station"],
    });
  });

  it("never allows every column to be hidden", () => {
    expect(
      parseStoredTableColumns('{"order":[],"hidden":["title","station","actions"]}', keys),
    ).toEqual({
      order: ["title", "station", "actions"],
      hidden: ["station", "actions"],
    });
  });

  it("recovers from malformed persisted values", () => {
    expect(parseStoredTableColumns("{broken", keys)).toEqual({
      order: ["title", "station", "actions"],
      hidden: [],
    });
  });

  it("reads legacy hidden-only array values", () => {
    expect(parseStoredTableColumns('["station"]', keys)).toEqual({
      order: ["title", "station", "actions"],
      hidden: ["station"],
    });
  });

  it("applies a stored order and appends newly added columns", () => {
    expect(
      parseStoredTableColumns('{"order":["actions","title"],"hidden":[]}', keys),
    ).toEqual({
      order: ["actions", "title", "station"],
      hidden: [],
    });
  });

  it("drops order entries for columns that no longer exist", () => {
    expect(
      parseStoredTableColumns('{"order":["missing","actions","title"],"hidden":[]}', keys),
    ).toEqual({
      order: ["actions", "title", "station"],
      hidden: [],
    });
  });
});

describe("TableColumnVisibilityMenu", () => {
  it("renders labelled checkboxes and disables the last visible column", () => {
    const state: TableColumnVisibilityState<"title" | "station"> = {
      columns: [
        { key: "title", label: "番組" },
        { key: "station", label: "放送局" },
      ],
      visibleCount: 1,
      isVisible: (key) => key === "title",
      toggle: vi.fn(),
      showAll: vi.fn(),
      moveUp: vi.fn(),
      moveDown: vi.fn(),
    };

    const markup = renderToStaticMarkup(
      createElement(TableColumnVisibilityMenu<"title" | "station">, { state, label: "予約一覧の列" }),
    );
    expect(markup).toContain("予約一覧の列を選択");
    expect(markup).toContain("1列以上必要です");
    expect(markup).toContain('type="checkbox"');
    expect(markup).toContain("disabled");
    expect(markup).toContain("を上へ移動");
    expect(markup).toContain("を下へ移動");
  });
});
