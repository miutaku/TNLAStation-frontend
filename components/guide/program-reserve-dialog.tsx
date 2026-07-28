"use client";

import { CalendarPlus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { apiClient } from "@/lib/api/client";
import type { ScheduleProgramItem } from "@/lib/api/types";
import { formatDateTime, formatDuration, genreName } from "@/lib/format";

function genreList(program: ScheduleProgramItem): string {
  const genres = [program.genre1, program.genre2, program.genre3]
    .filter((genre): genre is number => genre !== undefined)
    .map((genre) => genreName(genre));
  return genres.length > 0 ? Array.from(new Set(genres)).join(" / ") : "未分類";
}

export function ProgramReserveDialog({
  program,
  channelName,
  onClose,
  onReserved,
}: {
  program: ScheduleProgramItem | null;
  channelName: string;
  onClose: () => void;
  onReserved?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 別の番組を開いたら前回の結果表示を消す。描画中に前回分と比べて戻すのが React の作法。
  const [lastId, setLastId] = useState(program?.id);
  if (program?.id !== lastId) {
    setLastId(program?.id);
    setMessage(null);
    setError(null);
    setBusy(false);
  }

  if (program === null) return null;

  const reserve = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const reserveId = await apiClient.addManualReserve({ programId: program.id, allowEndLack: true });
      setMessage(`予約 #${reserveId} を追加しました。`);
      onReserved?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "予約を追加できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const searchHref = `/search?keyword=${encodeURIComponent(program.name)}`;

  return (
    <Dialog
      open
      title={program.name}
      onClose={onClose}
      footer={
        <>
          <Button asChild variant="ghost" onClick={onClose}>
            <Link href={searchHref}><Search aria-hidden="true" />この番組を検索</Link>
          </Button>
          <Button type="button" disabled={busy} onClick={() => void reserve()}>
            <CalendarPlus aria-hidden="true" />{busy ? "予約中…" : "録画予約する"}
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="max-w-full"><span className="min-w-0 truncate" title={channelName}>{channelName}</span></Badge>
        <Badge variant="secondary">{genreList(program)}</Badge>
        <Badge variant={program.isFree ? "success" : "warning"}>{program.isFree ? "無料" : "有料"}</Badge>
      </div>

      <p className="mt-4 text-sm font-medium">
        <time dateTime={new Date(program.startAt).toISOString()}>{formatDateTime(program.startAt)}</time>
        <span className="ml-2 text-muted-foreground">{formatDuration(program.startAt, program.endAt)}</span>
      </p>

      {program.description ? <p className="mt-4 text-sm leading-6 [overflow-wrap:anywhere]">{program.description}</p> : null}
      {program.extended ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">{program.extended}</p> : null}

      {message ? <Alert role="status" className="mt-5 border-emerald-500/35"><AlertDescription>{message}</AlertDescription></Alert> : null}
      {error ? <Alert role="alert" className="mt-5 border-destructive/40"><AlertDescription>{error}</AlertDescription></Alert> : null}
    </Dialog>
  );
}
