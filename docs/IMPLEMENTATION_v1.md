## Implementable plan:

**manifest schema**, **core services**, **sync and dedupe algorithms**, **security/integrity**, **CLI surface**, **CI/operational checklist**, and a short **roadmap** you can act on immediately.

---

### Key attributes comparison
| **Attribute** | **Recommended approach** | **Why it matters** |
|---|---:|---|
| **Manifest format** | JSON Schema `skill-registry.v1` | Portable, machine‑readable, easy to validate |
| **Storage backend** | Local file + optional remote registry (S3/HTTP/Git) | Offline first, syncable, simple conflict resolution |
| **Integrity** | SHA256 content hash + optional signature | Detects tampering and supports provenance |
| **Trust model** | `verified|managed|workspace|community|unknown` | Drives `requiresSanitization` and install policy |
| **Sync model** | CRDT-lite with last‑write metadata + optional central authority | Works offline, merges deterministically |
| **Dedupe** | Canonical ID by source+path+integrity | Avoids duplicates across sources and machines |

---

## Manifest schema and examples
**Design goals**: stable, extensible, minimal required fields, machine‑verifiable.

**Core schema (excerpt)**

```json
{
  "version": "skill-registry.v1",
  "generatedAt": "2026-04-27T00:00:00Z",
  "sourceId": "machine:desktop-01",
  "skills": [
    {
      "id": "github-owner-repo-path-sha256",
      "name": "GitHub PR Review",
      "source": "github:owner/repo/path/SKILL.md@main",
      "resolvedUrl": "https://raw.githubusercontent.com/owner/repo/main/path/SKILL.md",
      "scope": "global",
      "installedAt": "2026-04-27T00:00:00.000Z",
      "integrity": "sha256-<hex>",
      "trust": "community",
      "safe": {
        "scanner": "@gsknnft/skill-safe",
        "version": "0.2.1",
        "recommendedAction": "allow",
        "riskScore": 0
      },
      "meta": {
        "author": "owner",
        "tags": ["pr","github"],
        "lastChecked": "2026-04-27T00:00:00Z"
      }
    }
  ]
}
```

The suppression default is the right call to fix before tagging. Implementing SuppressionMode now.


Now, within (sigilnet_ai) ->

packages/skill-ledger;

> Empty scaffold — just the shell. Good, that means the interface contract is still open. Here's my read on the right shape before we write any real code:

Package identity corrections first:

The core interface question:

What does the manifest entry store from the scan? Two options:

Option A — summary only (lean):

```ts
safe: {
  scanner: "@gsknnft/skill-safe",
  version: "0.3.0",
  scannedAt: string;
  recommendedAction: "allow" | "review" | "block";
  riskScore: number;
  suppressions: number; // count
}
```
Option B — full report reference (rich):

```ts
safe: {
  scanner: "@gsknnft/skill-safe";
  version: "0.3.0";
  scannedAt: string;
  recommendedAction: "allow" | "review" | "block";
  riskScore: number;
  report: SkillSafeFullReport; // embedded inline
}
```
Option A keeps the manifest file small and human-readable. Option B makes skill-ledger doctor fully self-contained without needing to re-scan.

My recommendation: store summary fields inline, write the full report to a sidecar file — e.g., .skill-ledger/reports/<id>-<hash>.json. The manifest stays scannable with cat, the full report is available for CI/audit without bloating the manifest.

The src/registry/ directory — looks like that's where the manifest read/write logic should live. I'd expect:

```
src/
  registry/
    manifest.ts     — read/write .skill-ledger/manifest.json
    entry.ts        — SkillLedgerEntry type
  commands/
    add.ts          — resolve + scan + append to manifest
    list.ts         — read manifest, format output
    doctor.ts       — check integrity, stale scans, duplicates
    sync.ts         — re-scan changed entries
  cli.ts
  index.ts
```

Want me to wire up the package properly and stub those files with the right types so you have a solid foundation to build on?

**Canonical ID rule**
`id = sha256(source + ":" + path + ":" + integrity)`
This makes dedupe deterministic across machines.

