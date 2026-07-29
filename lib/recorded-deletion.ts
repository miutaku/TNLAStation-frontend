import type { RecordedItem, VideoFileType } from "@/lib/api/types";

export type FileDeleteOption = "all" | VideoFileType;

export type RecordedDeletePlan =
  | { kind: "recorded"; videoFileCount: number }
  | { kind: "files"; videoFileIds: number[] };

/**
 * 全動画ファイルが対象なら録画番組ごと削除し、ファイルのない番組情報を残さない。
 * 一部だけが対象なら動画ファイル単位で削除する。
 */
export function createRecordedDeletePlan(item: RecordedItem, option: FileDeleteOption): RecordedDeletePlan {
  const allFiles = item.videoFiles ?? [];
  if (option === "all") return { kind: "recorded", videoFileCount: allFiles.length };

  const targetFiles = allFiles.filter((file) => file.type === option);
  if (targetFiles.length > 0 && targetFiles.length === allFiles.length) {
    return { kind: "recorded", videoFileCount: targetFiles.length };
  }

  return { kind: "files", videoFileIds: targetFiles.map((file) => file.id) };
}
