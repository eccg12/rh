# Design — Monoda People

Direção visual e design system da Fase 0 (docs/PLANO.md, seção 12). Este documento foi escrito antes
das telas e revisado contra a lista "Evitar" (seção 12.7); o que mudou na revisão está no fim.

## 1. Brief

- **Assunto:** a entrada numa consultoria boutique de excelência operacional, supply chain e
  transformação digital, com raízes em MBB.
- **Público:** quem está entrando, muitas vezes pelo celular e antes do primeiro dia; e o RH, no
  desktop, querendo ver só o que depende dele.
- **Trabalho principal:** para o new joiner, saber o próximo passo e se sentir recebido; para o RH,
  enxergar o fluxo e as exceções.

## 2. Três princípios deste produto

1. **Uma próxima ação por tela.** Toda tela abre respondendo "o que eu faço agora?". Para quem entra,
   é o cartão "Próximo passo", com uma única ação, o tempo estimado e um botão. Para o RH, é
   "Depende de você", com o verbo da ação em cada linha. O resto da tela é consulta.
2. **O processo é a única ousadia.** A linha da jornada (new joiner) e a faixa de fluxo com lead time
   e gargalo (RH) são as únicas peças com desenho próprio. Todo o resto é texto, fios e tabelas:
   planos, alinhados à esquerda, sem enfeite.
3. **Estado sempre tem forma e palavra.** Nenhum status depende só de cor: cada um tem ícone e rótulo.
   O que a plataforma fez sozinha sempre aparece com o raio e a palavra "automático", para que o RH
   veja o trabalho saindo do colo dele.

## 3. Tokens

Os tokens vivem em `src/styles/globals.css` (variáveis CSS) e `src/config/brand.ts`. São placeholders
até os hex do slide master da Monoda; trocar a paleta é editar esses dois arquivos.

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#0E2A3B` | Texto, títulos, trilho percorrido, botão primário, anel de foco |
| `paper` | `#F4F6F7` | Fundo da aplicação (frio, nunca creme) |
| `surface` | `#FFFFFF` | Superfícies de conteúdo |
| `rule` | `#D3DCE1` | Divisores, bordas decorativas, trilho a percorrer |
| `signal` | `#E3A21A` | "Você está aqui" e "depende de você"; só como preenchimento com texto `ink` |
| `ok` | `#1E7A55` | Concluído, aprovado |
| `stop` | `#B42318` | Rejeitado, atrasado |

Derivados (não são cores novas de marca; existem para cumprir contraste):

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `ink-soft` | `#4E6270` | Texto secundário, metadados | 6,35:1 no branco; 5,86:1 no `paper` |
| `control` | `#7D909C` | Borda de campos e checkboxes | 3,31:1 no branco (limite de 3:1 para componentes) |
| `tint` | `#E9EEF1` | Hover, realce neutro, trilho de progresso | — |
| `ok-soft` / `stop-soft` / `signal-soft` | `#E7F3ED` / `#FBEBE9` / `#FBF0D9` | Fundo de selos de status | texto `ok` 4,64:1; `stop` 5,69:1; `ink` 13:1 |

Contrastes principais: `ink` no branco 14,9:1; `ink` sobre `signal` 6,7:1; `ok` no branco 5,3:1;
`stop` no branco 6,6:1. O `signal` nunca é usado como cor de texto (2,2:1 no branco).

## 4. Tipografia

Montserrat como família única, self-hosted (`@fontsource-variable/montserrat`, D-OB-12).

| Utilitário | Tamanho | Uso | Peso | Entrelinha |
|---|---|---|---|---|
| `text-meta` | 13 px | Metadados, cabeçalhos de tabela, selos | 500/600 | 1,45 |
| `text-ui` | 15 px | Corpo da interface | 400 (texto) / 500 (controles) | 1,55 |
| `text-read` | 17 px | Leitura de políticas e artigos (`.prose-read`, até 72 caracteres) | 400 | 1,6 |
| `text-section` | 20 px | Títulos de seção | 600 | 1,3 |
| `text-page` | 26 px | Títulos de página | 600, tracking −0,01em | 1,2 |
| `text-hero` | 40 px | Só na tela de boas-vindas | 700, tracking −0,01em | 1,15 |

Números tabulares (`tabular-nums`) em indicadores, datas, horas e tabelas.

## 5. Layout, superfícies e ícones

- Tudo alinhado à esquerda. Conteúdo com até 1.200 px; páginas de leitura com até 720 px.
- Raios: 4 px em campos e botões (`rounded-md`), 8 px em painéis e cartões (`rounded-lg`), 12 px em
  diálogos e painéis laterais (`rounded-xl`).
- Sombra (`shadow-float`) só no que flutua: painel lateral, diálogo, menus e os botões fixos
  "Perguntar" e "Demo". Superfícies comuns são planas, separadas por fios de 1 px (`rule`).
- Cartão só para objeto independente: documento, política, pessoa, benefício. Listas são linhas com
  divisores. Não há grade de cartões de indicador.
