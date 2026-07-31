import type { Schedule, ScheduleProgramItem } from "@/lib/api/types";

/** 番組情報が出せない理由。表示する文言を分ける。 */
export type MissingProgramReason =
  /** 番組表は取れているが、いまの時刻を含む番組が無い。 */
  | "off-air"
  /** その放送局の番組表そのものが無い。 */
  | "unknown";

export function findCurrentProgram(schedule: Schedule | undefined, now: number): ScheduleProgramItem | undefined {
  return schedule?.programs.find((program) => program.startAt <= now && now < program.endAt);
}

export function describeMissingProgram(schedule: Schedule | undefined): MissingProgramReason {
  return schedule === undefined || schedule.programs.length === 0 ? "unknown" : "off-air";
}

/**
 * 次に番組表を取り直すべき時刻。/api/schedules/broadcasting は呼んだ瞬間に放送中のものしか
 * 返さないので、番組が終わると手元の一式が古くなり、放送しているのに「番組情報が無い」に見える。
 * 一番早く終わる番組の終了時刻を返し、そこを越えたら取り直す。
 */
export function nextScheduleRefreshAt(schedules: readonly Schedule[], now: number): number | null {
  const endings = schedules
    .flatMap((schedule) => schedule.programs)
    .filter((program) => program.startAt <= now && now < program.endAt)
    .map((program) => program.endAt);
  return endings.length === 0 ? null : Math.min(...endings);
}
