import type { ProgramId, RecordedItem, ReserveId, ReserveItem } from "@/lib/api/types";

/**
 * 番組に付ける印。予約と録画中は別物で、放送中ページは「録画中」、番組表は「予約済み」を出す。
 * 番組 id を持たない予約 (時刻指定) は番組表の行と結び付けられないので対象外。
 */
export function toProgramIdSet(items: readonly { programId?: ProgramId }[]): ReadonlySet<ProgramId> {
  return new Set(items.map((item) => item.programId).filter((id): id is ProgramId => id !== undefined));
}

/** 除外・重複の予約は録画されないので印を付けない。 */
export function reservedProgramIds(reserves: readonly ReserveItem[]): ReadonlySet<ProgramId> {
  return toProgramIdSet(reserves.filter((reserve) => !reserve.isSkip && !reserve.isOverlap));
}

/** 番組 id から予約 id を引く。予約済みの番組で解除を出すために使う。 */
export function reserveIdByProgram(reserves: readonly ReserveItem[]): ReadonlyMap<ProgramId, ReserveId> {
  const usable = reserves.filter((reserve) => !reserve.isSkip && !reserve.isOverlap);
  return new Map(
    usable
      .filter((reserve): reserve is ReserveItem & { programId: ProgramId } => reserve.programId !== undefined)
      .map((reserve) => [reserve.programId, reserve.id]),
  );
}

export function recordingProgramIds(items: readonly RecordedItem[]): ReadonlySet<ProgramId> {
  return toProgramIdSet(items);
}

/** 終わった番組は予約できない。録画は過去に遡れない。 */
export function hasFinished(program: { endAt: number }, now: number): boolean {
  return now > 0 && program.endAt <= now;
}
