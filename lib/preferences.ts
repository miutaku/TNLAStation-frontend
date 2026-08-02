import { DEFAULT_BOTTOM_BAR_ITEMS, MAX_BOTTOM_BAR_ITEMS } from "@/components/navigation";

export type ThemePreference = "system" | "light" | "dark";

/** ガラスの透け具合の既定値・許容範囲 (0=透けない 〜 100=最も透ける)。 */
export const GLASS_OPACITY_MIN = 0;
export const GLASS_OPACITY_MAX = 100;
export const GUIDE_COLUMN_SCALE_MIN = 50;
export const GUIDE_COLUMN_SCALE_MAX = 200;
export const GUIDE_PIXELS_PER_MINUTE_MIN = 1;
export const GUIDE_PIXELS_PER_MINUTE_MAX = 6;

/**
 * 番組表の描画のしかた。EPGStation と同じ 3 段階。
 * all: 全チャンネルを一度に描く。最も重いが取りこぼしがない。
 * sequential: 手前から数フレームに分けて描く。開いたときの引っかかりが小さい。
 * minimal: 画面に入っている列だけ描く。局数が多いほど軽い。
 */
export type GuideDrawMode = "all" | "sequential" | "minimal";

export interface AppPreferences {
  theme: ThemePreference;
  isHalfWidthDisplayed: boolean;
  isShowOnlyFreePrograms: boolean;
  /** 番組表に表示する時間数。1〜24 時間。 */
  guideLength: number;
  guideDrawMode: GuideDrawMode;
  /** 番組表の局ヘッダーに放送局ロゴを表示する。 */
  isShowGuideChannelLogos: boolean;
  /** 番組表の局ヘッダーに放送波・チャンネル番号を表示する。 */
  isShowGuideChannelInfo: boolean;
  /** レスポンシブな標準局列幅に対する倍率（%）。 */
  guideColumnScale: number;
  /** 番組の1分を縦方向に何pxで描くか。 */
  guidePixelsPerMinute: number;
  /** 番組表で目立たせる大分類ジャンル (0〜15)。空なら全ジャンルを通常表示する。 */
  guideGenres: number[];
  reservesLength: 12 | 24 | 48;
  recordedLength: 12 | 24 | 48;
  isShowDropInfo: boolean;
  /**
   * サイドバー・見出しバー・ボトムバーがどれだけ透けるか。0 (透けない) 〜 100 (最も透ける)
   * のパーセンテージ。glassDisabled が true のときは使わない。
   */
  glassOpacity: number;
  /**
   * true にすると、glassOpacity の透け・ぼかし (backdrop-filter) を完全に無効化し、不透明な面に
   * 固定する。低性能端末での負荷や、すりガラス自体の見た目を好まない場合向け。
   */
  glassDisabled: boolean;
  /** モバイルのボトムバーに表示する画面と、その並び順 (href の配列)。 */
  bottomBarItems: string[];
  /** 差し色の色相 (oklch の H、0〜359 度)。既定はアプリ本来の赤みのあるピンク。 */
  accentHue: number;
  /** アプリ上部のヘッダー (ロゴ・アプリ名) を表示する。 */
  isShowAppHeader: boolean;
}

/** 差し色の既定値。globals.css の --primary-hue の既定値と揃える。 */
export const DEFAULT_ACCENT_HUE = 18;

export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: "system",
  isHalfWidthDisplayed: true,
  isShowOnlyFreePrograms: false,
  guideLength: 24,
  guideDrawMode: "sequential",
  isShowGuideChannelLogos: true,
  isShowGuideChannelInfo: true,
  guideColumnScale: 150,
  guidePixelsPerMinute: 3,
  guideGenres: [],
  reservesLength: 24,
  recordedLength: 24,
  isShowDropInfo: false,
  glassOpacity: 55,
  glassDisabled: false,
  bottomBarItems: [...DEFAULT_BOTTOM_BAR_ITEMS],
  accentHue: DEFAULT_ACCENT_HUE,
  isShowAppHeader: true,
};

