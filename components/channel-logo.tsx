"use client";

import { Radio } from "lucide-react";
import { useState } from "react";

import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";

/**
 * Mirakurun / EPGStation 互換APIの局ロゴは 64×36。画像と同じ 16:9 の枠に収める。
 * ロゴを持たない局と取得に失敗した局も同じ比率にして、並びを崩さない。
 */
export function ChannelLogo({
  channel,
  className,
}: {
  channel: { id: number; hasLogoData?: boolean };
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <span className={cn("grid h-9 w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-muted/60", className)}>
      {channel.hasLogoData && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={apiClient.channelLogoUrl(channel.id)}
          alt=""
          loading="lazy"
          decoding="async"
          className="block size-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Radio aria-hidden="true" className="size-4 text-muted-foreground" />
      )}
    </span>
  );
}
