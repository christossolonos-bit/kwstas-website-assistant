"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "../app/calldesk.css";

type Tab = "call" | "store";

type NavTarget = {
  url: string;
  hash?: string;
  label?: string;
  image?: string;
  choice?: "A" | "B" | "C";
};

type Msg = {
  role: "user" | "assistant";
  text: string;
  navigation?: NavTarget | null;
  listings?: NavTarget[];
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
  const [muted, setMuted] = useState(false);
  const [sttReady, setSttReady] = useState(false);
  const [siteBase, setSiteBase] = useState("https://ygianaturalhealth.com");
  const [welcome, setWelcome] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileName, setProfileName] = useState("");
  const [lastListings, setLastListings] = useState<NavTarget[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const messagesRef = useRef<Msg[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const listeningRef = useRef(false);

  // Settings
  const [secret, setSecret] = useState("change-me");
  const [fishKey, setFishKey] = useState("");
  const [fishRef, setFishRef] = useState("");
  const [fishRefEn, setFishRefEn] = useState("");
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
      const prior = messagesRef.current;
      const nextUser: Msg = { role: "user", text: q };
      const withUser = [...prior, nextUser];
      messagesRef.current = withUser;
      setMessages(withUser);
      setStatus("Thinking…");
      try {
        const history = withUser.slice(-10).map((m) => ({
          role: m.role,
          content: m.text,
        }));
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q,
            currentUrl: "call-desk",
            language: "en",
            history,
            lastListings,
            ...(profilePhone.trim()
              ? { profilePhone: profilePhone.trim() }
              : {}),
          }),
        });
        const data = (await res.json()) as {
          answer?: string;
          navigation?: NavTarget | null;
          listings?: NavTarget[];
          language?: string;
          profile?: { id: string; name: string } | null;
          suggestedPrompts?: string[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Chat failed");
        const answer = data.answer || "…";
        const listings =
          data.listings?.length
            ? data.listings
            : data.navigation?.url
              ? [data.navigation]
              : [];
        if (listings.length) setLastListings(listings);
        if (data.profile?.name) setProfileName(data.profile.name);
        setSuggestedPrompts(
          Array.isArray(data.suggestedPrompts) ? data.suggestedPrompts : [],
        );
        const withAssistant: Msg[] = [
          ...withUser,
          {
            role: "assistant",
            text: answer,
            navigation: data.navigation,
            listings,
          },
        ];
        messagesRef.current = withAssistant;
        setMessages(withAssistant);
        await speak(answer, "en");
        // Only auto-open when the customer asked to go to the page
        if (data.navigation?.url) {
          const url = resolveShopUrl(
            `${data.navigation.url}${data.navigation.hash || ""}`,
            siteBase,
          );
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        const withErr: Msg[] = [
          ...withUser,
          { role: "assistant", text: `Sorry — ${message}` },
        ];
        messagesRef.current = withErr;
        setMessages(withErr);
        setStatus("");
      } finally {
        setBusy(false);
      }
    },
    [busy, lastListings, profilePhone, siteBase, speak],
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
          const welcomeMsg: Msg[] = [
            { role: "assistant", text: data.welcomeMessage },
          ];
          messagesRef.current = welcomeMsg;
          setMessages(welcomeMsg);
          void speak(data.welcomeMessage, "en");
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
      form.append("language", "en");
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
      setStatus("Voice mic is temporarily unavailable — please type your question");
      listeningRef.current = false;
      setListening(false);
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
      setFishRefEn(data.settings?.fishReferenceIdEn || "");
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
          fishReferenceIdEn: fishRefEn,
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
          <span>Talk to us · shop when you need</span>
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
                Ask about our products — what they’re for, ingredients, price.
                When she offers options, say A, B, or C. Say “take me to…” to
                open a product page.
              </p>
              <div className="profile-bar">
                <input
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="Client phone (optional profile)"
                  inputMode="tel"
                />
                {profileName ? (
                  <span className="profile-chip">Profile: {profileName}</span>
                ) : null}
              </div>
              <div className="call-status">{status}</div>
              <div className="call-actions">
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
                    const cleared: Msg[] = welcome
                      ? [{ role: "assistant", text: welcome }]
                      : [];
                    messagesRef.current = cleared;
                    setMessages(cleared);
                    setLastListings([]);
                    setProfileName("");
                    setSuggestedPrompts([]);
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
              {suggestedPrompts.length ? (
                <div className="suggested-prompts" aria-label="Likely next questions">
                  {suggestedPrompts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="prompt-chip"
                      disabled={busy}
                      onClick={() => void ask(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              ) : null}
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
                  {m.listings?.length ? (
                    <div className="product-listings">
                      {m.listings.map((listing, li) => (
                        <a
                          key={listing.url}
                          className="product-card"
                          href={resolveShopUrl(
                            `${listing.url}${listing.hash || ""}`,
                            siteBase,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="choice-badge">
                            {listing.choice || ["A", "B", "C"][li]}
                          </span>
                          {listing.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={listing.image}
                              alt={listing.label || "Product"}
                              className="product-card-img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="product-card-img placeholder" />
                          )}
                          <span className="product-card-meta">
                            <span className="product-card-title">
                              {listing.label || "Product"}
                            </span>
                            <span className="product-card-cta">
                              View in shop →
                            </span>
                          </span>
                        </a>
                      ))}
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

      </main>
    </div>
  );
}

