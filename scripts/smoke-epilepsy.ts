import { answerQuestion } from "../src/lib/rag/chat";

async function main() {
  for (const q of [
    "what do you have for epilepsy",
    "something for seizures",
    "what can I use for indigestion",
  ]) {
    const r = await answerQuestion({ question: q, language: "en" });
    console.log("Q:", q);
    console.log("A:", r.answer.slice(0, 280).replace(/\n/g, " "));
    console.log(
      "cards:",
      (r.listings || []).map((l) => l.label?.slice(0, 30)).join(" | ") || "(none)",
    );
    console.log("---");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
