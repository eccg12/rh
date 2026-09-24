/**
 * Normalização de texto para o índice do assistente (seção 10.1): minúsculas, sem acento,
 * stopwords curtas em português e um radicalizador leve (plural e sufixos comuns), para que
 * "lanço", "lançar" e "lançamento" caiam no mesmo termo.
 */

export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Palavras sem valor de busca (já normalizadas). "ti" fica de fora: é a área de TI. */
export const STOPWORDS = new Set(
  `a o as os um uma uns umas de da das do dos d em na nas no nos num numa ao aos a
  por pra pro pras pros para pelo pela pelos pelas com sem sob sobre entre ate apos antes depois
  e ou mas nem que se como quando onde qual quais quanto quanta quantos quantas quem cujo porque pq
  eu me mim comigo meu minha meus minhas voce voces vc tu te seu sua seus suas
  nosso nossa nossos nossas ele ela eles elas lhe lhes dele dela deles delas
  isso isto esse essa esses essas este esta estes estas aquele aquela aquilo
  eh sao ser sera seria estar estou estao estava foi fui sou era
  ter tem tenho temos tinha ha havia fazer faco faz fazem feito
  posso pode podem poderia podemos preciso precisa precisam precisamos precisar
  devo deve devem devemos quero queria gostaria consigo consegue conseguir
  saber sei sabe ja nao sim mais menos muito muita pouco tambem so ainda entao agora
  algum alguma alguns algumas todo toda todos todas cada outro outra outros outras
  falo falar fala falamos alguem aqui ali la qualquer vou vai fica ficar existe existem
  funciona funcionam funcionar uso usar usa usam usando diz dizem dizer cuida cuidam cuidar cuido
  peco pede pedir monoda
  oi ola bom boa tarde noite tudo bem beleza obrigado obrigada valeu ok okay favor`
    .split(/\s+/)
    .filter(Boolean),
);

const SUFFIXES: { suffix: string; min: number }[] = [
  { suffix: "amento", min: 3 },
  { suffix: "imento", min: 3 },
  { suffix: "mente", min: 3 },
  { suffix: "acao", min: 3 },
  { suffix: "icao", min: 3 },
  { suffix: "avel", min: 3 },
  { suffix: "ivel", min: 3 },
  { suffix: "cao", min: 3 },
  { suffix: "ando", min: 3 },
  { suffix: "endo", min: 3 },
  { suffix: "indo", min: 3 },
  { suffix: "ado", min: 4 },
  { suffix: "ada", min: 4 },
  { suffix: "ido", min: 4 },
  { suffix: "ida", min: 4 },
  { suffix: "ar", min: 3 },
  { suffix: "er", min: 3 },
  { suffix: "ir", min: 3 },
  { suffix: "a", min: 4 },
  { suffix: "e", min: 4 },
  { suffix: "o", min: 4 },
];

/** Radicais que o corte de sufixo não une sozinho ("viajar" e "viagem"). */
const SAME_ROOT: Record<string, string> = { viaj: "viagem" };

/** Radicalizador leve: remove plural e um sufixo, mantendo ao menos 3 ou 4 letras. */
export function stem(word: string): string {
  const w = stripSuffix(word);
  return SAME_ROOT[w] ?? w;
}

function stripSuffix(word: string): string {
  let w = word;
  if (w.length <= 3) return w;
  if (w.endsWith("oes") || w.endsWith("aes")) w = `${w.slice(0, -3)}ao`;
  else if (w.endsWith("ais")) w = `${w.slice(0, -2)}l`;
  else if (w.endsWith("eis")) w = `${w.slice(0, -3)}el`;
  else if (w.endsWith("ns")) w = `${w.slice(0, -2)}m`;
  else if (w.endsWith("res") && w.length > 5) w = w.slice(0, -2);
  else if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) w = w.slice(0, -1);
  for (const { suffix, min } of SUFFIXES) {
    if (w.endsWith(suffix) && w.length - suffix.length >= min) return w.slice(0, -suffix.length);
  }
  return w;
}

/** Quebra em palavras (letras e números, sem acento). */
export function tokenize(text: string): string[] {
  return normalizeText(text).split(/[^a-z0-9]+/).filter(Boolean);
}

/** Termo pronto para o índice, ou `null` se não tem valor de busca. */
export function processTerm(term: string): string | null {
  const t = normalizeText(term);
  if (!t || STOPWORDS.has(t) || /^\d+$/.test(t) || t.length < 2) return null;
  return stem(t);
}

/** Tira cumprimentos compostos ("bom dia") para não confundir com "primeiro dia". */
export function stripGreetings(text: string): string {
  return text.replace(/\b(bom\s+dia|boa\s+tarde|boa\s+noite)\b/gi, " ");
}

/** Termos significativos (únicos, na ordem) de uma pergunta. */
export function queryTerms(text: string): string[] {
  const out: string[] = [];
  for (const token of tokenize(stripGreetings(text))) {
    const term = processTerm(token);
    if (term && !out.includes(term)) out.push(term);
  }
  return out;
}

const THANKS = /\b(obrigad[oa]|valeu|agradec)/;

/** Pergunta sem termos de busca: cumprimento, agradecimento ou algo vago demais. */
export function smallTalkKind(text: string): "agradecimento" | "cumprimento" | null {
  if (queryTerms(text).length > 0) return null;
  return THANKS.test(normalizeText(text)) ? "agradecimento" : "cumprimento";
}
