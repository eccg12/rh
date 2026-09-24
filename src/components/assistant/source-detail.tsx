"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { Markdown } from "@/components/common/markdown";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/dates";
import { api } from "@/trpc/react";

/** Conteúdo de uma fonte do assistente (artigo, política, benefício, agenda ou Quem é quem). */
export function SourceBody({ id, headingLevel = "h2" }: { id: string; headingLevel?: "h2" | "h3" }) {
  const { data, isPending, error } = api.assistant.source.useQuery({ id });
  const Heading = headingLevel;
  if (isPending) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (error) return <p className="text-stop">{error.message}</p>;

  const meta = [data.kindLabel, data.categoryLabel !== data.kindLabel ? data.categoryLabel : null]
    .filter(Boolean)
    .join(", ");
  return (
    <article className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Heading className="text-section font-semibold leading-tight">{data.title}</Heading>
        <p className="text-meta text-ink-soft">
          {meta}
          {data.updatedAt ? `, atualizado em ${formatDate(data.updatedAt)}` : ""}
          {data.ownerName ? `. Responsável: ${data.ownerName}` : ""}
        </p>
      </div>
      {data.isExample ? <ExampleContentNotice /> : null}
      <Markdown variant="chat">{data.bodyMd}</Markdown>
      {data.href ? (
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href={data.href}>{data.kind === "politica" ? "Abrir a política" : "Abrir em Políticas e benefícios"}</Link>
        </Button>
      ) : null}
    </article>
  );
}

/** Painel lateral com a fonte (página /assistente). */
export function SourceSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  return (
    <Sheet open={!!id} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="gap-0 p-0">
        <SheetHeader>
          <SheetTitle>Fonte da resposta</SheetTitle>
          <SheetDescription>Texto completo da base de conhecimento.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{id ? <SourceBody id={id} /> : null}</div>
      </SheetContent>
    </Sheet>
  );
}

/** Fonte aberta dentro do próprio widget, com volta para a conversa. */
export function SourceInline({ id, onBack }: { id: string; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Button variant="ghost" size="sm" className="w-fit" onClick={onBack} autoFocus>
        <ArrowLeft aria-hidden strokeWidth={1.75} />
        Voltar para a conversa
      </Button>
      <SourceBody id={id} headingLevel="h3" />
    </div>
  );
}
