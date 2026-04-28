# @gsknnft/skill-ledger

Manifest, inventory, and doctor utilities for agent `SKILL.md` installations.

`skill-safe` answers: is this skill safe enough to install?

`skill-ledger` answers: what skills are installed, where did they come from,
what scan approved them, what scope do they belong to, and are they still in a
healthy state?

## Install

```sh
pnpm add @gsknnft/skill-ledger
```

## Manifest Shape

```ts
type SkillLedgerManifest = {
  version: "skill-ledger.manifest.v1";
  generatedAt?: string;
  sourceId?: string;
  skills: SkillLedgerEntry[];
};
```

Each entry stores source, scope, integrity, scan summary, scanner metadata, and
install/update timestamps.

## Doctor

```sh
skill-ledger doctor ./manifest.json
skill-ledger-doctor ./manifest.json
skill-ledger-doctor ./manifest.json --json
skill-ledger-doctor ./manifest.json --check-remote
```

The doctor computes:

- total skills
- scope counts
- duplicate ID / resolved URL groups
- review and block counts from `skill-safe`
- optional remote integrity drift checks
- missing remote skill files when remote checks are enabled

## Build A Manifest

```sh
skill-ledger build ./skills --out manifest.json
skill-ledger build ./skills ./more-skills --scope repo --source-id my-workspace
```

`build` recursively discovers `SKILL.md` and `skill.md` files, records their
SHA-256 integrity, and creates review-required ledger entries. It does not mark
new skills as verified. Run `skill-safe` first or update entries with a trusted
scan summary before install automation treats them as approved.

The library also supports an optional verifier adapter. This lets a caller scan
an already-installed directory and enrich entries with `skill-safe` output
without making `skill-safe` a runtime dependency of the ledger package.

## Review A Manifest

```sh
skill-ledger list ./manifest.json
skill-ledger list ./manifest.json --markdown
skill-ledger list ./manifest.json --json
```

The list command is intentionally simple: it produces a human-reviewable skill
inventory for UI import, release notes, local review, or CI artifacts.

## Validate A Manifest

```sh
skill-ledger validate-manifest ./manifest.json
skill-ledger validate-manifest ./manifest.json --json
```

Validation checks the manifest version, required entry fields, integrity format,
scanner metadata, scan action/severity values, and duplicate IDs.

This is not a safety scan. Use `@gsknnft/skill-safe` to verify `SKILL.md`
content, then store that scan summary in the ledger entry.

## Library

```ts
import {
  ManifestBuilder,
  buildManifestFromDirectories,
  computeDoctorSummary,
  formatManifestMarkdown,
  loadManifest,
  validateManifest,
} from "@gsknnft/skill-ledger";

const discovered = await buildManifestFromDirectories(["./skills"], {
  verifier: {
    verify(discovery) {
      // Call skill-safe here, then map its report into scanner + scan.
      return {
        scanner: {
          name: "@gsknnft/skill-safe",
          version: "0.3.0",
          reportVersion: "skill-safe.report.v1",
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
    },
  },
});
console.log(formatManifestMarkdown(discovered));

const manifest = await loadManifest("./manifest.json");
const validation = validateManifest(manifest);
const summary = await computeDoctorSummary(manifest);
```

## Security Model

The package is inventory and audit tooling. It does not execute skills.

Remote checks are opt-in and use `fetch`. Core manifest and doctor operations
are deterministic when `--check-remote` is not enabled.

Pair with `@gsknnft/skill-safe` for scan reports and install decisions.

## Docs

- [Concept](docs/CONCEPT.md)
- [Implementation plan](docs/IMPLEMENTATION_v1.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
