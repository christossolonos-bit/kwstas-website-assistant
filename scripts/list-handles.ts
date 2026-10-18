import { loadStore } from "../src/lib/rag/store";

async function main() {
  const s = await loadStore();
  const hs = s.pages
    .filter((p) => p.url.startsWith("/products/"))
    .map((p) => p.url.replace("/products/", ""));
  const needles = [
    "ashwa",
    "anxi",
    "stress-free",
    "daily-lady",
    "daily-male",
    "eros",
    "super-sleep",
    "gluco",
    "olive-leaf",
    "lions",
    "synbiotic",
    "chicory",
    "radik",
    "ραδικ",
  ];
  for (const n of needles) {
    console.log(
      n + ":",
      hs.filter((h) => h.includes(n)).slice(0, 4).join(" | ") || "(none)",
    );
  }
}

main();
