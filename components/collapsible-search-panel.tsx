"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CollapsibleSearchPanel({
  children,
  title = "検索条件",
  defaultOpen = false,
  className,
}: {
  children: ReactNode;
  title?: string;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className={cn("min-w-0 glass-panel rounded-2xl shadow-sm", className)} aria-label={title}>
      <Button
        type="button"
        variant="ghost"
        className="flex h-auto w-full justify-between rounded-2xl px-4 py-3 text-left"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal aria-hidden="true" className="size-4 text-primary" />
          {title}
        </span>
        <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
          {open ? "閉じる" : "開く"}
          <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", open && "rotate-180")} />
        </span>
      </Button>
      <div id={contentId} hidden={!open} className="border-t p-4">
        {children}
      </div>
    </section>
  );
}
