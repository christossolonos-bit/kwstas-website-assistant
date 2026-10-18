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
  fishReferenceId: string;
  siteBaseUrl: string;
};

export type NavigationTarget = {
  url: string;
  hash?: string;
  label: string;
};

export type ChatResponse = {
  answer: string;
  navigation: NavigationTarget | null;
  language?: "el" | "en";
  sources?: Array<{ title: string; url?: string }>;
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
