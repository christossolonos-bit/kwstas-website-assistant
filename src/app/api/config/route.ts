import { json, optionsOk } from "@/lib/http";
import { loadStore } from "@/lib/rag/store";

export async function OPTIONS() {
  return optionsOk();
}

/** Public widget bootstrap config (no secrets). */
export async function GET() {
  const store = await loadStore();
  return json({
    welcomeMessage: store.settings.welcomeMessage,
    siteBaseUrl: store.settings.siteBaseUrl,
    supportedLanguages: ["el", "en"],
    defaultLanguage: "el",
  });
}
