import { readSecretsSync } from "./secrets";

export function getEnv() {
  const secrets = readSecretsSync();
  return {
    /** Required for full AI answers (NVIDIA NIM) */
    nvidiaApiKey: secrets.nvidiaApiKey || process.env.NVIDIA_API_KEY || "",
    nvidiaBaseUrl:
      process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
    nvidiaModel:
      process.env.NVIDIA_MODEL ?? "nvidia/nemotron-3.5-super-vl-120b-a12b",
    /** Settings UI / data/secrets.json wins over .env */
    fishApiKey: secrets.fishApiKey || process.env.FISH_API_KEY || "",
    fishReferenceId: process.env.FISH_REFERENCE_ID ?? "",
    fishTtsModel: process.env.FISH_TTS_MODEL ?? "s2.1-pro-free",
    ttsProvider: (process.env.TTS_PROVIDER ?? "edge").toLowerCase(),
    edgeVoiceEl: process.env.EDGE_VOICE_EL ?? "",
    edgeVoiceEn: process.env.EDGE_VOICE_EN ?? "",
    adminSecret: process.env.ADMIN_SECRET ?? "change-me",
    siteBaseUrl:
      process.env.SITE_BASE_URL ?? "https://ygianaturalhealth.com",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    demoMode: (process.env.DEMO_MODE ?? "false").toLowerCase() === "true",
  };
}

export function assertAdmin(authHeader: string | null): boolean {
  const { adminSecret } = getEnv();
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token === adminSecret;
}
