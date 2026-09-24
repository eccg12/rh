import "server-only";

/**
 * Busca dos trechos (seção 10.2, item 2). A resposta só sai da base quando o melhor resultado
 * (1) passa de `MIN_SCORE`, (2) cobre a maior parte dos termos da pergunta e (3) trata do assunto:
 * algum termo aparece no título, nas tags ou no resumo, não só no meio do texto. Senão,
 * encaminhamento. Os limites foram calibrados nos testes (__tests__/retrieve.test.ts).
 */
import type { AssistantIndex, KnowledgeDoc } from "./index";
import { queryTerms, stripGreetings } from "./text";

/**
 * Pontuação mínima do melhor trecho, por termo da pergunta. A pontuação do MiniSearch soma os
 * termos; dividir pelo número de termos deixa o limite estável para perguntas curtas e longas.
 */
export const MIN_SCORE = 6;
/** Fração mínima dos termos da pergunta presentes no melhor trecho. */
export const MIN_COVERAGE = 0.6;
/** Trechos entregues ao modelo (seção 10.2, item 2). */
export const MAX_HITS = 4;

export interface RetrievalHit {
  doc: KnowledgeDoc;
  score: number;
  /** Termos da pergunta encontrados neste trecho. */
  matched: string[];
  coverage: number;
  /** Algum termo bateu no título, nas tags ou no resumo (o trecho trata do assunto). */
  onTopic: boolean;
}

export interface Retrieval {
  terms: string[];
  hits: RetrievalHit[];
  confident: boolean;
  reason: "sem_termos" | "sem_resultado" | "pontuacao_baixa" | "cobertura_baixa" | "fora_do_assunto" | "ok";
}

export function retrieve(index: AssistantIndex, question: string, limit = MAX_HITS): Retrieval {
  const cleaned = stripGreetings(question);
  const terms = queryTerms(cleaned);
  if (terms.length === 0) return { terms, hits: [], confident: false, reason: "sem_termos" };

  const hits = index.search
    .search(cleaned)
    .slice(0, limit)
    .map<RetrievalHit | null>((r) => {
      const doc = index.docs.get(String(r.id));
      if (!doc) return null;
      const matched = [...new Set(r.queryTerms)].filter((t) => terms.includes(t));
      const onTopic = Object.values(r.match).some((fields) => fields.some((f) => f !== "body"));
      return { doc, score: r.score, matched, coverage: matched.length / terms.length, onTopic };
    })
    .filter((h): h is RetrievalHit => !!h);

  const top = hits[0];
  if (!top) return { terms, hits, confident: false, reason: "sem_resultado" };
  if (top.score / terms.length < MIN_SCORE) return { terms, hits, confident: false, reason: "pontuacao_baixa" };
  if (top.coverage < MIN_COVERAGE) return { terms, hits, confident: false, reason: "cobertura_baixa" };
  if (!top.onTopic) return { terms, hits, confident: false, reason: "fora_do_assunto" };
  return { terms, hits, confident: true, reason: "ok" };
}

/** Fontes exibidas: o melhor trecho e os que chegam perto dele (até 3). */
export function sourceHits(retrieval: Retrieval): RetrievalHit[] {
  const top = retrieval.hits[0];
  if (!top) return [];
  return retrieval.hits.filter((h, i) => i === 0 || (h.score >= top.score * 0.5 && h.coverage >= MIN_COVERAGE)).slice(0, 3);
}

/**
 * Trecho de até ~1.500 caracteres (seção 10.2, item 3): o primeiro bloco do documento e os blocos
 * com mais termos da pergunta, na ordem original.
 */
export function excerptFor(doc: KnowledgeDoc, terms: string[], max = 1500): string {
  if (doc.bodyMd.length <= max) return doc.bodyMd;
  const blocks = doc.bodyMd.split(/\n\s*\n/).map((text, i) => ({ text: text.trim(), i }));
  const scoreOf = (text: string) => {
    const words = new Set(queryTerms(text));
    return terms.filter((t) => [...words].some((w) => w.startsWith(t))).length;
  };
  // Títulos de seção andam com o bloco seguinte.
  const units: { text: string; i: number; score: number }[] = [];
  for (let k = 0; k < blocks.length; k++) {
    const b = blocks[k]!;
    if (!b.text) continue;
    if (/^#+\s/.test(b.text) && blocks[k + 1]) {
      const next = blocks[k + 1]!;
      const text = `${b.text}\n\n${next.text}`;
      units.push({ text, i: b.i, score: scoreOf(text) });
      k++;
    } else {
      units.push({ text: b.text, i: b.i, score: scoreOf(b.text) });
    }
  }
  const chosen = new Set<number>();
  let size = 0;
  const first = units[0];
  if (first) {
    chosen.add(first.i);
    size += first.text.length;
  }
  for (const unit of [...units].sort((a, b) => b.score - a.score || a.i - b.i)) {
    if (chosen.has(unit.i) || unit.score === 0) continue;
    if (size + unit.text.length > max) continue;
    chosen.add(unit.i);
    size += unit.text.length;
  }
  return units
    .filter((u) => chosen.has(u.i))
    .map((u) => u.text)
    .join("\n\n")
    .slice(0, max);
}
