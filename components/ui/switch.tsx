import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  className,
  ...props
}: Omit<ComponentProps<"button">, "role"> & { checked: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-input transition-colors data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5"
        data-state={checked ? "checked" : "unchecked"}
      />
    </button>
  );
}
