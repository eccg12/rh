# Monoda People

Plataforma de onboarding e pessoas da Monoda Consulting. Esta é a **Fase 0**: uma demo navegável
completa, que roda sem banco, sem e-mail real, sem assinatura eletrônica e sem chave de LLM. Tudo que
depende de fora está atrás de uma interface com implementação simulada.

> "Monoda People" é nome de trabalho, configurável em `src/config/company.ts`.

## Como rodar

Requisitos: Node.js 22.12 ou superior e pnpm 10.

```bash
pnpm install
pnpm dev
```

Abra http://localhost:3000. Nenhuma variável de ambiente é necessária (veja `.env.example`).

Produção local:

```bash
pnpm build
pnpm start
```

O estado vive em memória: reiniciar o servidor volta aos dados iniciais. Durante a demo, use o painel
**Demo** → **Restaurar dados iniciais**, sem reiniciar nada.

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção (`output: "standalone"`) |
| `pnpm start` | Sobe o build de produção |
| `pnpm typecheck` | Gera os tipos das rotas (`next typegen`) e roda `tsc --noEmit` |
| `pnpm lint` | ESLint, sem avisos tolerados |
| `pnpm test` | Testes de domínio e do assistente (Vitest) |

Antes de cada commit: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

## Personas e modo demo

Com `DEMO_MODE=true` (padrão):

- **Ver como** (topo, à direita) troca a persona: Thiago Stepanoff (RH e gestor), Enzo Craveiro
  (colaborador e gestor) e cada new joiner com caso em andamento, inclusive quem for cadastrado ao
  vivo.
- Botão **Demo** (canto inferior esquerdo): data virtual, **Avançar 1 dia** (roda lembretes e avisos
  do dia), troca de persona e **Restaurar dados iniciais**.
- Atalhos de demonstração nas telas, com contorno tracejado: "Preencher com dados de exemplo",
  "Simular envio de todos" e "Simular vídeo assistido".
- Os links dos e-mails na caixa de saída funcionam e trocam a persona para o destinatário.

Com `DEMO_MODE=false`, nada disso aparece e as rotas de demo respondem 404. O roteiro completo da
apresentação está em [`docs/DEMO.md`](docs/DEMO.md).

## Como ligar o LLM do assistente

Sem chave, o assistente responde em **modo local**: busca na base de conhecimento e devolve o trecho
que responde, com o passo a passo e a fonte. Para respostas escritas pelo modelo, crie um
`.env.local`:

```bash
LLM_API_KEY=sua-chave
# Opcionais (padrão: DeepSeek)
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
```

Qualquer endpoint compatível com a API da OpenAI funciona (Gemini tem um; confirme URL e modelo na
documentação do provedor). O comportamento:

- A pergunta e o histórico têm CPF, CNPJ, e-mail e telefone mascarados antes de qualquer processamento.
- O modelo recebe só as regras do assistente, até 4 trechos da base e as últimas 6 mensagens. Nunca
  recebe dados de casos, fichas ou documentos (D-OB-06).
- Quando os trechos não respondem, o modelo devolve `[SEM_RESPOSTA]` e o assistente encaminha para a
  pessoa certa, registrando a lacuna.
- Erro ou demora acima de 20 segundos: a mesma pergunta é respondida em modo local.
- Limite de 30 perguntas a cada 10 minutos por persona.

## Onde mudar conteúdo e configuração

Conteúdo é dado (`content/`); regras de negócio são configuração (`src/config/`). Nenhum componente
tem nome de fornecedor escrito direto.

| O que | Onde |
|---|---|
| Políticas (uma versão por arquivo, com frontmatter) | `content/politicas/*.md` |
| Benefícios | `content/beneficios/*.md` |
| Artigos do assistente | `content/kb/*.md` |
| Vídeo e quiz de compliance | `content/compliance/video.json`, `content/compliance/quiz.json` |
| Modelos de contrato | `content/contratos/modelos.json` |
| Termos (notebook, aviso de privacidade) | `content/termos/*.md` |
| Modelos de e-mail (com `{{variáveis}}`) | `content/emails/*.md` |
| Agenda do primeiro dia | `content/primeiro-dia.md` |
| Documentos oficiais para converter | `content/_fontes/` (veja o LEIA-ME) |
| Nome do produto, domínio de e-mail, contatos, ferramenta de despesas | `src/config/company.ts` |
| Cores e marca | `src/styles/globals.css` e `src/config/brand.ts` |
| Abas e papéis | `src/config/modules.ts` |
| Fluxos PJ e CLT (etapas, tarefas, condições) | `src/config/workflows/` |
| Ficha cadastral | `src/config/forms/` |
| Documentos exigidos por regime | `src/config/documents.ts` |
| Regras de automação | `src/config/automations.ts` |
| Quem é quem | `src/config/directory.ts` |
| Perguntas sugeridas e categorias da base | `src/config/assistant.ts`, `src/config/knowledge.ts` |

