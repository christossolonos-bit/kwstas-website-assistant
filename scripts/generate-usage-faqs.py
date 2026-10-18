#!/usr/bin/env python3
"""Generate client usage Q&As for every YGIA product and merge into knowledge.json."""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STORE = ROOT / "data" / "knowledge.json"
BOOKLET = ROOT / "data" / "ygia-pro-booklet-parsed.json"
OUT = ROOT / "data" / "product-usage-faqs.json"
TAG = "product-usage-faq"

GENERIC_SAFETY = (
    "Food supplements are not a substitute for a varied diet. "
    "Keep away from children. Suitable for vegetarians and vegans. "
    "Not suitable for pregnant or breastfeeding women unless a health professional advises otherwise. "
    "Do not use if the safety seal is broken. "
    "For specialized advice call +357 22 610 418."
)


def short_name(title: str) -> str:
    t = re.split(r"[♦–—]", title)[0]
    t = re.sub(r"\s+\d+\s*(DRCaps|VCaps|Veg Caps|caps).*$", "", t, flags=re.I)
    t = re.sub(r"\s{2,}", " ", t).strip(" :·-")
    return t[:60] or title[:60]


def extract(pat: str, text: str, flags=re.I) -> str:
    m = re.search(pat, text or "", flags)
    return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""


def first_sentence(text: str, limit=180) -> str:
    t = re.sub(r"\s+", " ", text).strip()
    if not t:
        return ""
    # cut at sentence end if possible
    m = re.match(r"(.{40," + str(limit) + r"}?[.!?])\s", t + " ")
    if m:
        return m.group(1).strip()
    return t[:limit].rsplit(" ", 1)[0] + ("…" if len(t) > limit else "")


def booklet_by_handle(book: dict) -> dict[str, dict]:
    out = {}
    for p in book.get("products") or []:
        h = (p.get("handle") or "").lower()
        if h:
            out[h] = p
        out[p["name"].lower()] = p
    return out


def parse_product(page: dict, book_map: dict) -> dict:
    handle = page["url"].replace("/products/", "").lower()
    title = page.get("title") or handle
    name = short_name(title)
    content = page.get("content") or ""
    desc = page.get("description") or ""

    bp = book_map.get(handle) or book_map.get(name.lower())
    # fuzzy booklet match on name tokens
    if not bp:
        key = re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
        for k, v in book_map.items():
            kk = re.sub(r"[^a-z0-9]+", " ", k).strip()
            if key and (key in kk or kk in key) and len(kk) > 4:
                bp = v
                break

    dosage = ""
    ingredients = ""
    actions = ""
    packaging = ""
    safety = ""
    if bp:
        dosage = bp.get("dosage") or ""
        ingredients = bp.get("ingredients") or ""
        actions = bp.get("actions") or ""
        packaging = bp.get("packaging") or ""
        safety = bp.get("safety") or ""

    if not dosage:
        dosage = extract(
            r"(?:Suggested Dosage(?: for Adults)?|Daily Dosage|Dosage)\s*:?\s*([^\n]+)",
            content,
        )
    if not dosage:
        # booklet block on page
        dosage = extract(r"Dosage:\s*([^\n]+)", content)

    if not ingredients:
        ingredients = extract(
            r"INGREDIENTS\s*:?\s*\n([\s\S]{10,400}?)(?=\n\s*(?:Capsule Shell|DOSAGE|Daily Dosage|PACKAGING|Important|Disclaimer)\b)",
            content,
            re.I,
        )
    if not ingredients:
        ingredients = extract(r"Ingredients:\s*([^\n]+)", content)

    if not actions:
        actions = extract(r"Actions\s*/\s*benefits:\s*([^\n]+)", content)
    if not actions:
        # Benefits bullet
        actions = extract(
            r"Benefits\s*\n+\s*[•·\-]?\s*([^\n]{20,200})",
            content,
        )
    if not actions:
        actions = first_sentence(desc, 200)

    price = extract(r"Price:\s*([^\n]+)", content)
    avail = extract(r"Availability:\s*([^\n]+)", content)
    collections = extract(r"Collections\s*/\s*categories:\s*([^\n]+)", content)

    who = "adults seeking natural herbal support"
    blob = f"{title} {desc} {actions} {collections}".lower()
    if re.search(r"\b(daily male|men'?s|prostate|eros|tribulus|testosterone)\b", blob):
        who = "men (men's vitality, drive, or prostate support as relevant)"
    elif re.search(r"\b(daily lady|women'?s|menopause|pcos|inositol|for women)\b", blob):
        who = "women (hormones, desire, menopause, or women's wellness as relevant)"

    when = "Follow the label dosage. Many YGIA capsules are delayed-release; take with water."
    if re.search(r"after (food|meal)|with food|with meals", dosage, re.I):
        when = "Take after food / with meals, with water, as on the label."
    elif re.search(r"before .*meal|before food", dosage, re.I):
        when = "Take before meals with water, as on the label."
    elif re.search(r"every \d+ day|every 5 days", dosage, re.I):
        when = "This is not a daily capsule for everyone — follow the spaced dosage on the label or your practitioner's advice."

    return {
        "handle": handle,
        "url": page["url"],
        "title": title,
        "name": name,
        "actions": actions,
        "dosage": dosage or "Follow the dosage on the bottle label, or ask a health professional.",
        "ingredients": ingredients or "See the product label for the full ingredient list.",
        "packaging": packaging
        or extract(r"(\d+\s*(?:DRCaps|VCaps|Veg Caps|capsules)[^\n]*)", content)
        or "Plant capsules in amber glass (YGIA standard).",
        "safety": safety,
        "price": price,
        "avail": avail,
        "who": who,
        "when": when,
        "collections": collections,
        "image": page.get("image") or "",
    }


