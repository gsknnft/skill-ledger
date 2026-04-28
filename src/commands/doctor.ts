// src/doctor.ts
import type { SkillLedgerManifest, DoctorSummary, SkillLedgerEntry, DoctorOptions } from "../types.js";
import { fetchRemoteContent, sha256Hex, parseIntegrity } from "./utils.js";

export async function computeDoctorSummary(
  manifest: SkillLedgerManifest,
  opts?: DoctorOptions,
): Promise<DoctorSummary> {
  const skills = manifest.skills ?? [];
  const total = skills.length;
  const byScope = { global: 0, repo: 0, workspace: 0 };
  for (const s of skills) byScope[s.scope] = (byScope[s.scope] ?? 0) + 1;

  // duplicates by canonical id or resolvedUrl
  const byId = new Map<string, SkillLedgerEntry[]>();
  const byResolved = new Map<string, SkillLedgerEntry[]>();
  for (const s of skills) {
    byId.set(s.id, (byId.get(s.id) ?? []).concat(s));
    if (s.resolvedUrl)
      byResolved.set(
        s.resolvedUrl,
        (byResolved.get(s.resolvedUrl) ?? []).concat(s),
      );
  }
  const duplicateGroups: { key: string; ids: string[] }[] = [];
  for (const [k, arr] of byResolved.entries()) {
    if (arr.length > 1)
      duplicateGroups.push({ key: k, ids: arr.map((x) => x.id) });
  }
  for (const [k, arr] of byId.entries()) {
    if (arr.length > 1)
      duplicateGroups.push({ key: k, ids: arr.map((x) => x.id) });
  }
  const duplicates = duplicateGroups.reduce(
    (acc, g) => acc + Math.max(0, g.ids.length - 1),
    0,
  );

  // counts for review/block
  let needsReview = 0;
  let blocked = 0;
  for (const s of skills) {
    if (s.scan?.recommendedAction === "review") needsReview++;
    if (s.scan?.recommendedAction === "block") blocked++;
  }

  // remote checks (optional)
  let changedSinceInstall: number | "unknown" = "unknown";
  let missingSkillMd: number | "unknown" = "unknown";

  if (opts?.checkRemote) {
    let changed = 0;
    let missing = 0;
    for (const s of skills) {
      if (!s.resolvedUrl) {
        missing++;
        continue;
      }
      try {
        const { status, data } = await fetchRemoteContent(
          s.resolvedUrl,
          opts.githubToken,
          opts.fetcher,
        );
        if (status === 200 && data) {
          const remoteHash = sha256Hex(Buffer.isBuffer(data) ? data : Buffer.from(data));
          const localHash = parseIntegrity(s.integrity);
          if (localHash && remoteHash !== localHash) changed++;
        } else {
          missing++;
        }
      } catch {
        missing++;
      }
    }
    changedSinceInstall = changed;
    missingSkillMd = missing;
  }

  return {
    total,
    byScope,
    duplicates,
    duplicateGroups,
    changedSinceInstall,
    missingSkillMd,
    needsReview,
    blocked,
  };
}
