export type AppLanguage = "el" | "en";

const GREEK_RE = /[\u0370-\u03FF\u1F00-\u1FFF]/;

/** Detect reply language from customer text. Defaults to English. */
export function detectLanguage(text: string): AppLanguage {
  const sample = text.trim();
  if (!sample) return "en";

  let greek = 0;
  let latin = 0;
  for (const ch of sample) {
    if (GREEK_RE.test(ch)) greek += 1;
    else if (/[A-Za-z]/.test(ch)) latin += 1;
  }

  if (greek === 0 && latin === 0) return "en";
  // Prefer Greek when Greek letters are present at a meaningful share
  if (greek >= 2 && greek >= latin * 0.35) return "el";
  if (greek > latin) return "el";
  return "en";
}

export function fishLanguageTag(lang: AppLanguage): string {
  return lang === "el" ? "el" : "en";
}

export const UI_COPY = {
  en: {
    title: "Site Assistant",
    subtitle: "Ask anything · voice answers · EL/EN",
    placeholder: "Type in Greek or English…",
    thinking: "Thinking…",
    speaking: "Speaking…",
    listening: "Listening… tap mic to stop",
    transcribing: "Transcribing…",
    goingTo: (label: string) => `Going to ${label}…`,
    openPage: "Open page",
    micDenied: "Microphone permission denied",
    micUnsupported: "Microphone not supported in this browser",
    sttEmpty: "Didn't catch that — try again",
    ttsBlocked: "Tap unmute / interact to enable audio",
    ttsUnavailable: "Voice unavailable — answer shown as text",
    sorry: (msg: string) => `Sorry — ${msg}`,
    mute: "Mute voice",
    unmute: "Unmute voice",
    minimize: "Minimize",
    openAssistant: "Open assistant",
    speak: "Speak",
    send: "Send",
    scanning: "Learning this page…",
    scanned: "Ready — ask me about this site",
  },
  el: {
    title: "Βοηθός Ιστότοπου",
    subtitle: "Ρωτήστε ό,τι θέλετε · φωνητικές απαντήσεις · EL/EN",
    placeholder: "Γράψτε στα ελληνικά ή αγγλικά…",
    thinking: "Σκέφτομαι…",
    speaking: "Μιλώ…",
    listening: "Ακούω… πατήστε το μικρόφωνο για τέλος",
    transcribing: "Μετατροπή ομιλίας…",
    goingTo: (label: string) => `Μεταφορά σε ${label}…`,
    openPage: "Άνοιγμα σελίδας",
    micDenied: "Δεν δόθηκε άδεια μικροφώνου",
    micUnsupported: "Το μικρόφωνο δεν υποστηρίζεται σε αυτόν τον περιηγητή",
    sttEmpty: "Δεν κατάλαβα — δοκιμάστε ξανά",
    ttsBlocked: "Πατήστε για να ενεργοποιηθεί ο ήχος",
    ttsUnavailable: "Η φωνή δεν είναι διαθέσιμη — η απάντηση είναι σε κείμενο",
    sorry: (msg: string) => `Συγγνώμη — ${msg}`,
    mute: "Σίγαση φωνής",
    unmute: "Ενεργοποίηση φωνής",
    minimize: "Ελαχιστοποίηση",
    openAssistant: "Άνοιγμα βοηθού",
    speak: "Ομιλία",
    send: "Αποστολή",
    scanning: "Μαθαίνω αυτή τη σελίδα…",
    scanned: "Έτοιμος — ρωτήστε με για τον ιστότοπο",
  },
} as const;

export function copyFor(lang: AppLanguage) {
  return UI_COPY[lang];
}
