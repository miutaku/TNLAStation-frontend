import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: ComponentProps<"div">) {
  return <div data-slot="alert" className={cn("relative glass-panel min-w-0 rounded-2xl p-4 text-sm [overflow-wrap:anywhere]", className)} {...props} />;
}

export function AlertTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("mb-1 font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("min-w-0 text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]", className)} {...props} />;
}
