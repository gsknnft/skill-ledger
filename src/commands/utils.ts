import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import { SkillLedgerManifest } from "../types.js";

export function parseIntegrity(integrity: string) {
  // support "sha256-<hex>" or "sha256:<hex>"
  const m = integrity.match(/sha256[-:]?([0-9a-fA-F]+)/);
  return m ? m[1].toLowerCase() : null;
}

export async function fetchRemoteContent(
  url: string,
  token?: string,
  fetcher: typeof fetch = fetch,
) {
  const headers: Record<string, string> = {
    "User-Agent": "skill-registry-doctor",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetcher(url, { headers });
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    status: response.status,
    data: bytes,
    headers: Object.fromEntries(response.headers.entries()),
  };
}

export function sha256Hex(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function loadManifest(path: string): Promise<SkillLedgerManifest> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as SkillLedgerManifest;
}
