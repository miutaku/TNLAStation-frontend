"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * 再生を始める。ブラウザーは音が出る自動再生を拒む。拒まれたまま黒画面を出すより、
 * 消音で流し始めて、音は本人に戻してもらうほうが分かりやすい。
 */
async function startPlayback(video: HTMLVideoElement): Promise<void> {
  try {
    await video.play();
  } catch {
    video.muted = true;
    try {
      await video.play();
    } catch {
      // 自動再生が全面的に禁じられている。再生ボタンは出ているので、そのまま待つ。
    }
  }
}

/**
 * HLS を再生する。
 *
 * canPlayType は当てにできない。Chrome は .m3u8 を再生できないのに
 * "application/vnd.apple.mpegurl" へ "maybe" を返すので、これで分岐すると
 * DEMUXER_ERROR_COULD_NOT_PARSE で黒画面になる。MSE が使えるなら hls.js を優先し、
 * ネイティブ再生は MSE を持たないブラウザー (iOS の Safari) の逃げ道として使う。
 */
function useHlsPlayback(source: string | null): [React.RefObject<HTMLVideoElement | null>, string | null] {
  const element = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = element.current;
    if (video === null || source === null) return;

    setError(null);
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

      // ライブなので、遅れたら末尾へ追いつかせる。放送に対して溜め込む意味がない。
      const hls = new Hls({ liveSyncDurationCount: 3 });
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
}: {
  source: string | null;
  label: string;
  isLoading?: boolean;
  error?: Error | null;
}) {
  const [videoElement, playbackError] = useHlsPlayback(source);

  if (isLoading) {
    return <div role="status" className="grid aspect-video place-items-center rounded-2xl border bg-slate-950 text-white"><p className="flex items-center gap-2 text-sm"><LoaderCircle aria-hidden="true" className="size-5 animate-spin" />ストリームを準備中…</p></div>;
  }
  if (error) {
    return <Alert role="alert" className="border-destructive/40"><AlertDescription>{error.message}</AlertDescription></Alert>;
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
