import type { BroadcastStatus, ChannelType } from "@/lib/api/types";

export const BROADCAST_TYPE_LABELS: Record<ChannelType, string> = {
  GR: "地デジ",
  BS: "BS",
  CS: "CS",
  SKY: "SKY",
};

export const BROADCAST_TYPE_ORDER: readonly ChannelType[] = ["GR", "BS", "CS", "SKY"];

/**
 * 実際に受信できる放送波だけ。読み込み前は全種別を返す — 出ていた選択肢が一瞬消えるより、
 * 多いまま待って絞り込むほうが揺れない。
 */
export function availableBroadcastTypes(broadcast: BroadcastStatus | undefined): readonly ChannelType[] {
  if (broadcast === undefined) return BROADCAST_TYPE_ORDER;
  const available = BROADCAST_TYPE_ORDER.filter((type) => broadcast[type]);
  // 1 つも受信できないと報告されたときは絞らない。選ぶ手段が無くなるほうが困る。
  return available.length > 0 ? available : BROADCAST_TYPE_ORDER;
}
