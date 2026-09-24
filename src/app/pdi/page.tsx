import { Sprout } from "lucide-react";

import { ComingSoon } from "@/components/common/coming-soon";
import { Forbidden } from "@/components/shell/forbidden";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { guardModule } from "@/server/guard";

export const metadata = { title: "PDI" };

const PREVIEW = [
  { competencia: "Estruturação de problemas", nivel: "Consolidar", meta: "Liderar a árvore de hipóteses de uma frente do projeto" },
  { competencia: "Modelagem e análise de dados", nivel: "Desenvolver", meta: "Construir o modelo de capacidade do diagnóstico" },
  { competencia: "Comunicação com cliente", nivel: "Desenvolver", meta: "Conduzir a reunião semanal de status com o cliente" },
];

/** PDI (seção 9.9): em breve, com a estrutura prevista e uma prévia estática marcada "Exemplo". */
export default async function PdiPage() {
  const { allowed } = await guardModule("pdi");
  if (!allowed) return <Forbidden area="O PDI" />;

  return (
    <>
      <PageHeader title="PDI" description="Plano de desenvolvimento individual." />
      <ComingSoon
        icon={Sprout}
        title="Plano de desenvolvimento individual"
        description="O PDI entra depois de definirmos a metodologia. A estrutura prevista:"
        items={[
          { title: "Competências por cargo", detail: "O que se espera de cada nível, de analista a gerente." },
          { title: "Metas do ciclo", detail: "Poucas metas, ligadas ao projeto e ao próximo nível." },
          { title: "Check-ins com o gestor", detail: "Conversas curtas e registradas ao longo do ciclo." },
          { title: "Trilha de desenvolvimento", detail: "Cursos, leituras e experiências em projeto." },
        ]}
      >
        <div aria-label="Prévia de exemplo, sem interação" className="flex flex-col gap-3 rounded-lg border border-dashed border-control p-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Exemplo</Badge>
            <span className="text-meta text-ink-soft">Prévia estática: nada aqui é salvo.</span>
          </div>
          <table className="w-full text-ui">
            <thead>
              <tr className="border-b border-rule text-left text-meta text-ink-soft">
                <th className="py-2 pr-3 font-semibold">Competência</th>
                <th className="py-2 pr-3 font-semibold">Foco</th>
                <th className="py-2 font-semibold">Meta do ciclo</th>
              </tr>
            </thead>
            <tbody>
              {PREVIEW.map((row) => (
                <tr key={row.competencia} className="border-b border-rule last:border-0">
                  <td className="py-2.5 pr-3 font-medium">{row.competencia}</td>
                  <td className="py-2.5 pr-3">{row.nivel}</td>
                  <td className="py-2.5 text-ink-soft">{row.meta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ComingSoon>
    </>
  );
}
