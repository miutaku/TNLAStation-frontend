export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">読み込み中</span>
      <div className="h-10 w-52 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-32 animate-pulse glass-panel rounded-2xl" />
        ))}
      </div>
      <div className="h-80 animate-pulse glass-panel rounded-2xl" />
    </div>
  );
}
