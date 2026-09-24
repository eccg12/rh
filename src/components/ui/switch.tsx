"use client";

import { Switch as SwitchPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-control bg-tint p-0.5 transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-ink data-[state=checked]:bg-ink",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[18px] rounded-full bg-surface shadow-sm ring-1 ring-control transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:ring-ink"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
