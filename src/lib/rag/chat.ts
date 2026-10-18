import { detectLanguage, type AppLanguage } from "../language";
import { embedText, lexicalOverlap } from "../embeddings";
import { hasNvidia, nvidiaChatCompletion } from "../nvidia";
import type { ChatResponse, KnowledgeChunk, NavigationTarget, PageEntry } from "../types";
import { loadStore, searchChunks } from "./store";

function normalizePath(url: string): string {
  try {
    if (url.startsWith("http")) {
      return new URL(url).pathname.replace(/\/$/, "") || "/";
    }
  } catch {
    /* ignore */
  }
  const path = url.split("#")[0].split("?")[0];
  return path.replace(/\/$/, "") || "/";
}

function chunkLanguage(text: string): AppLanguage {
  return detectLanguage(text);
}

function resolveNavigation(
  pages: PageEntry[],
  hits: Array<KnowledgeChunk & { score: number }>,
  lang: AppLanguage,
  proposed?: { url?: string; hash?: string; label?: string } | null,
): NavigationTarget | null {
  const allowed = new Map(
    pages.map((p) => [normalizePath(p.url), p] as const),
  );

  if (proposed?.url) {
    const page = allowed.get(normalizePath(proposed.url));
    if (page) {
      return {
        url: page.url,
        hash: proposed.hash || page.hash,
        label:
          proposed.label ||
          page.title ||
          (lang === "el" ? "Άνοιγμα σελίδας" : "Open page"),
      };
    }
  }

  const topPage = hits.find((h) => h.type === "page" && h.score > 0.22);
  if (topPage?.url) {
    const page = allowed.get(normalizePath(topPage.url));
    if (page) {
      return {
        url: page.url,
        hash: topPage.hash || page.hash,
        label: page.title,
      };
    }
  }

  for (const hit of hits) {
    if (!hit.url) continue;
    const page = allowed.get(normalizePath(hit.url));
    if (page && hit.score > 0.22) {
      return {
        url: page.url,
        hash: hit.hash || page.hash,
        label: page.title,
      };
    }
  }

  const hinted = pageForProductHint(
    pages,
    hits.map((h) => `${h.title} ${h.text}`).join("\n"),
  );
  if (hinted) {
    return {
      url: hinted.url,
      hash: hinted.hash,
      label: hinted.title,
    };
  }

  return null;
}

function pageForProductHint(
  pages: PageEntry[],
  text: string,
): PageEntry | undefined {
  const t = text.toLowerCase();
  return pages.find((p) => {
    const title = p.title.toLowerCase().split(/[\/|]/)[0].trim();
    if (title.length > 3 && t.includes(title)) return true;
    if (t.includes("serum") && p.url.includes("serum")) return true;
    if (
      (t.includes("cream") || t.includes("night") || t.includes("κρεμ")) &&
      p.url.includes("cream")
    )
      return true;
    return (p.keywords ?? []).some(
      (k) => k.length > 3 && t.includes(k.toLowerCase()),
    );
  });
}

function extractAnswer(chunk: KnowledgeChunk, lang: AppLanguage): string {
  let answer = chunk.text;
  const aMatch = chunk.text.match(/\nA:\s*([\s\S]+)/i);
  if (aMatch) answer = aMatch[1].trim();
  answer = answer.replace(/\nProduct:\s*.+$/i, "").trim();

  if (chunk.type === "page") {
    const desc =
      chunk.text
        .split(/\n/)
        .map((s) => s.trim())
        .find((s) => s.length > 35) || chunk.title;
    const sentences = desc.split(/(?<=[.!?·])\s+/);
    const preferred =
      sentences.find((s) => detectLanguage(s) === lang) ||
      sentences[0] ||
      chunk.title;
    answer =
      lang === "el"
        ? `Για το ${chunk.title.split("/")[0]!.trim()}: ${preferred}`
        : `About ${chunk.title.split("/")[0]!.trim()}: ${preferred}`;
  }

  if (answer.length > 420) answer = `${answer.slice(0, 400).trim()}…`;
  return answer;
}

async function rankHits(question: string) {
  const queryEmbedding = await embedText(question);
  const rawHits = await searchChunks(queryEmbedding, 10);
  const lang = detectLanguage(question);
  return rawHits
    .map((h) => {
      const lex = lexicalOverlap(question, `${h.title} ${h.text}`);
      const langBoost =
        h.type === "qa" && chunkLanguage(`${h.title} ${h.text}`) === lang
          ? 0.12
          : 0;
      const qaBoost = h.type === "qa" ? 0.06 : 0;
      return {
        ...h,
        score: h.score * 0.65 + lex * 0.35 + langBoost + qaBoost,
      };
    })
    .sort((a, b) => b.score - a.score);
}

