"use client";

import { Check, Copy, FileText, MessageCircleQuestion, Send, Square, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { Markdown } from "@/components/common/markdown";
import { PersonChip } from "@/components/common/person-chip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SUGGESTED_QUESTIONS } from "@/config/assistant";
import { cn } from "@/lib/utils";
import type { AssistantRoute } from "@/server/assistant/answer";

import { useAssistant, type ChatEntry } from "./assistant-provider";

export const PRIVACY_HINT = "Não escreva CPF, documentos ou dados bancários. Se escrever, o assistente mascara antes de responder.";

/** Perguntas sugeridas enquanto a conversa está vazia (seção 10.5). */
export function SuggestedQuestions({ questions = SUGGESTED_QUESTIONS }: { questions?: readonly string[] }) {
  const { ask, busy } = useAssistant();
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-ui font-semibold">Perguntas sugeridas</h2>
      <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-surface">
        {questions.map((q) => (
          <li key={q}>
            <button
              type="button"
              disabled={busy}
              onClick={() => ask(q)}
              className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-tint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink disabled:opacity-60"
            >
              <MessageCircleQuestion aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-soft" strokeWidth={1.75} />
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RouteCard({ route }: { route: AssistantRoute }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  // Confirmação no próprio botão: um toast cobriria o campo de pergunta do painel.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(route.question);
      setCopied(true);
    } catch {
      toast.error("Não foi possível copiar. Selecione a pergunta e copie manualmente.");
    }
  };
  return (
    <section aria-label="Com quem falar" className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-4">
      <PersonChip name={route.name} subtitle={route.jobTitle} />
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-meta">
        {route.topics.length > 0 ? (
          <>
            <dt className="text-ink-soft">Temas</dt>
            <dd>{route.topics.join(", ")}</dd>
          </>
        ) : null}
        <dt className="text-ink-soft">Canal</dt>
        <dd>{route.channel}</dd>
      </dl>
      <Button variant="outline" size="sm" className="w-fit" onClick={() => void copy()}>
        {copied ? <Check aria-hidden strokeWidth={1.75} /> : <Copy aria-hidden strokeWidth={1.75} />}
        {copied ? "Pergunta copiada" : "Copiar pergunta"}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Pergunta copiada" : ""}
      </span>
    </section>
  );
}

function AnswerView({ entry, onOpenSource }: { entry: ChatEntry; onOpenSource: (id: string) => void }) {
  const { rate } = useAssistant();
  const streaming = entry.status === "streaming";
  const finished = entry.status === "done" || entry.status === "stopped";
  const sources = entry.sources ?? [];
  const hasExample = sources.some((s) => s.isExample);
  const canRate = finished && !!entry.messageId && (sources.length > 0 || !!entry.route);

  return (
    <article aria-busy={streaming} className="flex min-w-0 flex-col gap-3">
      <span className="sr-only">Assistente:</span>
      {entry.text ? (
        <Markdown variant="chat" className={cn("min-w-0 break-words", entry.status === "error" && "text-stop")}>
          {entry.text}
        </Markdown>
      ) : streaming ? (
        <p className="text-ink-soft">Buscando na base…</p>
      ) : null}
      {entry.status === "stopped" ? <p className="text-meta text-ink-soft">Resposta interrompida.</p> : null}
      {entry.route && finished ? <RouteCard route={entry.route} /> : null}
      {sources.length > 0 && !streaming ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-meta">
            <span className="text-ink-soft">{sources.length === 1 ? "Fonte" : "Fontes"}</span>
            {sources.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onOpenSource(s.id)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-rule bg-surface px-2 py-1 text-left font-medium hover:bg-tint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
              >
                <FileText aria-hidden className="size-3.5 shrink-0 text-ink-soft" strokeWidth={1.75} />
                <span className="min-w-0 truncate">{s.title}</span>
              </button>
            ))}
          </div>
          {entry.mode === "llm" ? (
            <p className="text-meta text-ink-soft">Resposta escrita com IA a partir das fontes. Confira os detalhes na fonte.</p>
          ) : null}
          {hasExample ? <ExampleContentNotice /> : null}
        </div>
      ) : null}
      {canRate ? (
        entry.feedback ? (
          <p className="text-meta text-ink-soft" role="status">
            Obrigado pelo retorno.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
            <span className="mr-1 basis-full text-meta text-ink-soft sm:basis-auto">Esta resposta ajudou?</span>
            <Button variant="ghost" size="sm" onClick={() => rate(entry.id, true)}>
              <ThumbsUp aria-hidden strokeWidth={1.75} />
              Ajudou
            </Button>
            <Button variant="ghost" size="sm" onClick={() => rate(entry.id, false)}>
              <ThumbsDown aria-hidden strokeWidth={1.75} />
              Não ajudou
            </Button>
          </div>
        )
      ) : null}
    </article>
  );
}

