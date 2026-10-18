import { answerQuestion } from "../src/lib/rag/chat";

const qs = [
  "What is Lion's Mane for?",
  "How do I take Curcumin 95%?",
  "What are the ingredients in Daily Male?",
  "What is Super Lax Support dosage?",
];

async function main() {
  for (const q of qs) {
    const res = await answerQuestion({ question: q, language: "en" });
    console.log("\nQ:", q);
    console.log("A:", res.answer.slice(0, 320));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
