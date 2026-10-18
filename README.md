# kwstas-website-assistant

Embeddable **full AI voice website assistant** powered by **NVIDIA NIM**.

No OpenAI. No video avatar. The model answers naturally in Greek or English, uses scanned page content (+ optional owner FAQs), speaks with Edge TTS, and can open the right page.

## Who it’s for

A shop or brand with a simple/static site that gets many calls like:

- “When will my order arrive?”
- “Do you do cash on delivery?”
- “How do I use this product?”
- “Can I return it?”

## What the customer sees

- Floating chat on top of the page (minimizes to an icon)
- Type or speak
- Answer is shown **and spoken** (Edge TTS)
- Optional jump to the matching product / shipping page

## Page learning (auto-scan)

When the widget loads on a site, it **reads the current page** (title, headings, sections, text) and a few same-origin linked pages, then uploads that into the assistant knowledge base. So it can answer from the real site content and navigate to the right URL/`#section`.

Disable with `data-auto-scan="false"` on the script tag if needed.

Owner FAQs in `/admin` still help a lot for phone-style answers that are not written on the page.

## Owner workflow

1. Run this app (or deploy it once, e.g. Railway).
2. Open `/admin` and paste Q&A in Greek and/or English (the real answers you give on calls).
3. List important site URLs in the page catalog (or rely on auto-scan).
4. Add one script tag to your static HTML:

```html
<script
  src="https://YOUR_ASSISTANT_HOST/embed.js"
  data-api-base="https://YOUR_ASSISTANT_HOST"
  data-auto-scan="true"
  async></script>
```

Your marketing site can stay fully static. Only this assistant needs a small Node host.

## Quick start (YGIA live site)

```bash
npm install
cp .env.example .env
# set NVIDIA_API_KEY=nvapi-... and SITE_BASE_URL=https://ygianaturalhealth.com
npm run crawl:ygia
npm run build:widget
npm run dev
```

`npm run crawl:ygia` pulls **all products** + FAQ/shipping/refund pages from [ygianaturalhealth.com](https://ygianaturalhealth.com) into the knowledge store (re-run anytime the catalog changes).

- **Call desk (main app):** http://localhost:3000 — Call / Store / Settings tabs
- Settings: paste **Fish API key**, voice reference id, upload FAQ files
- Store tab opens the live YGIA shop (or new tab if embed is blocked)
- Advanced ingest also at http://localhost:3000/admin (secret `change-me`)

## Environment

| Variable | Purpose |
| --- | --- |
| `NVIDIA_API_KEY` | **Required** NIM key (`nvapi-...`) — full AI answers |
| `NVIDIA_MODEL` | Default `nvidia/nemotron-3.5-super-vl-120b-a12b` |
| `TTS_PROVIDER` | `edge` (default) or `fish` |
| `EDGE_VOICE_EL` / `EDGE_VOICE_EN` | Greek / English Edge voices |
| `FISH_API_KEY` | Optional mic STT |
| `ADMIN_SECRET` | Protects `/admin` and ingest API |
| `NEXT_PUBLIC_APP_URL` | Public URL of this assistant host |

`NVIDIA_API_KEY` is required. Site scan + FAQs are context for the model; navigation URLs must still come from the page catalog.

## Tip for fewer calls

Ingest the **exact** questions people phone about, in both Greek and English if your customers use both. The matcher uses synonyms (“πότε έρχεται το δέμα” ≈ order arrival), but your real phone answers are the source of truth.
