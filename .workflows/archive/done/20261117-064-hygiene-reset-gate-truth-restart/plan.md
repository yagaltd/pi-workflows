# Plan: hygiene reset, gate truth, and the agent-spec cache spike

> Plan ID: 20261117-064
> Created: 20261117
> Owner: Aurel
> Status: DONE (shipped v0.15.0 — 20261117)

## Lifecycle

- IDs 055–063 are being back-filled by TASK 2 (they shipped without bundles), so the computed
  `(archive/done + archive/superseded) + 1` reaches 064 only after TASK 2 lands. Never reuse an ID.
- SHIP (TASK 8) sets Status: DONE and moves plan.md + specs/ + reviews/ to
  `.workflows/archive/done/20261117-064-<slug>/` after `bash scripts/check-archive.sh <dir>` passes.
- Decisions of record: DEC-003 amended by TASK 4; DEC-006 written by TASK 2; intake deferral in TASK 5.

## Context

- The 20261117 inspection found 8 defects. Three were already-shipped work that never got archived,
  three were gates wired to tools that are absent or nonexistent, two were repo housekeeping.
- Doctrine that this plan restores: *one live plan* (SHIP archives it), *a gate names a tool that
  exists*, and *documented commands are runnable*.
- Accepted risks (owner-approved at the gate): gaming/weakening/drift test-quality checks stay
  uncovered after the DEC-003 amendment; `bombadil` is not installed (web-UI property layer remains
  a recorded gap, never a silent pass).

## Exploration

See the 20261117 inspection: drift list 1–8, the `tdd-gate` availability probe (npm E404, no GitHub
project, not on PATH), the tool-availability probe (mise: lychee/harper-cli/markdownlint-cli2;
crates.io: cc-check 0.1.4, bombadil 0.5.1), and the agent-spec cache baseline
(`guard` 2 specs = 7.99 s, `lifecycle` = 2.83 s, no cross-run cache).

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK 1 | orchestrator-inline | Retire stale plan 061 into the archive | ⚪ STANDARD | — | 0 | — |
| TASK 2 | worker | Retro-archive 055–063 + DEC-006 | ⚪ STANDARD | example-based | 1 | TASK 1 |
| TASK 3 | worker | Drift gate: shipped plan id ⇒ archive dir | 🟠 VERIFICATION-HEAVY | example-based | 2 | TASK 2 |
| TASK 4 | worker | Amend DEC-003 to the gate that exists | 🔴 BLOCKING | example-based | 2 | — |
| TASK 5 | worker | Intake honesty (defer, stop documenting) | ⚪ STANDARD | example-based | 3 | TASK 4 |
| TASK 6 | worker | Make the docs-lint gate real (3 inert sections) | 🟠 VERIFICATION-HEAVY | example-based | 3 | — |
| TASK 7 | worker | Optional reviewer layers: run them or record the risk | 🟡 RISKY | example-based | 4 | TASK 4, TASK 6 |
| TASK 8 | orchestrator | SHIP: review, archive, commit, push, pi update | ⚪ STANDARD | — | 5 | TASK 2–7 |

TASK 3 and TASK 6 both touch `docs/architecture.md`, and TASK 5 also writes it → sequenced, not
parallel. Out-of-repo tracks (not dispatchable from this repo) live in `## Out-of-repo tracks`.

## Tasks

### TASK 1 (⚪ STANDARD, Tier A): Retire the stale live plan 061 into the archive
- **Agent**: orchestrator-inline
- **Wave**: 0
- **Depends On**: none
- **Bottleneck**: ⚪ STANDARD
- **Allowed**: .workflows/plan.md, .workflows/specs, .workflows/archive/done, .workflows/LOG.md
- **What**: plan 061 (shipped v0.14.18) sat in `.workflows/plan.md` in a non-TASK shape, so
  `dispatch_next` returned `no-tasks`. Archived it as
  `.workflows/archive/done/20261104-061-init-docs-consolidation/` (plan.md with Status: DONE,
  `specs/task-1.spec`, `specs/task-2.spec`, `reviews/plan-061.md`), removed the live plan, and
  verified with `check-archive.sh`.
- **Verify**: bash scripts/check-archive.sh .workflows/archive/done/20261104-061-init-docs-consolidation
- **Status**: ✅ DONE (orchestrator-inline, Tier A)

