## @gsknnft/skill-ledger

> How do we inventory, organize, sync, install, dedupe, validate, and govern skills across machines/repos?

 - A **skill management layer**.

For most user's exact pain point, the sane system is:

```txt
global skills
repo/workspace skills
installed manifest
in-sync between machines,
source integrity hash
last scan report
scope rules
sync/export/import
```

And `skill-safe` becomes the security/report primitive inside it.


```txt
what is installed
where it came from
when it changed
what scan approved it
what scope it belongs to
```

Clean tagline:

> A manifest and sync layer for agent SKILL.md files.

Or:

> Track, scan, and sync agent skills across repos and machines.

The core concept:

```txt
skill-safe      = scan/report before install
skill-registry  = know what skills exist, where they came from, where installed, and whether they are current/safe
skill-runtime   = enforce permissions when skills run
skill-judge     = optional semantic review
```

[**manifest.json**](./manifest.json)

Then commands:

```sh
skill-registry scan
skill-registry list
skill-registry add github:HashLips/agent-skills
skill-registry sync
skill-registry doctor
skill-registry export
```

The killer feature would be:

```sh
skill-registry doctor
```

Outputs:

```txt
Global skills: 12
Repo skills: 4
Duplicates: 2
Changed since install: 1
Missing SKILL.md: 1
Needs review: 3
Blocked by skill-safe: 1
```
