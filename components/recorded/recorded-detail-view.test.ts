import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageHeader } from "@/components/page-header";

const source = readFileSync(new URL("./recorded-detail-view.tsx", import.meta.url), "utf8");

describe("recorded detail layout", () => {
  it("shows the requested sections in program, file, encode, and tag order", () => {
    const programDetails = source.indexOf('<CardTitle id="program-details-title">番組詳細');
    const recordedFiles = source.indexOf(">録画ファイル</h2>");
    const encode = source.indexOf("<CardTitle>エンコードする");
    const tags = source.indexOf("<RecordedTagEditor");

    expect(programDetails).toBeGreaterThan(-1);
    expect(recordedFiles).toBeGreaterThan(programDetails);
    expect(encode).toBeGreaterThan(recordedFiles);
    expect(tags).toBeGreaterThan(encode);
  });

  it("keeps program details initially collapsed behind an accessible toggle", () => {
    expect(source).toContain("useState(false)");
    expect(source).toContain("aria-expanded={programDetailsOpen}");
    expect(source).toContain('aria-controls="program-details-content"');
    expect(source).toContain("hidden={!programDetailsOpen}");
  });

  it("places protect and delete actions alongside the page title", () => {
    const titleActions = source.indexOf("titleActions={recorded");
    const protect = source.indexOf("保護を解除", titleActions);
    const remove = source.indexOf(">削除", titleActions);
    const programDetails = source.indexOf('<CardTitle id="program-details-title">番組詳細');

    expect(titleActions).toBeGreaterThan(-1);
    expect(protect).toBeGreaterThan(titleActions);
    expect(remove).toBeGreaterThan(protect);
    expect(programDetails).toBeGreaterThan(remove);

    const header = renderToStaticMarkup(
      createElement(PageHeader, {
        title: "非常に長い録画タイトル".repeat(20),
        description: "録画情報",
        titleActions: createElement("button", null, "保護"),
      }),
    );

    expect(header.indexOf("<h1")).toBeLessThan(header.indexOf("<button"));
    expect(header.indexOf("<button")).toBeLessThan(header.indexOf("<p"));
    expect(header).toContain("min-w-0");
    expect(header).toContain("max-w-full");
  });
});
