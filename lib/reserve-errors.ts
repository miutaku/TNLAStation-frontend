import { describeApiFailure } from "@/lib/api-errors";

/** すでに予約がある。画面はこれを見て「予約済み」の表示へ切り替える。 */
export const RESERVATION_ALREADY_EXISTS = "ReservationManageModelReservedError";

const RESERVE_FAILURES: Record<string, string> = {
  [RESERVATION_ALREADY_EXISTS]: "この番組はすでに録画予約されています。",
  ReservationIsNotFound: "予約が見つかりません。すでに削除された可能性があります。",
  AddReservationOptionError: "予約の指定が正しくありません。",
  ReservationEditError: "予約を変更できませんでした。",
};

export function describeReserveFailure(reason: unknown): Error {
  return describeApiFailure(reason, RESERVE_FAILURES, "録画予約を追加できませんでした。");
}
