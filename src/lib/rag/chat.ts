import type { AppLanguage } from "../language";
import { embedText, lexicalOverlap } from "../embeddings";
import { hasNvidia, nvidiaChatCompletion } from "../nvidia";
import {
  findProfile,
  profileContextBlock,
} from "../profiles";
import type {
  ChatMessage,
  ChatResponse,
  ClientProfile,
  KnowledgeChunk,
  NavigationTarget,
  PageEntry,
} from "../types";
import { loadStore, searchChunks } from "./store";
import {
  enrichQuestionWithProfile,
  isVaguePersonalAsk,
  matchPlaybook,
  playbookScoreBonus,
  predictedAsksFor,
  problemsFromProfile,
} from "./symptom-playbook";

const CHOICE_LETTERS = ["A", "B", "C"] as const;

/** Stable A/B/C labels on product cards (same order every time). */
function withChoices(listings: NavigationTarget[]): NavigationTarget[] {
  return listings.slice(0, 3).map((item, i) => ({
    ...item,
    choice: CHOICE_LETTERS[i],
  }));
}

/** Deterministic sort: higher score first, then URL for ties. */
function sortByScoreThenUrl<T extends { score: number; p: PageEntry }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.p.url.localeCompare(b.p.url);
  });
}

/** “option B”, “choice A”, “the second one” → listing index. */
function parseChoiceIndex(question: string): number | null {
  const letter = question.match(
    /\b(?:option|choice|product|pick)?\s*([ABC])\b/i,
  )?.[1];
  if (letter) return CHOICE_LETTERS.indexOf(letter.toUpperCase() as "A" | "B" | "C");
  if (/\b(first|1st)\b/i.test(question)) return 0;
  if (/\b(second|2nd)\b/i.test(question)) return 1;
  if (/\b(third|3rd)\b/i.test(question)) return 2;
  return null;
}

function lastAssistantChoices(
  lastListings: NavigationTarget[] | undefined,
): NavigationTarget[] {
  return lastListings?.length ? lastListings : [];
}

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

/** Shipping / bank / payments / order ops — hand off to the shop phone. */
const OUT_OF_SCOPE_RE =
  /\b(ship|shipping|delivery|deliver|return|refund|payment|pay|cod|cash on delivery|bank|iban|wire|transfer|currency|exchange rate|invoice|vat|tax|cancel (my )?order|track(ing)?|order status|when will my order|αντικαταβολ|αποστολ|μεταφορικ|επιστροφ|πληρωμ|τραπεζ|νόμισμ|τιμολόγ|πότε θα (έρθ|έρθει)|ποτε θα (ερθ|ερθει)|ακυρω)/i;

function outOfScopeReply(lang: AppLanguage): ChatResponse {
  return {
    answer:
      lang === "el"
        ? "Για αποστολές, πληρωμές και θέματα παραγγελίας καλέστε μας στο +357 22 610 418. Εδώ βοηθάω με τα προϊόντα και τι κάνουν."
        : "For shipping, payments, and order questions please call +357 22 610 418. Here I help with our products and what they’re for.",
    navigation: null,
    language: lang,
  };
}

