import type { RecordedItem, RecordedId, VideoFileId } from "@/lib/api/types";

export type RecordedEncodeSkipReason = "unknown" | "recording" | "no-source";

export interface RecordedEncodeTarget {
  recordedId: RecordedId;
  name: string;
  sourceVideoFileId: VideoFileId;
}

export interface RecordedEncodeSkip {
  recordedId: RecordedId;
  name: string;
  reason: RecordedEncodeSkipReason;
}

export interface RecordedEncodePlan {
  targets: RecordedEncodeTarget[];
  skipped: RecordedEncodeSkip[];
}

export const recordedEncodeSkipLabel: Record<RecordedEncodeSkipReason, string> = {
  unknown: "番組情報を取得できません",
  recording: "録画中です",
  "no-source": "元 TS がありません",
};

/** 変換元は放送そのままの TS。積めないものは理由を付けて返す。 */
export function createRecordedEncodePlan(
  ids: readonly RecordedId[],
  items: ReadonlyMap<RecordedId, RecordedItem>,
): RecordedEncodePlan {
  const targets: RecordedEncodeTarget[] = [];
  const skipped: RecordedEncodeSkip[] = [];

  for (const id of ids) {
    const item = items.get(id);
    if (!item) {
      skipped.push({ recordedId: id, name: `録画 #${id}`, reason: "unknown" });
      continue;
    }
    if (item.isRecording) {
      skipped.push({ recordedId: id, name: item.name, reason: "recording" });
      continue;
    }

    const source = (item.videoFiles ?? []).find((file) => file.type === "ts");
    if (!source) {
      skipped.push({ recordedId: id, name: item.name, reason: "no-source" });
      continue;
    }

    targets.push({ recordedId: id, name: item.name, sourceVideoFileId: source.id });
  }

  return { targets, skipped };
}
