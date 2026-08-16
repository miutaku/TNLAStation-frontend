"use client";

import { cn } from "@/lib/utils";

const ACCENT_PRESETS: readonly { hue: number; label: string }[] = [
  { hue: 18, label: "レッド" },
  { hue: 50, label: "オレンジ" },
  { hue: 95, label: "イエロー" },
  { hue: 145, label: "グリーン" },
  { hue: 195, label: "ティール" },
  { hue: 250, label: "ブルー" },
  { hue: 300, label: "パープル" },
  { hue: 340, label: "ピンク" },
];

const HUE_GRADIENT = `linear-gradient(to right, ${Array.from(
  { length: 13 },
  (_, index) => `oklch(0.7 0.19 ${index * 30})`,
).join(", ")})`;

function swatchColor(hue: number): string {
  return `oklch(0.65 0.2 ${hue})`;
}

function hueToHex(hue: number): string {
  const section = ((hue % 360) + 360) % 360 / 60;
  const x = Math.round(255 * (1 - Math.abs(section % 2 - 1)));
  const channels = section < 1 ? [255, x, 0]
    : section < 2 ? [x, 255, 0]
      : section < 3 ? [0, 255, x]
        : section < 4 ? [0, x, 255]
          : section < 5 ? [x, 0, 255]
            : [255, 0, x];
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function hexToHue(hex: string): number {
  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const maximum = Math.max(red, green, blue);
  const difference = maximum - Math.min(red, green, blue);
  if (difference === 0) return 0;
  if (maximum === red) return Math.round(60 * (((green - blue) / difference + 6) % 6));
  if (maximum === green) return Math.round(60 * ((blue - red) / difference + 2));
  return Math.round(60 * ((red - green) / difference + 4));
}

export function AccentColorSettings({
  value,
  onChange,
}: {
  value: number;
  onChange: (hue: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {ACCENT_PRESETS.map((preset) => {
          const selected = Math.abs(preset.hue - value) < 6;
          return (
            <button
              key={preset.hue}
              type="button"
              aria-label={preset.label}
              aria-pressed={selected}
              title={preset.label}
              onClick={() => onChange(preset.hue)}
              className={cn(
                "grid aspect-square place-items-center rounded-full border-2 transition-transform",
                selected ? "border-foreground scale-110" : "border-transparent hover:scale-105",
              )}
            >
              <span
                aria-hidden="true"
                className="size-7 rounded-full shadow-inner"
                style={{ background: swatchColor(preset.hue) }}
              />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="size-8 shrink-0 rounded-full border shadow-inner"
          style={{ background: swatchColor(value) }}
        />
        <input
          type="range"
          min={0}
          max={359}
          value={value}
          aria-label="アクセントカラーの色相"
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-2 w-full flex-1 appearance-none rounded-full outline-none [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:shadow [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow"
          style={{ background: HUE_GRADIENT }}
        />
        <label className="relative grid size-10 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border bg-background shadow-xs" title="カラーピッカーで選択">
          <span className="sr-only">カラーピッカーで選択</span>
          <span aria-hidden="true" className="size-6 rounded-md" style={{ background: swatchColor(value) }} />
          <input
            type="color"
            value={hueToHex(value)}
            aria-label="アクセントカラーをカラーピッカーで選択"
            onChange={(event) => onChange(hexToHue(event.target.value))}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}
