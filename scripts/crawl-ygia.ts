/**
 * Deep reverse-engineer of live YGIA Natural Health (Shopify)
 * into the assistant knowledge store + data/ygia-site-map.json
 *
 * Usage: npx tsx scripts/crawl-ygia.ts
 */
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { rebuildIndex } from "../src/lib/rag/ingest";
import { loadStore, saveStore } from "../src/lib/rag/store";
import type { PageEntry, QaEntry } from "../src/lib/types";

const SITE = "https://ygianaturalhealth.com";
const DATA_DIR = path.join(process.cwd(), "data");

const HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,el;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  attempts = 6,
): Promise<Response> {
  let lastErr: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { ...HEADERS, ...(init?.headers as Record<string, string>) },
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = Math.min(60_000, 2_000 * 2 ** i);
        console.warn(`  ${res.status} on ${url} — retry in ${wait / 1000}s…`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
      return res;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      const wait = Math.min(30_000, 1_500 * 2 ** i);
      console.warn(`  network error — retry in ${wait / 1000}s: ${lastErr.message}`);
      await sleep(wait);
    }
  }
  throw lastErr ?? new Error(`Fetch failed: ${url}`);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetchWithRetry(url, {
    headers: { Accept: "application/json" },
  });
  return res.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetchWithRetry(url, {
    headers: { Accept: "text/html,application/xml" },
  });
  return res.text();
}

function extractMainText(html: string, max = 24000): string {
  const main =
    html.match(/<main[\s\S]*?<\/main>/i)?.[0] ||
    html.match(/<article[\s\S]*?<\/article>/i)?.[0] ||
    html.match(/<div[^>]+class="[^"]*rte[^"]*"[\s\S]*?<\/div>/i)?.[0] ||
    html;
  return stripHtml(main).slice(0, max);
}

type ShopifyVariant = {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  available: boolean;
  sku: string;
  weight?: number;
  weight_unit?: string;
};

type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string[] | string;
  variants: ShopifyVariant[];
  options?: Array<{ name: string; values: string[] }>;
  featured_image?: string | { src?: string } | null;
  images?: Array<string | { src?: string }>;
};

type ShopifyCollection = {
  id: number;
  handle: string;
  title: string;
  body_html: string;
  products_count?: number;
};

type ShopifyPage = {
  id: number;
  handle: string;
  title: string;
  body_html: string;
};

type SiteMap = {
  crawledAt: string;
  site: string;
  locales: string[];
  summary: Record<string, number>;
  collections: Array<{
    handle: string;
    title: string;
    productCount: number;
    productHandles: string[];
  }>;
  products: Array<{
    handle: string;
    title: string;
    price: string;
    available: boolean;
    type: string;
    tags: string[];
    collections: string[];
  }>;
  pages: Array<{ handle: string; title: string }>;
  policies: string[];
  articles: Array<{ path: string; title: string }>;
};

function normalizeTags(tags: string[] | string | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];
  let page = 1;
  while (page <= 20) {
    console.log(`  products.json page ${page}…`);
    const data = await fetchJson<{ products: ShopifyProduct[] }>(
      `${SITE}/products.json?limit=50&page=${page}`,
    );
    if (!data.products?.length) break;
    all.push(...data.products);
    if (data.products.length < 50) break;
    page += 1;
    await sleep(2500);
  }
  return all;
}

async function fetchAllCollections(): Promise<ShopifyCollection[]> {
  const data = await fetchJson<{ collections: ShopifyCollection[] }>(
    `${SITE}/collections.json?limit=250`,
  );
  return data.collections ?? [];
}

async function fetchCollectionProducts(handle: string): Promise<string[]> {
  const handles: string[] = [];
  let page = 1;
  while (page <= 10) {
    const data = await fetchJson<{ products: Array<{ handle: string }> }>(
      `${SITE}/collections/${handle}/products.json?limit=50&page=${page}`,
    );
    if (!data.products?.length) break;
    handles.push(...data.products.map((p) => p.handle));
    if (data.products.length < 50) break;
    page += 1;
    await sleep(1200);
  }
  return handles;
}

async function fetchAllShopifyPages(): Promise<ShopifyPage[]> {
  const data = await fetchJson<{ pages: ShopifyPage[] }>(
    `${SITE}/pages.json?limit=250`,
  );
  return data.pages ?? [];
}

