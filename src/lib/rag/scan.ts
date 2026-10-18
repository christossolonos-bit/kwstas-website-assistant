import { randomUUID } from "crypto";
import type { PageEntry, PageScanPayload } from "../types";
import { rebuildIndex } from "./ingest";
import { loadStore, saveStore } from "./store";

function normalizePath(url: string): string {
  try {
    if (url.startsWith("http")) {
      const u = new URL(url);
      return `${u.pathname}${u.search}`.replace(/\/$/, "") || "/";
    }
  } catch {
    /* ignore */
  }
  const path = url.split("#")[0];
  return path.replace(/\/$/, "") || "/";
}

function upsertPage(pages: PageEntry[], incoming: PageEntry): PageEntry[] {
  const key = normalizePath(incoming.url);
  const idx = pages.findIndex((p) => normalizePath(p.url) === key);
  if (idx === -1) return [...pages, incoming];
  const prev = pages[idx]!;
  const next = [...pages];
  next[idx] = {
    ...prev,
    ...incoming,
    id: prev.id,
    keywords: Array.from(
      new Set([...(prev.keywords ?? []), ...(incoming.keywords ?? [])]),
    ),
  };
  return next;
}

/** Merge a scanned page (+ discovered links) into the knowledge store and reindex. */
export async function ingestPageScan(payload: PageScanPayload): Promise<{
  pageUrl: string;
  sectionCount: number;
  linkCount: number;
  chunkCount: number;
}> {
  const path = normalizePath(payload.url);
  if (!payload.content?.trim() && !payload.title?.trim()) {
    throw new Error("Scan payload is empty");
  }

  let store = await loadStore();
  const now = new Date().toISOString();

  const mainPage: PageEntry = {
    id: randomUUID(),
    url: path,
    title: payload.title?.trim() || path,
    description: (payload.description || payload.content.slice(0, 220)).trim(),
    keywords: payload.keywords ?? [],
    content: payload.content.trim().slice(0, 40000),
    sections: (payload.sections ?? [])
      .filter((s) => s.title || s.text)
      .slice(0, 40)
      .map((s) => ({
        id: s.id?.replace(/^#/, "") || randomUUID().slice(0, 8),
        title: s.title.slice(0, 200),
        text: s.text.slice(0, 4000),
      })),
    scannedAt: now,
    hash: payload.sections?.[0]?.id
      ? `#${payload.sections[0].id.replace(/^#/, "")}`
      : undefined,
  };

  store.pages = upsertPage(store.pages, mainPage);

  for (const link of (payload.links ?? []).slice(0, 30)) {
    const linkPath = normalizePath(link.url);
    if (!linkPath || linkPath === path) continue;
    const body = (link.description || "").trim();
    store.pages = upsertPage(store.pages, {
      id: randomUUID(),
      url: linkPath,
      title: link.title?.trim() || linkPath,
      description: body.slice(0, 280) || link.title || linkPath,
      keywords: [],
      scannedAt: body ? now : undefined,
      content: body ? body.slice(0, 12000) : undefined,
    });
  }

  await saveStore(store);
  const { chunkCount } = await rebuildIndex();

  return {
    pageUrl: path,
    sectionCount: mainPage.sections?.length ?? 0,
    linkCount: payload.links?.length ?? 0,
    chunkCount,
  };
}
