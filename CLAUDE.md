# CLAUDE.md — Monoda People

Plataforma de onboarding e pessoas da Monoda Consulting. Plano completo em docs/PLANO.md;
decisões em docs/DECISIONS.md (D-OB-xx); design em docs/DESIGN.md.

## Comandos
pnpm dev | pnpm build | pnpm lint | pnpm typecheck | pnpm test

## Regras
- UI em português do Brasil; código e identificadores em inglês; rotas em português.
- Componentes → tRPC → serviços de domínio → DataRepository. Componente nunca acessa dados direto.
- Integrações só via providers em src/server/providers (email, signature, storage, llm).
- Fluxo, formulários, documentos e automações são configuração (src/config); conteúdo é dado (content/).
  Nunca escrever nome de fornecedor (plano de saúde, ferramenta de despesas) direto em componente.
- O assistente nunca recebe dados pessoais (D-OB-06).
- Todo "agora" vem de clock.now().
- Conteúdo de exemplo sempre com isExample: true e aviso visível.
- Antes de commit: pnpm typecheck && pnpm lint && pnpm test && pnpm build.
- Decisão nova → docs/DECISIONS.md, continuando a numeração.

## Next.js 16
Esta versão do Next.js tem mudanças de API (proxy.ts no lugar de middleware, APIs de request
assíncronas, sem `next lint`). Antes de mexer em convenções do framework, leia a documentação
empacotada em node_modules/next/dist/docs/ — ver AGENTS.md.

@AGENTS.md
