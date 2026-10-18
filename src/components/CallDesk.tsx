"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "../app/calldesk.css";

type Tab = "call" | "store" | "settings";

type NavTarget = { url: string; hash?: string; label?: string };

type Msg = {
  role: "user" | "assistant";
  text: string;
  navigation?: NavTarget | null;
};

type SecretsMeta = {
  fishApiKey: { configured: boolean; hint: string };
  nvidiaApiKey: { configured: boolean; hint: string };
};

function resolveShopUrl(path: string, siteBase: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = siteBase.replace(/\/$/, "") || "https://ygianaturalhealth.com";
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function CallDesk() {
  const [tab, setTab] = useState<Tab>("call");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [micLang, setMicLang] = useState<"el" | "en">("el");
  const [muted, setMuted] = useState(false);
  const [sttReady, setSttReady] = useState(false);
  const [siteBase, setSiteBase] = useState("https://ygianaturalhealth.com");
  const [welcome, setWelcome] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const listeningRef = useRef(false);

  // Settings
  const [secret, setSecret] = useState("change-me");
  const [fishKey, setFishKey] = useState("");
  const [fishRef, setFishRef] = useState("");
  const [nvidiaKey, setNvidiaKey] = useState("");
  const [welcomeEdit, setWelcomeEdit] = useState("");
  const [siteBaseEdit, setSiteBaseEdit] = useState("");
  const [faqsText, setFaqsText] = useState("");
  const [fileName, setFileName] = useState("");
  const [secretsMeta, setSecretsMeta] = useState<SecretsMeta | null>(null);
  const [settingsStatus, setSettingsStatus] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [stats, setStats] = useState("");

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  };

  const speak = useCallback(
    async (text: string, language?: string) => {
      if (muted || !text.trim()) return;
      stopAudio();
      setStatus("Speaking…");
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language }),
        });
        if (!res.ok) throw new Error("TTS failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        await new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          void audio.play().catch(() => resolve());
        });
      } catch {
        /* ignore — text still shown */
      } finally {
        setStatus("");
      }
    },
    [muted],
  );

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || busy) return;
      setBusy(true);
      setDraft("");
      setMessages((m) => [...m, { role: "user", text: q }]);
      setStatus("Thinking…");
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, currentUrl: "call-desk" }),
        });
        const data = (await res.json()) as {
          answer?: string;
          navigation?: NavTarget | null;
          language?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Chat failed");
        const answer = data.answer || "…";
        setMessages((m) => [
          ...m,
          { role: "assistant", text: answer, navigation: data.navigation },
        ]);
        await speak(answer, data.language);
        if (data.navigation?.url) {
          const url = resolveShopUrl(
            `${data.navigation.url}${data.navigation.hash || ""}`,
            siteBase,
          );
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        setMessages((m) => [
          ...m,
          { role: "assistant", text: `Sorry — ${message}` },
        ]);
        setStatus("");
      } finally {
        setBusy(false);
      }
    },
    [busy, siteBase, speak],
  );

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/config");
        if (!res.ok) return;
        const data = (await res.json()) as {
          welcomeMessage?: string;
          siteBaseUrl?: string;
          sttReady?: boolean;
        };
        if (typeof data.sttReady === "boolean") setSttReady(data.sttReady);
        if (data.siteBaseUrl) {
          setSiteBase(data.siteBaseUrl);
          setSiteBaseEdit(data.siteBaseUrl);
        }
        if (data.welcomeMessage) {
          setWelcome(data.welcomeMessage);
          setWelcomeEdit(data.welcomeMessage);
          setMessages([{ role: "assistant", text: data.welcomeMessage }]);
          void speak(data.welcomeMessage);
        }
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickRecorderMime(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];
    for (const type of candidates) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(type)
      ) {
        return type;
      }
    }
    return "";
  }

  function stopMediaTracks() {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }

  async function transcribeBlob(blob: Blob) {
    setStatus("Transcribing…");
    try {
      const form = new FormData();
      const ext = blob.type.includes("mp4")
        ? "m4a"
        : blob.type.includes("ogg")
          ? "ogg"
          : "webm";
      form.append("audio", blob, `speech.${ext}`);
      form.append("language", micLang);
      const res = await fetch("/api/stt", { method: "POST", body: form });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Transcription failed");
      const text = (data.text || "").trim();
      if (!text) {
        setStatus("No speech detected — try again");
        return;
      }
      setDraft(text);
      await ask(text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transcription failed";
      setStatus(message);
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("This browser cannot access the microphone");
      listeningRef.current = false;
      setListening(false);
      return;
    }
    if (!sttReady) {
      setStatus("Add your Fish API key in Settings so the mic works everywhere");
      listeningRef.current = false;
      setListening(false);
      setTab("settings");
      return;
    }

    stopAudio();
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      mediaStreamRef.current = stream;

      const mimeType = pickRecorderMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stopMediaTracks();
        mediaRecorderRef.current = null;
        listeningRef.current = false;
        setListening(false);
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (blob.size < 500) {
          setStatus("Recording too short — hold a bit longer, then tap stop");
          return;
        }
        void transcribeBlob(blob);
      };

      // timeslice keeps data flowing on Safari / Firefox
      recorder.start(250);
      listeningRef.current = true;
      setListening(true);
      setStatus("Listening… tap again when finished");
    } catch (err) {
      listeningRef.current = false;
      setListening(false);
      stopMediaTracks();
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setStatus("Microphone permission denied — allow mic for this site");
      } else {
        setStatus(
          err instanceof Error ? err.message : "Could not start microphone",
        );
      }
    }
  }

  function toggleCall() {
    if (busy) return;

    // Second tap → stop recording and transcribe on the server
    if (listeningRef.current) {
      setStatus("Got it…");
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          stopMediaTracks();
          listeningRef.current = false;
          setListening(false);
          setStatus("Could not stop recording — try again");
        }
      } else {
        stopMediaTracks();
        listeningRef.current = false;
        setListening(false);
      }
      return;
    }

    setDraft("");
    void startRecording();
  }

  async function loadSettings() {
    setSettingsError("");
    setSettingsStatus("Loading…");
    try {
      const res = await fetch("/api/ingest", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setWelcomeEdit(data.settings?.welcomeMessage || "");
      setFishRef(data.settings?.fishReferenceId || "");
      setSiteBaseEdit(
        data.settings?.siteBaseUrl || "https://ygianaturalhealth.com",
      );
      setSecretsMeta(data.secrets || null);
      setStats(
        `${data.faqCount} FAQs · ${data.pageCount} pages · ${data.chunkCount} chunks`,
      );
      setSettingsStatus("Loaded settings");
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Load failed");
      setSettingsStatus("");
    }
  }

  async function saveSettings() {
    setSettingsError("");
    setSettingsStatus("Saving…");
    try {
      const body: Record<string, unknown> = {
        action: "settings",
        settings: {
          welcomeMessage: welcomeEdit,
          fishReferenceId: fishRef,
          siteBaseUrl: siteBaseEdit,
        },
      };
      if (fishKey.trim()) body.fishApiKey = fishKey.trim();
      if (nvidiaKey.trim()) body.nvidiaApiKey = nvidiaKey.trim();
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSecretsMeta(data.secrets || null);
      setFishKey("");
      setNvidiaKey("");
      if (siteBaseEdit) setSiteBase(siteBaseEdit);
      if (welcomeEdit) setWelcome(welcomeEdit);
      if (data.secrets?.fishApiKey?.configured) setSttReady(true);
      setSettingsStatus(
        "Settings saved — mic + Fish voice use the new key on the next call",
      );
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Save failed");
      setSettingsStatus("");
    }
  }

  async function ingestFaqs(text: string) {
    setSettingsError("");
    setSettingsStatus("Ingesting FAQs…");
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({ action: "ingest_faqs", faqsText: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ingest failed");
      setSettingsStatus(`Ingested FAQs · ${JSON.stringify(data)}`);
      await loadSettings();
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Ingest failed");
      setSettingsStatus("");
    }
  }

  function onFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setFaqsText(text);
      setSettingsStatus(`Loaded file: ${file.name} (${text.length} chars)`);
    };
    reader.onerror = () => setSettingsError("Could not read file");
    reader.readAsText(file);
  }

  return (
    <div className="calldesk">
      <header className="calldesk-header">
        <div className="calldesk-brand">
          YGIA Call Assistant
          <span>Voice help · separate from the shop</span>
        </div>
        <nav className="calldesk-tabs" aria-label="Main">
          <button
            type="button"
            className={tab === "call" ? "active" : ""}
            onClick={() => setTab("call")}
          >
            Call
          </button>
          <button
            type="button"
            className={tab === "store" ? "active" : ""}
            onClick={() => setTab("store")}
          >
            Store
          </button>
          <button
            type="button"
            className={tab === "settings" ? "active" : ""}
            onClick={() => {
              setTab("settings");
              void loadSettings();
            }}
          >
            Settings
          </button>
        </nav>
      </header>

      <main className="calldesk-main">
        {tab === "call" ? (
          <>
            <div className="call-stage">
              <button
                type="button"
                className={`call-orb ${listening ? "listening" : ""} ${busy ? "busy" : ""}`}
                onClick={() => toggleCall()}
                disabled={busy}
              >
                {listening ? "Listening…" : busy ? "…" : "Tap to talk"}
              </button>
              <p className="call-hint">
                Ask about products, shipping, returns, or payments — in Greek or
                English. Works in any modern browser (audio is transcribed on the
                server). Say “take me to…” to open the store page.
                {!sttReady
                  ? " Add your Fish API key in Settings first."
                  : ""}
              </p>
              <div className="call-status">{status}</div>
              <div className="call-actions">
                <button
                  type="button"
                  className="btn-cd secondary"
                  onClick={() => setMicLang((l) => (l === "el" ? "en" : "el"))}
                  disabled={listening}
                  title="Transcription language hint"
                >
                  Mic: {micLang === "el" ? "Ελληνικά" : "English"}
                </button>
                <button
                  type="button"
                  className="btn-cd secondary"
                  onClick={() => setMuted((m) => !m)}
                >
                  {muted ? "Unmute" : "Mute"}
                </button>
                <button
                  type="button"
                  className="btn-cd secondary"
                  onClick={() => {
                    stopAudio();
                    setMessages(
                      welcome
                        ? [{ role: "assistant", text: welcome }]
                        : [],
                    );
                  }}
                >
                  Clear chat
                </button>
              </div>
            </div>

            <div className="call-composer">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Or type your question…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void ask(draft);
                  }
                }}
              />
              <div className="call-actions">
                <button
                  type="button"
                  className="btn-cd"
                  disabled={busy || !draft.trim()}
                  onClick={() => void ask(draft)}
                >
                  Send
                </button>
              </div>
            </div>

            <div className="call-transcript">
              {messages.map((m, i) => (
                <div key={i} className={`call-msg ${m.role}`}>
                  {m.text}
                  {m.navigation?.url ? (
                    <div>
                      <button
                        type="button"
                        className="open-store"
                        onClick={() =>
                          window.open(
                            resolveShopUrl(
                              `${m.navigation!.url}${m.navigation!.hash || ""}`,
                              siteBase,
                            ),
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                      >
                        → {m.navigation.label || "Open in store"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {tab === "store" ? (
          <div className="store-panel">
            <div className="store-toolbar">
              <p>Browse the live YGIA shop. Chat stays on the Call tab.</p>
              <div className="btn-row-cd">
                <a
                  className="btn-cd"
                  href={siteBase}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open store in new tab
                </a>
                <button
                  type="button"
                  className="btn-cd secondary"
                  onClick={() => setTab("call")}
                >
                  Back to call
                </button>
              </div>
            </div>
            <div className="store-frame-wrap">
              <iframe
                title="YGIA Natural Health store"
                src={siteBase}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
              <div className="store-fallback">
                If the shop does not load here (some sites block embedding), use
                “Open store in new tab”.
              </div>
            </div>
          </div>
        ) : null}

        {tab === "settings" ? (
          <div className="settings-panel">
            <div className="panel-card">
              <h2>Voice &amp; API keys</h2>
              <p className="hint">
                Admin secret defaults to <code>change-me</code>. Fish API key is
                saved on the server (not in the browser).
              </p>
              <label>
                Admin secret
                <input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <div className="btn-row-cd">
                <button
                  type="button"
                  className="btn-cd secondary"
                  onClick={() => void loadSettings()}
                >
                  Load current
                </button>
              </div>
              <label>
                Fish Audio API key
                <input
                  type="password"
                  value={fishKey}
                  onChange={(e) => setFishKey(e.target.value)}
                  placeholder={
                    secretsMeta?.fishApiKey.configured
                      ? `Configured ${secretsMeta.fishApiKey.hint} — paste new to replace`
                      : "Paste Fish API key"
                  }
                  autoComplete="off"
                />
              </label>
              <label>
                Fish voice reference_id (Greek answers)
                <input
                  type="text"
                  value={fishRef}
                  onChange={(e) => setFishRef(e.target.value)}
                  placeholder="e.g. 2a9605eeafe84974b5b20628d42c0060"
                />
              </label>
              <p className="hint">
                Greek replies use Fish Audio · English replies use Edge Ava
                Multilingual
              </p>
              <label>
                NVIDIA API key (optional override)
                <input
                  type="password"
                  value={nvidiaKey}
                  onChange={(e) => setNvidiaKey(e.target.value)}
                  placeholder={
                    secretsMeta?.nvidiaApiKey.configured
                      ? `Configured ${secretsMeta.nvidiaApiKey.hint}`
                      : "Leave blank to keep .env key"
                  }
                  autoComplete="off"
                />
              </label>
              <label>
                Store URL (opened by Store tab)
                <input
                  type="text"
                  value={siteBaseEdit}
                  onChange={(e) => setSiteBaseEdit(e.target.value)}
                />
              </label>
              <label>
                Welcome message
                <textarea
                  value={welcomeEdit}
                  onChange={(e) => setWelcomeEdit(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn-cd"
                onClick={() => void saveSettings()}
              >
                Save settings
              </button>
            </div>

            <div className="panel-card">
              <h2>Upload knowledge file</h2>
              <p className="hint">
                Choose a <code>.txt</code>, <code>.md</code>, <code>.csv</code>,
                or <code>.json</code> FAQ file, then ingest.
              </p>
              <div className="file-row">
                <input
                  type="file"
                  accept=".txt,.md,.csv,.json,text/plain,text/markdown,application/json"
                  onChange={(e) => onFile(e.target.files?.[0] || null)}
                />
                {fileName ? <span className="hint">{fileName}</span> : null}
              </div>
              <label>
                FAQ text (from file or paste)
                <textarea
                  value={faqsText}
                  onChange={(e) => setFaqsText(e.target.value)}
                  placeholder={"Q: …\nA: …"}
                />
              </label>
              <div className="btn-row-cd">
                <button
                  type="button"
                  className="btn-cd"
                  disabled={!faqsText.trim()}
                  onClick={() => void ingestFaqs(faqsText)}
                >
                  Ingest file / FAQs
                </button>
              </div>
              {stats ? <p className="hint">{stats}</p> : null}
            </div>

            {settingsStatus ? <p className="ok">{settingsStatus}</p> : null}
            {settingsError ? <p className="err">{settingsError}</p> : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

