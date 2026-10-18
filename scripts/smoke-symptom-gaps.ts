import { answerQuestion } from "../src/lib/rag/chat";

/** Common spoken needs — flag phone handoffs or obviously wrong cards. */
const CASES = [
  "what can I use for indigestion?",
  "Indigestion.",
  "something for bloating",
  "heartburn",
  "acid reflux",
  "stomach ache",
  "constipation",
  "I can't sleep",
  "something for stress",
  "joint pain",
  "for diabetes",
  "for men",
  "for energy",
  "cold and flu",
  "hay fever",
  "high cholesterol",
  "liver detox",
  "brain fog",
  "UTI",
  "menopause",
];

async function main() {
  for (const q of CASES) {
    const r = await answerQuestion({ question: q, language: "en" });
    const phone = /610\s*418|don't have that product/i.test(r.answer);
    const cards = (r.listings || []).map((l) => l.label?.slice(0, 36) || "?");
    const tag = phone ? "PHONE" : cards.length ? "OK" : "EMPTY";
    console.log(`${tag.padEnd(6)} ${q}`);
    console.log(`       ${r.answer.slice(0, 160).replace(/\n/g, " ")}`);
    if (cards.length) console.log(`       → ${cards.join(" | ")}`);
    console.log("");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
