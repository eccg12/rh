"use client";

import Link from "next/link";
import { Check, CircleDot, Hourglass, Lock, MessageCircleQuestion, PartyPopper } from "lucide-react";

import { JourneyLine } from "@/components/common/journey-line";
import { SectionHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Journey } from "@/domain/services/case-queries";
import { formatDate, formatDateLong, formatMinutes } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

import { minutesSentence, startSentence } from "./texts";
import { WelcomeScreen } from "./welcome-screen";

function TaskStatusIcon({ status, owner }: { status: string; owner: string }) {
  if (status === "concluida") return <Check aria-hidden className="size-4 text-ok" strokeWidth={2.5} />;
  if (status === "aguardando_revisao" || owner !== "new_joiner") return <Hourglass aria-hidden className="size-4 text-ink-soft" />;
  if (status === "bloqueada") return <Lock aria-hidden className="size-4 text-ink-soft" />;
  return <CircleDot aria-hidden className="size-4 text-ink" />;
}

type JourneyTask = NonNullable<Journey["currentStage"]>["tasks"][number];

function statusText(t: JourneyTask): string {
  if (t.status === "concluida") return "feito";
  if (t.owner !== "new_joiner") return `com ${t.ownerLabel === "TI" ? "a TI" : `o ${t.ownerLabel}`}`;
  if (t.status === "bloqueada") return "ainda não liberada";
  if (t.status === "aguardando_revisao") return "com o RH para revisão";
  return t.minutes ? formatMinutes(t.minutes) : "com você";
}

export function JourneyView() {
  const [journey] = api.onboarding.journey.useSuspenseQuery();
  const done = journey.case.status === "concluido";

  if (!journey.person.welcomeSeen && !done) return <WelcomeScreen journey={journey} />;

  return (
    <>
      <header className="mb-6 flex flex-col gap-2 sm:mb-8">
        <h1 className="text-page font-semibold">
          Oi, {journey.person.firstName}. {done ? "Seu onboarding está concluído." : startSentence(journey.daysUntilStart)}
        </h1>
        <p className="text-ink-soft">
          Início em {formatDateLong(journey.case.startDate)}.
          {journey.case.workflowBadge ? (
            <Badge variant="outline" className="ml-2 align-middle">
              {journey.case.workflowBadge}
            </Badge>
          ) : null}
        </p>
        <div className="flex max-w-md items-center gap-3">
          <Progress value={journey.progress.percent} aria-label="Seu progresso" />
          <span className="shrink-0 text-meta tabular-nums">{journey.progress.percent}%</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[260px_minmax(0,1fr)] md:gap-12">
        <nav aria-label="Etapas" className="min-w-0">
          <JourneyLine stations={journey.stations} storageKey={`jornada:${journey.case.id}`} />
        </nav>

        <div className="flex min-w-0 flex-col gap-8">
          {done ? (
            <Card className="gap-3 border-ok/40">
              <p className="flex items-center gap-2 text-section font-semibold">
                <PartyPopper aria-hidden className="size-5" strokeWidth={1.75} />
                Onboarding concluído
              </p>
              <p className="text-ink-soft">
                Concluído em {journey.case.completedAt ? formatDate(journey.case.completedAt) : "—"}. Obrigado pela resposta da pesquisa: ela
                melhora a entrada de quem vem depois.
              </p>
              <Button asChild variant="outline" className="w-fit">
                <Link href="/onboarding/etapa/feedback">Ver o resumo</Link>
              </Button>
            </Card>
          ) : journey.nextStep ? (
            <Card aria-labelledby="proximo-passo" className="gap-3 border-ink">
              <p id="proximo-passo" className="text-meta font-semibold text-ink-soft">
                Próximo passo
              </p>
              <h2 className="text-section font-semibold">{journey.nextStep.title}</h2>
              <p className="text-ink-soft">
                {[minutesSentence(journey.nextStep.minutes), journey.nextStep.note].filter(Boolean).join(" ")}
              </p>
              <Button asChild size="lg" className="w-fit">
                <Link href={journey.nextStep.href}>{journey.nextStep.actionLabel}</Link>
              </Button>
            </Card>
          ) : (
            <Card className="gap-2">
              <p className="text-meta font-semibold text-ink-soft">Próximo passo</p>
              <h2 className="text-section font-semibold">Nada pendente do seu lado agora</h2>
              <p className="text-ink-soft">
                Estamos preparando {journey.currentStage ? `a etapa "${journey.currentStage.title}"` : "a próxima etapa"}. Você recebe um e-mail
                quando for a sua vez.
              </p>
            </Card>
          )}

          {journey.currentStage && !done ? (
            <section aria-labelledby="nesta-etapa">
              <SectionHeader id="nesta-etapa" title="Nesta etapa" description={journey.currentStage.summary} as="h2" />
              <ul className="divide-y divide-rule border-y border-rule">
                {journey.currentStage.tasks.map((t) => {
                  const open = t.owner === "new_joiner" && t.actionable;
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-3">
                      <TaskStatusIcon status={t.status} owner={t.owner} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        {open ? (
                          <Link href={t.href} className="font-medium underline-offset-4 hover:underline">
                            {t.title}
                          </Link>
                        ) : (
                          <span className={cn(t.status === "concluida" ? "text-ink-soft" : "font-medium")}>{t.title}</span>
                        )}
                        <span className="text-meta text-ink-soft">{statusText(t)}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="ajuda" className="flex flex-col gap-3 rounded-lg border border-rule bg-surface p-5">
            <h2 id="ajuda" className="font-semibold">
              Precisa de ajuda?
            </h2>
            <p className="text-ink-soft">
              Pergunte ao assistente ou fale com {journey.rhContact.name} pelo {journey.rhContact.channel}.
            </p>
            <Button asChild variant="outline" className="w-fit">
              <Link href="/assistente">
                <MessageCircleQuestion aria-hidden />
                Perguntar ao assistente
              </Link>
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}
