import { cn } from "@/lib/utils";

/** Título de página (26 px), descrição opcional e ações à direita. */
export function PageHeader({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:mb-8", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-page font-semibold">{title}</h1>
          {description ? <div className="max-w-[72ch] text-ink-soft">{description}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Título de seção (20 px) com ações opcionais. */
export function SectionHeader({
  title,
  description,
  actions,
  className,
  as: Tag = "h2",
  id,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  as?: "h2" | "h3";
  id?: string;
}) {
  return (
    <div className={cn("mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <Tag id={id} className="text-section font-semibold">
          {title}
        </Tag>
        {description ? <div className="text-meta text-ink-soft">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
