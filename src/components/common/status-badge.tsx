import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Clock,
  Hand,
  Hourglass,
  Lock,
  PenLine,
  RefreshCw,
  Route,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Variant = "ok" | "stop" | "signal" | "muted" | "outline" | "secondary";

interface StatusDef {
  label: string;
  icon: LucideIcon;
  variant: Variant;
}

/** Vocabulário de status (docs/DESIGN.md, seção 7): sempre ícone + rótulo, nunca só cor. */
const STATUS: Record<string, Record<string, StatusDef>> = {
  task: {
    bloqueada: { label: "Bloqueada", icon: Lock, variant: "muted" },
    disponivel: { label: "Disponível", icon: CircleDot, variant: "outline" },
    em_andamento: { label: "Em andamento", icon: CircleDashed, variant: "outline" },
    aguardando_revisao: { label: "Aguardando revisão", icon: Hourglass, variant: "muted" },
    concluida: { label: "Concluída", icon: CircleCheck, variant: "ok" },
    dispensada: { label: "Não se aplica", icon: Ban, variant: "muted" },
    depende_de_voce: { label: "Depende de você", icon: Hand, variant: "signal" },
    atrasada: { label: "Atrasada", icon: CircleAlert, variant: "stop" },
  },
  document: {
    nao_enviado: { label: "Não enviado", icon: CircleDashed, variant: "muted" },
    enviado: { label: "Aguardando revisão", icon: Hourglass, variant: "outline" },
    aprovado: { label: "Aprovado", icon: CircleCheck, variant: "ok" },
    rejeitado: { label: "Rejeitado", icon: CircleX, variant: "stop" },
  },
  contract: {
    nao_iniciado: { label: "Não iniciado", icon: CircleDashed, variant: "muted" },
    rascunho: { label: "Em preparação", icon: PenLine, variant: "outline" },
    enviado: { label: "Aguardando assinatura", icon: Hourglass, variant: "outline" },
    assinado: { label: "Assinado", icon: CircleCheck, variant: "ok" },
    recusado: { label: "Recusado", icon: CircleX, variant: "stop" },
  },
  access: {
    pendente: { label: "Pendente", icon: Clock, variant: "muted" },
    liberado: { label: "Liberado", icon: CircleCheck, variant: "ok" },
    revogado: { label: "Revogado", icon: Ban, variant: "stop" },
  },
  ack: {
    aceita: { label: "Aceita", icon: CircleCheck, variant: "ok" },
    pendente: { label: "Aceite pendente", icon: Hand, variant: "signal" },
    reaceite: { label: "Nova versão para aceitar", icon: RefreshCw, variant: "signal" },
    na_jornada: { label: "Na jornada", icon: Route, variant: "muted" },
    nao_exige: { label: "Leitura", icon: CircleDot, variant: "muted" },
  },
  equipment: {
    disponivel: { label: "Disponível", icon: CircleDot, variant: "outline" },
    em_uso: { label: "Em uso", icon: CircleCheck, variant: "ok" },
    manutencao: { label: "Em manutenção", icon: Wrench, variant: "muted" },
  },
  case: {
    em_andamento: { label: "Em andamento", icon: CircleDashed, variant: "outline" },
    concluido: { label: "Concluído", icon: CircleCheck, variant: "ok" },
    cancelado: { label: "Cancelado", icon: Ban, variant: "muted" },
  },
  timesheet: {
    rascunho: { label: "Rascunho", icon: PenLine, variant: "muted" },
    enviado: { label: "Enviada", icon: CircleCheck, variant: "ok" },
    sem_apontamento: { label: "Sem apontamento", icon: CircleDashed, variant: "muted" },
  },
  gap: {
    aberta: { label: "Aberta", icon: CircleDot, variant: "outline" },
    resolvida: { label: "Resolvida", icon: CircleCheck, variant: "ok" },
  },
};

export type StatusKind = keyof typeof STATUS;

export function StatusBadge({
  kind,
  status,
  label,
  className,
}: {
  kind: StatusKind;
  status: string;
  /** Sobrescreve o rótulo mantendo ícone e cor (ex.: "Com você"). */
  label?: string;
  className?: string;
}) {
  const def = STATUS[kind]?.[status] ?? { label: status, icon: CircleDot, variant: "muted" as const };
  const Icon = def.icon;
  return (
    <Badge variant={def.variant} className={cn("gap-1", className)}>
      <Icon aria-hidden strokeWidth={2} />
      {label ?? def.label}
    </Badge>
  );
}
