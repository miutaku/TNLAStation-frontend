import type { EditManualReserveOption, RecordedItem, ReserveId, ReserveItem } from "@/lib/api/types";

/** `/api/recorded` は予約 id を返さないので、番組 id (無ければ放送局と開始時刻) で引く。 */
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

/** PUT は予約全体を受け取り、送らなかった項目は消える。画面で触らない値も返す。 */
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

/** 書き込み先の id は渡された一覧から引く。画面が持つ id を宛先にしない。 */
export function resolveReserveEncodeUpdate(
  item: RecordedItem,
  reserves: readonly ReserveItem[],
  change: { mode: string; removeOriginal: boolean },
): { reserveId: ReserveId; update: EditManualReserveOption } | undefined {
  const reserve = findReserveForRecording(item, reserves);
  if (!reserve) return undefined;

  return { reserveId: reserve.id, update: buildEncodeOnlyReserveUpdate(reserve, change) };
}
