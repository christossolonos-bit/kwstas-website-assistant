import { answerQuestion } from "../src/lib/rag/chat";

const qs = [
  "How do I take Daily Male?",
  "What are the ingredients in Daily Lady?",
  "Is Lion's Mane safe?",
  "When should I take Curcumin?",
  "Can I take more than one YGIA product at the same time?",
  "Who is Prostate Support for?",
  "How long should I take Anxi Free?",
];

async function main() {
  for (const q of qs) {
    const r = await answerQuestion({ question: q, language: "en" });
    const phone = /don't have that product detail/i.test(r.answer);
    console.log(phone ? "FAIL" : "OK  ", q);
    console.log("    ", r.answer.slice(0, 220).replace(/\n/g, " "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
