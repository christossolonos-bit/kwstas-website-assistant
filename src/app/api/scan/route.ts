import { json, optionsOk } from "@/lib/http";
import { ingestPageScan } from "@/lib/rag/scan";
import type { PageScanPayload } from "@/lib/types";

export async function OPTIONS() {
  return optionsOk();
}

/**
 * Public endpoint used by the embed widget to teach the assistant about the host page.
 * Size-limited; no admin auth (the widget runs on customer sites).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PageScanPayload;
    if (!body?.url || typeof body.url !== "string") {
      return json({ error: "url is required" }, 400);
    }
    if (typeof body.content !== "string") {
      return json({ error: "content is required" }, 400);
    }
    if (body.content.length > 60000) {
      return json({ error: "content too large" }, 400);
    }

    const result = await ingestPageScan({
      url: body.url,
      title: String(body.title || "").slice(0, 300),
      description: body.description ? String(body.description).slice(0, 500) : "",
      content: body.content,
      keywords: Array.isArray(body.keywords)
        ? body.keywords.map(String).slice(0, 40)
        : [],
      sections: Array.isArray(body.sections) ? body.sections.slice(0, 40) : [],
      links: Array.isArray(body.links) ? body.links.slice(0, 30) : [],
    });

    return json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return json({ error: message }, 500);
  }
}
