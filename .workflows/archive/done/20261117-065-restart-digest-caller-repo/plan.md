# Plan 20261117-065 — restart digest resolves the caller's repo

> Plan ID: 20261117-065
> Created: 20261117
> Owner: Aurel
> Status: DONE (shipped v0.15.1 — 20261117)
> Supersedes: none (follows 20261117-064)

## Lifecycle

DRAFT → APPROVED → CONTRACTED → EXECUTING → REVIEWED → SHIPPED → ARCHIVED

## Context

`/restart` was shipped in v0.15.0 (plan 064) and is already broken outside the
pi-workflows checkout: the template says `bash scripts/resume-digest.sh`, a
relative path that only resolves when cwd is the package repo, and the script
itself resolves its root from its own location — so invoking the installed copy
from another project silently digests the *package clone* instead of that
project.

Measured 20261117: `/tmp/foreign2` with `> Plan ID: 20990101-999` in its
`.workflows/plan.md` is reported as "note: no live plan" when the package copy
runs from that cwd.

## Exploration

- `scripts/resume-digest.sh:15-29` — root = `.git` walk-up from `$0`'s dir, with
  `git rev-parse --show-toplevel` only as fallback; `cd "$root"` then reads
  `.workflows/*` from there.
- `prompts/restart.md:5` — bare relative invocation, no package resolution.
- `/init` copies no scripts: a bootstrapped project has no `scripts/` of its own,
  so every `bash scripts/…` reference in the prompts needs a resolution rule.

## Spec Map

- `.workflows/specs/task-1.spec` — digest root resolution + restart resolution rule

## Tasks

### TASK 1 (🟠 VERIFICATION-HEAVY, Tier B): the digest inspects the caller's repo

- **Agent**: worker
- **Wave**: 1
- **Depends On**: none
- **Contract**: .workflows/specs/task-1.spec
- **Status**: ✅ DONE (verdict reviews/task-1.md ok:true)
- **Problem**: two wrong-root paths — the relative prompt invocation, and the
  script's script-dir-first resolution.
- **Allowed**: scripts/resume-digest.sh, prompts/restart.md, tests/resume-digest.test.ts, docs/architecture.md, README.md
- **Testing strategy**: bun test with temp git repos (foreign plan, no plan, non-git, `--root`); no network.
- **Verify**: bun test && bash scripts/check-drift.sh
- **What**: (1) `resume-digest.sh` resolves the repo from cwd first — use
  `git rev-parse --show-toplevel` when that root contains `.workflows/`, else the
  script-dir walk-up, else a loud `FAIL` (exit 1, never a silent wrong repo);
  add `--root <dir>` for explicitness. (2) `prompts/restart.md` resolves the
  script: prefer `scripts/resume-digest.sh` in the current repo, else the
  installed package copy (discoverable via `pi list` / the pi-workflows skill
  path), and state that the digest targets the repo you are standing in.
  (3) Pin all of it: a foreign repo's plan is reported from a foreign cwd, the
  pi-workflows checkout behaves as before, a non-git cwd fails loudly, and
  `--root` is honoured.

## Contracts (generated after approval)

- .workflows/specs/task-1.spec

## Docs impact

- `prompts/restart.md` — the resolution rule
- `docs/architecture.md` — Restart paragraph states the target repo
- `README.md` — command table regenerated if frontmatter changed
- `CHANGELOG.md` — the v0.15.1 entry

## Execution Notes

- TASK 1 — ✅ DONE (verdict reviews/task-1.md ok:true)
  context: cwd-first root resolution in `scripts/resume-digest.sh` (`--root` > cwd git root with
  `.workflows/` > script-dir walk-up only when that checkout IS the cwd > loud FAIL exit 1),
  `--root <dir>` validated as a git repo with `.workflows/`; `prompts/restart.md` states the rule
  (repo-local script first, installed package copy second) and that the digest targets the repo you
  stand in; `docs/architecture.md` Restart paragraph reworded within the docs ratchet. Five pins in
  `tests/resume-digest.test.ts` (4 red on base), all driven through the absolute script path with a
  foreign cwd. Sections byte-identical; nothing else touched.
