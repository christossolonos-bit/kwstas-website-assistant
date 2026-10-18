import type { ClientProfile, PageEntry } from "../types";

/**
 * Curated problem → best YGIA products.
 * Handles must match Shopify product URL tails (/products/<handle>).
 */
export type PlaybookEntry = {
  id: string;
  /** Spoken problem label for answers */
  label: string;
  /** Match client speech / profile goals / notes */
  match: RegExp;
  /** Preferred product handles (best first) */
  prefer: string[];
  /** Handles that sit in the wrong collection for this problem */
  avoid?: string[];
  /** Likely next questions after we suggest for this problem */
  predictedAsks: string[];
};

export const SYMPTOM_PLAYBOOK: PlaybookEntry[] = [
  {
    id: "indigestion",
    label: "indigestion and digestive comfort",
    match:
      /\b(indigest\w*|dyspepsia|heartburn|acid reflux|reflux|bloat\w*|nausea|upset stomach|stomach (ache|pain)|after (a )?meal|digestive comfort)\b/i,
    prefer: [
      "slippery-elm",
      "lactobacillus-bulgaricus-10-blllion-cfu",
      "synbiotic-blend-probiotics-12-5-billion-c-f-u-prebiotcis",
      "second-brain-mood-support-for-gut-mind-60-drcaps-x-600-mg",
      "ρίζα-ραδικιού-πρεβιοτικό",
    ],
    avoid: [
      "3-days-slim",
      "alfalfa-may-help-lower-cholesterol",
      "berberine-97",
      "glp1-support",
      "chanca-piedra-500-mg",
      "super-lax",
    ],
    predictedAsks: [
      "How do I take Slippery Elm?",
      "What about bloating?",
      "Can I take it with medicine?",
    ],
  },
  {
    id: "constipation",
    label: "constipation and bowel regularity",
    match: /\b(constipat\w*|laxative|bowel|stool|irregular bowel)\b/i,
    prefer: [
      "super-lax",
      "ρίζα-ραδικιού-πρεβιοτικό",
      "slippery-elm",
      "lactobacillus-bulgaricus-10-blllion-cfu",
    ],
    predictedAsks: [
      "How long can I take Super Lax?",
      "What's the dosage?",
      "Do you have a gentler option?",
    ],
  },
  {
    id: "sleep",
    label: "better sleep",
    match:
      /\b(sleep|insomnia|can'?t sleep|cannot sleep|trouble sleeping|falling asleep|restless at night|poor sleep)\b/i,
    prefer: [
      "super-sleep-deep-relaxation-complex-60-drcaps-x-560-mg",
      "relive",
      "stress-free",
      "magnesium-glycinate",
    ],
    predictedAsks: [
      "How do I take Super Sleep?",
      "Is it ok with my other supplements?",
      "What about stress at night?",
    ],
  },
  {
    id: "stress",
    label: "stress and mood",
    match:
      /\b(stress|anxiety|anxious|nervous|mood|calm|worried|panic|tension|burn(ed)? ?out|relax)\b/i,
    prefer: [
      "ashwagandha-ασβαγκάντα",
      "ashwangandha",
      "stress-free",
      "magnesium-glycinate",
      "relive",
      "rock-rose",
    ],
    predictedAsks: [
      "How do I take Ashwagandha?",
      "What's the difference from Relive?",
      "Can I take it during the day?",
    ],
  },
  {
    id: "joints",
    label: "joints and mobility",
    match:
      /\b(joint|joints|arthritis|mobility|stiff(ness)?|knees?|hips?|cartilage)\b/i,
    prefer: [
      "glucosamine-chodroitin-msm-500-mg-♦-60-enteric-veg-caps-x-500mg-♦-amber-glass-bottles-♦-100-natural-♦-non-gmo-♦-gluten-dairy-free-♦-no-additives",
      "curcumin-95-pepper",
      "κολλαγόνο-από-πεπτίδια-ψαριού-υαλουρονικό-οξύ",
    ],
    avoid: ["daily-male", "eros-m"],
    predictedAsks: [
      "How do I take Curcumin?",
      "Is there something for inflammation?",
      "What's the dosage?",
    ],
  },
  {
    id: "pain",
    label: "pain and inflammation",
    match: /\b(pain|ache|aching|sore|inflammation|inflamed)\b/i,
    prefer: ["curcumin-95-pepper", "glucosamine-chodroitin-msm-500-mg-♦-60-enteric-veg-caps-x-500mg-♦-amber-glass-bottles-♦-100-natural-♦-non-gmo-♦-gluten-dairy-free-♦-no-additives"],
    predictedAsks: [
      "How many Curcumin capsules a day?",
      "Can I take it with medicine?",
    ],
  },
  {
    id: "energy",
    label: "energy and vitality",
    match:
      /\b(energy|fatigue|tired|vitality|exhaust|no energy|low energy|sluggish|worn out)\b/i,
    prefer: [
      "shilajit-50-fulvic-acid-natural-booster-energy-stamina",
      "pure-cordyceps-sinensis",
      "vitamin-b12-3-000-mcg",
      "pqq-liposomal-q10",
      "nad-longetivity-60-drcaps",
    ],
    avoid: ["eros-m", "daily-male"],
    predictedAsks: [
      "How do I take Shilajit?",
      "What's best for afternoon fatigue?",
      "Tell me about Cordyceps",
    ],
  },
  {
    id: "blood-sugar",
    label: "blood sugar and metabolic support",
    match:
      /\b(diabet\w*|blood sugar|blood glucose|glucose|sugar levels?|insulin|metabolic|glycem\w*|a1c|prediabet\w*)\b/i,
    prefer: [
      "berberine-97",
      "berberine-bitter-melon",
      "gluco-support-συμβάλλει-στην-ρύθμιση-του-σακχάρου",
      "glp1-support",
    ],
    predictedAsks: [
      "How do I take Berberine?",
      "What's the difference with Bitter Melon?",
      "Can I take it with medicine?",
    ],
  },
  {
    id: "mens",
    label: "men's vitality and drive",
    match:
      /\b(men'?s?|for men|male|guys|boyfriend|husband|testosterone|prostate|virility|erectile|sex drive|libido|daily male)\b/i,
    prefer: ["eros-m", "daily-male", "pure-tribulus-terrestris", "super-prostate-support-600-mg-std"],
    predictedAsks: [
      "More details on Eros M",
      "What's the difference between A and B?",
      "How do I take Daily Male?",
    ],
  },
  {
    id: "womens",
    label: "women's health",
    match:
      /\b(women'?s?|for women|ladies|female|girlfriend|wife|menopause|perimenopause|pcos|pms|period|hot flashes?|daily lady)\b/i,
    prefer: [
      "daily-lady-1",
      "rock-rose",
      "κολλαγόνο-από-πεπτίδια-ψαριού-υαλουρονικό-οξύ",
    ],
    predictedAsks: [
      "More details on Daily Lady",
      "Something for menopause?",
      "How do I take it?",
    ],
  },
  {
    id: "immune",
    label: "immune support",
    match:
      /\b(immune|immunity|cold|flu|get(ting)? sick|catch(ing)? colds?|run ?down|defenses?)\b/i,
    prefer: [
      "vitamin-c",
      "echinacea-ygia",
      "olive-leaf-20-oleuropein",
      "chaga-mushroom-ygia",
      "red-reishi-ganoderma-mushroom-1",
    ],
    predictedAsks: [
      "How do I take Vitamin C?",
      "What's best at the start of a cold?",
      "Tell me about Olive Leaf",
    ],
  },
  {
    id: "brain",
    label: "brain and memory",
    match:
      /\b(brain|memory|focus|concentration|cognitive|forgetful|foggy|brain fog|lion'?s?\s*mane)\b/i,
    prefer: [
      "lions-mane-mushroom-a-tonic-for-the-nervous-system",
      "memory-support-ygia",
      "sharpmind",
      "gingo-biloba",
      "pqq-liposomal-q10",
    ],
    predictedAsks: [
      "How do I take Lion's Mane?",
      "What's Sharp Mind for?",
      "More professional details",
    ],
  },
  {
    id: "heart",
    label: "heart and circulation",
    match:
      /\b(heart|circulat|blood pressure|cholesterol|triglycerides|cardio)\b/i,
    prefer: [
      "red-yeast-rice",
      "crateigus-hawthron-80-flavones-60-drcaps-x-500mg",
      "nattokinase-10-000-fu-high-potency-enzyme-formula",
      "q10-98-200-mg-♦-60-enteric-veg-caps-x-500mg-♦-amber-glass-bottles-♦-100-natural-♦-non-gmo-♦-gluten-dairy-free-♦-no-additives-copy-copy",
    ],
    predictedAsks: [
      "How do I take Red Yeast Rice?",
      "Something for cholesterol?",
      "Can I take it with medicine?",
    ],
  },
  {
    id: "detox",
    label: "detox and liver support",
    match: /\b(detox|liver|cleanse|milk thistle|hangover)\b/i,
    prefer: ["milk-thistle", "chanca-piedra-500-mg", "glutathione-synergy-complex-nbsp-aντιοξειδωτική-άμυνα-και-κυτταρική-ενέργεια"],
    predictedAsks: [
      "How do I take Milk Thistle?",
      "Is this for after alcohol?",
      "What's the dosage?",
    ],
  },
  {
    id: "allergies",
    label: "seasonal allergies",
    match: /\b(allerg(y|ies)|hay fever|pollen|sneezing|allergic rhinitis)\b/i,
    prefer: ["vitamin-c", "olive-leaf-20-oleuropein", "rock-rose"],
    predictedAsks: [
      "What helps with hay fever?",
      "How do I take Olive Leaf?",
    ],
  },
  {
    id: "aging",
    label: "feeling younger and healthy aging",
    match:
      /\b(anti[- ]?aging|longevity|aging|feel(ing)? younger|younger again|youthful)\b/i,
    prefer: [
      "nad-longetivity-60-drcaps",
      "pure-98-trans-reservatrol-60-drcaps",
      "trans-reservatrol-98-with-grape-seed-and-wine-extracts",
      "pqq-liposomal-q10",
    ],
    predictedAsks: [
      "More details on NAD",
      "What's Resveratrol for?",
      "How do I take it?",
    ],
  },
  {
    id: "urinary",
    label: "urinary support",
    match: /\b(urinat|bladder|uti|urinary|kidney stones?|pee(ing)? (a lot|often|night))\b/i,
    prefer: ["chanca-piedra-500-mg", "olive-leaf-20-oleuropein"],
    avoid: ["alfalfa-may-help-lower-cholesterol", "chaga-mushroom-ygia"],
    predictedAsks: [
      "How do I take Chanca Piedra?",
      "Is this for kidney stones?",
    ],
  },
];

function pageHandle(p: PageEntry): string {
  return p.url.replace(/^\/products\//, "").toLowerCase();
}

/** Playbook rows that match this question (or profile text). */
export function matchPlaybook(text: string): PlaybookEntry[] {
  const q = text.trim();
  if (!q) return [];
  return SYMPTOM_PLAYBOOK.filter((e) => e.match.test(q));
}

function handleMatches(handle: string, prefer: string): boolean {
  const h = handle.toLowerCase();
  const p = prefer.toLowerCase();
  return h === p || h.startsWith(p) || (p.length >= 10 && h.includes(p.slice(0, 18)));
}

/** Extra score from curated prefer/avoid lists. */
export function playbookScoreBonus(
  question: string,
  need: string,
  p: PageEntry,
): number {
  if (!p.url.startsWith("/products/")) return 0;
  const handle = pageHandle(p);
  const entries = matchPlaybook(`${question} ${need}`);
  if (!entries.length) return 0;
  let bonus = 0;
  // Prefer the first matched problem (strongest signal)
  const primary = entries[0]!;
  const prefIdx = primary.prefer.findIndex((h) => handleMatches(handle, h));
  if (prefIdx === 0) bonus += 2.4;
  else if (prefIdx === 1) bonus += 1.5;
  else if (prefIdx === 2) bonus += 1.0;
  else if (prefIdx > 2) bonus += 0.55;
  if (primary.avoid?.some((h) => handleMatches(handle, h))) bonus -= 1.3;
  return bonus;
}

/** Problems inferred from a client profile card. */
export function problemsFromProfile(profile: ClientProfile | null | undefined): PlaybookEntry[] {
  if (!profile) return [];
  const blob = [
    ...(profile.goals ?? []),
    profile.notes ?? "",
    ...(profile.productsUsing ?? []),
  ].join(" ");
  return matchPlaybook(blob);
}

/** Likely next questions for this call (profile + current need). */
export function predictedAsksFor(
  profile: ClientProfile | null | undefined,
  question: string,
  suggestedTitles: string[] = [],
): string[] {
  const fromQ = matchPlaybook(question);
  const fromP = problemsFromProfile(profile);
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (s: string) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(s);
  };

  for (const e of [...fromQ, ...fromP]) {
    for (const a of e.predictedAsks) push(a);
  }

  // Product-specific follow-ups from what we just offered
  for (const title of suggestedTitles.slice(0, 2)) {
    const short = title.split(/♦| – | — | - \d/)[0]?.trim();
    if (short && short.length >= 4) {
      push(`More details on ${short}`);
      push(`How do I take ${short}?`);
    }
  }

  // Profile-led openers when they haven't named a problem yet
  if (!fromQ.length && fromP.length) {
    for (const e of fromP.slice(0, 2)) {
      push(`Something for ${e.label}`);
    }
  }

  return out.slice(0, 6);
}

/** Expand a vague ask with profile goals so situation ranking can run. */
export function enrichQuestionWithProfile(
  question: string,
  profile: ClientProfile | null | undefined,
): string {
  if (!profile) return question;
  const problems = problemsFromProfile(profile);
  if (!problems.length && !profile.goals?.length) return question;
  // Only the top profile problem drives ranking (others stay in predicted asks)
  const lead = problems[0]?.label || profile.goals?.[0] || "";
  return `${question} ${lead}`.trim();
}

/** True when the client is asking generically (use profile to lead). */
export function isVaguePersonalAsk(question: string): boolean {
  return /\b(what should i (take|use)|help me|for me|my usual|based on my|what do you (suggest|recommend)|i('?m| am) not sure|where do i start|good (morning|afternoon|evening))\b/i.test(
    question,
  );
}
