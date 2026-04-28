import { describe, expect, it } from "vitest";
import { computeDoctorSummary } from "../src/commands/doctor.js";
import type { SkillLedgerManifest } from "../src/types.js";

const manifest: SkillLedgerManifest = {
  version: "skill-ledger.manifest.v1",
  skills: [
    {
      id: "safe-global",
      source: "github:owner/safe",
      resolvedUrl: "https://example.com/safe/SKILL.md",
      scope: "global",
      installedAt: "2026-04-27T00:00:00.000Z",
      integrity: "sha256-2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
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
    },
    {
      id: "review-repo",
      source: "github:owner/review",
      resolvedUrl: "https://example.com/review/SKILL.md",
      scope: "repo",
      installedAt: "2026-04-27T00:00:00.000Z",
      integrity: "sha256-0000000000000000000000000000000000000000000000000000000000000000",
      scanner: { name: "skill-safe", version: "0.3.0", reportVersion: "skill-safe.report.v1" },
      scan: {
        safeToInstall: true,
        recommendedAction: "review",
        severity: "caution",
        riskScore: 12,
        flagCount: 1,
        categories: { "hidden-content": 1 },
        mappings: { owasp: [], mitreAtlas: [], nistAiRmf: [] },
      },
    },
    {
      id: "review-repo",
      source: "github:owner/block",
      resolvedUrl: "https://example.com/review/SKILL.md",
      scope: "workspace",
      installedAt: "2026-04-27T00:00:00.000Z",
      integrity: "sha256-0000000000000000000000000000000000000000000000000000000000000000",
      scanner: { name: "skill-safe", version: "0.3.0", reportVersion: "skill-safe.report.v1" },
      scan: {
        safeToInstall: false,
        recommendedAction: "block",
        severity: "danger",
        riskScore: 100,
        flagCount: 3,
        categories: { "prompt-injection": 2, "data-exfiltration": 1 },
        mappings: { owasp: [], mitreAtlas: [], nistAiRmf: [] },
      },
    },
  ],
};

describe("computeDoctorSummary", () => {
  it("summarizes scope, review, block, and duplicates without network", async () => {
    const summary = await computeDoctorSummary(manifest);

    expect(summary.total).toBe(3);
    expect(summary.byScope).toEqual({ global: 1, repo: 1, workspace: 1 });
    expect(summary.needsReview).toBe(1);
    expect(summary.blocked).toBe(1);
    expect(summary.duplicates).toBe(2);
    expect(summary.duplicateGroups).toHaveLength(2);
    expect(summary.changedSinceInstall).toBe("unknown");
    expect(summary.missingSkillMd).toBe("unknown");
  });

  it("checks remote integrity when requested", async () => {
    const fetcher: typeof fetch = async (input) => {
      if (String(input).includes("safe")) {
        return new Response("hello", { status: 200 });
      }
      if (String(input).includes("review")) {
        return new Response("changed", { status: 200 });
      }
      return new Response("missing", { status: 404 });
    };

    const summary = await computeDoctorSummary(manifest, {
      checkRemote: true,
      fetcher,
    });

    expect(summary.changedSinceInstall).toBe(2);
    expect(summary.missingSkillMd).toBe(0);
  });
});
