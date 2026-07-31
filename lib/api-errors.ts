import { ApiError } from "@/lib/api/client";

/**
 * EPGStation は失敗をすべて 500 + errors 文字列で返すので、status では区別できない。
 * errors を読んで初めて何が起きたか分かる。
 */
export function describeApiFailure(reason: unknown, table: Record<string, string>, fallback: string): Error {
  if (!(reason instanceof ApiError)) {
    return reason instanceof Error ? reason : new Error(fallback);
  }

  const known = reason.reason === undefined ? undefined : table[reason.reason];
  if (known !== undefined) return new Error(known);
  // 知らない理由でも、コードだけは見せる。黙って定型文にすると原因を追えない。
  return new Error(reason.reason ?? fallback);
}

/** その理由かどうか。画面の出し分けに使う。 */
export function isApiFailure(reason: unknown, code: string): boolean {
  return reason instanceof ApiError && reason.reason === code;
}
