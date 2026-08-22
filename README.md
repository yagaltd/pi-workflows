# pi-workflows

<p align="center">
  <img src="asset/cover.png" alt="pi-workflows" width="100%">
</p>

Contract-driven multi-model workflow for [pi](https://github.com/mariozechner/pi-coding-agent).

**Describe what you want. Agents plan, build, and verify through enforceable contracts.**

## Install

```bash
pi install git:github.com/yagaltd/pi-workflows
```

Restart pi. All commands appear in `/` autocomplete.

## Quick Start

```
/idea I want to add caching to the API 
         → you describe what you want
         → scouts codebase, writes .workflows/plan.md
         → you review and approve
         → contracts generated automatically
     
/next    → implements TASK 1 against contract, self-verifies
/next    → implements TASK 2 against contract, self-verifies
/status  → check progress + cost

/review  → mechanical verification + quality review
         → all green? ship it.
```

Two modes: `/next` × N (step by step) or `/auto-next` (fire and forget).

Then finish with `/review` → all green? ship it.

## Commands

### Starting work

| Command | What it does |
|---|---|
| `/init <description>` | Bootstrap a project: architecture design + approved folder tree + charter + README skeleton → hands off to `/plan`. Contract Boundaries derive from the documented tree. |
| `/brainstorm <topic \| resume>` | Divergent research mode: think together, evidence-validate idea branches, living markmap ledger in `.workflows/research/`. No code, no specs. Graduates to `/explore` or `/idea`. |
| `/idea <description + repos/URLs>` | Productize idea: explore evidence → grill unresolved decisions → write `.workflows/plan.md` → stop for approval → generate `.spec` contracts |
| `/plan <description>` | Plan only — you already have context. Writes plan.md with bottleneck tags, then generates contracts after approval. |
| `/explore <question>` | Research / kill / prototype. No production plan unless asked. Prototypes land in `.workflows/spikes/<slug>/` (poc + VERDICT.md, GO/NO-GO + evidence). |
| `/audit [scope] [--security]` | Codebase map + adversarial pre-scan → `.workflows/knowledge/map.md` + findings that feed `/plan`. Before planning on existing/unfamiliar code. |
| `/amend <change>` | Update existing `.workflows/plan.md` and specs when decisions change. |
| `/status` | Show plan progress, cost summary, bottleneck breakdown, duration stats. |

### Executing

| Command | What it does |
|---|---|
| `/next` | Execute next pending task. Bottleneck-aware: adjusts model/thinking per task. Handles worker blockers. |
| `/auto-next` | Execute ALL pending tasks autonomously — runs waves in order, parallelizes within waves, stops on blockers, reports completion. |
| `/add <feature-or-spec>` | Execute approved contract. Broad ideas route to `/idea`; small surgical requests get mini-recon + contract gate. |
| `/fix <bug>` | Fix a bug within boundaries. Accepts error text, spec files, annotations, screenshots. |
| `/refactor <scope>` | Restructure code within boundaries |
| `/optimize <target>` | Three modes: parallel experiments (unknown approach) · contracted deep pass (known target, equivalence proof) · pi-autoresearch loop handoff (known target, many unattended iterations — benchmark + oracle prepared from our contract vocabulary) |

### Verification

| Command | What it does |
|---|---|
| `/verify` | Full mechanical suite: agent-spec lifecycle + guard + project checks. Short-circuits on fail. |
| `/review` | Stage 1: mechanical verification (agent-spec + project checks). Stage 2: adversarial review (bug-hunter) + quality review (judgment). |
| `/challenge <plan>` | Adversarial grill of your plan against domain model. Sharpens terminology, updates .workflows/CONTEXT.md inline. |
| `/contract [spec]` | Show the contract for a task |
| `/scout <area>` | Isolated recon. Cheapest, no planning. |

### Documentation

| Command | What it does |
|---|---|
| `/docs [area]` | Generate/update project docs |
| `/docs all` | Generate full doc set (architecture, decisions, onboarding) |

### Prototyping

| Command | What it does |
|---|---|
| `/prototype <theories>` | Run parallel A/B/C prototypes (backend or UI branch), benchmark, keep the winner |

## User Journeys

**Adding a feature?**
```
/idea Add caching to the API
  → explores evidence, grills unresolved decisions, writes plan
  → you review and approve → contracts generated
/next × N    → implements each task, one at a time
/auto-next   → runs all tasks autonomously
/review      → verifies everything
```

**Starting from scratch?**
```
/init Freelancer task manager — TypeScript, Vite, node:test
  → architecture + folder tree designed and approved BEFORE any build
  → charter + README skeleton + scaffolded tree
/brainstorm I want a task manager for freelancers
  → divergent rounds: market, competitors, differentiation branches
  → evidence via research subagents, markmap ledger in .workflows/research/
  → branches validated/invalidated; frontier questions ranked
  → graduate the winning hypothesis:
/idea Build a REST API for task management
  → explores repo/docs first, then asks only unresolved framework/auth/database choices
  → writes plan → you approve → contracts generated
/next × N → /review → ship
/auto-next → fire and forget
```

**Bug?**
```
/fix The auth tests are failing on CI
  → builds feedback loop, reproduces, ranks hypotheses, fixes, adds regression test
```

**UI bug?**
```
/fix (paste the error, attach a screenshot, or describe what looks wrong)
  → browser-automation subagent inspects the page (selectors, styles, a11y)
  → agent maps selectors to source files, fixes, asks you to re-verify
```

**Existing codebase needs attention?**
```
/explore What's the state of error handling in this codebase?
  → researches, finds issues, recommends: proceed / pivot / kill
/idea Fix the error handling issues found
  → writes plan + contracts → /next × N → /review
```

**Improve something?**
```
/optimize API response latency
  → picks a mode: parallel experiments (unknown approach) ·
    contracted deep pass (equivalence proof) · autoresearch loop
    (unattended iterations: benchmark + oracle prepared, then handoff)
```

**Try multiple approaches?**
```
/prototype approach A vs approach B
  → parallel workers build minimal proofs-of-concept
  → each benchmarks and reports results
/add integrate approach A
  → production integration with full verification
```

## How It Works

### The flow

```
IDEA ──► SCOUT ──► PLAN ──► APPROVE ──► CONTRACTS ──► EXECUTE ──► VERIFY ──► QUALITY REVIEW ──► DOCS ──► SHIP
          (cheap)    (architect)   (you)   (generated)  (worker)    (mechanical)  (judgment)        (cheap) (you)
                      bottlenecks   🛑       .spec        /next ×N    agent-spec     + security         /docs
                      testing        GATE    files        /auto-next  + tdd-guard     + simplicity       auto-check
                      interview*                        needs graph  + project        + error handling
                                                         executor     checks           + human callouts
                                                                                      (🔴/🟡/🟠 only)

* interview happens in chat — one blocking question at a time, payload per the grill protocol
```

The EXECUTE→VERIFY junction is one graph call: the reviewer node `needs` the
worker and fires automatically. QUALITY REVIEW is tag-gated per-task; `/review`
is the whole-plan quality gate.

### Gates — verdict gating: no model marks its own work done

Each worker task goes through checkpoints that agents **cannot skip** — the engine enforces the sequencing, not the model's memory:

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
security/concurrency/parsing/external-input traits → strongest model +
xhigh) per the registry **verification policy** — complexity scales the
reviewer's cost, never the verdict's existence. A failed worker
auto-aborts its reviewer node — that abort is the orchestrator's failure
signal (never review broken work).

