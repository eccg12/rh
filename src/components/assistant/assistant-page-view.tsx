"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";

import { PersonChip } from "@/components/common/person-chip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { plural } from "@/lib/format";
import { api } from "@/trpc/react";

import { AssistantComposer, AssistantConversation } from "./assistant-chat";
import { useAssistant } from "./assistant-provider";
import { SourceSheet } from "./source-detail";

function AssistantSidebar({ onOpenSource }: { onOpenSource: (id: string) => void }) {
  const [data] = api.assistant.overview.useSuspenseQuery();
  return (
    <aside className="flex min-w-0 flex-col gap-8" aria-label="Quem é quem e base de conhecimento">
      {data.openGaps !== undefined ? (
        <Link
          href="/admin/base-de-conhecimento?aba=lacunas"
          className="flex flex-col gap-1 rounded-lg border border-rule bg-surface p-4 hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span className="font-semibold">Lacunas da base</span>
          <span className="text-meta text-ink-soft">
            {data.openGaps === 0
              ? "Nenhuma pergunta sem resposta."
              : `${plural(data.openGaps, "pergunta sem resposta", "perguntas sem resposta")}. Crie artigos a partir delas.`}
          </span>
        </Link>
      ) : null}

      <section aria-labelledby="quem-e-quem" className="flex flex-col gap-3">
        <h2 id="quem-e-quem" className="text-section font-semibold">
          Quem é quem
        </h2>
        <ul className="flex flex-col divide-y divide-rule border-y border-rule">
          {data.directory.map((person) => (
            <li key={person.personId} className="flex flex-col gap-1.5 py-3">
              <PersonChip name={person.name} subtitle={person.jobTitle} size="sm" />
              <p className="text-meta text-ink-soft">
                {person.topics.length > 0 ? `${person.topics.join(", ")}. ` : ""}Canal: {person.channel}.
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="base-de-conhecimento" className="flex flex-col gap-2">
        <h2 id="base-de-conhecimento" className="text-section font-semibold">
          Base de conhecimento
        </h2>
        <Accordion type="multiple">
          {data.categories.map((category) => (
            <AccordionItem key={category.id} value={category.id}>
              <AccordionTrigger>
                <span>
                  {category.label} <span className="font-normal text-ink-soft">({category.sources.length})</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col gap-2">
                  {category.sources.map((source) => (
                    <li key={source.id}>
                      <button
                        type="button"
                        onClick={() => onOpenSource(source.id)}
                        className="text-left underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        {source.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </aside>
  );
}

function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

/** Página /assistente: conversa ao centro, "Quem é quem" e categorias da base na lateral (seção 9.4). */
export function AssistantPageView({ initialQuestion }: { initialQuestion?: string }) {
  const { ask, ready, entries, clear } = useAssistant();
  const [sourceId, setSourceId] = useState<string | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const askedInitial = useRef(false);

  // Pergunta vinda de outra tela (?q=): envia uma vez e limpa a URL.
  useEffect(() => {
    if (!ready || askedInitial.current || !initialQuestion) return;
    askedInitial.current = true;
    ask(initialQuestion);
    window.history.replaceState(null, "", "/assistente");
  }, [ready, initialQuestion, ask]);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
      <section aria-label="Conversa" className="flex min-w-0 max-w-[720px] flex-col gap-6">
        {entries.length > 0 ? (
          <Button variant="ghost" size="sm" className="-mt-2 w-fit self-end" onClick={clear}>
            <RotateCcw aria-hidden strokeWidth={1.75} />
            Nova conversa
          </Button>
        ) : null}
        <AssistantConversation
          onOpenSource={setSourceId}
          anchorRef={composerRef}
          intro={
            <p className="max-w-[60ch] text-ink-soft">
              As respostas vêm da base de conhecimento, com a fonte. Quando a base não cobre a pergunta, o assistente
              diz com quem falar e registra a dúvida para a base ser completada.
            </p>
          }
        />
        {/* A margem de rolagem deixa o campo acima do botão fixo "Demo". */}
        <div ref={composerRef} className="scroll-mb-24 border-t border-rule pt-4">
          <AssistantComposer autoFocus={!initialQuestion} />
        </div>
      </section>
      <Suspense fallback={<SidebarSkeleton />}>
        <AssistantSidebar onOpenSource={setSourceId} />
      </Suspense>
      <SourceSheet id={sourceId} onClose={() => setSourceId(null)} />
    </div>
  );
}
