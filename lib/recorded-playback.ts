import type { RecordedId, VideoFile, VideoFileId } from "@/lib/api/types";

/**
 * 録画ファイル 1 つの再生先。元の TS は MPEG-2 で、ブラウザーはそのままでは再生できない。
 * 押しても何も起きない導線を出すより、変換して再生するほうへ送る。
 */
export function playbackHref(file: Pick<VideoFile, "id" | "type">, recordedId: RecordedId): string {
  return file.type === "ts"
    ? `/recorded/streaming/${file.id}?recordedId=${recordedId}&streamingType=hls&mode=0`
    : `/recorded/watch?videoId=${file.id}&recordedId=${recordedId}`;
}

/** 選ぶ手間が要らないよう、変換なしで見られるものを先に置く。 */
export function playableFiles(files: readonly VideoFile[]): VideoFile[] {
  return [...files].sort((left, right) => Number(left.type === "ts") - Number(right.type === "ts"));
}

export function defaultPlaybackFileId(files: readonly VideoFile[]): VideoFileId | null {
  return playableFiles(files)[0]?.id ?? null;
}

/** 一覧の再生ボタンに出す名前。「H.265」「TS」など、どれを再生するかが分かる形。 */
export function playbackLabel(file: Pick<VideoFile, "name" | "type">): string {
  return file.type === "ts" ? `${file.name} (変換して再生)` : file.name;
}
