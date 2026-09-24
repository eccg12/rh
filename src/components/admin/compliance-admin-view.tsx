"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { UpdateQuizInputSchema, UpdateVideoInputSchema } from "@/domain/inputs";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { api, type RouterOutputs } from "@/trpc/react";

import { Field } from "./form-bits";

type Compliance = RouterOutputs["admin"]["compliance"];
type Question = Compliance["quiz"]["questions"][number];

let seq = 0;
const newId = () => `q-novo-${Date.now().toString(36)}-${++seq}`;

function friendly(issues: { path: PropertyKey[]; message: string }[]): string {
  const first = issues[0];
  if (!first) return "Revise os campos.";
  if (first.path[0] === "questions" && typeof first.path[1] === "number") return `Pergunta ${first.path[1] + 1}: ${first.message}`;
  return first.message;
}

function VideoForm({ video }: { video: Compliance["video"] }) {
  const refresh = useRefreshAll();
  const ids = { title: useId(), url: useId(), min: useId(), sec: useId(), desc: useId() };
  const [title, setTitle] = useState(video.title);
  const [url, setUrl] = useState(video.url ?? "");
  const [minutes, setMinutes] = useState(String(Math.floor(video.durationSec / 60)));
  const [seconds, setSeconds] = useState(String(video.durationSec % 60));
  const [description, setDescription] = useState(video.description ?? "");
  const [error, setError] = useState<string>();
  const save = api.admin.saveVideo.useMutation({
    onSuccess: async (next) => {
      toast.success("Vídeo salvo", {
        description: next.version !== video.version ? `Versão ${next.version}. As próximas evidências registram a versão nova.` : undefined,
      });
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const submit = () => {
    const durationSec = Number(minutes || 0) * 60 + Number(seconds || 0);
    const parsed = UpdateVideoInputSchema.safeParse({ title, url, durationSec, description: description || undefined });
    if (!parsed.success) {
      setError(friendly(parsed.error.issues));
      return;
    }
    setError(undefined);
    save.mutate(parsed.data);
  };
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field id={ids.title} label="Título">
        <Input id={ids.title} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field id={ids.url} label="Endereço do vídeo" hint="Trocar o endereço cria uma versão nova do vídeo. Sem endereço, a jornada mostra o vídeo como em produção.">
        <Input id={ids.url} type="url" value={url} placeholder="https://" onChange={(e) => setUrl(e.target.value)} aria-describedby={`${ids.url}-ajuda`} />
      </Field>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-ui font-medium">Duração</legend>
        <div className="flex items-center gap-2">
          <Input id={ids.min} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ""))} className="w-20" aria-label="Minutos" />
          <span className="text-ink-soft">min</span>
          <Input id={ids.sec} inputMode="numeric" value={seconds} onChange={(e) => setSeconds(e.target.value.replace(/\D/g, "").slice(0, 2))} className="w-20" aria-label="Segundos" />
          <span className="text-ink-soft">s</span>
        </div>
      </fieldset>
      <Field id={ids.desc} label="Descrição">
        <Textarea id={ids.desc} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      {error ? (
        <p className="text-meta text-stop" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-fit" disabled={save.isPending}>
        Salvar vídeo
      </Button>
    </form>
  );
}

function QuestionEditor({
  index,
  question,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  question: Question;
  onChange: (q: Question) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const base = useId();
  return (
    <Card className="gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Pergunta {index + 1}</h3>
        {canRemove ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 aria-hidden strokeWidth={1.75} />
            Remover pergunta
          </Button>
        ) : null}
      </div>
      <Field id={`${base}-p`} label="Enunciado">
        <Textarea id={`${base}-p`} rows={2} value={question.prompt} onChange={(e) => onChange({ ...question, prompt: e.target.value })} />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-ui font-medium">Opções (marque a correta)</legend>
        <RadioGroup
          value={String(question.correctIndex)}
          onValueChange={(v) => onChange({ ...question, correctIndex: Number(v) })}
          className="flex flex-col gap-2"
          aria-label={`Resposta correta da pergunta ${index + 1}`}
        >
          {question.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <RadioGroupItem value={String(i)} id={`${base}-r${i}`} aria-label={`Opção ${i + 1} é a correta`} />
              <Input
                value={opt}
                aria-label={`Opção ${i + 1}`}
                onChange={(e) => onChange({ ...question, options: question.options.map((o, j) => (j === i ? e.target.value : o)) })}
              />
              {question.options.length > 2 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover opção ${i + 1}`}
                  onClick={() =>
                    onChange({
                      ...question,
                      options: question.options.filter((_, j) => j !== i),
                      correctIndex: question.correctIndex === i ? 0 : question.correctIndex > i ? question.correctIndex - 1 : question.correctIndex,
                    })
                  }
                >
                  <Trash2 aria-hidden strokeWidth={1.75} />
                </Button>
              ) : null}
            </div>
          ))}
        </RadioGroup>
        {question.options.length < 6 ? (
          <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => onChange({ ...question, options: [...question.options, ""] })}>
            <Plus aria-hidden strokeWidth={1.75} />
            Adicionar opção
          </Button>
        ) : null}
      </fieldset>
      <Field id={`${base}-e`} label="Explicação da resposta" hint="Aparece para quem erra, depois da tentativa.">
        <Textarea id={`${base}-e`} rows={2} value={question.explanation} onChange={(e) => onChange({ ...question, explanation: e.target.value })} />
      </Field>
    </Card>
  );
}

function QuizForm({ quiz }: { quiz: Compliance["quiz"] }) {
  const refresh = useRefreshAll();
  const ids = { title: useId(), score: useId(), attempts: useId() };
  const [title, setTitle] = useState(quiz.title);
  const [passingScore, setPassingScore] = useState(String(quiz.passingScore));
  const [maxAttempts, setMaxAttempts] = useState(String(quiz.maxAttempts));
  const [questions, setQuestions] = useState<Question[]>(quiz.questions);
  const [error, setError] = useState<string>();
  const save = api.admin.saveQuiz.useMutation({
    onSuccess: async (next) => {
      toast.success("Quiz salvo", { description: `Versão ${next.version}. As próximas tentativas usam esta versão.` });
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const submit = () => {
    const parsed = UpdateQuizInputSchema.safeParse({
      title,
      passingScore: Number(passingScore),
      maxAttempts: Number(maxAttempts),
      questions,
      isExample: quiz.isExample,
    });
    if (!parsed.success) {
      setError(friendly(parsed.error.issues));
      return;
    }
    setError(undefined);
    save.mutate(parsed.data);
  };
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field id={ids.title} label="Título">
        <Input id={ids.title} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={ids.score} label="Nota mínima (%)">
          <Input id={ids.score} inputMode="numeric" value={passingScore} onChange={(e) => setPassingScore(e.target.value.replace(/\D/g, ""))} className="w-28" />
        </Field>
        <Field id={ids.attempts} label="Tentativas">
          <Input id={ids.attempts} inputMode="numeric" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value.replace(/\D/g, ""))} className="w-28" />
        </Field>
      </div>
      {questions.map((q, i) => (
        <QuestionEditor
          key={q.id}
          index={i}
          question={q}
          canRemove={questions.length > 1}
          onChange={(next) => setQuestions((prev) => prev.map((x) => (x.id === q.id ? next : x)))}
          onRemove={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        className="w-fit"
        onClick={() => setQuestions((prev) => [...prev, { id: newId(), prompt: "", options: ["", ""], correctIndex: 0, explanation: "" }])}
      >
        <Plus aria-hidden strokeWidth={1.75} />
        Adicionar pergunta
      </Button>
      {error ? (
        <p className="text-meta text-stop" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-fit" disabled={save.isPending}>
        Salvar quiz
      </Button>
    </form>
  );
}

export function ComplianceAdminView() {
  const [data] = api.admin.compliance.useSuspenseQuery();
  const s = data.stats;
  return (
    <div className="flex max-w-[760px] flex-col gap-12">
      <p className="text-ink-soft">
        {s.attempts === 0
          ? "Ninguém respondeu o quiz ainda."
          : `${s.attempts} ${s.attempts === 1 ? "tentativa" : "tentativas"} no quiz${s.firstTryPassRate !== undefined ? `, ${s.firstTryPassRate}% aprovados na primeira tentativa` : ""}.`}{" "}
        Cada comprovante registra a versão do vídeo e do quiz.
      </p>
      <section aria-labelledby="video" className="flex flex-col gap-4">
        <SectionHeader id="video" title="Vídeo" description={`Versão ${data.video.version}.`} />
        <VideoForm key={`v${data.video.version}`} video={data.video} />
      </section>
      <section aria-labelledby="quiz" className="flex flex-col gap-4">
        <SectionHeader id="quiz" title="Quiz" description={`Versão ${data.quiz.version}, ${data.quiz.questions.length} perguntas.`} />
        <QuizForm key={`q${data.quiz.version}`} quiz={data.quiz} />
      </section>
    </div>
  );
}