Verdicts persist to `.workflows/reviews/<task>.md` — the fixer cites them, `/review` audits the trail, SHIP archives them. Reviewers verify, never fix; workers never write plan.md — the orchestrator is the single writer.

### Three hard rails

| Rail | What it enforces | How |
|---|---|---|
| **Contract** | Did we build the right thing? | agent-spec: BDD scenarios + boundary checks — mechanical, non-negotiable |
| **Adversarial** | Did we introduce bugs or vulnerabilities? | bug-hunter: Recon → Hunter → Skeptic → Referee — optional, recommended |
| **Quality** | Is the code maintainable? | quality-reviewer: simplicity, security, error handling — judgment-based |

### Reviewer integrity

Three rules every dispatch must enforce for mechanical verification to be trustworthy:

1. **bash non-optional** — the reviewer role explicitly lists `bash` in its toolset
   (`agents/registry.md`). Dispatching a reviewer without bash is a dispatch bug;
   the role itself VOIDs mechanical layers that depend on execution (see
   `agents/reviewer.md` Step 0b).
2. **VOID rule** — a reviewer whose bash tool is missing or unusable MUST NEVER
   certify borrowed evidence as PASS. Any execution-dependent layer run via
   sibling report is VOID: `ok: false` with `VOID: <layer list>`.
   Static/reading layers (decisions verification, boundary reads) may still pass.
