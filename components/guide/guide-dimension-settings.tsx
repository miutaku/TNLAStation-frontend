"use client";

import {
  GUIDE_COLUMN_SCALE_MAX,
  GUIDE_COLUMN_SCALE_MIN,
  GUIDE_PIXELS_PER_MINUTE_MAX,
  GUIDE_PIXELS_PER_MINUTE_MIN,
} from "@/lib/preferences";

function RangeRow({
  id,
  title,
  description,
  value,
  min,
  max,
  step,
  valueLabel,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <label htmlFor={id} className="text-sm font-semibold">{title}</label>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        <output htmlFor={id} className="shrink-0 rounded-md bg-muted px-2 py-1 text-sm font-semibold tabular-nums">{valueLabel}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-[var(--primary)]"
      />
      <div aria-hidden="true" className="mt-1 flex justify-between text-[0.65rem] text-muted-foreground">
        <span>小さく</span><span>大きく</span>
      </div>
    </div>
  );
}

export function GuideDimensionSettings({
  idPrefix,
  columnScale,
  pixelsPerMinute,
  onColumnScaleChange,
  onPixelsPerMinuteChange,
}: {
  idPrefix: string;
  columnScale: number;
  pixelsPerMinute: number;
  onColumnScaleChange: (value: number) => void;
  onPixelsPerMinuteChange: (value: number) => void;
}) {
  return (
    <>
      <RangeRow
        id={`${idPrefix}-column-scale`}
        title="番組の横幅"
        description="画面幅に応じた標準の局列幅を基準に拡大・縮小します。"
        value={columnScale}
        min={GUIDE_COLUMN_SCALE_MIN}
        max={GUIDE_COLUMN_SCALE_MAX}
        step={5}
        valueLabel={`${columnScale}%`}
        onChange={onColumnScaleChange}
      />
      <RangeRow
        id={`${idPrefix}-vertical-scale`}
        title="番組の縦幅"
        description="放送時間1分あたりの高さです。大きくすると短い番組も読みやすくなります。"
        value={pixelsPerMinute}
        min={GUIDE_PIXELS_PER_MINUTE_MIN}
        max={GUIDE_PIXELS_PER_MINUTE_MAX}
        step={0.25}
        valueLabel={`${pixelsPerMinute}px/分`}
        onChange={onPixelsPerMinuteChange}
      />
    </>
  );
}
