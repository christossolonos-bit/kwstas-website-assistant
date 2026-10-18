import { answerQuestion } from "@/lib/rag/chat";
import type { AppLanguage } from "@/lib/language";
import type { ChatMessage, NavigationTarget } from "@/lib/types";
import { json, optionsOk } from "@/lib/http";

export async function OPTIONS() {
  return optionsOk();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      question?: string;
      message?: string;
      currentUrl?: string;
      language?: string;
      history?: ChatMessage[];
      lastListings?: NavigationTarget[];
      profilePhone?: string;
      profileId?: string;
    };
    const question = (body.question ?? body.message ?? "").trim();
    if (!question) {
      return json({ error: "question is required" }, 400);
    }
    const language: AppLanguage | undefined =
      body.language === "el" || body.language === "en"
        ? body.language
        : undefined;
    const history = Array.isArray(body.history)
      ? body.history
          .filter(
            (m) =>
              m &&
              (m.role === "user" || m.role === "assistant") &&
              typeof m.content === "string",
          )
          .slice(-12)
      : undefined;
    const result = await answerQuestion({
      question,
      currentUrl: body.currentUrl,
      language,
      history,
      lastListings: Array.isArray(body.lastListings)
        ? body.lastListings.slice(0, 3)
        : undefined,
      profilePhone: body.profilePhone,
      profileId: body.profileId,
    });
    return json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return json({ error: message }, 500);
  }
}
