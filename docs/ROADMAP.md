# Roadmap pós-demo — Monoda People

Prazos indicativos, a confirmar depois da demo (seção 16 do plano).

## Onde a Fase 0 deixa o produto

- Demo navegável completa, sem dependências externas: estado em memória, e-mail, assinatura,
  armazenamento e LLM atrás de interfaces com implementação simulada (`src/server/providers`).
- Onboarding PJ de ponta a ponta (RH e new joiner), fluxo CLT preparado e marcado como em validação.
- Motor de fluxo e 19 regras de automação como dados, com idempotência, linha do tempo e auditoria.
- Assistente com busca na base, modo local e modo LLM compatível com OpenAI (DeepSeek por padrão),
  encaminhamento pelo "Quem é quem" e registro de lacunas.
- Políticas e benefícios, equipamentos e acessos, despesas e viagens, rotina e apontamento (beta),
  PDI (prévia) e Admin completo.
- A troca de `MemoryRepository` por um repositório com banco não muda routers nem telas
  (`DataRepository`, D-OB-30).

## Fase 1 — Fundação real (cerca de 2 semanas)

- Processo: sessão com o Thiago para fechar etapas, documentos PJ e CLT, modelos de contrato e
  políticas oficiais; conversa com 1 ou 2 new joiners recentes sobre o que faltou (sugestão do
  Guilherme).
- Autenticação: NextAuth com Google Workspace para a equipe e link mágico no e-mail pessoal para o
  new joiner, que ainda não tem conta corporativa.
- Dados: Prisma + PostgreSQL (Cloud SQL) implementando `DataRepository`, com migrations e seed.
- Documentos: Cloud Storage em bucket privado, URLs assinadas e acesso só do RH.
- E-mail: Gmail API a partir de uma caixa dedicada ao RH (combinado na reunião).
- Deploy: Cloud Run em `southamerica-east1`.
- LGPD: aviso de privacidade revisado, base legal, acesso por papel, registro de acesso a dados
  sensíveis, retenção e descarte.
- Conteúdo real: políticas oficiais, vídeo de compliance (pedido do Guilherme) e quiz revisado.
- Reaproveitar do ERP: RBAC, padrão de providers e calendário de dias úteis com feriados de São Paulo.

## Fase 2 — Automação completa (cerca de 2 semanas)

- Regras com e-mail real e lembretes em dias úteis via Cloud Scheduler.
- Assinatura eletrônica (fornecedor a escolher) para contrato e termo do notebook.
- Endereço preenchido pelo CEP e dados da empresa pelo CNPJ (APIs públicas).
- Edição de fluxos e modelos de e-mail no Admin; resumo semanal para o RH.

## Fase 3 — Inteligência

- Assistente sobre a base oficial, com métricas de uso e de lacunas.
- Agente revisor de documentos (legibilidade, tipo, validade, consistência com a ficha), sempre com
  aprovação humana.
- Agente de despesas para dúvidas de política no momento do lançamento.
- Lembretes proativos e personalizados.

## Fase 4 — Expansão dos pilares

- Apontamento de horas integrado a projetos e aos indicadores de utilização do ERP, prioridade quando
  a equipe se aproximar de 50 pessoas.
- PDI, depois de definida a metodologia.
- Despesas e viagens apontando para a solução do ERP quando ela substituir o fluxo atual.
- Offboarding: devolução de equipamento e revogação de acessos.
- Absorção pelo ERP como módulo de Pessoas, com pessoas, projetos e RBAC compartilhados.

## Perguntas em aberto (seção 17 do plano)

1. Nomes e ordem das abas, alinhados aos 5 pilares do documento do Alê (mais o PDI).
2. Lista final de documentos e campos PJ; lista CLT com a contabilidade (eSocial).
3. Modelos de contrato existentes e quem assina pela Monoda.
4. Fornecedor de assinatura eletrônica.
5. Políticas oficiais em arquivo e produção do vídeo de compliance.
6. Nota mínima do quiz, número de tentativas e periodicidade de reciclagem.
7. Benefícios por regime: PJ tem plano de saúde? Inclui dependentes?
8. Agenda padrão do primeiro dia; haverá padrinho ou madrinha para quem entra?
9. Caixa de e-mail do RH para os disparos e domínio do e-mail corporativo.
10. LLM: DeepSeek para começar; quando assinar o plano pago e com qual teto mensal.
11. Temas de cada pessoa no "Quem é quem" e canal preferido.
12. Apontamento de horas: fica nesta plataforma ou no ERP?
