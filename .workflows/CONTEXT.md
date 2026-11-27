# Domain Memory — pi-workflows

## Glossary
- **abort-as-failure-signal**: when a needs-gated reviewer node auto-aborts (upstream worker failed/blocked), no verdict exists; the orchestrator treats the abort itself as the failure signal and inspects the worker output directly.
- **verification policy**: registry table mapping task traits (docs / standard / security-concurrency-parsing-external-input) to reviewer model+thinking; scales reviewer cost, never its existence.

## Decisions
- Sequential verification is engine-enforced: one two-node graph (worker → reviewer needs edge); conditionality (fix rounds, re-reviews) stays with the orchestrator as follow-up dispatches; re-review rounds are standalone (no needs).

## Decisions (2026-08-21, plan 20260821-001)
- Tier system verified live: complexity scales reviewer cost (docs=low, standard=med-high, security/concurrency/parsing/external-input=xhigh+strongest model), never verdict existence.
- Quality-reviewer: per-task tag-gated (🔴/🟡/🟠) standalone follow-up after ok:true; never per-wave; /review = whole-plan gate.
- Orchestrator lesson: subagent dispatches to scratch/external repos MUST set per-task cwd — recorded after 2 live mis-dispatches caught by the gates.

## Decisions (2026-08-21, review round)
- Shell-gate rule: never call err()/FAIL-mutating helpers inside `cmd | while read` pipelines (subshell loses state) — process substitution `< <(cmd)` is the pattern; every new checker section must be red-tested with an injected violation.
- Prompts/CHANGELOG claims must be written against the artifact (byte counts, test counts), not the intention — reviewer falsified three.
- next.md is the single @role:-dialect entry point: sequential shape inline + routing to registry/execution-doctrine/dispatch-shapes; any new dispatch dialect is drift by definition.

### Decisions (2026-08-22, plan 20260822-003)
- Per-task cwd mandatory (GUARD step 0): enforced — worker step 0 verifies `pwd` matches `git rev-parse --show-toplevel` before any read/write. The 2026-08-21 advisory "MUST set per-task cwd" note is hereby superseded-by-enforcement (proven: run-level cwd 3/10 successful vs per-task+GUARD 13/13 successful across 20260822-002 incident).
- Anti-scaffold rule: workers NEVER scaffold files to make a missing contract runnable — report WORKER_BLOCKER instead.
- VOID semantics for zero-change/inapplicable reviews: reviewer returns VOID verdict with provenance (spec+path+reason), never a fake ok:true.
- `tooling/verify-landing.sh` tripwire: runs after reviewer `ok:true`, before verdict persist; ALARM → phantom → redispatch.

## Decisions (2026-09-19, proposal round)
- **Durable rules layer = code-contracts format (@cc + CONTRACTS files)**, approved via `20260919-code-contracts-durable-rules.md` as an ADD layer — explicitly NOT a replacement for `.spec` (its executable `Test:` gates stay the only task-done authority). Scope (b): CONTRACTS files + `@cc` on plan-task-touched declarations, with extensible `adr:` attribute pointing at governing ADRs.
- **cc-check pinned** (`@spolu/cc-check`, global, read-only) — vendor only if the young format churns. Syntax gate + `list` for dispatch packs only; it never judges compliance.
- **Jev (typesafe) usage flows exclusively through the approved proposal's steps 5–6** (compliance + supersede routing), advisory-first, trust-tested by verdict replay before anything; never in any verdict path. The standalone Jev-gates proposal is superseded same-day.
- **ADR model reaffirmed**: latest Accepted = source of truth; superseded ADRs kept for history with links (pre-existing rule, verified 2026-09-19); new enforcement = dispatch-pack contracts + (post-trust-test) advisory supersede trigger.

## Decisions (2026-09-20, proposal round 2)
- **Spec-sanity pre-pass approved** (20260920-spec-sanity-prepass.md → plan 20260920-011): Layer A mechanical selector lint (bash -n + grep-flag sanity, exit-code bound) + Layer B Jev pre-pass (3 Noul per spec at Phase 5: boundaries_specific/selectors_runnable/verify_literal; flags ride the human approval gate; never auto-block). Workers stay Jev-free. Thresholds from THIS trust replay (T5 pre-amendment selectors = negative corpus; 7 shipped + 001/003 specs = positive) — no carry-over from v0.6.0 shapes. Specs frozen post-approval; pre-pass runs once.

### Glossary (plan 20261030-046)
- **just-surface** — the repo's single command entrypoint: root justfile wrapping scripts/; `just --unsorted --summary` is the recipe inventory (just 1.59 sorts `--summary` alphabetically; `--unsorted` = source order; `[private]` hides a recipe from the list).
- **ci-lite** — state-free gate subset (`drift` + `docs` + `agents`); what CI runs because the full suite still needs gitignored `.workflows/` live state (hardening follow-up).
- **doc-gate rule** — task packs whose Allowed Changes touch a doc surface (docs/, prompts/, skills/, agents/, README.md, CHANGELOG.md) extend `verify` with `just docs`.

