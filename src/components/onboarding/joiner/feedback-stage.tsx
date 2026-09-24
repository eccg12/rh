"use client";

import { Check, PartyPopper } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StageData } from "@/domain/services/case-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDate, formatDays } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type FeedbackData = Extract<StageData, { kind: "feedback" }>;

export function FeedbackStage({ data }: { data: FeedbackData }) {
  const refresh = useRefreshAll();
  const [nps, setNps] = useState<number | null>(null);
  const [missing, setMissing] = useState("");
  const [confusing, setConfusing] = useState("");
  const submit = api.onboarding.submitFeedback.useMutation({
    onSuccess: async () => {
      toast.success("Resposta enviada", { description: "Obrigado! Seu onboarding está concluído." });
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  if (data.completed || data.survey) {
    return (
      <Card className="gap-4 border-ok/50">
        <p className="flex items-center gap-2 text-section font-semibold">
          <PartyPopper aria-hidden className="size-5" strokeWidth={1.75} />
          Onboarding concluído
        </p>
        <p className="text-ink-soft">
          {data.summary.leadTimeDays !== null
            ? `Do cadastro em ${formatDate(data.summary.createdAt)} à conclusão foram ${formatDays(data.summary.leadTimeDays)}.`
            : ""}{" "}
          Obrigado pela resposta. Ela vai direto para o RH e melhora a entrada de quem vem depois.
        </p>
        <div className="grid gap-2">
          <h2 className="font-semibold">O que você fez</h2>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {data.summary.tasksDone.map((t) => (
              <li key={t} className="flex items-start gap-2">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-ok" strokeWidth={2.5} />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    );
  }

  if (data.taskStatus !== "disponivel") {
    return <p className="text-ink-soft">A pesquisa abre depois do check-in do primeiro dia.</p>;
  }

  return (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (nps === null) return toast.error("Escolha uma nota de 0 a 10.");
        submit.mutate({ nps, missing: missing || undefined, confusing: confusing || undefined });
      }}
    >
      <fieldset className="grid gap-3">
        <legend className="mb-2 font-medium">De 0 a 10, quanto você recomendaria o onboarding da Monoda a quem vai entrar?</legend>
        <div role="radiogroup" aria-label="Nota de 0 a 10" className="flex flex-wrap gap-1.5">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={nps === n}
              onClick={() => setNps(n)}
              className={cn(
                "size-10 rounded-md border text-ui font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                nps === n ? "border-ink bg-ink text-white" : "border-control bg-surface hover:bg-tint",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="flex justify-between text-meta text-ink-soft sm:max-w-[500px]">
          <span>0 = nada provável</span>
          <span>10 = com certeza</span>
        </p>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="faltou">O que faltou?</Label>
        <Textarea id="faltou" value={missing} onChange={(e) => setMissing(e.target.value)} maxLength={1000} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confuso">O que foi confuso?</Label>
        <Textarea id="confuso" value={confusing} onChange={(e) => setConfusing(e.target.value)} maxLength={1000} />
      </div>
      <Button type="submit" size="lg" className="w-fit" disabled={submit.isPending}>
        Enviar resposta
      </Button>
    </form>
  );
}
