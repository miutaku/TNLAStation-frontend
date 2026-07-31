import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./page-header";
import { Alert, AlertDescription } from "./ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

const longToken = "recording-without-a-break-".repeat(20);

describe("intrinsic width guards", () => {
  it("keeps card sections shrinkable and allows unbroken metadata to wrap", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Card,
        null,
        createElement(
          CardHeader,
          null,
          createElement(CardTitle, null, longToken),
          createElement(CardDescription, null, longToken),
        ),
        createElement(CardContent, null, longToken),
      ),
    );

    expect(markup).toContain("data-slot=\"card\"");
    expect(markup.match(/min-w-0/g)?.length).toBeGreaterThanOrEqual(5);
    expect(markup).toContain("[overflow-wrap:anywhere]");
    expect(markup).not.toContain("overflow-hidden");
  });

  it("protects dynamic page headings and alert messages without clipping them", () => {
    const header = renderToStaticMarkup(
      createElement(PageHeader, { title: longToken, description: longToken }),
    );
    const alert = renderToStaticMarkup(
      createElement(Alert, null, createElement(AlertDescription, null, longToken)),
    );

    expect(header).toContain("min-w-0");
    expect(header).toContain("[overflow-wrap:anywhere]");
    expect(alert).toContain("min-w-0");
    expect(alert).toContain("[overflow-wrap:anywhere]");
    expect(`${header}${alert}`).not.toContain("overflow-hidden");
  });

  it("lets form controls shrink inside zero-minimum grid tracks", () => {
    const markup = renderToStaticMarkup(
      createElement(Input, { value: longToken, readOnly: true }),
    );

    expect(markup).toContain("min-w-0");
    expect(markup).toContain("max-w-full");
  });
});

describe("PageHeader の操作の位置", () => {
  /** どのページでも同じ位置に出るよう、3 つの枠をまとめて説明の下へ並べる。 */
  it("puts every kind of action under the title and description", () => {
    const markup = renderToStaticMarkup(
      createElement(PageHeader, {
        title: "録画済み",
        description: "説明",
        titleActions: createElement("button", null, "主操作"),
        subActions: createElement("button", null, "副操作"),
        actions: createElement("button", null, "戻る"),
      }),
    );

    expect(markup.indexOf("<h1")).toBeLessThan(markup.indexOf("<p"));
    expect(markup.indexOf("<p")).toBeLessThan(markup.indexOf("主操作"));
    expect(markup.indexOf("主操作")).toBeLessThan(markup.indexOf("副操作"));
    expect(markup.indexOf("副操作")).toBeLessThan(markup.indexOf("戻る"));
  });

  it("leaves no empty row when a page has no actions", () => {
    const markup = renderToStaticMarkup(createElement(PageHeader, { title: "ホーム", description: "説明" }));

    expect(markup).not.toContain("<div");
  });
});
