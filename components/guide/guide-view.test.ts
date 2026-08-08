import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { GUIDE_COLUMN_WIDTH_DESKTOP, GUIDE_COLUMN_WIDTH_MOBILE, guideYForMinute, openingMinutesFor } from "./guide-view";

describe("guide layout", () => {
  it("uses the EPGStation responsive channel widths for rendering and virtualization", () => {
    expect(GUIDE_COLUMN_WIDTH_MOBILE).toBe(100);
    expect(GUIDE_COLUMN_WIDTH_DESKTOP).toBe(140);
  });

  it("applies saved horizontal and vertical guide dimensions", () => {
    const source = readFileSync(new URL("./guide-view.tsx", import.meta.url), "utf8");

    expect(source).toContain("columnScale={preferences.guideColumnScale}");
    expect(source).toContain("pixelsPerMinute={preferences.guidePixelsPerMinute}");
    expect(source).toContain('"--guide-column-width"');
  });

  it("uses a compact stacked logo layout on mobile without widening guide columns", () => {
    const source = readFileSync(new URL("./guide-view.tsx", import.meta.url), "utf8");

    expect(source).toContain('showChannelLogo={preferences.isShowGuideChannelLogos}');
    expect(source).toContain('className="w-9 min-[600px]:w-12"');
    expect(source).toContain("h-[var(--guide-header-height,3.5rem)] w-full items-center justify-center");
    expect(source).toContain("flex-col gap-0.5");
    expect(source).toContain("[--guide-header-height:2.75rem]");
  });

  it("wraps long channel names with or without channel logos", () => {
    const source = readFileSync(new URL("./guide-view.tsx", import.meta.url), "utf8");

    expect(source).toContain('"line-clamp-2 font-semibold [overflow-wrap:anywhere]"');
    expect(source).not.toContain('"truncate font-semibold"');
  });

  it("shows the program name before its start time", () => {
    const source = readFileSync(new URL("./guide-view.tsx", import.meta.url), "utf8");
    const programName = source.indexOf('<h3 className="text-sm leading-5 font-semibold">{program.name}</h3>');
    const startTime = source.indexOf('<time dateTime={new Date(program.startAt).toISOString()}>');

    expect(programName).toBeGreaterThan(-1);
    expect(startTime).toBeGreaterThan(programName);
  });
});

describe("openingMinutesFor", () => {
  const date = "2026-08-01";
  const midnight = Date.parse(`${date}T00:00:00+09:00`);
  const noon = midnight + 12 * 60 * 60_000;

  /** 直前の番組の途中が見えるよう、少しだけ前から見せる。 */
  it("opens 15 minutes before now", () => {
    expect(openingMinutesFor(date, noon, 11 * 60)).toBe(12 * 60 - 15);
  });

  it("never goes before the start of the day", () => {
    expect(openingMinutesFor(date, midnight + 5 * 60_000, 0)).toBe(0);
  });

  /** 今日以外は 0 時から見せる。過ぎた時間という概念がない。 */
  it("stays at the top for another day", () => {
    expect(openingMinutesFor("2026-08-02", noon, 660)).toBe(0);
  });

  it("stays at the top before the clock is known", () => {
    expect(openingMinutesFor(date, 0, 660)).toBe(0);
  });
});

describe("guideYForMinute", () => {
  it("expands only the selected hour", () => {
    expect(guideYForMinute(60, 3, { 1: 3 })).toBe(180);
    expect(guideYForMinute(120, 3, { 1: 3 })).toBe(720);
    expect(guideYForMinute(180, 3, { 1: 3 })).toBe(900);
  });

  it("splits a program crossing an hour boundary across both zoom levels", () => {
    const top = guideYForMinute(55, 3, { 1: 3 });
    const bottom = guideYForMinute(65, 3, { 1: 3 });

    expect(bottom - top).toBe(60);
  });

  it("keeps the time axis controls within the fixed width", () => {
    const source = readFileSync(new URL("./guide-view.tsx", import.meta.url), "utf8");

    expect(source).toContain('"sticky left-0 z-30 w-14 shrink-0');
    expect(source).toContain("すべての拡大を解除しますか？");
    expect(source).toContain("時間帯ごとに設定した拡大をすべて解除し、番組表を標準の高さに戻します。");
    expect(source).toContain("<ArrowUpDown");
    expect(source).toContain("size-8");
    expect(source).toContain("GUIDE_HOUR_ZOOM_LEVELS = [1, 2, 4, 8, 16]");
  });

  it("groups mobile filters and display controls below the title", () => {
    const source = readFileSync(new URL("./guide-view.tsx", import.meta.url), "utf8");

    expect(source).toContain('className="mb-2 flex items-center gap-2 text-[2rem] leading-[1.1] font-bold tracking-tight lg:hidden"');
    expect(source).toContain('<PageInfoButton title="番組表"');
    expect(source).toContain("function GuideToolbar(");
    expect(source).toContain('className="mb-2 lg:hidden"');
    expect(source).toContain('role="group" aria-label="放送波"');
    expect(source).toContain('aria-label="放送波"');
    expect(source).toContain("モバイルの条件と操作は、見出しの次の行");
    expect(source).toContain('"flex-col gap-0 text-[0.6rem] leading-none"');
    expect(source).toContain('<span>拡大</span>');
    expect(source).toContain('variant={hasActiveHourZooms ? "default" : "outline"}');
    expect(source).not.toContain("rounded-full bg-destructive");
    expect(source).not.toContain("全画面表示を利用できません");
    expect(source).toContain('classList.toggle("guide-bottom-ui-hidden", isBottomUiHidden)');
    expect(source).toContain('isFullscreenView ? "rounded-none" : "rounded-2xl"');
    expect(source).toContain('aria-label={isFullscreenView ? "全画面表示を終了" : "全画面表示"}');
    expect(source).toContain('aria-label="番組表の操作"');
    expect(source).toContain("top-[calc(var(--guide-header-height,3.5rem)+0.5rem)]");
    expect(source).toContain('className="fixed top-[calc(var(--guide-header-height,3.5rem)+0.5rem)] left-16 z-[70] max-w-[calc(100vw-5rem)]"');
    expect(source).toContain("left-16");
    expect(source).toContain("glass-panel flex w-fit max-w-full gap-1");
    expect(source).toContain('showDesktopLabels ? "items-end" : "items-center"');
    expect(source).toContain('showDesktopLabels ? "h-10" : "h-9"');
    expect(source).toContain('<CalendarDays aria-hidden="true" className="size-4 text-primary" />');
    expect(source).toContain('<Radio aria-hidden="true" className="size-4 text-primary" />');
    expect(source).toContain('showDesktopLabels && "flex-col items-stretch gap-1"');
    expect(source).toContain("element.scrollTop = Math.max(0, element.scrollTop - 72)");
    expect(source).toContain('<span className="hidden lg:inline">番組表設定</span>');
    expect(source).toContain('<span className="hidden lg:inline">{isFullscreenView ? "全画面表示を終了" : "全画面表示"}</span>');
    expect(source).toContain('disabled={!hasActiveHourZooms}');
  });
  it("provides enough zoom for two-minute programs to show their title", () => {
    const top = guideYForMinute(50, 3, { 0: 8 });
    const bottom = guideYForMinute(52, 3, { 0: 8 });

    expect(bottom - top).toBe(48);
  });
});
