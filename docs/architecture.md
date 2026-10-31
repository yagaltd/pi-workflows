---
generated_by: pi-workflows plan lifecycle
generated_at: 2026-10-29
stale_after: 2026-11-28
---

# Architecture

How pi-workflows works: the flow, the gates that enforce it, and the
machinery behind the commands. The shop-window view lives in
[README.md](../README.md); shipped history lives in
[CHANGELOG.md](../CHANGELOG.md) (discipline: `templates/DOCS-POLICY.md`;
docs canon: `docs/canon.md`). Machine-checkable truth lives in
`.workflows/specs/*.spec` — this doc is reader-facing prose.

## The flow

```
IDEA ──► SCOUT ──► PLAN ──► APPROVE ──► CONTRACTS ──► EXECUTE ──► VERIFY ──► QUALITY REVIEW ──► DOCS ──► SHIP
          (cheap)    (architect)   (you)   (generated)  (worker)    (mechanical)  (judgment)        (cheap) (you)
                      bottlenecks   🛑       .spec        dispatch_next  agent-spec     + security         /docs
                      testing        GATE    files        picks the      + tdd-gate     + simplicity       auto-check
                      interview*                          task; /next    + project        + error handling
                      (chat)                              ×N /auto-next  checks           + human callouts
                                                                                          (🔴/🟡/🟠 only)

* interview happens in chat — one blocking question at a time, payload per the grill protocol
```

The EXECUTE→VERIFY junction is one graph call: the reviewer node `needs` the
worker and fires automatically. Which task runs next is decided by the
extension's `dispatch_next` tool — deterministic code (the model's own
reading of the plan is never the selector — gate: `tests/extension.test.ts`).
QUALITY REVIEW is
tag-gated per-task; `/review` is the whole-plan quality gate. After a context
restart, `/resume` rebuilds state from `bash scripts/resume-digest.sh` before
anything dispatches.

## Gates — verdict gating: no model marks its own work done

Each worker task goes through checkpoints that agents cannot skip — the engine
enforces the sequencing, not the model's memory:

```
ONE subagent graph call: tasks [worker, reviewer(needs: worker)]
  → worker implements (TDD, self-verifies) — settling is NOT completion
  → reviewer fires MECHANICALLY when the worker settles (needs edge,
    zero orchestrator turns) — mechanical pipeline, tier-scaled dispatch
     → ok:true  → ✅ in plan.md (only the orchestrator writes it)
     → ok:false → FIX ROUND: worker re-dispatched with the rejection evidence
                  verbatim → re-review → … capped at the spec's max-rounds
                  (default 2), then ❌ + verdict chain to you
  → quality gate (judgment): tag-gated per-task — 🔴/🟡/🟠 only,
     standalone follow-up after mechanical ok:true; NEVER per-wave
```

Reviewer dispatch cost scales with task traits (docs-tier → low thinking;
security/concurrency/parsing/external-input traits → strongest model + xhigh)
per the registry **verification policy** (gate: `agents/registry.md`) —
complexity scales the reviewer's cost, never the verdict's existence (gate:
`agents/registry.md`). A failed worker auto-aborts its reviewer node — that
abort is the orchestrator's failure signal; broken work is never reviewed (gate: `agents/execution-doctrine.md`).

Two record-keeping steps are extension-owned, not prompt prose: a FINAL
verdict write auto-records the proof-ledger entry and the run-journal event
(deduped per task:round), and the wave's last verdict triggers wave-settle
compaction — one fixed-size judge table injected into leader context, 64-cap
split with a per-child fallback when the judge is skipped (gate:
`tests/extension.test.ts`). Verdicts persist to
`.workflows/reviews/<task>.md` — the fixer cites them, `/review` audits the
trail, SHIP archives them. Reviewers verify, never fix (gate:
`agents/reviewer.md`); workers never write plan.md — the orchestrator is the
single writer (gate: `agents/worker.md`).

## Three hard rails

