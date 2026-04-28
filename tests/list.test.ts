import { describe, expect, it } from "vitest";
import {
  formatManifest,
  formatManifestMarkdown,
  formatManifestTable,
} from "../src/commands/list.js";
import type { SkillLedgerManifest } from "../src/types.js";

const manifest: SkillLedgerManifest = {
  version: "skill-ledger.manifest.v1",
  generatedAt: "2026-04-27T00:00:00.000Z",
  sourceId: "test",
  skills: [
    {
      id: "alpha",
      name: "Alpha",
      source: "file:skills/alpha/SKILL.md",
      resolvedUrl: null,
      scope: "workspace",
      installedAt: "2026-04-27T00:00:00.000Z",
      integrity: "sha256-abc",
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

describe("manifest list formatters", () => {
  it("formats a table", () => {
    const table = formatManifestTable(manifest);
    expect(table).toContain("alpha");
    expect(table).toContain("review");
  });

  it("formats markdown", () => {
    const markdown = formatManifestMarkdown(manifest);
    expect(markdown).toContain("# Skill Ledger");
    expect(markdown).toContain("| alpha | Alpha | workspace | review | 0 |");
  });

  it("formats json through the generic formatter", () => {
    expect(JSON.parse(formatManifest(manifest, "json"))).toMatchObject({
      version: "skill-ledger.manifest.v1",
      skills: [{ id: "alpha" }],
    });
  });
});
