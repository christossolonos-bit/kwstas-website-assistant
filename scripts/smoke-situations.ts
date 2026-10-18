import { answerQuestion } from "../src/lib/rag/chat";

const qs = [
  "which product can i use for women specifically",
  "something for women",
  "what do you have for a woman",
  "products for my wife",
  "libido for women",
  "something for menopause",
  "which product can i use for men specifically",
  "something for my husband",
  "i can't sleep",
  "what's good for stress and anxiety",
  "i need more energy",
  "something for joints and pain",
  "what's good for memory and focus",
  "do you have anything for the liver",
  "what would you recommend for cholesterol",
  "i'm always getting colds",
  "best sellers",
];

async function main() {
  for (const q of qs) {
    const r = await answerQuestion({ question: q, language: "en" });
    const cards = (r.listings || [])
      .map((l) => `${l.choice}:${(l.label || "").split(/♦|–/)[0]!.trim().slice(0, 28)}`)
      .join(" | ");
    const phone = /610\s*418|don't have that product/i.test(r.answer);
    console.log(phone ? "FAIL" : "OK  ", q);
    console.log("    ", r.answer.slice(0, 140).replace(/\n/g, " "));
    console.log("    ", cards || "(no cards)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