| Rail | What it enforces | How |
|---|---|---|
| **Contract** | Did we build the right thing? | agent-spec: BDD scenarios + boundary checks — mechanical, non-negotiable (`agent-spec guard`) |
| **Adversarial** | Did we introduce bugs or vulnerabilities? | bug-hunter: Recon → Hunter → Skeptic → Referee — optional, recommended (skill: `skills/`-installed bug-hunter) |
| **Quality** | Is the code maintainable? | quality-reviewer: simplicity, security, error handling — judgment-based (gate: `agents/quality-reviewer.md`) |

## Reviewer integrity

Three rules every dispatch
must enforce for mechanical verification to be trustworthy (gate:
`agents/execution-doctrine.md`):

1. **bash non-optional** — the reviewer role explicitly lists `bash` in its
   toolset (gate: `agents/registry.md`); dispatching a reviewer without bash
   is a dispatch bug, and the role itself VOIDs mechanical layers that depend
   on execution (gate: `agents/reviewer.md` Step 0b).
2. **VOID rule** — a reviewer whose bash tool is missing or unusable
   must never certify borrowed evidence as PASS (gate: `agents/reviewer.md`
   Step 0b): any execution-dependent layer run via sibling report is VOID —
   `ok: false` with `VOID: <layer list>`; static/reading layers (decisions
   verification, boundary reads) may still pass.
3. **Verify-after-edit** — worker verification counts as evidence only after
   the final file edit: counts (test steps, file tallies) come from a
   post-edit run, never from memory or a pre-edit run (gate:
   `agents/worker.md`).

## Contracts (generated after approval, then kept honest)

`/plan`/`/idea` write the plan first, stop for approval, THEN generate
`.spec` contracts for every worker task. After that, `/next` keeps them
honest: before executing a task it re-validates its contract against what was
actually built, and after each task it updates the next 1-2 downstream
contracts from learnings (significant changes go back to you first).

Why:
- **Human approves contracts, not code** — you review the plan + contracts once, upfront
- **Fresh context** — downstream contracts absorb learnings from completed tasks
- **No silent drift** — a contract that no longer matches reality is updated and logged, never ignored (gate: `prompts/next.md` contract re-validation)

Everything else (coding guidelines, architecture preferences) is a **soft
rail** — instructions that guide but cannot force.

**Format authority: [`templates/CONTRACT-FORMAT.md`](../templates/CONTRACT-FORMAT.md)** — loaded at plan Phase 5; the shape:

Tasks in `.workflows/plan.md` reference `.spec` files. You review the
contract; the worker implements against it. A plan entry:

```markdown
### TASK 2: Add Redis client module
- **Agent**: worker
- **Depends on**: TASK 1
- **Contract**: .workflows/specs/task-redis-client.spec
- **Bottleneck**: 🔴 BLOCKING
- **Testing strategy**: example-based
- **Status**: ⬜ PENDING
```

The `.spec` file:

```spec
spec: task
name: "Redis cache module"
tags: [cache, redis]
---

## Intent

Add a Redis-backed cache layer for API responses with TTL support.

## Decisions

- Use `redis` crate (already in Cargo.toml)
- Cache key format: `<service>:<resource>:<id>`
- Default TTL: 300 seconds

## Boundaries

### Allowed Changes
- src/cache/**
- src/cache.rs
- tests/cache/**

### Forbidden
- Do not modify existing API handlers
- Do not change the Redis connection pool configuration

## Completion Criteria

Scenario: Set and get cached value
  Test: test_cache_set_then_get_returns_value
  Given Redis is connected
  When I set key "api:user:123" to value "{\"name\":\"Alice\"}" with TTL 300
  Then get("api:user:123") returns "{\"name\":\"Alice\"}"

Scenario: Cache miss returns None
  Test: test_cache_get_nonexistent_key_returns_none
  Given Redis is connected
  When I get key "api:user:999" that does not exist
  Then the result is None
```

## Durable rules (code contracts)

Scope: code-local invariants only — the `CONTRACTS` file holds nothing
else: never requirements (home: `.workflows/specs/*.spec`), never
narrative (home: `docs/`, ADRs, `.workflows/` decision trace).

