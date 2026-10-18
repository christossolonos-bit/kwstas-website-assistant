import {
  detectLanguage,
  speakLanguage,
  copyFor,
  type AppLanguage,
} from "../lib/language";
import { navigateHost, type NavTarget } from "./navigate";
import { enrichLinkedPages, scanCurrentPage } from "./scan-page";
import { WIDGET_CSS } from "./styles";

type ChatApiResponse = {
  answer: string;
  navigation: NavTarget | null;
  language?: AppLanguage;
  error?: string;
};

type ScriptConfig = {
  apiBase: string;
  assistantId: string;
  autoScan: boolean;
  /** Live shop origin, e.g. https://ygianaturalhealth.com */
  siteBaseUrl: string;
};

function readConfig(): ScriptConfig {
  const script =
    document.currentScript ||
    document.querySelector<HTMLScriptElement>(
      "script[data-api-base],script[src*='embed.js']",
    );
  const apiBase =
    script?.getAttribute("data-api-base") ||
    (script instanceof HTMLScriptElement && script.src
      ? new URL(script.src).origin
      : window.location.origin);
  const autoScanAttr = script?.getAttribute("data-auto-scan");
  const siteBaseAttr = script?.getAttribute("data-site-base") || "";
  return {
    apiBase: apiBase.replace(/\/$/, ""),
    assistantId: script?.getAttribute("data-assistant-id") || "default",
    autoScan: autoScanAttr == null ? true : autoScanAttr !== "false",
    siteBaseUrl: siteBaseAttr.replace(/\/$/, ""),
  };
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else node.setAttribute(k, v);
  }
  if (text != null) node.textContent = text;
  return node;
}

class VoiceSiteAssistant {
  private root: HTMLDivElement;
  private shadow: ShadowRoot;
  private config: ScriptConfig;
  private expanded = true;
  private muted = false;
  private busy = false;
  private uiLang: AppLanguage = "en";
  private mediaRecorder: MediaRecorder | null = null;
  private recognition: SpeechRecognition | null = null;
  private chunks: BlobPart[] = [];
  private audio: HTMLAudioElement | null = null;
  private messagesEl!: HTMLDivElement;
  private statusEl!: HTMLDivElement;
  private inputEl!: HTMLTextAreaElement;
  private micBtn!: HTMLButtonElement;
  private sendBtn!: HTMLButtonElement;
  private panel!: HTMLDivElement;
  private fab!: HTMLButtonElement;
  private titleEl!: HTMLDivElement;
  private subEl!: HTMLDivElement;
  private muteBtn!: HTMLButtonElement;
  private minBtn!: HTMLButtonElement;

  constructor(config: ScriptConfig) {
    this.config = config;
    const browserLang =
      typeof navigator !== "undefined" ? navigator.language || "" : "";
    if (browserLang.toLowerCase().startsWith("el")) this.uiLang = "el";

    this.root = el("div", { class: "vsa-root", id: "voice-site-assistant" });
    this.shadow = this.root.attachShadow({ mode: "open" });
    const style = el("style");
    style.textContent = WIDGET_CSS;
    this.shadow.appendChild(style);
    this.mountUi();
    this.applyUiCopy();
    document.body.appendChild(this.root);
    void this.bootstrap();
  }

  private t() {
    return copyFor(this.uiLang);
  }

  private setUiLang(lang: AppLanguage) {
    if (this.uiLang === lang) return;
    this.uiLang = lang;
    this.applyUiCopy();
  }

  private applyUiCopy() {
    const c = this.t();
    this.titleEl.textContent = c.title;
    this.subEl.textContent = c.subtitle;
    this.inputEl.placeholder = c.placeholder;
    this.fab.setAttribute("aria-label", c.openAssistant);
    this.fab.title = c.openAssistant;
    this.muteBtn.title = this.muted ? c.unmute : c.mute;
    this.minBtn.title = c.minimize;
    this.minBtn.setAttribute("aria-label", c.minimize);
    this.micBtn.title = c.speak;
    this.micBtn.setAttribute("aria-label", c.speak);
    this.sendBtn.title = c.send;
    this.sendBtn.setAttribute("aria-label", c.send);
    this.panel.setAttribute("aria-label", c.title);
  }