/** 番組表の表示時間の選択肢。1〜24 時間を 1 時間刻みで。 */
export const GUIDE_LENGTH_OPTIONS: readonly number[] = Array.from({ length: 24 }, (_, index) => index + 1);

function toGuideLength(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 24
    ? value
    : DEFAULT_PREFERENCES.guideLength;
}

function toClampedNumber(value: unknown, min: number, max: number, fallback: number, step = 1): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const clamped = Math.min(max, Math.max(min, value));
  return Math.round(clamped / step) * step;
}

export const PREFERENCES_STORAGE_KEY = "tnlastation:preferences";

function isOneOf<T extends string | number>(value: unknown, choices: readonly T[]): value is T {
  return choices.includes(value as T);
}

/**
 * href が今も存在する画面かどうかは navigation.ts 側 (primaryNavigationFor) が判定するため、
 * ここでは形だけ (文字列・重複なし・上限数) を保証する。
 */
function toBottomBarItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_BOTTOM_BAR_ITEMS];
  const items = [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))];
  return items.length > 0 ? items.slice(0, MAX_BOTTOM_BAR_ITEMS) : [...DEFAULT_BOTTOM_BAR_ITEMS];
}

function toAccentHue(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_ACCENT_HUE;
  const normalized = ((Math.round(value) % 360) + 360) % 360;
  return normalized;
}

/**
 * 以前の 3 段階の選択式 (clear/regular/solid) が残っている端末からの移行のため、
 * 文字列値も同等のパーセンテージへ変換して受け付ける。
 */
function toGlassOpacity(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(GLASS_OPACITY_MAX, Math.max(GLASS_OPACITY_MIN, Math.round(value)));
  }
  if (value === "clear") return 70;
  if (value === "regular") return 55;
  if (value === "solid") return 35;
  return DEFAULT_PREFERENCES.glassOpacity;
}

