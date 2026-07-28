"use client";

import { useEffect, useState } from "react";

import { apiClient } from "@/lib/api/client";
import type { ChannelItem } from "@/lib/api/types";

/**
 * 放送局 ID から局名を引く。
 *
 * 予約も録画も番組も、持っているのは局 ID だけ。そのまま出しても人には読めないので、
 * どの画面でも同じように名前へ直す。局の一覧はめったに変わらないため、一度取ったら
 * 使い回す。画面ごとに取り直すと、同じ応答を何度も読むことになる。
 */
let cache: Promise<ChannelItem[]> | null = null;

function loadChannels(): Promise<ChannelItem[]> {
  cache ??= apiClient.getChannels().catch((reason: unknown) => {
    // 取れなかったときに握ったままにすると、次からずっと失敗が返る。
    cache = null;
    throw reason;
  });
  return cache;
}

export function useChannelNames(halfWidth = false): (channelId: number) => string {
  const [channels, setChannels] = useState<Map<number, ChannelItem>>(new Map());

  useEffect(() => {
    let cancelled = false;
    void loadChannels().then(
      (items) => {
        if (!cancelled) setChannels(new Map(items.map((channel) => [channel.id, channel])));
      },
      () => {
        // 名前が引けなくても ID で出せる。画面を止めるほどのことではない。
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (channelId: number) => {
    const channel = channels.get(channelId);
    if (!channel) return `CH ${channelId}`;
    return halfWidth ? channel.halfWidthName : channel.name;
  };
}
