import { Download, ShieldCheck } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CaseDetail } from "@/domain/services/case-queries";
import { formatDateTime } from "@/lib/dates";

export function CaseEvidenceTab({ data }: { data: CaseDetail }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[64ch] text-ink-soft">
          Quiz com versões, aceites de políticas, termo do notebook e assinatura do contrato. Datas no fuso de São Paulo.
        </p>
        <Button asChild variant="outline">
          <a href={`/api/export/evidencias/${data.case.id}`} download>
            <Download aria-hidden />
            Exportar CSV
          </a>
        </Button>
      </div>
      {data.evidences.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nenhuma evidência ainda" description="Aceites, quiz e assinaturas aparecem aqui assim que acontecem." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Detalhe</TableHead>
              <TableHead>Versão</TableHead>
              <TableHead>Data e hora</TableHead>
              <TableHead>Origem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.evidences.map((e, i) => (
              <TableRow key={`${e.at}-${i}`}>
                <TableCell className="font-medium">{e.event}</TableCell>
                <TableCell className="max-w-72 text-ink-soft">{e.detail}</TableCell>
                <TableCell className="whitespace-nowrap">{e.version}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{formatDateTime(e.at)}</TableCell>
                <TableCell>
                  <Badge variant={e.origin === "automática" ? "secondary" : "outline"}>{e.origin}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
