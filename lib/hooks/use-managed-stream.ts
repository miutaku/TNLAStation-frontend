"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiClient } from "@/lib/api/client";
import type { StreamId } from "@/lib/api/types";

type StreamRequest =
  | { kind: "live"; channelId: number; streamType: string; mode: number }
  | { kind: "recorded"; videoFileId: number; streamType: string; mode: number; playPosition: number };

export function useManagedStream(request: StreamRequest): {
  source: string | null;
  streamId: StreamId | null;
  isLoading: boolean;
  error: Error | null;
  stop: () => Promise<void>;
} {
  const [source, setSource] = useState<string | null>(null);
  const [streamId, setStreamId] = useState<StreamId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const activeStreamId = useRef<StreamId | null>(null);
  const keepTimer = useRef<number | null>(null);
  const kind = request.kind;
  const streamType = request.streamType;
  const mode = request.mode;
  const targetId = request.kind === "live" ? request.channelId : request.videoFileId;
  const playPosition = request.kind === "recorded" ? request.playPosition : 0;

  const stop = useCallback(async () => {
    if (keepTimer.current !== null) {
      window.clearInterval(keepTimer.current);
      keepTimer.current = null;
    }
    const id = activeStreamId.current;
    activeStreamId.current = null;
    setStreamId(null);
    setSource(null);
    if (id !== null) await apiClient.stopStream(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let sourceTimer: number | null = null;
    const start = async () => {
      setSource(null);
      setError(null);
      setIsLoading(true);
      if (streamType.toLowerCase() !== "hls") {
        const rawSource = kind === "live"
          ? apiClient.liveStreamUrl(targetId, streamType, mode)
          : apiClient.recordedStreamUrl(targetId, streamType, mode, playPosition);
        setSource(rawSource);
        setIsLoading(false);
        return;
      }
      try {
        const id = kind === "live"
          ? await apiClient.startLiveHls(targetId, mode)
          : await apiClient.startRecordedHls(targetId, playPosition, mode);
        if (cancelled) {
          await apiClient.stopStream(id);
          return;
        }
        activeStreamId.current = id;
        setStreamId(id);
        keepTimer.current = window.setInterval(() => {
          if (activeStreamId.current !== null) void apiClient.keepStream(activeStreamId.current).catch(() => undefined);
        }, 10_000);
        sourceTimer = window.setTimeout(() => {
          if (!cancelled) {
            setSource(apiClient.streamPlaylistUrl(id));
            setIsLoading(false);
          }
        }, 750);
      } catch (reason) {
        if (cancelled) return;
        setError(reason instanceof Error ? reason : new Error("ストリームを開始できませんでした。"));
        setIsLoading(false);
      }
    };
    void start();

    return () => {
      cancelled = true;
      if (sourceTimer !== null) window.clearTimeout(sourceTimer);
      if (keepTimer.current !== null) {
        window.clearInterval(keepTimer.current);
        keepTimer.current = null;
      }
      const id = activeStreamId.current;
      activeStreamId.current = null;
      if (id !== null) void apiClient.stopStream(id).catch(() => undefined);
    };
  }, [kind, mode, playPosition, streamType, targetId]);

  return { source, streamId, isLoading, error, stop };
}
