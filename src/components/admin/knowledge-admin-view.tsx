"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { KB_CATEGORY_LABELS, KB_CATEGORY_ORDER } from "@/config/knowledge";
import { SaveArticleInputSchema } from "@/domain/inputs";
import type { KbCategory } from "@/domain/schemas";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { useUrlTab } from "@/hooks/use-url-tab";
import { formatDate } from "@/lib/dates";
import { api, type RouterOutputs } from "@/trpc/react";

import { EditorSheet, Field, firstErrors } from "./form-bits";

type Knowledge = RouterOutputs["admin"]["knowledge"];

interface Draft {
  id?: string;
  fromGapId?: string;
  title: string;
  category: KbCategory;
  ownerPersonId?: string;
  summary: string;
  tags: string;
  bodyMd: string;
  isExample: boolean;
}

const NO_OWNER = "sem-responsavel";

function ArticleSheet({ draft, team, onClose }: { draft: Draft; team: Knowledge["team"]; onClose: () => void }) {
  const refresh = useRefreshAll();
  const ids = { title: useId(), category: useId(), owner: useId(), summary: useId(), tags: useId(), body: useId(), example: useId() };
  const [d, setD] = useState(draft);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const save = api.admin.saveArticle.useMutation({
    onSuccess: async (article) => {
      toast.success(draft.fromGapId ? "Artigo criado e lacuna resolvida" : draft.id ? "Artigo salvo" : "Artigo criado", {
        description: `${article.title}. O assistente já responde com o texto novo.`,
      });
      onClose();
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));
  const submit = () => {
    const parsed = SaveArticleInputSchema.safeParse({
      ...d,
      tags: d.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      ownerPersonId: d.ownerPersonId || undefined,
    });
    if (!parsed.success) {
      setErrors(firstErrors(z.flattenError(parsed.error).fieldErrors));
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };
  return (
    <EditorSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={draft.fromGapId ? "Criar artigo a partir da pergunta" : draft.id ? "Editar artigo" : "Novo artigo"}
      description={
        draft.fromGapId
          ? "Ao salvar, a lacuna fica resolvida e a próxima pessoa que perguntar já recebe a resposta."
          : "O assistente passa a usar o artigo assim que você salvar."
      }
      submitLabel={draft.id ? "Salvar artigo" : "Criar artigo"}
      pending={save.isPending}
      onSubmit={submit}
    >
      <Field id={ids.title} label="Título" hint="Escreva como a pessoa perguntaria ou procuraria." error={errors.title}>
        <Input id={ids.title} value={d.title} onChange={(e) => set("title", e.target.value)} aria-invalid={!!errors.title} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={ids.category} label="Categoria">
          <Select value={d.category} onValueChange={(v) => set("category", v as KbCategory)}>
            <SelectTrigger id={ids.category} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {KB_CATEGORY_ORDER.map((c) => (
                <SelectItem key={c} value={c}>
                  {KB_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id={ids.owner} label="Responsável pelo conteúdo">
          <Select value={d.ownerPersonId ?? NO_OWNER} onValueChange={(v) => set("ownerPersonId", v === NO_OWNER ? undefined : v)}>
            <SelectTrigger id={ids.owner} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_OWNER}>Sem responsável</SelectItem>
              {team.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field id={ids.summary} label="Resumo" error={errors.summary}>
        <Textarea id={ids.summary} rows={2} value={d.summary} onChange={(e) => set("summary", e.target.value)} aria-invalid={!!errors.summary} />
      </Field>
      <Field id={ids.tags} label="Palavras-chave" hint="Separadas por vírgula. Ajudam o assistente a achar o artigo.">
        <Input id={ids.tags} value={d.tags} onChange={(e) => set("tags", e.target.value)} aria-describedby={`${ids.tags}-ajuda`} />
      </Field>
      <Field id={ids.body} label="Texto (Markdown)" hint="Comece pela resposta direta. Procedimentos em passos numerados." error={errors.bodyMd}>
        <Textarea id={ids.body} rows={14} value={d.bodyMd} onChange={(e) => set("bodyMd", e.target.value)} aria-invalid={!!errors.bodyMd} />
      </Field>
      <div className="flex items-start gap-2">
        <Checkbox id={ids.example} checked={d.isExample} onCheckedChange={(v) => set("isExample", v === true)} className="mt-0.5" />
        <Label htmlFor={ids.example} className="leading-snug font-normal">
          Conteúdo de exemplo (mostra o aviso &quot;substituir pelo documento oficial&quot;)
        </Label>
      </div>
    </EditorSheet>
  );
}

export function KnowledgeAdminView() {
  const [data] = api.admin.knowledge.useSuspenseQuery();
  const [tab, setTab] = useUrlTab(["artigos", "lacunas"] as const, "artigos");
  const [draft, setDraft] = useState<Draft | null>(null);
  const openGaps = data.gaps.filter((g) => g.status === "aberta").length;

  return (
    <>
      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList aria-label="Base de conhecimento">
          <TabsTrigger value="artigos">Artigos ({data.articles.length})</TabsTrigger>
          <TabsTrigger value="lacunas">Lacunas{openGaps ? ` (${openGaps})` : ""}</TabsTrigger>
        </TabsList>
        <TabsContent value="artigos" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-ink-soft">O assistente responde a partir destes artigos, das políticas vigentes e dos benefícios ativos.</p>
            <Button
              onClick={() =>
                setDraft({ title: "", category: "geral", summary: "", tags: "", bodyMd: "", isExample: false, ownerPersonId: undefined })
              }
            >
              <Plus aria-hidden strokeWidth={1.75} />
              Novo artigo
            </Button>
          </div>
          <div className="rounded-lg border border-rule bg-surface">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Artigo</TableHead>
                  <TableHead scope="col">Categoria</TableHead>
                  <TableHead scope="col">Responsável</TableHead>
                  <TableHead scope="col">Atualizado</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.articles.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="max-w-[360px] py-3 whitespace-normal">
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium">{a.title}</span>
                        <span className="text-meta text-ink-soft">{a.summary}</span>
                        {a.isExample ? <span className="text-meta text-ink-soft">Conteúdo de exemplo</span> : null}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">{a.categoryLabel}</TableCell>
                    <TableCell className="py-3">{a.ownerName ?? "—"}</TableCell>
                    <TableCell className="py-3">{formatDate(a.updatedAt)}</TableCell>
                    <TableCell className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setDraft({
                            id: a.id,
                            title: a.title,
                            category: a.category,
                            ownerPersonId: a.ownerPersonId,
                            summary: a.summary,
                            tags: a.tags.join(", "),
                            bodyMd: a.bodyMd,
                            isExample: a.isExample,
                          })
                        }
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ExampleContentNotice text="Artigos de exemplo mostram o aviso para quem lê, até serem substituídos pelo texto oficial." />
        </TabsContent>
        <TabsContent value="lacunas" className="flex flex-col gap-4">
          <p className="text-ink-soft">
            Perguntas que o assistente encaminhou porque a base não cobria. Criar um artigo a partir da pergunta resolve a lacuna.
          </p>
          {data.gaps.length === 0 ? <p className="text-ink-soft">Nenhuma lacuna registrada.</p> : null}
          <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-surface">
            {data.gaps.map((g) => (
              <li key={g.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-medium">“{g.question}”</p>
                  <p className="text-meta text-ink-soft">
                    Perguntada por {g.askedByName} em {formatDate(g.askedAt)}
                    {g.routedToName ? `, encaminhada para ${g.routedToName}` : ""}.
                  </p>
                  {g.status === "resolvida" && g.resolvedArticleTitle ? (
                    <p className="text-meta">Resolvida com o artigo “{g.resolvedArticleTitle}”.</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-row flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <StatusBadge kind="gap" status={g.status} />
                  {g.status === "aberta" ? (
                    <Button
                      size="sm"
                      onClick={() =>
                        setDraft({
                          fromGapId: g.id,
                          title: g.question.replace(/\?$/, ""),
                          category: g.suggestedCategory,
                          ownerPersonId: g.routedToId,
                          summary: "",
                          tags: "",
                          bodyMd: "",
                          isExample: false,
                        })
                      }
                    >
                      Criar artigo a partir desta pergunta
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
      {draft ? <ArticleSheet key={draft.id ?? draft.fromGapId ?? "novo"} draft={draft} team={data.team} onClose={() => setDraft(null)} /> : null}
    </>
  );
}
