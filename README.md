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
         → scouts codebase, writes plan.md with contracts
         → you review and approve
     
/next    → implements TASK 1 against contract, self-verifies
/next    → implements TASK 2 against contract, self-verifies
/status  → check progress + cost

/review  → mechanical verification + quality review
         → all green? ship it.
```

Three steps: `/idea` → `/next` × N → `/review`. That's the loop.

## Commands

### Starting work

| Command | What it does |
|---|---|
| `/idea <description + repos/URLs>` | Productize idea: explore evidence → grill unresolved decisions → write `plan.md` + `.spec` contracts → stop for approval |
| `/plan <description>` | Plan only — you already have context. Generates contracts with bottleneck tags + testing strategies. |
| `/explore <question>` | Research / kill / prototype. No production plan unless asked. |
| `/amend <change>` | Update existing `plan.md` and specs when decisions change. |
| `/status` | Show plan progress, cost summary, bottleneck breakdown, duration stats. |

### Executing

| Command | What it does |
|---|---|
| `/next` | Execute next pending task. Bottleneck-aware: adjusts model/thinking per task. Handles worker blockers. |
| `/add <feature-or-spec>` | Execute approved contract. Broad ideas route to `/idea`; small surgical requests get mini-recon + contract gate. |
| `/fix <bug>` | Fix a bug within boundaries. Accepts error text, spec files, annotations, screenshots. |
| `/refactor <scope>` | Restructure code within boundaries |
| `/optimize <target>` | Autoresearch loop: benchmark → iterate → keep winners |

### Verification

| Command | What it does |
|---|---|
| `/verify` | Full mechanical suite: agent-spec lifecycle + guard + project checks. Short-circuits on fail. |
| `/review` | Stage 1: mechanical verification (agent-spec + project checks). Stage 2: adversarial review (bug-hunter) + quality review (judgment). |
| `/challenge <plan>` | Adversarial grill of your plan against domain model. Sharpens terminology, updates CONTEXT.md inline. |
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
  → explores evidence, grills unresolved decisions, writes plan + contracts
  → you review and approve
/next × N    → implements each task
/review      → verifies everything
```

**Starting from scratch?**
```
/idea Build a REST API for task management
  → explores repo/docs first, then asks only unresolved framework/auth/database choices
  → writes plan + contracts
  → you approve
/next × N → /review → ship
```

**Bug?**
```
/fix The auth tests are failing on CI
  → builds feedback loop, reproduces, ranks hypotheses, fixes, adds regression test
```

**UI bug?**
```
/fix (with pi-annotate)
  → user annotates broken elements with screenshots + selectors
  → agent maps selectors to source files, fixes, asks for re-annotate
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
  → autoresearch loop: benchmark, iterate, keep winners
```

**Try multiple approaches?**
```
/prototype approach A vs approach B
  → parallel workers build minimal proofs-of-concept
  → each benchmarks and reports results
/integrate approach A
  → production integration with full verification
```

## How It Works

### The flow

```
IDEA ──► SCOUT ──► PLAN ──► EXECUTE ──► VERIFY ──► QUALITY REVIEW ──► DOCS ──► SHIP
          (cheap)    (architect) (worker)   (mechanical)  (judgment)      (cheap) (you)
                      contracts   /next ×N   agent-spec   + security       /docs
                      bottleneck             + tdd-guard   + simplicity     auto-check
                      testing                + project      + error handling
                      interview*             checks         + human callouts

* interview uses pi-interview when installed, falls back to chat
```

### Gates — worker tasks are verified before moving on

Each worker task goes through multiple checkpoints that agents **cannot skip**:

```
Worker implements the task
  → Contract gate: did we build the right thing? (agent-spec lifecycle)
  → Boundary gate: did we change only allowed files? (agent-spec guard)
  → Adversarial gate: did we introduce bugs? (bug-hunter scan)
  → Quality gate: is the code clean? (quality-reviewer judgment)
```

Short-circuits on first failure. Worker gets failure evidence and retries. You never see a broken task silently passing.

### Three hard rails

