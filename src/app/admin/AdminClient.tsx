"use client";

import { useCallback, useState } from "react";

type ClientProfile = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  goals?: string[];
  productsUsing?: string[];
  notes?: string;
  updatedAt: string;
};

type StoreSnapshot = {
  updatedAt: string;
  faqCount: number;
  pageCount: number;
  chunkCount: number;
  settings: {
    welcomeMessage: string;
    fishReferenceId: string;
    fishReferenceIdEn: string;
    siteBaseUrl: string;
  };
  pages: Array<{
    id: string;
    url: string;
    title: string;
    description: string;
    hash?: string;
    keywords?: string[];
  }>;
  profiles?: ClientProfile[];
};

const DEFAULT_PAGES_JSON = `[
  {
    "id": "home",
    "url": "/",
    "title": "YGIA Natural Health",
    "description": "Herbal supplements by Costas Argyrides",
    "keywords": ["ygia", "supplements", "herbal"]
  },
  {
    "id": "shipping",
    "url": "/policies/shipping-policy",
    "title": "Shipping policy",
    "description": "Shipping times for Cyprus, Greece, and worldwide",
    "keywords": ["shipping", "delivery"]
  },
  {
    "id": "faq",
    "url": "/pages/faq",
    "title": "FAQ",
    "description": "Payments, COD, returns, contact",
    "keywords": ["faq", "returns", "payment"]
  }
]`;

