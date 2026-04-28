# Security Policy

`@gsknnft/skill-ledger` stores and audits skill inventory metadata. It does not
execute skills.

## Reporting

Report suspected vulnerabilities privately with:

- package version
- manifest fixture
- command/API used
- expected behavior
- actual behavior

## Security Model

- Manifest and doctor operations are local and deterministic by default.
- Remote integrity checks are opt-in.
- Remote checks use `fetch` and compare SHA-256 integrity when possible.
- Install decisions should come from `@gsknnft/skill-safe` scan reports.
- Host applications are responsible for sandboxing and runtime permissions.
