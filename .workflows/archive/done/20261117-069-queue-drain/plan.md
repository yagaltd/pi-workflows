# Plan 20261117-069 — the queue drains: lint per-file continue, verify Rust binding, shared discovery

> Plan ID: 20261117-069
> Created: 20261117
> Owner: Aurel
> Status: DONE (shipped v0.15.5 — 20261117)
> Supersedes: none (follows 20261117-068)

## Ledger Resolution

| # | Item | Disposition | Note |
|---|---|---|---|
| 1 | agent-spec lint multi-file abort | done(T1) | per-file continue; exit names every bad file |
| 2 | agent-spec roadmap guard exclusion | done(T1) | documented decision: guard = top-level active specs; roadmap = staged work, scanned per-file by lint |
| 3 | tdd-guard verify batch (Rust binding + shared discovery) | done(T2) | cargo --list resolution + one discovery helper for lint/verify/mutate |
| 4 | tdd-guard hygiene batch (README docs, vitest exclude) | done(T2) | pre-authorized in T2's Allowed per boundary generosity |

## Lifecycle

DRAFT → APPROVED → CONTRACTED → EXECUTING → REVIEWED → SHIPPED → ARCHIVED

## Context

The 068 ship ledger held one queued P2 and three open P3s; the owner ordered
the full drain. The P2 is real damage: agent-spec's multi-file lint aborts at
the first parse error, silently dropping every later file — it already
poisoned one durable count (067's "11 findings" vs the true 16). The tdd-guard
rows are the deferred pair: verify cannot resolve Rust selectors (three
independent confirmations, including `cargo` executing a test verify calls
unbound) and discovery logic diverges across lint/verify/mutate; the hygiene
batch (README, vitest exclude) rides along.

## Exploration

- agent-spec `src/main.rs:427-428` — cmd_lint propagates the first
  parse_spec error via `?`; combined runs abort; stderr suppression hid it.
- agent-spec guard uses non-recursive read_dir (src/main.rs:831) — roadmap
  intentionally outside gate scope, but undocumented.
- tdd-guard: lint's discovery is segment-precise (067's fix); verify.ts:44-53
  filters only node_modules; mutate.ts has no filter; both CLIs hardcode
  `--tests tests`; verify resolves selectors by parsing JS/TS test files, so
  Rust `#[cfg(test)]` modules and tests/*.rs integration tests are invisible.
- `cargo test -- --list` emits test names — the language-correct resolver for
  Rust repos.

## Spec Map

- `.workflows/specs/task-1.spec` — lint per-file continue + gate-scope doc (agent-spec)
- `.workflows/specs/task-2.spec` — verify Rust binding + shared discovery + hygiene (tdd-guard)

## Tasks

### TASK 1 (⚪ STANDARD, Tier B): lint per-file continue + gate-scope doc

- **Agent**: worker · **Wave**: 1 · **Depends On**: none · **Repo**: agent-spec
- **Contract**: .workflows/specs/task-1.spec
- **Status**: ✅ DONE (reviewer ok:true; merged; agent-spec 0.3.3 installed)
- **context: 48/49 enumerated with the bad file named; gate-scope decision documented**
- **Problem**: multi-file lint aborts at first parse error, silently
  under-reporting; roadmap exclusion undocumented.
- **Allowed**: src/main.rs, src/spec_lint/**, tests/**, docs/**, CHANGELOG.md,
  Cargo.toml, Cargo.lock
- **Verify**: cargo test --quiet && cargo clippy --all-targets -- -D warnings

### TASK 2 (⚪ STANDARD, Tier B): verify Rust binding + shared discovery + hygiene

- **Agent**: worker · **Wave**: 1 · **Depends On**: none · **Repo**: tdd-guard
- **Contract**: .workflows/specs/task-2.spec
- **Status**: ✅ DONE (fix-round-069: @cc markers dropped by subtraction; spec amended to ./ prefixes under adjudication; merged; tdd-guard 0.1.3)
- **context: rust binding via cargo --list (E2E proven against the real agent-spec repo); discovery now one implementation**
- **Problem**: verify cannot bind Rust selectors; discovery diverges across
  the three commands; README/vitest exclude undocumented.
- **Allowed**: src/lint.ts, src/verify.ts, src/mutate.ts, src/discovery.ts,
  src/cli.ts, src/config.ts, src/types.ts, tests/**, README.md,
  vitest.config.ts, package.json, CHANGELOG.md, dist/**
- **Verify**: bunx vitest run && bunx tsc --noEmit && bunx tsc

## Contracts (generated after approval)

- .workflows/specs/task-1.spec · task-2.spec

## Docs impact

- the agent-spec repo records the lint fix and the gate-scope decision in its
  docs and CHANGELOG, with a 0.3.3 release — cross-repo, recorded by reference
- the tdd-guard repo records the verify batch and hygiene in its README and
  CHANGELOG, with a 0.1.3 release — cross-repo, recorded by reference
- `CHANGELOG.md` — pi-workflows v0.15.5 entry at SHIP

## Execution Notes
