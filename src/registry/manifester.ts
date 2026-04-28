import {
  SkillLedgerEntry,
  SkillLedgerManifest,
  ManifestSummary,
} from "../types.js";
import { fetchRemoteContent as fetchRemoteContentUtil } from "../commands/utils.js";

export class ManifestBuilder {
  constructor(public entries: SkillLedgerEntry[]) {}

  buildManifest(): SkillLedgerManifest {
    return {
      version: "skill-ledger.manifest.v1",
      generatedAt: new Date().toISOString(),
      skills: this.entries,
    };
  }

  summarize(): ManifestSummary {
    const total = this.entries.length;
    const byScope: Record<string, number> = {};
    for (const s of this.entries)
      byScope[s.scope] = (byScope[s.scope] ?? 0) + 1;
    const byId = new Map<string, SkillLedgerEntry[]>();
    const byResolved = new Map<string, SkillLedgerEntry[]>();
    for (const s of this.entries) {
      byId.set(s.id, (byId.get(s.id) ?? []).concat(s));
      if (s.resolvedUrl)
        byResolved.set(
          s.resolvedUrl,
          (byResolved.get(s.resolvedUrl) ?? []).concat(s),
        );
    }
    const duplicateGroups = [
      ...[...byId.entries()]
        .filter(([_, arr]) => arr.length > 1)
        .map(([key, arr]) => ({
          key: `id:${key}`,
          ids: arr.map((x) => x.id),
        })),
      ...[...byResolved.entries()]
        .filter(([_, arr]) => arr.length > 1)
        .map(([key, arr]) => ({
          key: `resolved:${key}`,
          ids: arr.map((x) => x.id),
        })),
    ];
    const needsReview = this.entries.filter(
      (entry) => entry.scan?.recommendedAction === "review",
    ).length;
    const blocked = this.entries.filter(
      (entry) => entry.scan?.recommendedAction === "block",
    ).length;

    return {
      total,
      byScope,
      duplicates: duplicateGroups.length,
      duplicateGroups,
      changedSinceInstall: "unknown",
      missingSkillMd: "unknown",
      needsReview,
      blocked,
    };
  }

  async fetchRemoteContent(
    url: string,
    githubToken?: string,
  ): Promise<{ status: number; data: string }> {
    const response = await fetchRemoteContentUtil(url, githubToken);
    return { status: response.status, data: response.data.toString("utf8") };
  }
}