function resolveNavigation(
  pages: PageEntry[],
  hits: Array<KnowledgeChunk & { score: number }>,
  lang: AppLanguage,
  question: string,
  proposed?: { url?: string; hash?: string; label?: string } | null,
): NavigationTarget | null {
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
    // Only send customers to product or collection pages
    if (
      !page.url.startsWith("/products/") &&
      !page.url.startsWith("/collections/")
    ) {
      return null;
    }
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

  const top = hits.find(
    (h) =>
      h.url &&
      h.score > 0.2 &&
      (/^\/products\//.test(h.url) || /^\/collections\//.test(h.url)),
  );
  return tryPage(top?.url, top?.hash, top?.title);
}

async function rankHits(question: string) {
  const queryEmbedding = await embedText(question);
  const rawHits = await searchChunks(queryEmbedding, 16);
  return rawHits
    .map((h) => {
      const lex = lexicalOverlap(question, `${h.title} ${h.text}`);
      let score = h.score * 0.55 + lex * 0.45;
      // Prefer product pages / product FAQs
      if (h.url?.startsWith("/products/") || h.url?.startsWith("/collections/")) {
        score += 0.2;
      }
      // Demote policies, payments, shipping pages
      if (
        /polic|shipping|refund|payment|faq|privacy|terms/i.test(
          `${h.url ?? ""} ${h.title}`,
        )
      ) {
        score -= 0.35;
      }
      if (h.type === "qa" && !OUT_OF_SCOPE_RE.test(`${h.title} ${h.text}`)) {
        score += 0.1;
      }
      return { ...h, score };
    })
    .filter((h) => {
      // Drop pure policy/payment chunks from context
      if (
        /\/policies\//.test(h.url ?? "") ||
        /payment|shipping policy|refund|privacy|terms of service/i.test(
          h.title,
        )
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.score - a.score);
}

function extractJsonObject(raw: string): {
  answer?: string;
  navigation?: { url?: string; hash?: string; label?: string } | null;
  language?: string;
} {
  let trimmed = raw.trim();
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
    return {
      answer: trimmed.replace(/\{[\s\S]*$/, "").trim() || trimmed,
      navigation: null,
    };
  }
}

/** Crawl FAQs that dump collection handles — never speak these verbatim. */
const COLLECTION_LIST_FAQ_RE =
  /what products do you have for|which products (do you have|for)|products in (the )?(collection|category)/i;

function isCollectionListFaq(f: { question: string; answer: string }): boolean {
  return (
    COLLECTION_LIST_FAQ_RE.test(f.question) ||
    /handles include:/i.test(f.answer) ||
    /browse:\s*https?:\/\//i.test(f.answer)
  );
}

function isProductFaq(f: { question: string; answer: string }): boolean {
  const blob = `${f.question} ${f.answer}`;
  if (/^What does the page/i.test(f.question)) return false;
  if (isCollectionListFaq(f)) return false;
  if (
    OUT_OF_SCOPE_RE.test(blob) &&
    !/product|supplement|capsule|ingredient|extract|herb/i.test(f.question)
  ) {
    return false;
  }
  return true;
}

/** How to use / dose / ingredients / issue with a named product. */
function isProductUseQuestion(question: string): boolean {
  return /\b(how (do|should|can) i (take|use)|how to (take|use)|dosage|dose|how many( capsules)?|when (do|should|to) (i )?take|ingredients?|what('s| is) in|what does .+ contain|side effect|safe(ty)?|warnings?|who (is|can)|can (men|women|i) take|with food|before bed|empty stomach|directions|serving|suggested (use|dosage)|daily (use|dosage)|how long (should|do|can) i|until .+ works|combine|together with|problem with|issue with|not working|too strong|too weak|what is .+ for|what does .+ do|benefits? of)\b/i.test(
    question,
  );
}

type SituationRule = {
  re: RegExp;
  collections: string[];
  need: string;
};

/** Situation / need → Shopify collection paths. */
const SITUATION_RULES: SituationRule[] = [
  {
    re: /\b(sleep|insomnia|can'?t sleep|cannot sleep|trouble sleeping|falling asleep|stay(ing)? asleep|bedtime|restless at night|wake up (at )?night|poor sleep|need (better )?sleep)\b/i,
    collections: ["/collections/sleep"],
    need: "sleep",
  },
  {
    re: /\b(stress(ed|ful)?|anxiety|anxious|nervous|mood|calm(ing)?|worried|panic|tension|overwhelmed|burn(ed)? ?out|relax|relaxation|anxi)\b/i,
    collections: [
      "/collections/nervous-system-anxiety-mood",
      "/collections/sleep",
    ],
    need: "stress and mood",
  },
  {
    re: /\b(joint|joints|arthritis|mobility|musculoskeletal|stiff(ness)?|knees?|hips?|cartilage)\b/i,
    collections: ["/collections/joints"],
    need: "joints",
  },
  {
    // “stomach ache” is digestion, not joint pain — handled in matchSituationRules
    re: /\b(pain|ache|aching|sore|inflammation|inflamed|curcumin|turmeric)\b/i,
    collections: ["/collections/pain-relief", "/collections/joints"],
    need: "pain relief",
  },
  {
    re: /\b(digest|digestion|gut|bloating|bloated|stomach|tummy|intestine|constipation|constipated|laxative|bowel|ibs|indigestion|dyspepsia|heartburn|acid reflux|reflux|nausea|gas(sy)?|upset stomach|after (a )?meal)\b/i,
    collections: ["/collections/digestive-system-intestine"],
    need: "digestion",
  },
  {
    re: /\b(energy|fatigue|tired|vitality|exhaust(ed|ion)?|no energy|low energy|sluggish|worn out)\b/i,
    collections: ["/collections/energy", "/collections/daily-wellness-vitality"],
    need: "energy",
  },
  {
    re: /\b(immune|immunity|cold|flu|get(ting)? sick|catch(ing)? colds?|run ?down|defenses?)\b/i,
    collections: ["/collections/immune-system", "/collections/cold-flu"],
    need: "immune support",
  },
  {
    re: /\b(brain|memory|focus|concentration|cognitive|forgetful|foggy|brain fog|sharp mind|lion'?s?\s*mane)\b/i,
    collections: ["/collections/brain-memory"],
    need: "brain and memory",
  },
  {
    re: /\b(heart|circulat|blood pressure|cholesterol|triglycerides|cardio)\b/i,
    collections: ["/collections/circulatory-system"],
    need: "heart and circulation",
  },
  {
    // Blood sugar / diabetes support (spoken “diabities” etc. covered via loose spelling)
    re: /\b(diabet\w*|diabiet\w*|blood sugar|blood glucose|glucose|sugar levels?|insulin|metabolic|glycem\w*|a1c|hbA1c|prediabet\w*)\b/i,
    collections: [
      "/collections/daily-wellness-vitality",
      "/collections/digestive-system-intestine",
      "/collections/circulatory-system",
    ],
    need: "blood sugar and metabolic support",
  },
  {
    re: /\b(detox|liver|cleanse|milk thistle|hangover)\b/i,
    collections: ["/collections/detoxification"],
    need: "detox support",
  },
  {
    re: /\b(allerg(y|ies)|hay fever|pollen|sneezing|allergic rhinitis)\b/i,
    collections: ["/collections/seasonal-allergies"],
    need: "seasonal allergies",
  },
  {
    re: /\b(respirat|breath(ing)?|lungs?|cough|asthma|sinus|breathe easy)\b/i,
    collections: ["/collections/respiratory"],
    need: "respiratory support",
  },
  {
    re: /\b(eye|vision|eyesight|eyes)\b/i,
    collections: ["/collections/eye-health"],
    need: "eye health",
  },
  {
    // Women first — includes female desire/hormones so “libido for women” lands here
    // Avoid bare “lady” alone — it steals “Daily Lady” product questions
    re: /\b(women'?s?|woman'?s?|for women|for a woman|ladies|female|girlfriend|wife|her health|menopause|perimenopause|pcos|period|periods|pms|hormonal|hot flashes?|daily lady|female hormones?|women'?s health)\b/i,
    collections: ["/collections/womens-health"],
    need: "women's health",
  },
  {
    // Men — do NOT include product names (eros, tribulus) or “about Eros M” becomes a browse list
    re: /\b(men'?s?|man'?s?|for men|for a man|male|guys|him\b|boyfriend|husband|testosterone|prostate|virility|erectile|bedroom|sex drive|daily male|men'?s health)\b/i,
    collections: ["/collections/αντρικη-υγεια"],
    need: "men's vitality and drive",
  },
  {
    // Gender-neutral drive / libido (after women/men so those win when gender is named)
    re: /\b(libido|sexual(\s+drive)?|sex drive|desire in bed|intimacy|performance in bed)\b/i,
    collections: ["/collections/αντρικη-υγεια", "/collections/womens-health"],
    need: "sexual drive and vitality",
  },
  {
    re: /\b(sport|workout|gym|athletic|performance|muscle|training|stamina|endurance)\b/i,
    collections: [
      "/collections/sports-performance",
      "/collections/sports-performance-supplements",
    ],
    need: "sports performance",
  },
  {
    re: /\b(anti[- ]?aging|longevity|aging|feel(ing)? younger|younger again|look(ing)? younger|youthful|age(ing)? well)\b/i,
    collections: [
      "/collections/anti-aging-and-long-life",
      "/collections/longevity-healthy-aging",
    ],
    need: "feeling younger and healthy aging",
  },
  {
    re: /\b(urinat|bladder|uti|urinary|kidney stones?|pee(ing)? (a lot|often|night))\b/i,
    collections: ["/collections/urinary"],
    need: "urinary support",
  },
  {
    re: /\b(vitamin|multivitamin|minerals?|daily supplement|general health|overall health|wellness)\b/i,
    collections: [
      "/collections/multivitamins",
      "/collections/daily-wellness-vitality",
    ],
    need: "daily wellness",
  },
  {
    re: /\b(best[- ]?sell|popular|most (popular|bought)|what('?s| is) (everyone|people) (buy|taking|using)|top products?)\b/i,
    collections: ["/collections/best-selling-products"],
    need: "popular bestsellers",
  },
];

/** Strip filler words from speech so “uh / um” don’t break matching. */
function normalizeQuestion(question: string): string {
  return question
    .replace(/\b(uh+|um+|erm+|like)\b/gi, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchSituationRules(question: string): SituationRule[] {
  const q = normalizeQuestion(question);
  let rules = SITUATION_RULES.filter((r) => r.re.test(q));
  const forWomen =
    /\b(women'?s?|woman'?s?|for women|for a woman|ladies|female|girlfriend|wife|daily lady|menopause|pcos|pms|period)\b/i.test(
      q,
    );
  const forMen =
    /\b(men'?s?|man'?s?|for men|for a man|male|guys|boyfriend|husband|daily male|prostate|testosterone)\b/i.test(
      q,
    );
  // Keep gender pools clean when the client names a gender
  if (forWomen && !forMen) {
    rules = rules.filter((r) => r.need !== "men's vitality and drive");
  }
  if (forMen && !forWomen) {
    rules = rules.filter((r) => r.need !== "women's health");
  }
  // Stomach / gut symptoms beat the generic “ache/pain” rule
  const gutSymptom =
    /\b(indigestion|dyspepsia|heartburn|acid reflux|reflux|bloating|bloated|constipation|constipated|nausea|ibs|upset stomach|tummy|stomach ache|stomach pain|gas(sy)?)\b/i.test(
      q,
    ) ||
    (/\bstomach\b/i.test(q) &&
      /\b(ache|pain|upset|after|meal|digest|burn)\b/i.test(q));
  if (gutSymptom && rules.some((r) => r.need === "digestion")) {
    rules = rules.filter((r) => r.need !== "pain relief");
  }
  // Digestion first when both matched
  if (rules.some((r) => r.need === "digestion")) {
    rules = [
      ...rules.filter((r) => r.need === "digestion"),
      ...rules.filter((r) => r.need !== "digestion"),
    ];
  }
  return rules;
}

function shortProductName(title: string): string {
  return title
    .replace(/\s+/g, " ")
    .split(/♦| – | — | - \d/)[0]!
    .replace(/:+\s*$/, "")
    .trim()
    .slice(0, 52);
}

function formatNameList(names: string[]): string {
  if (names.length <= 1) return names[0] || "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function productsFromCollection(
  collection: PageEntry,
  catalog: PageEntry[],
): PageEntry[] {
  const blob = `${collection.content || ""}\n${collection.description || ""}`;
  const handleLine =
    blob.match(/Product handles:\s*([^\n]+)/i)?.[1] ||
    blob.match(/handles?:\s*([^\n]+)/i)?.[1] ||
    "";
  const handles = handleLine
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (!handles.length) return [];

  const byHandle = new Map(
    catalog
      .filter((p) => p.url.startsWith("/products/"))
      .map((p) => [p.url.replace("/products/", "").toLowerCase(), p] as const),
  );

  const out: PageEntry[] = [];
  for (const h of handles) {
    const p = byHandle.get(h);
    if (p) out.push(p);
  }
  return out;
}

function listingFor(p: PageEntry): NavigationTarget {
  return {
    url: p.url,
    hash: p.hash,
    label: p.title,
    image: p.image,
  };
}

function extractDosage(p: PageEntry): string {
  const raw = p.content || "";
  const candidates = [
    raw.match(/Dosage:\s*([^\n]+)/i)?.[1],
    raw.match(/Suggested Dosage(?: for Adults)?:?\s*([^\n]+)/i)?.[1],
    raw.match(/Daily Dosage:?\s*([^\n]+)/i)?.[1],
  ].filter(Boolean) as string[];
  for (const line of candidates) {
    const cleaned = line
      .replace(/\s+/g, " ")
      .replace(/^[•·\-\s]+/, "")
      .replace(
        /\s*(Capsule Shell|Experience the power|Important information|Ingredients:).*$/i,
        "",
      )
      .trim();
    if (cleaned.length >= 8 && !/^[•·\-\s]+$/.test(cleaned)) return cleaned;
  }
  return "";
}

function extractIngredientsLine(p: PageEntry): string {
  const raw = p.content || "";
  const section =
    raw.match(
      /\n\s*INGREDIENTS\s*:?\s*\n([\s\S]*?)(?=\n\s*(?:Capsule Shell|DOSAGE|Daily Dosage|PACKAGING|Important information|Disclaimer)\b|$)/i,
    )?.[1] ||
    raw.match(/Ingredients:\s*([^\n]+)/i)?.[1];
  if (!section) return "";
  return section.replace(/\s+/g, " ").trim().slice(0, 220).replace(/\s+\S*$/, "");
}

/** Instant answers for strong product FAQ matches — skips the LLM. */
function tryDirectFaq(
  question: string,
  faqs: Array<{ question: string; answer: string }>,
  lang: AppLanguage,
): ChatResponse | null {
  const productFaqs = faqs.filter(isProductFaq);
  if (!productFaqs.length) return null;

  const qFold = foldQuestion(question).replace(/[?!.]+$/g, "").trim();

  const ranked = productFaqs
    .map((f) => {
      const fFold = foldQuestion(f.question).replace(/[?!.]+$/g, "").trim();
      let score =
        lexicalOverlap(question, f.question) * 0.85 +
        lexicalOverlap(question, f.answer) * 0.15;
      // Near-exact client questions (usage FAQ set) — lexical overlap alone is weak on short asks
      if (qFold === fFold) score = 1;
      else if (qFold.length >= 12 && (qFold.includes(fFold) || fFold.includes(qFold)))
        score = Math.max(score, 0.9);
      else {
        // Shared content words (length >= 4) ratio
        const qw = new Set(
          qFold.split(/\s+/).filter((w) => w.length >= 4),
        );
        const fw = fFold.split(/\s+/).filter((w) => w.length >= 4);
        if (fw.length) {
          const hit = fw.filter((w) => qw.has(w)).length;
          score = Math.max(score, hit / fw.length);
        }
      }
      return { f, score };
    })
    .sort((a, b) => b.score - a.score);

  const sameLang =
    ranked.find(
      (r) =>
        r.score >= 0.55 &&
        (lang === "el"
          ? /[\u0370-\u03FF]/.test(r.f.answer)
          : !/[\u0370-\u03FF]/.test(r.f.answer)),
    ) ?? ranked.find((r) => r.score >= 0.62);

  if (!sameLang) return null;

  return {
    answer: sameLang.f.answer.replace(/\s+/g, " ").trim().slice(0, 500),
    navigation: null,
    language: lang,
    sources: [{ title: sameLang.f.question }],
  };
}

/** Common words that must not trigger a product name match (situations use these). */
const PRODUCT_NAME_STOP = new Set([
  "sleep",
  "stress",
  "daily",
  "male",
  "female",
  "health",
  "vitamin",
  "support",
  "complex",
  "natural",
  "joint",
  "joints",
  "energy",
  "immune",
  "brain",
  "memory",
  "heart",
  "pain",
  "relief",
  "super",
  "pure",
  "plus",
  "with",
  "from",
  "caps",
  "drcaps",
  "mood",
  "anxiety",
  "nervous",
  "women",
  "womens",
  "mens",
  "sport",
  "sports",
  "aging",
  "detox",
  "eye",
  "cold",
  "flu",
]);

function foldQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Score how specifically a product is named in the question (higher = better). */
function productNameScore(question: string, p: PageEntry): number {
  const q = foldQuestion(question);
  const handle = p.url.replace("/products/", "").toLowerCase();
  const handleWords = foldQuestion(
    handle.replace(/-/g, " ").replace(/\b\d+\b/g, " "),
  );
  const short = foldQuestion(shortProductName(p.title));
  let score = 0;

  if (short.length >= 6 && q.includes(short)) score += 10;
  if (handleWords.length >= 8 && q.includes(handleWords)) score += 8;

  const rawTokens = handle
    .split("-")
    .map((t) => t.replace(/['’]/g, ""))
    .filter((t) => t.length >= 3 && !/^\d+$/.test(t));
  if (rawTokens.length >= 2) {
    const pair = `${rawTokens[0]} ${rawTokens[1]}`;
    if (q.includes(pair)) {
      score += /^(daily male|daily lady|lions mane|milk thistle|rock rose|red yeast|super lax|super sleep|breathe easy|sharp mind|memory support|olive leaf|vitamin c|bitter melon|eros m)$/i.test(
        pair,
      )
        ? 12
        : 7;
    }
  }
  // Short distinctive names: “Eros”, “Chaga”, “Relive”
  if (
    /\b(eros|chaga|relive|anxi)\b/i.test(q) &&
    new RegExp(`\\b${rawTokens[0]}\\b`, "i").test(q) &&
    rawTokens[0] &&
    rawTokens[0].length >= 4
  ) {
    score += 11;
  }

  // Single distinctive title tokens — but not generic words shared by many SKUs
  const GENERIC_TITLE = new Set([
    "mushroom",
    "extract",
    "complex",
    "support",
    "natural",
    "organic",
    "vitamin",
    "capsules",
    "health",
  ]);
  const titleBits = foldQuestion(p.title)
    .split(/[^a-z0-9\u0370-\u03FF]+/i)
    .filter(
      (w) =>
        w.length >= 6 &&
        !PRODUCT_NAME_STOP.has(w) &&
        !GENERIC_TITLE.has(w),
    );
  for (const w of titleBits) {
    if (q.includes(w)) score += 3;
  }
  return score;
}

/** Pull product pages whose name/handle clearly appears in the question. */
function namedProducts(question: string, pages: PageEntry[]): PageEntry[] {
  return pages
    .filter((p) => p.url.startsWith("/products/"))
    .map((p) => ({ p, score: productNameScore(question, p) }))
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score || a.p.url.localeCompare(b.p.url))
    .slice(0, 4)
    .map((x) => x.p);
}

/** “What is X for / what does it do?” — answer from benefits. */
function isProductPurposeQuestion(question: string): boolean {
  return /\b(what (is|are) .+ for|what('s| is) it for|what does .+ do|what is .+ used for|good for|benefits? of)\b/i.test(
    question,
  );
}

type DetailSource = "professional" | "website";

/** Detect whether the client wants shop-page copy or the professional booklet. */
function detectDetailSource(question: string): DetailSource {
  const q = question;
  // Website / shop explicitly
  if (
    /\b(website|web ?site|shop(ify)?|store(front)?|online (page|listing)|product page|shop page|what('?s| is) on the (site|website|shop)|website details?|shop details?|store details?|as on the (website|shop|site))\b/i.test(
      q,
    )
  ) {
    return "website";
  }
  // Professional booklet explicitly
  if (
    /\b(professional|practitioner|booklet|from the book|the book|clinical|for (doctors?|practitioners|professionals)|health professional|pro details?|professional details?|more (professional|clinical|detailed) (info|details?|description))\b/i.test(
      q,
    )
  ) {
    return "professional";
  }
  // Default: professional when available (richer); website only when they ask for it
  return "professional";
}

/** Professional booklet block attached during pro ingest (richer than Shopify blurb). */
function extractBookletProfile(p: PageEntry): {
  actions: string;
  dosage: string;
  ingredients: string;
  packaging: string;
  safety: string;
} | null {
  const raw = p.content || "";
  // Note: JS has no \Z — use $ for end-of-string
  const block =
    raw.match(
      /--- Professional booklet \(health practitioners\) ---([\s\S]*?)(?=\n--- |$)/i,
    )?.[1] ||
    raw.match(
      /Professional booklet[^\n]*\n([\s\S]*?)(?=\n--- |$)/i,
    )?.[1];
  if (!block || block.length < 40) return null;
  const pick = (...labels: string[]) => {
    for (const label of labels) {
      const hit = block
        .match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"))?.[1]
        ?.replace(/\s+/g, " ")
        .trim();
      if (hit) return hit;
    }
    return "";
  };
  const actions = pick(
    "Actions\\s*/\\s*benefits",
    "Actions\\s*/\\s*benefits?",
    "Actions",
  );
  const dosage = pick("Dosage");
  const ingredients = pick("Ingredients");
  const packaging = pick("Packaging");
  const safety = pick("Safety");
  // Fallback: freeform lines under Product:
  const looseActions =
    actions ||
    block
      .match(
        /(?:Actions\s*\/\s*benefits|Actions)\s*:\s*([^\n]+)/i,
      )?.[1]
      ?.replace(/\s+/g, " ")
      .trim() ||
    "";
  if (!looseActions && !dosage && !ingredients) return null;
  return {
    actions: looseActions,
    dosage,
    ingredients,
    packaging,
    safety,
  };
}

/** Shop-page style detail (description, benefits, price cues — not the booklet). */
function websiteDetailSpeech(p: PageEntry, lang: AppLanguage): string {
  const name = shortProductName(p.title);
  const raw = p.content || "";
  const after = raw.split(/Full product description:\s*/i)[1] || raw;
  const tidy = (s: string) =>
    s.replace(/\s+/g, " ").replace(/[•·]\s*/g, "").trim();

  // Strip professional booklet so website mode never leaks it
  const shopOnly = after.replace(
    /---?\s*Professional booklet[\s\S]*$/i,
    "",
  );

  const description =
    shopOnly
      .match(
        /Description\s*\n+([\s\S]{40,320}?)(?=\n\s*(?:Packaging|Ingredients|Benefits|Daily Dosage|INGREDIENTS)\b)/i,
      )?.[1]
      ?.replace(/\s+/g, " ")
      .trim() || "";
  const benefits =
    shopOnly.match(/Benefits\s*\n+([\s\S]{20,280}?)(?=\n\s*(?:Description|Packaging|Ingredients|Daily Dosage|INGREDIENTS)\b)/i)?.[1]
      ?.replace(/\s+/g, " ")
      .replace(/[•·]\s*/g, "; ")
      .trim() || "";
  const dosage = extractDosage({ ...p, content: shopOnly });
  const ingredients = extractIngredientsLine({ ...p, content: shopOnly });
  const price =
    shopOnly.match(/Price:\s*€?\s*([\d.]+)/i)?.[1] ||
    p.description.match(/€\s*([\d.]+)/)?.[1];
  const stock = /out of stock/i.test(shopOnly)
    ? "out of stock"
    : "in stock";

  const parts = [
    `From the website: ${name}`,
    benefits || description || tidy(p.description || "").slice(0, 320),
    dosage ? `Label dosage: ${dosage}` : "",
    ingredients ? `Ingredients: ${ingredients}` : "",
    price ? `Price €${price}, ${stock}` : "",
  ].filter(Boolean);
  return parts.join(". ").replace(/\s+/g, " ").trim().slice(0, 700);
}

/** Professional booklet detail (actions / dose / ingredients from the practitioners PDF). */
function professionalDetailSpeech(p: PageEntry): string | null {
  const name = shortProductName(p.title);
  const book = extractBookletProfile(p);
  if (!book) return null;
  const parts = [
    `From our professional booklet: ${name}`,
    book.actions || "",
    book.dosage ? `Dosage: ${book.dosage}` : "",
    book.ingredients ? `Ingredients: ${book.ingredients}` : "",
    book.packaging || "",
    book.safety ? `Safety: ${book.safety}` : "",
  ].filter(Boolean);
  return parts.join(". ").replace(/\s+/g, " ").trim().slice(0, 700);
}

/** Prefer booklet or website based on what the client asked for. */
function productDetailSpeech(
  p: PageEntry,
  lang: AppLanguage,
  faqs?: Array<{ question: string; answer: string; product?: string }>,
  source: DetailSource = "professional",
): string {
  if (source === "website") {
    return websiteDetailSpeech(p, lang);
  }

  const pro = professionalDetailSpeech(p);
  if (pro) return pro;

  // No booklet card for this SKU — still give the full shop description (not an A/B/C list)
  const shop = websiteDetailSpeech(p, lang).replace(
    /^From the website:\s*/i,
    `No separate professional booklet card for ${shortProductName(p.title)} — full product description: `,
  );
  return shop.slice(0, 700);
}

/** Pull a short spoken product blurb (ingredients / description / categories). */
function productBlurb(p: PageEntry, lang: AppLanguage): string {
  // Situation cards: prefer booklet actions when present (short why)
  const book = extractBookletProfile(p);
  if (book?.actions) {
    return book.actions.replace(/\s+/g, " ").trim().slice(0, 280);
  }

  // Keep newlines so section headers aren't confused with body copy like "health benefits"
  const raw = (p.content || "").replace(
    /---?\s*Professional booklet[\s\S]*$/i,
    "",
  );
  const after = raw.split(/Full product description:\s*/i)[1] || raw;

  const tidy = (s: string) =>
    s.replace(/\s+/g, " ").replace(/[•·]\s*/g, "").trim();

  const section = (label: string) => {
    const re = new RegExp(
      `\\n\\s*${label}\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:Benefits|Description|PACKAGING|Packaging|INGREDIENTS|Ingredients|Daily Dosage|DOSAGE|Capsule Shell|Important information|Disclaimer)\\b|$)`,
      "i",
    );
    const hit = after.match(re)?.[1];
    return hit ? tidy(hit) : "";
  };

  // Benefit pitch on some product pages (after dosage / packaging noise)
  const pitch = tidy(
    after.match(
      /(?:Experience the power of[\s\S]+?|Discover the health benefits of[\s\S]+?)(?=Important information|Disclaimer|Safety Information|$)/i,
    )?.[0] || "",
  );

  const description = section("Description");
  const benefits = section("Benefits");
  const ingredients = section("INGREDIENTS") || section("Ingredients");

  let text = [pitch, description, benefits, ingredients]
    .filter((s) => s.length > 20)
    .join(". ");

  if (!text) {
    text = tidy(p.description || "")
      .replace(/if you would like to learn more[\s\S]*/i, "")
      .replace(/\s*—\s*From €[\d.]+\s*—.*$/i, "")
      .trim();
  }

  const cats = (raw.match(/Collections \/ categories:\s*([^\n]+)/i)?.[1] || "")
    .split(",")
    .map((c) => c.trim())
    .filter(
      (c) =>
        c &&
        !/all products|home page|best selling/i.test(c),
    )
    .slice(0, 3);

  if (cats.length) {
    const catLine =
      lang === "el"
        ? `Συχνά για: ${cats.join(", ")}.`
        : `Often chosen for: ${cats.join(", ")}.`;
    text = text ? `${text} ${catLine}` : catLine;
  }

  return text.slice(0, 280).replace(/\s+\S*$/, "").trim();
}

/** Client is asking for more info on a product (not browsing a category). */
function wantsProductDetail(question: string): boolean {
  // Do NOT match bare “about” / “what can I use for …” — those are need/browse asks
  return /\b(what else( about)?|tell me more|more details?|full (details?|description)|everything about|describe (it|this|that)|about (it|this|that|option|a|b|c)\b|professional details?|website details?|from the (book|booklet|website|shop)|what (else )?can you tell me( about)?)\b/i.test(
    question,
  );
}

/** Fast spoken blurb from product page data — no LLM wait. */
function tryDirectProduct(
  question: string,
  products: PageEntry[],
  lang: AppLanguage,
  faqs?: Array<{ question: string; answer: string; product?: string }>,
): ChatResponse | null {
  if (!products.length) return null;
  const p = products[0]!;
  const source = detectDetailSource(question);
  const detail = productDetailSpeech(p, lang, faqs, source);
  // Only append shop price when in website mode (professional answers stay clinical)
  let answer = detail;
  if (source === "website" && !/€\s*\d|Price €/i.test(answer)) {
    const body = `${p.description}\n${p.content || ""}`;
    const price =
      body.match(/Price:\s*€?\s*([\d.]+)/i)?.[1] ||
      body.match(/€\s*([\d.]+)/)?.[1];
    if (price) answer = `${answer} Price €${price}.`;
  }

  const listings = withChoices([listingFor(p)]);

  return {
    answer: answer.replace(/\s+/g, " ").trim().slice(0, 700),
    navigation: wantsNavigation(question) ? listings[0]! : null,
    listings,
    language: lang,
    sources: [{ title: p.title, url: p.url }],
  };
}

/** “it / this / that” or medicine follow-ups → product in focus from history/cards. */
function resolveFocusProduct(
  question: string,
  pages: PageEntry[],
  history?: ChatMessage[],
  lastListings?: NavigationTarget[],
): PageEntry | null {
  const named = namedProducts(question, pages);
  if (named[0]) return named[0];

  const needsFocus =
    /\b(it|this|that|them|the product|same one|with medicine|with (my )?meds?|medication|drug|prescription|doctor)\b/i.test(
      question,
    ) ||
    /\b(what else|more details?|tell me more|anything else)\b/i.test(question);
  if (!needsFocus) return null;

  // Prefer a product named in recent chat (avoids wrong A/B/C from a failed turn)
  for (const turn of [...(history || [])].reverse()) {
    const hits = namedProducts(turn.content, pages);
    if (hits[0]) return hits[0];
  }

  // Single card on screen = clear focus
  if (lastListings?.length === 1 && lastListings[0]?.url) {
    const page = pages.find(
      (p) => normalizePath(p.url) === normalizePath(lastListings[0]!.url),
    );
    if (page) return page;
  }
  return null;
}

function isMedicineInteractionQuestion(question: string): boolean {
  return /\b(with .{0,20}(medicine|medication|meds?|drugs?|prescription)|interact(ion|s)? with|together with .{0,20}(medicine|medication|meds?)|while (on|taking) (medicine|medication|meds?)|can (i|it|this|that) (be )?(take|taken|use|used).{0,40}(medicine|medication|meds?|drugs?))\b/i.test(
    question,
  );
}

function medicineInteractionReply(
  p: PageEntry | null,
  lang: AppLanguage,
): ChatResponse {
  const name = p ? shortProductName(p.title) : "this supplement";
  const answer =
    lang === "el"
      ? `${name} είναι συμπλήρωμα διατροφής, όχι φάρμακο. Για χρήση μαζί με φάρμακα ρωτήστε γιατρό ή φαρμακοποιό — καλέστε και τον βοτανολόγο μας στο +357 22 610 418.`
      : `${name} is a food supplement, not a medicine. I can’t advise combining it with prescription drugs — please check with your doctor or pharmacist first. For herbalist guidance call +357 22 610 418.`;
  return {
    answer,
    navigation: null,
    listings: p ? withChoices([listingFor(p)]) : undefined,
    language: lang,
    sources: p ? [{ title: p.title, url: p.url }] : undefined,
  };
}

/**
 * Named product + use/dose/ingredients question → answer from label data.
 */
function tryProductUse(
  question: string,
  products: PageEntry[],
  lang: AppLanguage,
): ChatResponse | null {
  if (!products.length || !isProductUseQuestion(question)) return null;
  const p = products[0]!;
  const dosage = extractDosage(p);
  const ingredients = extractIngredientsLine(p);
  const actions =
    (p.content || "").match(/Actions\s*\/\s*benefits:\s*([^\n]+)/i)?.[1]?.trim() ||
    "";
  const safety =
    (p.content || "").match(/Safety:\s*([^\n]+)/i)?.[1]?.trim() || "";
  const wantsIngredients =
    /\b(ingredients?|what('s| is) in|contains?|what does .+ contain)\b/i.test(
      question,
    );
  const wantsSafety =
    /\b(safe(ty)?|side effect|warning|pregnant|breastfeed)\b/i.test(question);
  const wantsWho = /\b(who (is|can)|can (men|women|i) take|suited for)\b/i.test(
    question,
  );
  const wantsPurpose =
    isProductPurposeQuestion(question) ||
    /\b(what is .+ for|what does .+ do|benefits?)\b/i.test(question);
  const wantsDuration =
    /\b(how long|until .+ works|how soon|course|for how long)\b/i.test(question);
  const wantsCombine =
    /\b(combine|together|with other|more than one|stack)\b/i.test(question);
  const name = shortProductName(p.title);

  let answer = "";
  if (wantsIngredients && ingredients) {
    answer = `${name} ingredients: ${ingredients}.`;
    if (dosage) answer += ` Dosage: ${dosage}.`;
  } else if (wantsSafety) {
    answer = safety
      ? `${name} safety: ${safety} Food supplements are not a substitute for a varied diet. Not for pregnancy/breastfeeding unless advised. Call +357 22 610 418 for herbalist advice.`
      : `${name}: suitable for vegetarians/vegans; keep away from children; not for pregnancy/breastfeeding unless a professional advises. Call +357 22 610 418 if unsure.`;
  } else if (wantsWho) {
    answer = `${name} is a YGIA herbal supplement for adults. ${actions ? `It’s used for: ${actions.slice(0, 160)}.` : ""} Check the label and ask a professional if you take medication.`;
  } else if (wantsDuration) {
    answer = `Use ${name} consistently as labelled${dosage ? ` (${dosage})` : ""}. Results vary — many clients use a product for several weeks. Some formulas suggest a break after a course; check the label or call +357 22 610 418.`;
  } else if (wantsCombine) {
    answer = `Many clients combine ${name} with other YGIA products for a goal. Tell me what else you’re taking and your goal, or call +357 22 610 418 for a simple stack. Label dose for ${name}: ${dosage || "see bottle"}.`;
  } else if (wantsPurpose && actions) {
    answer = `${name} is for: ${actions.slice(0, 280)}`;
    if (dosage) answer += ` Dosage: ${dosage}.`;
  } else if (dosage) {
    answer = `For ${name}: ${dosage}`;
    if (ingredients && /ingredient/i.test(question)) {
      answer += ` Ingredients include ${ingredients}.`;
    }
  } else if (ingredients) {
    answer = `${name}. On the label: ${ingredients}.`;
  } else if (actions) {
    answer = `${name}: ${actions.slice(0, 300)}`;
  } else {
    // Fall back to general product blurb rather than inventing dose
    return tryDirectProduct(question, products, lang);
  }

  const listings = withChoices([listingFor(p)]);
  return {
    answer: answer.replace(/\s+/g, " ").trim().slice(0, 480),
    navigation: wantsNavigation(question) ? listings[0]! : null,
    listings,
    language: lang,
    sources: [{ title: p.title, url: p.url }],
  };
}

function looksLikeNeedQuestion(question: string): boolean {
  return /\b(something for|what (do you )?have for|what('?s| is) good for|which products? (can|should|do) i (use|take|try)|what (can|should) i (use|take|try)|looking for|i (want|need|feel|have)|help (me )?with|any(thing)? for|recommend|suggestion|advice|for my|so i can|specifically|suited for|meant for|made for|do you sell|can you suggest|what would you (suggest|recommend)|i'?m (a )?(man|woman|guy|lady)|my (husband|wife|boyfriend|girlfriend|mum|mom|dad))\b/i.test(
    question,
  );
}

/**
 * Serious conditions we must not “match” to random SKUs (incl. caution-text hits).
 * Honest herbalist handoff instead of inventing products.
 */
const CLINICAL_HANDOFF_RE =
  /\b(epilep\w*|seizure\s|seizures|cancer|tumor|tumour|chemotherapy|hiv|aids|pregnant|pregnancy|breastfeed\w*|suicid\w*|overdose|emergency|stroke|heart attack|heart\s*attack)\b/i;

function clinicalHandoffReply(question: string, lang: AppLanguage): ChatResponse {
  const topic =
    question
      .replace(
        /^(what do you have for|what can i use for|something for|is there something for|looking for)\s+/i,
        "",
      )
      .replace(/\?+$/, "")
      .trim()
      .slice(0, 40) || "that";
  return {
    answer:
      lang === "el"
        ? `Δεν προτείνω προϊόντα για «${topic}» από τον κατάλογο — καλέστε τον herbalist στο +357 22 610 418 ή costas@ygianaturalhealth.com.`
        : `I don't recommend catalog products for “${topic}” — please call the YGIA herbalist on +357 22 610 418 or email costas@ygianaturalhealth.com for specialized advice.`,
    navigation: null,
    listings: [],
    language: lang,
  };
}

function noCatalogMatchReply(need: string, lang: AppLanguage): ChatResponse {
  const label = need.replace(/\?+$/, "").trim().slice(0, 48) || "that";
  return {
    answer:
      lang === "el"
        ? `Δεν βρήκα προϊόν στον κατάλογό μας ειδικά για «${label}». Καλέστε μας στο +357 22 610 418 για καθοδήγηση από herbalist.`
        : `I don't have a product in our catalog specifically for “${label}”. Please call +357 22 610 418 so our herbalist can advise you properly.`,
    navigation: null,
    listings: [],
    language: lang,
  };
}

/** Benefit/actions text only — strip caution/warning blocks so “if you have epilepsy” ≠ indication. */
function benefitTextForMatch(p: PageEntry): string {
  let raw = `${p.description || ""}\n${p.content || ""}`;
  raw = raw
    .replace(
      /(?:Caution|Warning|Important information|Safety Information|Disclaimer|Pregnant|breastfeed)[\s\S]{0,1200}/gi,
      " ",
    )
    .replace(/if you (are pregnant|have epilepsy|have a bleeding)[\s\S]{0,200}/gi, " ");
  const actions = raw.match(
    /(?:Actions\s*\/\s*benefits|Benefits)\s*:?\s*([\s\S]{40,900})/i,
  )?.[1];
  return (actions || raw).slice(0, 1400);
}

/** True when the need words actually appear in benefits (not noise / caution). */
function productSupportsNeed(need: string, p: PageEntry): boolean {
  const benefit = foldQuestion(benefitTextForMatch(p));
  const tokens = foldQuestion(need)
    .split(/[^a-z0-9\u0370-\u03FF]+/i)
    .filter((t) => t.length >= 4);
  if (!tokens.length) return false;
  // Prefer multi-token needs: require at least one distinctive token in benefits
  return tokens.some((t) => benefit.includes(t));
}

/**
 * Situation / need (no product name) → 1–3 products + shop-style advice.
 */
function trySituationSuggest(
  question: string,
  pages: PageEntry[],
  lang: AppLanguage,
): ChatResponse | null {
  // Named products / “what else about X” belong on the product detail path
  if (namedProducts(question, pages).length) return null;
  if (wantsProductDetail(question)) return null;

  // Never invent SKUs for clinical conditions (even if caution text mentions them)
  if (CLINICAL_HANDOFF_RE.test(question)) {
    return clinicalHandoffReply(question, lang);
  }

  const rules = matchSituationRules(question);
  const playbookHits = matchPlaybook(question);
  const need =
    rules[0]?.need ||
    playbookHits[0]?.label ||
    (looksLikeNeedQuestion(question)
      ? question
          .replace(
            /^(what do you have for|what can i use for|is there something for|something for|looking for)\s+/i,
            "",
          )
          .replace(/\?+$/, "")
          .slice(0, 60)
      : "");
  if (!need) return null;

  // No collection rule and no playbook → do not rank the whole shop on guesswork
  const hasGrounding = rules.length > 0 || playbookHits.length > 0;
  if (!hasGrounding && looksLikeNeedQuestion(question)) {
    return noCatalogMatchReply(need, lang);
  }
  if (!hasGrounding) return null;

  const seen = new Set<string>();
  const candidates: PageEntry[] = [];
  for (const rule of rules) {
    for (const colUrl of rule.collections) {
      const col = pages.find((p) => p.url === colUrl);
      if (!col) continue;
      for (const p of productsFromCollection(col, pages)) {
        if (seen.has(p.url)) continue;
        seen.add(p.url);
        candidates.push(p);
      }
    }
  }

  // Playbook-preferred handles first when we know the problem
  if (playbookHits[0]) {
    for (const h of playbookHits[0].prefer) {
      const p = pages.find(
        (pg) =>
          pg.url.startsWith("/products/") &&
          (pg.url === `/products/${h}` ||
            pg.url.replace("/products/", "").startsWith(h.slice(0, 18))),
      );
      if (p && !seen.has(p.url)) {
        seen.add(p.url);
        candidates.push(p);
      }
    }
  }

  const pool =
    candidates.length >= 2
      ? candidates
      : pages.filter((p) => p.url.startsWith("/products/"));

  const minScore = playbookHits.length ? 0.45 : 0.85;
  const ranked = sortByScoreThenUrl(
    pool
      .map((p) => ({ p, score: scoreProductForNeed(question, need, p) }))
      .filter((x) => x.score >= minScore),
  );
  // Drop near-duplicate SKUs (e.g. same probiotic in 30 vs 60 caps)
  const picked: PageEntry[] = [];
  const seenNames = new Set<string>();
  for (const row of ranked) {
    // Without playbook boost, require the need to appear in benefits text
    if (
      !playbookHits.length &&
      !productSupportsNeed(need, row.p) &&
      row.score < 1.2
    ) {
      continue;
    }
    const key = foldQuestion(shortProductName(row.p.title))
      .replace(/\b\d+\b/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    picked.push(row.p);
    if (picked.length >= 3) break;
  }

  if (!picked.length) {
    return looksLikeNeedQuestion(question)
      ? noCatalogMatchReply(need, lang)
      : null;
  }

  const listings = withChoices(picked.map(listingFor));
  const answer = buildAdviceAnswer(question, need, picked, lang);
  return {
    answer,
    navigation: wantsNavigation(question)
      ? rules[0]
        ? { url: rules[0].collections[0]!, label: need }
        : listings[0] ?? null
      : null,
    listings,
    language: lang,
    sources: picked.map((p) => ({ title: p.title, url: p.url })),
  };
}

/** Score how well a product fits a spoken need (reads benefits/description). */
function scoreProductForNeed(
  question: string,
  need: string,
  p: PageEntry,
): number {
  const blob = `${p.title} ${p.description} ${(p.keywords ?? []).join(" ")} ${p.content || ""}`;
  const head = blob.slice(0, 1200);
  const rankQuery = `${question} ${need}`;
  let score = lexicalOverlap(rankQuery, head);
  score += playbookScoreBonus(question, need, p);

  const cues: Array<{ when: RegExp; hit: RegExp; boost: number }> = [
    {
      when: /\b(men|man|men'?s|male|guys|for men|husband|boyfriend)\b/i,
      hit: /daily male|eros|tribulus|prostate|tongkat|testosterone|men'?s|ashwagandha/i,
      boost: 0.95,
    },
    {
      when: /\b(women|woman|women'?s|ladies|lady|for women|wife|girlfriend|menopause|pms|pcos)\b/i,
      hit: /daily lady|rock rose|inositol|collagen|women'?s|menopause|passion flower|tongkat/i,
      boost: 0.95,
    },
    {
      when: /sexual|libido|drive|virility|desire|intimacy|bedroom/i,
      hit: /eros|tribulus|epimedium|tongkat|maca|libido|sexual|testosterone|daily male|daily lady/i,
      boost: 0.85,
    },
    {
      when: /younger|aging|longevity/i,
      hit: /nad|resveratrol|reservatrol|longevity|anti-?aging|cellular|withanolide|q10|coq10/i,
      boost: 0.75,
    },
    {
      when: /sleep|insomnia|bedtime/i,
      hit: /sleep|melatonin|passion|theanine|hops|lemon balm|relax|super sleep/i,
      boost: 0.75,
    },
    {
      when: /stress|anxiety|mood|panic|calm|worried/i,
      hit: /ashwagandha|anxi|stress|theanine|magnesium|passion|calm|relive|5-?htp|rock rose/i,
      boost: 0.7,
    },
    {
      when: /joint|pain|inflammation|arthritis|ache/i,
      hit: /glucosamine|chondroitin|msm|collagen|curcumin|joint|turmeric/i,
      boost: 0.75,
    },
    {
      when: /brain|memory|focus|concentration|fog/i,
      hit: /lion'?s?\s*mane|ginkgo|memory|sharp mind|brain|focus|cognitive/i,
      boost: 0.75,
    },
    {
      when: /energy|tired|fatigue|vitality/i,
      hit: /energy|cordyceps|shilajit|b12|fatigue|vitality|daily male|daily lady/i,
      boost: 0.65,
    },
    {
      when: /immune|cold|flu|sick/i,
      hit: /immune|echinacea|vitamin c|elderberry|chaga|olive leaf|zinc/i,
      boost: 0.7,
    },
    {
      when: /liver|detox|cleanse/i,
      hit: /milk thistle|detox|liver|chaga|olive/i,
      boost: 0.75,
    },
    {
      when:
        /digest|gut|bloat|indigest|dyspepsia|heartburn|acid reflux|reflux|nausea|constipat|bowel|lax|stomach|tummy|ibs/i,
      hit: /slippery|elm|lactobacillus|synbiotic|probiotic|prebiotic|chicory|digest|gut|bloat|indigest|heartburn|reflux|ibs|mucilage|senna|lax/i,
      boost: 0.95,
    },
    {
      when: /cholesterol|heart|blood pressure|circulat/i,
      hit: /red yeast|cholesterol|hawthorn|heart|omega|q10|circulat/i,
      boost: 0.7,
    },
    {
      when: /diabet|blood sugar|glucose|insulin|glycem|metabolic|sugar level/i,
      hit: /berberine|bitter melon|fenugreek|gluco support|gluco-|glucose|blood sugar|insulin|hbA1c|glp.?1/i,
      boost: 1.2,
    },
    {
      when: /breath|lungs?|asthma|respirat|cough/i,
      hit: /breathe|reishi|cordyceps|lung|respirat|echinacea/i,
      boost: 0.7,
    },
  ];
  for (const c of cues) {
    if (c.when.test(rankQuery) && c.hit.test(head)) score += c.boost;
  }

  if (
    /lax|laxative|bowel|stool|sambucus|elderberry|immunity complex|berberine/i.test(
      head,
    ) &&
    /younger|vitality|drive|libido|aging|sexual|men'?s|women'?s/i.test(rankQuery)
  ) {
    score -= 0.7;
  }
  // Don't push prostate formulas when they asked about drive/libido
  if (
    /prostate/i.test(head) &&
    /sexual|libido|drive/i.test(rankQuery) &&
    !/prostate/i.test(rankQuery)
  ) {
    score -= 0.5;
  }
  // Keep men's formulas out of women's asks (and the reverse)
  if (
    /\b(women|woman|ladies|lady|for women|menopause|pms)\b/i.test(rankQuery) &&
    /daily male|\beros\b|tribulus|prostate support/i.test(head) &&
    !/daily lady/i.test(head)
  ) {
    score -= 0.85;
  }
  if (
    /\b(men|man|guys|for men|prostate|testosterone)\b/i.test(rankQuery) &&
    /daily lady/i.test(head)
  ) {
    score -= 0.85;
  }
  // Prefer clear glucose formulas over loosely related “metabolic/immune” herbs
  if (/diabet|blood sugar|glucose|insulin|glycem/i.test(rankQuery)) {
    if (/berberine|bitter melon|fenugreek|gluco|glp.?1/i.test(head)) score += 0.35;
    if (
      /collagen|daily lady|daily male|astragalus|cordyceps|echinacea|lax|sleep/i.test(
        head,
      ) &&
      !/berberine|bitter melon|fenugreek|gluco|blood sugar|glucose|insulin/i.test(
        head,
      )
    ) {
      score -= 0.9;
    }
  }

  // Digestion needs — prefer gut-soothing formulas over metabolic / weight SKUs in that collection
  const digestionAsk =
    /\b(digest|digestion|gut|stomach|tummy|ibs)\b/i.test(rankQuery) ||
    /indigest|dyspepsia|heartburn|acid reflux|reflux|bloating|bloated|nausea|upset stomach|constipat/i.test(
      rankQuery,
    );
  const indigestionAsk =
    /indigest|dyspepsia|heartburn|acid reflux|reflux|bloating|bloated|nausea|upset stomach|stomach (ache|pain)|after (a )?meal/i.test(
      rankQuery,
    );
  const constipationAsk = /constipat|laxative|bowel|stool/i.test(rankQuery);
  if (digestionAsk) {
    if (/slippery|elm|lactobacillus|synbiotic|probiotic|chicory|prebiotic/i.test(head))
      score += indigestionAsk ? 0.55 : 0.4;
    if (/milk thistle|indigestion|digestive comfort|acid reflux|ibs/i.test(head))
      score += 0.25;
    if (
      /appetite control|3-days-slim|glp.?1|berberine|alfalfa|chanca piedra|cholesterol|kidney stone/i.test(
        head,
      ) &&
      !/indigest|bloat|probiotic|slippery|reflux/i.test(head)
    ) {
      score -= indigestionAsk ? 1.1 : 0.75;
    }
    if (/super lax|\blax\b|senna|laxative/i.test(head) && !constipationAsk) {
      score -= indigestionAsk ? 0.9 : 0.35;
    }
  }
  if (constipationAsk) {
    if (/super lax|\blax\b|senna/i.test(head)) score += 1.0;
    if (/chicory|slippery|probiotic|prebiotic/i.test(head)) score += 0.35;
  }
  if (/heartburn|acid reflux|reflux/i.test(rankQuery)) {
    if (/slippery|elm|acid reflux|reflux|heartburn|mucilage/i.test(head)) score += 0.45;
  }
  return score;
}

/** Short shop-style advice from the top products' benefit lines (with A/B/C). */
function buildAdviceAnswer(
  question: string,
  need: string,
  products: PageEntry[],
  lang: AppLanguage,
): string {
  const bits = products.slice(0, 3).map((p, i) => {
    const letter = CHOICE_LETTERS[i]!;
    const name = shortProductName(p.title);
    const why = adviceWhy(p);
    return why ? `Option ${letter}: ${name} — ${why}` : `Option ${letter}: ${name}`;
  });

  if (lang === "el") {
    return `Καταλαβαίνω ότι ψάχνετε κάτι για ${need}. Επιλογές: ${bits.join(". ")}. Πείτε A, B ή C για λεπτομέρειες.`.slice(
      0,
      480,
    );
  }

  const opener = /\b(men|man|men'?s|male|for men|husband|boyfriend)\b/i.test(
    question,
  )
    ? "For men's health"
    : /\b(women|woman|women'?s|for women|ladies|lady|wife|girlfriend|menopause|pms)\b/i.test(
          question,
        )
      ? "For women's health"
      : /sexual|libido|drive|intimacy|bedroom/i.test(question)
        ? "For sexual drive and feeling more vital again"
        : /younger|anti-?aging|longevity/i.test(question)
          ? "For feeling younger and supporting healthy aging"
          : /stress|anxiety|mood|panic/i.test(question)
            ? "For stress and mood"
            : /sleep|insomnia/i.test(question)
              ? "For better sleep"
              : /diabet|blood sugar|glucose|insulin/i.test(question)
                ? "For blood sugar and metabolic support"
                : /indigest|dyspepsia|heartburn|acid reflux|reflux|bloating|stomach/i.test(
                      question,
                    )
                  ? "For indigestion and digestive comfort"
                  : `For ${need}`;

  return `${opener}, here are three options. ${bits.join(". ")}. Say A, B, or C if you want details on one.`.slice(
    0,
    480,
  );
}

function adviceWhy(p: PageEntry): string {
  const raw = p.content || p.description || "";
  // Prefer shop Benefits bullets first — booklet Actions can bleed across products
  const benefit =
    raw.match(/Benefits\s*\n+\s*[•·-]?\s*([^\n•]{20,120})/i)?.[1] ||
    raw.match(
      /Actions\s*\/\s*benefits:\s*([^\n]{20,160})/i,
    )?.[1] ||
    raw.match(
      /(?:enhances|supports|improves|promotes|helps|boosts|contributes to)\s+([^.\n]{15,90})/i,
    )?.[0];
  if (!benefit) return "";
  const cleaned = benefit
    .replace(/\s+/g, " ")
    .replace(/^[•·\-\s]+/, "")
    .replace(/by inhibiting PDE5/gi, "")
    .replace(/Short, at-a-glance benefits[^.]*\.?/gi, "")
    .replace(/Use Super Lax Support for constipation for up to 10 days\s*/gi, "")
    .replace(/\(\s*\d+\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/\.$/, "");
  if (cleaned.length < 18) return "";
  return cleaned.slice(0, 90);
}

/** Product / collection pages to show as shop links. */
function productListings(
  pages: PageEntry[],
  hits: Array<{ title: string; url?: string; hash?: string; image?: string }>,
  catalog: PageEntry[],
  limit = 3,
): NavigationTarget[] {
  const imageByUrl = new Map(
    catalog
      .filter((p) => p.image)
      .map((p) => [p.url, p.image!] as const),
  );
  const out: NavigationTarget[] = [];
  const seen = new Set<string>();
  for (const p of pages) {
    if (!p.url.startsWith("/products/") && !p.url.startsWith("/collections/")) {
      continue;
    }
    if (seen.has(p.url)) continue;
    seen.add(p.url);
    out.push({
      url: p.url,
      hash: p.hash,
      label: p.title,
      image: p.image || imageByUrl.get(p.url),
    });
    if (out.length >= limit) return out;
  }
  for (const h of hits) {
    if (!h.url) continue;
    if (!h.url.startsWith("/products/") && !h.url.startsWith("/collections/")) {
      continue;
    }
    if (seen.has(h.url)) continue;
    seen.add(h.url);
    out.push({
      url: h.url,
      hash: h.hash,
      label: h.title,
      image: h.image || imageByUrl.get(h.url),
    });
    if (out.length >= limit) break;
  }
  return withChoices(out);
}

async function nvidiaAnswer(opts: {
  question: string;
  currentUrl?: string;
  lang: AppLanguage;
  pages: PageEntry[];
  faqs: Array<{ question: string; answer: string; product?: string }>;
  history?: ChatMessage[];
  profile?: ClientProfile | null;
}): Promise<ChatResponse> {
  const { currentUrl, lang, pages, faqs, history, profile } = opts;
  const question = normalizeQuestion(opts.question);

  // Shipping / bank / payments → shop phone, not product chat
  if (OUT_OF_SCOPE_RE.test(question) && !wantsNavigation(question)) {
    return outOfScopeReply(lang);
  }

  const named = namedProducts(question, pages);

  // Named product: use/dose/ingredients first, then general product blurb
  if (named.length) {
    const useAns = tryProductUse(question, named, lang);
    if (useAns) return useAns;
    const directProduct = tryDirectProduct(question, named, lang, faqs);
    if (directProduct) return directProduct;
  }

  // Situation / need (no product name) → suggest 1–3 products + cards
  const situation = trySituationSuggest(question, pages, lang);
  if (situation) return situation;

  const productFaqs = faqs.filter(isProductFaq);
  const direct = tryDirectFaq(question, productFaqs, lang);
  if (direct && !wantsNavigation(question)) {
    return direct;
  }

  const hits = await rankHits(question);

  // Name matches always win a slot in context
  const namedBlocks = named.map((p, i) => {
    const text = (p.content || p.description || "")
      .replace(/\s+/g, " ")
      .slice(0, 500);
    return `[P${i + 1}] ${p.title}\n${p.url}\n${text}`;
  });

  const hitBlocks = hits
    .filter((h) => !named.some((p) => p.url === h.url))
    .slice(0, named.length ? 2 : 4)
    .map((h, i) => {
      const text = h.text.replace(/\s+/g, " ").slice(0, 420);
      return `[${i + 1}] ${h.title}\n${h.url ?? ""}\n${text}`;
    });

  const context = [...namedBlocks, ...hitBlocks].join("\n\n");

  const topFaqs = productFaqs
    .map((f) => ({
      f,
      score: lexicalOverlap(question, f.question),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter((x) => x.score > 0.15)
    .map((x) => `Q: ${x.f.question}\nA: ${x.f.answer.slice(0, 260)}`)
    .join("\n\n");

  const needNav = wantsNavigation(question);
  const catalogPages = [
    ...named,
    ...pages
      .filter((p) => p.url.startsWith("/products/") || p.url.startsWith("/collections/"))
      .map((p) => ({
        p,
        score: lexicalOverlap(
          question,
          `${p.title} ${p.description} ${(p.keywords ?? []).join(" ")}`,
        ),
      }))
      .filter((x) => x.score > 0.12)
      .sort((a, b) => b.score - a.score)
      .slice(0, needNav ? 8 : 5)
      .map((x) => x.p),
  ];
  const seen = new Set<string>();
  const catalog = catalogPages
    .filter((p) => {
      if (seen.has(p.url)) return false;
      seen.add(p.url);
      return true;
    })
    .map((p) => `${p.title} → ${p.url}`)
    .join("\n");

  const languageRule =
    lang === "el"
      ? "Reply in natural Greek."
      : "Reply in natural English.";

  const system = `You are the YGIA Natural Health shop assistant on a voice call. Customers speak casually (with uh/um). Understand what they truly need, then give brief shop-style advice and name 1–3 real products from Product knowledge / Catalog that fit — with a short why from the product text. Never invent products.
Examples of needs: sleep, stress, joints, digestion, sexual drive/libido, feeling younger, energy, immunity.
Product-use questions (dose, ingredients, how to take a named product) → answer from that product’s label only.
Out of scope only for shipping, payments, banks, COD, returns, order tracking → say call +357 22 610 418.
No doctor disclaimers. Do not diagnose disease. You MAY give practical product advice based on what the catalog says products are for.
2–4 short spoken sentences. No markdown, no URLs, no handles.
Phone +357 22 610 418 ONLY if the catalog truly has nothing related.
When listing options, label them Option A, Option B, Option C so the customer can refer to them.
Use session history for follow-ups (e.g. “tell me about B”). Stay consistent — do not reshuffle prior options unless they ask for new ideas.
Navigation null unless they ask to open a page.
${languageRule}

${profile ? `Client profile:\n${profileContextBlock(profile)}\n` : ""}
Recent conversation:
${(history ?? [])
  .slice(-8)
  .map((m) => `${m.role}: ${m.content.slice(0, 280)}`)
  .join("\n") || "(none)"}

Product FAQs:
${topFaqs || "(none)"}

Product knowledge:
${context || "(none)"}

Catalog:
${catalog || "(none)"}

Current: ${currentUrl ?? "n/a"}

JSON only: {"answer":"...","navigation":{"url":"/products/...","label":"..."}|null,"language":"${lang}"}`;

  const raw = await nvidiaChatCompletion({
    system,
    user: question,
    temperature: 0.1,
    maxTokens: 200,
  });
  const parsed = extractJsonObject(raw);

  const fallback =
    lang === "el"
      ? "Δεν έχω αυτή τη λεπτομέρεια για το προϊόν — καλέστε μας στο +357 22 610 418."
      : "I don't have that product detail — please call us on +357 22 610 418.";

  // Prefer named product pages for navigation resolution
  const navHits = [
    ...named.map((p) => ({
      id: p.id,
      type: "page" as const,
      title: p.title,
      text: p.description,
      url: p.url,
      hash: p.hash,
      embedding: [],
      score: 1,
    })),
    ...hits,
  ];

  const productHits = hits.filter(
    (h) => h.score > 0.25 && h.url?.startsWith("/products/"),
  );
  let finalListings = productListings(named, productHits, pages, 3);
  const sit = trySituationSuggest(question, pages, lang);
  if (!finalListings.length && sit?.listings?.length) {
    finalListings = sit.listings;
  }

  let answer = parsed.answer?.trim() || fallback;
  const phoneFail =
    /610\s*418|don't have that product detail|do not have that product/i.test(
      answer,
    ) || !answer;

  // Prefer real product copy over a phone handoff when we can name a product
  if (phoneFail && named.length) {
    const direct = tryDirectProduct(question, named, lang, faqs);
    if (direct) return direct;
  }
  if (phoneFail && sit) return sit;

  return {
    answer,
    navigation: resolveNavigation(
      pages,
      navHits,
      lang,
      question,
      parsed.navigation,
    ),
    listings: finalListings.length ? finalListings : sit?.listings,
    language: lang,
    sources: (named.length ? named : hits)
      .slice(0, 3)
      .map((h) => ({ title: h.title, url: h.url })),
  };
}

export async function answerQuestion(opts: {
  question: string;
  currentUrl?: string;
  /** Reply language — English only. */
  language?: AppLanguage;
  /** Prior turns in this call (session memory). */
  history?: ChatMessage[];
  /** Last offered A/B/C product cards from the client. */
  lastListings?: NavigationTarget[];
  /** Lookup existing client profile by phone or id. */
  profilePhone?: string;
  profileId?: string;
}): Promise<ChatResponse> {
  const question = normalizeQuestion(opts.question);
  const { currentUrl, history, lastListings } = opts;
  const lang: AppLanguage = "en";
  const store = await loadStore();
  const faqs = store.faqs.map((f) => ({
    question: f.question,
    answer: f.answer,
    product: f.product,
  }));

  const profile =
    (await findProfile({
      id: opts.profileId,
      phone: opts.profilePhone,
    })) || null;

  if (OUT_OF_SCOPE_RE.test(question) && !wantsNavigation(question)) {
    return { ...outOfScopeReply(lang), profile: profile ? { id: profile.id, name: profile.name } : null };
  }

  // Clinical conditions → herbalist only (never invent SKUs from caution text)
  if (CLINICAL_HANDOFF_RE.test(question) && !namedProducts(question, store.pages).length) {
    return {
      ...clinicalHandoffReply(question, lang),
      profile: profile ? { id: profile.id, name: profile.name } : null,
    };
  }

  const detailSource = detectDetailSource(question);
  const focus = resolveFocusProduct(
    question,
    store.pages,
    history,
    lastListings,
  );

  // “Can I take it with medicine?” — keep the product in focus, don’t invent cards
  if (isMedicineInteractionQuestion(question)) {
    return {
      ...medicineInteractionReply(focus, lang),
      profile: profile ? { id: profile.id, name: profile.name } : null,
    };
  }

  // Follow-up: “option B”, “tell me about A”
  const choiceIdx = parseChoiceIndex(question);
  const priorChoices = lastAssistantChoices(lastListings);
  if (choiceIdx !== null && priorChoices[choiceIdx]) {
    const chosen = priorChoices[choiceIdx]!;
    const page = store.pages.find(
      (p) => normalizePath(p.url) === normalizePath(chosen.url),
    );
    if (page) {
      const letter = chosen.choice ?? CHOICE_LETTERS[choiceIdx]!;
      const detail = isProductUseQuestion(question)
        ? tryProductUse(question, [page], lang)
        : tryDirectProduct(
            detailSource === "website"
              ? `website details for ${page.title}`
              : `professional details for ${page.title}`,
            [page],
            lang,
            faqs,
          );
      const spoken =
        detail?.answer ||
        productDetailSpeech(page, lang, faqs, detailSource);
      const answer = spoken.startsWith("Option ")
        ? spoken
        : `Option ${letter}. ${spoken}`.slice(0, 480);
      return {
        answer,
        navigation: wantsNavigation(question)
          ? { ...listingFor(page), choice: letter }
          : null,
        listings: [{ ...listingFor(page), choice: letter }],
        language: lang,
        sources: [{ title: page.title, url: page.url }],
        profile: profile ? { id: profile.id, name: profile.name } : null,
      };
    }
  }

  const named = namedProducts(question, store.pages);
  const productFocus = named[0] ? named : focus ? [focus] : [];

  // “What else about Eros M?” / “more details” → always full product description, never a browse list
  if (productFocus.length && wantsProductDetail(question)) {
    const directProduct = tryDirectProduct(
      question,
      productFocus,
      lang,
      faqs,
    );
    if (directProduct) {
      return {
        ...directProduct,
        suggestedPrompts: predictedAsksFor(
          profile,
          question,
          productFocus.map((p) => p.title),
        ),
        profile: profile ? { id: profile.id, name: profile.name } : null,
      };
    }
  }

  if (productFocus.length) {
    const useAns = tryProductUse(question, productFocus, lang);
    if (useAns) {
      return {
        ...useAns,
        profile: profile ? { id: profile.id, name: profile.name } : null,
      };
    }
    // Named product without a situation browse intent → detail
    if (named.length > 0 && !looksLikeNeedQuestion(question)) {
      const directProduct = tryDirectProduct(
        question,
        productFocus,
        lang,
        faqs,
      );
      if (directProduct) {
        return {
          ...directProduct,
          profile: profile ? { id: profile.id, name: profile.name } : null,
        };
      }
    }
  }

  // Profile card → expand vague / personal asks with their goals & symptoms
  let situationQuestion = question;
  if (
    profile &&
    (isVaguePersonalAsk(question) ||
      (!matchPlaybook(question).length && problemsFromProfile(profile).length))
  ) {
    situationQuestion = enrichQuestionWithProfile(question, profile);
  }

  // Never browse a category when they asked for details on a named product
  const situation =
    productFocus.length && wantsProductDetail(question)
      ? null
      : trySituationSuggest(situationQuestion, store.pages, lang);
  if (situation) {
    const profileProblems = problemsFromProfile(profile);
    let answer = situation.answer;
    if (
      profileProblems.length &&
      isVaguePersonalAsk(question) &&
      !/looking at your profile/i.test(answer)
    ) {
      const lead = profileProblems[0]!.label;
      const also = profileProblems
        .slice(1, 2)
        .map((p) => p.label)
        .join(", ");
      // Rewrite opener so secondary goals don't steal the headline
      const body = answer
        .replace(/^For [^,]+,\s*here are three options\.\s*/i, "")
        .replace(/^Looking at your profile[^,]*,\s*/i, "");
      answer = (
        also
          ? `Looking at your profile, starting with ${lead} (also noted: ${also}). Here are three options. ${body}`
          : `Looking at your profile, starting with ${lead}. Here are three options. ${body}`
      ).slice(0, 520);
    } else if (
      profile?.notes &&
      !answer.includes(profile.notes.slice(0, 40))
    ) {
      answer = `${answer} (Keeping in mind your profile notes.)`.slice(0, 520);
    }
    const prompts = predictedAsksFor(
      profile,
      situationQuestion,
      (situation.listings || []).map((l) => l.label || ""),
    );
    return {
      ...situation,
      answer,
      suggestedPrompts: prompts,
      profile: profile ? { id: profile.id, name: profile.name } : null,
    };
  }

  // Usage / product FAQs (including generated per-product usage set)
  const faqHit = tryDirectFaq(question, faqs, lang);
  if (faqHit) {
    return {
      ...faqHit,
      suggestedPrompts: predictedAsksFor(profile, question),
      profile: profile ? { id: profile.id, name: profile.name } : null,
    };
  }

  if (!hasNvidia()) {
    throw new Error(
      "NVIDIA_API_KEY is missing. Add it to .env to enable the full AI assistant.",
    );
  }

  const result = await nvidiaAnswer({
    question,
    currentUrl,
    lang,
    pages: store.pages,
    faqs,
    history,
    profile,
  });
  return {
    ...result,
    listings: result.listings?.length
      ? withChoices(result.listings)
      : result.listings,
    suggestedPrompts: predictedAsksFor(
      profile,
      question,
      (result.listings || []).map((l) => l.label || ""),
    ),
    profile: profile ? { id: profile.id, name: profile.name } : null,
  };
}
