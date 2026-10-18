import { promises as fs } from "fs";
import { readFileSync, existsSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SECRETS_PATH = path.join(DATA_DIR, "secrets.json");

export type AppSecrets = {
  fishApiKey: string;
  nvidiaApiKey: string;
};

const emptySecrets = (): AppSecrets => ({
  fishApiKey: "",
  nvidiaApiKey: "",
});

/** Sync read for request-time env merging (cached briefly). */
let cache: { at: number; value: AppSecrets } | null = null;

export function readSecretsSync(): AppSecrets {
  const now = Date.now();
  if (cache && now - cache.at < 2000) return cache.value;
  try {
    if (!existsSync(SECRETS_PATH)) {
      cache = { at: now, value: emptySecrets() };
      return cache.value;
    }
    const parsed = JSON.parse(readFileSync(SECRETS_PATH, "utf8")) as Partial<AppSecrets>;
    const value: AppSecrets = {
      fishApiKey: String(parsed.fishApiKey ?? ""),
      nvidiaApiKey: String(parsed.nvidiaApiKey ?? ""),
    };
    cache = { at: now, value };
    return value;
  } catch {
    cache = { at: now, value: emptySecrets() };
    return cache.value;
  }
}

export async function updateSecrets(
  patch: Partial<AppSecrets>,
): Promise<AppSecrets> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const current = readSecretsSync();
  const next: AppSecrets = {
    fishApiKey:
      patch.fishApiKey !== undefined ? patch.fishApiKey.trim() : current.fishApiKey,
    nvidiaApiKey:
      patch.nvidiaApiKey !== undefined
        ? patch.nvidiaApiKey.trim()
        : current.nvidiaApiKey,
  };
  // Empty string in patch means "clear"; omit key to leave unchanged — handled above
  await fs.writeFile(SECRETS_PATH, JSON.stringify(next, null, 2), "utf8");
  cache = { at: Date.now(), value: next };
  return next;
}

export function maskSecret(value: string): {
  configured: boolean;
  hint: string;
} {
  const v = value.trim();
  if (!v) return { configured: false, hint: "" };
  if (v.length <= 8) return { configured: true, hint: "••••" };
  return { configured: true, hint: `••••${v.slice(-4)}` };
}
