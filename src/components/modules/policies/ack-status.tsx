import Link from "next/link";

import { StatusBadge } from "@/components/common/status-badge";
import type { MyAck } from "@/domain/services/policy-queries";
import { formatDate } from "@/lib/dates";

/** Selo do meu aceite, com a data ou a indicação da jornada. */
export function AckBadge({ my }: { my: MyAck }) {
  return <StatusBadge kind="ack" status={my.state} />;
}

/** Frase curta sobre o aceite (abaixo do selo ou no detalhe). */
export function AckSentence({ my, version }: { my: MyAck; version: number }) {
  switch (my.state) {
    case "aceita":
      return (
        <>
          Você aceitou a versão {my.ackedVersion ?? version}
          {my.acknowledgedAt ? ` em ${formatDate(my.acknowledgedAt)}` : ""}.
        </>
      );
    case "reaceite":
      return (
        <>
          Você aceitou a versão {my.ackedVersion}. A versão {version} pede um novo aceite.
        </>
      );
    case "pendente":
      return <>Leia e registre o seu aceite.</>;
    case "na_jornada":
      return my.journey?.stageId ? (
        <>
          {my.journey.hint}{" "}
          <Link href={`/onboarding/etapa/${my.journey.stageId}`} className="underline underline-offset-4">
            Abrir a etapa
          </Link>
        </>
      ) : (
        <>{my.journey?.hint}</>
      );
    case "nao_exige":
      return <>Esta política é só para leitura.</>;
  }
}
