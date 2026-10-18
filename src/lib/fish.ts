import { detectLanguage, fishLanguageTag, type AppLanguage } from "./language";
import { getEnv } from "./env";
import { loadStore } from "./rag/store";

const FISH_TTS_URL = "https://api.fish.audio/v1/tts";
const FISH_STT_URL = "https://api.fish.audio/v1/asr";

/** Resolve Fish voice reference_id (English-only app). */
export async function fishReferenceFor(
  _language?: AppLanguage,
): Promise<string> {
  const { fishReferenceId, fishReferenceIdEn } = getEnv();
  let id = (fishReferenceIdEn || fishReferenceId || "").trim();

  try {
    const store = await loadStore();
    const fromEn = (store.settings.fishReferenceIdEn || "").trim();
    const fromEl = (store.settings.fishReferenceId || "").trim();
    if (fromEn) id = fromEn;
    else if (fromEl) id = fromEl;
  } catch {
    /* env fallback */
  }

  return id;
}

export async function fishTextToSpeech(
  text: string,
  language?: AppLanguage,
): Promise<ArrayBuffer> {
  const { fishApiKey, fishTtsModel, demoMode } = getEnv();

  if (demoMode || !fishApiKey) {
    return synthesizeSilentMp3();
  }

  const lang = language ?? detectLanguage(text);
  const referenceId = await fishReferenceFor(lang);

  if (!referenceId) {
    throw new Error(
      "Fish voice reference_id is missing. Save Greek/English voices in Settings or set FISH_REFERENCE_ID / FISH_REFERENCE_ID_EN.",
    );
  }

  const body: Record<string, unknown> = {
    text,
    format: "mp3",
    language: fishLanguageTag(lang),
    normalize: true,
    reference_id: referenceId,
  };

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

/** Strip Fish Pro speaker/emotion markup into plain customer text. */
function cleanTranscript(raw: string): string {
  return raw
    .replace(/<\|speaker:\d+\|>/g, " ")
    .replace(/\[[^\]]{1,40}\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extForMime(mimeType: string): string {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

export async function fishSpeechToText(
  audio: Buffer,
  mimeType: string,
  languageHint?: AppLanguage | "auto",
): Promise<string> {
  const { fishApiKey, demoMode } = getEnv();

  if (demoMode || !fishApiKey) {
    throw new Error(
      "Fish API key missing. Add it in Settings so the mic works in every browser.",
    );
  }

  if (!audio.length) {
    throw new Error("Empty audio recording");
  }

  const type = mimeType || "audio/webm";
  const filename = `speech.${extForMime(type)}`;
  const bytes = new Uint8Array(audio);
  const blob = new Blob([bytes], { type });

  const form = new FormData();
  form.append("audio", blob, filename);
  form.append("ignore_timestamps", "true");
  if (languageHint && languageHint !== "auto") {
    form.append("language", fishLanguageTag(languageHint));
  }

  const res = await fetch(FISH_STT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${fishApiKey}`,
      model: "transcribe-1-pro",
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Fish STT failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { text?: string; transcript?: string };
  const text = cleanTranscript(data.text || data.transcript || "");
  if (!text) {
    throw new Error("No speech detected in the recording — try again closer to the mic");
  }
  return text;
}

function synthesizeSilentMp3(): ArrayBuffer {
  const bytes = new Uint8Array([
    0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  return bytes.buffer;
}