def make_faqs(p: dict) -> list[dict]:
    name = p["name"]
    faqs = []

    def add(q: str, a: str, *extra_tags: str):
        ans = re.sub(r"\s+", " ", a).strip()
        if len(ans) < 20:
            return
        faqs.append(
            {
                "id": str(uuid.uuid4()),
                "question": q,
                "answer": ans[:700],
                "product": name,
                "tags": [TAG, "usage", p["handle"], *extra_tags],
            }
        )

    purpose = p["actions"] or p["collections"] or "natural herbal support from YGIA"
    add(
        f"What is {name} for? What does {name} do?",
        f"{name} is for: {purpose}. YGIA product page: {p['url']}.",
        "purpose",
        "use",
    )
    add(
        f"What can I use {name} for?",
        f"Clients use {name} for: {first_sentence(purpose, 220)}. Ask if you want dosage or ingredients.",
        "purpose",
    )
    add(
        f"How do I take {name}? What is the dosage of {name}?",
        f"Suggested usage for {name}: {p['dosage']}. {p['when']} Packaging: {p['packaging']}.",
        "dosage",
        "how-to",
    )
    add(
        f"How many capsules of {name} should I take per day?",
        f"For {name}: {p['dosage']}. Always follow the bottle label if it differs, or call +357 22 610 418 for herbalist advice.",
        "dosage",
    )
    add(
        f"When should I take {name}? Morning or night?",
        f"{p['when']} Label dosage for {name}: {p['dosage']}.",
        "timing",
        "how-to",
    )
    add(
        f"What are the ingredients in {name}?",
        f"{name} ingredients: {p['ingredients']}.",
        "ingredients",
    )
    add(
        f"What is in {name}? What's inside {name}?",
        f"{name} contains: {p['ingredients']}. Form: {p['packaging']}.",
        "ingredients",
    )
    add(
        f"Who is {name} for? Can men / women take {name}?",
        f"{name} is typically suited for {p['who']}. "
        f"Not a medicine — if you have a condition or take medication, ask a professional. {GENERIC_SAFETY}",
        "who",
    )
    add(
        f"Is {name} safe? Any side effects or warnings for {name}?",
        (
            f"Safety notes for {name}: {p['safety']}. {GENERIC_SAFETY}"
            if p["safety"]
            else f"For {name}: {GENERIC_SAFETY}"
        ),
        "safety",
    )
    add(
        f"How long should I take {name}? How long until {name} works?",
        f"Use {name} consistently as labelled ({p['dosage']}). "
        "Herbal support is individual — many clients use a product for several weeks. "
        "Some formulas suggest a break after a course (check the label). "
        "For a personalized plan call +357 22 610 418.",
        "duration",
    )
    add(
        f"How is {name} packaged? Capsules or powder?",
        f"{name}: {p['packaging']}. YGIA uses vegan/plant capsules and recyclable amber glass where applicable.",
        "packaging",
    )
    if p["price"]:
        add(
            f"How much does {name} cost? What is the price of {name}?",
            f"{name} is listed at {p['price']}"
            + (f" ({p['avail']})." if p["avail"] else ".")
            + f" See {p['url']} on the shop.",
            "price",
        )
    add(
        f"Why should I choose {name}? Benefits of {name}?",
        f"Why clients choose {name}: {first_sentence(purpose, 240)} "
        f"Clean-label YGIA formula. Dosage: {p['dosage']}.",
        "benefits",
    )
    add(
        f"Can I take {name} with other supplements?",
        f"Many clients combine {name} with other YGIA products, but stacking depends on your goals. "
        f"Share what else you take and we can suggest a simple stack, or call +357 22 610 418. "
        f"Keep total dosage of overlapping herbs in mind. Label for {name}: {p['dosage']}.",
        "combine",
    )
    add(
        f"Tell me about {name}. Information on {name}.",
        f"{name}: {first_sentence(purpose, 200)} Dosage: {p['dosage']}. "
        f"Ingredients: {first_sentence(p['ingredients'], 160)} "
        f"Shop: {p['url']}.",
        "overview",
    )

    return faqs


