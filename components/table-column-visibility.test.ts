import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  parseStoredTableColumns,
  TableColumnVisibilityMenu,
  TableColumnVisibilityPanel,
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

    // 開くまで中身は描かれない (画面直下へ出すため)。閉じた状態はボタンだけ。
    const closed = renderToStaticMarkup(
      createElement(TableColumnVisibilityMenu<"title" | "station">, { state, label: "予約一覧の列" }),
    );
    expect(closed).toContain("予約一覧の列を選択");
    expect(closed).not.toContain('type="checkbox"');

    const panel = renderToStaticMarkup(
      createElement(TableColumnVisibilityPanel<"title" | "station">, { state, hintId: "hint" }),
    );
    expect(panel).toContain("1列以上必要です");
    expect(panel).toContain('type="checkbox"');
    expect(panel).toContain("disabled");
    expect(panel).toContain("を上へ移動");
    expect(panel).toContain("を下へ移動");
  });
});