  private mountUi() {
    this.fab = el("button", {
      class: "vsa-fab",
      type: "button",
    });
    this.fab.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm3 5h10v2H7V9zm0 4h7v2H7v-2z"/></svg>';
    this.fab.style.display = "none";
    this.fab.addEventListener("click", () => this.setExpanded(true));

    this.panel = el("div", {
      class: "vsa-panel",
      role: "dialog",
    });

    const header = el("div", { class: "vsa-header" });
    const titles = el("div");
    this.titleEl = el("div", { class: "vsa-title" });
    this.subEl = el("div", { class: "vsa-sub" });
    titles.append(this.titleEl, this.subEl);
    header.appendChild(titles);

    const actions = el("div", { class: "vsa-header-actions" });
    this.muteBtn = el("button", {
      class: "vsa-icon-btn",
      type: "button",
      "aria-pressed": "false",
    }, "🔊");
    this.muteBtn.addEventListener("click", () => {
      this.muted = !this.muted;
      this.muteBtn.setAttribute("aria-pressed", String(this.muted));
      this.muteBtn.textContent = this.muted ? "🔇" : "🔊";
      this.muteBtn.title = this.muted ? this.t().unmute : this.t().mute;
      if (this.muted) this.stopAudio();
    });
    this.minBtn = el("button", {
      class: "vsa-icon-btn",
      type: "button",
    }, "–");
    this.minBtn.addEventListener("click", () => this.setExpanded(false));
    actions.append(this.muteBtn, this.minBtn);
    header.appendChild(actions);

    this.messagesEl = el("div", { class: "vsa-messages" });
    this.statusEl = el("div", { class: "vsa-status" });

    const composer = el("div", { class: "vsa-composer" });
    this.inputEl = el("textarea", {
      class: "vsa-input",
      rows: "1",
    }) as HTMLTextAreaElement;
    this.inputEl.addEventListener("input", () => {
      const v = this.inputEl.value.trim();
      if (v) this.setUiLang(detectLanguage(v));
    });
    this.inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void this.sendText();
      }
    });

    this.micBtn = el("button", {
      class: "vsa-mic",
      type: "button",
    }, "🎤");
    this.micBtn.addEventListener("click", () => void this.toggleMic());

    this.sendBtn = el("button", {
      class: "vsa-send",
      type: "button",
    }, "➤");
    this.sendBtn.addEventListener("click", () => void this.sendText());

    composer.append(this.inputEl, this.micBtn, this.sendBtn);
    this.panel.append(header, this.messagesEl, this.statusEl, composer);
    this.shadow.append(this.panel, this.fab);
  }

  private setExpanded(open: boolean) {
    this.expanded = open;
    this.panel.style.display = open ? "flex" : "none";
    this.fab.style.display = open ? "none" : "flex";
  }

  private setStatus(text: string) {
    this.statusEl.textContent = text;
  }

  private addMessage(
    role: "user" | "assistant",
    text: string,
    navigation?: NavTarget | null,
  ) {
    const bubble = el("div", { class: `vsa-msg ${role}` }, text);
    if (navigation?.url) {
      const btn = el(
        "button",
        { class: "vsa-nav", type: "button" },
        `→ ${navigation.label || this.t().openPage}`,
      );
      btn.addEventListener("click", () =>
        navigateHost(navigation, this.config.siteBaseUrl),
      );
      bubble.appendChild(document.createElement("br"));
      bubble.appendChild(btn);
    }
    this.messagesEl.appendChild(bubble);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private async bootstrap() {
    // Learn the host page in the background so answers use real site content
    if (this.config.autoScan) {
      void this.learnSite();
    }

    try {
      const res = await fetch(`${this.config.apiBase}/api/config`);
      if (res.ok) {
        const data = (await res.json()) as {
          welcomeMessage?: string;
          defaultLanguage?: AppLanguage;
          siteBaseUrl?: string;
        };
        if (data.siteBaseUrl) {
          this.config.siteBaseUrl = data.siteBaseUrl.replace(/\/$/, "");
        }
        if (data.defaultLanguage === "el" || data.defaultLanguage === "en") {
          this.setUiLang(data.defaultLanguage);
        }
        if (data.welcomeMessage) {
          this.setUiLang(detectLanguage(data.welcomeMessage) || this.uiLang);
          this.addMessage("assistant", data.welcomeMessage);
          void this.speak(
            data.welcomeMessage,
            detectLanguage(data.welcomeMessage),
          );
          return;
        }
      }
    } catch {
      /* ignore */
    }
    const fallback =
      this.uiLang === "el"
        ? "Γεια σας! Ρωτήστε με όπως θα ρωτούσατε στο τηλέφωνο — μπορώ να σας πάω στη σωστή σελίδα."
        : "Hi! Ask me the same things you'd call about — I can take you to the right page.";
    this.addMessage("assistant", fallback);
  }

  /** Scan this page (+ a few linked pages) and upload to the assistant knowledge base. */
  private async learnSite() {
    try {
      this.setStatus(this.t().scanning);
      const scan = scanCurrentPage();
      const linked = await enrichLinkedPages(scan.links, 5);
      const linkMap = new Map(scan.links.map((l) => [l.url, l]));
      for (const extra of linked) {
        linkMap.set(extra.url, {
          url: extra.url,
          title: extra.title,
          description: extra.description,
        });
      }

      const res = await fetch(`${this.config.apiBase}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scan,
          links: [...linkMap.values()],
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Scan failed");
      }
      this.setStatus(this.t().scanned);
      window.setTimeout(() => {
        if (this.statusEl.textContent === this.t().scanned) this.setStatus("");
      }, 2500);
    } catch {
      this.setStatus("");
    }
  }

  private async sendText() {
    const question = this.inputEl.value.trim();
    if (!question || this.busy) return;
    this.inputEl.value = "";
    await this.ask(question);
  }

  private async ask(question: string) {
    this.busy = true;
    this.stopAudio();
    const lang = detectLanguage(question);
    this.setUiLang(lang);
    this.addMessage("user", question);
    this.setStatus(this.t().thinking);
    try {
      const res = await fetch(`${this.config.apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          currentUrl: window.location.href,
          assistantId: this.config.assistantId,
        }),
      });
      const data = (await res.json()) as ChatApiResponse;
      if (!res.ok) throw new Error(data.error || "Chat failed");

      // Voice follows the answer text (Greek → Greek voice, English → English)
      const replyLang = speakLanguage(data.answer, data.language || lang);
      this.setUiLang(replyLang);
      this.addMessage("assistant", data.answer, data.navigation);

      // Speak first, then open the real shop page only if they asked to go there
      if (data.navigation?.url) {
        this.setStatus(
          this.t().goingTo(data.navigation.label || this.t().openPage),
        );
      }
      await this.speak(data.answer, replyLang);

      if (data.navigation?.url) {
        navigateHost(data.navigation, this.config.siteBaseUrl);
      }
      this.setStatus("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      this.addMessage("assistant", this.t().sorry(message));
      this.setStatus("");
    } finally {
      this.busy = false;
    }
  }

  private stopAudio() {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }
  }

  /** Browser Speech Synthesis fallback (works offline / when Edge TTS is rate-limited). */
  private speakBrowser(text: string, lang: AppLanguage): Promise<void> {
    const synth = window.speechSynthesis;
    if (!synth) return Promise.reject(new Error("No speechSynthesis"));

    return new Promise((resolve, reject) => {
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang === "el" ? "el-GR" : "en-US";
      const voices = synth.getVoices();
      // Strict match: never pick an English voice for Greek (or the reverse)
      const preferred =
        lang === "el"
          ? voices.find((v) => /^el\b/i.test(v.lang)) ||
            voices.find((v) => /greek|ελλην/i.test(v.name))
          : voices.find((v) => /^en-US\b/i.test(v.lang)) ||
            voices.find((v) => /^en\b/i.test(v.lang));
      if (preferred) utter.voice = preferred;
      utter.onend = () => {
        this.setStatus("");
        resolve();
      };
      utter.onerror = () => reject(new Error("Browser TTS failed"));
      this.setStatus(this.t().speaking);
      synth.speak(utter);
    });
  }

  /** Play TTS and resolve when playback finishes (or fails). */
  private speak(text: string, language?: AppLanguage): Promise<void> {
    if (this.muted || !text.trim()) return Promise.resolve();
    const lang = speakLanguage(text, language);
    this.setStatus(this.t().speaking);

    return (async () => {
      try {
        const res = await fetch(`${this.config.apiBase}/api/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language: lang }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error || "TTS failed");
        }
        const blob = await res.blob();
        if (!blob.size) throw new Error("Empty audio");
        const url = URL.createObjectURL(blob);
        this.stopAudio();
        const audio = new Audio(url);
        this.audio = audio;
        await new Promise<void>((resolve) => {
          const done = () => {
            URL.revokeObjectURL(url);
            this.setStatus("");
            resolve();
          };
          audio.onended = done;
          audio.onerror = done;
          void audio.play().then(
            () => {
              /* playing */
            },
            () => {
              this.setStatus(this.t().ttsBlocked);
              done();
            },
          );
        });
      } catch {
        try {
          await this.speakBrowser(text, lang);
        } catch {
          this.setStatus(this.t().ttsUnavailable);
        }
      }
    })();
  }

  private getSpeechRecognition(): SpeechRecognitionConstructor | null {
    const w = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  /**
   * Record mic audio and transcribe on the server (Fish STT).
   * Works in Chrome, Edge, Firefox, Safari — not tied to Web Speech API.
   */
  private async toggleMic() {
    if (this.recognition) {
      this.recognition.stop();
      return;
    }
    if (this.mediaRecorder?.state === "recording") {
      this.mediaRecorder.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      // Last resort: browser-only speech (Chrome/Edge)
      const SR = this.getSpeechRecognition();
      if (SR) {
        this.startBrowserRecognition(SR);
        return;
      }
      this.setStatus(this.t().micUnsupported);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      this.chunks = [];
      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mime =
        mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      this.mediaRecorder = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        this.micBtn.classList.remove("recording");
        void this.transcribeAndSend(
          new Blob(this.chunks, { type: recorder.mimeType || mime || "audio/webm" }),
        );
      };
      recorder.start(250);
      this.micBtn.classList.add("recording");
      this.setStatus(this.t().listening);
    } catch {
      this.setStatus(this.t().micDenied);
    }
  }

  private startBrowserRecognition(SR: SpeechRecognitionConstructor) {
    const recognition = new SR();
    this.recognition = recognition;
    recognition.lang = this.uiLang === "el" ? "el-GR" : "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalText = "";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i]![0]?.transcript ?? "";
        if (event.results[i]!.isFinal) finalText += piece;
        else interim += piece;
      }
      const shown = (finalText || interim).trim();
      if (shown) this.inputEl.value = shown;
    };

    recognition.onerror = () => {
      this.recognition = null;
      this.micBtn.classList.remove("recording");
      this.setStatus(this.t().sttEmpty);
    };

    recognition.onend = () => {
      this.recognition = null;
      this.micBtn.classList.remove("recording");
      const text = (finalText || this.inputEl.value).trim();
      if (!text) {
        this.setStatus(this.t().sttEmpty);
        return;
      }
      // Match UI language to what was actually heard
      this.setUiLang(detectLanguage(text));
      void this.ask(text);
    };

    this.micBtn.classList.add("recording");
    this.setStatus(this.t().listening);
    recognition.start();
  }

  private async transcribeAndSend(blob: Blob) {
    this.setStatus(this.t().transcribing);
    try {
      const form = new FormData();
      form.append("audio", blob, "speech.webm");
      form.append("language", this.uiLang);
      const res = await fetch(`${this.config.apiBase}/api/stt`, {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "STT failed");
      const text = (data.text || "").trim();
      if (!text) {
        this.setStatus(this.t().sttEmpty);
        return;
      }
      this.inputEl.value = text;
      this.setUiLang(detectLanguage(text));
      await this.ask(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "STT failed";
      this.setStatus(message);
    }
  }
}

type SpeechRecognitionConstructor = new () => SpeechRecognition;

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

function boot() {
  if (document.getElementById("voice-site-assistant")) return;
  const config = readConfig();
  const start = () => new VoiceSiteAssistant(config);
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
}

boot();
