import { assertAdmin, getEnv } from "@/lib/env";
import { json, optionsOk } from "@/lib/http";
import {
  deleteProfile,
  loadProfiles,
  upsertProfile,
} from "@/lib/profiles";
import {
  ingestFaqsFromText,
  rebuildIndex,
  replacePages,
} from "@/lib/rag/ingest";
import { loadStore, updateSettings } from "@/lib/rag/store";
import { maskSecret, readSecretsSync, updateSecrets } from "@/lib/secrets";
import type { ClientProfile, PageEntry } from "@/lib/types";

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
  const profiles = await loadProfiles();
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
    profiles,
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
        fishReferenceIdEn?: string;
        siteBaseUrl?: string;
      };
      fishApiKey?: string;
      nvidiaApiKey?: string;
      profile?: Partial<ClientProfile> & { name?: string };
      profileId?: string;
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

    if (action === "list_profiles") {
      return json({ ok: true, profiles: await loadProfiles() });
    }

    if (action === "upsert_profile") {
      const p = body.profile;
      if (!p?.name?.trim()) {
        return json({ error: "profile.name is required" }, 400);
      }
      const saved = await upsertProfile({
        id: p.id,
        name: p.name,
        phone: p.phone,
        email: p.email,
        goals: p.goals,
        productsUsing: p.productsUsing,
        notes: p.notes,
      });
      return json({ ok: true, profile: saved, profiles: await loadProfiles() });
    }

    if (action === "delete_profile") {
      if (!body.profileId) {
        return json({ error: "profileId is required" }, 400);
      }
      const ok = await deleteProfile(body.profileId);
      return json({ ok, profiles: await loadProfiles() });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    return json({ error: message }, 500);
  }
}
