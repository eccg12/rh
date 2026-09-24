/**
 * Resposta do modo local (seção 10.2, item 4): o parágrafo que responde, o passo a passo quando o
 * trecho tem lista e a observação logo depois dela. Nada é inventado: tudo sai do trecho.
 */
import { queryTerms } from "./text";

type BlockType = "heading" | "ordered" | "bullets" | "paragraph";

interface Block {
  type: BlockType;
  text: string;
  items: string[];
  index: number;
}

const ORDERED = /^\s*\d+[.)]\s+/;
const BULLET = /^\s*[-*]\s+/;

/** Blocos do Markdown; uma lista colada ao parágrafo que a apresenta vira bloco próprio. */
export function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const push = (type: BlockType, lines: string[]) => {
    if (!lines.length) return;
    const index = blocks.length;
    if (type === "ordered") blocks.push({ type, text: lines.join("\n"), items: lines.map((l) => l.replace(ORDERED, "")), index });
    else if (type === "bullets") blocks.push({ type, text: lines.join("\n"), items: lines.map((l) => l.replace(BULLET, "")), index });
    else if (type === "heading") blocks.push({ type, text: lines.join(" ").replace(/^#+\s*/, ""), items: [], index });
    else blocks.push({ type, text: lines.join(" "), items: [], index });
  };
  for (const raw of md.split(/\n\s*\n/)) {
    let type: BlockType | undefined;
    let lines: string[] = [];
    for (const line of raw.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const lineType: BlockType = /^#+\s/.test(line)
        ? "heading"
        : ORDERED.test(line)
          ? "ordered"
          : BULLET.test(line)
            ? "bullets"
            : "paragraph";
      if (lineType !== type || lineType === "heading") {
        if (type) push(type, lines);
        type = lineType;
        lines = [];
      }
      lines.push(line);
    }
    if (type) push(type, lines);
  }
  return blocks;
}

function hits(text: string, terms: string[]): number {
  const words = queryTerms(text);
  return terms.filter((t) => words.some((w) => w.startsWith(t))).length;
}

const MAX_ORDERED = 8;
const MAX_BULLETS = 8;
const MAX_NOTE = 240;

export interface ComposeOptions {
  /** Artigos e benefícios abrem com a resposta direta: manter o primeiro parágrafo. */
  preferFirst?: boolean;
  /** Políticas são longas e divididas em seções: não misturar seções. */
  sectionBound?: boolean;
}

function isList(block: Block | undefined): block is Block {
  return !!block && (block.type === "ordered" || block.type === "bullets");
}

function formatBlock(block: Block): string {
  if (block.type === "ordered") return block.items.slice(0, MAX_ORDERED).map((item, i) => `${i + 1}. ${item}`).join("\n");
  if (block.type === "bullets") return block.items.slice(0, MAX_BULLETS).map((item) => `- ${item}`).join("\n");
  return block.text;
}

const MAX_SECTION_ANSWER = 900;

/**
 * Documento dividido em seções (políticas): responde com a seção que mais trata da pergunta,
 * com o título dela em negrito. Pergunta geral cai na primeira seção, seguida da próxima quando
 * as duas cabem juntas.
 */
function composeFromSections(blocks: Block[], terms: string[]): string {
  const sections: { heading: string; blocks: Block[] }[] = [];
  for (const b of blocks) {
    if (b.type === "heading") sections.push({ heading: b.text, blocks: [] });
    else if (sections.length === 0) sections.push({ heading: "", blocks: [b] });
    else sections.at(-1)!.blocks.push(b);
  }
  const filled = sections.filter((sec) => sec.blocks.length > 0);
  // Primeiro quantos termos distintos a seção cobre; o título desempata.
  const score = (sec: { heading: string; blocks: Block[] }) =>
    3 * hits(`${sec.heading} ${sec.blocks.map((b) => b.text).join(" ")}`, terms) + hits(sec.heading, terms);
  const best = [...filled].sort((a, b) => score(b) - score(a) || filled.indexOf(a) - filled.indexOf(b))[0];
  if (!best) return "";
  const render = (sec: { heading: string; blocks: Block[] }) =>
    [sec.heading ? `**${sec.heading}**` : "", ...sec.blocks.map(formatBlock)].filter(Boolean).join("\n\n");
  let text = render(best);
  const index = filled.indexOf(best);
  const following = filled[index + 1];
  const general = filled.every((sec) => score(sec) <= score(filled[0]!));
  if (index === 0 && general && following) {
    const both = `${text}\n\n${render(following)}`;
    if (both.length <= MAX_SECTION_ANSWER) text = both;
  }
  return text;
}

export function composeLocalAnswer(md: string, terms: string[], options: ComposeOptions = {}): string {
  const blocks = parseBlocks(md);
  if (options.sectionBound && blocks.some((b) => b.type === "heading")) return composeFromSections(blocks, terms);
  const section = new Map<number, string>();
  let heading = "";
  for (const b of blocks) {
    if (b.type === "heading") heading = b.text;
    section.set(b.index, heading);
  }
  // O título da seção pesa mais: "O que mudou…", "Hospedagem", "Como usar".
  const score = (b: Block) => hits(b.text, terms) + 2 * hits(section.get(b.index) ?? "", terms);
  const next = (from: Block, crossHeadings: boolean): Block | undefined => {
    for (const b of blocks.slice(from.index + 1)) {
      if (b.type !== "heading") return b;
      if (!crossHeadings) return undefined;
    }
    return undefined;
  };

  const paragraphs = blocks.filter((b) => b.type === "paragraph");
  const lists = blocks.filter(isList);
  const first = paragraphs[0];
  const best = [...paragraphs].sort((a, b) => score(b) - score(a) || a.index - b.index)[0];
  let lead = first;
  if (best && first && best !== first) {
    const switchToBest = options.preferFirst ? score(first) === 0 && score(best) > 0 : score(best) > score(first);
    if (switchToBest) lead = best;
  }

  // Lista: a que o parágrafo apresenta; fora de políticas, a mais ligada à pergunta ou o passo a passo.
  let list = lead ? next(lead, !options.sectionBound) : undefined;
  if (!isList(list)) list = undefined;
  if (!list && !options.sectionBound) {
    const ranked = [...lists].sort((a, b) => score(b) - score(a) || a.index - b.index)[0];
    list = ranked && score(ranked) > 0 ? ranked : lists.find((b) => b.type === "ordered");
  }
  if (!lead && !list) list = lists[0];

  const parts: string[] = [];
  if (lead) parts.push(lead.text);
  if (list) {
    parts.push(formatBlock(list));
    const note = next(list, false);
    if (note?.type === "paragraph" && note !== lead && note.text.length <= MAX_NOTE) parts.push(note.text);
  }
  return parts.join("\n\n").trim();
}

/** Pedaços de ~3 palavras, para a mesma sensação de streaming do modo LLM. */
export function chunkText(text: string, wordsPerChunk = 3): string[] {
  const words = text.match(/\S+\s*/g) ?? [];
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) chunks.push(words.slice(i, i + wordsPerChunk).join(""));
  return chunks;
}