---

## Core services and responsibilities
1. **skill-registry CLI**
   - `scan`, `list`, `add`, `remove`, `sync`, `doctor`, `export`, `import`
   - Local manifest read/write, validation, and human output.

2. **skill-safe**
   - Static scanner used as a primitive. Returns `safeToInstall`, `flags`, `report`.

3. **registry backend (optional)**
   - Simple HTTP/S3 store for manifests and metadata. Supports ETag and object versioning.

4. **skill-runtime**
   - Enforces runtime permissions and sandboxing based on manifest `scope` and `safe` result.

5. **skill-judge (optional)**
   - Human or LLM-assisted review workflow that attaches review metadata to manifest entries.

---

## Sync, dedupe, and conflict resolution
**Local-first, eventual consistency**:

- **Local manifest** is authoritative per machine.
- **Sync** pushes deltas to remote registry and pulls remote deltas.
- **Delta format**: list of skill `id` additions/updates/removals with `updatedAt` and `sourceId`.
- **Merge rule**:
  1. If `integrity` matches, keep one entry.
  2. If `integrity` differs and `updatedAt` differs, prefer entry with higher `lastChecked` and `safe.recommendedAction` priority (`block` > `review` > `allow`).
  3. If conflict remains, mark as `conflict` and surface in `doctor`.

**Dedupe**:
- Use canonical ID. When two entries point to same `resolvedUrl` but different integrity, treat as version change and record history.

**Garbage collection**:
- `skill-registry sync --prune` removes entries not present in any configured source after a grace period.

---

## Security and integrity
- **Integrity**: compute `sha256` of downloaded SKILL.md and store as `integrity`. Use `sha256-hex` or `sha256-base64` consistently.
- **Signatures**: optional `signature` field (detached sig) for orgs that want cryptographic provenance.
- **Auth**: support `GITHUB_TOKEN` and `REGISTRY_TOKEN` for private sources.
- **Scanner gating**: enforce `requiresSanitization(trust)` before install. If `safe.recommendedAction === "block"`, prevent install unless overridden with explicit `--force` and audit log.
- **Runtime sandbox**: map `scope` to runtime capabilities (network, filesystem, env). Default least privilege.

---

## CLI UX and commands
**Primary commands**

- `skill-registry scan [source]`
  Scans a source and adds/updates manifest entry.

- `skill-registry add <source> [--scope global|repo|workspace]`
  Adds a skill to manifest after scanning.

- `skill-registry list [--scope] [--format json|md]`
  Lists installed and known skills.

- `skill-registry sync [--remote <url>]`
  Push/pull manifest deltas.

- `skill-registry doctor`
  Health check and summary (counts, duplicates, changed, missing, needs review, blocked).

- `skill-registry export --out manifest.json`
  Export manifest.

**Doctor output example**

```
Global skills: 12
Repo skills: 4
Duplicates: 2
Changed since install: 1
Missing SKILL.md: 1
Needs review: 3
Blocked by skill-safe: 1
```

**Exit codes**
- `0` OK, `1` failure threshold met, `2` operational error.

---

## CI, tests, and operational checklist
**Tests**
- Unit tests for parser, resolver, integrity computation, merge logic.
- Integration tests with mocked GitHub API for nested folders and branches.
- End‑to‑end smoke test: add → scan → sync → doctor.

**CI**
- Run `pnpm test`, `pnpm build`, CLI smoke tests.
- Optional: run `doctor` against a fixture manifest.

**Observability**
- Log actions with structured JSON: `action`, `skillId`, `source`, `result`, `timestamp`.
- Emit audit trail for installs and overrides.

---

