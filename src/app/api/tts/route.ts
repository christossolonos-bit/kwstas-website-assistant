import { speakLanguage } from "@/lib/language";
import { edgeTextToSpeech, edgeVoiceFor } from "@/lib/edge-tts";
import { fishReferenceFor, fishTextToSpeech } from "@/lib/fish";
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

    // Mic/UI language picks the Fish voice: el = Greek id, en = English id
    const language = speakLanguage(text, body.language);
    const { fishApiKey } = getEnv();
    const referenceId = await fishReferenceFor(language);

    let audio: ArrayBuffer;
    let provider: string;
    let voiceLabel: string;

    if (fishApiKey && referenceId) {
      try {
        audio = await fishTextToSpeech(text, language);
        provider = "fish";
        voiceLabel = referenceId;
      } catch (fishErr) {
        console.warn(
          `Fish TTS (${language}) failed, falling back to Edge:`,
          fishErr instanceof Error ? fishErr.message : fishErr,
        );
        audio = await edgeTextToSpeech(text, language);
        provider = "edge-fallback";
        voiceLabel = edgeVoiceFor(language);
      }
    } else {
      audio = await edgeTextToSpeech(text, language);
      provider = "edge";
      voiceLabel = edgeVoiceFor(language);
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
