import type { RecordedItem, RecordedId, ThumbnailId, VideoFileId } from "@/lib/api/types";

/** 作り直せない理由。押せない相手を黙って飛ばすと、件数が合わずに戸惑う。 */
export type ThumbnailSkipReason = "unknown" | "recording" | "no-source";

export interface ThumbnailTarget {
  recordedId: RecordedId;
  /** 元にする動画。録画そのもの (ts) を優先し、無ければ手持ちの先頭。 */
  videoFileId: VideoFileId;
  /** 作り直す前に消す。残っていると作成側が既にあると見て何もしない。 */
  staleThumbnailIds: ThumbnailId[];
}

export interface ThumbnailPlan {
  targets: ThumbnailTarget[];
  skipped: { recordedId: RecordedId; reason: ThumbnailSkipReason }[];
}

const SKIP_LABEL: Record<ThumbnailSkipReason, string> = {
  unknown: "一覧に見つかりません",
  recording: "録画中です",
  "no-source": "元になる動画がありません",
};

export function thumbnailSkipLabel(reason: ThumbnailSkipReason): string {
  return SKIP_LABEL[reason];
}

export function toThumbnailTarget(item: RecordedItem): ThumbnailTarget | ThumbnailSkipReason {
  if (item.isRecording) return "recording";
  const files = item.videoFiles ?? [];
  const source = files.find((file) => file.type === "ts") ?? files[0];
  if (source === undefined) return "no-source";
  return { recordedId: item.id, videoFileId: source.id, staleThumbnailIds: item.thumbnails ?? [] };
}

export function createThumbnailPlan(
  recordedIds: readonly RecordedId[],
  items: readonly RecordedItem[],
): ThumbnailPlan {
  const byId = new Map(items.map((item) => [item.id, item]));
  const plan: ThumbnailPlan = { targets: [], skipped: [] };

  for (const recordedId of recordedIds) {
    const item = byId.get(recordedId);
    if (item === undefined) {
      plan.skipped.push({ recordedId, reason: "unknown" });
      continue;
    }

    const target = toThumbnailTarget(item);
    if (typeof target === "string") plan.skipped.push({ recordedId, reason: target });
    else plan.targets.push(target);
  }

  return plan;
}
