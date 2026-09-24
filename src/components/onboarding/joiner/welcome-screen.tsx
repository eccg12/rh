"use client";

import { useRouter } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";
import { useState } from "react";

import { JourneyLine } from "@/components/common/journey-line";
import { LogoMark } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Journey } from "@/domain/services/case-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatMinutes, roundMinutes } from "@/lib/dates";
import { api } from "@/trpc/react";

import { startSentence } from "./texts";

/**
 * Boas-vindas do primeiro acesso (seção 9.3): tela inteira, com o único momento animado da jornada
 * (a linha se desenha). Grava `welcomeSeenAt`.
 */
export function WelcomeScreen({ journey }: { journey: Journey }) {
  const router = useRouter();
  const refresh = useRefreshAll();
  const [question, setQuestion] = useState("");
  const seen = api.onboarding.markWelcomeSeen.useMutation();

  const start = async (then?: string) => {
    await seen.mutateAsync().catch(() => undefined);
    if (then) router.push(then);
    await refresh();
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="boas-vindas-titulo" className="fixed inset-0 z-50 overflow-y-auto bg-paper">
      <div className="mx-auto grid min-h-dvh max-w-[1100px] grid-cols-1 content-center gap-10 px-4 py-10 md:grid-cols-[minmax(0,1fr)_280px] md:gap-16">
        <div className="flex min-w-0 flex-col gap-6">
          <p className="flex items-center gap-2 font-semibold">
            <LogoMark className="size-5" />
            monoda
          </p>
          <h1 id="boas-vindas-titulo" className="text-[30px] leading-[1.15] font-bold tracking-[-0.01em] sm:text-hero">
            Oi, {journey.person.firstName}. {startSentence(journey.daysUntilStart)}
          </h1>
          <p className="max-w-[56ch] text-read text-ink-soft">
            Reunimos aqui tudo o que precisa acontecer até lá: sua ficha, os documentos, o contrato, o treinamento de compliance e o que
            você precisa para o primeiro dia. Você faz a sua parte no seu ritmo; o resto é com a gente.
          </p>
          <dl className="grid gap-4 border-y border-rule py-5 sm:grid-cols-3">
            <div className="flex flex-col gap-0.5">
              <dt className="text-meta text-ink-soft">Etapas</dt>
              <dd className="text-section font-semibold tabular-nums">{journey.totalStages}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-meta text-ink-soft">Do seu lado</dt>
              <dd className="text-section font-semibold">cerca de {formatMinutes(roundMinutes(journey.remainingMinutes))}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-meta text-ink-soft">Quem acompanha você</dt>
              <dd className="text-section font-semibold">{journey.rhContact.name}</dd>
            </div>
          </dl>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim()) void start(`/assistente?q=${encodeURIComponent(question.trim())}`);
            }}
          >
            <label htmlFor="pergunta-inicial" className="flex items-center gap-2 font-medium">
              <MessageCircleQuestion aria-hidden className="size-5" strokeWidth={1.75} />
              Dúvidas no caminho? Pergunte ao assistente.
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="pergunta-inicial"
                placeholder="Ex.: o que acontece no meu primeiro dia?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <Button type="submit" variant="outline" disabled={!question.trim() || seen.isPending}>
                Perguntar
              </Button>
            </div>
          </form>
          <Button size="lg" className="w-fit" onClick={() => void start()} disabled={seen.isPending}>
            Começar
          </Button>
        </div>
        <JourneyLine stations={journey.stations} animation="draw" label="As etapas da sua jornada" className="min-w-0" />
      </div>
    </div>
  );
}
