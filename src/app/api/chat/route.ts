import { answerQuestion } from "@/lib/rag/chat";
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
    };
    const question = (body.question ?? body.message ?? "").trim();
    if (!question) {
      return json({ error: "question is required" }, 400);
    }
    const result = await answerQuestion({
      question,
      currentUrl: body.currentUrl,
    });
    return json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat failed";
    return json({ error: message }, 500);
  }
}
