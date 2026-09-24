"use client";

import { CalendarPlus, RotateCcw, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CaseDetail } from "@/domain/services/case-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatAgo, formatDate, formatDateTime, formatDuration, spDateKey } from "@/lib/dates";
import { api } from "@/trpc/react";

const TAB_FOR_TASK: Record<string, string> = {
  "revisao-documentos": "documentos",
  "contrato-preparar": "contrato",
  "email-corporativo": "equipamentos",
  "notebook-atribuir": "equipamentos",
  acessos: "equipamentos",
};

function ExamDialog({ caseId, today }: { caseId: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [clinic, setClinic] = useState("");
  const refresh = useRefreshAll();
  const schedule = api.onboarding.scheduleExam.useMutation({
    onSuccess: async () => {
      toast.success("Exame agendado");
      setOpen(false);
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <>
      <Button size="sm" variant="signal" onClick={() => setOpen(true)}>
        <CalendarPlus aria-hidden />
        Agendar exame
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar exame admissional</DialogTitle>
            <DialogDescription>Depois do agendamento, o envio do ASO é liberado para a pessoa.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="exame-data">Data do exame</Label>
              <Input id="exame-data" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exame-clinica">Clínica</Label>
              <Input id="exame-clinica" value={clinic} onChange={(e) => setClinic(e.target.value)} placeholder="Nome e endereço da clínica" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={!date || clinic.trim().length < 2 || schedule.isPending} onClick={() => schedule.mutate({ caseId, examDate: date, clinic })}>
              Agendar exame
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CaseJourneyTab({ data, onOpenTab }: { data: CaseDetail; onOpenTab: (tab: string) => void }) {
  const refresh = useRefreshAll();
  const today = spDateKey(data.now);
  const accounting = api.onboarding.markAccountingSent.useMutation({
    onSuccess: async () => {
      toast.success("Envio à contabilidade registrado");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const extra = api.onboarding.grantExtraQuizAttempt.useMutation({
    onSuccess: async () => {
      toast.success("Nova tentativa liberada");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <ol className="flex flex-col gap-8">
      {data.stages.map((stage, index) => (
        <li key={stage.id} className="grid gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-section font-semibold">
              <span className="sr-only">Etapa {index + 1}: </span>
              {stage.title}
            </h3>
            <StatusBadge
              kind="task"
              status={stage.status === "concluida" ? "concluida" : stage.status === "em_andamento" ? "em_andamento" : "bloqueada"}
              label={stage.status === "concluida" ? "Concluída" : stage.status === "em_andamento" ? "Em andamento" : "Ainda não começou"}
            />
            {stage.startedAt ? (
              <span className="text-meta text-ink-soft tabular-nums">
                {stage.completedAt
                  ? `${formatDuration((Date.parse(stage.completedAt) - Date.parse(stage.startedAt)) / 86_400_000)} na etapa`
                  : `aberta ${formatAgo(stage.startedAt, data.now)}`}
              </span>
            ) : null}
          </div>
          <ul className="divide-y divide-rule border-y border-rule">
            {stage.tasks.map((t) => {
              const rhAction = t.owner !== "new_joiner" && t.actionable;
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={t.status === "dispensada" ? "text-ink-soft line-through" : "font-medium"}>{t.title}</span>
                    <span className="text-meta text-ink-soft">
                      {t.ownerLabel}
                      {t.detail ? `. ${t.detail}` : ""}
                      {t.completedAt
                        ? `. Concluída em ${formatDateTime(t.completedAt)}${t.completedByName ? ` por ${t.completedByName}` : ""}`
                        : t.availableAt && t.status !== "bloqueada"
                          ? `. Liberada ${formatAgo(t.availableAt, data.now)} (${formatDate(t.availableAt)})`
                          : ""}
                    </span>
                  </div>
                  <StatusBadge kind="task" status={rhAction ? "depende_de_voce" : t.status} />
                  {rhAction && TAB_FOR_TASK[t.id] ? (
                    <Button size="sm" variant="signal" onClick={() => onOpenTab(TAB_FOR_TASK[t.id]!)}>
                      {t.actionLabel ?? "Abrir"}
                    </Button>
                  ) : null}
                  {rhAction && t.id === "exame-agendar" ? <ExamDialog caseId={data.case.id} today={today} /> : null}
                  {rhAction && t.id === "envio-contabilidade" ? (
                    <Button size="sm" variant="signal" disabled={accounting.isPending} onClick={() => accounting.mutate({ caseId: data.case.id })}>
                      <Send aria-hidden />
                      Marcar como enviado
                    </Button>
                  ) : null}
                  {t.id === "quiz-compliance" && !data.quiz.passed && data.quiz.attempts >= data.quiz.allowed ? (
                    <Button size="sm" variant="outline" disabled={extra.isPending} onClick={() => extra.mutate({ caseId: data.case.id })}>
                      <RotateCcw aria-hidden />
                      Liberar nova tentativa
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}
