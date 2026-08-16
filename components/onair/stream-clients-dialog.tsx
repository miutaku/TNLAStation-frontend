"use client";

import { Globe2, Monitor, Radio } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { LiveStreamInfoItem, VideoFileStreamInfoItem } from "@/lib/api/types";

type StreamItem = LiveStreamInfoItem | VideoFileStreamInfoItem;

export interface ParsedStreamClient {
  ipAddress: string | null;
  userAgent: string | null;
}

export function parseStreamClient(client?: string): ParsedStreamClient {
  if (!client) return { ipAddress: null, userAgent: null };
  const match = client.match(/^(\S+) \(([\s\S]+)\)$/u);
  if (!match) return { ipAddress: client, userAgent: null };
  return { ipAddress: match[1], userAgent: match[2] };
}

function streamClientDetails(stream: StreamItem): ParsedStreamClient {
  if (stream.clientIp || stream.userAgent) {
    return { ipAddress: stream.clientIp ?? null, userAgent: stream.userAgent ?? null };
  }
  return parseStreamClient(stream.client);
}

function streamClientKey(stream: StreamItem): string | null {
  const client = streamClientDetails(stream);
  if (!client.ipAddress && !client.userAgent) return null;
  return `${client.ipAddress ?? ""}\u0000${client.userAgent ?? ""}`;
}

export function distinctStreamClientCount(streams: readonly StreamItem[]): number {
  return new Set(streams.map(streamClientKey).filter((client) => client !== null)).size;
}

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
  const clientCount = distinctStreamClientCount(streams);

  return (
    <Dialog open={open} title={title} onClose={onClose}>
      {streams.length === 0 ? (
        <p className="text-sm text-muted-foreground">現在再生しているクライアントはありません。</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" aria-label="再生状況の集計">
            <Badge variant="secondary"><Monitor aria-hidden="true" />識別できた端末 {clientCount}台</Badge>
            <Badge variant="outline"><Radio aria-hidden="true" />ストリーム {streams.length}本</Badge>
          </div>
          <ul className="grid gap-3" aria-label={`${title}のクライアント`}>
            {streams.map((stream, index) => {
              const client = streamClientDetails(stream);
              return (
                <li key={stream.streamId} className="min-w-0 rounded-xl border bg-background/55 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-2 text-sm font-bold">
                      <Monitor aria-hidden="true" className="size-4 shrink-0 text-primary" />
                      クライアント {index + 1}
                    </p>
                    <Badge variant="outline">Stream #{stream.streamId}</Badge>
                  </div>
                  <dl className="grid min-w-0 gap-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-x-4">
                    <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      <Globe2 aria-hidden="true" className="size-3.5" />IPアドレス
                    </dt>
                    <dd className="min-w-0 break-all font-mono text-xs">{client.ipAddress ?? "取得できません"}</dd>
                    <dt className="text-xs font-semibold text-muted-foreground">User-Agent</dt>
                    <dd className="min-w-0 break-words text-xs leading-5">{client.userAgent ?? "取得できません"}</dd>
                    <dt className="text-xs font-semibold text-muted-foreground">再生内容</dt>
                    <dd className="min-w-0 break-words text-xs leading-5">
                      {stream.name || "名称なし"}
                      <span className="ml-2 text-muted-foreground">モード {stream.mode}</span>
                    </dd>
                  </dl>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Dialog>
  );
}
