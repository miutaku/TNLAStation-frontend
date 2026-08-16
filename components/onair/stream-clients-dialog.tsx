"use client";

import { Monitor, Radio } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import type { LiveStreamInfoItem, VideoFileStreamInfoItem } from "@/lib/api/types";

type StreamItem = LiveStreamInfoItem | VideoFileStreamInfoItem;

export function StreamClientsDialog({
  open,
  title,
  streams,
  onClose,
}: {
  open: boolean;
  title: string;
  streams: readonly StreamItem[];
  onClose: () => void;
}) {
  return (
    <Dialog open={open} title={title} onClose={onClose}>
      {streams.length === 0 ? (
        <p className="text-sm text-muted-foreground">現在再生しているクライアントはありません。</p>
      ) : (
        <ul className="divide-y" aria-label={`${title}のクライアント`}>
          {streams.map((stream) => (
            <li key={stream.streamId} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Monitor aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold">{stream.client || "クライアント情報なし"}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Radio aria-hidden="true" className="size-3" />
                  {stream.name || `Stream #${stream.streamId}`}
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">#{stream.streamId}</span>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
