import { detectLanguage, fishLanguageTag, type AppLanguage } from "./language";
import { getEnv } from "./env";
import { loadStore } from "./rag/store";

const FISH_TTS_URL = "https://api.fish.audio/v1/tts";
const FISH_STT_URL = "https://api.fish.audio/v1/asr";

export async function fishTextToSpeech(
  text: string,
  language?: AppLanguage,
): Promise<ArrayBuffer> {
  const { fishApiKey, fishReferenceId, fishTtsModel, demoMode } = getEnv();

  if (demoMode || !fishApiKey) {
    return synthesizeSilentMp3();
  }

  let referenceId = fishReferenceId;
  try {
    const store = await loadStore();
    if (store.settings.fishReferenceId) {
      referenceId = store.settings.fishReferenceId;
    }
  } catch {
    /* use env fallback */
  }

  const lang = language ?? detectLanguage(text);
  const body: Record<string, unknown> = {
    text,
    format: "mp3",
    language: fishLanguageTag(lang),
    normalize: true,
  };
  if (referenceId) {
    body.reference_id = referenceId;
  }

  const res = await fetch(FISH_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${fishApiKey}`,
      "Content-Type": "application/json",
      model: fishTtsModel,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Fish TTS failed (${res.status}): ${errText}`);
  }

  return res.arrayBuffer();
}

export async function fishSpeechToText(
  audio: Buffer,
  mimeType: string,
  languageHint?: AppLanguage | "auto",
): Promise<string> {
  const { fishApiKey, demoMode } = getEnv();

  if (demoMode || !fishApiKey) {
    // Alternate demo transcripts so Greek mic path can be exercised offline
    if (languageHint === "el") {
      return "Τι προτείνετε για ξηρό δέρμα;";
    }
    return "What products do you recommend for dry skin?";
  }

  const form = new FormData();
  const bytes = new Uint8Array(audio);
  const blob = new Blob([bytes], { type: mimeType || "audio/webm" });
  form.append("audio", blob, "audio.webm");
  form.append("file", blob, "audio.webm");
  if (languageHint && languageHint !== "auto") {
    form.append("language", fishLanguageTag(languageHint));
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${fishApiKey}`,
    model: "transcribe-1-pro",
  };

  const res = await fetch(FISH_STT_URL, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    const altForm = new FormData();
    altForm.append("audio", blob, "audio.webm");
    altForm.append("file", blob, "audio.webm");
    if (languageHint && languageHint !== "auto") {
      altForm.append("language", fishLanguageTag(languageHint));
    }

    const alt = await fetch("https://api.fish.audio/v1/speech-to-text", {
      method: "POST",
      headers,
      body: altForm,
    });
    if (!alt.ok) {
      const errText = await alt.text();
      throw new Error(`Fish STT failed (${alt.status}): ${errText}`);
    }
    const data = (await alt.json()) as { text?: string; transcript?: string };
    return (data.text || data.transcript || "").trim();
  }

  const data = (await res.json()) as { text?: string; transcript?: string };
  return (data.text || data.transcript || "").trim();
}

/** Tiny valid-ish silent mp3 placeholder for demo mode. */
function synthesizeSilentMp3(): ArrayBuffer {
  const bytes = new Uint8Array([
    0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  return bytes.buffer;
}
