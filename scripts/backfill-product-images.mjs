import { readFileSync, writeFileSync } from "fs";
import path from "path";

const SITE = "https://ygianaturalhealth.com";
const STORE = path.join(process.cwd(), "data", "knowledge.json");

const HEADERS = {
  Accept: "application/json,text/html",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function imageFromProduct(p) {
  const featured = p.featured_image;
  if (typeof featured === "string" && featured) return featured;
  if (featured?.src) return featured.src;
  const img = p.images?.[0];
  if (typeof img === "string") return img;
  if (img?.src) return img.src;
  return "";
}

async function fetchAllProducts() {
  const all = [];
  for (let page = 1; page <= 20; page++) {
    const url = `${SITE}/products.json?limit=50&page=${page}`;
    console.log("fetch", url);
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.warn("status", res.status, await res.text());
      await sleep(5000);
      continue;
    }
    const data = await res.json();
    if (!data.products?.length) break;
    all.push(...data.products);
    if (data.products.length < 50) break;
    await sleep(2500);
  }
  return all;
}

async function ogImageForHandle(handle) {
  const res = await fetch(`${SITE}/products/${handle}`, {
    headers: { ...HEADERS, Accept: "text/html" },
  });
  if (!res.ok) return "";
  const html = await res.text();
  const m =
    html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  return m?.[1] || "";
}

const store = JSON.parse(readFileSync(STORE, "utf8"));
const products = await fetchAllProducts();
const byHandle = new Map(products.map((p) => [p.handle, imageFromProduct(p)]));

let updated = 0;
let missing = 0;
for (const page of store.pages) {
  if (!page.url?.startsWith("/products/")) continue;
  const handle = page.url.replace("/products/", "");
  let image = byHandle.get(handle) || "";
  if (!image) {
    await sleep(800);
    image = await ogImageForHandle(handle);
  }
  if (image) {
    page.image = image;
    updated += 1;
  } else {
    missing += 1;
    console.warn("no image", handle);
  }
}

writeFileSync(STORE, JSON.stringify(store));
console.log(`Updated ${updated} product images, missing ${missing}`);
