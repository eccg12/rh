"use client";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";
import { plural } from "@/lib/format";
import { api } from "@/trpc/react";

export function SurveyView() {
  const [data] = api.admin.survey.useSuspenseQuery();
  if (data.responses.length === 0) {
    return <p className="text-ink-soft">Nenhuma resposta ainda. A pesquisa sai automaticamente depois do check-in do primeiro dia.</p>;
  }
  const max = Math.max(...data.distribution);
  return (
    <div className="flex max-w-[860px] flex-col gap-8">
      <p className="text-read">
        Média <span className="font-semibold">{data.average?.toLocaleString("pt-BR")}</span> em{" "}
        {plural(data.responses.length, "resposta", "respostas")}, numa escala de 0 a 10.
      </p>
      <figure className="flex flex-col gap-2">
        <figcaption className="text-meta text-ink-soft">Respostas por nota</figcaption>
        <ol className="grid grid-cols-11 items-end gap-1" aria-label="Distribuição das notas">
          {data.distribution.map((count, score) => (
            <li key={score} className="flex flex-col items-center gap-1">
              <span className="text-meta tabular-nums">{count || ""}</span>
              <span
                aria-hidden
                className="w-full rounded-sm bg-ink"
                style={{ height: `${max ? Math.max(2, (count / max) * 64) : 2}px`, opacity: count ? 1 : 0.15 }}
              />
              <span className="text-meta text-ink-soft tabular-nums">
                <span className="sr-only">Nota </span>
                {score}
                <span className="sr-only">: {plural(count, "resposta", "respostas")}</span>
              </span>
            </li>
          ))}
        </ol>
      </figure>
      <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-surface">
        {data.responses.map((r) => (
          <li key={r.caseId} className="flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{r.personName}</span>
              <span className="flex items-center gap-2 text-meta text-ink-soft">
                {r.regime ? `${r.regime}, ` : ""}respondeu em {formatDate(r.submittedAt)}
                <Badge variant="secondary">Nota {r.nps}</Badge>
              </span>
            </div>
            <dl className="grid gap-x-3 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)]">
              <dt className="text-meta text-ink-soft">O que faltou</dt>
              <dd>{r.missing || <span className="text-ink-soft">Sem comentário</span>}</dd>
              <dt className="text-meta text-ink-soft">O que foi confuso</dt>
              <dd>{r.confusing || <span className="text-ink-soft">Sem comentário</span>}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
