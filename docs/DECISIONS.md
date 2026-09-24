# Decisões — Monoda People

Registro das decisões de arquitetura e produto. As decisões D-OB-01 a D-OB-13 vêm do plano
(docs/PLANO.md, seção 2). A partir da D-OB-14, são decisões tomadas durante a construção da Fase 0,
cada uma com contexto e motivo.

## Decisões do plano

| ID | Decisão | Por quê |
|---|---|---|
| D-OB-01 | Repositório próprio com o mesmo stack do ERP da Monoda: Next.js (App Router), TypeScript, tRPC, Zod, Tailwind e pnpm. Prisma/PostgreSQL e NextAuth entram na Fase 1. | Nasce separado e é absorvido pelo ERP como módulo de Pessoas, como foi feito com o Precificador. |
| D-OB-02 | A Fase 0 roda sem nada externo: repositório em memória com seed, caixa de saída de e-mail simulada, storage e assinatura simulados. | A demo roda em qualquer máquina e nada quebra ao vivo. |
| D-OB-03 | Toda integração fica atrás de interface (`DataRepository`, `EmailProvider`, `SignatureProvider`, `StorageProvider`, `LlmProvider`), com implementação simulada na Fase 0. | Mesmo princípio do ERP: abstração em vez de integração direta. |
| D-OB-04 | Fluxo como dado: etapas, tarefas, formulários, documentos e regras de automação ficam em `src/config/`, por regime (PJ ativo, CLT preparado). | Mudar o processo é mudar configuração, não tela. |
| D-OB-05 | Conteúdo como dado: políticas, benefícios, vídeo, quiz, base de conhecimento, agenda do primeiro dia e "Quem é quem" ficam em `content/`, são carregados no repositório e podem ser editados no Admin (em memória na Fase 0). | Trocar fornecedor ou política sem tocar em código. |
| D-OB-06 | O LLM nunca recebe dados pessoais: só a pergunta (com CPF, CNPJ, e-mail e telefone mascarados) e trechos da base de conhecimento. | LGPD e liberdade para trocar de provedor. |
| D-OB-07 | LLM via cliente compatível com a API da OpenAI, configurado por `LLM_BASE_URL`, `LLM_API_KEY` e `LLM_MODEL`. Padrão: DeepSeek (decidido na reunião). Sem chave, o assistente opera em modo local (busca + resposta montada a partir do artigo). | Custo mínimo, troca de provedor por variável de ambiente, demo funciona sem chave. |
| D-OB-08 | Cada módulo renderiza a visão do papel (RH, new joiner, colaborador). Na Fase 0, o seletor de persona grava o cookie `demo_persona`; na Fase 1, NextAuth + RBAC substituem. | Mostrar os dois lados na mesma apresentação, com o código que vai para produção. |
| D-OB-09 | Todo o domínio usa `clock.now()` (relógio virtual). O modo demo permite avançar dias. | Demonstrar lembretes, prazos e o primeiro dia ao vivo. |
| D-OB-10 | Contrato é etapa conduzida pelo RH: escolhe um modelo ou anexa contrato customizado; a plataforma controla status e dispara avisos. | Contratos podem ser customizados por pessoa (ponto levantado na reunião). |
| D-OB-11 | Alvo de deploy: Google Cloud (Cloud Run, Cloud SQL, Cloud Storage, Gmail API) em `southamerica-east1`. App portátil via Dockerfile e `output: 'standalone'`. | Combinado na reunião; continua rodando em outro host se preciso. |
| D-OB-12 | Montserrat self-hosted via `@fontsource-variable/montserrat`; não usar `next/font/google`. | Fonte padrão da Monoda; o build não depende de baixar fonte (ambiente sem rede). |
| D-OB-13 | Modo demo controlado por `DEMO_MODE` no servidor (padrão `true` na Fase 0) e repassado ao cliente por contexto; nada de variável `NEXT_PUBLIC_` para isso. | Evita que o valor fique congelado no build. |

## Decisões tomadas na construção

### D-OB-14 — Componentes shadcn/ui escritos no repositório, sem o CLI

- **Contexto:** o `shadcn init`/`add` baixa os componentes de `ui.shadcn.com`, e esse domínio está
  bloqueado pela política de rede do ambiente de construção.
- **Decisão:** os 23 componentes pedidos no CP0 foram escritos à mão em `src/components/ui/`,
  seguindo o padrão shadcn/ui (estilo new-york v4, primitivas do pacote `radix-ui`, `cva`, `cn`).
  O `components.json` fica no repositório para que o CLI funcione normalmente em máquinas com rede.
- **Por quê:** mantém o padrão combinado (componentes copiados para o repositório, editáveis) sem
  depender de rede no build. Os componentes já nascem com os tokens da Monoda (raios, fios, sem sombra
  em superfícies comuns).