/** Mensagens da conversa (ou as perguntas sugeridas, enquanto vazia). */
export function AssistantConversation({
  onOpenSource,
  intro,
  anchorRef,
}: {
  onOpenSource: (id: string) => void;
  intro?: React.ReactNode;
  /** Elemento que deve ficar visível enquanto a resposta chega (padrão: o fim da conversa). */
  anchorRef?: React.RefObject<HTMLElement | null>;
}) {
  const { entries } = useAssistant();
  const endRef = useRef<HTMLDivElement>(null);
  const last = entries.at(-1);
  const lastLength = last?.text.length ?? 0;

  // Pergunta nova: leva ao fim da conversa.
  useEffect(() => {
    (anchorRef?.current ?? endRef.current)?.scrollIntoView({ block: "end" });
  }, [entries.length, anchorRef]);

  // Resposta chegando: acompanha só se a pessoa não rolou para cima.
  useEffect(() => {
    const target = anchorRef?.current ?? endRef.current;
    if (!target) return;
    const { bottom } = target.getBoundingClientRect();
    if (bottom - window.innerHeight < 240) target.scrollIntoView({ block: "end" });
  }, [lastLength, last?.status, anchorRef]);

  const announcement =
    last?.role === "assistant" && last.status === "done"
      ? last.route
        ? `Resposta pronta. Encaminhado para ${last.route.name}.`
        : "Resposta pronta."
      : last?.status === "error"
        ? "Não foi possível responder."
        : "";

  if (entries.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {intro}
        <SuggestedQuestions />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-6" aria-label="Conversa com o assistente">
        {entries.map((entry) => (
          <li key={entry.id} className={cn("flex min-w-0", entry.role === "user" && "justify-end")}>
            {entry.role === "user" ? (
              <p className="max-w-[85%] rounded-lg bg-tint px-3 py-2 break-words whitespace-pre-wrap">
                <span className="sr-only">Você: </span>
                {entry.text}
              </p>
            ) : (
              <AnswerView entry={entry} onOpenSource={onOpenSource} />
            )}
          </li>
        ))}
      </ol>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <div ref={endRef} />
    </div>
  );
}

/** Campo da pergunta. Enter envia; Shift+Enter quebra a linha. */
export function AssistantComposer({ autoFocus = false, className }: { autoFocus?: boolean; className?: string }) {
  const { ask, busy, stop } = useAssistant();
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const hintId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const question = draft.trim();
    if (!question || busy) return;
    ask(question);
    setDraft("");
    textareaRef.current?.focus();
  };

  return (
    <form
      className={cn("flex flex-col gap-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Sua pergunta
      </label>
      <div className="flex items-end gap-2">
        <Textarea
          id={inputId}
          ref={textareaRef}
          rows={1}
          value={draft}
          maxLength={1000}
          autoFocus={autoFocus}
          aria-describedby={hintId}
          placeholder="Escreva sua pergunta"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-40 min-h-10 resize-none field-sizing-content"
        />
        {busy ? (
          <Button type="button" variant="outline" onClick={stop}>
            <Square aria-hidden strokeWidth={1.75} />
            Parar
          </Button>
        ) : (
          <Button type="submit" disabled={!draft.trim()}>
            <Send aria-hidden strokeWidth={1.75} />
            Enviar
          </Button>
        )}
      </div>
      <p id={hintId} className="text-meta text-ink-soft">
        {PRIVACY_HINT}
      </p>
    </form>
  );
}
