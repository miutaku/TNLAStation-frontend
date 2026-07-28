import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

describe("Table", () => {
  it("renders semantic columns in a horizontally scrollable container", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Table,
        null,
        createElement(TableHeader, null, createElement(TableRow, null, createElement(TableHead, null, "番組"))),
        createElement(TableBody, null, createElement(TableRow, null, createElement(TableCell, null, "サンプル番組"))),
      ),
    );

    expect(markup).toContain("data-slot=\"table-container\"");
    expect(markup).toContain("overflow-x-auto");
    expect(markup).toContain("<table");
    expect(markup).toContain("<th");
    expect(markup).toContain("<td");
  });
});
