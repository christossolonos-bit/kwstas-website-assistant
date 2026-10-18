import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { ClientProfile } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PROFILES_PATH = path.join(DATA_DIR, "profiles.json");

type ProfilesFile = {
  updatedAt: string;
  profiles: ClientProfile[];
};

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function emptyFile(): ProfilesFile {
  return { updatedAt: new Date().toISOString(), profiles: [] };
}

export async function loadProfiles(): Promise<ClientProfile[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(PROFILES_PATH, "utf8");
    const parsed = JSON.parse(raw) as ProfilesFile;
    return Array.isArray(parsed.profiles) ? parsed.profiles : [];
  } catch {
    return [];
  }
}

async function saveProfiles(profiles: ClientProfile[]): Promise<ClientProfile[]> {
  await ensureDataDir();
  const file: ProfilesFile = {
    updatedAt: new Date().toISOString(),
    profiles,
  };
  await fs.writeFile(PROFILES_PATH, JSON.stringify(file, null, 2), "utf8");
  return profiles;
}

function normPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export async function findProfile(opts: {
  id?: string;
  phone?: string;
  email?: string;
}): Promise<ClientProfile | null> {
  const profiles = await loadProfiles();
  if (opts.id) {
    return profiles.find((p) => p.id === opts.id) ?? null;
  }
  if (opts.phone) {
    const needle = normPhone(opts.phone);
    if (needle.length >= 6) {
      return (
        profiles.find((p) => p.phone && normPhone(p.phone).endsWith(needle.slice(-8))) ??
        null
      );
    }
  }
  if (opts.email) {
    const e = opts.email.trim().toLowerCase();
    return profiles.find((p) => p.email?.toLowerCase() === e) ?? null;
  }
  return null;
}

export async function upsertProfile(
  patch: Partial<ClientProfile> & { name: string },
): Promise<ClientProfile> {
  const profiles = await loadProfiles();
  const now = new Date().toISOString();
  if (patch.id) {
    const idx = profiles.findIndex((p) => p.id === patch.id);
    if (idx >= 0) {
      const next: ClientProfile = {
        ...profiles[idx]!,
        ...patch,
        name: patch.name.trim(),
        updatedAt: now,
      };
      profiles[idx] = next;
      await saveProfiles(profiles);
      return next;
    }
  }
  const created: ClientProfile = {
    id: randomUUID(),
    name: patch.name.trim(),
    phone: patch.phone?.trim() || undefined,
    email: patch.email?.trim() || undefined,
    goals: patch.goals ?? [],
    productsUsing: patch.productsUsing ?? [],
    notes: patch.notes?.trim() || undefined,
    updatedAt: now,
  };
  profiles.push(created);
  await saveProfiles(profiles);
  return created;
}

export async function deleteProfile(id: string): Promise<boolean> {
  const profiles = await loadProfiles();
  const next = profiles.filter((p) => p.id !== id);
  if (next.length === profiles.length) return false;
  await saveProfiles(next);
  return true;
}

export function profileContextBlock(profile: ClientProfile): string {
  const lines = [
    `Client: ${profile.name}`,
    profile.phone ? `Phone: ${profile.phone}` : "",
    profile.email ? `Email: ${profile.email}` : "",
    profile.goals?.length ? `Goals: ${profile.goals.join(", ")}` : "",
    profile.productsUsing?.length
      ? `Already using: ${profile.productsUsing.join(", ")}`
      : "",
    profile.notes ? `Owner notes: ${profile.notes}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}