| Rail | What it enforces | How |
|---|---|---|
| **Contract** | Did we build the right thing? | agent-spec: BDD scenarios + boundary checks — mechanical, non-negotiable |
| **Adversarial** | Did we introduce bugs or vulnerabilities? | bug-hunter: Recon → Hunter → Skeptic → Referee — optional, recommended |
| **Quality** | Is the code maintainable? | quality-reviewer: simplicity, security, error handling — judgment-based |

### JIT contracts

Contracts are written just-in-time: only for the next 1-2 tasks, not the whole plan upfront. The architect writes the first batch during planning. `/next` writes the rest as tasks become eligible.

Why:
- **Fresh context** — contracts incorporate learnings from completed tasks
- **No waste** — if the plan changes mid-run, unused contracts are never written
- **Adaptability** — later contracts adjust based on what worked or didn't

After each task completes, `/next` writes ahead: JIT contracts for the next 1-2 eligible tasks, using learnings from the task that just finished.

Everything else (coding guidelines, architecture preferences) is a **soft rail** — instructions that guide but can't force.

### Agents

| Agent | Model | Purpose |
|---|---|---|
| `scout` | deepseek/deepseek-v4-flash (high) | Fast codebase recon with structured output |
| `worker` | deepseek/deepseek-v4-flash (xhigh) | TDD vertical slices within contract boundaries. Reports blockers. |
| `reviewer` | zai/glm-5.1 (low) | Mechanical verification only. No judgment. |
| `quality-reviewer` | deepseek/deepseek-v4-pro (xhigh) | Judgment-based review after mechanical pass. Security, simplicity, error handling. |
| `bug-hunter` | (external skill) | Adversarial bug hunting pipeline (Recon → Hunter → Skeptic → Referee) |

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
| Web UI | example-based + pi-annotate / bombadil | Browser tasks |
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
ARCHITECT (xhigh model)
    │
    ├── Structured interview to gather requirements
    ├── /challenge: adversarial grill, updates CONTEXT.md inline
    ├── Writes plan.md: atomic tasks, bottleneck tags, testing strategies
    └── Writes JIT contracts for first 1-2 tasks only
    │
    ▼
WORKER (xhigh model, subagent)
    │
    ├── Reads contract → TDD vertical slices (RED → GREEN → refactor per scenario)
    ├── Self-verifies: agent-spec lifecycle → project checks
    ├── Reports WORKER_BLOCKER if stuck
    ├── Logs cost + duration + learnings to plan.md
    ├── Updates CONTEXT.md with domain decisions
    └── Writes ahead: JIT contracts for next 1-2 tasks
    │
    ▼
REVIEWER (cheap model, subagent)
    │
    ├── agent-spec lifecycle (scenarios)
    ├── agent-spec guard (boundaries)
    └── Project checks (tests, lint, types, build)
    Stops on first failure. No judgment.
    │
    ▼
ADVERSARIAL (optional subagents)
    │
    ├── bug-hunter: staged scan for bugs and vulnerabilities
    └── open-code-review: line-level AI review with position tracking
    │
    ▼
QUALITY-REVIEWER (medium model, judgment)
    │
    ├── Simplicity (unnecessary abstractions)
    ├── Security (untrusted input, injection)
    ├── Error handling (swallowed errors, silent failures)
    ├── Surgical changes (no scope creep)
    └── Human callouts (new deps, auth changes, migrations)
    Empty review = clean code = success.
```

### Cost strategy

```
CHEAP   (explore/scout/status/docs):      cheap model + low thinking
MEDIUM  (fix/quality-reviewer):           medium model + medium thinking
FULL    (plan/build/refactor):            strongest + high thinking
CURRENT (optimize):                       whatever you're on
```

Cost and duration are estimated by the agent after each task and logged to plan.md. Not metered by pi — the agent reports its own estimate based on token usage visible in the session. `/status` aggregates from plan.md entries.

## Contract Format

Tasks in `plan.md` reference `.spec` files. You review the contract; the worker implements against it.

```markdown
### TASK 2: Add Redis client module
- **Agent**: worker
- **Depends on**: TASK 1
- **Contract**: specs/task-redis-client.spec
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