### D-OB-15 — Versões: Next.js 16, TypeScript 6.0, ESLint 9, Zod 4, Tailwind 4, Vitest 5

- **Contexto:** o plano pede "a versão estável mais recente". Em 24/09/2026: Next.js 16.3.6,
  React 19.3, tRPC 11.19, Zod 4.6, Tailwind 4.3, Vitest 5.0. O TypeScript 7 (nativo) já é o `latest`,
  mas o `typescript-eslint` aceita só `<6.1`; o ESLint 10 existe, mas os plugins do `eslint-config-next`
  ainda não declaram suporte.
- **Decisão:** TypeScript `~6.0.3` e ESLint `^9.39`; demais pacotes na última estável.
- **Por quê:** lint e typecheck confiáveis valem mais que a última versão de ferramenta de build.
  Subir para TypeScript 7 e ESLint 10 é só trocar a versão quando o ecossistema acompanhar.

### D-OB-16 — Scaffold T3 como referência, projeto montado no padrão T3

- **Contexto:** o `create-t3-app` 7.40 gerou o boilerplate com Next.js 15 e Zod 3 e falhou na etapa
  de instalação (`TypeError: i.replace is not a function`).
- **Decisão:** o projeto foi montado manualmente seguindo o padrão T3 (`src/server/api` com `trpc.ts`,
  `root.ts` e `routers/`; `src/trpc` com `react.tsx`, `server.ts` e `query-client.ts`), já nas versões
  atuais. O `@t3-oss/env-nextjs` não entrou: as variáveis são todas opcionais e lidas em tempo de
  execução por `src/server/env.ts` (D-OB-13).
- **Por quê:** é a alternativa prevista no plano (seção 3.1) e evita herdar versões antigas.

### D-OB-17 — `/entrar` é um Route Handler, não uma página

- **Contexto:** no Next.js 16, cookies só podem ser gravados em Route Handlers e Server Actions; uma
  `page.tsx` não consegue gravar o cookie `demo_persona` durante a renderização.
- **Decisão:** `src/app/entrar/route.ts` (GET) valida a persona, grava o cookie e redireciona para
  `next`. Com `DEMO_MODE=false`, responde 404.
- **Por quê:** funciona sem JavaScript no cliente, inclusive a partir de links de e-mail.

### D-OB-18 — Senha opcional da demo em `proxy.ts`

- **Contexto:** o Next.js 16 renomeou o `middleware` para `proxy` (runtime Node.js).
- **Decisão:** a proteção por `DEMO_PASSWORD` (Basic Auth) fica em `src/proxy.ts`.
- **Por quê:** segue a convenção atual do framework; a convenção antiga está depreciada.

### D-OB-19 — AGENTS.md com o bloco gerenciado do Next.js

- **Contexto:** o `next dev` 16 detecta agentes de código e grava um bloco de regras em `AGENTS.md`
  ou `CLAUDE.md` quando ele não existe.
- **Decisão:** o `AGENTS.md` versionado já traz o bloco (gerado pelo próprio helper do Next.js) e o
  `CLAUDE.md` segue o Apêndice A do plano, com uma referência ao `AGENTS.md`.
- **Por quê:** o `CLAUDE.md` fica como o plano pede e a árvore de trabalho não muda sozinha ao rodar
  `pnpm dev`.

### D-OB-20 — Dados fictícios que nunca coincidem com pessoas reais

- **Contexto:** o plano pede new joiners fictícios, com CPF e CNPJ de teste sempre mascarados.
- **Decisão:** e-mails dos new joiners usam o domínio reservado `.example` (RFC 2606); CPFs e CNPJs do
  seed têm dígito verificador propositalmente inválido (um teste garante isso). A equipe usa
  `nome@exemplo.monoda`, domínio marcado para validar em `company.ts`.
- **Por quê:** um documento com dígito inválido não pode pertencer a ninguém, e a Fase 0 só valida
  formato (o dígito verificador entra na Fase 1).

### D-OB-21 — Condição de liberação `stage_done`

- **Contexto:** o check-in do primeiro dia libera quando "etapas 3 a 6 estão concluídas", e as tarefas
  dessas etapas variam por regime (CLT tem envio à contabilidade) e por `needsNotebook`.
- **Decisão:** `UnlockCondition` ganhou `{ type: 'stage_done', stageId }`, além de `task_done`, `event`
  e `date_reached`.
- **Por quê:** a condição continua sendo dado e não precisa listar tarefa por tarefa de cada regime.

### D-OB-22 — Ator `sistema` para fatos derivados

- **Contexto:** o contador de ações automáticas usa `actorId: 'automacao'`. Eventos derivados como
  `documents.all_submitted` ou `stage.completed` não são ações, são fatos.
