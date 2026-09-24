import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-md border border-input bg-surface px-3 py-2 text-ui text-ink transition-colors outline-none placeholder:text-ink-soft/80 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-meta file:font-medium focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-tint disabled:opacity-70 aria-invalid:border-stop",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
