#!/usr/bin/env node
import { basename } from "node:path";
import { computeDoctorSummary } from "./commands/doctor.js";
import { loadManifest } from "./commands/utils.js";

async function run() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`skill-ledger-doctor

Usage:
  skill-ledger-doctor [manifest.json] [--check-remote] [--json]

Options:
  --check-remote  Fetch resolvedUrl values and compare SHA-256 integrity.
  --json          Print JSON instead of a human summary.
  --help          Show this help.
`);
    return;
  }

  const manifestPath = args.find((arg) => !arg.startsWith("--")) ?? "./manifest.json";
  const checkRemote = args.includes("--check-remote");
  const json = args.includes("--json");
  const githubToken = process.env.GITHUB_TOKEN;

  try {
    const manifest = await loadManifest(manifestPath);
    const summary = await computeDoctorSummary(manifest, {
      checkRemote,
      githubToken,
    });

    if (json) {
      console.log(JSON.stringify(summary, null, 2));
      process.exitCode = summary.blocked > 0 ? 1 : 0;
      return;
    }

    // Human summary
    console.log(`${basename(manifestPath)} doctor summary`);
    console.log(`Total skills: ${summary.total}`);
    console.log(
      `Global: ${summary.byScope.global}  Repo: ${summary.byScope.repo}  Workspace: ${summary.byScope.workspace}`,
    );
    console.log(`Duplicates: ${summary.duplicates}`);
    console.log(`Needs review: ${summary.needsReview}`);
    console.log(`Blocked by skill-safe: ${summary.blocked}`);
    console.log(`Changed since install: ${summary.changedSinceInstall}`);
    console.log(`Missing SKILL.md: ${summary.missingSkillMd}`);

    // Optionally print duplicate groups
    if (summary.duplicateGroups.length) {
      console.log("\nDuplicate groups:");
      for (const g of summary.duplicateGroups) {
        console.log(`- ${g.key}: ${g.ids.join(", ")}`);
      }
    }

    // Exit code policy: nonzero if blocked > 0
    process.exitCode = summary.blocked > 0 ? 1 : 0;
  } catch (err) {
    console.error(
      "doctor error:",
      err instanceof Error ? err.message : String(err),
    );
    process.exitCode = 2;
  }
}

run();