async function fetchArticleUrls(): Promise<string[]> {
  try {
    const xml = await fetchText(`${SITE}/sitemap_articles_1.xml`);
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
    return locs.filter((u) => u.includes("/blogs/"));
  } catch {
    return [];
  }
}

function productToPage(
  p: ShopifyProduct,
  collectionTitles: string[],
): PageEntry {
  const tags = normalizeTags(p.tags);
  const variants = p.variants ?? [];
  const prices = variants.map((v) => v.price);
  const minPrice = prices.length ? prices.sort((a, b) => Number(a) - Number(b))[0] : "";
  const available = variants.some((v) => v.available);
  const body = stripHtml(p.body_html || "").slice(0, 18000);
  const variantLines = variants
    .map((v) => {
      const cmp = v.compare_at_price ? ` (was €${v.compare_at_price})` : "";
      const sku = v.sku ? ` SKU ${v.sku}` : "";
      return `• ${v.title}: €${v.price}${cmp}${sku} — ${v.available ? "in stock" : "out of stock"}`;
    })
    .join("\n");

  const description = [
    p.title,
    minPrice ? `From €${minPrice}` : "",
    available ? "In stock" : "Currently unavailable",
    p.product_type,
    collectionTitles.slice(0, 4).join(", "),
    body.slice(0, 220),
  ]
    .filter(Boolean)
    .join(" — ");

  const featured = p.featured_image;
  const firstImg = p.images?.[0];
  const image =
    (typeof featured === "string" && featured) ||
    (featured && typeof featured === "object" && featured.src) ||
    (typeof firstImg === "string" && firstImg) ||
    (firstImg && typeof firstImg === "object" && firstImg.src) ||
    undefined;

  return {
    id: randomUUID(),
    url: `/products/${p.handle}`,
    title: p.title,
    description,
    image: image || undefined,
    keywords: [
      ...tags,
      p.product_type,
      p.vendor,
      ...collectionTitles,
      ...p.title.split(/[\s♦\-–,|/]+/).filter((t) => t.length > 2),
    ]
      .filter(Boolean)
      .slice(0, 50),
    content: [
      `Product: ${p.title}`,
      `Handle: ${p.handle}`,
      `URL: ${SITE}/products/${p.handle}`,
      `Vendor: ${p.vendor || "YGIA Natural Health"}`,
      `Type: ${p.product_type || "Supplement"}`,
      `Availability: ${available ? "in stock" : "out of stock"}`,
      minPrice ? `Price: €${minPrice}` : "",
      tags.length ? `Tags: ${tags.join(", ")}` : "",
      collectionTitles.length
        ? `Collections / categories: ${collectionTitles.join(", ")}`
        : "",
      "",
      "Variants:",
      variantLines || "• default",
      "",
      "Full product description:",
      body,
    ]
      .filter((line) => line !== undefined)
      .join("\n"),
    scannedAt: new Date().toISOString(),
  };
}

function htmlPageEntry(
  pathUrl: string,
  title: string,
  htmlOrText: string,
  keywords: string[] = [],
): PageEntry {
  const text =
    htmlOrText.includes("<") && htmlOrText.includes(">")
      ? stripHtml(htmlOrText).slice(0, 24000)
      : htmlOrText.slice(0, 24000);
  return {
    id: randomUUID(),
    url: pathUrl,
    title,
    description: text.replace(/\s+/g, " ").slice(0, 280),
    keywords,
    content: text,
    scannedAt: new Date().toISOString(),
  };
}

/** Pull Q/A pairs from FAQ-like HTML / text */
function faqPairsFromText(raw: string, lang: "en" | "el"): QaEntry[] {
  const faqs: QaEntry[] = [];
  const text = raw.replace(/\s+/g, " ").trim();

  // Split on common question starters
  const blocks = text.split(
    /(?=(?:How can I|Do I have|I placed|I received|What (?:is|are|if)|When (?:will|do|can)|Can I|Where (?:do|can)|Why |Is there|Are there|Πώς |Πότε |Μπορώ |Έχετε |Ποια |Τι |Πού |Χρειάζεται ))/i,
  );

  for (const block of blocks) {
    const cleaned = block.trim();
    if (cleaned.length < 35 || cleaned.length > 1400) continue;
    const qMatch = cleaned.match(/^([^?]{8,160}\?)/);
    if (!qMatch) continue;
    const q = qMatch[1]!.trim();
    const a = cleaned.slice(q.length).trim();
    if (a.length < 20) continue;
    faqs.push({
      id: randomUUID(),
      question: q,
      answer: a.slice(0, 1000),
      tags: [lang, "faq"],
    });
  }
  return faqs;
}

