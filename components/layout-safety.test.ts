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
