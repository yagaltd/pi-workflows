# Plan 20261117-070 — the last row: bare-filename boundary anchoring + guard fixture exclusion

> Plan ID: 20261117-070
> Created: 20261117
> Owner: Aurel
> Status: DONE (shipped v0.15.6 — 20261117)
> Supersedes: none (follows 20261117-069)

## Ledger Resolution

| # | Item | Disposition | Note |
|---|---|---|---|
| 1 | agent-spec gate-accuracy batch (bare-filename matcher anchoring + guard runner fixture exclusion) | done(T1) | the queued P2 and its batched P3 member close together |

Ship target: an EMPTY ledger — zero queued, zero deferred, zero triggers.

## Lifecycle

DRAFT → APPROVED → CONTRACTED → EXECUTING → REVIEWED → SHIPPED → ARCHIVED

## Context

The bare-filename gap is the third defect in the same function's lineage:
`looks_like_path_boundary` (src/spec_verify/boundaries.rs:133) treats an
Allowed-Changes entry as a path only when it contains `/` or `*`, starts with
a dot, or ends in a known code suffix (.rs/.ts/.js/.py/.spec/.spec.md) — so
`README.md`, `CHANGELOG.md`, `package.json`, `Cargo.toml`, `Cargo.lock` are
dropped as prose and guard fails exactly-compliant change sets. v0.3.1 fixed
dotfiles + trailing annotations in this function; two independent workers hit
the bare-name case in plan 069 with a minimal repro (`./README.md` passes,
`README.md` fails). The batched P3 member: guard's test-evidence runner sweeps
tests/fixtures/** in target repos, polluting guard stdout with pre-existing
fixture failures. Plan 069 closed everything else; the owner escalated this
row's survival — correctly, under the drain-before-grow doctrine it sits in.

## Exploration

- `looks_like_path_boundary` — the suffix list was the 0.3.1 heuristic; bare
  root filenames with other extensions (`.md`, `.json`, `.toml`, `.lock`,
  `.config.ts`) fall outside it.
- The `./` prefix works today (matcher normalizes it) — 068/069 archived
  specs use it; the fix must keep those passing.
- Guard runner: the bun invocation inside guard lifecycle evidence sweeps
  fixture dirs (observed: "2 fail, 2 errors" from tests/fixtures/** in
  tdd-guard); vitest excludes them, bun does not.

## Spec Map

- `.workflows/specs/task-1.spec` — matcher anchoring + runner fixture exclusion

## Tasks

### TASK 1 (⚪ STANDARD, Tier B): gate-accuracy batch

- **Agent**: worker · **Wave**: 1 · **Depends On**: none · **Repo**: agent-spec
- **Contract**: .workflows/specs/task-1.spec
- **Status**: ✅ DONE (reviewer ok:true; merged; agent-spec 0.3.4 + tdd-guard 0.1.4)
- **context: matcher rule shipped with zero lint drift; the reopened rust-binding row re-closed with real-repo proof — ledger EMPTY**
- **Problem**: bare root filenames in Allowed Changes are dropped as prose;
  guard's runner evidence sweeps fixture directories.
- **Allowed**: src/spec_verify/**, src/spec_gateway/** (only if the runner
  invocation lives there), tests/**, docs/**, CHANGELOG.md, Cargo.toml,
  Cargo.lock
- **Verify**: cargo test --quiet && cargo clippy --all-targets -- -D warnings

## Contracts (generated after approval)

- .workflows/specs/task-1.spec

## Docs impact

- the agent-spec repo records the matcher fix and the fixture exclusion in its
  CHANGELOG with a 0.3.4 release — cross-repo, recorded by reference
- `CHANGELOG.md` — pi-workflows v0.15.6 entry at SHIP (the empty-ledger record)

## Execution Notes
