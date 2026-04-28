# Contributing

`skill-ledger` should remain a small, auditable manifest and inventory package.

## Local Checks

```sh
pnpm build
pnpm test
pnpm pack --dry-run
```

## Design Rules

- Do not execute skills.
- Keep remote checks opt-in.
- Keep runtime dependencies out of the core package.
- Keep manifest schema changes additive.
- Add tests for new doctor metrics, manifest transforms, and CLI behavior.

## Manifest Changes

When changing `SkillLedgerManifest` or `SkillLedgerEntry`:

1. Update `src/types.ts`.
2. Update README and docs.
3. Add fixture coverage.
4. Preserve old fields unless there is a major-version migration.
