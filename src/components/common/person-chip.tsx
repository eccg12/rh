import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PersonAvatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <Avatar
      className={cn(size === "sm" && "size-6", size === "md" && "size-8", size === "lg" && "size-12", className)}
    >
      <AvatarFallback className={cn(size === "sm" && "text-[11px]", size === "lg" && "text-ui")}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Pessoa com avatar de iniciais, nome e (opcional) papel ou tema. */
export function PersonChip({
  name,
  subtitle,
  size = "md",
  className,
}: {
  name: string;
  subtitle?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <PersonAvatar name={name} size={size} />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-medium">{name}</span>
        {subtitle ? <span className="truncate text-meta text-ink-soft">{subtitle}</span> : null}
      </span>
    </span>
  );
}
