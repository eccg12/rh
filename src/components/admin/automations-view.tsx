"use client";

import { Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDateTime } from "@/lib/dates";
import { plural } from "@/lib/format";
import { api } from "@/trpc/react";

export function AutomationsView() {
  const [rules] = api.admin.automations.useSuspenseQuery();
  const refresh = useRefreshAll();
  // O interruptor muda na hora; o dado do servidor confirma logo depois.
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const toggle = api.admin.setRuleEnabled.useMutation({
    onMutate: (input) => setOptimistic((prev) => ({ ...prev, [input.ruleId]: input.enabled })),
    onSettled: (_, __, input) =>
      setOptimistic((prev) => {
        const next = { ...prev };
        delete next[input.ruleId];
        return next;
      }),
    onSuccess: async (_, input) => {
      const rule = rules.find((r) => r.id === input.ruleId);
      toast.success(input.enabled ? "Regra ligada" : "Regra desligada", {
        description: rule
          ? input.enabled
            ? `${rule.id} ${rule.name} volta a disparar.`
            : `${rule.id} ${rule.name} não dispara mais até ser ligada.`
          : undefined,
      });
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const isOn = (r: (typeof rules)[number]) => optimistic[r.id] ?? r.enabled;
  const enabled = rules.filter(isOn).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-ink-soft">
        {enabled} de {rules.length} regras ligadas. Regra desligada não envia aviso nem cria tarefa; o que ela já fez continua
        registrado.
      </p>
      <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule bg-surface">
        {rules.map((rule) => {
          const switchId = `regra-${rule.id}`;
          return (
            <li key={rule.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
              <div className="flex min-w-0 flex-col gap-1.5">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Zap aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
                  <span>
                    {rule.id} {rule.name}
                  </span>
                </h2>
                <p>{rule.description}</p>
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-meta">
                  <dt className="text-ink-soft">Quando</dt>
                  <dd>
                    {rule.trigger}
                    {rule.condition ? `. ${rule.condition}` : ""}
                  </dd>
                  <dt className="text-ink-soft">Para</dt>
                  <dd>{rule.audience}</dd>
                  <dt className="text-ink-soft">Faz</dt>
                  <dd>
                    <ul className="flex flex-col gap-0.5">
                      {rule.actions.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </dd>
                </dl>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <div className="flex items-center gap-2">
                  <Switch
                    id={switchId}
                    checked={isOn(rule)}
                    disabled={toggle.isPending}
                    onCheckedChange={(checked) => toggle.mutate({ ruleId: rule.id, enabled: checked })}
                  />
                  <label htmlFor={switchId} className="min-w-[5.5rem] font-medium">
                    {isOn(rule) ? "Ligada" : "Desligada"}
                  </label>
                </div>
                <p className="text-meta text-ink-soft sm:text-right">
                  {rule.firings === 0 ? "Ainda não disparou" : plural(rule.firings, "disparo", "disparos")}
                  {rule.lastFiring ? (
                    <>
                      <br />
                      Último em {formatDateTime(rule.lastFiring.at)}
                      {rule.lastFiring.who ? `, ${rule.lastFiring.who}` : ""}
                    </>
                  ) : null}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