const CORE_FAQS: QaEntry[] = [
  {
    id: randomUUID(),
    question: "When will my order arrive / shipping times?",
    answer:
      "Orders are processed and shipped within 1 business day (cut-off 2:00 PM local time, Mon–Fri). Cyprus delivery is usually 2–3 business days after shipment. Greece Attica about 3 business days, rest of Greece and major European cities about 7 business days. Worldwide shipping is available; for some destinations shipping cost is confirmed before payment. Contact: support@ygianaturalhealth.com or +357 22 610 418.",
    tags: ["shipping", "delivery"],
  },
  {
    id: randomUUID(),
    question: "Πότε θα έρθει η παραγγελία μου;",
    answer:
      "Οι παραγγελίες επεξεργάζονται και αποστέλλονται εντός 1 εργάσιμης ημέρας (cut-off 2:00 μ.μ., Δευ–Παρ). Στην Κύπρο συνήθως 2–3 εργάσιμες μετά την αποστολή. Αττική ~3 εργάσιμες, υπόλοιπη Ελλάδα και μεγάλες ευρωπαϊκές πόλεις ~7 εργάσιμες. Αποστολές παγκοσμίως διαθέσιμες. Επικοινωνία: support@ygianaturalhealth.com ή +357 22 610 418.",
    tags: ["αποστολές", "shipping"],
  },
  {
    id: randomUUID(),
    question: "What is your return / refund policy?",
    answer:
      "30-day return policy if unused, unopened, seals intact, original packaging, with proof of purchase. Contact support@ygianaturalhealth.com before returning. If the error is ours (defective/wrong/damaged), return shipping is covered. Otherwise the customer pays return shipping. Custom/sale items may be non-returnable. EU consumers also have 14-day cancellation rights.",
    tags: ["returns", "refund"],
  },
  {
    id: randomUUID(),
    question: "Ποια είναι η πολιτική επιστροφών;",
    answer:
      "Επιστροφές εντός 30 ημερών εφόσον το προϊόν είναι αχρησιμοποίητο, σφραγισμένο, στην αρχική συσκευασία, με απόδειξη. Επικοινωνήστε πρώτα στο support@ygianaturalhealth.com. Αν το λάθος είναι δικό μας, καλύπτουμε τα μεταφορικά επιστροφής· αλλιώς τα πληρώνει ο πελάτης. Για καταναλωτές ΕΕ ισχύει και δικαίωμα υπαναχώρησης 14 ημερών.",
    tags: ["επιστροφές"],
  },
  {
    id: randomUUID(),
    question: "Do you offer cash on delivery / αντικαταβολή;",
    answer:
      "Yes. Cash on delivery is available for an extra charge of €5. Online orders also accept major cards (Visa, Mastercard, Amex) and PayPal. Prices are in Euros.",
    tags: ["payment", "cod", "αντικαταβολή"],
  },
  {
    id: randomUUID(),
    question: "Έχετε αντικαταβολή;",
    answer:
      "Ναι, η αντικαταβολή είναι διαθέσιμη με επιπλέον χρέωση 5 ευρώ. Δέχεστε επίσης κάρτες (Visa, Mastercard, Amex) και PayPal. Οι τιμές είναι σε ευρώ.",
    tags: ["πληρωμή", "αντικαταβολή"],
  },
  {
    id: randomUUID(),
    question: "How can I contact YGIA / speak to someone?",
    answer:
      "Email support@ygianaturalhealth.com or accounts@ygianaturalhealth.com for order changes. Phone +357 22 610 418. Address: LRG Enterprises Ltd, 2E Bogaziou Street, Dali Industrial Area, Nicosia 2540, Cyprus. There is also free Herbalist Advice on the website.",
    tags: ["contact", "phone"],
  },
  {
    id: randomUUID(),
    question: "Πώς μπορώ να επικοινωνήσω μαζί σας;",
    answer:
      "Email: support@ygianaturalhealth.com. Για αλλαγές παραγγελίας: accounts@ygianaturalhealth.com. Τηλέφωνο: +357 22 610 418. Διεύθυνση: LRG Enterprises Ltd, Οδός Μπογαζίου 2Ε, Βιομηχανική Δάλι, Λευκωσία 2540. Υπάρχει και δωρεάν συμβουλή βοτανολόγου στην ιστοσελίδα.",
    tags: ["επικοινωνία", "τηλέφωνο"],
  },
  {
    id: randomUUID(),
    question: "What makes YGIA supplements different?",
    answer:
      "YGIA Natural Health was founded by herbalist–naturopath Costas Argyrides. Products use standardized herbal extracts, clean-label (no industry-standard fillers/additives), vegan delayed-release capsules for better absorption, and recyclable amber glass bottles. Prevention and holistic wellness are the focus. Products are prepared under strict standards; for medical decisions always consult a personal doctor.",
    tags: ["about", "brand"],
  },
  {
    id: randomUUID(),
    question: "Τι κάνει διαφορετικά τα συμπληρώματα YGIA;",
    answer:
      "Η YGIA ιδρύθηκε από τον βοτανολόγο–φυσιοπαθητικό Κώστα Αργυρίδη. Χρησιμοποιούν standardized herbal extracts, clean-label χωρίς πρόσθετα/fillers, vegan delayed-release κάψουλες για καλύτερη απορρόφηση και ανακυκλώσιμα amber γυάλινα μπουκάλια. Για ιατρικές αποφάσεις συμβουλευτείτε πάντα τον προσωπικό σας γιατρό.",
    tags: ["σχετικά", "μάρκα"],
  },
  {
    id: randomUUID(),
    question: "Can I change or cancel my order?",
    answer:
      "Contact accounts@ygianaturalhealth.com or support@ygianaturalhealth.com immediately with your order number. Changes/cancellations are only possible before warehouse processing/shipping. If already shipped, you can refuse the package so it returns to sender, then request a refund.",
    tags: ["cancel", "order"],
  },
  {
    id: randomUUID(),
    question: "Μπορώ να αλλάξω ή να ακυρώσω την παραγγελία μου;",
    answer:
      "Επικοινωνήστε αμέσως στο accounts@ygianaturalhealth.com ή support@ygianaturalhealth.com με τον αριθμό παραγγελίας. Αλλαγές/ακυρώσεις μόνο πριν την επεξεργασία στην αποθήκη. Αν έχει ήδη αποσταλεί, μπορείτε να αρνηθείτε το δέμα ώστε να επιστραφεί και μετά να ζητήσετε επιστροφή χρημάτων.",
    tags: ["ακύρωση", "παραγγελία"],
  },
  {
    id: randomUUID(),
    question: "Do you ship to Greece and Cyprus / pharmacies?",
    answer:
      "Yes — YGIA ships in Cyprus and Greece (and worldwide). There is a dedicated Delivery Service page for Greece and Cyprus, and a Pharmacies page listing pharmacies in Cyprus that carry YGIA products. Cash on delivery is available where supported.",
    tags: ["shipping", "cyprus", "greece", "pharmacies"],
  },
];

