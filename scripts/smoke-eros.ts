import { answerQuestion } from "../src/lib/rag/chat";

async function main() {
  for (const q of [
    "What else about, uh, Eros M?",
    "more details on Eros M",
    "Uh, what else can you tell me about it?",
  ]) {
    const history =
      q.includes("about it")
        ? [
            { role: "user" as const, content: "tell me about Eros M" },
            {
              role: "assistant" as const,
              content: "EROS M enhances sexual desire...",
            },
          ]
        : undefined;
    const r = await answerQuestion({
      question: q,
      language: "en",
      history,
      lastListings: history
        ? [
            {
              url: "/products/eros-m",
              label: "EROS M",
              choice: "A" as const,
            },
          ]
        : undefined,
    });
    const browse = /here are three options|Say A, B, or C/i.test(r.answer);
    console.log(browse ? "BROWSE" : "DETAIL", q);
    console.log(" ", r.answer.slice(0, 280).replace(/\n/g, " "));
    console.log(
      " cards:",
      (r.listings || []).map((l) => l.label?.slice(0, 30)).join(" | "),
    );
    console.log("---");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
