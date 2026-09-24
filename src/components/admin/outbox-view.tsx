"use client";

import { Inbox, Mail, Search, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { AutomatedTag } from "@/components/common/automated-tag";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { OutboxItem } from "@/domain/services/admin-queries";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const ALL = "__todos__";

function EmailPreview({ email }: { email: OutboxItem }) {
  return (
    <article className="flex flex-col gap-3">
      <dl className="grid gap-1 text-meta">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-ink-soft">Para</dt>
          <dd>
            {email.toName} &lt;{email.to}&gt;
          </dd>
        </div>
        {email.cc?.length ? (
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-ink-soft">Cópia</dt>
            <dd>{email.cc.join(", ")}</dd>
          </div>
        ) : null}
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-ink-soft">Assunto</dt>
          <dd className="font-semibold">{email.subject}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-ink-soft">Quando</dt>
          <dd className="tabular-nums">{formatDateTime(email.createdAt)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 text-ink-soft">Origem</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <AutomatedTag />
            {email.ruleId ? `Regra ${email.ruleId}, ${email.ruleName}` : "Envio da plataforma"}
          </dd>
        </div>
      </dl>
      {/* HTML gerado pela própria plataforma a partir dos modelos, com variáveis escapadas. */}
      <div className="overflow-hidden rounded-lg border border-rule" dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
    </article>
  );
}

export function OutboxView() {
  const [emails] = api.admin.outbox.useSuspenseQuery();
  const [query, setQuery] = useState("");
  const [rule, setRule] = useState(ALL);
  const [person, setPerson] = useState(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rules = useMemo(() => [...new Map(emails.filter((e) => e.ruleId).map((e) => [e.ruleId!, e.ruleName])).entries()].sort(), [emails]);
  const people = useMemo(() => [...new Set(emails.map((e) => e.caseName).filter((x): x is string => !!x))].sort(), [emails]);
  const filtered = emails.filter((e) => {
    const q = query.trim().toLowerCase();
    return (
      (!q || `${e.toName} ${e.to} ${e.subject}`.toLowerCase().includes(q)) &&
      (rule === ALL || e.ruleId === rule) &&
      (person === ALL || e.caseName === person)
    );
  });
  const selected = emails.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="grid gap-5">
      <p className="flex w-fit items-center gap-2 rounded-md border border-dashed border-control bg-surface px-3 py-2 font-medium">
        <ShieldAlert aria-hidden className="size-4" />
        Simulado — nenhum e-mail real foi enviado
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-56 flex-1 gap-1.5">
          <Label htmlFor="busca-email">Buscar</Label>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-ink-soft" />
            <Input id="busca-email" className="pl-9" placeholder="Destinatário ou assunto" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filtro-regra">Regra</Label>
          <Select value={rule} onValueChange={setRule}>
            <SelectTrigger id="filtro-regra" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as regras</SelectItem>
              {rules.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {id} — {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="filtro-caso">Caso</Label>
          <Select value={person} onValueChange={setPerson}>
            <SelectTrigger id="filtro-caso" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os casos</SelectItem>
              {people.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-meta text-ink-soft tabular-nums">
        {filtered.length} de {emails.length} e-mails
      </p>

      {filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="Nenhum e-mail com esses filtros." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ul className="divide-y divide-rule border-y border-rule" aria-label="E-mails enviados">
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(e.id)}
                  aria-current={e.id === selectedId ? "true" : undefined}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-2 py-2.5 text-left hover:bg-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink",
                    e.id === selectedId && "bg-tint",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium">{e.subject}</span>
                    <span className="shrink-0 text-meta text-ink-soft tabular-nums">{formatDateTime(e.createdAt)}</span>
                  </span>
                  <span className="truncate text-meta text-ink-soft">
                    Para {e.toName} ({e.to}){e.ruleId ? `. Regra ${e.ruleId}` : ""}
                    {e.caseName ? `. Caso de ${e.caseName}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="hidden lg:block">
            {selected ? (
              <div className="sticky top-32">
                <EmailPreview email={selected} />
              </div>
            ) : (
              <EmptyState icon={Mail} title="Escolha um e-mail para ver" description="Os links funcionam: no modo demo, eles trocam a persona para o destinatário." />
            )}
          </div>
        </div>
      )}

      <Sheet open={!!selected && typeof window !== "undefined" && window.innerWidth < 1024} onOpenChange={(v) => !v && setSelectedId(null)}>
        <SheetContent side="bottom" className="max-h-[90dvh] gap-0 overflow-y-auto p-0 lg:hidden">
          <SheetHeader>
            <SheetTitle>{selected?.subject}</SheetTitle>
            <SheetDescription>E-mail simulado</SheetDescription>
          </SheetHeader>
          <div className="p-4">{selected ? <EmailPreview email={selected} /> : null}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