A `.spec` answers "is this task done?"; `@cc` code contracts answer "what
must stay true forever?" (gate: `CONTRACTS` at the repo root). `@cc` directives
annotate public seams (exported functions, classes, methods) and feed the root
`CONTRACTS` file — the durable rules layer, an **ADD layer** — it never replaces the `.spec`'s task-done authority (gate: `CONTRACTS`). `cc-check format` is the
reviewer's Layer 3 syntax gate (skipped when cc-check or the contracts are
absent); `cc-check list` output rides dispatch packs and populates each
`.spec`'s `## Applicable contracts` section, matched by the task's Allowed
Changes files. The extension's supersede watchdog fires one static advisory
line when a diff touches an `adr:`-attributed contract's file, or a spec's
decisions change with no new ADR — advisory only, flags route to you, the
human (gate: `tests/extension.test.ts`).

- `adr:<n>` on a `@cc` links the contract to the ADR that governs it.
- Live example: [`CONTRACTS`](../CONTRACTS) at the repo root — pi-workflows' own durable rules, dogfooded.

## Planning

Phase 5 contract generation runs a two-step mechanical gate before the human
approval gate: `agent-spec parse` (syntax) then
`scripts/check-spec-selectors.sh` (parse-only `bash -n` + grep-flag sanity on
every `Test:` selector — findings are fix-or-justify). A Jev-based
spec-sanity pre-pass was trust-tested and rejected (both known-bad selectors
false-passed: the defects are repo-dependent, invisible from spec text alone
— evidence in `.workflows/spikes/spec-sanity/report.md`); redesign candidates
on file.

`/init` generates the machine-readable project profile
(`.workflows/profile.json`) at bootstrap and validates its own output before
handing off: `scripts/agents-lint.sh AGENTS.md` +
`scripts/profile-lint.sh .workflows/profile.json` run at generation, and a
lint failure blocks the handoff (gate: `scripts/profile-lint.sh`, wired in
`skills/init/SKILL.md`).

**Task tiers** (decided at plan time, routed via the registry): every task
carries a tier next to it in plan.md — **Tier A** mechanical (small,
grep-verifiable: `@model:standard` + low thinking, grep-only review or done
orchestrator-inline), **Tier B** bounded (normal module + tests under
contract, full mechanical review pipeline), **Tier C** spike/architecture
(`@model:strong` + high thinking, **serial — never in a parallel group** — gate: `agents/registry.md`;
verdict artifact before any production code). The tier is assigned in the
plan's adversarial pass, never by the worker (gate: `skills/plan/SKILL.md`).

**Delegated drafting pipeline** — plans draft faster and review cheaper via
**scout facts → strong-model draft → adversarial split/risk pass →
spec-drafter fan-out → human gate**: a scout writes facts to
`.workflows/scout/<plan-id>.md` (cite-able `file:line`), a strong-model
subagent drafts against them, the orchestrator grills the draft
(single-surface inventory, seam hunt, per-task tier), then one
**spec-drafter** subagent per decision turns each decision verbatim into a
house-format `.spec`, mechanically reviewed for disjoint, task-scoped
boundaries before your approval. Hand-writing stays the fallback — ≥2-wave
plans default to the fan-out (gate: `agents/spec-drafter.md`).

## Agents

Roles are dispatched inline per call (no agent files) — model + thinking come
from `agents/registry.md`, driven by the task's bottleneck tag (model empty =
inherit your session's model):

| Role | Thinking default | Purpose |
|---|---|---|
| `scout` | low | Fast codebase recon with structured output. Read-only. |
| `worker` | medium (xhigh if 🔴, high if 🟡) | TDD vertical slices within contract boundaries. Reports blockers + mandatory Domain Memory section. |
| `reviewer` | per verification-policy tier (docs: low → high-risk: strongest model + xhigh) | Mechanical verification only, ends with a binding Verdict (`ok: true/false`). No judgment, never fixes. Fired automatically via the `needs` edge when the worker settles. |
| `quality-reviewer` | medium | Judgment review after mechanical pass, ends with a Verdict. Per-task, 🔴/🟡/🟠 tags only. Security, simplicity, error handling. |
| `bug-hunter` | high | Adversarial pipeline (Recon → Hunter → Skeptic → Referee) — dispatched as a subagent from `/next` and `/review`. |

