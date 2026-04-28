import { describe, expect, it } from "vitest";
import { ManifestBuilder } from "../src/registry/manifester.js";
import type { SkillLedgerEntry } from "../src/types.js";

const entry = (id: string, scope: SkillLedgerEntry["scope"]): SkillLedgerEntry => ({
  id,
  source: `github:owner/${id}`,
  resolvedUrl: `https://example.com/${id}/SKILL.md`,
  scope,
  installedAt: "2026-04-27T00:00:00.000Z",
  integrity: "sha256-abc",
  scanner: { name: "skill-safe", version: "0.3.0", reportVersion: "skill-safe.report.v1" },
  scan: {
    safeToInstall: true,
    recommendedAction: "allow",
    severity: "safe",
    riskScore: 0,
    flagCount: 0,
    categories: {},
    mappings: { owasp: [], mitreAtlas: [], nistAiRmf: [] },
  },
});

describe("ManifestBuilder", () => {
  it("builds a versioned manifest", () => {
    const builder = new ManifestBuilder([entry("one", "global")]);
    expect(builder.buildManifest()).toMatchObject({
      version: "skill-ledger.manifest.v1",
      skills: [{ id: "one" }],
    });
  });

  it("summarizes duplicate groups", () => {
    const duplicate = entry("one", "repo");
    duplicate.resolvedUrl = "https://example.com/one/SKILL.md";
    const builder = new ManifestBuilder([entry("one", "global"), duplicate]);

    const summary = builder.summarize();

    expect(summary.total).toBe(2);
    expect(summary.byScope).toMatchObject({ global: 1, repo: 1 });
    expect(summary.duplicates).toBe(2);
    expect(summary.duplicateGroups.map((group) => group.key)).toEqual([
      "id:one",
      "resolved:https://example.com/one/SKILL.md",
    ]);
  });
});
