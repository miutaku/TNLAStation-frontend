"use client";

import { LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";


async function startPlayback(video: HTMLVideoElement): Promise<void> {
  try {
    await video.play();
  } catch {
    video.muted = true;
    try {
      await video.play();
    } catch {
    }
  }
}

/** MPEG-TS をそのまま流す配信。ブラウザーは再生できないので demux が要る。 */
function isTransportStream(source: string): boolean {
  const path = source.split("?")[0];
  return path.endsWith("/m2ts") || path.endsWith("/m2tsll");
}

/**
 * MPEG-TS を再生する。ブラウザーに TS の demux は無いので mpegts.js が MSE へ橋渡しする。
 */
async function attachTransportStream(
  video: HTMLVideoElement,
  source: string,
  onError: (message: string) => void,
): Promise<{ destroy: () => void } | null> {
  const { default: mpegts } = await import("mpegts.js");
  if (!mpegts.isSupported()) {
    onError("このブラウザーは低遅延配信の再生に対応していません。");
    return null;
  }

  // ライブなので溜め込まない。遅れたら末尾へ追いつかせる。
  const player = mpegts.createPlayer(
    { type: "mpegts", isLive: true, url: source },
    { liveBufferLatencyChasing: true, enableStashBuffer: false },
  );
  player.on(mpegts.Events.ERROR, () => onError("配信を再生できませんでした。"));
  player.attachMediaElement(video);
  player.load();
  void startPlayback(video);
  return {
    destroy: () => {
      player.destroy();
    },
  };
}

/** 配信の種別ごとに再生経路を選ぶ。MPEG-TS と HLS は demux が要り、他は video 要素へ直接渡す。 */
function useStreamPlayback(source: string | null): [React.RefObject<HTMLVideoElement | null>, string | null] {
  const element = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = element.current;
    if (video === null || source === null) return;

    setError(null);
    if (isTransportStream(source)) {
      let cancelled = false;
      let tsPlayer: { destroy: () => void } | null = null;
      void (async () => {
        const attached = await attachTransportStream(video, source, setError);
        if (cancelled) attached?.destroy();
        else tsPlayer = attached;
      })();

      return () => {
        cancelled = true;
        tsPlayer?.destroy();
      };
    }

    if (!source.includes(".m3u8")) {
      video.src = source;
      void startPlayback(video);
      return;
    }

    let cancelled = false;
    let player: { destroy: () => void } | null = null;
    void (async () => {
      const { default: Hls } = await import("hls.js");
      if (cancelled) return;
      if (!Hls.isSupported()) {
        if (video.canPlayType("application/vnd.apple.mpegurl") === "") {
          setError("このブラウザーは HLS の再生に対応していません。");
          return;
        }
        video.src = source;
        void startPlayback(video);
        return;
      }

      // ライブなので、遅れたら末尾へ追いつかせる。
      const hls = new Hls({
        liveSyncDurationCount: 3,
        // LL-HLS は配信が始まるまでプレイリストが無い。
        manifestLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: 10_000,
            maxLoadTimeMs: 20_000,
            timeoutRetry: { maxNumRetry: 4, retryDelayMs: 500, maxRetryDelayMs: 2_000 },
            errorRetry: { maxNumRetry: 10, retryDelayMs: 500, maxRetryDelayMs: 2_000 },
          },
        },
      });
      player = hls;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else setError("配信を再生できませんでした。");
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => void startPlayback(video));
      hls.loadSource(source);
      hls.attachMedia(video);
    })();

    return () => {
      cancelled = true;
      player?.destroy();
    };
  }, [source]);

  return [element, error];
}

export function VideoSurface({
  source,
  label,
  isLoading = false,
  error = null,
  onRetry,
}: {
  source: string | null;
  label: string;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}) {
  const [videoElement, playbackError] = useStreamPlayback(source);

  if (isLoading) {
    return <div role="status" className="grid aspect-video place-items-center rounded-2xl border bg-slate-950 text-white"><p className="flex items-center gap-2 text-sm"><LoaderCircle aria-hidden="true" className="size-5 animate-spin" />ストリームを準備中…</p></div>;
  }
  if (error) {
    return (
      <Alert role="alert" className="border-destructive/40">
        <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
          <span>{error.message}</span>
          {onRetry ? <Button type="button" size="sm" variant="outline" onClick={onRetry}><RotateCcw aria-hidden="true" />もう一度試す</Button> : null}
        </AlertDescription>
      </Alert>
    );
  }
  if (!source) {
    return <Alert role="status"><AlertDescription>再生元が指定されていません。</AlertDescription></Alert>;
  }

  return (
    <div>
      <video
        key={source}
        ref={videoElement}
        controls
        autoPlay
        playsInline
        aria-label={label}
        className="aspect-video w-full rounded-2xl bg-black shadow-xl"
      />
      {playbackError ? (
        <Alert role="alert" className="mt-4 border-destructive/40"><AlertDescription>{playbackError}</AlertDescription></Alert>
      ) : null}
    </div>
  );
}
