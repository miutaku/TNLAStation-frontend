"use client";

import { Play, Radio } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Config } from "@/lib/api/types";

/** ブラウザで再生できるライブ配信の種別。無変換の m2ts だけは外部アプリ向けなので外す。 */
const PLAYABLE_TYPES = ["lowlatency", "m2tsll", "hls", "webm", "mp4"] as const;
type PlayableType = (typeof PLAYABLE_TYPES)[number];

const TYPE_LABEL: Record<PlayableType, string> = {
  lowlatency: "低遅延 HLS",
  m2tsll: "低遅延 TS",
  hls: "HLS",
  webm: "WebM",
  mp4: "MP4",
};

interface StreamChoice {
  type: PlayableType;
  modes: string[];
}

function liveChoices(config: Config): StreamChoice[] {
  const ts = config.streamConfig?.live?.ts;
  const choices: StreamChoice[] = [];
  for (const type of PLAYABLE_TYPES) {
    const modes = ts?.[type];
    if (modes && modes.length > 0) choices.push({ type, modes });
  }
  // 設定が無くても HLS だけは既定で選べるようにする。
  if (choices.length === 0) choices.push({ type: "hls", modes: ["既定"] });
  return choices;
}

export function WatchNowDialog({
  channel,
  config,
  onClose,
}: {
  channel: { id: number; name: string } | null;
  config: Config;
  onClose: () => void;
}) {
  const router = useRouter();
  const choices = useMemo(() => liveChoices(config), [config]);
  const [type, setType] = useState<PlayableType>(choices[0].type);
  const [mode, setMode] = useState(0);

  if (channel === null) return null;

  const activeChoice = choices.find((choice) => choice.type === type) ?? choices[0];

  const watch = () => {
    onClose();
    router.push(`/onair/watch?type=${type}&channel=${channel.id}&mode=${mode}`);
  };

  return (
    <Dialog
      open
      title={<span className="flex items-center gap-2"><Radio aria-hidden="true" className="size-5 text-primary" />{channel.name}</span>}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>キャンセル</Button>
          <Button type="button" onClick={watch}><Play aria-hidden="true" />視聴する</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <span className="mb-2 block text-sm font-semibold">配信の種類</span>
          <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
            {choices.map((choice) => (
              <Button
                key={choice.type}
                type="button"
                size="sm"
                className="flex-1"
                variant={type === choice.type ? "default" : "ghost"}
                aria-pressed={type === choice.type}
                onClick={() => {
                  setType(choice.type);
                  setMode(0);
                }}
              >
                {TYPE_LABEL[choice.type]}
              </Button>
            ))}
          </div>
        </div>

        {activeChoice.modes.length > 1 ? (
          <div>
            <label htmlFor="watch-mode" className="mb-2 block text-sm font-semibold">画質・モード</label>
            <select
              id="watch-mode"
              className="glass-field min-w-0 w-full max-w-full rounded-lg border px-3 py-2 text-sm"
              value={mode}
              onChange={(event) => setMode(Number(event.target.value))}
            >
              {activeChoice.modes.map((label, index) => (
                <option key={label} value={index}>{label}</option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">画質: {activeChoice.modes[0]}</p>
        )}
      </div>
    </Dialog>
  );
}
