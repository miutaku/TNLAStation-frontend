const jstPartsFormatter = new Intl.DateTimeFormat("ja-JP-u-ca-gregory", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

function dateParts(timestamp: number): Record<string, string> {
  return Object.fromEntries(
    jstPartsFormatter
      .formatToParts(new Date(timestamp))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function formatDateTime(timestamp: number): string {
  const parts = dateParts(timestamp);
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

export function formatShortDate(timestamp: number): string {
  const parts = dateParts(timestamp);
  return `${parts.month}/${parts.day} (${parts.weekday})`;
}

export function formatTime(timestamp: number): string {
  const parts = dateParts(timestamp);
  return `${parts.hour}:${parts.minute}`;
}

export function formatDuration(startAt: number, endAt: number): string {
  const minutes = Math.max(0, Math.round((endAt - startAt) / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}分`;
  return rest === 0 ? `${hours}時間` : `${hours}時間${rest}分`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function calculatePercentage(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

export function calculateElapsedPercentage(startAt: number, endAt: number, currentTime: number): number {
  return calculatePercentage(currentTime - startAt, endAt - startAt);
}

export const GENRES: Record<number, string> = {
  0: "ニュース／報道",
  1: "スポーツ",
  2: "情報／ワイドショー",
  3: "ドラマ",
  4: "音楽",
  5: "バラエティ",
  6: "映画",
  7: "アニメ／特撮",
  8: "ドキュメンタリー／教養",
  9: "劇場／公演",
  10: "趣味／教育",
  11: "福祉",
  15: "その他",
};

export const GENRE_ENTRIES: { value: number; label: string }[] = Object.entries(GENRES).map(
  ([value, label]) => ({ value: Number(value), label }),
);

export function genreName(genre?: number): string {
  return genre === undefined ? "未分類" : (GENRES[genre] ?? "その他");
}

export function programTone(genre?: number): string {
  const tones: Record<number, string> = {
    0: "border-sky-500/25 bg-sky-500/10",
    1: "border-emerald-500/25 bg-emerald-500/10",
    2: "border-cyan-500/25 bg-cyan-500/10",
    3: "border-violet-500/25 bg-violet-500/10",
    4: "border-fuchsia-500/25 bg-fuchsia-500/10",
    5: "border-amber-500/25 bg-amber-500/10",
    6: "border-rose-500/25 bg-rose-500/10",
    7: "border-pink-500/25 bg-pink-500/10",
    8: "border-teal-500/25 bg-teal-500/10",
    9: "border-orange-500/25 bg-orange-500/10",
    10: "border-lime-500/25 bg-lime-500/10",
    11: "border-indigo-500/25 bg-indigo-500/10",
  };
  return genre === undefined ? "border-border bg-muted/55" : (tones[genre] ?? "border-border bg-muted/55");
}
