"use client";

import { GLASS_OPACITY_MAX, GLASS_OPACITY_MIN } from "@/lib/preferences";
import { cn } from "@/lib/utils";

/**
 * サイドバー・見出しバー・ボトムバーの透け具合 (0〜100%) を調整するスライダー。
 * 「すりガラスを無効にする」がオンの間は触れても見た目に反映されないため、薄く表示して
 * 操作自体も止める (disabled は呼び出し元の SettingRow のトグル状態と揃える)。
 */
export function GlassOpacitySettings({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className={cn("flex items-center gap-3", disabled && "pointer-events-none opacity-40")}>
      <input
        type="range"
        min={GLASS_OPACITY_MIN}
        max={GLASS_OPACITY_MAX}
        step={5}
        value={value}
        aria-label="ガラスの透け具合"
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full flex-1 appearance-none rounded-full bg-secondary outline-none [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:shadow [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow"
      />
      <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums">{value}%</span>
    </div>
  );
}
