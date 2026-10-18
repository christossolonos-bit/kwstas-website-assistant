import { assertAdmin, getEnv } from "@/lib/env";
import { json, optionsOk } from "@/lib/http";
import {
  ingestFaqsFromText,
  rebuildIndex,
  replacePages,
} from "@/lib/rag/ingest";
import { loadStore, updateSettings } from "@/lib/rag/store";
import { maskSecret, readSecretsSync, updateSecrets } from "@/lib/secrets";
import type { PageEntry } from "@/lib/types";

export async function OPTIONS() {
  return optionsOk();
}

export async function GET(req: Request) {
  if (!assertAdmin(req.headers.get("authorization"))) {
    return json({ error: "Unauthorized" }, 401);
  }
  const store = await loadStore();
  const secrets = readSecretsSync();
  const env = getEnv();
  return json({
    updatedAt: store.updatedAt,
    faqCount: store.faqs.length,
    pageCount: store.pages.length,
    chunkCount: store.chunks.length,
    settings: store.settings,
    secrets: {
      fishApiKey: maskSecret(secrets.fishApiKey || env.fishApiKey),
      nvidiaApiKey: maskSecret(secrets.nvidiaApiKey || env.nvidiaApiKey),
    },
    pages: store.pages,
    faqs: store.faqs.map(({ id, question, answer, product, tags }) => ({
      id,
      question,
      answer,
      product,
      tags,
    })),
  });
}

export async function POST(req: Request) {
  if (!assertAdmin(req.headers.get("authorization"))) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = (await req.json()) as {
      action?: string;
      faqsText?: string;
      pages?: PageEntry[];
      settings?: {
        welcomeMessage?: string;
        fishReferenceId?: string;
        siteBaseUrl?: string;
      };
      fishApiKey?: string;
      nvidiaApiKey?: string;
    };

    const action = body.action ?? "ingest_faqs";

    if (action === "ingest_faqs") {
      if (!body.faqsText?.trim()) {
        return json({ error: "faqsText is required" }, 400);
      }
      const result = await ingestFaqsFromText(body.faqsText);
      return json({ ok: true, ...result });
    }

    if (action === "set_pages") {
      if (!Array.isArray(body.pages)) {
        return json({ error: "pages array is required" }, 400);
      }
      await replacePages(body.pages);
      return json({ ok: true, pageCount: body.pages.length });
    }

    if (action === "reindex") {
      const result = await rebuildIndex();
      return json({ ok: true, ...result });
    }

    if (action === "settings") {
      const store = await updateSettings(body.settings ?? {});
      const secretPatch: { fishApiKey?: string; nvidiaApiKey?: string } = {};
      if (typeof body.fishApiKey === "string" && body.fishApiKey.trim()) {
        secretPatch.fishApiKey = body.fishApiKey.trim();
      }
      if (typeof body.nvidiaApiKey === "string" && body.nvidiaApiKey.trim()) {
        secretPatch.nvidiaApiKey = body.nvidiaApiKey.trim();
      }
      if (Object.keys(secretPatch).length) {
        await updateSecrets(secretPatch);
      }
      const secrets = readSecretsSync();
      const env = getEnv();
      return json({
        ok: true,
        settings: store.settings,
        secrets: {
          fishApiKey: maskSecret(secrets.fishApiKey || env.fishApiKey),
          nvidiaApiKey: maskSecret(secrets.nvidiaApiKey || env.nvidiaApiKey),
        },
      });
    }

    if (action === "clear_faqs") {
      const store = await loadStore();
      store.faqs = [];
      const { saveStore } = await import("@/lib/rag/store");
      await saveStore(store);
      const result = await rebuildIndex();
      return json({ ok: true, ...result });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    return json({ error: message }, 500);
  }
}
