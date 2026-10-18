import type { AppLanguage } from "@/lib/language";
import { fishSpeechToText } from "@/lib/fish";
import { json, optionsOk } from "@/lib/http";

export async function OPTIONS() {
  return optionsOk();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return json({ error: "audio file is required" }, 400);
    }
    const hintRaw = String(form.get("language") || "auto");
    const languageHint: AppLanguage | "auto" =
      hintRaw === "el" || hintRaw === "en" ? hintRaw : "auto";

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await fishSpeechToText(
      buffer,
      file.type || "audio/webm",
      languageHint,
    );
    return json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "STT failed";
    return json({ error: message }, 500);
  }
}
