"use client";

import { ChevronDown } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import type { Config } from "@/lib/api/types";

const controlClassName = "h-10 min-w-0 w-full max-w-full rounded-lg border border-input bg-background/75 px-3 text-sm shadow-xs";

export function ReserveEncodeOptions({
  idPrefix,
  config,
  encodeMode,
  removeOriginal,
  onEncodeModeChange,
  onRemoveOriginalChange,
}: {
  idPrefix: string;
  config: Config;
  encodeMode: string;
  removeOriginal: boolean;
  onEncodeModeChange: (value: string) => void;
  onRemoveOriginalChange: (value: boolean) => void;
}) {
  const encodeId = `${idPrefix}-encode`;
  const removeLabelId = `${idPrefix}-remove-label`;

  return (
    <details className="group rounded-lg border bg-muted/30">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <span>詳細オプション</span>
        <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
          {encodeMode ? `エンコード: ${encodeMode}` : "エンコードしない"}
          <ChevronDown aria-hidden="true" className="size-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="grid grid-cols-1 gap-4 border-t p-4 sm:grid-cols-2">
        <div>
          <label htmlFor={encodeId} className="mb-2 block text-sm font-semibold">エンコード設定</label>
          <select
            id={encodeId}
            className={controlClassName}
            value={encodeMode}
            onChange={(event) => {
              const mode = event.target.value;
              onEncodeModeChange(mode);
              if (!mode) onRemoveOriginalChange(false);
            }}
          >
            <option value="">エンコードしない</option>
            {config.encode.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-background/70 p-3">
          <div>
            <span id={removeLabelId} className="text-sm font-semibold">録画後に元ファイルを削除</span>
            <p className="mt-1 text-xs text-muted-foreground">エンコード成功後に元の録画ファイルを削除します。</p>
          </div>
          <Switch
            checked={removeOriginal}
            disabled={!encodeMode}
            aria-labelledby={removeLabelId}
            onClick={() => onRemoveOriginalChange(!removeOriginal)}
          />
        </div>
      </div>
    </details>
  );
}
