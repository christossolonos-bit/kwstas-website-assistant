import { randomUUID } from "crypto";
import { rebuildIndex } from "../src/lib/rag/ingest";
import { loadStore, saveStore } from "../src/lib/rag/store";
import type { PageEntry, QaEntry } from "../src/lib/types";

async function main() {
  process.env.DEMO_MODE = process.env.DEMO_MODE ?? "true";

  const pages: PageEntry[] = [
    {
      id: randomUUID(),
      url: "/demo",
      title: "Home / Αρχική",
      description:
        "Lumina Skin demo storefront home with featured products. Αρχική σελίδα με προτεινόμενα προϊόντα.",
      keywords: ["home", "shop", "skincare", "αρχική", "κατάστημα"],
    },
    {
      id: randomUUID(),
      url: "/demo/products/hydra-glow-serum",
      title: "Hydra Glow Serum",
      description:
        "Lightweight hydrating serum for dry and dehydrated skin. Fragrance-free. Ελαφρύς ενυδατικός ορός για ξηρό δέρμα, χωρίς άρωμα.",
      hash: "#how-to-use",
      keywords: [
        "serum",
        "dry skin",
        "hydration",
        "hyaluronic",
        "ορός",
        "ξηρό δέρμα",
        "ενυδάτωση",
      ],
    },
    {
      id: randomUUID(),
      url: "/demo/products/night-repair-cream",
      title: "Night Repair Cream",
      description:
        "Overnight recovery cream for fine lines and barrier repair. Κρέμα νύχτας για ρυτίδες και αποκατάσταση φραγμού.",
      hash: "#ingredients",
      keywords: [
        "night cream",
        "wrinkles",
        "repair",
        "κρέμα νύχτας",
        "ρυτίδες",
      ],
    },
    {
      id: randomUUID(),
      url: "/demo/shipping",
      title: "Shipping & Returns / Αποστολές",
      description:
        "Shipping times, costs, and 30-day free returns. Χρόνοι αποστολής και δωρεάν επιστροφές 30 ημερών.",
      hash: "#returns",
      keywords: [
        "shipping",
        "delivery",
        "returns",
        "αποστολές",
        "παράδοση",
        "επιστροφές",
      ],
    },
    {
      id: randomUUID(),
      url: "/demo/about",
      title: "About Lumina Skin / Σχετικά",
      description:
        "Our brand story and clean formula philosophy. Η ιστορία της μάρκας μας.",
      keywords: ["about", "brand", "company", "σχετικά", "εταιρεία", "μάρκα"],
    },
  ];

  const faqs: QaEntry[] = [
    {
      id: randomUUID(),
      question: "What is best for dry skin?",
      answer:
        "Start with Hydra Glow Serum morning and night under moisturizer. It uses multi-weight hyaluronic acid without fragrance.",
      product: "Hydra Glow Serum",
      tags: ["dry skin", "serum"],
    },
    {
      id: randomUUID(),
      question: "Τι είναι καλύτερο για ξηρό δέρμα;",
      answer:
        "Ξεκινήστε με τον ορό Hydra Glow Serum πρωί και βράδυ κάτω από την κρέμα. Χρησιμοποιεί υαλουρονικό οξύ πολλαπλών μοριακών βαρών, χωρίς άρωμα.",
      product: "Hydra Glow Serum",
      tags: ["ξηρό δέρμα", "ορός", "dry skin"],
    },
    {
      id: randomUUID(),
      question: "Is the serum fragrance-free?",
      answer:
        "Yes. Hydra Glow Serum is fragrance-free and suitable for sensitive skin.",
      product: "Hydra Glow Serum",
      tags: ["fragrance", "sensitive"],
    },
    {
      id: randomUUID(),
      question: "Ο ορός έχει άρωμα;",
      answer:
        "Όχι. Ο Hydra Glow Serum είναι χωρίς άρωμα και κατάλληλος για ευαίσθητο δέρμα.",
      product: "Hydra Glow Serum",
      tags: ["άρωμα", "ευαίσθητο"],
    },
    {
      id: randomUUID(),
      question: "How do I use the night cream?",
      answer:
        "After cleansing, apply a pea-sized amount of Night Repair Cream to face and neck. Use only at night.",
      product: "Night Repair Cream",
      tags: ["usage", "night"],
    },
    {
      id: randomUUID(),
      question: "Πώς χρησιμοποιώ την κρέμα νύχτας;",
      answer:
        "Μετά τον καθαρισμό, απλώστε ποσότητα όσο ένα μπιζέλι της Night Repair Cream σε πρόσωπο και λαιμό. Μόνο το βράδυ.",
      product: "Night Repair Cream",
      tags: ["χρήση", "νύχτα"],
    },
    {
      id: randomUUID(),
      question: "Do you ship internationally?",
      answer:
        "We ship to most countries within 2–7 business days. Duties may apply outside the EU.",
      tags: ["shipping"],
    },
    {
      id: randomUUID(),
      question: "Κάνετε αποστολές στο εξωτερικό;",
      answer:
        "Ναι, στέλνουμε στις περισσότερες χώρες σε 2–7 εργάσιμες ημέρες. Εκτός ΕΕ ενδέχεται να ισχύουν δασμοί.",
      tags: ["αποστολές"],
    },
    {
      id: randomUUID(),
      question: "What is your return policy?",
      answer:
        "Unused products can be returned within 30 days for a full refund. Opened items get store credit.",
      tags: ["returns"],
    },
    {
      id: randomUUID(),
      question: "Ποια είναι η πολιτική επιστροφών;",
      answer:
        "Αχρησιμοποίητα προϊόντα επιστρέφονται εντός 30 ημερών με πλήρη επιστροφή χρημάτων. Ανοιχτά προϊόντα παίρνουν πίστωση καταστήματος.",
      tags: ["επιστροφές"],
    },
    {
      id: randomUUID(),
      question: "Is Night Repair Cream good for wrinkles?",
      answer:
        "Yes. It is formulated to support overnight barrier repair and soften the look of fine lines.",
      product: "Night Repair Cream",
      tags: ["wrinkles"],
    },
    {
      id: randomUUID(),
      question: "Βοηθάει η Night Repair Cream στις ρυτίδες;",
      answer:
        "Ναι. Είναι σχεδιασμένη για overnight αποκατάσταση του φραγμού και μαλάκωμα λεπτών γραμμών.",
      product: "Night Repair Cream",
      tags: ["ρυτίδες"],
    },
    {
      id: randomUUID(),
      question: "When will my order arrive?",
      answer:
        "Orders ship within 2 business days. Delivery is usually 2–5 days locally, or 2–7 days internationally. I can open the shipping page for details.",
      tags: ["order", "shipping", "delivery"],
    },
    {
      id: randomUUID(),
      question: "Πότε θα έρθει η παραγγελία μου;",
      answer:
        "Στέλνουμε εντός 2 εργάσιμων ημερών. Τοπικά συνήθως 2–5 ημέρες, στο εξωτερικό 2–7. Μπορώ να σας ανοίξω τη σελίδα αποστολών.",
      tags: ["παραγγελία", "αποστολές"],
    },
    {
      id: randomUUID(),
      question: "Can I talk to a person / call you?",
      answer:
        "For the usual questions I can help you here right away. For an urgent order issue, email support with your order number and we will call you back.",
      tags: ["phone", "call", "contact"],
    },
    {
      id: randomUUID(),
      question: "Μπορώ να μιλήσω με κάποιον στο τηλέφωνο;",
      answer:
        "Για τα συνηθισμένα θέματα μπορώ να σας βοηθήσω αμέσως εδώ. Για επείγον θέμα παραγγελίας στείλτε email με τον αριθμό παραγγελίας και θα σας καλέσουμε.",
      tags: ["τηλέφωνο", "επικοινωνία"],
    },
    {
      id: randomUUID(),
      question: "Do you accept cash on delivery?",
      answer:
        "Yes, cash on delivery is available for local orders. Card payment is also accepted at checkout.",
      tags: ["payment", "cod"],
    },
    {
      id: randomUUID(),
      question: "Έχετε αντικαταβολή;",
      answer:
        "Ναι, η αντικαταβολή είναι διαθέσιμη για τοπικές παραγγελίες. Δέχεστε και κάρτα στο checkout.",
      tags: ["πληρωμή", "αντικαταβολή"],
    },
  ];

  const store = await loadStore();
  store.pages = pages;
  store.faqs = faqs;
  store.settings.welcomeMessage =
    "Γεια σας! Ρωτήστε με όπως θα ρωτούσατε στο τηλέφωνο — προϊόντα, αποστολές, επιστροφές. Hello! Ask me the same things you'd call about.";
  store.settings.siteBaseUrl =
    process.env.SITE_BASE_URL ?? "http://localhost:3000";
  await saveStore(store);
  const { chunkCount } = await rebuildIndex();
  console.log(
    `Seeded ${pages.length} pages, ${faqs.length} FAQs, ${chunkCount} chunks.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