### TASK 2 (⚪ STANDARD, Tier B): Retroactive archive for 055-063 plus the gap ADR
- **Agent**: worker
- **Wave**: 1
- **Depends On**: TASK 1
- **Contract**: .workflows/specs/task-retro-archive.spec
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: example-based
- **Tier**: B
- **Allowed**: .workflows/archive/done, .workflows/decisions
- **What**: create one archive bundle per back-filled plan id (055, 056, 057, 058, 059, 060, 062,
  063) whose `plan.md` opens with a reconstruction header ("original plan text lost — reconstructed
  from CHANGELOG + LOG + review verdict"), then carries the CHANGELOG entry, the LOG lines and the
  review verdict; copy the review file. Write DEC-006 via `bash scripts/scaffold.sh adr` naming the
  gap, its cause, the rule *a shipped plan id without an archive dir is drift*, and the two
  accepted cosmetics (agent-spec remote named `fork`; `target/` symlinked into the mise cache).
- **Verify**: bash scripts/check-drift.sh && bun test
- **Skills**: none
- **Status**: ✅ DONE (verdict reviews/task-2.md ok:true, round 2)

### TASK 3 (🟠 VERIFICATION-HEAVY, Tier B): Drift gate for shipped plan ids and the archive gate's blind spot
- **Agent**: worker
- **Wave**: 2
- **Depends On**: TASK 2
- **Contract**: .workflows/specs/task-archive-drift-gate.spec
- **Bottleneck**: 🟠 VERIFICATION-HEAVY
- **Testing strategy**: example-based
- **Tier**: B
- **Allowed**: scripts/check-drift.sh, scripts/check-archive.sh, scripts/scaffold.sh, scripts/profile-lint.sh, .workflows/profile.json, templates/DECISION.md, tests/archive-drift.test.ts, tests/fixtures/archive-drift
- **What**: new `check-drift.sh` section — every `(plan <id>)` in the first 10 CHANGELOG entries must
  appear in a `.workflows/archive/{done,superseded}/*` dir name; skip loudly when the archive dir is
  absent (fresh clone). Also close the gap TASK 1 exposed: `check-archive.sh` counts only backticked
  spans, so a `## Docs impact` section whose paths are bare prose passes silently — make that a
  finding (paths must be backticked). Fixture pair (passing/failing) for both rules. Third rule, found by TASK 2's
  reviewer: every whitelisted durable-knowledge path under `.workflows/` must
  have ≥1 git-tracked file — `.gitignore` omitted `!.workflows/decisions/`, so
  the whole ADR ledger (DEC-001..005 + INDEX) was untracked and would vanish on
  a fresh clone; now fixed, and it must never recur silently. Fourth rule, found
  by TASK 2's worker: `scaffold.sh adr` emits `DEC-<nnn>-<name>.md` with an `# ADR-<nnn>:`
  heading, which `decisions.mjs` cannot parse (`^# (DEC-\d+):`) — the scaffold must emit the
  ledger's short-record shape and filename, pinned by a test. Scope extended by the
  orchestrator mid-task (owner-approved option 1): the honest fix lives in
  `.workflows/profile.json`, a ledger-shaped `templates/DECISION.md` and the
  `{{name}}`-only rule in `scripts/profile-lint.sh`, not in `scaffold.sh`, which
  already handles a `{{next:N}}`-only target. The gate-chain doc
  line rides TASK 8 (docs/architecture.md is orchestrator-owned).
- **Verify**: bash scripts/check-drift.sh && bun test
- **Status**: ✅ DONE (verdict reviews/task-3.md ok:true, round 3)

### TASK 4 (🔴 BLOCKING, Tier B): Amend DEC-003 to the test-quality gate that exists
- **Agent**: worker
- **Wave**: 2
- **Depends On**: none
- **Contract**: .workflows/specs/task-test-quality-gate.spec
- **Bottleneck**: 🔴 BLOCKING
- **Testing strategy**: example-based
- **Tier**: B
- **Allowed**: agents/reviewer.md, agents/worker.md, agents/execution-doctrine.md, agents/dispatch-shapes.md, extensions/index.ts, scripts/flow-gates.mjs, skills/plan/SKILL.md, skills/add-feature/SKILL.md, skills/fix/SKILL.md, templates/CONTRACT-FORMAT.md, .workflows/decisions, tests/extension.test.ts, tests/flows-gates.test.ts, tests/flow-gates-mise.test.ts
- **What**: DEC-003 named `tdd-gate`, which is not installable (npm E404, no GitHub project, not on
  PATH), so Layer 2 has always been inert. Amend to the tools that exist:
  `agent-spec lifecycle <spec> --code . --layers lint,boundary,test,tdd-guard` for the task gate and
  `tdd-guard lint` / `tdd-guard verify --spec <spec>` for a standalone run. Update
  `gateCommandsFor`, the auto-gate Layer 2 branch, `scripts/flow-gates.mjs` `testQualityCommands`,
  and the reviewer/`/fix`/`/refactor` doctrine lines. Record the accepted risk (gaming, weakening and
  drift checks stay uncovered) in the decision itself. Pin the new command and the absence of
  `tdd-gate` in the tests.
- **Verify**: bun test tests/extension.test.ts tests/flows-gates.test.ts && bash scripts/check-drift.sh
- **Status**: ✅ DONE (verdict reviews/task-4.md ok:true, round 3)

### TASK 5 (⚪ STANDARD, Tier A): Intake honesty for the deferred import command
- **Agent**: worker
- **Wave**: 3
- **Depends On**: TASK 4
- **Contract**: .workflows/specs/task-intake-honesty.spec
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: example-based
- **Tier**: A
- **Allowed**: prompts/idea.md, prompts/brainstorm.md, tests/intake, .workflows/decisions
- **What**: `agent-spec requirements import` is documented as live for `/idea` and `/brainstorm` but
  does not exist in the installed binary or the repo, and the fork it cites is gone. Remove the live
  instructions (emit the marked blocks, stop there), reframe `docs/architecture.md` Casual intake as
  deferred with the evidence, state plainly in `tests/intake/README.md` that the parser is absent,
  and record the deferral in a decision; TASK 8 reframes `docs/architecture.md`
  Casual intake (the worker edits the prompts and the intake README only).
- **Verify**: bun test
- **Status**: ✅ DONE (verdict reviews/task-5.md ok:true, round 2)

### TASK 6 (🟠 VERIFICATION-HEAVY, Tier B): Make the docs-lint gate real
- **Agent**: worker
- **Wave**: 3
- **Depends On**: none
- **Contract**: .workflows/specs/task-docs-lint-tools.spec
- **Bottleneck**: 🟠 VERIFICATION-HEAVY
- **Testing strategy**: example-based
- **Tier**: B
- **Allowed**: mise.toml, scripts/docs-lint.sh, docs
- **What**: pin `markdownlint-cli2 = "0.24.1"`, `lychee = "0.24.2"`, `harper-cli = "3.2.0"` in
  `mise.toml [tools]` (all verified in the mise registry) so sections 1–3 run instead of skipping.
  Size the findings first, then triage: fix structure and link findings, keep prose advisory via
  `DOCS_LINT_HARPER_ADVISORY=1` with the residual count recorded. Never re-introduce a silent skip. `docs/architecture.md` is excluded from this
  task (TASK 8 owns its prose); every other docs file may be fixed. Owner-approved follow-on
  (20261117, after TASK 6 sized the debt): enabling the three tools surfaces 1008 markdownlint +
  1325 harper + 3 lychee findings, 947 of them in paths this task may not touch (skills/, agents/,
  templates/, prompts/, README.md, AGENTS.md, docs/architecture.md). Landing the tools as an
  absolute gate would make `just ci` permanently red, so the gate becomes a **ratchet**: a
  committed per-file baseline of known findings, failing only on a NEW or INCREASED count, with
  the residual total printed on every run. The debt itself is a separate pay-down plan, not this
  one.
- **Verify**: bash scripts/docs-lint.sh && bun test
- **Status**: ✅ DONE (verdict reviews/task-6.md ok:true, round 3)

### TASK 7 (🟡 RISKY, Tier B): Optional reviewer layers, run or record the risk
- **Agent**: worker
- **Wave**: 4
- **Depends On**: TASK 4, TASK 6
- **Contract**: .workflows/specs/task-optional-layers.spec
- **Bottleneck**: 🟡 RISKY
- **Testing strategy**: example-based
- **Tier**: B
- **Allowed**: mise.toml, scripts/decisions.mjs, agents/reviewer.md, extensions/index.ts, CONTRACTS, templates/FOLLOW-UP-TABLE.md, .workflows/evals/golden, tests/extension.test.ts, .workflows/decisions
- **What**: `cc-check` (crates.io 0.1.4) into `mise.toml` via the `cargo:` backend and the reviewer's
  Layer 3 exercised against this repo's own `CONTRACTS`, which no machine has ever reviewed.
  `bombadil` (0.5.1) stays unpinned by owner decision — record it in a decision as an accepted gap
  and make `agents/reviewer.md` state what runs and what is skipped, so the gap is loud.
  Retirement sweep (found by TASK 4): the dead tool is still asserted in three places that no
  gate watches — the root `CONTRACTS` file (4 `@cc` entries against 7 in `extensions/index.ts`;
  nothing checks the sync), `templates/FOLLOW-UP-TABLE.md:42` (a historical worked example), and
  `.workflows/evals/golden/{deg-002,gate-002,gate-003}.json`, which still expect `tdd-gate` and
  would make the SHIP eval gate fail. Reconcile all three, and make CONTRACTS sync a gate (or a
  documented cc-check step) so it cannot drift again. Also close the hole TASK 3's reviewer found:
  `scripts/decisions.mjs:68` maps a non-`# DEC-<n>:` heading to `id=null` and still prints CLEAN,
  so a malformed ledger record is silently accepted.
- **Verify**: bun test && cc-check format CONTRACTS
- **Status**: ⬜ PENDING

### TASK 8 (⚪ STANDARD, Tier A): SHIP the larger update
- **Agent**: orchestrator
- **Wave**: 5
- **Depends On**: TASK 2–7
- **Bottleneck**: ⚪ STANDARD
- **Allowed**: .workflows/plan.md, CHANGELOG.md, docs/architecture.md, README.md, .workflows/archive/done
- **What**: `/review` (mechanical + quality) → CHANGELOG entry covering the `/restart` rename, the
  archive reset, the DEC-003 amendment, the intake deferral, the docs-lint tools, the optional
  layers and the `just` mise pin → `check-archive.sh` then move this bundle → golden eval case for
  the new drift section → commit + push → `pi update` so the installed package carries `/restart`.
- **Verify**: mise exec -- just ci
- **Status**: ⬜ PENDING

## Out-of-repo tracks (not dispatchable from here)

- **tdd-guard** (`~/Documents/github/tdd-guard`): restore the deleted tracked `dist/`
  (`npm install && npm run build`), `npm test`, `npm run lint`, relink so `tdd-guard --version`
  reads 0.1.1 (today 0.1.0 from `~/code/tdd-guard`), push the 4 local commits, one canonical clone.
- **agent-spec** (`~/Documents/github/agent-spec`): (a) promote `## Unreleased` (multibyte
  `parse_trailing_number` panic, `node --test` TAP) and install, so the gate is not the stale 0.2.7;
  (b) the cache spike — baseline first, invalidation test RED before any cache code, cache only
  passes keyed by `hash(spec, code-in-scope, layer, version)`, `--no-cache`, byte-identical
  equivalence, then re-measure. No new dependency (no ajika, no salsa).

## Docs impact

- `docs/architecture.md` — gate chain (11/12), Restart paragraph, Casual intake deferral
- `README.md` — regenerated command table (the resume-to-restart rename)
- `CHANGELOG.md` — the SHIP entry for plan 20261117-064
- `.workflows/decisions/DEC-003.md` — amended test-quality gate
- `.workflows/decisions/DEC-006.md` — the archiving gap
- `tests/intake/README.md` — importer marked absent
- `agents/reviewer.md` — domain-skill and optional-layer rules

## Execution Notes

- TASK 6 — ✅ DONE (verdict reviews/task-6.md ok:true, round 3)
  context: the three doc gates are pinned in `mise.toml` (markdownlint-cli2 0.24.1, lychee 0.24.2,
  harper-cli 3.2.0) and all seven sections now RUN with per-section outcome accounting
  (ran/advisory/failed/skipped, four summary lines, `CLEAN — … with N section(s) not run`). The
  absolute gate became a **ratchet**: `scripts/docs-lint-baseline.json` holds a per-file budget
  (markdownlint 1011/64, lychee 2, harper 1121 buckets), a new file or an increased count fails
  naming the file and both numbers, equal/lower passes printing the residual, and
  `--write-baseline` is byte-identical on an unchanged tree. An existing-but-broken tool is
  `failed: unusable` (the mise-shim case that had been reported as findings); absent is `skip`.
  Round 2 was rejected because the lychee lane flaked on npmjs's anti-bot 403 (measured 0/1/0);
  the fix is a deterministic documented host rule with a printed drop, proven by five consecutive
  clean runs, and a real 404 still fails.

- TASK 5 — ✅ DONE (verdict reviews/task-5.md ok:true, re-review)
  context: the live `agent-spec requirements import` instruction is gone from both prompts — they
  emit marked blocks and stop at the human approval gate, stating the command does not exist in the
  installed 0.2.7 binary and that nothing may be verified or claimed imported; `tests/intake/README.md`
  is retitled a FORMAT RECORD with a "why nothing here runs" section, keeping the block syntax,
  attribute rules and id validation verbatim as the spec a future importer must satisfy; DEC-007
  records the deferral with `docs/architecture.md` in its Scope. Round 1 was rejected on two
  contract-level defects the orchestrator had written (a criterion demanding a `docs/` grep its own
  Boundaries forbid; a verify line gated on TASK 6's pre-existing red) — both amended, the diff
  itself never changed.

- TASK 4 — ✅ DONE (verdict reviews/task-4.md ok:true, re-review #2)
  context: DEC-003 amended in place (Amended-by 20261117-064) to `agent-spec lifecycle <spec>
  --code . --layers lint,boundary,test,tdd-guard` + `tdd-guard lint|verify`, with the accepted
  risk recorded (gaming/weakening/drift uncovered; absent tool = SKIP, never a pass); every
  emitter and doctrine line updated (`gateCommandsFor`, auto-gate Layer 2, flow-gates
  testQualityCommands, four agent files, three skills, CONTRACT-FORMAT); `grep tdd-gate` over
  agents/extensions/scripts/skills/templates = 0; 8 red-first pins, 6 of 10 proven failing against
  base. Two round rejections were orchestrator edits (an out-of-Allowed doc row, then its literal
  token) — fixed at the source, never waived. Carried to SHIP: README/docs still name the retired
  tool, and guard's worktree-scope check is a silent false-green inside subagent worktrees.

- TASK 1 — ✅ orchestrator-inline (Tier A, no reviewer node).
  context: archived
  `.workflows/archive/done/20261104-061-init-docs-consolidation/` (plan.md status flipped to DONE,
  both specs, `reviews/plan-061.md`); live `.workflows/plan.md` removed; `check-archive.sh` exit 0
  (backtick caveat discovered here → folded into TASK 3's scope); no production files touched.

- TASK 2 round 1 — ❌ reviewer verdict ok:false: the eight bundles and the
  archive gate passed (8/8 `check-archive.sh` exit 0, drift CLEAN, 389 tests /
  380 pass / 9 skip / 0 fail), but the ADR criterion failed at the root cause —
  `.gitignore` ignored `.workflows/decisions/`, so no DEC could ever be
  committed (`git ls-files .workflows/decisions` = 0; the ledger existed only
  as untracked files in the main checkout).
  context: orchestrator fixed the
  one-line whitelist (`!.workflows/decisions/`) and audited every other durable
  path (all tracked; decisions was the only zero); the fix and the new gate
  rule are recorded on TASK 3, and TASK 2 re-runs as a fix round once the
  bootstrap is committed.

- TASK 2 — ✅ reviewer verdict ok:true (round 2).
  context: eight reconstruction bundles for
  055, 056, 057, 058, 059, 060, 062, 063 (each `plan.md` with the reconstruction header +
  `> Plan ID:` + backticked `## Docs impact`, plus its review verdict byte-identical), DEC-006
  indexed, 8/8 `check-archive.sh` exit 0, drift CLEAN, 383/9/0 suite in the worktree, merged
  `--no-ff`. Round 1 was rejected at the root cause recorded above; the fix (gitignore
  whitelist, commit 4c13428) is what made the ledger committable at all.

- TASK 3 — ✅ reviewer verdict ok:true (round 3).
  context: `check-drift.sh` gained sections 11
  (archive coverage: every `(plan <id>)` in the first 10 CHANGELOG entries has a bundle, loud skip
  on a fresh clone) and 12 (durable knowledge: every whitelisted `.workflows` path is git-tracked,
  plus the ledger parses); `check-archive.sh` now fails a prose-only `## Docs impact`;
  `scaffold.sh adr` renders ledger records via `templates/DECISION.md` +
  `.workflows/profile.json`, with `profile-lint.sh` accepting `{{name}}` OR `{{next:N}}` targets
  (reject case pinned). 18 new tests, every rule mutation-proven. Round 2 was rejected on a P0
  failing test whose fixture never materialised its own premise; the fix strengthened the
  assertion instead of bending it.
