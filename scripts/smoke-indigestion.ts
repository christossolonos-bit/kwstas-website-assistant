import { answerQuestion } from "../src/lib/rag/chat";
import { loadStore } from "../src/lib/rag/store";

async function main() {
  const store = await loadStore();
  const pages = store.pages.filter((p) => p.url.includes("/products/"));

  for (const q of [
    "Uh, what can I, what can I use for, uh, indigestion?",
    "Indigestion.",
    "something for indigestion",
    "what do you have for digestion",
    "bloating",
    "stomach ache",
    "constipation",
    "heartburn",
    "acid reflux",
  ]) {
    const r = await answerQuestion({ question: q, language: "en" });
    console.log("Q:", q);
    console.log("A:", r.answer.slice(0, 300).replace(/\n/g, " "));
    console.log(
      "cards:",
      (r.listings || []).map((l) => l.label?.slice(0, 40)).join(" | ") || "(none)",
    );
    console.log("---");
  }

  // Digestive collection products in KB
  const dig = pages.filter(
    (p) =>
      (p.collections || []).some((c) =>
        /digest/i.test(typeof c === "string" ? c : String(c)),
      ) ||
      /digest|gut|bloating|stomach|lax|probiotic|slippery|chicory|milk thistle/i.test(
        `${p.title} ${p.description || ""}`,
      ),
  );
  console.log("\nDigestive-tagged products in KB:", dig.length);
  for (const p of dig.slice(0, 20)) {
    console.log(" -", p.title.slice(0, 70));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
