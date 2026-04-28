#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { buildManifestFromDirectories } from "./commands/add.js";
import { computeDoctorSummary } from "./commands/doctor.js";
import { formatManifest } from "./commands/list.js";
import { loadManifest } from "./commands/utils.js";
import { validateManifest } from "./commands/validate.js";
import type { BuildManifestScope, ManifestListFormat } from "./types.js";

function printHelp(): void {
  console.log(`skill-ledger

Usage:
  skill-ledger build <dir...> [--out manifest.json] [--scope workspace|repo|global] [--source-id id]
  skill-ledger list [manifest.json] [--json|--markdown]
  skill-ledger validate-manifest [manifest.json] [--json]
  skill-ledger doctor [manifest.json] [--check-remote] [--json]

Commands:
  build   Discover SKILL.md files and create a skill-ledger manifest.
  list    Print a reviewable skill inventory from a manifest.
  validate-manifest Check ledger schema and entry consistency, not skill safety.
  doctor  Summarize manifest health.
`);
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function readScope(args: string[]): BuildManifestScope {
  const scope = readOption(args, "--scope");
  if (scope === "global" || scope === "repo" || scope === "workspace") return scope;
  if (scope) throw new Error(`invalid --scope value: ${scope}`);
  return "workspace";
}

function readFormat(args: string[]): ManifestListFormat {
  if (args.includes("--json")) return "json";
  if (args.includes("--markdown")) return "markdown";
  return "table";
}

function positional(args: string[]): string[] {
  const values: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      if (arg === "--out" || arg === "--scope" || arg === "--source-id") i++;
      continue;
    }
    values.push(arg);
  }
  return values;
}

async function runBuild(args: string[]): Promise<void> {
  const dirs = positional(args);
  if (!dirs.length) throw new Error("build requires at least one directory or SKILL.md path");

  const manifest = await buildManifestFromDirectories(dirs, {
    scope: readScope(args),
    sourceId: readOption(args, "--source-id"),
  });

  const out = readOption(args, "--out");
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  if (out) {
    await writeFile(out, json, "utf8");
    console.log(`wrote ${out} (${manifest.skills.length} skills)`);
    return;
  }

  console.log(json);
}

async function runList(args: string[]): Promise<void> {
  const manifestPath = positional(args)[0] ?? "./manifest.json";
  const manifest = await loadManifest(manifestPath);
  console.log(formatManifest(manifest, readFormat(args)));
}

async function runDoctor(args: string[]): Promise<void> {
  const manifestPath = positional(args)[0] ?? "./manifest.json";
  const summary = await computeDoctorSummary(await loadManifest(manifestPath), {
    checkRemote: args.includes("--check-remote"),
    githubToken: process.env.GITHUB_TOKEN,
  });

  if (args.includes("--json")) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`${manifestPath} doctor summary`);
    console.log(`Total skills: ${summary.total}`);
    console.log(`Needs review: ${summary.needsReview}`);
    console.log(`Blocked: ${summary.blocked}`);
    console.log(`Duplicates: ${summary.duplicates}`);
  }

  process.exitCode = summary.blocked > 0 ? 1 : 0;
}

async function runValidate(args: string[]): Promise<void> {
  const manifestPath = positional(args)[0] ?? "./manifest.json";
  const result = validateManifest(await loadManifest(manifestPath));

  if (args.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.issues.length === 0) {
    console.log(`${manifestPath} manifest is valid`);
  } else {
    console.log(`${manifestPath} manifest validation ${result.valid ? "warnings" : "failed"}`);
    for (const item of result.issues) {
      console.log(`- ${item.severity.toUpperCase()} ${item.path}: ${item.message}`);
    }
  }

  process.exitCode = result.valid ? 0 : 1;
}

async function run(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "build") return runBuild(args);
  if (command === "list") return runList(args);
  if (command === "validate" || command === "validate-manifest") return runValidate(args);
  if (command === "doctor") return runDoctor(args);
  throw new Error(`unknown command: ${command}`);
}

run().catch((err) => {
  console.error("skill-ledger error:", err instanceof Error ? err.message : String(err));
  process.exitCode = 2;
});