export function AdminClient() {
  const [secret, setSecret] = useState("change-me");
  const [faqsText, setFaqsText] = useState(
    `Q: When will my order arrive?
A: Orders ship within 2 business days. Delivery usually takes 2–5 days in Cyprus and Greece, or 2–7 days internationally.

Q: Πότε θα έρθει η παραγγελία μου;
A: Στέλνουμε εντός 2 εργάσιμων ημερών. Στην Κύπρο και Ελλάδα συνήθως 2–5 ημέρες, στο εξωτερικό 2–7.

Q: Can I return something I bought?
A: Yes — unused products within 30 days for a full refund. Opened items get store credit.

Q: Μπορώ να μιλήσω με κάποιον;
A: Για τα πιο συχνά θέματα μπορώ να σας βοηθήσω εδώ. Για επείγον θέμα παραγγελίας στείλτε email στο support με τον αριθμό παραγγελίας.`,
  );
  const [pagesJson, setPagesJson] = useState(DEFAULT_PAGES_JSON);
  const [welcome, setWelcome] = useState("");
  const [fishRef, setFishRef] = useState("");
  const [fishRefEn, setFishRefEn] = useState("");
  const [fishKey, setFishKey] = useState("");
  const [fishHint, setFishHint] = useState("");
  const [siteBase, setSiteBase] = useState("https://ygianaturalhealth.com");
  const [snapshot, setSnapshot] = useState<StoreSnapshot | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [profiles, setProfiles] = useState<ClientProfile[]>([]);
  const [profileForm, setProfileForm] = useState({
    id: "",
    name: "",
    phone: "",
    email: "",
    goals: "",
    productsUsing: "",
    notes: "",
  });

  const authHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    }),
    [secret],
  );

  async function load() {
    setError("");
    setStatus("Loading…");
    try {
      const res = await fetch("/api/ingest", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setSnapshot(data);
      setWelcome(data.settings.welcomeMessage || "");
      setFishRef(data.settings.fishReferenceId || "");
      setFishRefEn(data.settings.fishReferenceIdEn || "");
      setSiteBase(
        data.settings.siteBaseUrl || "https://ygianaturalhealth.com",
      );
      if (data.secrets?.fishApiKey?.configured) {
        setFishHint(data.secrets.fishApiKey.hint || "set");
      }
      if (data.pages?.length) {
        setPagesJson(JSON.stringify(data.pages, null, 2));
      }
      if (Array.isArray(data.profiles)) setProfiles(data.profiles);
      setStatus(
        `Loaded ${data.faqCount} FAQs, ${data.pageCount} pages, ${data.chunkCount} chunks, ${data.profiles?.length ?? 0} profiles`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
      setStatus("");
    }
  }

  async function post(body: Record<string, unknown>) {
    setError("");
    setStatus("Saving…");
    const res = await fetch("/api/ingest", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    setStatus(JSON.stringify(data));
    await load();
    return data as { profiles?: ClientProfile[] };
  }

  return (
    <div className="panel">
      <h1>Your call answers</h1>
      <p className="muted">
        Paste the questions customers keep calling about — shipping, how to use
        a product, returns, hours — in Greek and/or English. The voice chatbot on
        your static site will answer those for you. Protect this page with{" "}
        <code>ADMIN_SECRET</code>.
      </p>

      <div className="admin-form" style={{ marginTop: "1.25rem" }}>
        <label>
          Admin secret
          <input
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            type="password"
            autoComplete="off"
          />
        </label>
        <div className="btn-row">
          <button className="btn" type="button" onClick={() => void load()}>
            Load current store
          </button>
        </div>

        <label>
          Upload FAQ file
          <input
            type="file"
            accept=".txt,.md,.csv,.json,text/plain,text/markdown,application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFileName(file.name);
              const reader = new FileReader();
              reader.onload = () => {
                setFaqsText(String(reader.result || ""));
                setStatus(`Loaded ${file.name}`);
              };
              reader.readAsText(file);
            }}
          />
        </label>
        {fileName ? <p className="muted">File: {fileName}</p> : null}

        <label>
          Bulk Q&amp;A (Markdown Q:/A:, CSV, or JSON array)
          <textarea
            value={faqsText}
            onChange={(e) => setFaqsText(e.target.value)}
          />
        </label>
        <div className="btn-row">
          <button
            className="btn"
            type="button"
            onClick={() =>
              void post({ action: "ingest_faqs", faqsText }).catch((err) =>
                setError(err.message),
              )
            }
          >
            Ingest FAQs + reindex
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() =>
              void post({ action: "clear_faqs" }).catch((err) =>
                setError(err.message),
              )
            }
          >
            Clear FAQs
          </button>
        </div>

        <label>
          Page catalog (JSON)
          <textarea
            value={pagesJson}
            onChange={(e) => setPagesJson(e.target.value)}
            style={{ minHeight: 220 }}
          />
        </label>
        <div className="btn-row">
          <button
            className="btn"
            type="button"
            onClick={() => {
              try {
                const pages = JSON.parse(pagesJson);
                void post({ action: "set_pages", pages }).catch((err) =>
                  setError(err.message),
                );
              } catch {
                setError("Page catalog JSON is invalid");
              }
            }}
          >
            Save pages + reindex
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() =>
              void post({ action: "reindex" }).catch((err) =>
                setError(err.message),
              )
            }
          >
            Reindex only
          </button>
        </div>

        <label>
          Welcome message
          <textarea
            value={welcome}
            onChange={(e) => setWelcome(e.target.value)}
            style={{ minHeight: 80 }}
          />
        </label>
        <label>
          Fish Audio API key
          <input
            type="password"
            value={fishKey}
            onChange={(e) => setFishKey(e.target.value)}
            placeholder={
              fishHint
                ? `Configured ${fishHint} — paste new to replace`
                : "Paste Fish API key"
            }
            autoComplete="off"
          />
        </label>
        <label>
          Fish voice — Greek (default)
          <input value={fishRef} onChange={(e) => setFishRef(e.target.value)} />
        </label>
        <label>
          Fish voice — English
          <input
            value={fishRefEn}
            onChange={(e) => setFishRefEn(e.target.value)}
            placeholder="933563129e564b19a115bedd57b7406a"
          />
        </label>
        <p className="muted" style={{ marginTop: "-0.5rem" }}>
          Assistant is English-only — uses the English Fish voice
        </p>
        <label>
          Site base URL
          <input value={siteBase} onChange={(e) => setSiteBase(e.target.value)} />
        </label>
        <button
          className="btn"
          type="button"
          onClick={() =>
            void post({
              action: "settings",
              settings: {
                welcomeMessage: welcome,
                fishReferenceId: fishRef,
                fishReferenceIdEn: fishRefEn,
                siteBaseUrl: siteBase,
              },
              ...(fishKey.trim() ? { fishApiKey: fishKey.trim() } : {}),
            })
              .then(() => setFishKey(""))
              .catch((err) => setError(err.message))
          }
        >
          Save settings
        </button>

        <h2 style={{ marginTop: "1.75rem" }}>Client profiles</h2>
        <p className="muted">
          Owner notes the assistant can use on calls. On the Call desk, enter the
          client phone so she loads this profile.
        </p>
        <label>
          Name
          <input
            value={profileForm.name}
            onChange={(e) =>
              setProfileForm((f) => ({ ...f, name: e.target.value }))
            }
          />
        </label>
        <label>
          Phone
          <input
            value={profileForm.phone}
            onChange={(e) =>
              setProfileForm((f) => ({ ...f, phone: e.target.value }))
            }
          />
        </label>
        <label>
          Email
          <input
            value={profileForm.email}
            onChange={(e) =>
              setProfileForm((f) => ({ ...f, email: e.target.value }))
            }
          />
        </label>
        <label>
          Goals / symptoms (comma-separated: indigestion, sleep, stress, diabetes, joints…)
          <input
            value={profileForm.goals}
            onChange={(e) =>
              setProfileForm((f) => ({ ...f, goals: e.target.value }))
            }
          />
        </label>
        <label>
          Products they use (comma-separated)
          <input
            value={profileForm.productsUsing}
            onChange={(e) =>
              setProfileForm((f) => ({ ...f, productsUsing: e.target.value }))
            }
          />
        </label>
        <label>
          Owner notes
          <textarea
            value={profileForm.notes}
            onChange={(e) =>
              setProfileForm((f) => ({ ...f, notes: e.target.value }))
            }
            style={{ minHeight: 70 }}
          />
        </label>
        <div className="btn-row">
          <button
            className="btn"
            type="button"
            onClick={() =>
              void post({
                action: "upsert_profile",
                profile: {
                  ...(profileForm.id ? { id: profileForm.id } : {}),
                  name: profileForm.name,
                  phone: profileForm.phone || undefined,
                  email: profileForm.email || undefined,
                  goals: profileForm.goals
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  productsUsing: profileForm.productsUsing
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  notes: profileForm.notes || undefined,
                },
              })
                .then((data) => {
                  if (Array.isArray(data.profiles)) setProfiles(data.profiles);
                  setProfileForm({
                    id: "",
                    name: "",
                    phone: "",
                    email: "",
                    goals: "",
                    productsUsing: "",
                    notes: "",
                  });
                })
                .catch((err) => setError(err.message))
            }
          >
            {profileForm.id ? "Update profile" : "Add profile"}
          </button>
          {profileForm.id ? (
            <button
              className="btn secondary"
              type="button"
              onClick={() =>
                setProfileForm({
                  id: "",
                  name: "",
                  phone: "",
                  email: "",
                  goals: "",
                  productsUsing: "",
                  notes: "",
                })
              }
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        {profiles.length ? (
          <ul className="muted" style={{ marginTop: "0.75rem" }}>
            {profiles.map((p) => (
              <li key={p.id} style={{ marginBottom: "0.5rem" }}>
                <strong>{p.name}</strong>
                {p.phone ? ` · ${p.phone}` : ""}
                {p.goals?.length ? ` · ${p.goals.join(", ")}` : ""}
                <div className="btn-row" style={{ marginTop: "0.25rem" }}>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() =>
                      setProfileForm({
                        id: p.id,
                        name: p.name,
                        phone: p.phone || "",
                        email: p.email || "",
                        goals: (p.goals || []).join(", "),
                        productsUsing: (p.productsUsing || []).join(", "),
                        notes: p.notes || "",
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() =>
                      void post({
                        action: "delete_profile",
                        profileId: p.id,
                      })
                        .then((data) => {
                          if (Array.isArray(data.profiles))
                            setProfiles(data.profiles);
                        })
                        .catch((err) => setError(err.message))
                    }
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No client profiles yet.</p>
        )}

        {status ? <p className="status-ok">{status}</p> : null}
        {error ? <p className="status-err">{error}</p> : null}
        {snapshot ? (
          <p className="muted">
            Last update: {new Date(snapshot.updatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
