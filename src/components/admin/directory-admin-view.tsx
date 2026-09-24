"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PersonChip } from "@/components/common/person-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { company } from "@/config/company";
import { KB_CATEGORY_LABELS, KB_CATEGORY_ORDER } from "@/config/knowledge";
import { SaveDirectoryInputSchema } from "@/domain/inputs";
import type { KbCategory } from "@/domain/schemas";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { api, type RouterOutputs } from "@/trpc/react";

import { EditorSheet, Field, firstErrors } from "./form-bits";

type Directory = RouterOutputs["admin"]["directory"];

interface Draft {
  personId: string;
  name: string;
  topics: string;
  categories: KbCategory[];
  channel: string;
  toValidate: boolean;
}

function EntrySheet({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const refresh = useRefreshAll();
  const ids = { topics: useId(), channel: useId(), validate: useId(), cats: useId() };
  const [d, setD] = useState(draft);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const save = api.admin.saveDirectory.useMutation({
    onSuccess: async () => {
      toast.success("Quem é quem atualizado", { description: `${draft.name}. O assistente já encaminha com os temas novos.` });
      onClose();
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const submit = () => {
    const parsed = SaveDirectoryInputSchema.safeParse({
      personId: d.personId,
      topics: d.topics
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
      categories: d.categories,
      channel: d.channel,
      toValidate: d.toValidate,
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
      title={draft.name}
      description="Temas aparecem no primeiro dia e no assistente; as categorias definem para quem o assistente encaminha."
      submitLabel="Salvar"
      pending={save.isPending}
      onSubmit={submit}
    >
      <Field id={ids.topics} label="Temas" hint="Um por linha, do jeito que a pessoa explicaria." error={errors.topics}>
        <Textarea id={ids.topics} rows={5} value={d.topics} onChange={(e) => setD({ ...d, topics: e.target.value })} aria-invalid={!!errors.topics} />
      </Field>
      <fieldset className="min-w-0 flex flex-col gap-2">
        <legend className="mb-1 text-ui font-medium">Categorias da base que a pessoa responde</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {KB_CATEGORY_ORDER.map((c) => {
            const id = `${ids.cats}-${c}`;
            return (
              <div key={c} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={d.categories.includes(c)}
                  onCheckedChange={(v) =>
                    setD({ ...d, categories: v === true ? [...new Set([...d.categories, c])] : d.categories.filter((x) => x !== c) })
                  }
                />
                <Label htmlFor={id} className="font-normal">
                  {KB_CATEGORY_LABELS[c]}
                </Label>
              </div>
            );
          })}
        </div>
      </fieldset>
      <Field id={ids.channel} label="Canal de contato" error={errors.channel}>
        <Input id={ids.channel} value={d.channel} onChange={(e) => setD({ ...d, channel: e.target.value })} aria-invalid={!!errors.channel} />
      </Field>
      <div className="flex items-start gap-2">
        <Checkbox id={ids.validate} checked={d.toValidate} onCheckedChange={(v) => setD({ ...d, toValidate: v === true })} className="mt-0.5" />
        <Label htmlFor={ids.validate} className="leading-snug font-normal">
          A validar com a pessoa
        </Label>
      </div>
    </EditorSheet>
  );
}

export function DirectoryAdminView() {
  const [data] = api.admin.directory.useSuspenseQuery();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [adding, setAdding] = useState("");
  const selectId = useId();
  const edit = (e: Directory["entries"][number]) =>
    setDraft({ personId: e.personId, name: e.name, topics: e.topics.join("\n"), categories: e.categories, channel: e.channel, toValidate: e.toValidate });

  return (
    <div className="flex max-w-[860px] flex-col gap-6">
      <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-surface">
        {data.entries.map((e) => (
          <li key={e.personId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-col gap-2">
              <span className="flex flex-wrap items-center gap-2">
                <PersonChip name={e.name} />
                {e.toValidate ? <Badge variant="outline">A validar</Badge> : null}
              </span>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-meta">
                <dt className="text-ink-soft">Temas</dt>
                <dd>{e.topics.join(", ")}</dd>
                <dt className="text-ink-soft">Responde por</dt>
                <dd>{e.categories.length ? e.categories.map((c) => KB_CATEGORY_LABELS[c]).join(", ") : "Nenhuma categoria"}</dd>
                <dt className="text-ink-soft">Canal</dt>
                <dd>{e.channel}</dd>
              </dl>
            </div>
            <Button variant="outline" size="sm" className="w-fit shrink-0" onClick={() => edit(e)}>
              Editar
            </Button>
          </li>
        ))}
      </ul>
      {data.candidates.length > 0 ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={selectId}>Adicionar pessoa</Label>
            <Select value={adding} onValueChange={setAdding}>
              <SelectTrigger id={selectId} className="w-72 max-w-full">
                <SelectValue placeholder="Escolha a pessoa" />
              </SelectTrigger>
              <SelectContent>
                {data.candidates.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            disabled={!adding}
            onClick={() => {
              const person = data.candidates.find((p) => p.id === adding);
              if (!person) return;
              setDraft({ personId: person.id, name: person.name, topics: "", categories: [], channel: company.defaultChannel, toValidate: true });
              setAdding("");
            }}
          >
            <Plus aria-hidden strokeWidth={1.75} />
            Adicionar
          </Button>
        </div>
      ) : null}
      {draft ? <EntrySheet key={draft.personId} draft={draft} onClose={() => setDraft(null)} /> : null}
    </div>
  );
}
