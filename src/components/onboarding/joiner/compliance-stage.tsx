"use client";

import { BadgeCheck, CircleCheck, CircleX, Film, Printer, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DemoShortcut } from "@/components/common/demo-only";
import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { Markdown } from "@/components/common/markdown";
import { StatusBadge } from "@/components/common/status-badge";
import { SectionHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { StageData } from "@/domain/services/case-queries";
import type { QuizResult } from "@/domain/services/onboarding";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDateTime, formatMinutes } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type ComplianceData = Extract<StageData, { kind: "compliance" }>;

function embedUrl(url: string): string | null {
  const yt = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/.exec(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const drive = /drive\.google\.com\/file\/d\/([\w-]+)/.exec(url);
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`;
  return null;
}

function VideoStep({ data }: { data: ComplianceData }) {
  const v = data.video;
  const refresh = useRefreshAll();
  const [elapsed, setElapsed] = useState(0);
  const sent = useRef(false);
  const watch = api.onboarding.watchVideo.useMutation({
    onSuccess: async () => {
      toast.success("Vídeo concluído", { description: "O quiz foi liberado." });
      await refresh();
    },
    onError: (e) => {
      sent.current = false;
      toast.error(e.message);
    },
  });
  const open = v.taskStatus === "disponivel";
  const isMp4 = !!v.url && /\.mp4($|\?)/i.test(v.url);
  const embed = v.url && !isMp4 ? embedUrl(v.url) : null;

  useEffect(() => {
    if (!open || !embed) return;
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [open, embed]);

  const markWatched = (simulated: boolean) => {
    if (sent.current) return;
    sent.current = true;
    watch.mutate({ simulated });
  };

  return (
    <section aria-labelledby="video" className="grid gap-3">
      <SectionHeader id="video" title="1. Vídeo" as="h2" description={`${v.title}, ${formatMinutes(Math.ceil(v.durationSec / 60))}.`} />
      {v.watched ? (
        <p className="flex items-center gap-2">
          <StatusBadge kind="task" status="concluida" label="Assistido" />
          <span className="text-meta text-ink-soft">{v.watchedAt ? formatDateTime(v.watchedAt) : ""}</span>
        </p>
      ) : !open ? (
        <p className="text-ink-soft">O vídeo é liberado assim que você enviar todos os documentos obrigatórios.</p>
      ) : isMp4 ? (
        <video
          controls
          className="w-full rounded-lg bg-ink"
          src={v.url}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration && el.currentTime / el.duration >= 0.9) markWatched(false);
          }}
        />
      ) : embed ? (
        <div className="grid gap-3">
          <iframe
            title={v.title}
            src={embed}
            className="aspect-video w-full rounded-lg border border-rule"
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
          />
          <Button className="w-fit" disabled={elapsed < v.durationSec || watch.isPending} onClick={() => markWatched(false)}>
            {elapsed < v.durationSec ? `Concluí o vídeo (disponível em ${formatMinutes(Math.ceil((v.durationSec - elapsed) / 60))})` : "Concluí o vídeo"}
          </Button>
        </div>
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg bg-ink px-6 text-center text-white">
          <Film aria-hidden className="size-8" strokeWidth={1.5} />
          <p className="text-section font-semibold">Vídeo de compliance em produção</p>
          <p className="text-white/80">Duração prevista: {formatMinutes(Math.ceil(v.durationSec / 60))}.</p>
        </div>
      )}
      {open && !v.watched ? (
        <DemoShortcut onClick={() => markWatched(true)} disabled={watch.isPending}>
          Simular vídeo assistido
        </DemoShortcut>
      ) : null}
      {v.description ? <p className="text-meta text-ink-soft">{v.description}</p> : null}
    </section>
  );
}

function QuizStep({ data }: { data: ComplianceData }) {
  const q = data.quiz;
  const refresh = useRefreshAll();
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => q.questions.map(() => null));
  const [result, setResult] = useState<QuizResult | null>(null);
  const submit = api.onboarding.submitQuiz.useMutation({
    onSuccess: (r) => {
      setResult(r);
      if (r.passed) toast.success("Quiz aprovado", { description: "Seu comprovante de treinamento foi emitido." });
      else toast.error(`Nota ${r.score}%: abaixo da nota mínima de ${r.passingScore}%.`);
      void refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const restart = () => {
    setAnswers(q.questions.map(() => null));
    setIndex(0);
    setResult(null);
    setStarted(true);
  };

  if (result) {
    return (
      <section aria-labelledby="quiz" className="grid gap-4">
        <SectionHeader id="quiz" title="2. Quiz" as="h2" />
        <Card className={cn("gap-2", result.passed ? "border-ok/50" : "border-stop/40")}>
          <p className="flex items-center gap-2 text-section font-semibold">
            {result.passed ? <CircleCheck aria-hidden className="size-5 text-ok" /> : <CircleX aria-hidden className="size-5 text-stop" />}
            {result.passed ? "Aprovado" : "Ainda não foi desta vez"}
          </p>
          <p className="tabular-nums">
            Nota {result.score}%. Mínima: {result.passingScore}%. Tentativa {result.attempt}.
            {!result.passed ? ` Restam ${result.attemptsLeft} ${result.attemptsLeft === 1 ? "tentativa" : "tentativas"}.` : ""}
          </p>
        </Card>
        <ol className="grid gap-3">
          {result.questions.map((qq, i) => (
            <li key={qq.id} className="grid gap-1 border-b border-rule pb-3">
              <p className="font-medium">
                {i + 1}. {qq.prompt}
              </p>
              <p className={cn("flex items-start gap-1.5 text-meta", qq.correct ? "text-ok" : "text-stop")}>
                {qq.correct ? <CircleCheck aria-hidden className="mt-0.5 size-3.5 shrink-0" /> : <CircleX aria-hidden className="mt-0.5 size-3.5 shrink-0" />}
                {qq.correct ? "Você acertou" : `Você respondeu: ${qq.options[qq.chosen] ?? "sem resposta"}`}
              </p>
              {!qq.correct ? <p className="text-meta">Resposta certa: {qq.options[qq.correctIndex]}</p> : null}
              <p className="text-meta text-ink-soft">{qq.explanation}</p>
            </li>
          ))}
        </ol>
        {result.passed ? (
          <Button className="w-fit" onClick={() => setResult(null)}>
            Continuar
          </Button>
        ) : result.attemptsLeft > 0 ? (
          <Button className="w-fit" onClick={restart}>
            <RotateCcw aria-hidden />
            Tentar de novo
          </Button>
        ) : (
          <p className="text-ink-soft">Você usou todas as tentativas. O RH foi avisado e pode liberar uma nova.</p>
        )}
      </section>
    );
  }

  if (q.passed) {
    return (
      <section aria-labelledby="quiz" className="grid gap-2">
        <SectionHeader id="quiz" title="2. Quiz" as="h2" />
        <p className="flex items-center gap-2">
          <StatusBadge kind="task" status="concluida" label="Aprovado" /> Nota {q.lastScore}%.
        </p>
      </section>
    );
  }

  const question = q.questions[index];
  return (
    <section aria-labelledby="quiz" className="grid gap-4">
      <SectionHeader
        id="quiz"
        title="2. Quiz"
        as="h2"
        description={`${q.questions.length} perguntas. Nota mínima de ${q.passingScore}% e até ${q.maxAttempts} tentativas${q.attemptsUsed ? ` (${q.attemptsUsed} usada${q.attemptsUsed > 1 ? "s" : ""})` : ""}.`}
      />
      {!q.canAttempt ? (
        <p className="text-ink-soft">
          {q.taskStatus === "bloqueada" ? "O quiz é liberado depois do vídeo." : "Você usou todas as tentativas. Fale com o RH para liberar uma nova."}
        </p>
      ) : !started ? (
        <Button className="w-fit" onClick={() => setStarted(true)}>
          Começar o quiz
        </Button>
      ) : question ? (
        <Card className="gap-4">
          <div className="grid gap-2">
            <p className="text-meta text-ink-soft tabular-nums">
              Pergunta {index + 1} de {q.questions.length}
            </p>
            <Progress value={((index + 1) / q.questions.length) * 100} aria-hidden />
          </div>
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-read font-medium">{question.prompt}</legend>
            <RadioGroup
              value={answers[index] === null ? "" : String(answers[index])}
              onValueChange={(v) => setAnswers((a) => a.map((x, i) => (i === index ? Number(v) : x)))}
              className="gap-3"
            >
              {question.options.map((opt, oi) => (
                <label key={oi} className="flex cursor-pointer items-start gap-3 rounded-md border border-rule bg-surface p-3 has-[[data-state=checked]]:border-ink">
                  <RadioGroupItem value={String(oi)} className="mt-0.5" />
                  <span>{opt}</span>
                </label>
              ))}
            </RadioGroup>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            {index > 0 ? (
              <Button variant="outline" onClick={() => setIndex((i) => i - 1)}>
                Voltar
              </Button>
            ) : null}
            {index < q.questions.length - 1 ? (
              <Button disabled={answers[index] === null} onClick={() => setIndex((i) => i + 1)}>
                Próxima pergunta
              </Button>
            ) : (
              <Button disabled={answers.some((a) => a === null) || submit.isPending} onClick={() => submit.mutate({ answers: answers.map((a) => a ?? -1) })}>
                Enviar respostas
              </Button>
            )}
          </div>
        </Card>
      ) : null}
    </section>
  );
}

function ConductStep({ data }: { data: ComplianceData }) {
  const refresh = useRefreshAll();
  const [read, setRead] = useState(false);
  const c = data.conduct;
  const ack = api.onboarding.acknowledgePolicy.useMutation({
    onSuccess: async () => {
      toast.success("Política aceita");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  if (!c) return null;
  const open = c.taskStatus === "disponivel";
  return (
    <section aria-labelledby="conduta" className="grid gap-3">
      <SectionHeader id="conduta" title={`3. ${c.title}`} as="h2" description={`Versão ${c.version}. ${c.summary}`} />
      {c.acknowledged ? (
        <StatusBadge kind="ack" status="aceita" />
      ) : !open ? (
        <p className="text-ink-soft">O aceite do Código de Conduta é liberado depois do quiz.</p>
      ) : (
        <Card className="gap-4">
          {c.isExample ? <ExampleContentNotice /> : null}
          <div className="max-h-96 overflow-y-auto pr-2">
            <Markdown>{c.bodyMd}</Markdown>
          </div>
          <div className="flex items-start gap-2.5">
            <Checkbox id="li-conduta" checked={read} onCheckedChange={(v) => setRead(v === true)} className="mt-0.5" />
            <Label htmlFor="li-conduta" className="text-ui leading-snug font-medium">
              Li o Código de Conduta e concordo em segui-lo
            </Label>
          </div>
          <Button className="w-fit" disabled={!read || ack.isPending} onClick={() => ack.mutate({ policyId: c.id })}>
            Aceitar política
          </Button>
        </Card>
      )}
    </section>
  );
}

function CertificateStep({ data }: { data: ComplianceData }) {
  const cert = data.certificate;
  if (!cert) return null;
  return (
    <section aria-labelledby="comprovante" className="grid gap-3">
      <SectionHeader id="comprovante" title="Comprovante de treinamento" as="h2" />
      <Card className="gap-3 print:border-0">
        <p className="flex items-center gap-2 text-section font-semibold">
          <BadgeCheck aria-hidden className="size-5 text-ok" />
          Treinamento de compliance concluído
        </p>
        <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          <div>
            <dt className="text-meta text-ink-soft">Participante</dt>
            <dd className="font-medium">{data.person.name}</dd>
          </div>
          <div>
            <dt className="text-meta text-ink-soft">Código</dt>
            <dd className="font-medium tabular-nums">{cert.code}</dd>
          </div>
          <div>
            <dt className="text-meta text-ink-soft">Emitido em</dt>
            <dd className="tabular-nums">{formatDateTime(cert.issuedAt)}</dd>
          </div>
          <div>
            <dt className="text-meta text-ink-soft">Nota e versões</dt>
            <dd className="tabular-nums">
              {cert.score}%, quiz v{cert.quizVersion}, vídeo v{cert.videoVersion}
            </dd>
          </div>
        </dl>
        <Button variant="outline" className="w-fit print:hidden" onClick={() => window.print()}>
          <Printer aria-hidden />
          Imprimir comprovante
        </Button>
      </Card>
    </section>
  );
}

export function ComplianceStage({ data }: { data: ComplianceData }) {
  return (
    <div className="grid gap-10">
      <VideoStep data={data} />
      <QuizStep data={data} />
      <ConductStep data={data} />
      <CertificateStep data={data} />
    </div>
  );
}
