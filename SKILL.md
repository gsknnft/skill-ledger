---
name: skill-ledger
description: Build, maintain, audit, and review manifests for installed agent skills. Use when asked to inventory skills, build a skill manifest from directories, inspect installed SKILL.md files, deduplicate skill entries, run or improve skill-ledger doctor checks, create readable skill inventory reports, or coordinate skill-ledger with skill-safe, skill-safe-judge, or skill-safe-runtime.
---

# Skill Ledger

Use this skill when working on the `@gsknnft/skill-ledger` package or on a
workspace's installed-skill inventory.

`skill-ledger` is the builder and inventory layer:

- discovers local or remote `SKILL.md` files
- builds a human-readable manifest
- records source, scope, integrity, timestamps, and scan summary
- summarizes installed skills for review
- reports duplicates, blocked skills, review-needed skills, missing remotes, and
  remote drift

It does not decide whether a skill is safe by itself.

## Package Boundaries

- `@gsknnft/skill-ledger`: manifest builder, inventory, doctor, list/export/import, sync planning.
- `@gsknnft/skill-safe`: deterministic static verifier before install.
- `@gsknnft/skill-safe-judge`: optional LLM semantic review layer.
- `@gsknnft/skill-safe-runtime`: runtime enforcement, tool-call policy, traces, and permission checks.

Keep those boundaries clean. Do not put static scanner rules, LLM judging, or
runtime sandbox logic into `skill-ledger`.

## Core Workflow

When asked to improve or use `skill-ledger`:

1. Inspect the manifest or skill directories first.
2. Normalize discovered skills into `SkillLedgerEntry` records.
3. Preserve the manifest as the user-facing source of truth.
4. Use `skill-safe` reports as verifier inputs, not as internal ledger logic.
5. Use doctor summaries for health checks and operational status.
6. Keep output readable for humans and parseable for tools.

## Manifest Expectations

A manifest should answer:

- what is installed
- where it came from
- where it is installed
- when it was installed or updated
- what integrity hash was recorded
- what scanner approved or blocked it
- what scope it belongs to: `global`, `repo`, or `workspace`
- whether it needs review, is blocked, duplicated, missing, or changed

Prefer additive schema changes. Do not remove existing manifest fields without a
major-version migration plan.

## Doctor Checks

The doctor should stay deterministic unless remote checks are explicitly
enabled.

Default doctor checks:

- total skill count
- counts by scope
- duplicate IDs
- duplicate resolved URLs
- review-needed count
- blocked count

Optional remote checks:

- fetch `resolvedUrl`
- compare SHA-256 integrity
- report changed remote content
- report missing remote files

Remote checks must remain opt-in.

## Review / Management Output

When adding user-facing review surfaces, prefer simple structured outputs:

- JSON for tools
- Markdown for human review
- concise text tables for terminal output

The goal is an easy way for users to review and manage their installed skills
without needing to read raw manifest JSON.

## Development Rules

- Keep the package zero runtime dependency.
- Keep remote checks opt-in.
- Keep package logic separate from `skill-safe` rule logic.
- Add tests for every new doctor metric, manifest transform, or parser.
- Keep CLI output stable and parseable.
- Run `pnpm --filter @gsknnft/skill-ledger test` and build before release.

## High-Value Next Work

Prioritize:

1. Directory parsing that builds a manifest from one or more skill roots.
2. `skill-ledger list` with JSON, Markdown, and compact terminal output.
3. Manifest validation for required fields and integrity format.
4. `skill-ledger add` that resolves, verifies with `skill-safe`, and records the entry.
5. Export/import with deterministic sorting.
6. Sync planning and conflict reporting.
