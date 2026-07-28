import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  return (
    <nav aria-label="ページネーション" className="mt-6 flex items-center justify-center gap-3">
      <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft aria-hidden="true" />
        前へ
      </Button>
      <p aria-live="polite" className="min-w-24 text-center text-sm text-muted-foreground">
        {page} / {pageCount}
      </p>
      <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        次へ
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  );
}
