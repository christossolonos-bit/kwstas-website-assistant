# kwstas-website-assistant

Embeddable **voice website assistant** — so customers get spoken answers instead of calling the owner for the same follow-ups.

No OpenAI required. No video avatar. The owner pastes the answers they usually give on the phone; the widget on the site talks back in Greek or English and can open the right page.

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

## Quick start

```bash
npm install
cp .env.example .env
npm run seed
npm run build:widget
npm run dev
```

- Demo: http://localhost:3000/demo  
- Load answers: http://localhost:3000/admin (secret `change-me`)

## Environment

| Variable | Purpose |
| --- | --- |
| `NVIDIA_API_KEY` | Optional NIM key (`nvapi-...`) for human-like answers |
| `NVIDIA_MODEL` | Default `nvidia/nemotron-3.5-super-vl-120b-a12b` |
| `TTS_PROVIDER` | `edge` (default) or `fish` |
| `EDGE_VOICE_EL` / `EDGE_VOICE_EN` | Greek / English Edge voices |
| `FISH_API_KEY` | Optional mic STT |
| `ADMIN_SECRET` | Protects `/admin` and ingest API |
| `NEXT_PUBLIC_APP_URL` | Public URL of this assistant host |

Without `NVIDIA_API_KEY`, the bot uses local FAQ matching only (no AI credits). With the key, it uses NVIDIA for natural answers and still only navigates to URLs in your catalog.

## Tip for fewer calls

Ingest the **exact** questions people phone about, in both Greek and English if your customers use both. The matcher uses synonyms (“πότε έρχεται το δέμα” ≈ order arrival), but your real phone answers are the source of truth.
