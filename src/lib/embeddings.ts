/** Fully local embeddings — no external AI APIs. */

const EMBED_DIMS = 128;

/** Expand casual phrasing into searchable terms (EL + EN). */
const SYNONYM_GROUPS: string[][] = [
  [
    "dry",
    "dehydrated",
    "dehydration",
    "tight",
    "flaky",
    "flake",
    "rough",
    "parched",
    "ξηρ",
    "ξερο",
    "ενυδατ",
    "αφυδατ",
    "σφιχτ",
    "φολιδ",
    "τραχ",
    "hydration",
    "hydrat",
    "moistur",
  ],
  [
    "ship",
    "shipping",
    "delivery",
    "deliver",
    "package",
    "parcel",
    "track",
    "αποστολ",
    "παραδοσ",
    "μεταφορικ",
    "δεμα",
    "δέμα",
    "κουτι",
  ],
  [
    "return",
    "refund",
    "exchange",
    "money back",
    "επιστροφ",
    "χρηματα",
    "αλλαγη",
    "αλλαγή",
  ],
  ["about", "brand", "company", "who", "story", "σχετικ", "εταιρ", "μαρκα", "μάρκα", "ποιοι", "ygia"],
  ["ingredient", "formula", "contain", "συστατικ", "φορμουλ", "φόρμουλ", "extract", "εκχυλισμ"],
  ["how to use", "dosage", "capsule", "χρηση", "χρήση", "δοσολογ", "καψουλ"],
  [
    "supplement",
    "herbal",
    "vitamin",
    "capsule",
    "συμπληρωμ",
    "βοταν",
    "βιταμιν",
  ],
  [
    "order",
    "arrive",
    "arrival",
    "when",
    "track",
    "status",
    "παραγγελ",
    "ερχ",
    "φτασ",
    "πότε",
    "ποτε",
    "κατασταση",
    "κατάσταση",
  ],
  [
    "hours",
    "open",
    "phone",
    "call",
    "contact",
    "speak",
    "human",
    "ωραρ",
    "τηλεφων",
    "επικοινων",
    "μιλησ",
    "άνθρωπ",
    "ανθρωπ",
  ],
  [
    "pay",
    "payment",
    "card",
    "cod",
    "cash on delivery",
    "πληρωμ",
    "καρτα",
    "κάρτα",
    "αντικαταβολ",
  ],
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1);
}

function expandTokens(tokens: string[]): string[] {
  const out = new Set(tokens);
  for (const token of tokens) {
    for (const group of SYNONYM_GROUPS) {
      if (group.some((g) => token.includes(g) || g.includes(token))) {
        for (const g of group) out.add(g);
      }
    }
  }
  return [...out];
}

function hashInto(vec: number[], token: string, weight: number) {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % vec.length;
  vec[idx] += weight;

  if (token.length > 3) {
    const stem = token.slice(0, Math.min(6, token.length));
    let h2 = 2166136261;
    for (let i = 0; i < stem.length; i++) {
      h2 ^= stem.charCodeAt(i);
      h2 = Math.imul(h2, 16777619);
    }
    vec[Math.abs(h2) % vec.length] += weight * 0.6;
  }
}

export function embedTextLocal(text: string): number[] {
  const tokens = expandTokens(tokenize(text));
  const vec = new Array(EMBED_DIMS).fill(0);
  for (const token of tokens) {
    hashInto(vec, token, 1);
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function embedTexts(texts: string[]): Promise<number[][]> {
  return Promise.resolve(texts.map((t) => embedTextLocal(t)));
}

export function embedText(text: string): Promise<number[]> {
  return Promise.resolve(embedTextLocal(text));
}

/** Extra lexical boost for ranking (0–1-ish). */
export function lexicalOverlap(query: string, doc: string): number {
  const q = new Set(expandTokens(tokenize(query)));
  const d = new Set(tokenize(doc));
  if (q.size === 0 || d.size === 0) return 0;
  let hit = 0;
  for (const t of q) {
    for (const dt of d) {
      if (dt.includes(t) || t.includes(dt)) {
        hit += 1;
        break;
      }
    }
  }
  return hit / q.size;
}
