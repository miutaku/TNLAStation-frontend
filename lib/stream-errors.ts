import { ApiError } from "@/lib/api/client";

/**
 * 配信を開始できなかった理由。EPGStation は失敗をすべて 500 + errors 文字列で返すので、
 * status では区別できない。errors を読んで初めて何が起きたか分かる。
 */
const STREAM_FAILURES: Record<string, string> = {
  StreamIsFull: "同時に視聴できる数の上限に達しています。ほかの視聴を終了してから開いてください。",
  StreamProcessStartFailed: "配信を開始できませんでした。チューナーが空いていない可能性があります。",
  ChannelIsNotFound: "チャンネルが見つかりません。",
  StreamModeIsNotFound: "指定された画質は設定にありません。",
  StreamFormatIsNotFound: "この配信方式は設定にありません。",
  ConfigIsUndefined: "この配信方式は config.yml に設定されていません。",
  CmdIsUndefined: "この配信方式のコマンドが config.yml に設定されていません。",
  LowLatencyHlsIsNotConfigured: "低遅延配信が設定されていません。",
  MirakurunIsNotConfigured: "Mirakurun が設定されていません。",
  VideoFileIsNotFound: "録画ファイルが見つかりません。",
  StreamIsNotFound: "配信が見つかりません。開き直してください。",
};

export function describeStreamFailure(reason: unknown): Error {
  if (!(reason instanceof ApiError)) {
    return reason instanceof Error ? reason : new Error("配信を開始できませんでした。");
  }

  const known = reason.reason === undefined ? undefined : STREAM_FAILURES[reason.reason];
  if (known !== undefined) return new Error(known);
  // 知らない理由でも、コードだけは見せる。黙って定型文にすると原因を追えない。
  return new Error(reason.reason ?? "配信を開始できませんでした。");
}