3. **Verify-after-edit** — worker verification counts as evidence ONLY after the
   final file edit. Counts (test steps, file tallies) must come from a post-edit
   run, never from memory or a pre-edit run (`agents/worker.md`).

### Contracts (generated after approval, then kept honest)

`/plan`/`/idea` write the plan first, stop for approval, THEN generate `.spec` contracts for every worker task. After that, `/next` keeps them honest: before executing a task it re-validates its contract against what was actually built, and after each task it updates the next 1-2 downstream contracts from learnings (significant changes go back to you first).

Why:
- **Human approves contracts, not code** — you review the plan + contracts once, upfront
- **Fresh context** — downstream contracts absorb learnings from completed tasks
- **No silent drift** — a contract that no longer matches reality is updated and logged, never ignored

Everything else (coding guidelines, architecture preferences) is a **soft rail** — instructions that guide but can't force.

### Planning

**Task tiers** (decided at plan time, routed via the registry): every task carries
a tier next to it in plan.md — **Tier A** mechanical (small, grep-verifiable:
`@model:standard` + low thinking, grep-only review or done orchestrator-inline),
**Tier B** bounded (normal module + tests under contract, full mechanical review
pipeline), **Tier C** spike/architecture (`@model:strong` + high thinking,
**serial — never in a parallel group**, verdict artifact before any production
code). The tier is assigned in the plan's adversarial pass, never by the worker.

**Delegated drafting pipeline** — plans draft faster and review cheaper via
**scout facts → strong-model draft → adversarial split/risk pass → spec-drafter
fan-out → human gate**: a scout writes facts to `.workflows/scout/<plan-id>.md`
(cite-able `file:line`), a strong-model subagent drafts against them, the
orchestrator grills the draft (single-surface inventory, seam hunt, per-task
tier), then one **spec-drafter** subagent per decision turns each decision
verbatim into a house-format `.spec`, mechanically reviewed for disjoint,
task-scoped boundaries before your approval. Hand-writing stays the fallback —
≥2-wave plans default to the fan-out.

### Agents

Roles are dispatched inline per call (no agent files) — model + thinking come from `agents/registry.md`, driven by the task's bottleneck tag (model empty = inherit your session's model):

| Role | Thinking default | Purpose |
|---|---|---|
| `scout` | low | Fast codebase recon with structured output. Read-only. |
| `worker` | medium (xhigh if 🔴, high if 🟡) | TDD vertical slices within contract boundaries. Reports blockers + mandatory Domain Memory section. |
| `reviewer` | per verification-policy tier (docs: low → high-risk: strongest model + xhigh) | Mechanical verification only, ends with a binding Verdict (`ok: true/false`). No judgment, never fixes. Fired automatically via the `needs` edge when the worker settles. |
| `quality-reviewer` | medium | Judgment review after mechanical pass, ends with a Verdict. Per-task, 🔴/🟡/🟠 tags only. Security, simplicity, error handling. |
| `bug-hunter` | high | Adversarial pipeline (Recon → Hunter → Skeptic → Referee) — dispatched as a subagent from `/next` and `/review`. |

**How subagents run**: always in-process, inside your session, via the
pi-core-subagent extension — no extra tooling required. **Optional — herdr**:
if you use the herdr terminal (TUI workspace manager), a whole
wave can be delegated to a *child pi session* in its own terminal tab
(wave delegation), so your orchestrating session pays only 5-line summaries
instead of the wave's traffic. herdr is never required — without it, waves
run in-process exactly the same way.

### The extension (mechanical enforcement)

