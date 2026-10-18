export type PageSection = {
  id: string;
  title: string;
  text: string;
};

export type PageEntry = {
  id: string;
  url: string;
  title: string;
  description: string;
  hash?: string;
  keywords?: string[];
  /** Shopify product image URL */
  image?: string;
  /** Full text captured by the embed scanner */
  content?: string;
  sections?: PageSection[];
  scannedAt?: string;
};

export type QaEntry = {
  id: string;
  question: string;
  answer: string;
  product?: string;
  tags?: string[];
};

export type KnowledgeChunk = {
  id: string;
  type: "qa" | "page" | "snippet";
  title: string;
  text: string;
  url?: string;
  hash?: string;
  embedding: number[];
  meta?: Record<string, string>;
};

export type KnowledgeStore = {
  version: number;
  updatedAt: string;
  pages: PageEntry[];
  faqs: QaEntry[];
  chunks: KnowledgeChunk[];
  settings: AssistantSettings;
};

export type AssistantSettings = {
  welcomeMessage: string;
  /** Greek Fish voice reference_id (default) */
  fishReferenceId: string;
  /** English Fish voice reference_id */
  fishReferenceIdEn: string;
  siteBaseUrl: string;
};

export type NavigationTarget = {
  url: string;
  hash?: string;
  label: string;
  image?: string;
  /** Spoken/UI choice letter so the customer can say “option B” */
  choice?: "A" | "B" | "C";
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Owner-managed client profile for personalized advice. */
export type ClientProfile = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  /** Goals / situations: sleep, stress, drive, joints… */
  goals?: string[];
  /** Product titles or handles they already use */
  productsUsing?: string[];
  /** Free-text notes from the store owner */
  notes?: string;
  updatedAt: string;
};

export type ChatResponse = {
  answer: string;
  navigation: NavigationTarget | null;
  /** Shopify product/collection links to show when a product is suggested */
  listings?: NavigationTarget[];
  language?: "el" | "en";
  sources?: Array<{ title: string; url?: string }>;
  /** Profile used for this reply, if any */
  profile?: { id: string; name: string } | null;
  /** Predicted next questions (from symptom playbook + profile card) */
  suggestedPrompts?: string[];
};

/** Payload sent by the embed widget after reading the host page. */
export type PageScanPayload = {
  url: string;
  title: string;
  description?: string;
  content: string;
  keywords?: string[];
  sections?: PageSection[];
  links?: Array<{ url: string; title: string; description?: string }>;
};