export function parsePreferences(value: string | null): AppPreferences {
  if (!value) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(value) as Partial<AppPreferences>;
    return {
      theme: isOneOf(parsed.theme, ["system", "light", "dark"] as const) ? parsed.theme : DEFAULT_PREFERENCES.theme,
      isHalfWidthDisplayed:
        typeof parsed.isHalfWidthDisplayed === "boolean" ? parsed.isHalfWidthDisplayed : DEFAULT_PREFERENCES.isHalfWidthDisplayed,
      isShowOnlyFreePrograms:
        typeof parsed.isShowOnlyFreePrograms === "boolean" ? parsed.isShowOnlyFreePrograms : DEFAULT_PREFERENCES.isShowOnlyFreePrograms,
      guideLength: toGuideLength(parsed.guideLength),
      guideDrawMode: isOneOf(parsed.guideDrawMode, ["all", "sequential", "minimal"] as const)
        ? parsed.guideDrawMode
        : DEFAULT_PREFERENCES.guideDrawMode,
      isShowGuideChannelLogos:
        typeof parsed.isShowGuideChannelLogos === "boolean"
          ? parsed.isShowGuideChannelLogos
          : DEFAULT_PREFERENCES.isShowGuideChannelLogos,
      isShowGuideChannelInfo:
        typeof parsed.isShowGuideChannelInfo === "boolean"
          ? parsed.isShowGuideChannelInfo
          : DEFAULT_PREFERENCES.isShowGuideChannelInfo,
      guideColumnScale: toClampedNumber(
        parsed.guideColumnScale,
        GUIDE_COLUMN_SCALE_MIN,
        GUIDE_COLUMN_SCALE_MAX,
        DEFAULT_PREFERENCES.guideColumnScale,
        5,
      ),
      guidePixelsPerMinute: toClampedNumber(
        parsed.guidePixelsPerMinute,
        GUIDE_PIXELS_PER_MINUTE_MIN,
        GUIDE_PIXELS_PER_MINUTE_MAX,
        DEFAULT_PREFERENCES.guidePixelsPerMinute,
        0.25,
      ),
      guideGenres: Array.isArray(parsed.guideGenres)
        ? Array.from(new Set(parsed.guideGenres.filter((genre): genre is number => typeof genre === "number" && Number.isInteger(genre) && genre >= 0 && genre <= 15)))
        : DEFAULT_PREFERENCES.guideGenres,
      reservesLength: isOneOf(parsed.reservesLength, [12, 24, 48] as const)
        ? parsed.reservesLength
        : DEFAULT_PREFERENCES.reservesLength,
      recordedLength: isOneOf(parsed.recordedLength, [12, 24, 48] as const)
        ? parsed.recordedLength
        : DEFAULT_PREFERENCES.recordedLength,
      isShowDropInfo: typeof parsed.isShowDropInfo === "boolean" ? parsed.isShowDropInfo : DEFAULT_PREFERENCES.isShowDropInfo,
      glassOpacity: toGlassOpacity(parsed.glassOpacity),
      glassDisabled: typeof parsed.glassDisabled === "boolean" ? parsed.glassDisabled : DEFAULT_PREFERENCES.glassDisabled,
      bottomBarItems: toBottomBarItems(parsed.bottomBarItems),
      accentHue: toAccentHue(parsed.accentHue),
      isShowAppHeader: typeof parsed.isShowAppHeader === "boolean" ? parsed.isShowAppHeader : DEFAULT_PREFERENCES.isShowAppHeader,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function readPreferences(): AppPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    return parsePreferences(window.localStorage.getItem(PREFERENCES_STORAGE_KEY));
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

/** --chrome-fill is "% color kept", the inverse of the user-facing opacity. */
export function applyGlassOpacity(opacity: number, disabled: boolean): void {
  if (typeof window === "undefined") return;
  document.documentElement.style.setProperty("--chrome-fill", `${100 - opacity}%`);
  document.documentElement.classList.toggle("glass-disabled", disabled);
}

/**
 * 差し色の色相を globals.css の --primary-hue へ反映する。primary / ring / accent 系トークンは
 * すべてこの 1 変数から oklch() で作られているため、ここを書き換えるだけで一式が追従する。
 */
export function applyAccentHue(hue: number): void {
  if (typeof window === "undefined") return;
  document.documentElement.style.setProperty("--primary-hue", String(hue));
}

export function applyTheme(theme: ThemePreference): void {
  if (typeof window === "undefined") return;
  const shouldUseDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", shouldUseDark);
}

let preferencesSnapshot = DEFAULT_PREFERENCES;
let hasHydratedSnapshot = false;
let hasAttachedBrowserListeners = false;
const listeners = new Set<() => void>();

function emitChange(): void {
  for (const listener of listeners) listener();
}

function hydrateSnapshot(): void {
  if (typeof window === "undefined" || hasHydratedSnapshot) return;
  preferencesSnapshot = readPreferences();
  hasHydratedSnapshot = true;
}

function attachBrowserListeners(): void {
  if (typeof window === "undefined" || hasAttachedBrowserListeners) return;
  window.addEventListener("storage", (event) => {
    if (event.key !== PREFERENCES_STORAGE_KEY) return;
    preferencesSnapshot = parsePreferences(event.newValue);
    emitChange();
  });
  hasAttachedBrowserListeners = true;
}

export function getPreferencesSnapshot(): AppPreferences {
  hydrateSnapshot();
  return preferencesSnapshot;
}

export function getServerPreferencesSnapshot(): AppPreferences {
  return DEFAULT_PREFERENCES;
}

export function subscribePreferences(listener: () => void): () => void {
  hydrateSnapshot();
  attachBrowserListeners();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updatePreferencesStore(patch: Partial<AppPreferences>): void {
  hydrateSnapshot();
  preferencesSnapshot = { ...preferencesSnapshot, ...patch };
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferencesSnapshot));
  } catch {
    // Keep the in-memory preference when storage is unavailable.
  }
  emitChange();
}

export function resetPreferencesStore(): void {
  preferencesSnapshot = DEFAULT_PREFERENCES;
  hasHydratedSnapshot = true;
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferencesSnapshot));
  } catch {
    // Keep the in-memory preference when storage is unavailable.
  }
  emitChange();
}
