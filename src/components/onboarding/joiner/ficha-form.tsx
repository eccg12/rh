"use client";

import { Lock, Plus, Save, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control, type FieldErrors, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { DemoShortcut } from "@/components/common/demo-only";
import { ExampleContentNotice } from "@/components/common/example-content-notice";
import { Markdown } from "@/components/common/markdown";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isFieldVisible, validateForm, type FormValues } from "@/domain/forms";
import type { FieldDef, FormSchema, Policy } from "@/domain/schemas";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatTime } from "@/lib/dates";
import { formatCep, formatCnpj, formatCpf, formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

type Values = Record<string, unknown>;

const MASK: Partial<Record<FieldDef["type"], (v: string) => string>> = {
  cpf: formatCpf,
  cnpj: formatCnpj,
  cep: formatCep,
  tel: formatPhone,
};

function withMasks(schema: FormSchema, values: Values): Values {
  const out: Values = { ...values };
  for (const f of schema.sections.flatMap((s) => s.fields)) {
    const mask = MASK[f.type];
    if (mask && typeof out[f.id] === "string") out[f.id] = mask(out[f.id] as string);
  }
  return out;
}

function makeResolver(schema: FormSchema): Resolver<Values> {
  return async (values) => {
    const errors = validateForm(schema, values as FormValues);
    if (Object.keys(errors).length === 0) return { values, errors: {} };
    const rhf: FieldErrors<Values> = {};
    for (const [k, message] of Object.entries(errors)) rhf[k] = { type: "validate", message };
    return { values: {}, errors: rhf };
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-erro`} role="alert" className="text-meta text-stop">
      {message}
    </p>
  );
}

function FieldInput({ field, control, name, error }: { field: FieldDef; control: Control<Values>; name: string; error?: string }) {
  const id = `campo-${name.replace(/\./g, "-")}`;
  const described = [field.helpText ? `${id}-ajuda` : null, error ? `${id}-erro` : null].filter(Boolean).join(" ") || undefined;
  const label = (
    <Label htmlFor={id} className="flex items-center gap-1.5">
      {field.label}
      {!field.required ? <span className="font-normal text-ink-soft">(opcional)</span> : null}
      {field.sensitive ? <Lock aria-label="Dado sensível: só o RH vê" className="size-3.5 text-ink-soft" /> : null}
    </Label>
  );
  const help = field.helpText ? (
    <p id={`${id}-ajuda`} className="text-meta text-ink-soft">
      {field.helpText}
    </p>
  ) : null;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: rhf }) => {
        const value = rhf.value;
        if (field.type === "checkbox") {
          return (
            <div className="grid grid-cols-1 gap-1.5 sm:col-span-2">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id={id}
                  checked={value === true}
                  onCheckedChange={(v) => rhf.onChange(v === true)}
                  aria-invalid={!!error}
                  aria-describedby={described}
                  className="mt-0.5"
                />
                <Label htmlFor={id} className="text-ui leading-snug font-medium">
                  {field.label}
                </Label>
              </div>
              {help}
              <FieldError id={id} message={error} />
            </div>
          );
        }
        if (field.type === "radio") {
          return (
            <div className="grid grid-cols-1 gap-2 sm:col-span-2">
              <span id={`${id}-rotulo`} className="text-meta font-medium">
                {field.label}
              </span>
              <RadioGroup
                value={typeof value === "string" ? value : ""}
                onValueChange={rhf.onChange}
                aria-labelledby={`${id}-rotulo`}
                aria-invalid={!!error}
                className="flex flex-wrap gap-x-6 gap-y-2"
              >
                {field.options?.map((o) => (
                  <label key={o} className="flex items-center gap-2">
                    <RadioGroupItem value={o} /> {o}
                  </label>
                ))}
              </RadioGroup>
              {help}
              <FieldError id={id} message={error} />
            </div>
          );
        }
        if (field.type === "select") {
          return (
            <div className="grid grid-cols-1 gap-1.5">
              {label}
              <Select value={typeof value === "string" ? value : ""} onValueChange={rhf.onChange}>
                <SelectTrigger id={id} aria-invalid={!!error} aria-describedby={described}>
                  <SelectValue placeholder="Escolha" />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {help}
              <FieldError id={id} message={error} />
            </div>
          );
        }
        if (field.type === "textarea") {
          return (
            <div className="grid grid-cols-1 gap-1.5 sm:col-span-2">
              {label}
              <Textarea id={id} value={typeof value === "string" ? value : ""} onChange={rhf.onChange} onBlur={rhf.onBlur} aria-invalid={!!error} aria-describedby={described} />
              {help}
              <FieldError id={id} message={error} />
            </div>
          );
        }
        const mask = MASK[field.type];
        return (
          <div className="grid grid-cols-1 gap-1.5">
            {label}
            <Input
              id={id}
              type={field.type === "email" ? "email" : field.type === "date" ? "date" : "text"}
              inputMode={field.type === "tel" || field.type === "cpf" || field.type === "cnpj" || field.type === "cep" ? "numeric" : undefined}
              autoComplete="off"
              placeholder={field.placeholder}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => rhf.onChange(mask ? mask(e.target.value) : e.target.value)}
              onBlur={rhf.onBlur}
              aria-invalid={!!error}
              aria-describedby={described}
            />
            {help}
            <FieldError id={id} message={error} />
          </div>
        );
      }}
    />
  );
}

function Repeater({ field, control, error }: { field: FieldDef; control: Control<Values>; error?: string }) {
  const { fields, append, remove } = useFieldArray({ control, name: field.id as never });
  const blank = Object.fromEntries((field.fields ?? []).map((f) => [f.id, ""]));
  return (
    <div className="grid grid-cols-1 gap-3 sm:col-span-2">
      {fields.length === 0 ? <p className="text-ink-soft">Nenhum dependente adicionado.</p> : null}
      {fields.map((item, index) => (
        <fieldset key={item.id} className="grid grid-cols-1 gap-4 rounded-lg border border-rule bg-surface p-4 sm:grid-cols-2">
          <legend className="px-1 text-meta font-semibold">Dependente {index + 1}</legend>
          {(field.fields ?? []).map((sub) => (
            <FieldInput key={sub.id} field={sub} control={control} name={`${field.id}.${index}.${sub.id}`} />
          ))}
          <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => remove(index)}>
            <Trash2 aria-hidden />
            Remover
          </Button>
        </fieldset>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => append(blank as never)}>
        <Plus aria-hidden />
        Adicionar dependente
      </Button>
      {error ? <p className="text-meta text-stop">{error}</p> : null}
    </div>
  );
}

export function FichaForm({
  schema,
  initialValues,
  updatedAt,
  privacyNotice,
}: {
  schema: FormSchema;
  initialValues: Values;
  updatedAt?: string;
  privacyNotice: Policy | null;
}) {
  const refresh = useRefreshAll();
  const utils = api.useUtils();
  const resolver = useMemo(() => makeResolver(schema), [schema]);
  const form = useForm<Values>({ defaultValues: withMasks(schema, initialValues), resolver, mode: "onSubmit" });
  const values = useWatch({ control: form.control }) as Values;
  const [savedAt, setSavedAt] = useState<string | undefined>(updatedAt);
  const firstRender = useRef(true);

  const saveDraft = api.onboarding.saveDraft.useMutation({
    onSuccess: () => setSavedAt(new Date().toISOString()),
  });
  const submit = api.onboarding.submitForm.useMutation({
    onSuccess: async () => {
      toast.success("Ficha enviada", { description: "Seus dados foram para o RH." });
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  // Rascunho automático: salva 1,5 s depois da última alteração.
  const serialized = JSON.stringify(values);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => saveDraft.mutate({ values: JSON.parse(serialized) as Values }), 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  const fillExample = async () => {
    const sample = await utils.onboarding.sampleValues.fetch();
    form.reset(withMasks(schema, sample));
    toast.success("Ficha preenchida com dados de exemplo", { description: "Confira e clique em Enviar ficha." });
  };

  const onSubmit = form.handleSubmit(
    (data) => submit.mutate({ values: data }),
    (errors) => {
      const first = Object.keys(errors)[0];
      toast.error("Confira os campos destacados antes de enviar.");
      if (first) document.getElementById(`campo-${first}`)?.focus();
    },
  );
  const errorOf = (id: string) => (form.formState.errors[id]?.message as string | undefined) ?? undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <DemoShortcut onClick={() => void fillExample()}>Preencher com dados de exemplo</DemoShortcut>
        <span className="flex items-center gap-1.5 text-meta text-ink-soft" aria-live="polite">
          <Save aria-hidden className="size-3.5" />
          {saveDraft.isPending ? "Salvando rascunho…" : savedAt ? `Rascunho salvo às ${formatTime(savedAt)}` : "O rascunho é salvo sozinho."}
        </span>
      </div>
      {schema.note ? <p className="rounded-md border border-dashed border-control px-3 py-2 text-meta text-ink-soft">{schema.note}</p> : null}

      {schema.sections.map((section) => (
        <fieldset key={section.id} className="grid grid-cols-1 gap-4">
          <legend className="mb-1 text-section font-semibold">{section.title}</legend>
          {section.description ? <p className="-mt-2 text-ink-soft">{section.description}</p> : null}
          {section.id === "privacidade" && privacyNotice ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="link" className="h-auto w-fit px-0">
                  Ler o Aviso de Privacidade
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{privacyNotice.title}</DialogTitle>
                  <DialogDescription>Versão {privacyNotice.version}</DialogDescription>
                </DialogHeader>
                {privacyNotice.isExample ? <ExampleContentNotice /> : null}
                <Markdown>{privacyNotice.bodyMd}</Markdown>
              </DialogContent>
            </Dialog>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {section.fields
              .filter((f) => isFieldVisible(f, values))
              .map((f) =>
                f.type === "repeater" ? (
                  <Repeater key={f.id} field={f} control={form.control} error={errorOf(f.id)} />
                ) : (
                  <FieldInput key={f.id} field={f} control={form.control} name={f.id} error={errorOf(f.id)} />
                ),
              )}
          </div>
        </fieldset>
      ))}

      <div className={cn("flex flex-wrap items-center gap-3 border-t border-rule pt-4 sm:sticky sm:bottom-0 sm:-mx-4 sm:bg-paper/95 sm:px-4 sm:py-3 sm:backdrop-blur")}>
        <Button type="submit" size="lg" disabled={submit.isPending}>
          <Send aria-hidden />
          {submit.isPending ? "Enviando…" : "Enviar ficha"}
        </Button>
        <span className="text-meta text-ink-soft">Seus dados ficam só com o RH.</span>
      </div>
    </form>
  );
}

