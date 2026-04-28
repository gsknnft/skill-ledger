import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import type {
  BuildManifestOptions,
  SkillDiscovery,
  SkillLedgerEntry,
  SkillLedgerManifest,
  SkillLedgerVerifierResult,
} from "../types.js";

const SKILL_FILE_NAMES = new Set(["SKILL.md", "skill.md"]);

function normalizePath(path: string): string {
  return path.split(sep).join("/");
}

function sha256Hex(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/\/?skill\.md$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractFrontmatterName(content: string): string | undefined {
  if (!content.startsWith("---")) return undefined;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return undefined;
  const frontmatter = content.slice(3, end);
  const match = frontmatter.match(/(?:^|\n)\s*name\s*:\s*["']?([^"'\n]+)["']?/i);
  return match?.[1]?.trim();
}

function createUnverifiedResult(): SkillLedgerVerifierResult {
  return {
    scanner: {
      name: "skill-ledger",
      version: "0.1.0",
      reportVersion: "unverified",
    },
    scan: {
      safeToInstall: false,
      recommendedAction: "review",
      severity: "caution",
      riskScore: 0,
      flagCount: 0,
      categories: {},
      mappings: { owasp: [], mitreAtlas: [], nistAiRmf: [] },
    },
  };
}

async function discoverSkillFilesInDirectory(
  absoluteDir: string,
  rootDir: string,
  discoveries: SkillDiscovery[],
): Promise<void> {
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
      continue;
    }

    const absolutePath = join(absoluteDir, entry.name);
    if (entry.isDirectory()) {
      await discoverSkillFilesInDirectory(absolutePath, rootDir, discoveries);
      continue;
    }

    if (!entry.isFile() || !SKILL_FILE_NAMES.has(entry.name)) continue;

    const content = await readFile(absolutePath, "utf8");
    discoveries.push({
      path: absolutePath,
      relativePath: normalizePath(relative(rootDir, absolutePath)),
      content,
    });
  }
}

export async function discoverSkillFiles(
  directories: string[],
  options: Pick<BuildManifestOptions, "rootDir"> = {},
): Promise<SkillDiscovery[]> {
  const rootDir = resolve(options.rootDir ?? process.cwd());
  const discoveries: SkillDiscovery[] = [];

  for (const dir of directories) {
    const absoluteDir = resolve(rootDir, dir);
    const info = await stat(absoluteDir);
    if (info.isFile()) {
      const name = absoluteDir.split(/[\\/]/).pop() ?? "";
      if (!SKILL_FILE_NAMES.has(name)) continue;
      const content = await readFile(absoluteDir, "utf8");
      discoveries.push({
        path: absoluteDir,
        relativePath: normalizePath(relative(rootDir, absoluteDir)),
        content,
      });
      continue;
    }

    if (info.isDirectory()) {
      await discoverSkillFilesInDirectory(absoluteDir, rootDir, discoveries);
    }
  }

  return discoveries.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export async function createLedgerEntryFromSkill(
  discovery: SkillDiscovery,
  options: BuildManifestOptions = {},
): Promise<SkillLedgerEntry> {
  const now =
    typeof options.now === "string"
      ? options.now
      : (options.now ?? new Date()).toISOString();
  const pathSlug = slugify(discovery.relativePath) || "skill";
  const shortHash = sha256Hex(discovery.relativePath).slice(0, 10);
  const verification = options.verifier
    ? await options.verifier.verify(discovery)
    : createUnverifiedResult();

  return {
    id: `${pathSlug}-${shortHash}`,
    name: extractFrontmatterName(discovery.content) ?? pathSlug,
    source: `file:${discovery.relativePath}`,
    resolvedUrl: null,
    scope: options.scope ?? "workspace",
    installedAt: now,
    integrity: `sha256-${sha256Hex(discovery.content)}`,
    scanner: verification.scanner,
    scan: verification.scan,
  };
}

export async function buildManifestFromDirectories(
  directories: string[],
  options: BuildManifestOptions = {},
): Promise<SkillLedgerManifest> {
  const discoveries = await discoverSkillFiles(directories, options);
  const skills = await Promise.all(discoveries.map((discovery) =>
    createLedgerEntryFromSkill(discovery, options),
  ));

  return {
    version: "skill-ledger.manifest.v1",
    generatedAt:
      typeof options.now === "string"
        ? options.now
        : (options.now ?? new Date()).toISOString(),
    sourceId: options.sourceId,
    skills,
  };
}
