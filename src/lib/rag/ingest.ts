import { randomUUID } from "crypto";
import { embedTexts } from "../embeddings";
import type { KnowledgeChunk, PageEntry, QaEntry } from "../types";
import { loadStore, saveStore, setChunks } from "./store";

function chunkText(text: string, maxLen = 800): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];
  const parts: string[] = [];
  let i = 0;
  while (i < cleaned.length) {
    parts.push(cleaned.slice(i, i + maxLen));
    i += maxLen - 80;
  }
  return parts;
}

export async function rebuildIndex(): Promise<{ chunkCount: number }> {
  const store = await loadStore();
  const draft: Omit<KnowledgeChunk, "embedding">[] = [];

  for (const faq of store.faqs) {
    draft.push({
      id: `qa-${faq.id}`,
      type: "qa",
      title: faq.question,
      text: `Q: ${faq.question}\nA: ${faq.answer}${faq.product ? `\nProduct: ${faq.product}` : ""}`,
      meta: {
        product: faq.product ?? "",
        tags: (faq.tags ?? []).join(", "),
      },
    });
  }

  for (const page of store.pages) {
    const pageText = [
      page.title,
      page.description,
      ...(page.keywords ?? []),
    ]
      .filter(Boolean)
      .join(" ");
    draft.push({
      id: `page-${page.id}`,
      type: "page",
      title: page.title,
      text: pageText,
      url: page.url,
      hash: page.hash,
      meta: { keywords: (page.keywords ?? []).join(", ") },
    });

    // Detailed scanned body
    if (page.content?.trim()) {
      for (const [i, part] of chunkText(page.content).entries()) {
        draft.push({
          id: `snippet-${page.id}-body-${i}`,
          type: "snippet",
          title: page.title,
          text: part,
          url: page.url,
          hash: page.hash,
          meta: { source: "scan" },
        });
      }
    }

    // Per-section chunks (better navigation to #anchors)
    for (const section of page.sections ?? []) {
      const text = `${section.title}. ${section.text}`.trim();
      if (!text) continue;
      draft.push({
        id: `snippet-${page.id}-sec-${section.id}`,
        type: "snippet",
        title: `${page.title} — ${section.title}`,
        text: text.slice(0, 2000),
        url: page.url,
        hash: `#${section.id.replace(/^#/, "")}`,
        meta: { source: "section" },
      });
    }
  }

  // Keep every FAQ; allow a large page/snippet budget for the full YGIA catalog
  const faqs = draft.filter((d) => d.type === "qa");
  const rest = draft.filter((d) => d.type !== "qa").slice(0, 1600);
  const limited = [...faqs, ...rest];
  const texts = limited.map((d) => d.text);
  const embeddings = await embedTexts(texts);
  const chunks: KnowledgeChunk[] = limited.map((d, i) => ({
    ...d,
    embedding: embeddings[i]!,
  }));

  await setChunks(chunks);
  return { chunkCount: chunks.length };
}

export function parseFaqUpload(raw: string): QaEntry[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed) as Array<{
      question?: string;
      q?: string;
      answer?: string;
      a?: string;
      product?: string;
      tags?: string[];
    }>;
    return data
      .map((row) => ({
        id: randomUUID(),
        question: String(row.question ?? row.q ?? "").trim(),
        answer: String(row.answer ?? row.a ?? "").trim(),
        product: row.product,
        tags: row.tags,
      }))
      .filter((r) => r.question && r.answer);
  }

  if (trimmed.includes(",") && !trimmed.startsWith("#")) {
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    const start = lines[0]!.toLowerCase().includes("question") ? 1 : 0;
    const faqs: QaEntry[] = [];
    for (let i = start; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i]!);
      if (cols.length < 2) continue;
      faqs.push({
        id: randomUUID(),
        question: cols[0]!.trim(),
        answer: cols[1]!.trim(),
        product: cols[2]?.trim() || undefined,
      });
    }
    return faqs.filter((f) => f.question && f.answer);
  }

  const faqs: QaEntry[] = [];
  const blocks = trimmed.split(/\n(?=Q:|##\s)/i);
  for (const block of blocks) {
    const qMatch = block.match(/(?:^|\n)(?:Q:|##)\s*(.+)/i);
    const aMatch = block.match(/(?:^|\n)A:\s*([\s\S]+)/i);
    if (qMatch && aMatch) {
      faqs.push({
        id: randomUUID(),
        question: qMatch[1]!.trim(),
        answer: aMatch[1]!.trim(),
      });
    }
  }
  return faqs;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export async function ingestFaqsFromText(raw: string): Promise<{ count: number }> {
  const faqs = parseFaqUpload(raw);
  const store = await loadStore();
  store.faqs = [...store.faqs, ...faqs];
  await saveStore(store);
  await rebuildIndex();
  return { count: faqs.length };
}

export async function replacePages(pages: PageEntry[]): Promise<void> {
  const store = await loadStore();
  store.pages = pages;
  await saveStore(store);
  await rebuildIndex();
}
