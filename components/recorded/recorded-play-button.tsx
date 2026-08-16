"use client";

import { Play, RadioTower } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api/client";
import type { Config, RecordedItem, VideoFile } from "@/lib/api/types";
import { playableFiles } from "@/lib/recorded-playback";

const PLAYABLE_TYPES = ["hls", "webm", "mp4"] as const;
type PlayableType = (typeof PLAYABLE_TYPES)[number];
const TYPE_LABEL: Record<PlayableType, string> = { hls: "HLS", webm: "WebM", mp4: "MP4" };
interface StreamChoice { type: PlayableType; modes: string[] }

export function recordedChoices(config: Config, file: Pick<VideoFile, "type">): StreamChoice[] {
  const enabled = file.type === "ts" ? config.isEnableTSRecordedStream : config.isEnableEncodedRecordedStream;
  if (!enabled) return [];
  const source = file.type === "ts" ? config.streamConfig?.recorded?.ts : config.streamConfig?.recorded?.encoded;
  const choices: StreamChoice[] = [];
  for (const type of PLAYABLE_TYPES) {
    const modes = source?.[type];
    if (!modes || modes.length === 0) continue;
    choices.push({ type, modes });
  }
  return choices;
}

export function RecordedPlayButton({ item, size = "sm", onlyFile }: { item: RecordedItem; size?: "sm" | "default"; onlyFile?: VideoFile }) {
  const router = useRouter();
  const files = useMemo(() => playableFiles(onlyFile ? [onlyFile] : item.videoFiles ?? []), [item.videoFiles, onlyFile]);
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [configError, setConfigError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileId, setFileId] = useState<number | null>(files[0]?.id ?? null);
  const [type, setType] = useState<PlayableType>("hls");
  const [mode, setMode] = useState(0);
  const file = files.find((candidate) => candidate.id === fileId) ?? files[0];
  const choices = useMemo(() => file && config ? recordedChoices(config, file) : [], [config, file]);
  const activeChoice = choices.find((choice) => choice.type === type) ?? choices[0];
  if (!file) return null;

  const showDialog = async () => {
    setOpen(true);
    if (config || loading) return;
    setLoading(true);
    try {
      setConfig(await apiClient.getConfig());
      setConfigError(false);
    } catch {
      setConfigError(true);
    } finally {
      setLoading(false);
    }
  };

  const selectFile = (nextFileId: number) => {
    setFileId(nextFileId);
    setType("hls");
    setMode(0);
  };

  const watch = () => {
    if (!activeChoice) return;
    setOpen(false);
    router.push(`/recorded/streaming/${file.id}?recordedId=${item.id}&streamingType=${activeChoice.type}&mode=${mode}`);
  };

  return (
    <>
      <Button type="button" size={size} variant="outline" onClick={() => void showDialog()}><Play aria-hidden="true" />再生</Button>
      <Dialog
        open={open}
        title={<span className="flex items-center gap-2"><RadioTower aria-hidden="true" className="size-5 text-primary" />{item.name}</span>}
        onClose={() => setOpen(false)}
        footer={<><Button type="button" variant="outline" onClick={() => setOpen(false)}>キャンセル</Button><Button type="button" onClick={watch} disabled={loading || !activeChoice}><Play aria-hidden="true" />再生する</Button></>}
      >
        <div className="space-y-5">
          {files.length > 1 ? <div><label htmlFor={`recorded-file-${item.id}`} className="mb-2 block text-sm font-semibold">再生するファイル</label><select id={`recorded-file-${item.id}`} className="glass-field min-w-0 w-full rounded-lg border px-3 py-2 text-sm" value={file.id} onChange={(event) => selectFile(Number(event.target.value))}>{files.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></div> : null}
          {loading ? <p className="text-sm text-muted-foreground">配信設定を取得しています…</p> : null}
          {configError ? <p className="text-sm text-amber-700 dark:text-amber-300">配信設定を取得できませんでした。時間をおいて再度お試しください。</p> : null}
          {config && choices.length === 0 ? <p className="text-sm text-amber-700 dark:text-amber-300">このファイルに利用できるストリーミング設定がありません。</p> : null}
          {activeChoice ? <>
            <div>
              <span className="mb-2 block text-sm font-semibold">配信の種類</span>
              <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                {choices.map((choice) => <Button key={choice.type} type="button" size="sm" className="flex-1" variant={activeChoice.type === choice.type ? "default" : "ghost"} aria-pressed={activeChoice.type === choice.type} onClick={() => { setType(choice.type); setMode(0); }}>{TYPE_LABEL[choice.type]}</Button>)}
              </div>
            </div>
            <div>
              <label htmlFor={`recorded-mode-${item.id}`} className="mb-2 block text-sm font-semibold">画質・ストリーミング設定</label>
              <select id={`recorded-mode-${item.id}`} className="glass-field min-w-0 w-full rounded-lg border px-3 py-2 text-sm" value={mode} onChange={(event) => setMode(Number(event.target.value))}>{activeChoice.modes.map((label, index) => <option key={`${label}-${index}`} value={index}>{label}</option>)}</select>
            </div>
          </> : null}
        </div>
      </Dialog>
    </>
  );
}