## Minimal implementation roadmap (next 6 weeks)
1. **Week 1**: Implement canonical ID, robust GitHub resolver, and preferred-file heuristics. Add unit tests.
2. **Week 2**: Implement `skill-registry add/scan/list` and local manifest read/write. Add `doctor` summary.
3. **Week 3**: Add sync protocol (delta format), remote backend adapter (S3/HTTP), and basic merge rules.
4. **Week 4**: Integrate `skill-safe` scanner, enforce `requiresSanitization`, and add `--force` override with audit log.
5. **Week 5**: Add `skill-runtime` capability mapping and sandbox enforcement prototype.
6. **Week 6**: Add CI, tests, docs, and a sample `skill-registry doctor` demo.

---

## Quick actionable next steps you can run now
- Add canonical ID generation to your resolver and update `manifest.json` writer.
- Implement `parseGithubShorthand` and `resolveMarkdownFile` with preferred file order.
- Add `GITHUB_TOKEN` support and ETag caching to GitHub fetcher.
- Implement `skill-registry doctor` that reads manifest and prints the summary metrics.

---

### skill-registry doctor implementation overview

Below is a focused, production‑ready **`skill-registry doctor`** implementation you can drop into your CLI. It:

- **Reads a manifest** (`manifest.json`) in the `skill-registry.v1` format.
- **Computes summary metrics** you listed: global/repo/workspace counts, duplicates, changed since install, missing SKILL.md, needs review, blocked by `skill-safe`.
- **Optionally validates remote sources** (HTTP/GitHub) to detect changed or missing SKILL.md files when `--check-remote` is passed. Auth via `GITHUB_TOKEN` is supported.
- **Returns machine‑friendly JSON** and a human summary text (same output modes your CLI already supports).

Two short sentences from your Skill Ledger spec that guided this implementation:
> *“A manifest and sync layer for agent SKILL.md files.”*
> *“what is installed where it came from when it changed what scan approved it what scope it belongs to”*
(quoted from the Skill Ledger spec you pasted).

---

### Doctor behavior and rules

- **Duplicates**: entries with the same canonical `id` or same `resolvedUrl` + `integrity` mismatch are considered duplicates/versions.
- **Changed since install**: if `--check-remote` is used, the doctor fetches the remote file and compares SHA256 to the stored `integrity`. If network is disabled, this metric is reported as `unknown`.
- **Missing SKILL.md**: remote fetch returns 404 or non‑file response.
- **Needs review**: `scan.recommendedAction === "review"`.
- **Blocked**: `scan.recommendedAction === "block"`.
- **Exit code**: nonzero if blocked/review counts meet `--fail-on` threshold (same semantics as your CLI).

---

### Drop‑in TypeScript implementation

Save as `src/doctor.ts` (ESM). This uses only `node:fs/promises`, `node:crypto`, and `axios` for optional remote checks.