def main() -> None:
    store = json.loads(STORE.read_text(encoding="utf-8"))
    book = (
        json.loads(BOOKLET.read_text(encoding="utf-8"))
        if BOOKLET.exists()
        else {"products": []}
    )
    book_map = booklet_by_handle(book)

    products = [
        parse_product(p, book_map)
        for p in store["pages"]
        if p.get("url", "").startswith("/products/")
    ]

    all_faqs: list[dict] = []
    for p in products:
        all_faqs.extend(make_faqs(p))

    # Catalog-level usage questions clients often ask
    catalog_faqs = [
        {
            "question": "How should I take YGIA supplements in general?",
            "answer": (
                "Take the number of capsules shown on each bottle with water. "
                "Many YGIA products use delayed-release plant capsules in amber glass. "
                "Start at the lower end of the dose range if you are new. "
                "Not for pregnancy/breastfeeding unless advised. Call +357 22 610 418 for a personal plan."
            ),
            "tags": [TAG, "usage", "general"],
            "product": "YGIA general",
        },
        {
            "question": "Are YGIA products vegan and free from additives?",
            "answer": (
                "YGIA supplements are 100% natural with no additives, non-GMO, gluten-free, dairy-free, soy-free, "
                "and suitable for vegetarians and vegans. They use Pullulan (tapioca) plant capsules and recyclable amber glass bottles."
            ),
            "tags": [TAG, "usage", "quality"],
            "product": "YGIA quality",
        },
        {
            "question": "Can I take more than one YGIA product at the same time?",
            "answer": (
                "Yes — many clients use 2–3 products together for a goal (for example sleep + stress, or men's vitality stack). "
                "Tell me your goal and I will suggest a simple combination with A/B/C options. "
                "For a tailored plan from the herbalist call +357 22 610 418."
            ),
            "tags": [TAG, "usage", "combine"],
            "product": "YGIA general",
        },
        {
            "question": "How long before I notice results from YGIA herbs?",
            "answer": (
                "It varies by person and product. Some feel calming or digestive support sooner; "
                "hormonal, joint, or longevity goals often need consistent use for weeks. "
                "Follow the label course; some products recommend a break after 90 days."
            ),
            "tags": [TAG, "usage", "duration"],
            "product": "YGIA general",
        },
        {
            "question": "Who should not take these supplements?",
            "answer": GENERIC_SAFETY,
            "tags": [TAG, "usage", "safety"],
            "product": "YGIA general",
        },
        {
            "question": "Do you have products specifically for men or for women?",
            "answer": (
                "Yes. For men we often suggest Daily Male, Eros M, Tribulus, or Prostate Support. "
                "For women: Daily Lady, Rock Rose, Inositol Plus, and collagen options. "
                "Tell me your goal and I will pick the best fit."
            ),
            "tags": [TAG, "usage", "gender"],
            "product": "YGIA general",
        },
    ]
    for row in catalog_faqs:
        all_faqs.append(
            {
                "id": str(uuid.uuid4()),
                "question": row["question"],
                "answer": row["answer"],
                "product": row["product"],
                "tags": row["tags"],
            }
        )

    before = len(store.get("faqs") or [])
    store["faqs"] = [
        f for f in store.get("faqs") or [] if TAG not in (f.get("tags") or [])
    ]
    store["faqs"].extend(all_faqs)
    store["updatedAt"] = datetime.now(timezone.utc).isoformat()

    OUT.write_text(
        json.dumps(
            {
                "generatedAt": store["updatedAt"],
                "productCount": len(products),
                "faqCount": len(all_faqs),
                "products": [
                    {"name": p["name"], "handle": p["handle"], "hasBooklet": bool(book_map.get(p["handle"]))}
                    for p in products
                ],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    # Also dump full FAQ list for review
    (ROOT / "data" / "product-usage-faqs-full.json").write_text(
        json.dumps(all_faqs, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    STORE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"Products: {len(products)} | Usage FAQs added: {len(all_faqs)} | "
        f"Store faqs: {before} -> {len(store['faqs'])}"
    )
    print(f"Wrote {OUT} and knowledge.json")


if __name__ == "__main__":
    main()