### Decisions (20261030-046)
- `just` adopted as the single command surface; scripts stay canonical (recipes wrap, never reimplement); agent-ci rejected on Docker cost (one-shell-job CI) — origin note in CHANGELOG.
- CI runs ci-lite until the suite state-hardening plan ships; `just ci` (full gates incl. suite) stays the local/pre-push gate.
- The judge (typesafe System One) stays out of just recipes and gate chains — recipes are deterministic exit codes; judge flags/routes only (execution-doctrine).

### Glossary (plan 20261031-047)
- **requireLiveState** — tests helper: warns `SKIPPED (state absent): <what>` + test.skipIf when gitignored `.workflows/` live state is absent; live-consistency suites route through it. Fresh checkouts: 214/11-skip/0 fail.
- **guard --spec <file>** — per-spec guard form; multi-spec dir mode counts skip-only lifecycles as failing (upstream quirk — backlog: skip-aware route call).
- **FOLLOW-UP-TABLE** — reporting standard: # / Item / Problem (plain words) / Impact if unfixed / Risk (P0–P3) / Effort (S/M/L) / Fix shape; ≤7 columns; rows are facts, cite the evidence trail (templates/FOLLOW-UP-TABLE.md).
- **repo-truth cross-checks / repo-faithful layouts** — authoring standards: content-fact scenarios cite repo checks; reviewer probe briefs mirror real repo layout (templates/CONTRACT-FORMAT.md, skills/review/SKILL.md).

### Glossary (plan 20261031-048)
- **evidenceVerdict / exampleVerdict** — pure functions (proof-ledger.mjs): pass requires ≥1 independent (runner ≠ owner) replayable-confirmed check; unreplayable never counts as passed (origin: kwant missions/mod.rs:359, foundry.rs:636).
- **runner taxonomy** — worker | reviewer | orchestrator; recorded via --runner; historical rows read as worker (not independent).
- **specGuardSupport probe** — contract gate probes agent-spec --spec support once per process; 0.2.7 lacks it → aggregate --spec-dir form + loud degradation.


### Glossary (plan 20261123-075)
- **output policy** — deterministic four-boolean surface decision (`prose`, `statusTokens`, `table`, `diagram`): canonical prose and display-only status tokens always stand; tables and diagrams are earned by explicit thresholds; never image-only.
- **policy-authoritative artifact** — only the policy result may select table or diagram form; judge answers flag and route, never gate.
- **generated view** — additive SVG/PNG artifact with alt text, emitted after canonical text; never a replacement for judge-readable prose or the mandatory follow-up table.
- **OPEN_DIAGRAM_CLI** — environment override for the open-diagram executable; local venv path is only the default.


### Glossary (plan 20261124-081)
- **Rust structural gate** — generated Rust check wiring: Cargo.lock bootstrap, cargo metadata/tree/clippy, optional cargo-deny, then deslop-please; optional tools SKIP loudly with install hints.
- **Four-skill Rust family** — rust-review, rust-best-practices, rust-port, rust-crate-architecture; deslop-please is a CLI, not a Pi skill.
- **architectureGate marker** — draft-only top-level profile marker in brownfield Rust adopt drafts naming deslop-please and rust-analyzer; never a generated root allow file.
### Glossary (plan 20261125-judge-content-binding, decision 1)
- **content-bound judge question** — pre-flight question whose payload embeds the exact evidence it asks about; a path alone is not evidence.
- **v1 context binding** — one contract per judge call; repeatable `--context` paths are concatenated into every question; caps apply to the final translated payload; a cap breach is a loud skip before the network call, never a partial prompt.
- **yes-means-finding pre-flight** — v1 pre-flight uses five yes/no questions; `yes` means the named defect class is present, `no` means clear, and confidence is the judge's numeric probability.
- **spec-only context** — v1 judge context accepts regular UTF-8 `.spec` files under `.workflows/specs/` only; symlinks, other paths, and key-shaped files are rejected.
- **package-owned workflow scripts** — pi-workflows scripts stay in the installed package and are invoked through the `PI_WORKFLOWS_BIN` launcher; `/init` generates namespaced mise wrappers, never copies executable scripts into consumer `.workflows/`.
- **judge-context lint** — mechanical pre-flight gate: every spec path referenced by a question must be supplied as `--context`; a path-only question exits 1 and is never sent.
- **content-bound pre-flight** — contract pre-flight always embeds contract text; diff-bound evidence remains a Stage 2 `bench verdicts` route, not a pre-flight fallback.


### Glossary (plan 20261125-082, whole-plan sweep)
- **SHIP-owned churn** — CHANGELOG/version-bump paths introduced by a plan-complete commit; not worker-boundary drift and excluded from committed-slice boundary checks only.
- **mise-pinned suite** — canonical full test suite run as `mise exec -- bun test`; needed so docs-lint fixtures see pinned linters.
- **consumer-cwd context** — judge context paths resolve under the caller's repository root, not the installed package root; required for installed-package pre-flight.
- **non-vacuous context lint** — pre-flight question sets using the five finding ids require supplied context even when questions contain no path literals.


### Glossary (plan 20261127-083)
- **Read-only format gate** — mechanical `dprint check` on declared source includes; never writes files and never substitutes for reviewer judgment.
- **Formatter profile** — deterministic detector output naming id, exact read-only check command, evidence paths, and offer/skip status; written only after explicit owner approval.
- **Loud formatter SKIP** — missing formatter tool reported on stderr with exit 3 only when no other lint failure exists; never a PASS.
