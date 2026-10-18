"use client";

import { useCallback, useState } from "react";

type StoreSnapshot = {
  updatedAt: string;
  faqCount: number;
  pageCount: number;
  chunkCount: number;
  settings: {
    welcomeMessage: string;
    fishReferenceId: string;
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
};

const DEFAULT_PAGES_JSON = `[
  {
    "id": "home",
    "url": "/demo",
    "title": "Home",
    "description": "Lumina Skin demo storefront home",
    "keywords": ["home", "shop"]
  },
  {
    "id": "serum",
    "url": "/demo/products/hydra-glow-serum",
    "title": "Hydra Glow Serum",
    "description": "Hydrating serum for dry skin",
    "hash": "#how-to-use",
    "keywords": ["serum", "dry skin"]
  },
  {
    "id": "cream",
    "url": "/demo/products/night-repair-cream",
    "title": "Night Repair Cream",
    "description": "Overnight cream for fine lines",
    "hash": "#ingredients",
    "keywords": ["night cream", "wrinkles"]
  },
  {
    "id": "shipping",
    "url": "/demo/shipping",
    "title": "Shipping & Returns",
    "description": "Shipping and 30-day returns",
    "hash": "#returns",
    "keywords": ["shipping", "returns"]
  },
  {
    "id": "about",
    "url": "/demo/about",
    "title": "About Lumina Skin",
    "description": "Brand story",
    "keywords": ["about", "brand"]
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
  const [siteBase, setSiteBase] = useState("http://localhost:3000");
  const [snapshot, setSnapshot] = useState<StoreSnapshot | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

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
      setSiteBase(data.settings.siteBaseUrl || "http://localhost:3000");
      if (data.pages?.length) {
        setPagesJson(JSON.stringify(data.pages, null, 2));
      }
      setStatus(
        `Loaded ${data.faqCount} FAQs, ${data.pageCount} pages, ${data.chunkCount} chunks`,
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
          Fish voice reference_id
          <input value={fishRef} onChange={(e) => setFishRef(e.target.value)} />
        </label>
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
                siteBaseUrl: siteBase,
              },
            }).catch((err) => setError(err.message))
          }
        >
          Save settings
        </button>

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