**How subagents run**: always in-process, inside your session, via the
pi-core-subagent extension — no extra tooling required. **Optional — herdr**:
if you use the herdr terminal (TUI workspace manager), a whole wave can be
delegated to a *child pi session* in its own terminal tab (wave delegation),
so your orchestrating session pays only 5-line summaries instead of the
wave's traffic. herdr is never required (gate: `agents/dispatch-shapes.md`) —
without it, waves run in-process exactly the same way.

## The extension (mechanical enforcement)

pi-workflows ships a small TypeScript extension (`extensions/index.ts`, the
package's only runtime code, unit-tested) that enforces the package's own
conventions so the prompts can stay lean:

- **`@role:<name>` resolution**: subagent calls that pass
  `prompt: "@role:worker"` get the verbatim `agents/<name>.md` body
  substituted at execution time — the orchestrator never reads or pastes role files (gate: `tests/extension.test.ts`).
  An unresolved reference blocks the
  call with a clear reason (typo-proof dispatches).
- **`dispatch_next` tool**: registered, model-callable. The extension reads
  plan, registry, and reviews itself and returns the binding
  task/pack/gateCommands — the manual registry-map build and the inline
  `bun -e` script are gone from the prompts; the model handles exceptions
  only (BLOCKED, NEEDS_CONTEXT, parallelism confirmation). Selection rules
  are fixture-asserted in `bun test`.
- **Verdict automation**: a FINAL verdict write auto-records the proof-ledger
  entry + run-journal event (deduped per task:round) — the record steps left
  the prompts (gate: `tests/extension.test.ts`).
- **Wave-settle compaction**: the wave's last verdict triggers the judge and
  injects the fixed-size verdict table into leader context (64-cap split;
  `JUDGE SKIPPED` ⇒ per-child fallback; gate: `tests/extension.test.ts`).
- **Hygiene watchdog**: the moment plan.md has ✅ tasks missing `context:`
  markers or final `ok:true` verdicts on file, a one-line reminder injects
  into the next turn — drift surfaces when it happens, not at `/review`.
- **Docs-drift watchdog** (per the docs policy): code files committed after
  README.md's last update while a plan is executing → README staleness
  reminder; `docs/*.md` older than recent code changes → staleness reminder;
  plan complete but not SHIPped → CHANGELOG-entry reminder. Git-based, one
  reminder per drift episode (no spam), degrades gracefully outside git.
- **Intent-guard hook**: user prompts (not `/commands`) under a live plan
  with tasks get one judge classification (gate:
  `scripts/intent-guard.mjs`, DEC-001) — suggest-only routing, never
  auto-executed, fails open (see [Intent-guard hook](#intent-guard-hook)).

The extension is the dispatch authority: without it, `dispatch_next` does not
exist and the thin `/next` trigger has nothing to call — prompts stay lean
because the enforcement is mechanical (gate: `bun test`, 225 tests).

**Repo gate chain**: `scripts/check-drift.sh` runs ten drift sections on
every commit (`.githooks/pre-commit`) and push (CI) — sections 8/9/10 wire
the doctrine lints: `scripts/agents-lint.sh` (AGENTS.md core + pointers +
budget), `scripts/profile-lint.sh` (profile schema + repo facts), and
`scripts/metric-gates.sh` (complexity + duplication thresholds from
`.workflows/profile.json`; mutation tiered behind `--with-mutation`, absent
tools skip gracefully). `bash scripts/scaffold.sh <kind> <name>` renders
profile-declared artifacts (ADR entries first; kinds validated by
profile-lint; gate: `scripts/profile-lint.sh`).

## Bottleneck tags

Every task gets a tag that changes execution strategy:

| Tag | When | What changes |
|---|---|---|
| 🔴 BLOCKING | Others depend on this. Must succeed first. | Strongest model, human review after (gate: `agents/registry.md`) |
| 🟡 RISKY | Approach uncertain. Might fail. | Prototype first, then build |
| 🔵 TIME_CONSUMING | Large but straightforward. | Break into smaller steps |
| 🟠 VERIFICATION_HEAVY | Needs extensive testing. | Budget extra verification time |
| ⚪ STANDARD | Normal task. | Default flow |

## Testing strategy matrix

Assigned per task based on code type:

| Code type | Strategy | When |
|---|---|---|
| API / CLI command | example-based (agent-spec BDD) | Most tasks |
| Domain logic (math, parsing) | property-based (fast-check, proptest) | Pure functions |
| External input handler | fuzz + example-based | Parsing user data |
| Web UI | example-based + browser-automation subagent | Browser tasks |
| State machine | stateful property tests | Complex state transitions |
| Simple CRUD | example-based only | Boilerplate |

## Worker blocker protocol

When a worker cannot proceed, it outputs a structured `WORKER_BLOCKER` instead
of failing silently (gate: `agents/worker.md`):

```
WORKER_BLOCKER:
{
  "status": "blocked",
  "reason": "missing_dependency | missing_secret | invalid_contract | ...",
  "evidence": "<what was found>",
  "requestedAction": "<what the human should do>"
}
```

`/next` handles each blocker: rewrites invalid contracts, asks for
clarification, or escalates to you.

## Quality pipeline

```
ARCHITECT (your session model)
    │
    ├── Structured interview to gather requirements
    ├── /challenge: adversarial grill, updates .workflows/CONTEXT.md inline
    ├── Writes .workflows/plan.md: atomic tasks, bottleneck tags, testing strategies
    └── Generates .spec contracts (after human approves plan)
    │
    ▼
WORKER + REVIEWER — ONE graph call (needs edge: reviewer fires mechanically)
    │
    ├── Worker: reads contract → TDD vertical slices (RED → GREEN → refactor)
    │   self-verifies · reports WORKER_BLOCKER if stuck + mandatory Domain
    │   Memory · NEVER commits — the uncommitted diff is the reviewer's ground truth
    ▼
    Reviewer (mechanical — thinking per verification-policy tier):
    ├── agent-spec lifecycle (scenarios)
    ├── agent-spec guard (boundaries)
    ├── Project checks (tests, lint, types, build)
    └── Binding Verdict: ok:true → ✅ · ok:false → fix round (capped)
    │      verdict write auto-records proof + journal; wave's last verdict
    │      triggers wave-settle compaction (extension-owned)
    ▼
ADVERSARIAL (bug-hunter subagent — after code changes, and at /review on the whole diff)
    │
    └── Recon → Hunter → Skeptic → Referee, scan-only
    │
    ▼
QUALITY-REVIEWER (subagent, medium thinking, judgment — per-task, 🔴/🟡/🟠 only)
    │
    ├── Simplicity (unnecessary abstractions)
    ├── Security (untrusted input, injection)
    ├── Error handling (swallowed errors, silent failures)
    ├── Surgical changes (no scope creep)
    └── Human callouts (new deps, auth changes, migrations)
    Empty review = clean code = success. Verdict → fix rounds, same cap.
    (⚪ tasks skip this gate — mechanical verdict + /review suffice; never per-wave.)
```

(The orchestrator — not the worker — writes plan.md statuses/learnings and
updates CONTEXT.md from the worker's Domain Memory report.)

## Cost strategy

Model + thinking are set **per subagent task at dispatch time** via the
`agents/registry.md` ladder (bottleneck tag → model/thinking). Spend tokens
on reasoning, not model names:

```
scout / recon:                inherit model, low thinking
standard tasks:               cheap/fast model, medium thinking
risky + blocking tasks:       strong model, high/xhigh thinking
visual verification:          vision model (image input), medium — screenshot saved
                              to disk, read-only child reads the image and reports
reviewer:                     per verification-policy tier — docs: low thinking;
                              standard: medium-high; security/concurrency/
                              parsing/external-input: strongest model + xhigh
quality-reviewer:             inherit, medium (🔴/🟡/🟠 tasks only)
```

Cost and duration come from subagent usage stats, logged by the orchestrator
to `.workflows/plan.md` after each task. `/status` aggregates from those
entries. `@model:<role>` references resolve from `models/registry.json` at
dispatch time — an unresolvable role falls back with a loud WARN — never silently (gate: `agents/registry.md` → Model resolution).

## The doc-drift gate

`scripts/docs-lint.sh` lints the repository's human-facing Markdown in five
sections: markdownlint-cli2 (structure), lychee (links), harper-cli (prose —
downgradable to advisory via `DOCS_LINT_HARPER_ADVISORY=1`), and two drift
sections: **stamps** and **claim-to-gate** (gate: `scripts/docs-lint.sh`).

**Stamps** — a doc declaring `generated_by` must carry `generated_at` + `stale_after`; an expired `stale_after` date fails (gate: `scripts/docs-lint.sh` stamps section).

**Claim-to-gate** — imperative claims in AGENTS.md and docs/ (must, must not, never) name their gate on the same line; missing = finding with file:line (gate: `scripts/docs-lint.sh` claims section).

Tools absent ⇒ skip with a warning, never a silent pass (gate:
`scripts/docs-lint.sh`). Optional pre-push hook:
`bash scripts/install-git-hooks.sh` runs the linter before every push — not
wired by default.

## Casual intake

`/idea` and `/brainstorm` emit typed candidate requirement blocks to
`.workflows/intake/<date>-<slug>.md` (fork marked-block format), verified with
`agent-spec requirements import --from <file> --check --out <rendered-dir>`
(drift-gate semantics: byte-exact render round-trip). Import runs only on
explicit human approval of specific blocks; rejected blocks stay annotated in
the intake file. Governance: post-import transitions are the fork's explicit
human commands (gate: `.workflows/intake/` + the fork's requirements CLI).

## Judge

**Judge client** — `scripts/judge.mjs ask --questions <set.json> --audit
<file>`: posts typed question sets to the typesafe System One API
(`/v1/systemone`, `jev-latest`; yes/no questions become noul, option
questions become choice, answers carry confidence + probabilities;
64-question cap). Key chain: `TYPESAFE_API_KEY` env → `~/.pi/agent/auth.json`
`.typesafe.key`. Optional env: `TYPESAFE_BASE_URL`, `TYPESAFE_MODEL`,
`TYPESAFE_TIMEOUT_MS`. This is the repository's single judge client — every
judge call (decision steps, intent guard, format chooser, wave-settle,
close-out settle) goes through it.

**Semantics** — judges flag and route — never pass or fail (gate:
`scripts/judge.mjs`). Contract
pre-flight runs after Phase 5 contract generation (findings feed drafter fix
rounds before the approval ask); wave-settle compaction prints a fixed-size
verdict table into leader context (triggered in-extension by the wave's last
verdict). Low-confidence verdicts escalate to the human.

**Degradation** — no key or unreachable endpoint ⇒ `JUDGE SKIPPED
(<reason>)`, write proceeds, audit records the skip. The NO-JUDGE path is the
regression-tested default (gate: `scripts/eval-golden.mjs`, degradation
cases).

## Dispatcher and auto-gate

**Dispatcher** — `/next` and `/auto-next` are thin triggers. The extension's
`dispatch_next` tool (backed by `resolveNext()`) deterministically resolves
the next eligible task from `.workflows/plan.md` (statuses, Wave, Depends On,
`tdd:` flag, tiers), assembles the context pack (shared prefix first —
cache-affinity ordering), and returns the gate command list. The model
handles exceptions only: BLOCKED, NEEDS_CONTEXT, parallelism confirmation.
Selection rules are fixture-asserted in `bun test` (gate:
`scripts/eval-golden.mjs`, dispatcher cases via `scripts/eval-dispatch-probe.ts`).

**Auto-gate hook** — write-time enforcement. Editing a file inside a live
plan's Allowed Changes runs Layer 1 (agent-spec checks: contract, lifecycle,
guard) then Layer 2 (test-quality checks: tdd-gate gaming/drift) and blocks
the write on violation with the failing layer + command + findings.
Skip-only verifier results are an accepted limitation (proceed + note —
backlog item 11); toolchain absent ⇒ deduped advisory, write proceeds;
docs-only `.md` writes are exempt; inert without a live plan (gate:
`tests/extension.test.ts`).

**Restart** — `/resume` runs the read-only 7-section digest
(`bash scripts/resume-digest.sh`: plan status, dispatcher context, LOG tail,
budget, dirty paths, gates snapshot from `.workflows/profile.json`, recent
commits) and acts on it; missing profile degrades to defaults with a note
(gate: `scripts/resume-digest.sh`).
