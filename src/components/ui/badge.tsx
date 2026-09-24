import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-sm border px-1.5 py-0.5 text-meta font-medium leading-tight [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-ink text-white",
        secondary: "border-transparent bg-tint text-ink",
        outline: "border-rule bg-surface text-ink",
        ok: "border-transparent bg-ok-soft text-ok",
        stop: "border-transparent bg-stop-soft text-stop",
        signal: "border-transparent bg-signal text-ink",
        muted: "border-transparent bg-tint text-ink-soft",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
