"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, PenLine, Send } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { SectionHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateCaseInputSchema, type CreateCaseInput } from "@/domain/inputs";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { addDaysKey, formatDateLong, formatUntil } from "@/lib/dates";
import { formatPhone } from "@/lib/format";
import { api } from "@/trpc/react";

const NO_PROJECT = "__sem_projeto__";
const JOB_TITLES = ["Analista", "Consultor(a)", "Consultor(a) sênior", "Gerente de projetos"];

function Block({ step, title, description, children }: { step: number; title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-5 border-t border-rule pt-6 first:border-t-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      <SectionHeader title={`${step}. ${title}`} description={description} className="mb-0" />
      {children}
    </fieldset>
  );
}

export function NewCaseForm() {
  const [options] = api.onboarding.formOptions.useSuspenseQuery();
  const router = useRouter();
  const refresh = useRefreshAll();
  const [reviewing, setReviewing] = useState(false);

  const form = useForm<CreateCaseInput>({
    resolver: zodResolver(CreateCaseInputSchema),
    defaultValues: {
      name: "",
      personalEmail: "",
      phone: "",
      regime: "PJ",
      jobTitle: "",
      startDate: addDaysKey(options.today, 14),
      managerId: "",
      initialProjectId: undefined,
      needsNotebook: true,
      contractMode: "modelo",
      contractTemplateId: options.templates.find((t) => t.regimes.includes("PJ"))?.id,
    },
    mode: "onTouched",
  });
  const regime = useWatch({ control: form.control, name: "regime" });
  const contractMode = useWatch({ control: form.control, name: "contractMode" });
  const values = useWatch({ control: form.control });
  const templates = options.templates.filter((t) => t.regimes.includes(regime));

  const create = api.onboarding.create.useMutation({
    onSuccess: async (result) => {
      toast.success(`Cadastro criado. Boas-vindas enviadas para ${result.maskedEmail}`);
      await refresh();
      router.push(`/onboarding/casos/${result.caseId}?aba=linha-do-tempo`);
    },
    onError: (e) => toast.error(e.message),
  });

  const onReview = form.handleSubmit(() => setReviewing(true));
  const onConfirm = form.handleSubmit((data) =>
    create.mutate({ ...data, initialProjectId: data.initialProjectId === NO_PROJECT ? undefined : data.initialProjectId }),
  );

  const manager = options.managers.find((m) => m.id === values.managerId)?.name;
  const project = options.projects.find((p) => p.id === values.initialProjectId);
  const template = options.templates.find((t) => t.id === values.contractTemplateId);

  if (reviewing) {
    const rows: [string, React.ReactNode][] = [
      ["Nome completo", values.name],
      ["E-mail pessoal", values.personalEmail],
      ["Celular", values.phone || "Não informado"],
      ["Regime", values.regime === "CLT" ? "CLT (fluxo em validação com a contabilidade)" : "PJ"],
      ["Cargo", values.jobTitle],
      ["Início", values.startDate ? `${formatDateLong(values.startDate)} (${formatUntil(values.startDate, `${options.today}T12:00:00Z`)})` : "—"],
      ["Gestor", manager ?? "—"],
      ["Projeto inicial", project ? `${project.client} — ${project.name}` : "Sem projeto definido"],
      ["Notebook", values.needsNotebook ? "Precisa de notebook" : "Não precisa"],
      ["Contrato", values.contractMode === "customizado" ? "Contrato customizado (anexo depois)" : (template?.name ?? "—")],
    ];
    return (
      <section aria-labelledby="revisao" className="grid max-w-[720px] gap-6">
        <SectionHeader id="revisao" title="Revise o cadastro" description="Ao cadastrar, a plataforma envia as boas-vindas e libera a ficha e os documentos." className="mb-0" />
        <dl className="divide-y divide-rule border-y border-rule">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[180px_1fr]">
              <dt className="text-meta font-medium text-ink-soft">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onConfirm} disabled={create.isPending}>
            <Send aria-hidden />
            {create.isPending ? "Cadastrando…" : "Cadastrar e enviar boas-vindas"}
          </Button>
          <Button variant="outline" onClick={() => setReviewing(false)} disabled={create.isPending}>
            <PenLine aria-hidden />
            Voltar e editar
          </Button>
        </div>
      </section>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onReview} className="grid max-w-[720px] gap-8" noValidate>
        <Block step={1} title="Pessoa">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome completo</FormLabel>
                <FormControl>
                  <Input autoComplete="off" placeholder="Ana Beatriz Moura" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="personalEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail pessoal</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="off" placeholder="nome@exemplo.com" {...field} />
                  </FormControl>
                  <FormDescription>As boas-vindas vão para este e-mail.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Celular (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="tel"
                      placeholder="(11) 90000-0000"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Block>

        <Block step={2} title="Vínculo">
          <FormField
            control={form.control}
            name="regime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Regime</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      const first = options.templates.find((t) => t.regimes.includes(v as "PJ" | "CLT"));
                      form.setValue("contractTemplateId", first?.id);
                    }}
                    className="flex flex-wrap gap-6"
                  >
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="PJ" /> PJ
                    </label>
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="CLT" /> CLT
                      <Badge variant="outline">Fluxo em validação</Badge>
                    </label>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="jobTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <Input list="cargos" placeholder="Analista" {...field} />
                  </FormControl>
                  <datalist id="cargos">
                    {JOB_TITLES.map((j) => (
                      <option key={j} value={j} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de início</FormLabel>
                  <FormControl>
                    <Input type="date" min={options.today} {...field} />
                  </FormControl>
                  <FormDescription>{field.value ? formatUntil(field.value, `${options.today}T12:00:00Z`) : " "}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="managerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gestor</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha o gestor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.managers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="initialProjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Projeto inicial (opcional)</FormLabel>
                  <Select value={field.value ?? NO_PROJECT} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_PROJECT}>Sem projeto definido</SelectItem>
                      {options.projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.client} — {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Block>

        <Block step={3} title="Preparação">
          <FormField
            control={form.control}
            name="needsNotebook"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precisa de notebook?</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value ? "sim" : "nao"} onValueChange={(v) => field.onChange(v === "sim")} className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="sim" /> Sim
                    </label>
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="nao" /> Não
                    </label>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contractMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contrato</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-3">
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="modelo" /> Usar modelo
                    </label>
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="customizado" /> Contrato customizado (anexo depois)
                    </label>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {contractMode === "modelo" ? (
            <FormField
              control={form.control}
              name="contractTemplateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo de contrato</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um modelo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{templates.find((t) => t.id === field.value)?.description}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </Block>

        <div className="flex flex-wrap gap-2 border-t border-rule pt-6">
          <Button type="submit">Revisar cadastro</Button>
          <Button asChild variant="ghost">
            <Link href="/onboarding">
              <ChevronLeft aria-hidden />
              Cancelar
            </Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