pi-workflows ships a small TypeScript extension (the package's only runtime
code, unit-tested) that enforces the package's own conventions so the
prompts can stay lean:

- **`@role:<name>` resolution**: subagent calls that pass
  `prompt: "@role:worker"` get the verbatim `agents/<name>.md` body
  substituted at execution time — the orchestrator never reads or pastes
  role files. An unresolved reference **blocks the call** with a clear
  reason (typo-proof dispatches).
- **Hygiene watchdog**: the moment plan.md has ✅ tasks missing `context:`
  markers or final `ok:true` verdicts on file, a one-line reminder injects
  into the next turn — drift surfaces when it happens, not at `/review`.
- **Docs-drift watchdog** (per the docs policy): code files committed
  after README.md's last update while a plan is executing → README
  staleness reminder; `docs/*.md` older than recent code changes →
  staleness reminder; plan complete but not SHIPped → CHANGELOG-entry
  reminder. Git-based, one reminder per drift episode (no spam),
  degrades gracefully outside git. On this very repo it flagged the
  historical README-lag episode at 14 stale files, one commit into
  the lag instead of four commits later.

Without the extension everything still works (prompts instruct manual
role-file pasting) — the extension removes the failure mode mechanically.

### Bottleneck tags

Every task gets a tag that changes execution strategy:

| Tag | When | What changes |
|---|---|---|
| 🔴 BLOCKING | Others depend on this. Must succeed first. | Strongest model, human review after |
| 🟡 RISKY | Approach uncertain. Might fail. | Prototype first, then build |
| 🔵 TIME_CONSUMING | Large but straightforward. | Break into smaller steps |
| 🟠 VERIFICATION_HEAVY | Needs extensive testing. | Budget extra verification time |
| ⚪ STANDARD | Normal task. | Default flow |

### Testing strategy matrix

Assigned per task based on code type:

| Code type | Strategy | When |
|---|---|---|
| API / CLI command | example-based (agent-spec BDD) | Most tasks |
| Domain logic (math, parsing) | property-based (fast-check, proptest) | Pure functions |
| External input handler | fuzz + example-based | Parsing user data |
| Web UI | example-based + browser-automation subagent | Browser tasks |
| State machine | stateful property tests | Complex state transitions |
| Simple CRUD | example-based only | Boilerplate |

### Worker blocker protocol

When a worker cannot proceed, it outputs a structured `WORKER_BLOCKER` instead of failing silently:

```
WORKER_BLOCKER:
{
  "status": "blocked",
  "reason": "missing_dependency | missing_secret | invalid_contract | ...",
  "evidence": "<what was found>",
  "requestedAction": "<what the human should do>"
}
```

`/next` handles each blocker: rewrites invalid contracts, asks for clarification, or escalates to you.

### Quality pipeline

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
    │
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

