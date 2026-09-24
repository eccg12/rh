"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Rótulo, ajuda e erro de um campo (ids ligados para leitores de tela). */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? (
        <p id={`${id}-ajuda`} className="text-meta text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-erro`} className="text-meta text-stop" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Painel lateral de edição do Admin, com rolagem própria e botões fixos no rodapé. */
export function EditorSheet({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  pending,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel: string;
  pending?: boolean;
  onSubmit: () => void;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 p-0 sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : <SheetDescription className="sr-only">{title}</SheetDescription>}
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">{children}</div>
          <SheetFooter className="mt-0 flex-row justify-end border-t border-rule">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {submitLabel}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** Primeiro erro de cada campo, a partir de `z.flattenError(...).fieldErrors`. */
export function firstErrors(fieldErrors: Record<string, string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0]]));
}