- **Decisão:** ações da plataforma (e-mail enviado, tarefa liberada, evidência registrada, reindexação)
  usam `automacao`; eventos derivados levam o ator do evento que os causou; eventos sem pessoa
  (virada de dia do relógio) usam `sistema`.
- **Por quê:** o indicador "ações automáticas" conta só o trabalho que saiu do colo do RH.

### D-OB-23 — Tempo por etapa e gargalo

- **Contexto:** a faixa de fluxo mostra o tempo médio por etapa e marca o gargalo. A etapa "Primeiro
  dia" espera a data de início por definição, então seria sempre o "gargalo".
- **Decisão:** tempo na etapa = da liberação da primeira tarefa da etapa até a sua conclusão (ou até
  agora, se ainda aberta), em dias corridos com uma casa decimal. Etapas com `waitsForStartDate`
  mostram "aguarda a data de início" e ficam fora do cálculo de gargalo. "Pessoas na etapa" conta os
  casos em andamento pela etapa atual (primeira não concluída, na ordem do fluxo).
- **Por quê:** o gargalo tem de apontar trabalho parado, não o calendário.

### D-OB-24 — Tentativas extras de quiz liberadas pelo RH

- **Contexto:** o quiz tem até 3 tentativas. Sem saída, quem esgota as tentativas trava o onboarding.
- **Decisão:** o caso guarda `extraQuizAttempts`; o RH pode liberar uma nova tentativa na aba Jornada
  do caso, e isso fica na auditoria.
- **Por quê:** mantém a regra das 3 tentativas e dá um caminho humano para a exceção.

### D-OB-25 — Imports só de tipo com `import type`

- **Contexto:** com `verbatimModuleSyntax`, `import { type X } from "m"` vira `import "m"` no bundle.
  O teste no navegador mostrou o `@trpc/server` (e o roteador do servidor) indo para o cliente.
- **Decisão:** ESLint exige `import type` (`consistent-type-imports` com `separate-type-imports` e
  `no-import-type-side-effects`).
- **Por quê:** evita vazar código de servidor para o navegador.

### D-OB-26 — `pnpm typecheck` gera os tipos de rota antes do `tsc`

- **Contexto:** páginas usam o helper global `PageProps<'/rota/[param]'>`, gerado pelo Next.js.
- **Decisão:** o script é `next typegen && tsc --noEmit`.
- **Por quê:** o typecheck funciona num clone limpo, sem depender de um build anterior.

### D-OB-27 — Dois eventos de domínio a mais: `task.completed` e `feedback.submitted`

- **Contexto:** tarefas manuais (e-mail corporativo, exame agendado, envio à contabilidade, agenda
  lida) e a resposta da pesquisa não tinham evento na lista da seção 8.1.
- **Decisão:** `task.completed` (com `taskDefId`) para tarefas concluídas por uma pessoa e
  `feedback.submitted` para a pesquisa. Os dois reavaliam o fluxo como qualquer evento.
- **Por quê:** toda mudança de estado passa pelo mesmo `emit`, e a linha do tempo fica completa.

### D-OB-28 — Liberar tarefas é do fluxo; a regra dá nome e aviso

- **Contexto:** o plano descreve ações `create_task`/`unlock_task` nas regras e, ao mesmo tempo,
  condições de liberação no fluxo. Se a liberação dependesse só da regra, desligar a A03 (aviso do
  vídeo) travaria o onboarding.
- **Decisão:** o motor de fluxo libera as tarefas pelas condições de `src/config/workflows`. Quando
  uma regra habilitada nomeia a tarefa liberada, o registro "tarefa liberada" (ator `automacao`) sai
  atribuído a ela; desligada, a tarefa ainda é liberada, sem e-mail e sem atribuição.
- **Por quê:** processo continua sendo configuração (D-OB-04) e desligar um aviso nunca trava ninguém.

### D-OB-29 — Status de tarefa derivado dos fatos

- **Contexto:** guardar o status só como campo solto deixa a tela divergir dos dados (um documento
  rejeitado depois de "tudo enviado", um contrato recusado).
- **Decisão:** o status é recalculado a cada evento a partir dos fatos (ficha, documentos, contrato,
  aceites…) e das condições; é persistido com `availableAt` e `completedAt`. Só "documentos",
  "revisão de documentos" e "preparar contrato" podem voltar atrás; as demais conclusões são
  definitivas.
- **Por quê:** a mesma função alimenta telas, regras, indicadores e testes.

### D-OB-30 — `DataRepository` assíncrono e contexto de domínio injetado

- **Contexto:** o `MemoryRepository` poderia ser síncrono, mas o `PrismaRepository` da Fase 1 não.
- **Decisão:** a interface é toda assíncrona, e os serviços recebem um `DomainContext` (repositório,
  relógio, provedores, URL base). O app usa um contexto único em `src/server/domain.ts`; testes e seed
  montam o próprio.
