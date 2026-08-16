import type { VideoFile } from "@/lib/api/types";

/** 選ぶ手間が要らないよう、変換なしで見られるものを先に置く。 */
export function playableFiles(files: readonly VideoFile[]): VideoFile[] {
  return [...files].sort((left, right) => Number(left.type === "ts") - Number(right.type === "ts"));
}