async function main() {
  console.log("Deep reverse-engineering YGIA Natural Health…\n");

  const pages: PageEntry[] = [];
  const productCollectionMap = new Map<string, string[]>();

  // --- Collections ---
  console.log("1) Collections");
  const collections = await fetchAllCollections();
  console.log(`   ${collections.length} collections`);
  const collectionMeta: SiteMap["collections"] = [];

  for (const col of collections) {
    console.log(`   → ${col.handle}`);
    let handles: string[] = [];
    try {
      handles = await fetchCollectionProducts(col.handle);
      await sleep(900);
    } catch (err) {
      console.warn(
        `     skip products:`,
        err instanceof Error ? err.message : err,
      );
    }
    for (const h of handles) {
      const list = productCollectionMap.get(h) ?? [];
      list.push(col.title);
      productCollectionMap.set(h, list);
    }
    collectionMeta.push({
      handle: col.handle,
      title: col.title,
      productCount: handles.length || col.products_count || 0,
      productHandles: handles,
    });

    const body = stripHtml(col.body_html || "");
    pages.push(
      htmlPageEntry(
        `/collections/${col.handle}`,
        col.title,
        [
          `Collection: ${col.title}`,
          `URL: ${SITE}/collections/${col.handle}`,
          `Products in category: ${handles.length || col.products_count || 0}`,
          handles.length
            ? `Product handles: ${handles.slice(0, 80).join(", ")}`
            : "",
          body,
        ]
          .filter(Boolean)
          .join("\n\n"),
        ["collection", "category", col.handle, col.title],
      ),
    );
  }

  // --- Products ---
  console.log("\n2) Products");
  const products = await fetchAllProducts();
  console.log(`   ${products.length} products`);
  const productMeta: SiteMap["products"] = [];

  for (const p of products) {
    const cols = [...new Set(productCollectionMap.get(p.handle) ?? [])];
    pages.push(productToPage(p, cols));
    const tags = normalizeTags(p.tags);
    const v0 = p.variants?.[0];
    productMeta.push({
      handle: p.handle,
      title: p.title,
      price: v0?.price ?? "",
      available: p.variants?.some((v) => v.available) ?? false,
      type: p.product_type || "",
      tags,
      collections: cols,
    });
  }

  // --- Shopify CMS pages ---
  console.log("\n3) CMS pages");
  const cmsPages = await fetchAllShopifyPages();
  console.log(`   ${cmsPages.length} pages`);
  for (const pg of cmsPages) {
    // Skip search UI page
    if (pg.handle === "ls-search") continue;
    pages.push(
      htmlPageEntry(`/pages/${pg.handle}`, pg.title, pg.body_html || "", [
        "page",
        pg.handle,
        ...pg.title.split(/\s+/).slice(0, 8),
      ]),
    );
    await sleep(200);
  }

  // Greek FAQ / key localized pages
  const elExtras: Array<[string, string, string[]]> = [
    ["/el/pages/faq", "Συχνές Ερωτήσεις", ["faq", "ερωτήσεις"]],
    ["/el/pages/about-us", "Σχετικά με εμάς", ["about", "σχετικά"]],
    ["/el/pages/contact-us", "Επικοινωνία", ["contact", "επικοινωνία"]],
  ];
  for (const [urlPath, title, kws] of elExtras) {
    try {
      console.log(`   EL ${urlPath}`);
      const html = await fetchText(`${SITE}${urlPath}`);
      pages.push(htmlPageEntry(urlPath, title, extractMainText(html), kws));
      await sleep(1200);
    } catch (err) {
      console.warn(`   skip ${urlPath}:`, err instanceof Error ? err.message : err);
    }
  }

  // --- Policies ---
  console.log("\n4) Policies");
  const policyPaths = [
    "shipping-policy",
    "refund-policy",
    "privacy-policy",
    "terms-of-service",
    "contact-information",
  ];
  for (const handle of policyPaths) {
    try {
      console.log(`   /policies/${handle}`);
      const html = await fetchText(`${SITE}/policies/${handle}`);
      pages.push(
        htmlPageEntry(
          `/policies/${handle}`,
          handle.replace(/-/g, " "),
          extractMainText(html),
          ["policy", handle],
        ),
      );
      await sleep(1200);
    } catch (err) {
      console.warn(`   skip ${handle}:`, err instanceof Error ? err.message : err);
    }
  }

  // --- Blog articles ---
  console.log("\n5) Blog articles");
  const articleUrls = await fetchArticleUrls();
  console.log(`   ${articleUrls.length} in sitemap (crawling up to 40)`);
  const articleMeta: SiteMap["articles"] = [];
  for (const full of articleUrls.slice(0, 40)) {
    try {
      const pathUrl = full.replace(SITE, "") || full;
      console.log(`   ${pathUrl}`);
      const html = await fetchText(full);
      const title =
        html.match(/<title>([^<]+)<\/title>/i)?.[1]?.replace(/\s*[|\-].*$/, "").trim() ||
        pathUrl.split("/").pop() ||
        "Article";
      const text = extractMainText(html, 16000);
      pages.push(
        htmlPageEntry(pathUrl, title, text, ["blog", "article", "news"]),
      );
      articleMeta.push({ path: pathUrl, title });
      await sleep(1500);
    } catch (err) {
      console.warn(`   skip article:`, err instanceof Error ? err.message : err);
    }
  }

  // Home
  pages.unshift({
    id: randomUUID(),
    url: "/",
    title: "YGIA Natural Health — Home",
    description:
      "Premium herbal supplements by herbalist–naturopath Costas Argyrides. Clean-label standardized extracts, vegan delayed-release capsules, Cyprus & Greece shipping.",
    keywords: ["ygia", "home", "herbal", "supplements", "cyprus", "greece"],
    content: [
      "YGIA Natural Health — Premium herbal supplements.",
      "Founder: Costas Argyrides, Herbalist–Naturopath.",
      "Clean-label philosophy, standardized herbal extracts, vegan delayed-release capsules, recyclable amber glass.",
      "English + Greek storefront. Shop all: /collections/all",
      `Catalog size: ${products.length} products across ${collections.length} collections.`,
      "Support: support@ygianaturalhealth.com · +357 22 610 418",
      "Free herbalist advice page: /pages/free-herbalist-advice",
    ].join("\n"),
    scannedAt: new Date().toISOString(),
  });

  // --- FAQs ---
  console.log("\n6) FAQ extraction");
  let faqs: QaEntry[] = [...CORE_FAQS];
  const faqPage = pages.find((p) => p.url === "/pages/faq");
  if (faqPage?.content) {
    faqs = [...faqs, ...faqPairsFromText(faqPage.content, "en")];
  }
  const faqEl = pages.find((p) => p.url === "/el/pages/faq");
  if (faqEl?.content) {
    faqs = [...faqs, ...faqPairsFromText(faqEl.content, "el")];
  }
  // COD / payments pages often answer call questions
  for (const url of [
    "/pages/cod-delivery",
    "/pages/πληρωμές-τιμολόγηση",
    "/pages/the-ygia-gold-guarantee",
    "/pages/safety-information",
    "/pages/disclaimer",
  ]) {
    const pg = pages.find((p) => p.url === url || decodeURIComponent(p.url) === decodeURIComponent(url));
    if (!pg?.content) continue;
    faqs.push({
      id: randomUUID(),
      question: `What does the page "${pg.title}" say?`,
      answer: pg.content.replace(/\s+/g, " ").slice(0, 900),
      tags: ["page-summary", pg.url],
    });
  }

  const seen = new Set<string>();
  faqs = faqs.filter((f) => {
    const key = f.question.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Category FAQ helper: "What products for sleep?"
  for (const col of collectionMeta.filter((c) => c.productHandles.length > 0 && c.handle !== "frontpage" && c.handle !== "all-products")) {
    const sample = col.productHandles.slice(0, 12).join(", ");
    faqs.push({
      id: randomUUID(),
      question: `What products do you have for ${col.title}?`,
      answer: `In the "${col.title}" collection we currently list ${col.productCount} products. Browse: ${SITE}/collections/${col.handle}. Handles include: ${sample}. Ask about a specific product for price and details.`,
      tags: ["collection", col.handle],
    });
  }

  // --- Persist site map artifact ---
  const siteMap: SiteMap = {
    crawledAt: new Date().toISOString(),
    site: SITE,
    locales: ["en", "el"],
    summary: {
      products: products.length,
      collections: collections.length,
      cmsPages: cmsPages.length,
      policies: policyPaths.length,
      articlesCrawled: articleMeta.length,
      knowledgePages: pages.length,
      faqs: faqs.length,
    },
    collections: collectionMeta,
    products: productMeta,
    pages: cmsPages.map((p) => ({ handle: p.handle, title: p.title })),
    policies: policyPaths.map((p) => `/policies/${p}`),
    articles: articleMeta,
  };

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    path.join(DATA_DIR, "ygia-site-map.json"),
    JSON.stringify(siteMap, null, 2),
    "utf8",
  );
  console.log("\nWrote data/ygia-site-map.json");

  // --- Knowledge store ---
  const store = await loadStore();
  store.pages = pages;
  store.faqs = faqs;
  store.settings.siteBaseUrl = SITE;
  store.settings.welcomeMessage =
    "Γεια σας! Είμαι ο βοηθός της YGIA Natural Health. Ρωτήστε με για προϊόντα, κατηγορίες, αποστολές ή επιστροφές — ελληνικά ή αγγλικά. Hello! I am the YGIA Natural Health assistant. Ask about products, categories, shipping, or returns.";
  await saveStore(store);
  const { chunkCount } = await rebuildIndex();

  console.log("\nYGIA deep knowledge ready:");
  console.log(`  products:     ${products.length}`);
  console.log(`  collections:  ${collections.length}`);
  console.log(`  pages total:  ${pages.length}`);
  console.log(`  FAQs:         ${faqs.length}`);
  console.log(`  chunks:       ${chunkCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
