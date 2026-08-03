import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { nextSortState, parseStoredSort, sortItems, SortMenuPanel, type SortState } from "./sortable-columns";

describe("parseStoredSort", () => {
  const keys = ["name", "startAt"];

  it("falls back to unsorted when nothing is stored", () => {
    expect(parseStoredSort(null, keys)).toEqual({ key: null, direction: "asc" });
  });

  it("recovers from malformed persisted values", () => {
    expect(parseStoredSort("{broken", keys)).toEqual({ key: null, direction: "asc" });
  });

  it("drops a stored key that no longer exists", () => {
    expect(parseStoredSort('{"key":"missing","direction":"desc"}', keys)).toEqual({
      key: null,
      direction: "asc",
    });
  });

  it("reads a valid stored key and direction", () => {
    expect(parseStoredSort('{"key":"startAt","direction":"desc"}', keys)).toEqual({
      key: "startAt",
      direction: "desc",
    });
  });
});

describe("nextSortState", () => {
  it("starts a new column at ascending", () => {
    expect(nextSortState({ key: null, direction: "asc" }, "name")).toEqual({
      key: "name",
      direction: "asc",
    });
  });

  it("switches the same column from ascending to descending", () => {
    expect(nextSortState({ key: "name", direction: "asc" }, "name")).toEqual({
      key: "name",
      direction: "desc",
    });
  });

  it("clears sorting on a third press of the same column", () => {
    expect(nextSortState({ key: "name", direction: "desc" }, "name")).toEqual({
      key: null,
      direction: "asc",
    });
  });

  it("switching to a different column always restarts at ascending", () => {
    expect(nextSortState({ key: "name", direction: "desc" }, "startAt")).toEqual({
      key: "startAt",
      direction: "asc",
    });
  });
});

describe("sortItems", () => {
  interface Row {
    name: string;
    count: number | null;
  }

  const rows: Row[] = [
    { name: "b", count: 2 },
    { name: "a", count: null },
    { name: "c", count: 1 },
  ];
  const accessors = { name: (row: Row) => row.name, count: (row: Row) => row.count };

  it("returns a copy in original order when unsorted", () => {
    const result = sortItems(rows, { key: null, direction: "asc" }, accessors);
    expect(result).toEqual(rows);
    expect(result).not.toBe(rows);
  });

  it("returns a copy in original order when the column has no accessor", () => {
    const result = sortItems(rows, { key: "missing" as never, direction: "asc" }, {});
    expect(result).toEqual(rows);
  });

  it("sorts strings with locale compare", () => {
    const result = sortItems(rows, { key: "name", direction: "asc" }, accessors);
    expect(result.map((row) => row.name)).toEqual(["a", "b", "c"]);
  });

  it("reverses order for descending sort", () => {
    const result = sortItems(rows, { key: "name", direction: "desc" }, accessors);
    expect(result.map((row) => row.name)).toEqual(["c", "b", "a"]);
  });

  it("always sends null/undefined values to the end regardless of direction", () => {
    const ascending = sortItems(rows, { key: "count", direction: "asc" }, accessors);
    expect(ascending.map((row) => row.name)).toEqual(["c", "b", "a"]);

    const descending = sortItems(rows, { key: "count", direction: "desc" }, accessors);
    expect(descending.map((row) => row.name)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the source array", () => {
    const original = [...rows];
    sortItems(rows, { key: "name", direction: "asc" }, accessors);
    expect(rows).toEqual(original);
  });
});

describe("SortMenuPanel", () => {
  it("marks the active column and enables the clear button only once sorted", () => {
    const sort: SortState<"name" | "startAt"> = {
      key: "startAt",
      direction: "desc",
      directionOf: (key) => (key === "startAt" ? "desc" : false),
      toggle: vi.fn(),
      clear: vi.fn(),
    };

    const markup = renderToStaticMarkup(
      createElement(SortMenuPanel<"name" | "startAt">, {
        sort,
        columns: [
          { key: "name", label: "番組" },
          { key: "startAt", label: "開始日時" },
        ],
      }),
    );

    expect(markup).toContain("番組");
    expect(markup).toContain("開始日時");
    expect(markup).toContain("並び替えを解除");
    expect(markup).not.toContain('disabled=""');
  });

  it("disables the clear button while unsorted", () => {
    const sort: SortState<"name"> = {
      key: null,
      direction: "asc",
      directionOf: () => false,
      toggle: vi.fn(),
      clear: vi.fn(),
    };

    const markup = renderToStaticMarkup(
      createElement(SortMenuPanel<"name">, { sort, columns: [{ key: "name", label: "番組" }] }),
    );

    expect(markup).toContain('disabled=""');
  });
});
