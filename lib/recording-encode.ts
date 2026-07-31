import type { EditManualReserveOption, RecordedItem, ReserveItem } from "@/lib/api/types";

/**
 * 録画中の番組に対応する予約を探す。録画は予約から始まるが `/api/recorded` は予約 id を
 * 返さないので、番組 id — 時刻指定予約なら放送局と開始時刻 — で引き当てる。
 */
export function findReserveForRecording(
  item: RecordedItem,
  reserves: readonly ReserveItem[],
): ReserveItem | undefined {
  const byProgram = item.programId === undefined
    ? undefined
    : reserves.find((reserve) => reserve.programId === item.programId);
  if (byProgram) return byProgram;

  return reserves.find(
    (reserve) => reserve.channelId === item.channelId && reserve.startAt === item.startAt,
  );
}

/** 予約に入っているエンコード設定を、番号の空きを詰めて並べる。 */
export function reserveEncodeModes(reserve: ReserveItem): string[] {
  return [reserve.encodeMode1, reserve.encodeMode2, reserve.encodeMode3].filter(
    (mode): mode is string => typeof mode === "string" && mode !== "",
  );
}

/**
 * エンコード設定だけを差し替える更新内容を作る。`PUT /api/reserves/{id}` は予約全体を
 * 受け取るので、送らなかった項目は消える。画面で触らない保存先やタグはそのまま返す。
 */
export function buildEncodeOnlyReserveUpdate(
  reserve: ReserveItem,
  change: { mode: string; removeOriginal: boolean },
): EditManualReserveOption {
  const saveOption = reserve.parentDirectoryName
    ? {
      parentDirectoryName: reserve.parentDirectoryName,
      directory: reserve.directory,
      recordedFormat: reserve.recordedFormat,
    }
    : undefined;

  const keepsOtherModes = reserve.encodeMode2 !== undefined || reserve.encodeMode3 !== undefined;
  if (change.mode === "" && !keepsOtherModes) {
    return { allowEndLack: reserve.allowEndLack, tags: reserve.tags, saveOption };
  }

  return {
    allowEndLack: reserve.allowEndLack,
    tags: reserve.tags,
    saveOption,
    encodeOption: {
      // 出力先は mode とセットでしか送れない。mode を外すときは directory も落とす。
      mode1: change.mode || undefined,
      encodeParentDirectoryName1: change.mode ? reserve.encodeParentDirectoryName1 : undefined,
      directory1: change.mode ? reserve.encodeDirectory1 : undefined,
      mode2: reserve.encodeMode2,
      encodeParentDirectoryName2: reserve.encodeParentDirectoryName2,
      directory2: reserve.encodeDirectory2,
      mode3: reserve.encodeMode3,
      encodeParentDirectoryName3: reserve.encodeParentDirectoryName3,
      directory3: reserve.encodeDirectory3,
      isDeleteOriginalAfterEncode: change.removeOriginal,
    },
  };
}
