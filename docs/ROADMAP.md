# skill-ledger Roadmap

`@gsknnft/skill-ledger` is the manifest and audit layer for agent skills. It
should stay separate from `skill-safe`: the ledger records inventory and scan
state, while `skill-safe` produces the deterministic security report.

## v0.1 Hardening

- Keep the package zero runtime dependency.
- Keep remote checks opt-in.
- Keep manifest schema additive and human-readable.
- Parse one or more skill directories to build a manifest. Implemented for
  recursive `SKILL.md` / `skill.md` discovery.
- Verify doctor summaries with fixtures.
- Provide a CLI for manifest health checks.
- Publish docs for manifest fields, doctor output, and release checks.
- Provide easy ways for users to review and manage skill inventory. Implemented
  for JSON, Markdown, and terminal table output:
  - JSON for tools
  - Markdown for human review
  - concise text/table output for terminal or REPL surfaces
  - importable data for future UI surfaces

## v0.1 High-Value Candidates

- `skill-ledger add`:
  - resolve source
  - scan with `skill-safe`
  - write/update manifest entry
  - optionally write full scan report sidecar
- `skill-ledger list`:
  - table output (implemented)
  - JSON output (implemented)
  - Markdown output (implemented)
  - filters by scope, action, trust, source
- `skill-ledger export/import`:
  - stable JSON
  - deterministic sorting
  - duplicate resolution
- Manifest validation:
  - required fields
  - integrity format
  - scanner metadata
  - stale scan detection
  - must remain manifest/schema validation, not skill safety verification
- Merge/update helpers:
  - combine existing manifest with freshly discovered local skills
  - preserve verified scan summaries when integrity is unchanged
  - downgrade changed skills to review until re-verified
- Skill-safe report import:
  - upgrade an entry from unverified review state to allow/review/block
  - attach scanner version and report version
  - preserve category and governance mapping summaries
  - keep `@gsknnft/skill-safe` as the content verifier; ledger only records
    verifier output
  - optional verifier adapter for directory scans is implemented; next step is
    a first-party helper that maps `skill-safe` reports into ledger summaries
- Config file:
  - default scope
  - manifest path
  - report sidecar path
  - source policy

## v0.2 Candidates

- Sync protocol:
  - local vs remote manifest diff
  - conflict markers
  - merge policy
  - prune mode
- Registry adapter:
  - HTTP JSON
  - Git-backed registry
  - S3/R2-compatible object store
- Audit trail:
  - install/update/remove events
  - override records
  - force-install records
  - suppression records

## v1.0 Readiness

- Stable `skill-ledger.manifest.v1` schema.
- Stable doctor JSON output.
- Full CLI coverage for add/list/doctor/export/import.
- CI verifies build, tests, CLI smoke, and pack dry-run.
- Clear security policy and contribution guide.
- Integration examples with `skill-safe`.
