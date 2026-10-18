import { promises as fs } from "fs";
import path from "path";
import type {
  AssistantSettings,
  KnowledgeChunk,
  KnowledgeStore,
  PageEntry,
  QaEntry,
} from "../types";
import { getEnv } from "../env";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "knowledge.json");

const defaultSettings = (): AssistantSettings => {
  const env = getEnv();
  return {
    welcomeMessage:
      "Hi! I can answer product questions and take you to the right page. Type or speak anytime.",
    fishReferenceId: env.fishReferenceId,
    siteBaseUrl: env.siteBaseUrl,
  };
};

export function emptyStore(): KnowledgeStore {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    pages: [],
    faqs: [],
    chunks: [],
    settings: defaultSettings(),
  };
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function loadStore(): Promise<KnowledgeStore> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as KnowledgeStore;
    return {
      ...emptyStore(),
      ...parsed,
      settings: { ...defaultSettings(), ...parsed.settings },
    };
  } catch {
    const store = emptyStore();
    await saveStore(store);
    return store;
  }
}

export async function saveStore(store: KnowledgeStore): Promise<void> {
  await ensureDataDir();
  store.updatedAt = new Date().toISOString();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function updateSettings(
  patch: Partial<AssistantSettings>,
): Promise<KnowledgeStore> {
  const store = await loadStore();
  store.settings = { ...store.settings, ...patch };
  await saveStore(store);
  return store;
}

export async function setPages(pages: PageEntry[]): Promise<KnowledgeStore> {
  const store = await loadStore();
  store.pages = pages;
  await saveStore(store);
  return store;
}

export async function setFaqs(faqs: QaEntry[]): Promise<KnowledgeStore> {
  const store = await loadStore();
  store.faqs = faqs;
  await saveStore(store);
  return store;
}

export async function setChunks(chunks: KnowledgeChunk[]): Promise<KnowledgeStore> {
  const store = await loadStore();
  store.chunks = chunks;
  await saveStore(store);
  return store;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export async function searchChunks(
  queryEmbedding: number[],
  topK = 6,
): Promise<Array<KnowledgeChunk & { score: number }>> {
  const store = await loadStore();
  return store.chunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