```ts
// src/doctor.ts
import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import axios from "axios";

export type SkillLedgerManifest = {
  version: string;
  generatedAt?: string;
  sourceId?: string;
  skills: SkillLedgerEntry[];
};

export type SkillLedgerEntry = {
  id: string;
  name?: string;
  source: string;
  resolvedUrl?: string | null;
  scope: "global" | "repo" | "workspace";
  installedAt: string;
  updatedAt?: string;
  integrity: string; // e.g., "sha256-<hex>"
  scanner: {
    name: string;
    version: string;
    reportVersion: string;
  };
  scan: {
    safeToInstall: boolean;
    recommendedAction: "allow" | "review" | "block";
    severity: "safe" | "caution" | "danger";
    riskScore: number;
    flagCount: number;
    categories: Record<string, number>;
    mappings: {
      owasp: string[];
      mitreAtlas: string[];
      nistAiRmf: string[];
    };
  };
};

export type DoctorSummary = {
  total: number;
  byScope: { global: number; repo: number; workspace: number };
  duplicates: number;
  duplicateGroups: { key: string; ids: string[] }[];
  changedSinceInstall: number | "unknown";
  missingSkillMd: number | "unknown";
  needsReview: number;
  blocked: number;
  details?: Record<string, any>;
};

function parseIntegrity(integrity: string) {
  // support "sha256-<hex>" or "sha256:<hex>"
  const m = integrity.match(/sha256[-:]?([0-9a-fA-F]+)/);
  return m ? m[1].toLowerCase() : null;
}

async function fetchRemoteContent(url: string, token?: string) {
  const headers: Record<string, string> = { "User-Agent": "skill-registry-doctor" };
  if (token) headers.Authorization = `token ${token}`;
  const resp = await axios.get(url, { headers, responseType: "arraybuffer", validateStatus: () => true });
  return { status: resp.status, data: resp.data, headers: resp.headers };
}

function sha256Hex(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function loadManifest(path: string): Promise<SkillLedgerManifest> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as SkillLedgerManifest;
}

export async function computeDoctorSummary(
  manifest: SkillLedgerManifest,
  opts?: { checkRemote?: boolean; githubToken?: string },
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
    if (s.resolvedUrl) byResolved.set(s.resolvedUrl, (byResolved.get(s.resolvedUrl) ?? []).concat(s));
  }
  const duplicateGroups: { key: string; ids: string[] }[] = [];
  for (const [k, arr] of byResolved.entries()) {
    if (arr.length > 1) duplicateGroups.push({ key: k, ids: arr.map((x) => x.id) });
  }
  for (const [k, arr] of byId.entries()) {
    if (arr.length > 1) duplicateGroups.push({ key: k, ids: arr.map((x) => x.id) });
  }
  const duplicates = duplicateGroups.reduce((acc, g) => acc + Math.max(0, g.ids.length - 1), 0);

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
        const { status, data } = await fetchRemoteContent(s.resolvedUrl, opts.githubToken);
        if (status === 200 && data) {
          const remoteHash = sha256Hex(Buffer.from(data));
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
```

---

### CLI wrapper and human summary output

Add a small CLI entry `src/cli-doctor.ts` that integrates with your existing CLI flags and prints the summary:

```ts
// src/cli-doctor.ts
import { loadManifest, computeDoctorSummary } from "./doctor.js";
import { basename } from "node:path";

async function run() {
  const args = process.argv.slice(2);
  const manifestPath = args[0] ?? "./manifest.json";
  const checkRemote = args.includes("--check-remote");
  const githubToken = process.env.GITHUB_TOKEN;

  try {
    const manifest = await loadManifest(manifestPath);
    const summary = await computeDoctorSummary(manifest, { checkRemote, githubToken });

    // Human summary
    console.log(`${basename(manifestPath)} doctor summary`);
    console.log(`Total skills: ${summary.total}`);
    console.log(`Global: ${summary.byScope.global}  Repo: ${summary.byScope.repo}  Workspace: ${summary.byScope.workspace}`);
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
    console.error("doctor error:", err instanceof Error ? err.message : String(err));
    process.exitCode = 2;
  }
}

run();
```

**Install and run**

- Build and publish as part of your package or run with `ts-node`:
```bash
node ./dist/cli-doctor.js ./manifest.json --check-remote
```
- Set `GITHUB_TOKEN` in CI to avoid rate limits and access private repos.

---

### Sample output

```
manifest.json doctor summary
Total skills: 17
Global: 12  Repo: 4  Workspace: 1
Duplicates: 2
Needs review: 3
Blocked by skill-safe: 1
Changed since install: 1
Missing SKILL.md: 0

Duplicate groups:
- https://raw.githubusercontent.com/owner/repo/main/path/SKILL.md: github-owner-repo-path-sha256, github-owner-repo-path-sha256-v2
```

---

### Tests and next steps

**Unit tests to add**
- `computeDoctorSummary` with a small manifest fixture (no network) asserting counts.
- `computeDoctorSummary` with `--check-remote` mocked via `nock` to simulate changed/missing files.
- Duplicate detection tests for same `resolvedUrl` and same `id`.

**Improvements you can add**
- **Delta output**: list changed entries with `installedAt` vs remote `last-modified`.
- **History**: keep `history` array per skill to track previous integrities.
- **Doctor `--fix`**: optional interactive mode to re-scan or remove missing entries.
- **Telemetry**: structured JSON logs for CI consumption.

---
