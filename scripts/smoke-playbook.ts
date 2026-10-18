import { answerQuestion } from "../src/lib/rag/chat";
import { upsertProfile } from "../src/lib/profiles";
import {
  matchPlaybook,
  predictedAsksFor,
  problemsFromProfile,
} from "../src/lib/rag/symptom-playbook";

async function main() {
  console.log("Playbook matches for indigestion:", matchPlaybook("indigestion").map((e) => e.id));

  for (const q of [
    "what can I use for indigestion?",
    "constipation",
    "something for stress",
    "for diabetes",
  ]) {
    const r = await answerQuestion({ question: q, language: "en" });
    console.log("\nQ:", q);
    console.log(
      " →",
      (r.listings || []).map((l) => l.label?.slice(0, 28)).join(" | "),
    );
    console.log(" prompts:", (r.suggestedPrompts || []).slice(0, 3).join(" · "));
  }

  const profile = await upsertProfile({
    id: "demo-maria-indigestion",
    name: "Maria (demo)",
    phone: "+35799111222",
    goals: ["indigestion", "bloating", "better sleep"],
    notes: "Often asks about gut comfort after meals.",
  });
  console.log(
    "\nProfile problems:",
    problemsFromProfile(profile).map((p) => p.id).join(", "),
  );
  console.log(
    "Predicted from card:",
    predictedAsksFor(profile, "what should I take?").join(" · "),
  );

  const personal = await answerQuestion({
    question: "what should I take?",
    language: "en",
    profilePhone: "+35799111222",
  });
  console.log("\nProfile ask: what should I take?");
  console.log(" A:", personal.answer.slice(0, 220).replace(/\n/g, " "));
  console.log(
    " →",
    (personal.listings || []).map((l) => l.label?.slice(0, 28)).join(" | "),
  );
  console.log(" prompts:", (personal.suggestedPrompts || []).join(" · "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
