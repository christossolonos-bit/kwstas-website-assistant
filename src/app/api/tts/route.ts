import { detectLanguage, type AppLanguage } from "@/lib/language";
import { edgeTextToSpeech } from "@/lib/edge-tts";
import { fishTextToSpeech } from "@/lib/fish";
import { getEnv } from "@/lib/env";
import { corsHeaders, json, optionsOk } from "@/lib/http";

export async function OPTIONS() {
  return optionsOk();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { text?: string; language?: string };
    const text = (body.text ?? "").trim();
    if (!text) {
      return json({ error: "text is required" }, 400);
    }
    if (text.length > 2000) {
      return json({ error: "text too long" }, 400);
    }

    const language: AppLanguage =
      body.language === "el" || body.language === "en"
        ? body.language
        : detectLanguage(text);

    const { ttsProvider, fishApiKey } = getEnv();
    let audio: ArrayBuffer;
    let provider = "edge";

    if (ttsProvider === "fish" && fishApiKey) {
      audio = await fishTextToSpeech(text, language);
      provider = "fish";
    } else {
      try {
        audio = await edgeTextToSpeech(text, language);
      } catch (edgeErr) {
        if (fishApiKey) {
          audio = await fishTextToSpeech(text, language);
          provider = "fish-fallback";
        } else {
          throw edgeErr;
        }
      }
    }

    return new Response(audio, {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Reply-Language": language,
        "X-TTS-Provider": provider,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS failed";
    console.error("TTS error:", message);
    return json({ error: message }, 500);
  }
}
