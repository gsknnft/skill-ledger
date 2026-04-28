import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  buildManifestFromDirectories,
  discoverSkillFiles,
} from "../src/commands/add.js";

describe("buildManifestFromDirectories", () => {
  it("discovers SKILL.md files and builds unverified ledger entries", async () => {
    const root = await mkdtemp(join(tmpdir(), "skill-ledger-"));
    try {
      await mkdir(join(root, "skills", "alpha"), { recursive: true });
      await mkdir(join(root, "skills", "beta"), { recursive: true });
      await writeFile(
        join(root, "skills", "alpha", "SKILL.md"),
        "---\nname: Alpha Skill\n---\n# Alpha\n",
      );
      await writeFile(join(root, "skills", "beta", "skill.md"), "# Beta\n");

      const files = await discoverSkillFiles(["skills"], { rootDir: root });
      expect(files.map((file) => file.relativePath)).toEqual([
        "skills/alpha/SKILL.md",
        "skills/beta/skill.md",
      ]);

      const manifest = await buildManifestFromDirectories(["skills"], {
        rootDir: root,
        sourceId: "test",
        now: "2026-04-27T00:00:00.000Z",
      });

      expect(manifest.version).toBe("skill-ledger.manifest.v1");
      expect(manifest.sourceId).toBe("test");
      expect(manifest.skills).toHaveLength(2);
      expect(manifest.skills[0]).toMatchObject({
        name: "Alpha Skill",
        scope: "workspace",
        scanner: { name: "skill-ledger", reportVersion: "unverified" },
        scan: { recommendedAction: "review", severity: "caution" },
      });
      expect(manifest.skills[0].integrity).toMatch(/^sha256-[0-9a-f]{64}$/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("can enrich discovered skills with an injected verifier", async () => {
    const root = await mkdtemp(join(tmpdir(), "skill-ledger-"));
    try {
      await mkdir(join(root, "skills", "alpha"), { recursive: true });
      await writeFile(join(root, "skills", "alpha", "SKILL.md"), "# Alpha\n");

      const manifest = await buildManifestFromDirectories(["skills"], {
        rootDir: root,
        now: "2026-04-27T00:00:00.000Z",
        verifier: {
          verify(discovery) {
            expect(discovery.relativePath).toBe("skills/alpha/SKILL.md");
            return {
              scanner: {
                name: "@gsknnft/skill-safe",
                version: "0.3.0",
                reportVersion: "skill-safe.report.v1",
              },
              scan: {
                safeToInstall: true,
                recommendedAction: "allow",
                severity: "safe",
                riskScore: 0,
                flagCount: 0,
                categories: {},
                mappings: { owasp: [], mitreAtlas: [], nistAiRmf: [] },
              },
            };
          },
        },
      });

      expect(manifest.skills[0]).toMatchObject({
        scanner: { name: "@gsknnft/skill-safe" },
        scan: { safeToInstall: true, recommendedAction: "allow" },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
