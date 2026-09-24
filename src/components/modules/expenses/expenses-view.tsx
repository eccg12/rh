"use client";

import Link from "next/link";
import { ExternalLink, PlayCircle, ReceiptText } from "lucide-react";

import { AskAssistantButton } from "@/components/assistant/ask-assistant-button";
import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { Markdown } from "@/components/common/markdown";
import { SectionHeader } from "@/components/shell/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import { api } from "@/trpc/react";

import { AckBadge, AckSentence } from "../policies/ack-status";

function minutes(seconds: number): string {
  const m = Math.max(1, Math.round(seconds / 60));
  return `${m} min`;
}

export function ExpensesView() {
  const [data] = api.expenses.overview.useSuspenseQuery();
  const policy = data.travelPolicy;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
      <div className="flex min-w-0 max-w-[720px] flex-col gap-12">
        {data.howTo ? (
          <section aria-labelledby="como-lancar" className="flex flex-col gap-4">
            <SectionHeader
              id="como-lancar"
              title="Como lançar uma despesa"
              description={`Passo a passo no ${data.tool.name}, da base de conhecimento.`}
              actions={
                <Button asChild>
                  <a href={data.tool.url} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden strokeWidth={1.75} />
                    Abrir {data.tool.name}
                  </a>
                </Button>
              }
            />
            {data.howTo.isExample ? <ExampleContentNotice /> : null}
            <Markdown>{data.howTo.bodyMd}</Markdown>
            <p className="text-meta text-ink-soft">Atualizado em {formatDate(data.howTo.updatedAt)}.</p>
          </section>
        ) : null}

        <section aria-labelledby="videos" className="flex flex-col gap-4">
          <SectionHeader id="videos" title="Vídeos tutoriais" />
          <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-surface">
            {data.tutorials.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="flex items-center gap-3">
                  <PlayCircle aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
                  <span className="flex flex-col">
                    <span className="font-medium">{t.title}</span>
                    <span className="text-meta text-ink-soft">{minutes(t.durationSec)}</span>
                  </span>
                </span>
                {t.url ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={t.url} target="_blank" rel="noreferrer">
                      Assistir
                    </a>
                  </Button>
                ) : (
                  <Badge variant="muted">Vídeo em produção</Badge>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="perguntas-frequentes" className="flex flex-col gap-4">
          <SectionHeader id="perguntas-frequentes" title="Perguntas frequentes" />
          {data.faq.map((group) => (
            <div key={group.category} className="flex flex-col gap-1">
              <h3 className="font-semibold">{group.label}</h3>
              <Accordion type="multiple" className="rounded-lg border border-rule bg-surface px-4">
                {group.articles.map((a) => (
                  <AccordionItem key={a.id} value={a.id}>
                    <AccordionTrigger>{a.title}</AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-3">
                      <Markdown variant="chat">{a.bodyMd}</Markdown>
                      {a.isExample ? <ExampleContentNotice /> : null}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-ink-soft">Não achou a sua dúvida?</p>
            <AskAssistantButton />
          </div>
        </section>
      </div>

      <aside className="flex flex-col gap-6" aria-label="Política de viagens e reembolsos">
        {policy ? (
          <Card className="gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-section font-semibold">{policy.title}</h2>
              <p className="text-meta text-ink-soft">
                Versão {policy.version}, vigente desde {formatDate(policy.effectiveFrom)}.
              </p>
            </div>
            <p>{policy.summary}</p>
            <div className="flex flex-col items-start gap-1.5">
              <AckBadge my={policy.my} />
              <p className="text-meta text-ink-soft">
                <AckSentence my={policy.my} version={policy.version} />
              </p>
            </div>
            {policy.isExample ? <ExampleContentNotice /> : null}
            <Button asChild variant={policy.my.canAcknowledge ? "default" : "outline"} className="w-fit">
              <Link href={`/politicas-beneficios/${policy.id}`}>
                {policy.my.canAcknowledge ? "Ler e aceitar" : "Ler a política completa"}
              </Link>
            </Button>
          </Card>
        ) : null}
        <section className="flex flex-col gap-2 rounded-lg border border-dashed border-rule bg-surface p-5">
          <div className="flex items-start gap-2">
            <ReceiptText aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
            <h2 className="font-semibold">{data.reimbursementsComingSoon}</h2>
          </div>
          <p className="text-ink-soft">Enquanto isso, o status de cada despesa fica no {data.tool.name}.</p>
        </section>
      </aside>
    </div>
  );
}