Add a `REVIEW_GUIDELINES.md` to your project root for project-specific rules. The quality-reviewer loads it automatically. See `templates/REVIEW_GUIDELINES.md` for a starter template.

## Skills

| Skill | Phases | Contract |
|---|---|---|
| `explore` | DEFINE → SCOUT → SYNTHESIZE → PROTOTYPE | No (read-only) |
| `plan` | UNDERSTAND → INTERVIEW → DECOMPOSE → WRITE CONTRACTS → WRITE PLAN → REVIEW → HAND OFF | Generates contracts |
| `add-feature` | SPEC → RECON → BUILD → VERIFY (3-layer) → PRESENT | Implements against contract |
| `fix` | REPRODUCE → DIAGNOSE → FIX → VERIFY (3-layer) → PREVENT | Within boundaries |
| `refactor` | ASSESS → EXECUTE → VERIFY → PRESENT | Behavior preservation contract |

## Requirements

- [pi](https://github.com/mariozechner/pi-coding-agent) >= 0.60
- [pi-subagents](https://github.com/nicobailon/pi-subagents/) >= 0.17.2 — parallel and chain execution
- [pi-prompt-template-model](https://github.com/nicobailon/pi-prompt-template-model) >= 0.9.2 — per-command model/thinking control
- [agent-spec](https://github.com/yagaltd/agent-spec) — contract verification (BDD specs + boundary enforcement)
Install the gate CLI:

```bash
cargo install --git https://github.com/yagaltd/agent-spec
```

Optional testing/verification:

- [bombadil](https://github.com/antithesishq/bombadil) — property-based web UI testing
- [pi-interview](https://github.com/nicobailon/pi-interview-tool) — structured interview forms for unresolved decisions
- [pi-annotate](https://github.com/nicobailon/pi-annotate) — visual annotation and edit capture for UI review/fixes
- [pi-boomerang](https://github.com/nicobailon/pi-boomerang) — token-efficient autonomous execution and context collapse for long approved tasks
- [pi-autoresearch](https://github.com/davebcn87/pi-autoresearch) — for `/optimize`

Install optional UX helpers:

```bash
pi install npm:pi-interview
pi install npm:pi-annotate
pi install pi-boomerang
```

### Optional extension guidance

- Use `interview()` for 2-7 independent unresolved questions after repo/docs search. Use one-by-one grill for dependent decision trees. Never ask questions answerable from code/docs.
- Use `annotate()` for UI bug reports, frontend polish, visual acceptance, and browser edit capture. It complements Bombadil: annotate is human review; Bombadil is automated UI/property testing.
- Use `/boomerang` for long autonomous work after specs are approved: `/next`, approved `/fix`, large refactors, or prompt chains. Avoid it during `/idea` and `/amend` decision phases.

### Configure models

Models are set in two places:

1. **Prompt templates** (`prompts/*.md`): `model:` in YAML frontmatter — used by the slash command itself
2. **Subagent overrides** (`~/.pi/agent/settings.json`): `subagents.agentOverrides` — used when subagents are spawned

Current defaults (edit to match your setup):

| Workflow role | Model | Thinking |
|---|---|---|
| Architect (`/idea`, `/plan`, `/amend`) | deepseek/deepseek-v4-flash | xhigh |
| Builder (`/next`, `/add`, `/fix`) | deepseek/deepseek-v4-flash | high-med |
| Scout/Explore (`/explore`, `/scout`) | deepseek/deepseek-v4-flash | high |
| Reviewer (`/review`, `/verify`) | zai/glm-5.1 | low |
| Quality Reviewer | deepseek/deepseek-v4-pro | xhigh |
| Docs | deepseek/deepseek-v4-flash | high |

Subagent settings in `~/.pi/agent/settings.json`:

```json
{
  "subagents": {
    "agentOverrides": {
      "worker": { "model": "deepseek/deepseek-v4-flash", "thinking": "xhigh" },
      "scout": { "model": "deepseek/deepseek-v4-flash", "thinking": "high" },
      "reviewer": { "model": "zai/glm-5.1", "thinking": "low" },
      "quality-reviewer": { "model": "deepseek/deepseek-v4-pro", "thinking": "xhigh" }
    }
  }
}
```

## Directory Structure

```
pi-workflows/
├── package.json
├── README.md
├── pi-workflows-improve.md
├── .pi/agents/
│   ├── worker.md              # TDD vertical slices, contract verification, blocker protocol
│   ├── scout.md               # structured codebase recon, domain memory
│   ├── reviewer.md            # mechanical agent-spec + project checks
│   └── quality-reviewer.md    # P0-P3 rubric, security, error handling
├── templates/
│   ├── REVIEW_GUIDELINES.md   # starter template for project-specific rules
│   ├── CONTEXT-FORMAT.md      # how to maintain domain glossary
│   └── ADR-FORMAT.md          # architecture decision record template
├── skills/
│   ├── challenge/SKILL.md     # adversarial grill, updates CONTEXT.md inline
│   ├── explore/SKILL.md       # research + synthesize + prototype
│   ├── idea/SKILL.md          # evidence → decision tree → plan + contracts
│   ├── plan/SKILL.md          # decompose into atomic tasks + contracts
│   ├── add-feature/SKILL.md   # approved contract → build → verify
│   ├── amend/SKILL.md         # update plan/specs when decisions change
│   ├── fix/SKILL.md           # feedback loop → fix + regression test
│   ├── refactor/SKILL.md      # restructure with behavior preservation
│   ├── docs/SKILL.md          # generate/update project docs
│   └── docs-check/SKILL.md    # validate doc freshness
└── prompts/
    ├── idea.md                # /idea — explore + grill + plan + contracts
    ├── plan.md                # /plan — decompose from existing context
    ├── challenge.md           # /challenge — adversarial grill against domain model
    ├── explore.md             # /explore — parallel multi-angle research
    ├── amend.md               # /amend — update plan/specs
    ├── add.md                 # /add — execute approved contract
    ├── fix.md                 # /fix — reproduce, diagnose, fix, verify
    ├── refactor.md            # /refactor — restructure, preserve behavior
    ├── optimize.md            # /optimize — parallel optimization experiments
    ├── review.md              # /review — verify + adversarial + quality review
    ├── verify.md              # /verify — full mechanical suite
    ├── contract.md            # /contract — show contract for a task
    ├── next.md                # /next — waves, TDD workers, blockers, goals
    ├── status.md              # /status — progress + cost summary
    ├── debug.md               # /debug — hypothesis-driven investigation
    ├── prototype.md           # /prototype — parallel A/B/C (backend or UI)
    └── docs.md                # /docs — generate/update project documentation
```

## Help

### Starting work

| Command | What it does |
|---|---|
| `/idea <description + repos/URLs>` | Productize idea: explore → grill decisions → plan → specs → approval |
| `/plan <description>` | Decompose into tasks + contracts |
| `/explore <question>` | Research / kill / prototype, no production planning (cheap) |
| `/amend <change>` | Update existing plan/specs when decisions change |
| `/status` | Show plan progress + cost summary (cheap) |

### Executing

| Command | What it does |
|---|---|
| `/next` | Execute next task (reads contract first) |
| `/add <feature-or-spec>` | Execute approved contract; broad ideas route to `/idea` |
| `/fix <bug>` | Diagnose with feedback loop, fix within boundaries |
| `/refactor <scope>` | Restructure code, behavior preserved |
| `/optimize <target>` | Autoresearch loop |

### Prototyping

| Command | What it does |
|---|---|
| `/prototype <theories>` | Parallel mini-prototypes to test approaches |
| `/integrate <prototype>` | Integrate validated prototype into production |

### Verification

| Command | What it does |
|---|---|
| `/contract [spec]` | Show contract for a task |
| `/verify` | Full mechanical suite: agent-spec lifecycle + guard + project checks |
| `/review` | Mechanical verification + adversarial (bug-hunter) + quality review |

### Documentation

| Command | What it does |
|---|---|
| `/docs [area]` | Generate/update project docs (cheap model) |
| `/docs all` | Generate full doc set |

### Delegated

| Command | What it does |
|---|---|
| `/scout <area>` | Cheap subagent recon |

### Flow

`/idea` → `/challenge` (grill plan) → approve plan → `/next` × N → `/review` → ship
