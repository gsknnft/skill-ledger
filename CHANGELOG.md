# Changelog

All notable changes to `@gsknnft/skill-ledger` are documented here.

## 0.1.0 - 2026-04-28

### Added

- Added `SkillLedgerManifest` and `SkillLedgerEntry` types.
- Added `ManifestBuilder` for deterministic manifest creation and summary.
- Added `computeDoctorSummary()` for manifest health checks.
- Added `skill-ledger-doctor` CLI.
- Added JSON output and optional remote integrity checks to the doctor CLI.
- Added `skill-ledger` CLI with `build`, `list`, and `doctor` commands.
- Added directory discovery for `SKILL.md` / `skill.md` files.
- Added optional verifier adapter support for enriching discovered skills with
  `skill-safe` or another verifier without adding runtime dependencies.
- Added manifest table, Markdown, and JSON formatters for review workflows.
- Added `example:doctor` smoke script.
- Added `example:list` smoke script.
- Added zero-runtime-dependency remote fetching via injected/global `fetch`.
- Added README, roadmap, contribution guide, security policy, and CI workflow.
- Added tests for manifest summaries, doctor summaries, remote drift checks, and
  utility helpers.

### Changed

- Removed runtime `axios` dependency.
- Updated package metadata, exports, files, and bin entry.
- Updated the sample manifest to the `skill-ledger.manifest.v1` shape.
