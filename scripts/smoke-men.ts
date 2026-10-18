import { answerQuestion } from "../src/lib/rag/chat";

const qs = [
  "which product can i use for men specifically",
  "something for men",
  "products for men's health",
  "what do you have for women",
];

async function main() {
  for (const q of qs) {
    const r = await answerQuestion({ question: q, language: "en" });
    console.log("\nQ:", q);
    console.log("A:", r.answer.slice(0, 280));
    console.log(
      "Cards:",
      (r.listings || []).map((l) => `${l.choice}:${l.label}`).join(" | "),
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