async function localAnswer(
  question: string,
  pages: PageEntry[],
  lang: AppLanguage,
): Promise<ChatResponse> {
  const hits = await rankHits(question);
  const bestQa = hits.find((h) => h.type === "qa");
  const best =
    bestQa && hits[0] && bestQa.score >= hits[0].score - 0.05
      ? bestQa
      : hits[0];

  if (!best || best.score < 0.16) {
    return {
      answer:
        lang === "el"
          ? "Μπορώ να βοηθήσω με προϊόντα, συστατικά, αποστολές και επιστροφές. Πείτε μου λίγο πιο συγκεκριμένα τι χρειάζεστε."
          : "I can help with products, ingredients, shipping, and returns. Tell me a bit more specifically what you need.",
      navigation: null,
      language: lang,
      sources: [],
    };
  }

  let chosen = best;
  if (chosen.type === "qa" && chunkLanguage(chosen.text) !== lang) {
    const sameLang = hits.find(
      (h) =>
        h.type === "qa" &&
        chunkLanguage(`${h.title} ${h.text}`) === lang &&
        h.score >= best.score - 0.15,
    );
    if (sameLang) chosen = sameLang;
  }

  const answerBody = extractAnswer(chosen, lang);
  const navigation = resolveNavigation(pages, hits, lang);
  const navCue = navigation
    ? lang === "el"
      ? " Σας ανοίγω τη σχετική σελίδα."
      : " I am opening the related page for you."
    : "";

  return {
    answer: `${answerBody}${navCue}`,
    navigation,
    language: lang,
    sources: hits.slice(0, 3).map((h) => ({ title: h.title, url: h.url })),
  };
}

function extractJsonObject(raw: string): {
  answer?: string;
  navigation?: { url?: string; hash?: string; label?: string } | null;
} {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    return { answer: trimmed, navigation: null };
  }
}

async function nvidiaAnswer(opts: {
  question: string;
  currentUrl?: string;
  lang: AppLanguage;
  pages: PageEntry[];
}): Promise<ChatResponse> {
  const { question, currentUrl, lang, pages } = opts;
  const hits = await rankHits(question);

  const context = hits
    .slice(0, 8)
    .map(
      (h, i) =>
        `[${i + 1}] (${h.type}) ${h.title}\nURL: ${h.url ?? "n/a"}${h.hash ?? ""}\n${h.text}`,
    )
    .join("\n\n");

  const pageCatalog = pages
    .map((p) => `- ${p.title}: ${p.url}${p.hash ?? ""} — ${p.description}`)
    .join("\n");

  const languageRule =
    lang === "el"
      ? "Reply in fluent natural Modern Greek (ελληνικά), speakable on a phone."
      : "Reply in fluent natural English, speakable on a phone.";

  const system = `You are a helpful website voice assistant for a shop. Customers ask the same things they would call about.

Rules:
1. Use ONLY the knowledge below. Do not invent prices, policies, or pages.
2. Sound warm and human, 2–4 short sentences (good for text-to-speech).
3. If a page would help, pick ONE URL from the page catalog. Never invent URLs.
4. If unsure, say so briefly and ask one clarifying question; navigation=null.
5. ${languageRule}
Current page: ${currentUrl ?? "unknown"}

Page catalog:
${pageCatalog || "(empty)"}

Knowledge:
${context || "(no matches)"}

Return ONLY valid JSON (no markdown):
{"answer":"...","navigation":{"url":"/path","hash":"#optional","label":"..."}|null,"language":"${lang}"}`;

  const raw = await nvidiaChatCompletion({
    system,
    user: question,
    temperature: 0.4,
  });
  const parsed = extractJsonObject(raw);

  const fallback =
    lang === "el"
      ? "Δεν είμαι σίγουρος ακόμα. Ρωτήστε με για προϊόν, αποστολές ή επιστροφές."
      : "I am not sure about that yet. Try asking about a product, shipping, or returns.";

  return {
    answer: parsed.answer?.trim() || fallback,
    navigation: resolveNavigation(pages, hits, lang, parsed.navigation),
    language: lang,
    sources: hits.slice(0, 3).map((h) => ({ title: h.title, url: h.url })),
  };
}

export async function answerQuestion(opts: {
  question: string;
  currentUrl?: string;
}): Promise<ChatResponse> {
  const { question, currentUrl } = opts;
  const lang = detectLanguage(question);
  const store = await loadStore();

  if (hasNvidia()) {
    try {
      return await nvidiaAnswer({
        question,
        currentUrl,
        lang,
        pages: store.pages,
      });
    } catch (err) {
      console.error("NVIDIA chat failed, using local FAQ matcher:", err);
      return localAnswer(question, store.pages, lang);
    }
  }

  return localAnswer(question, store.pages, lang);
}
