"use client";

import { CalendarPlus, CalendarX, Search } from "lucide-react";
import Link from "next/link";
import { useState , useCallback} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ReserveEncodeOptions } from "@/components/reserves/reserve-encode-options";
import { useToast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/client";
import type { Config, ReserveId, ScheduleProgramItem } from "@/lib/api/types";
import { formatDateTime, formatDuration, genreName } from "@/lib/format";
import { isApiFailure } from "@/lib/api-errors";
import { describeReserveFailure, RESERVATION_ALREADY_EXISTS } from "@/lib/reserve-errors";

function genreList(program: ScheduleProgramItem): string {
  const genres = [program.genre1, program.genre2, program.genre3]
    .filter((genre): genre is number => genre !== undefined)
    .map((genre) => genreName(genre));
  return genres.length > 0 ? Array.from(new Set(genres)).join(" / ") : "未分類";
}

export function ProgramReserveDialog({
  program,
  channelName,
  config,
  reserveId,
  onClose,
  onReserved,
}: {
  program: ScheduleProgramItem | null;
  channelName: string;
  config: Config;
  /** すでにこの番組を予約しているならその id。予約の追加ではなく解除を出す。 */
  reserveId?: ReserveId;
  onClose: () => void;
  onReserved?: () => void;
}) {
  const { notify } = useToast();
  const notifySuccess = useCallback((text: string) => notify("success", text), [notify]);
  const notifyError = useCallback((text: string) => notify("error", text), [notify]);
  const [busy, setBusy] = useState(false);
  const [encodeMode, setEncodeMode] = useState("");
  const [removeOriginal, setRemoveOriginal] = useState(false);
  const [reserved, setReserved] = useState(reserveId !== undefined);

  // 別の番組を開いたら前回の結果表示を消す。描画中に前回分と比べて戻すのが React の作法。
  const [lastId, setLastId] = useState(program?.id);
  if (program?.id !== lastId) {
    setLastId(program?.id);
    
    
    setBusy(false);
    setEncodeMode("");
    setRemoveOriginal(false);
    setReserved(reserveId !== undefined);
  }

  if (program === null) return null;

  const reserve = async () => {
    setBusy(true);
    
    
    try {
      const addedId = await apiClient.addManualReserve({
        programId: program.id,
        allowEndLack: true,
        ...(encodeMode ? {
          encodeOption: {
            mode1: encodeMode,
            isDeleteOriginalAfterEncode: removeOriginal,
          },
        } : {}),
      });
      notifySuccess(`予約 #${addedId} を追加しました。`);
      setReserved(true);
      onReserved?.();
    } catch (reason) {
      // すでに予約されていたなら、押せる状態のままにしない。表示を予約済みへ倒す。
      if (isApiFailure(reason, RESERVATION_ALREADY_EXISTS)) setReserved(true);
      notifyError(describeReserveFailure(reason).message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (reserveId === undefined) return;
    setBusy(true);
    
    
    try {
      await apiClient.deleteReserve(reserveId);
      notifySuccess("録画予約を解除しました。");
      setReserved(false);
      onReserved?.();
    } catch (reason) {
      notifyError(describeReserveFailure(reason).message);
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
          {reserved ? (
            <Button type="button" variant="destructive" disabled={busy || reserveId === undefined} onClick={() => void cancel()}>
              <CalendarX aria-hidden="true" />{busy ? "解除中…" : "録画予約を解除"}
            </Button>
          ) : (
            <Button type="button" disabled={busy} onClick={() => void reserve()}>
              <CalendarPlus aria-hidden="true" />{busy ? "予約中…" : "録画予約する"}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="max-w-full"><span className="min-w-0 truncate" title={channelName}>{channelName}</span></Badge>
        <Badge variant="secondary">{genreList(program)}</Badge>
        <Badge variant={program.isFree ? "success" : "warning"}>{program.isFree ? "無料" : "有料"}</Badge>
        {reserved ? <Badge variant="destructive">録画予約済み</Badge> : null}
      </div>

      <p className="mt-4 text-sm font-medium">
        <time dateTime={new Date(program.startAt).toISOString()}>{formatDateTime(program.startAt)}</time>
        <span className="ml-2 text-muted-foreground">{formatDuration(program.startAt, program.endAt)}</span>
      </p>

      {program.description ? <p className="mt-4 text-sm leading-6 [overflow-wrap:anywhere]">{program.description}</p> : null}
      {program.extended ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">{program.extended}</p> : null}

      <div className={reserved ? "hidden" : "mt-5"}>
        <ReserveEncodeOptions
          idPrefix={`program-${program.id}`}
          config={config}
          encodeMode={encodeMode}
          removeOriginal={removeOriginal}
          onEncodeModeChange={setEncodeMode}
          onRemoveOriginalChange={setRemoveOriginal}
        />
      </div>
    </Dialog>
  );
}
