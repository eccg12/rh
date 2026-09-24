# Roteiro da demo — Monoda People (Fase 0)

Cerca de 13 minutos. Cada passo abaixo foi verificado de ponta a ponta no navegador, sem reiniciar o
servidor (seção 15 do plano).

## Preparação

1. `pnpm install && pnpm dev` (ou `pnpm build && pnpm start`). Nenhuma variável é necessária.
2. Opcional: `LLM_API_KEY` no `.env.local` para respostas escritas pelo modelo. Sem chave, o
   assistente responde em modo local, com o texto da base e a fonte.
3. Abrir http://localhost:3000. Botão **Demo** (canto inferior esquerdo) → **Restaurar dados
   iniciais** → confirmar.
4. Persona **Thiago Stepanoff** (seletor "Ver como", no topo) e aba **Onboarding** aberta.

Dica: o seletor "Ver como" e o painel Demo trocam de persona a qualquer momento. Os links dos e-mails
da caixa de saída também trocam a persona para o destinatário.

## 1. O problema (1 min)

Hoje tudo passa pelo Thiago e cada new joiner tem uma experiência diferente. O combinado: tirar do
colo do RH e fazer da entrada na Monoda uma experiência.

## 2. Visão do RH (2 min)

Na **Central de onboarding**:

- **Fluxo do onboarding**: tempo médio em cada etapa, lead time e o gargalo marcado em **Cadastro e
  documentos**, exatamente onde a automação e, depois, o agente revisor atacam.
- **Depende de você**: só o que precisa de decisão humana, com o verbo da ação em cada linha.
- **Automações nos últimos 30 dias**: o contador de ações automáticas e as mais recentes.

## 3. Cadastro ao vivo (1 min)

1. **Cadastrar new joiner**: Ana Beatriz Moura, e-mail pessoal `ana.moura@pessoal.example`, PJ,
   cargo Analista, início em 14 dias (padrão), gestor Alessandro Benetti, precisa de notebook,
   contrato pelo modelo padrão.
2. **Revisar cadastro** → **Cadastrar e enviar boas-vindas**. O toast confirma o envio com o e-mail
   mascarado ("ana…@…").
3. Engrenagem (Admin) → **Caixa de saída** → e-mail "Boas-vindas à Monoda, Ana" → **Acessar meu
   portal**. A persona vira a Ana.

## 4. Jornada da Ana (4 min)

1. Tela de boas-vindas: a linha da jornada se desenha, com o tempo estimado e quem acompanha.
   **Começar**.
2. **Preencher ficha** → **Preencher com dados de exemplo** (atalho de demo, contorno tracejado) →
   **Enviar ficha**.
3. Documentos → **Simular envio de todos**. Voltando para a jornada, o vídeo de compliance já está
   liberado e o e-mail saiu sozinho (mostre na caixa de saída, como Thiago, se quiser).
4. Compliance → **Simular vídeo assistido** → **Começar o quiz**. Erre a primeira de propósito: com
   80% a Ana passa e vê a explicação da resposta errada. **Continuar** → aceitar o Código de Conduta.
   O comprovante de treinamento aparece com código, nota e versões.
5. Políticas e benefícios: aceitar as três políticas e **Confirmar ciência** dos benefícios.

## 5. O outro lado (1 min)

Para ganhar tempo, os casos semeados:

- Como **Rafael Nogueira**: etapa Contrato → marcar "Li e concordo" → **Assinar contrato**.
- Como **Juliana Prado**: etapa Equipamentos e acessos → **Ler e aceitar termo** → **Aceitar termo**.
- Como **Thiago**: caso da Juliana → aba **Equipamentos e acessos** → **Marcar como liberado** no
  último acesso. O e-mail "Seus acessos estão prontos" sai sozinho (caixa de saída e linha do tempo,
  com o raio e a palavra "automático").

## 6. Assistente (2 min)

1. Aba **Assistente** → "Como lanço uma despesa de viagem no VExpenses?": resposta com o passo a
   passo e a fonte, que abre o artigo no painel lateral.
2. "Posso levar meu cachorro para o escritório?": fora da base, o assistente indica o Thiago (temas e
   canal, com **Copiar pergunta**) e registra a lacuna.
3. Na lateral, **Lacunas da base** (visão do RH) abre o Admin com a pergunta registrada e o botão
   **Criar artigo a partir desta pergunta**.

## 7. Sem se amarrar (1 min)

1. Admin → **Benefícios** → **Trocar provedor**: Bradesco Saúde por SulAmérica (provedor, resumo e
   como usar). Perguntar ao assistente "Qual é o nosso plano de saúde?": a resposta já é a nova.
2. Admin → **Políticas** → Política de Viagens → **Publicar nova versão** (o que mudou). Em
   **Políticas e benefícios**, a matriz de aceites mostra o re-aceite pendente para todos que tinham
   aceitado a versão anterior.

## 8. O que vem (1 min)

Abas **Despesas e viagens**, **Rotina e apontamento** (beta) e **PDI** (em breve); o roadmap em
`docs/ROADMAP.md` e os próximos passos: mapear o processo real com o Thiago e ouvir new joiners
recentes.

## Plano B

Se algo travar: painel **Demo** → **Restaurar dados iniciais** e seguir com **Bruno Almeida**, que
está no ponto zero (cadastrado ontem, ficha ainda não enviada).
