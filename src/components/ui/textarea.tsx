import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-md border border-input bg-surface px-3 py-2 text-ui text-ink transition-colors outline-none placeholder:text-ink-soft/80 focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink disabled:cursor-not-allowed disabled:bg-tint disabled:opacity-70 aria-invalid:border-stop",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