- **Por quê:** trocar de repositório não muda serviços nem routers; testes rodam com relógio
  controlado.

### D-OB-31 — Seed como linha do tempo reproduzida pelo próprio motor

- **Contexto:** o seed precisa de histórico retroativo coerente (tempos por etapa, e-mails,
  lembretes, linha do tempo).
- **Decisão:** o seed agenda cada ação (cadastro, ficha, documentos, revisões…) numa data relativa ao
  dia da demo, junta as viradas de dia às 7h e executa tudo em ordem cronológica com os serviços
  reais. Resultado: gargalo em "Cadastro e documentos", lead time médio de 12,5 dias e caixa de saída
  coerente, sem estado escrito à mão.
- **Por quê:** o que a demo mostra é o que o motor produz, e o seed quebra se o motor quebrar.

### D-OB-32 — Virada de dia automática, uma vez por dia virtual

- **Contexto:** lembretes (A15) e véspera (A14) dependem de `clock.tick`, e o dia também vira sem
  ninguém clicar em "Avançar 1 dia".
- **Decisão:** a primeira requisição de um novo dia virtual emite `clock.tick` (guardado em
  `lastTickDate`). "Avançar 1 dia" faz o mesmo na hora. A virada em si não vai para a auditoria; o
  avanço manual vai (`demo.day_advanced`).
- **Por quê:** simula o agendador da Fase 2 (Cloud Scheduler) sem poluir a auditoria.

### D-OB-33 — Idempotência por caso ou por assunto

- **Contexto:** "cada regra dispara no máximo uma vez por caso e evento", mas A18 e A19 não têm caso.
- **Decisão:** a chave é `regra + caso`; sem caso, `regra + assunto` (ex.: `politica-de-viagens:v3`,
  id do plano novo). Regras repetíveis (A04, A10, A15, A18) registram cada disparo; A15 respeita o
  intervalo de 3 dias por tarefa.
- **Por quê:** A19 avisa a cada troca de provedor sem avisar duas vezes a mesma troca.

### D-OB-34 — E-mails em Markdown renderizados com `marked`

- **Contexto:** os modelos de `content/emails` são Markdown com `{{variáveis}}`; `react-dom/server`
  não pode ser usado em código compartilhado com Server Components.
- **Decisão:** `marked` converte o Markdown; variáveis são escapadas (exceto listas montadas pela
  plataforma) e o HTML vai num layout com a marca, com estilos inline.
- **Por quê:** e-mail precisa de HTML autocontido e sem risco de injeção a partir de nomes digitados.

### D-OB-35 — Aviso de privacidade como política versionada

- **Contexto:** o plano tem `content/termos/privacidade.md` (aceite na ficha) e "Aviso de
  Privacidade v1" entre as políticas.
- **Decisão:** o arquivo de `termos/` é a fonte e o carregador o registra como política
  `aviso-de-privacidade`. O aceite na ficha vira `PolicyAck` da versão vigente (evidência).
- **Por quê:** um texto só, com versão e aceite rastreáveis como as demais políticas.

### D-OB-36 — Modelo de contrato CLT de exemplo

- **Contexto:** os modelos de exemplo do plano são "Prestação de serviços PJ" e "Termo de
  confidencialidade"; o fluxo CLT precisa de um contrato de trabalho.
- **Decisão:** `contratos/modelos.json` inclui "Contrato de trabalho CLT — modelo em validação",
  marcado como exemplo.
- **Por quê:** o fluxo CLT preparado (seção 7.3) roda de ponta a ponta sem inventar contrato real.

### D-OB-37 — Caixa de saída entregue no CP3

- **Contexto:** o aceite do CP3 ("cadastrar gera o e-mail de boas-vindas na caixa de saída") e o
  roteiro da demo dependem da caixa de saída, prevista para o CP7 (Admin).
- **Decisão:** a caixa de saída (`/admin/caixa-de-saida`) entrou no CP3, com filtros por regra e caso,
  visualização do e-mail e o selo "Simulado". Os links absolutos (`APP_URL`) viram relativos na
  visualização, para funcionar em qualquer porta ou host.
- **Por quê:** o aceite do checkpoint fica verificável no próprio checkpoint.

### D-OB-38 — Escala tipográfica registrada no tailwind-merge

- **Contexto:** o teste no navegador mostrou botões pequenos sem texto e selos no tamanho errado: o
  `tailwind-merge` tratava `text-meta` como cor e descartava `text-primary-foreground`.
- **Decisão:** `cn()` usa `extendTailwindMerge` com a escala `meta`, `ui`, `read`, `section`, `page` e
  `hero` (e a sombra `float`), com teste de regressão.
- **Por quê:** a escala própria da seção 12.4 continua sendo a única, sem nomes genéricos (`text-sm`).
