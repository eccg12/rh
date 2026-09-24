"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PersonChip } from "@/components/common/person-chip";
import { StatusBadge } from "@/components/common/status-badge";
import { SectionHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewEquipmentInputSchema } from "@/domain/inputs";
import type { EquipmentType } from "@/domain/schemas";
import { EQUIPMENT_TYPE_LABELS } from "@/domain/equipment";
import type { Inventory, InventoryItem } from "@/domain/services/equipment-queries";
import { useRefreshAll } from "@/hooks/use-refresh-all";
import { formatDate } from "@/lib/dates";
import { plural } from "@/lib/format";
import { api } from "@/trpc/react";

const TYPES = Object.keys(EQUIPMENT_TYPE_LABELS) as EquipmentType[];

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-meta text-stop">
      {message}
    </p>
  ) : null;
}

function RegisterDialog({ models }: { models: string[] }) {
  const refresh = useRefreshAll();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<EquipmentType>("notebook");
  const [model, setModel] = useState("");
  const [serial, setSerial] = useState("");
  const [assetTag, setAssetTag] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const suggestion = api.equipment.suggestAssetTag.useQuery({ type }, { enabled: open });
  const tag = assetTag ?? suggestion.data ?? "";
  const ids = { type: useId(), model: useId(), serial: useId(), tag: useId(), list: useId() };

  const register = api.equipment.register.useMutation({
    onSuccess: async (item) => {
      toast.success("Equipamento cadastrado", { description: `${item.assetTag}, ${item.model}. Já aparece como disponível.` });
      setOpen(false);
      setModel("");
      setSerial("");
      setAssetTag(null);
      setErrors({});
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    const parsed = NewEquipmentInputSchema.safeParse({ type, model, serial, assetTag: tag });
    if (!parsed.success) {
      const { fieldErrors } = z.flattenError(parsed.error);
      setErrors({ model: fieldErrors.model?.[0], serial: fieldErrors.serial?.[0], assetTag: fieldErrors.assetTag?.[0] });
      return;
    }
    setErrors({});
    register.mutate(parsed.data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden strokeWidth={1.75} />
          Cadastrar equipamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar equipamento</DialogTitle>
          <DialogDescription>O equipamento entra no inventário como disponível para atribuir.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.type}>Tipo</Label>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as EquipmentType);
                setAssetTag(null);
              }}
            >
              <SelectTrigger id={ids.type} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {EQUIPMENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.model}>Modelo</Label>
            <Input
              id={ids.model}
              list={ids.list}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              aria-invalid={!!errors.model}
              aria-describedby={errors.model ? `${ids.model}-erro` : undefined}
            />
            <datalist id={ids.list}>
              {models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <FieldError id={`${ids.model}-erro`} message={errors.model} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.serial}>Número de série</Label>
              <Input
                id={ids.serial}
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                aria-invalid={!!errors.serial}
                aria-describedby={errors.serial ? `${ids.serial}-erro` : undefined}
              />
              <FieldError id={`${ids.serial}-erro`} message={errors.serial} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={ids.tag}>Patrimônio</Label>
              <Input
                id={ids.tag}
                value={tag}
                onChange={(e) => setAssetTag(e.target.value)}
                aria-invalid={!!errors.assetTag}
                aria-describedby={`${ids.tag}-ajuda`}
              />
              <p id={`${ids.tag}-ajuda`} className="text-meta text-ink-soft">
                Sugerido pela sequência do inventário.
              </p>
              <FieldError id={`${ids.tag}-erro`} message={errors.assetTag} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={register.isPending}>
              Cadastrar equipamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({ item, people }: { item: InventoryItem; people: Inventory["people"] }) {
  const refresh = useRefreshAll();
  const [open, setOpen] = useState(false);
  const [personId, setPersonId] = useState("");
  const selectId = useId();
  const person = people.find((p) => p.id === personId);
  const assign = api.equipment.assign.useMutation({
    onSuccess: async () => {
      const inOnboarding = person?.detail === "Em onboarding";
      toast.success("Equipamento atribuído", {
        description:
          item.termRequired && inOnboarding
            ? "O termo de responsabilidade saiu automaticamente por e-mail."
            : item.termRequired
              ? `O termo aparece para ${person?.name ?? "a pessoa"} aceitar em Equipamentos e acessos.`
              : `${item.assetTag} agora está com ${person?.name ?? "a pessoa"}.`,
      });
      setOpen(false);
      setPersonId("");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Atribuir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir {item.assetTag}</DialogTitle>
          <DialogDescription>
            {item.name}, série {item.serial}.
            {item.termRequired ? " A pessoa recebe o termo de responsabilidade para aceitar." : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={selectId}>Pessoa</Label>
          <Select value={personId} onValueChange={setPersonId}>
            <SelectTrigger id={selectId} className="w-full">
              <SelectValue placeholder="Escolha a pessoa" />
            </SelectTrigger>
            <SelectContent>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.detail ? ` (${p.detail.toLowerCase()})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            disabled={!personId || assign.isPending}
            onClick={() => assign.mutate({ equipmentId: item.id, personId })}
          >
            Atribuir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TermCell({ item }: { item: InventoryItem }) {
  if (item.status !== "em_uso") return <span className="text-ink-soft">—</span>;
  if (item.termAcceptedAt) {
    return (
      <span className="flex flex-col items-start gap-1">
        <StatusBadge kind="ack" status="aceita" label="Aceito" />
        <span className="text-meta text-ink-soft">em {formatDate(item.termAcceptedAt)}</span>
      </span>
    );
  }
  if (!item.termRequired) return <span className="text-meta text-ink-soft">Não exige</span>;
  return <StatusBadge kind="ack" status="pendente" label="Pendente" />;
}

export function EquipmentRhView() {
  const [data] = api.equipment.inventory.useSuspenseQuery();
  const refresh = useRefreshAll();
  const grant = api.equipment.grantAccess.useMutation({
    onSuccess: async () => {
      toast.success("Acesso liberado");
      await refresh();
    },
    onError: (e) => toast.error(e.message),
  });
  const c = data.counts;
  const models = [...new Set(data.items.map((i) => i.model))].sort();
  const pendingGrants = data.pendingAccess.reduce((sum, g) => sum + g.grants.length, 0);
  const waiting = data.waitingContract.length;

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="inventario" className="flex flex-col gap-4">
        <SectionHeader
          id="inventario"
          title="Inventário"
          description={`${plural(c.total, "equipamento")}: ${plural(c.disponivel, "disponível", "disponíveis")}, ${c.emUso} em uso e ${c.manutencao} em manutenção.${
            c.termoPendente > 0 ? ` ${plural(c.termoPendente, "termo pendente", "termos pendentes")}.` : ""
          }`}
          actions={<RegisterDialog models={models} />}
        />
        <div className="rounded-lg border border-rule bg-surface">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Patrimônio</TableHead>
                <TableHead scope="col">Tipo</TableHead>
                <TableHead scope="col">Modelo</TableHead>
                <TableHead scope="col">Série</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Com quem</TableHead>
                <TableHead scope="col">Termo</TableHead>
                <TableHead scope="col">
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="py-3 font-medium whitespace-nowrap">{item.assetTag}</TableCell>
                  <TableCell className="py-3">{item.typeLabel}</TableCell>
                  <TableCell className="py-3 whitespace-normal">{item.model}</TableCell>
                  <TableCell className="py-3 whitespace-nowrap text-ink-soft">{item.serial}</TableCell>
                  <TableCell className="py-3">
                    <span className="flex flex-col items-start gap-1">
                      <StatusBadge kind="equipment" status={item.status} />
                      {item.notes ? <span className="max-w-[200px] text-meta whitespace-normal text-ink-soft">{item.notes}</span> : null}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    {item.assignee ? (
                      <span className="flex flex-col">
                        <span>{item.assignee.name}</span>
                        {item.assignedAt ? <span className="text-meta text-ink-soft">desde {formatDate(item.assignedAt)}</span> : null}
                      </span>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    <TermCell item={item} />
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    {item.status === "disponivel" ? <AssignDialog item={item} people={data.people} /> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section aria-labelledby="acessos-pendentes" className="flex max-w-[860px] flex-col gap-4">
        <SectionHeader
          id="acessos-pendentes"
          title="Acessos pendentes"
          description={
            pendingGrants === 0 && waiting === 0
              ? "Nenhum acesso pendente. Os próximos aparecem aqui quando alguém entrar."
              : pendingGrants === 0
                ? "Nenhum acesso para liberar agora."
                : `${plural(pendingGrants, "acesso", "acessos")} para liberar agora, por pessoa.`
          }
        />
        {data.pendingAccess.map((group) => (
          <div key={group.person.id} className="flex flex-col gap-2 rounded-lg border border-rule bg-surface p-4">
            <PersonChip name={group.person.name} subtitle={group.person.detail} />
            <ul className="flex flex-col divide-y divide-rule">
              {group.grants.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span className="flex flex-col">
                    <span className="font-medium">{g.system}</span>
                    <span className="text-meta text-ink-soft">Responsável: {g.ownerLabel}</span>
                  </span>
                  <Button size="sm" variant="outline" disabled={grant.isPending} onClick={() => grant.mutate({ grantId: g.id })}>
                    Marcar como liberado
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {data.waitingContract.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">Aguardando a assinatura do contrato</h3>
            <p className="text-meta text-ink-soft">Os acessos destas pessoas ficam disponíveis para liberar depois do contrato.</p>
            <ul className="flex flex-col divide-y divide-rule border-y border-rule">
              {data.waitingContract.map((w) => (
                <li key={w.person.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:gap-3">
                  <span className="font-medium">{w.person.name}</span>
                  <span className="text-meta text-ink-soft">{w.systems.join(", ")}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
