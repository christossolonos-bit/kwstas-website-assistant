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

/** Only navigate when the customer clearly asks to open / go to a page. */
function wantsNavigation(question: string): boolean {
  return /\b(take me|show me|open|go to|navigate|bring me|redirect|see the (product )?page|want to (see|buy|order)|σελίδα|σελιδα|άνοιξε|ανοιξε|πήγαιν|πηγαιν|πάρε με|παρε με|δείξε|δειξε|πήγαινε|οδήγησ|θέλω να (δω|ανοίξ|αγοράσ)|θελω να (δω|ανοιξ|αγορασ))/i.test(
    question,
  );
}

function resolveNavigation(
  pages: PageEntry[],
  hits: Array<KnowledgeChunk & { score: number }>,
  lang: AppLanguage,
  question: string,
  proposed?: { url?: string; hash?: string; label?: string } | null,
): NavigationTarget | null {
  // Never invent a page change for a normal Q&A answer
  if (!wantsNavigation(question)) return null;

  const allowed = new Map(
    pages.map((p) => [normalizePath(p.url), p] as const),
  );

  const tryPage = (
    url?: string,
    hash?: string,
    label?: string,
  ): NavigationTarget | null => {
    if (!url) return null;
    const page = allowed.get(normalizePath(url));
    if (!page) return null;
    return {
      url: page.url,
      hash: hash || page.hash,
      label:
        label ||
        page.title ||
        (lang === "el" ? "Άνοιγμα σελίδας" : "Open page"),
    };
  };

  const fromModel = tryPage(proposed?.url, proposed?.hash, proposed?.label);
  if (fromModel) return fromModel;

  // If they asked to open a page but the model omitted URL, use best product/collection hit
  const top = hits.find(
    (h) =>
      h.url &&
      h.score > 0.2 &&
      (/^\/products\//.test(h.url) ||
        /^\/collections\//.test(h.url) ||
        /^\/pages\//.test(h.url) ||
        /^\/policies\//.test(h.url)),
  );
  return tryPage(top?.url, top?.hash, top?.title);
}

const POLICY_RE =
  /\b(ship|shipping|delivery|deliver|return|refund|payment|pay|cod|cash on delivery|contact|phone|cancel|order arrive|αντικαταβολ|αποστολ|επιστροφ|πληρωμ|επικοινων|ακυρω|παραγγελ)/i;

async function rankHits(question: string) {
  const queryEmbedding = await embedText(question);
  const rawHits = await searchChunks(queryEmbedding, 24);
  const policyAsk = POLICY_RE.test(question);
  return rawHits
    .map((h) => {
      const lex = lexicalOverlap(question, `${h.title} ${h.text}`);
      let score = h.score * 0.55 + lex * 0.45;
      // Prefer curated FAQs for call-deflection topics
      if (h.type === "qa") score += policyAsk ? 0.35 : 0.12;
      if (policyAsk && /polic|faq|shipping|refund|return/i.test(h.url ?? "")) {
        score += 0.15;
      }
      return { ...h, score };
    })
    .sort((a, b) => b.score - a.score);
}

function extractJsonObject(raw: string): {
  answer?: string;
  navigation?: { url?: string; hash?: string; label?: string } | null;
  language?: string;
} {
  let trimmed = raw.trim();
  // Strip common wrappers from reasoning models
  trimmed = trimmed
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();

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
    return { answer: trimmed.replace(/\{[\s\S]*$/, "").trim() || trimmed, navigation: null };
  }
}

async function nvidiaAnswer(opts: {
  question: string;
  currentUrl?: string;
  lang: AppLanguage;
  pages: PageEntry[];
  faqs: Array<{ question: string; answer: string }>;
}): Promise<ChatResponse> {
  const { question, currentUrl, lang, pages, faqs } = opts;
  const hits = await rankHits(question);

  const context = hits
    .slice(0, 8)
    .map(
      (h, i) =>
        `[${i + 1}] (${h.type}) ${h.title}\nURL: ${h.url ?? "n/a"}${h.hash ?? ""}\n${h.text}`,
    )
    .join("\n\n");

  // Always give the model the full curated FAQ set (small, high-value for call deflection)
  const faqBlock = faqs
    .map((f, i) => `FAQ ${i + 1}\nQ: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  // Keep catalog short: hit pages + policy/home/collection pages
  const hitUrls = new Set(
    hits
      .map((h) => (h.url ? normalizePath(h.url) : ""))
      .filter(Boolean),
  );
  const catalogPages = pages.filter((p) => {
    const path = normalizePath(p.url);
    if (hitUrls.has(path)) return true;
    if (/^\/(policies|pages|collections)\b/.test(path) || path === "/") return true;
    return false;
  });
  // If still thin, add a few product titles that lexically match the question
  const extraProducts = pages
    .filter((p) => p.url.startsWith("/products/"))
    .map((p) => ({
      p,
      score: lexicalOverlap(question, `${p.title} ${p.description} ${p.keywords?.join(" ") ?? ""}`),
    }))
    .filter((x) => x.score > 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.p);
  const seen = new Set(catalogPages.map((p) => p.url));
  for (const p of extraProducts) {
    if (!seen.has(p.url)) {
      catalogPages.push(p);
      seen.add(p.url);
    }
  }

  const pageCatalog = catalogPages
    .map((p) => {
      const snippet = (p.description || "").replace(/\s+/g, " ").slice(0, 140);
      return `- ${p.title}: ${p.url}${p.hash ?? ""} — ${snippet}`;
    })
    .join("\n");

  const languageRule =
    lang === "el"
      ? "Answer in fluent, natural Modern Greek (ελληνικά) — warm and conversational, like a helpful shop person on the phone."
      : "Answer in fluent, natural English — warm and conversational, like a helpful shop person on the phone.";

  const system = `You are the full AI voice assistant for YGIA Natural Health (ygianaturalhealth.com) — herbal supplements by herbalist Costas Argyrides. Customers talk to you instead of calling the shop.

Your job:
1. Understand natural, messy questions in Greek or English about products, benefits, shipping, returns, payments, and contact.
2. Answer using OFFICIAL FAQs first for shipping, returns, payments, COD/αντικαταβολή, contact, and cancellations — use those exact facts (times, prices, emails, phone). Then use product knowledge for catalog questions (names, prices, stock, ingredients, collections/categories).
3. Sound human: 2–5 short spoken sentences (TTS). No bullet lists, no markdown. Never say you "don't have" a policy detail if it appears in the FAQ block. If they ask for a category (sleep, joints, immune, women's health, etc.), name a few matching products — do NOT change page unless they ask.
4. Navigation is OPT-IN only. Set "navigation" to null for normal questions (price, shipping, what is X, recommendations). ONLY set navigation when they clearly ask to open/go to/show/take them to a page (e.g. "take me to Ashwagandha", "άνοιξε τη σελίδα", "show me the product"). Then use ONE real catalog URL (/products/..., /collections/..., /pages/..., /policies/...) — that opens the live ygianaturalhealth.com page in the browser. Never invent URLs. Never navigate just because a product was mentioned.
5. Health safety: You are not a doctor. Do not diagnose or prescribe. For medical conditions, pregnancy, medications, or serious symptoms, tell them to consult their personal doctor / pharmacist. You may still describe what a product is marketed for based on the site text.
6. ${languageRule}

Current page: ${currentUrl ?? "unknown"}

Official FAQs (source of truth for common call questions):
${faqBlock || "(none)"}

Page catalog (only these URLs are allowed for navigation):
${pageCatalog || "(none yet — answer from knowledge text only; navigation=null)"}

Retrieved product / page knowledge:
${context || "(no indexed matches yet — ask a clarifying question)"}

Return ONLY valid JSON, no markdown fences:
{"answer":"...","navigation":{"url":"/path","hash":"#optional","label":"..."}|null,"language":"${lang}"}`;

  const raw = await nvidiaChatCompletion({
    system,
    user: question,
    temperature: 0.5,
  });
  const parsed = extractJsonObject(raw);

  const fallback =
    lang === "el"
      ? "Συγγνώμη, δεν μπόρεσα να απαντήσω καθαρά. Μπορείτε να το ξαναπείτε με λίγο διαφορετικά λόγια;"
      : "Sorry — I couldn't form a clear answer. Could you rephrase that for me?";

  return {
    answer: parsed.answer?.trim() || fallback,
    navigation: resolveNavigation(
      pages,
      hits,
      lang,
      question,
      parsed.navigation,
    ),
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

  if (!hasNvidia()) {
    throw new Error(
      "NVIDIA_API_KEY is missing. Add it to .env to enable the full AI assistant.",
    );
  }

  return nvidiaAnswer({
    question,
    currentUrl,
    lang,
    pages: store.pages,
    faqs: store.faqs.map((f) => ({ question: f.question, answer: f.answer })),
  });
}