(The orchestrator — not the worker — writes plan.md statuses/learnings and updates CONTEXT.md from the worker's Domain Memory report.)

### Cost strategy

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

Cost and duration come from subagent usage stats, logged by the orchestrator to `.workflows/plan.md` after each task. `/status` aggregates from those entries.

## Contract Format

Tasks in `.workflows/plan.md` reference `.spec` files. You review the contract; the worker implements against it.

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

## Coding Guidelines (Karpathy)

Workers follow these behavioral rules:

1. **Think Before Coding** — state assumptions, surface tradeoffs, ask if uncertain
2. **Simplicity First** — minimum code, no speculative features, no unnecessary abstractions
3. **Surgical Changes** — touch only what you must, match existing style
4. **Goal-Driven Execution** — define success criteria, loop until verified
5. **Fail-Fast Error Handling** — propagate errors, don't swallow, crash over silent degradation

## Review Rubric

The quality-reviewer uses a structured rubric with priority levels:

| Priority | Meaning |
|---|---|
| **P0** | Drop everything to fix. Blocking release/operations. |
| **P1** | Urgent. Should be addressed in the next cycle. |
| **P2** | Normal. Fix eventually. |
| **P3** | Low. Nice to have. |

Review covers: security, error handling, simplicity, human callouts (new deps, auth changes, migrations).

Add a `.workflows/REVIEW_GUIDELINES.md` to your project root for project-specific rules. The quality-reviewer loads it automatically. See `templates/REVIEW_GUIDELINES.md` for a starter template.

## Skills

| Skill | Phases | Contract |
|---|---|---|
| `explore` | DEFINE → SCOUT → SYNTHESIZE → PROTOTYPE | No (read-only) |
| `plan` | UNDERSTAND → INTERVIEW → DECOMPOSE → WRITE CONTRACTS → WRITE PLAN → REVIEW → HAND OFF | Generates contracts |
| `add-feature` | SPEC → RECON → BUILD → VERIFY (3-layer) → PRESENT | Implements against contract |
| `fix` | REPRODUCE → DIAGNOSE → FIX → VERIFY (3-layer) → PREVENT | Within boundaries |
| `refactor` | ASSESS → EXECUTE → VERIFY → PRESENT | Behavior preservation contract |

## Requirements

Required:

- [pi](https://github.com/mariozechner/pi-coding-agent) >= 0.60
- [@arhen/pi-core-subagent](https://www.npmjs.com/package/@arhen/pi-core-subagent) >= 0.1 — in-process subagents: parallel / chain / graph (`needs` edges), per-task `model` + `thinking`, intercom, steering
- [agent-spec](https://github.com/ZhangHanDong/agent-spec) — contract verification (BDD specs + boundary enforcement)

```bash
pi install npm:@arhen/pi-core-subagent
cargo install --git https://github.com/ZhangHanDong/agent-spec
```

Optional (all degrade gracefully with a note when absent):

- [tdd-guard](https://github.com/yagaltd/tdd-guard) — test-quality gate: `tdd-guard lint` (static test analysis) + `tdd-guard verify --spec` (tests cover contract decisions/boundaries/selectors). Used in the reviewer pipeline. Install (not on npm):
  ```bash
  git clone https://github.com/yagaltd/tdd-guard && cd tdd-guard && npm install && npm link
  ```
- [bombadil](https://github.com/antithesishq/bombadil) — property-based testing for web and terminal UIs (Antithesis): autonomously explores the running app in a managed browser and validates correctness properties. Assigned to 🟠 VERIFICATION_HEAVY web UI tasks when installed (`bombadil test <origin> --exit-on-violation`). Install: see [the Bombadil Manual](https://antithesishq.github.io/bombadil/browser/2-getting-started.html#installation).
- [pi-autoresearch](https://github.com/davebcn87/pi-autoresearch) — for `/optimize` mode 3 (unattended loop): `/optimize` prepares `.auto/` session files (measure.sh with METRIC output, checks.sh equivalence oracle as keep-backpressure, prompt.md scope) and hands off; closes with autoresearch-finalize → `/review`
- [bug-hunter](https://github.com/nicobailon/bug-hunter) skill — adversarial scan at `/next` (code changed) and `/review` (whole diff)

### Configure models

Model and thinking are set **per subagent task, at dispatch time** (no
agent files, no prompt frontmatter). The orchestrator reads
`agents/registry.md` — the dispatch policy table mapping each task's
bottleneck tag to `model` + `thinking`:

| Bottleneck | model | thinking |
|---|---|---|
| 🔴 BLOCKING | strongest available | xhigh |
| 🟡 RISKY | strong | high |
| 🟠 VERIFICATION_HEAVY | default | medium + full-suite `Verify:` |
| ⚪ STANDARD | cheap/fast | medium |
| visual verification | vision (`@model:vision`, image input) | medium |
| scout | cheap | low |
| reviewer | inherit | high (xhigh for 🔴) |
| quality-reviewer | inherit | medium |

Roles leave `model` empty (inherit the parent session's model) unless the
tag says otherwise — `thinking` is validated against the resolved model's
supported levels, so a bad pairing fails loudly instead of silently.

Edit `agents/registry.md` in the installed package (or override the table in
your project) to change the ladder. There are no `subagents.agentOverrides`
settings anymore — the dispatch policy IS the override.

> **Prefs are positional**: `families[i]` maps to role slot `i` in order
> standard, strong, reviewer, scout, vision. Five slots — e.g.
> `deepseek-flash, deepseek-pro, deepseek-pro, deepseek-flash,
> deepseek-flash-vision` gives scout the cheap model and routes visual
> verification to the vision model. Fewer entries fall back to the last one.

### Model registry

The orchestrator resolves `@model:<role>` references from
`models/registry.json` at dispatch time — no hardcoded model IDs in policy
code. To scan or update:

1. **Scan** — `node scripts/models-scan.mjs` fetches OpenRouter models live,
   matches families to roles via `models/registry.json` prefs, and writes back
   a fresh registry with pricing and `resolvedAt` timestamps.
2. **Edit preferences** — edit `models/registry.json` → `prefs` to change
   the family list or providers (`deepseek-api`, `openrouter`). Re-running the
   scan picks up the new prefs. The role → model binding is derived from
   prefs + live scan, never hand-written.
3. **Offline keeps last** — if the live fetch fails (network unavailable, API
   down), the script prints a `WARN` and exits 1, leaving the registry
   byte-identical. Previous resolutions survive until the next successful scan.
4. **`@model:<role>` refs** — dispatch shapes and policy tables reference
   `@model:standard`, `@model:strong`, `@model:reviewer`, `@model:scout`.
   These resolve against the registry at dispatch time. An unresolvable role
   falls back to a legacy constant and prints a WARN naming the role and the
   fallback — never silent.

See `agents/registry.md` → **Model resolution** for the fallback contract and
`scripts/models-scan.mjs` for the implementation.

## Directory Structure

```
pi-workflows/
├── package.json
├── README.md
├── CHANGELOG.md
├── .githooks/pre-commit         # runs scripts/check-drift.sh on every commit
├── .github/workflows/ci.yml     # drift check on every push/PR
├── scripts/check-drift.sh       # views-vs-sources drift checker (exit 1 on drift)
├── extensions/index.ts        # @role: substitution at dispatch + hygiene watchdog (unit-tested)
├── tests/extension.test.ts    # pure-logic tests for the extension
├── agents/                   # role prompts — resolved mechanically via `@role:`
│   ├── registry.md           # dispatch policy: roles + verification-policy tiers (traits → reviewer model/thinking)
│   ├── execution-doctrine.md # verdict gating + fix rounds + quality placement + reviews/ format (on demand)
│   ├── dispatch-shapes.md    # parallel wave / scout / bug-hunter call shapes (on demand)
│   ├── worker.md              # TDD vertical slices, contract verification, blocker protocol
│   ├── scout.md               # structured codebase recon, domain memory
│   ├── reviewer.md            # mechanical agent-spec + project checks, binding Verdict
│   └── quality-reviewer.md    # P0-P3 rubric, security, error handling, binding Verdict
├── templates/
│   ├── AGENTS.md              # project charter — installed by /init (binds all sessions); authoring rules in DOCS-POLICY.md
│   ├── CONTRACT-FORMAT.md    # .spec contract template + writing rules (loaded at plan Phase 5)
│   ├── DOCS-POLICY.md        # README/CHANGELOG/docs/ discipline: what goes where, update gates, SHIP steps
│   ├── THINKING-TOOLS.md      # five whys · six hats · impact×effort matrix
│   ├── REVIEW_GUIDELINES.md   # starter template for project-specific rules
│   ├── CONTEXT.md / CONTEXT-FORMAT.md  # domain glossary seed + how to maintain it
│   └── ADR.md / ADR-FORMAT.md # architecture decision record template + format
├── skills/
│   ├── challenge/SKILL.md     # adversarial grill, updates .workflows/CONTEXT.md inline
│   ├── explore/SKILL.md       # research + synthesize + prototype
│   ├── init/SKILL.md         # project bootstrap: architecture + folder tree + charter + docs skeleton
│   ├── brainstorm/SKILL.md    # divergent research mode, markmap ledger
│   │   └── references/         # ledger-format · dispatch-shapes · resume-protocol (on demand)
│   ├── idea/SKILL.md          # evidence → decision tree → plan + contracts
│   ├── plan/SKILL.md          # decompose into atomic tasks + contracts
│   ├── add-feature/SKILL.md   # approved contract → build → verify
│   ├── amend/SKILL.md         # update plan/specs when decisions change
│   ├── fix/SKILL.md           # feedback loop → fix + regression test
│   ├── refactor/SKILL.md      # restructure with behavior preservation
│   ├── docs/SKILL.md          # generate/update project docs
│   ├── optimize/SKILL.md      # measurement-gated deep optimization (baseline, equivalence oracle, delta floors)
│   └── docs-check/SKILL.md    # validate doc freshness
└── prompts/
    ├── idea.md                # /idea — explore + grill + plan + contracts
    ├── plan.md                # /plan — decompose from existing context
    ├── challenge.md           # /challenge — adversarial grill against domain model
    ├── explore.md             # /explore — parallel multi-angle research
    ├── audit.md               # /audit — codebase map + adversarial pre-scan
    ├── brainstorm.md           # /brainstorm — divergent research, markmap ledger
    ├── amend.md               # /amend — update plan/specs
    ├── add.md                 # /add — execute approved contract
    ├── fix.md                 # /fix — reproduce, diagnose, fix, verify
    ├── refactor.md            # /refactor — restructure, preserve behavior
    ├── optimize.md            # /optimize — experiments / deep pass / autoresearch handoff
    ├── review.md              # /review — verify + adversarial + quality review
    ├── verify.md              # /verify — full mechanical suite
    ├── contract.md            # /contract — show contract for a task
    ├── next.md                # /next — waves, verdict gating, fix rounds, blockers
    ├── auto-next.md           # /auto-next — autonomous full-plan execution
    ├── status.md              # /status — progress + cost + context-marker hygiene
    ├── debug.md               # /debug — hypothesis-driven investigation
    ├── prototype.md           # /prototype — parallel A/B/C (backend or UI)
    ├── abort.md               # /abort — abandon plan → archive/superseded
    └── docs.md                # /docs — generate/update project documentation
```

## Help

### Starting work

| Command | What it does |
|---|---|
| `/init <description>` | Bootstrap: architecture + folder tree + charter + docs skeleton → `/plan` |
| `/idea <description + repos/URLs>` | Productize idea: explore → grill decisions → plan → specs → approval |
| `/plan <description>` | Decompose into tasks + contracts |
| `/explore <question>` | Research / kill / prototype, no production planning (cheap) |
| `/audit [scope]` | Codebase map + adversarial pre-scan → knowledge/map.md |
| `/amend <change>` | Update existing plan/specs when decisions change |
| `/status` | Show plan progress + cost summary (cheap) |
| `/abort` | Abandon the live plan → archive to `.workflows/archive/superseded/` |

### Executing

| Command | What it does |
|---|---|
| `/next` | Execute next task (reads contract first) |
| `/add <feature-or-spec>` | Execute approved contract; broad ideas route to `/idea` |
| `/fix <bug>` | Diagnose with feedback loop, fix within boundaries |
| `/refactor <scope>` | Restructure code, behavior preserved |
| `/optimize <target>` | Three modes: experiments · deep pass · autoresearch loop |

### Prototyping

| Command | What it does |
|---|---|
| `/prototype <theories>` | Parallel mini-prototypes to test approaches |

### Verification

| Command | What it does |
|---|---|
| `/contract [spec]` | Show contract for a task |
| `/verify` | Full mechanical suite: agent-spec lifecycle + guard + project checks |
| `/review` | Mechanical verification + adversarial (bug-hunter) + quality review |

### Documentation

| Command | What it does |
|---|---|
| `/docs [area]` | Generate/update project docs (cheap dispatch) |
| `/docs all` | Generate full doc set |

### Delegated

| Command | What it does |
|---|---|
| `/scout <area>` | Cheap subagent recon |

### Flow

`/idea` → `/challenge` (grill plan) → approve plan → `/next` × N (verdict-gated, fix rounds) → `/review` → SHIP (commit + archive) — or `/abort` to archive as superseded

SHIP archives consumed specs to `.workflows/archive/done/<plan-id>/specs/` (reviewers see only live specs), and every plan carries a single-writer status line (`Status: DRAFT|DISPATCHED|EXECUTED|SHIPPED`) — only the orchestrator writes it.
- 2026-08-22 LIVE-VERIFY-130: worktree write landed (branch + diffstat reported, GUARD passed in-worktree).