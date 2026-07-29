export function validateRequiredText(value: string, label: string, maxLength?: number): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [`${label}を入力してください。`];
  if (maxLength !== undefined && trimmed.length > maxLength) return [`${label}は${maxLength}文字以内で入力してください。`];
  return [];
}

export function validateDateRange(start: string, end: string, label = "終了日時"): string[] {
  if (!start || !end) return ["開始日時と終了日時を入力してください。"];
  const startAt = Date.parse(start);
  const endAt = Date.parse(end);
  if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) return ["日時を正しい形式で入力してください。"];
  return endAt > startAt ? [] : [`${label}は開始日時より後にしてください。`];
}

/** 保存先からの逸脱を招く絶対パスと親ディレクトリ参照を拒否する。 */
export function validateRelativePath(value: string, label: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const segments = trimmed.replaceAll("\\", "/").split("/");
  if (trimmed.startsWith("/") || /^[A-Za-z]:\//.test(trimmed) || segments.includes("..")) {
    return [`${label}には絶対パスや「..」を指定できません。`];
  }
  return [];
}
