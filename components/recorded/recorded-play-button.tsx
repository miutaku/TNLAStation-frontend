"use client";

import { ChevronDown, Play } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AnchoredMenu } from "@/components/ui/anchored-menu";
import { Button } from "@/components/ui/button";
import type { RecordedItem } from "@/lib/api/types";
import { defaultPlaybackFileId, playableFiles, playbackHref, playbackLabel } from "@/lib/recorded-playback";

/**
 * 一覧からそのまま再生する。ファイルが 1 つならボタン 1 つ、複数あるときだけ
 * どれを再生するか選べるようにする。常に選ばせると、1 つしかないときに手間が増える。
 */
export function RecordedPlayButton({ item, size = "sm" }: { item: RecordedItem; size?: "sm" | "default" }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const files = playableFiles(item.videoFiles ?? []);
  const firstId = defaultPlaybackFileId(files);
  if (firstId === null) return null;

  const first = files[0];
  if (files.length === 1) {
    return (
      <Button asChild size={size} variant="outline">
        <Link href={playbackHref(first, item.id)} aria-label={`${item.name} を再生`}><Play aria-hidden="true" />再生</Link>
      </Button>
    );
  }

  return (
    <>
      <Button
        ref={setAnchor}
        size={size}
        variant="outline"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${item.name} を再生`}
      >
        <Play aria-hidden="true" />再生<ChevronDown aria-hidden="true" className="size-3.5" />
      </Button>
      <AnchoredMenu open={open} anchor={anchor} title="再生するファイル" width={240} onClose={() => setOpen(false)}>
        <div className="flex flex-col">
          {files.map((file) => (
            <Link
              key={file.id}
              href={playbackHref(file, item.id)}
              className="rounded px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              {playbackLabel(file)}
            </Link>
          ))}
        </div>
      </AnchoredMenu>
    </>
  );
}
