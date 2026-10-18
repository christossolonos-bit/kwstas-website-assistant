import { EdgeTTS } from "@andresaya/edge-tts";
import type { AppLanguage } from "./language";
import { getEnv } from "./env";

const DEFAULT_VOICES: Record<AppLanguage, string> = {
  el: "el-GR-AthinaNeural",
  /** Ava Multilingual — natural English (and can handle mixed phrases) */
  en: "en-US-AvaMultilingualNeural",
};

export function edgeVoiceFor(lang: AppLanguage): string {
  const env = getEnv();
  if (lang === "el" && env.edgeVoiceEl) return env.edgeVoiceEl;
  if (lang === "en" && env.edgeVoiceEn) return env.edgeVoiceEn;
  return DEFAULT_VOICES[lang];
}

function toArrayBuffer(audio: Buffer | Uint8Array | ArrayBuffer): ArrayBuffer {
  if (audio instanceof ArrayBuffer) return audio;
  const view = Buffer.isBuffer(audio)
    ? new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength)
    : audio instanceof Uint8Array
      ? audio
      : new Uint8Array(audio);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/** Synthesize speech with Microsoft Edge TTS (no API key). Returns MP3 bytes. */
export async function edgeTextToSpeech(
  text: string,
  language: AppLanguage,
): Promise<ArrayBuffer> {
  const voice = edgeVoiceFor(language);
  const tts = new EdgeTTS();
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const result = await tts.generate(text, voice, {
        rate: "0%",
        volume: "+0%",
        pitch: "0Hz",
      });
      if (!result.audio) throw new Error("Edge TTS returned no audio");
      return toArrayBuffer(result.audio as Buffer | Uint8Array | ArrayBuffer);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /429|503|timeout|ECONNRESET|HANDSHAKE/i.test(msg);
      if (!retryable || attempt === 3) break;
      await sleep(800 * (attempt + 1));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Edge TTS failed");
}