- Ícones lucide de 16 a 20 px, traço 1,75.
- Cabeçalho em duas faixas: marca e controles em cima; abas embaixo, sublinhadas. No celular, a faixa
  de abas rola na horizontal com a aba ativa centralizada, e o seletor de persona vai para o menu.

## 6. Peças-assinatura

### Faixa de fluxo (RH)

Uma caixa por etapa, na ordem do processo, ligadas por setas. Cada caixa mostra quantas pessoas estão
na etapa e o tempo médio nela. A etapa com maior tempo médio ganha borda de 2 px, o ícone de alerta e a
palavra "gargalo" (forma e texto, não só cor). "Primeiro dia" espera a data de início, então mostra
"aguarda a data de início" e fica fora do cálculo de gargalo. Acima da faixa, o lead time médio.
Clicar numa caixa filtra a tabela de new joiners (`aria-pressed`).

### Linha da jornada (new joiner)

Uma lista ordenada (`<ol>`), uma estação por etapa, com `aria-current="step"` na atual.

| Estado | Forma | Cor | Texto |
|---|---|---|---|
| Concluída | Círculo cheio com check | `ink` | "concluída" (leitor de tela) |
| Atual | Círculo maior cheio, com anel | `signal` com borda `ink` | "você está aqui" em etiqueta `signal` |
| Aguardando a Monoda | Círculo tracejado com ampulheta | `ink-soft` | "aguardando a Monoda" |
| Bloqueada | Círculo vazio pequeno com cadeado | `rule` / `ink-soft` | "bloqueada" (leitor de tela) |

O trilho entre estações concluídas é `ink`; o restante, `rule`. No celular, a linha vira um stepper
horizontal no topo, com a estação atual centralizada.

## 7. Vocabulário de status

| Status | Ícone | Rótulo | Cor |
|---|---|---|---|
| Tarefa concluída / documento aprovado | CircleCheck | "Concluída" / "Aprovado" | `ok` |
| Disponível para a pessoa | CircleDot | "Disponível" / "Com você" | `ink` |
| Depende de você (RH) | Hand | "Depende de você" | `signal` + texto `ink` |
| Em andamento | CircleDashed | "Em andamento" | `ink` |
| Aguardando revisão | Hourglass | "Aguardando revisão" | `ink-soft` |
| Bloqueada | Lock | "Bloqueada" | `ink-soft` |
| Dispensada | Ban | "Não se aplica" | `ink-soft` |
| Rejeitado / atrasado | CircleX / CircleAlert | "Rejeitado" / "Atrasado" | `stop` |
| Ação automática | Zap | "automático" | `ink` sobre `tint` |

## 8. Wireframes

Central do RH (`/onboarding`, persona RH):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ■ monoda  Monoda People                                  ⚙   Ver como Thiago ▾│
│ Onboarding  Assistente  Políticas e benefícios  Equipamentos e acessos  …    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Onboarding                                             [Cadastrar new joiner]│
│                                                                              │
│ Fluxo do onboarding                                Lead time médio: 12,5 dias│
│ ┌────────────┐   ┌──────────────┐   ┌──────────┐   ┌────────────┐            │
│ │Pré-admissão│ ▶ │Cadastro e    │ ▶ │Contrato  │ ▶ │Compliance  │ ▶ …        │
│ │0 pessoas   │   │documentos    │   │1 pessoa  │   │0 pessoas   │            │
│ │0 dia       │   │2 pessoas     │   │2,4 dias  │   │1,9 dia     │            │
│ └────────────┘   │5,1 dias      │   └──────────┘   └────────────┘            │
│                  │▲ gargalo     │                                            │
│                  └──────────────┘                                            │
│ Depende de você (3)                       Automações nos últimos 30 dias     │
│ Lucas Ferraz   Agendar exame      há 3 dias  [Agendar]   64 ações automáticas│
│ Lucas Ferraz   Revisar documentos há 2 dias  [Revisar]   ⚡ Boas-vindas…      │
│ Juliana Prado  Liberar acessos    há 1 dia   [Liberar]   ⚡ Quiz liberado…    │
│                                                                              │
│ New joiners                          Filtros: etapa, regime, pendência do RH │
│ Nome           Regime  Início     Etapa atual            Progresso  Próxima  │
│ Juliana Prado  PJ      em 3 dias  Equipamentos e acessos ████████░  Juliana  │
└──────────────────────────────────────────────────────────────────────────────┘
```

Jornada do new joiner (`/onboarding`, persona new joiner):

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Oi, Ana. Faltam 14 dias para o seu início.                               │
│                                                                          │
│  ● Pré-admissão              ┌ Próximo passo ─────────────────────────┐  │
│  │                           │ Preencha sua ficha cadastral           │  │
│  ◉ Cadastro e documentos     │ Uns 10 minutos. Seus dados ficam só    │  │
│  │ você está aqui            │ com o RH.            [Preencher ficha] │  │
│  ○ Contrato                  └────────────────────────────────────────┘  │
│  │                           Nesta etapa                                 │
│  ○ Compliance                ☐ Ficha cadastral                           │
│  │                           ☐ Documentos (0 de 6)                       │
│  ○ Políticas e benefícios                                                │
│  │                           Precisa de ajuda? Pergunte ao assistente    │
│  ○ Equipamentos e acessos    ou fale com Thiago Stepanoff.               │
│  │                                                                       │
│  ○ Primeiro dia                                                          │
│  │                                                                       │
│  ○ Feedback                                                              │
└──────────────────────────────────────────────────────────────────────────┘
```

