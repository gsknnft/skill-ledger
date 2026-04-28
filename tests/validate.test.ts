import { describe, expect, it } from "vitest";
import { validateManifest } from "../src/commands/validate.js";
import type { SkillLedgerManifest } from "../src/types.js";

const validManifest: SkillLedgerManifest = {
  version: "skill-ledger.manifest.v1",
  skills: [
    {
      id: "alpha",
      source: "file:skills/alpha/SKILL.md",
      resolvedUrl: null,
      scope: "workspace",
      installedAt: "2026-04-27T00:00:00.000Z",
      integrity: `sha256-${"a".repeat(64)}`,
      scanner: { name: "skill-ledger", version: "0.1.0", reportVersion: "unverified" },
      scan: {
        safeToInstall: false,
        recommendedAction: "review",
        severity: "caution",
        riskScore: 0,
        flagCount: 0,
        categories: {},
        mappings: { owasp: [], mitreAtlas: [], nistAiRmf: [] },
      },
    },
  ],
};

describe("validateManifest", () => {
  it("accepts a valid manifest", () => {
    expect(validateManifest(validManifest)).toEqual({ valid: true, issues: [] });
  });

  it("reports invalid integrity and duplicate IDs", () => {
    const manifest: SkillLedgerManifest = {
      ...validManifest,
      skills: [
        { ...validManifest.skills[0], integrity: "sha256-abc" },
        { ...validManifest.skills[0], source: "file:skills/beta/SKILL.md" },
      ],
    };

    const result = validateManifest(manifest);
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.path)).toContain("skills[0].integrity");
    expect(result.issues.map((issue) => issue.path)).toContain("skills[1].id");
  });
});