Boa parte disso também é editável pelo **Admin** (engrenagem no topo, só RH): políticas, benefícios,
compliance, base de conhecimento, "Quem é quem" e liga/desliga das automações. Na Fase 0, o que é
editado no Admin fica em memória.

Todo conteúdo de exemplo tem `isExample: true` e mostra o aviso "Conteúdo de exemplo — substituir
pelo documento oficial". Nenhuma regra oficial da Monoda foi inventada: onde faltava a fonte, o
texto é exemplo e está marcado.

## Arquitetura

```
componentes → hooks do tRPC → routers → serviços de domínio → DataRepository
```

- **Domínio** (`src/domain`): schemas Zod, relógio virtual, motor de fluxo (status das tarefas
  derivado dos fatos), motor de automações (regras como dados, idempotência, eventos derivados) e
  serviços.
- **Dados** (`src/server/data`): `DataRepository` com implementação em memória (`MemoryRepository`),
  seed com histórico retroativo e leitura de `content/`. Na Fase 1, um repositório com banco
  implementa a mesma interface.
- **Provedores** (`src/server/providers`): e-mail (caixa de saída simulada), assinatura, armazenamento
  e LLM, cada um com interface e implementação simulada.
- **Assistente** (`src/server/assistant`): índice MiniSearch, busca, resposta local e por LLM,
  encaminhamento e mascaramento. A conversa passa por `/api/assistant` em NDJSON.

Decisões registradas em [`docs/DECISIONS.md`](docs/DECISIONS.md) (D-OB-01 em diante) e direção visual
em [`docs/DESIGN.md`](docs/DESIGN.md).

## Deploy

A imagem usa o build standalone do Next.js e copia `content/`, que é lido em tempo de execução:

```bash
docker build -t monoda-people .
docker run -p 8080:8080 -e DEMO_PASSWORD=defina-uma-senha monoda-people
```

No Google Cloud Run (Apêndice C do plano):

```bash
gcloud run deploy monoda-people \
  --source . \
  --region southamerica-east1 \
  --max-instances 1 \
  --min-instances 1 \
  --set-env-vars DEMO_MODE=true,DEMO_PASSWORD=<defina-uma-senha> \
  --set-secrets LLM_API_KEY=llm-api-key:latest \
  --allow-unauthenticated
```

- `--max-instances 1`: na Fase 0 o estado vive em memória, então tudo precisa cair na mesma instância.
- `--min-instances 1`: evita que o estado zere quando o serviço escala para zero (tem custo).
- `DEMO_PASSWORD` liga a senha (Basic Auth, `src/proxy.ts`) para qualquer URL aberta.
- Depois do primeiro deploy, defina `APP_URL` com a URL do serviço (links dos e-mails simulados).
- Para a apresentação, rodar localmente é o caminho mais seguro.

## Variáveis de ambiente

Todas opcionais (`.env.example`):

| Variável | Padrão | Para quê |
|---|---|---|
| `DEMO_MODE` | `true` | Seletor de persona, painel Demo e atalhos |
| `APP_URL` | `http://localhost:3000` | Links dos e-mails simulados |
| `LLM_API_KEY` | vazio | Liga o modo LLM do assistente |
| `LLM_BASE_URL` | `https://api.deepseek.com` | Endpoint compatível com a API da OpenAI |
| `LLM_MODEL` | `deepseek-chat` | Modelo |
| `DEMO_PASSWORD` | vazio | Senha (Basic Auth) para URL aberta |

## Documentação

- [`docs/PLANO.md`](docs/PLANO.md): plano da Fase 0.
- [`docs/DEMO.md`](docs/DEMO.md): roteiro da demo.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): próximas fases e perguntas em aberto.
- [`docs/DECISIONS.md`](docs/DECISIONS.md): decisões de arquitetura.
- [`docs/DESIGN.md`](docs/DESIGN.md): direção visual e design system.
- [`CLAUDE.md`](CLAUDE.md): regras para quem mexe no código.
