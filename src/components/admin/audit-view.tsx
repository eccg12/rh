"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useId, useState } from "react";

import { AutomatedTag } from "@/components/common/automated-tag";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/dates";
import { plural } from "@/lib/format";
import { api } from "@/trpc/react";

const ALL = "todos";
const PAGE = 100;
type Origin = "manual" | "automatico" | "sistema";

export function AuditView() {
  const ids = { person: useId(), type: useId(), origin: useId() };
  const [personId, setPersonId] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [origin, setOrigin] = useState(ALL);
  const [limit, setLimit] = useState(PAGE);
  const filters = {
    personId: personId === ALL ? undefined : personId,
    type: type === ALL ? undefined : type,
    origin: origin === ALL ? undefined : (origin as Origin),
  };
  const { data, isFetching } = api.admin.audit.useQuery(filters, { placeholderData: keepPreviousData });
  const params = new URLSearchParams(Object.entries(filters).filter((e): e is [string, string] => !!e[1]));
  const resetLimit = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setLimit(PAGE);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.person}>Pessoa</Label>
          <Select value={personId} onValueChange={resetLimit(setPersonId)}>
            <SelectTrigger id={ids.person} className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {data?.people.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.type}>Evento</Label>
          <Select value={type} onValueChange={resetLimit(setType)}>
            <SelectTrigger id={ids.type} className="w-72 max-w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {data?.types.map((t) => (
                <SelectItem key={t.type} value={t.type}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.origin}>Origem</Label>
          <Select value={origin} onValueChange={resetLimit(setOrigin)}>
            <SelectTrigger id={ids.origin} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="automatico">Automático</SelectItem>
              <SelectItem value="sistema">Sistema</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button asChild variant="outline" className="sm:ml-auto">
          <a href={`/api/export/auditoria${params.size ? `?${params.toString()}` : ""}`} download>
            <Download aria-hidden strokeWidth={1.75} />
            Exportar CSV
          </a>
        </Button>
      </div>

      {!data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <p className="text-meta text-ink-soft" aria-live="polite">
            {data.rows.length === data.total
              ? plural(data.total, "evento", "eventos")
              : `${plural(data.rows.length, "evento", "eventos")} de ${data.total}`}
            {isFetching ? ", atualizando…" : ""}. Datas no fuso de São Paulo.
          </p>
          <div className="rounded-lg border border-rule bg-surface">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="w-[150px]">
                    Data e hora
                  </TableHead>
                  <TableHead scope="col">Evento</TableHead>
                  <TableHead scope="col">Pessoa</TableHead>
                  <TableHead scope="col">Quem fez</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.slice(0, limit).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="py-2.5 align-top whitespace-nowrap text-ink-soft">{formatDateTime(r.at)}</TableCell>
                    <TableCell className="max-w-[420px] py-2.5 align-top whitespace-normal">
                      <span className="flex flex-col gap-0.5">
                        <span>{r.title}</span>
                        {r.detail ? <span className="text-meta text-ink-soft">{r.detail}</span> : null}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 align-top">{r.personName ?? "—"}</TableCell>
                    <TableCell className="py-2.5 align-top">
                      {r.origin === "automatico" ? (
                        <span className="flex flex-col items-start gap-1">
                          <AutomatedTag />
                          {r.ruleId ? <span className="text-meta text-ink-soft">Regra {r.ruleId}</span> : null}
                        </span>
                      ) : (
                        r.actorName
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.rows.length > limit ? (
            <Button variant="outline" className="w-fit" onClick={() => setLimit((l) => l + PAGE)}>
              Mostrar mais {Math.min(PAGE, data.rows.length - limit)}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}
