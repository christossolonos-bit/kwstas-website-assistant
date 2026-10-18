import { speakLanguage } from "@/lib/language";
import { edgeTextToSpeech, edgeVoiceFor } from "@/lib/edge-tts";
import { fishTextToSpeech } from "@/lib/fish";
import { getEnv } from "@/lib/env";
import { loadStore } from "@/lib/rag/store";
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

    // Greek answers → Fish; English answers → Edge Ava Multilingual
    const language = speakLanguage(text, body.language);
    const { fishApiKey, fishReferenceId } = getEnv();

    let referenceId = fishReferenceId;
    try {
      const store = await loadStore();
      if (store.settings.fishReferenceId?.trim()) {
        referenceId = store.settings.fishReferenceId.trim();
      }
    } catch {
      /* env fallback */
    }

    let audio: ArrayBuffer;
    let provider: string;
    let voiceLabel: string;

    if (language === "el") {
      if (fishApiKey && referenceId) {
        try {
          audio = await fishTextToSpeech(text, "el");
          provider = "fish";
          voiceLabel = referenceId;
        } catch (fishErr) {
          console.warn(
            "Fish TTS (Greek) failed, falling back to Edge Athina:",
            fishErr instanceof Error ? fishErr.message : fishErr,
          );
          audio = await edgeTextToSpeech(text, "el");
          provider = "edge-fallback";
          voiceLabel = edgeVoiceFor("el");
        }
      } else {
        audio = await edgeTextToSpeech(text, "el");
        provider = "edge";
        voiceLabel = edgeVoiceFor("el");
      }
    } else {
      // English → Edge Ava Multilingual
      audio = await edgeTextToSpeech(text, "en");
      provider = "edge";
      voiceLabel = edgeVoiceFor("en");
    }

    return new Response(audio, {
      status: 200,
      headers: {
        ...corsHeaders(),
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-Reply-Language": language,
        "X-TTS-Voice": voiceLabel,
        "X-TTS-Provider": provider,
        ...(provider === "fish" && referenceId
          ? { "X-Fish-Reference-Id": referenceId }
          : {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS failed";
    console.error("TTS error:", message);
    return json({ error: message }, 500);
  }
}