## 9. Movimento

Um único momento orquestrado: a linha da jornada se desenha na tela de boas-vindas e, na jornada,
avança até a próxima estação quando uma etapa é concluída (500 ms). Nada mais se anima sozinho.
Abrir painéis, expandir acordeões e confirmar ações têm transições curtas (até 200 ms). Com
`prefers-reduced-motion`, nenhuma animação (regra global em `globals.css`).

## 10. Texto da interface

- Português do Brasil, só a primeira letra da frase em maiúscula, voz ativa. Quem entra é "você".
- O botão diz o que acontece e o toast repete o verbo:

| Botão | Toast |
|---|---|
| Cadastrar e enviar boas-vindas | Cadastro criado. Boas-vindas enviadas para ana…@… |
| Enviar ficha | Ficha enviada |
| Enviar documentos | Documentos enviados |
| Aprovar / Rejeitar | Documento aprovado / Documento rejeitado |
| Enviar para assinatura | Contrato enviado para assinatura |
| Assinar contrato | Contrato assinado |
| Aceitar política | Política aceita |
| Aceitar termo | Termo aceito |
| Marcar como liberado | Acesso liberado |
| Fazer check-in | Check-in feito |

- Erro diz o que houve e como resolver: "O arquivo tem 14 MB. O limite é 10 MB: envie em PDF ou
  reduza a resolução."
- Estado vazio convida à ação: "Nenhuma pendência com você. As próximas aparecem aqui assim que alguém
  avançar."
- Nomes pelo que a pessoa entende: "avisos automáticos", nunca "webhooks" ou "triggers".

## 11. Acessibilidade (piso)

Responsivo até 360 px; foco visível (contorno `ink` de 2 px com afastamento); navegação completa por
teclado; contraste AA; status nunca só por cor; link "Pular para o conteúdo"; a jornada é `<ol>` com
`aria-current="step"`; toasts com `role="status"` (sonner); diálogos e painéis com título.

## 12. Revisão contra a seção 12.7 ("Evitar")

| Item a evitar | Como ficou |
|---|---|
| Grade de cartões idênticos, mesma sombra e raio; degradês | Sem grade de indicadores. Cartão só para objeto independente; superfícies planas com fio; raios em três níveis; nenhum degradê. |
| Caixa alta, rótulo-sobrancelha, palavra destacada no título | Títulos em frase, sem rótulo acima. Nenhuma palavra isolada em cor ou itálico. |
| Metadados com ponto médio, seta "→" em botão, fonte mono em rótulos | Metadados em colunas ou em frase com vírgula; botões só com verbo; família única, sem mono. |
| Creme com terracota; quase preto com neon | Fundo `paper` frio; destaque `signal` só em "você está aqui" e "depende de você". |
| Numeração 01/02/03 fora da jornada | Só a jornada e o passo a passo de procedimentos têm números. A faixa de fluxo mostra ordem pelas setas, sem números. |
| Animação de entrada ao rolar | Nenhuma. Só a linha da jornada se anima. |

### O que mudou nesta revisão

1. **Topo da central do RH.** O primeiro rascunho tinha quatro cartões de indicador (casos ativos,
   lead time, pendências, automações). Virou uma faixa de fluxo única com o lead time na mesma linha
   do título, e as automações viraram uma lista lateral. Motivo: grade de cartões idênticos.
2. **Títulos de seção.** O rascunho usava rótulos pequenos em caixa alta acima dos títulos
   ("FLUXO DO ONBOARDING"). Viraram títulos de 20 px em frase. Motivo: rótulo-sobrancelha e caixa alta.
3. **Botão do próximo passo.** "Preencher ficha →" perdeu a seta; o verbo basta.
4. **Metadados do caso.** "PJ · Analista · em 14 dias" virou linha de definição (regime, cargo,
   início) no cabeçalho do caso e colunas na tabela. Motivo: metadados com ponto médio.
5. **Horários na linha do tempo.** O rascunho usava fonte monoespaçada; ficou Montserrat com números
   tabulares.
6. **Faixa de fluxo numerada.** As caixas tinham "01", "02"… Os números saíram; a sequência é dada
   pelas setas, e só a jornada do new joiner é numerada para leitores de tela.
7. **Gargalo.** O rascunho marcava o gargalo só com fundo `signal`. Como `signal` é reservado a
   "você está aqui" e "depende de você", o gargalo ganhou borda de 2 px, ícone de alerta e a palavra
   "gargalo".
8. **Ícones nas abas.** O primeiro cabeçalho tinha ícone em cada aba. Com sete abas e os selos "Beta" e
   "Em breve", a faixa não cabia em 1.280 px e escondia "Onboarding" atrás da rolagem. As abas ficaram
   só com texto (cabem em 1.200 px); abaixo disso, a faixa rola com a aba ativa centralizada.
