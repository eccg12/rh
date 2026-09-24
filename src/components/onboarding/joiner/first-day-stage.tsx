"use client";

import Link from "next/link";
import { CalendarCheck, ExternalLink, MessageCircleQuestion } from "lucide-react";
import { toast } from "sonner";

import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { Markdown } from "@/components/common/markdown";
import { PersonAvatar } from "@/components/common/person-chip";
import { StatusBadge } from "@/components/common/status-badge";
import { SectionHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { StageData } from "@/domain/services/case-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDateLong, formatDateTime, formatWeekdayDate } from "@/lib/dates";
import { api } from "@/trpc/react";

type FirstDayData = Extract<StageData, { kind: "primeiro-dia" }>;

export function FirstDayStage({ data }: { data: FirstDayData }) {
  const refresh = useRefreshAll();
  const onError = (e: { message: string }) => toast.error(e.message);
  const read = api.onboarding.readAgenda.useMutation({
    onSuccess: async () => {
      toast.success("Agenda confirmada");
      await refresh();
    },
    onError,
  });
  const checkIn = api.onboarding.checkIn.useMutation({
    onSuccess: async () => {
      toast.success("Check-in feito", { description: "Boas-vindas! A pesquisa de onboarding foi liberada." });
      await refresh();
    },
    onError,
  });
  const agendaOpen = data.agendaTaskStatus === "disponivel";
  const c = data.checkin;

  return (
    <div className="grid grid-cols-1 gap-10">
      <section aria-labelledby="agenda" className="grid grid-cols-1 gap-3">
        <SectionHeader id="agenda" title={data.agenda.title} as="h2" description={`${formatWeekdayDate(data.case.startDate)}. ${data.agenda.intro}`} />
        {data.agenda.isExample ? <ExampleContentNotice /> : null}
        <ol className="divide-y divide-rule border-y border-rule">
          {data.agenda.items.map((item) => (
            <li key={item.time + item.title} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[80px_1fr]">
              <span className="font-semibold tabular-nums">{item.time}</span>
              <span className="flex flex-col">
                <span className="font-medium">{item.title}</span>
                {item.detail ? <span className="text-meta text-ink-soft">{item.detail}</span> : null}
              </span>
            </li>
          ))}
        </ol>
        {data.agenda.bodyMd ? <Markdown variant="chat">{data.agenda.bodyMd}</Markdown> : null}
        {data.agendaTaskStatus === "concluida" ? (
          <StatusBadge kind="task" status="concluida" label="Agenda confirmada" />
        ) : agendaOpen ? (
          <Button className="w-fit" disabled={read.isPending} onClick={() => read.mutate()}>
            <CalendarCheck aria-hidden />
            Li a agenda
          </Button>
        ) : null}
      </section>

      <section aria-labelledby="quem" className="grid grid-cols-1 gap-3">
        <SectionHeader id="quem" title="Quem é quem" as="h2" description="Com quem falar sobre cada assunto." />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.directory.map((d) => (
            <Card key={d.personId} className="flex-row items-start gap-3 p-4">
              <PersonAvatar name={d.name} size="lg" />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold">{d.name}</span>
                <span className="text-meta text-ink-soft">{d.topics.join("; ")}</span>
                <span className="text-meta">Pelo {d.channel}</span>
                {d.toValidate ? (
                  <Badge variant="outline" className="mt-1">
                    Temas a validar
                  </Badge>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="links" className="grid grid-cols-1 gap-3">
        <SectionHeader id="links" title="Links úteis" as="h2" />
        <ul className="grid grid-cols-1 gap-2">
          {data.usefulLinks.map((l) => (
            <li key={l.id}>
              <a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline underline-offset-4">
                {l.label}
                <ExternalLink aria-hidden className="size-3.5" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="perguntas" className="grid grid-cols-1 gap-3">
        <SectionHeader id="perguntas" title="Pergunte ao assistente" as="h2" />
        <ul className="grid grid-cols-1 gap-2">
          {data.agenda.suggestedQuestions.map((q) => (
            <li key={q}>
              <Link href={`/assistente?q=${encodeURIComponent(q)}`} className="inline-flex items-center gap-2 underline underline-offset-4">
                <MessageCircleQuestion aria-hidden className="size-4" />
                {q}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="checkin" className="grid grid-cols-1 gap-3 rounded-lg border border-rule bg-surface p-5">
        <h2 id="checkin" className="text-section font-semibold">
          Check-in
        </h2>
        {c.status === "concluida" ? (
          <p className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="task" status="concluida" label="Check-in feito" />
            <span className="text-meta text-ink-soft">{c.completedAt ? formatDateTime(c.completedAt) : ""}</span>
          </p>
        ) : c.status === "disponivel" ? (
          <>
            <p className="text-ink-soft">Chegou bem? Faça o check-in para liberar a pesquisa de onboarding.</p>
            <Button size="lg" className="w-fit" disabled={checkIn.isPending} onClick={() => checkIn.mutate()}>
              Fazer check-in
            </Button>
          </>
        ) : (
          <p className="text-ink-soft">
            {!c.startReached ? `O check-in abre no seu primeiro dia, ${formatDateLong(data.case.startDate)}.` : ""}
            {c.stagesPending.length ? ` Antes, falta concluir: ${c.stagesPending.join(", ")}.` : ""}
          </p>
        )}
      </section>
    </div>
  );
}
