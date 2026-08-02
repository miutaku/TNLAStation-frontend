"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isApiFailure } from "@/lib/api-errors";
import { apiClient } from "@/lib/api/client";
import { waitForPlaylist } from "@/lib/playlist-readiness";
import { describeStreamFailure } from "@/lib/stream-errors";
import type { StreamId } from "@/lib/api/types";

type StreamRequest =
  | { kind: "live"; channelId: number; streamType: string; mode: number }
  | { kind: "recorded"; videoFileId: number; streamType: string; mode: number; playPosition: number };

/** stream id で寿命を管理する配信。プレイリストの場所は種別で決まり方が違う。 */
const MANAGED_TYPES = ["hls", "lowlatency"];

/**
 * keep の連続失敗をここまで許す。1 回の失敗は瞬断でも起きるが、続くのはセッション切れや
 * バックエンド側の抹消で、黙ってリトライを続けると裏で消えた配信を眺め続けることになる。
 */
const KEEP_FAILURE_LIMIT = 3;

async function startManaged(
  kind: StreamRequest["kind"],
  streamType: string,
  targetId: number,
  mode: number,
  playPosition: number,
): Promise<{ streamId: StreamId; playlistUrl: string }> {
  if (kind === "recorded") {
    const id = await apiClient.startRecordedHls(targetId, playPosition, mode);
    return { streamId: id, playlistUrl: apiClient.streamPlaylistUrl(id) };
  }
  if (streamType.toLowerCase() === "lowlatency") return apiClient.startLiveLowLatency(targetId, mode);
  const id = await apiClient.startLiveHls(targetId, mode);
  return { streamId: id, playlistUrl: apiClient.streamPlaylistUrl(id) };
}

export function useManagedStream(request: StreamRequest): {
  source: string | null;
  streamId: StreamId | null;
  isLoading: boolean;
  error: Error | null;
  stop: () => Promise<void>;
  retry: () => void;
} {
  const [source, setSource] = useState<string | null>(null);
  const [streamId, setStreamId] = useState<StreamId | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
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
    const start = async () => {
      setSource(null);
      setError(null);
      setIsLoading(true);
      if (!MANAGED_TYPES.includes(streamType.toLowerCase())) {
        const rawSource = kind === "live"
          ? apiClient.liveStreamUrl(targetId, streamType, mode)
          : apiClient.recordedStreamUrl(targetId, streamType, mode, playPosition);
        setSource(rawSource);
        setIsLoading(false);
        return;
      }
      try {
        const started = await startManaged(kind, streamType, targetId, mode, playPosition);
        if (cancelled) {
          await apiClient.stopStream(started.streamId);
          return;
        }
        activeStreamId.current = started.streamId;
        setStreamId(started.streamId);
        let keepFailures = 0;
        const keepAlive = async () => {
          const id = activeStreamId.current;
          if (id === null) return;
          try {
            await apiClient.keepStream(id);
            keepFailures = 0;
          } catch (reason) {
            if (cancelled) return;
            keepFailures += 1;
            // 「配信が無い」と言われたら再試行しても戻らない。それ以外は瞬断を数回まで許す。
            const gone = isApiFailure(reason, "StreamIsUndefined");
            if (!gone && keepFailures < KEEP_FAILURE_LIMIT) return;
            if (keepTimer.current !== null) {
              window.clearInterval(keepTimer.current);
              keepTimer.current = null;
            }
            activeStreamId.current = null;
            setStreamId(null);
            setSource(null);
            setError(gone
              ? describeStreamFailure(reason)
              : new Error("配信を維持できません。ネットワークやログインの状態を確認して、開き直してください。"));
            setIsLoading(false);
          }
        };
        keepTimer.current = window.setInterval(() => void keepAlive(), 10_000);
        const ready = await waitForPlaylist(started.playlistUrl, () => cancelled);
        if (cancelled) return;
        if (!ready) {
          setError(new Error("配信の準備ができませんでした。"));
          setIsLoading(false);
          return;
        }
        setSource(started.playlistUrl);
        setIsLoading(false);
      } catch (reason) {
        if (cancelled) return;
        setError(describeStreamFailure(reason));
        setIsLoading(false);
      }
    };
    void start();

    return () => {
      cancelled = true;
      if (keepTimer.current !== null) {
        window.clearInterval(keepTimer.current);
        keepTimer.current = null;
      }
      const id = activeStreamId.current;
      activeStreamId.current = null;
      if (id !== null) void apiClient.stopStream(id).catch(() => undefined);
    };
  }, [attempt, kind, mode, playPosition, streamType, targetId]);

  return { source, streamId, isLoading, error, stop, retry: () => setAttempt((count) => count + 1) };
}
