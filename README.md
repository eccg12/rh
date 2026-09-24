# Monoda People

Plataforma de onboarding e pessoas da Monoda Consulting. Esta é a **Fase 0**: uma demo navegável
completa, que roda sem banco, sem e-mail real e sem chave de LLM.

> "Monoda People" é nome de trabalho, configurável em `src/config/company.ts`.

## Como rodar

Requisitos: Node.js 22.12 ou superior e pnpm 10.

```bash
pnpm install
pnpm dev
```

Abra http://localhost:3000. Nenhuma variável de ambiente é necessária (ver `.env.example`).

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção (`output: 'standalone'`) |
| `pnpm start` | Sobe o build de produção |
| `pnpm typecheck` | Checagem de tipos (`tsc --noEmit`) |
| `pnpm lint` | ESLint |
| `pnpm test` | Testes de domínio (Vitest) |

## Documentação

- `docs/PLANO.md`: plano da Fase 0.
- `docs/DECISIONS.md`: decisões de arquitetura (D-OB-xx).
- `CLAUDE.md`: regras para quem mexe no código.
