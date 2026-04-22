# pi-workflows

<p align="center">
  <img src="cover.png" alt="pi-workflows" width="100%">
</p>

Cost-optimized, contract-driven multi-model workflow system for [pi](https://github.com/mariozechner/pi-coding-agent).

Different tasks need different models. Exploring a codebase doesn't require deep reasoning. Planning needs it. Building needs it sometimes. Reviewing should be cheap and deterministic.

This package assigns the right model + thinking level to each task and enforces quality through **contracts** (agent-spec) and **property-based testing** (bombadil) — so you don't burn tokens on the wrong thing, and you don't ship code that doesn't satisfy its contract.

## Requirements

- [pi](https://github.com/mariozechner/pi-coding-agent) >= 0.60
- [pi-subagents](https://github.com/nicobailon/pi-subagents/) — parallel and chain execution
- [pi-prompt-template-model](https://github.com/nicopreme/pi-prompt-template-model) — per-command model/thinking control
- [agent-spec](https://github.com/ZhangHanDong/agent-spec) — contract verification (BDD specs + boundary enforcement)
- [bombadil](https://github.com/antithesishq/bombadil) — property-based testing for web UIs (optional, for browser tasks)
- [pi-autoresearch](https://github.com/davebcn87/pi-autoresearch) — for `/optimize` (optional)

## Install

```bash
pi install git:github.com/<your-user>/pi-workflows
```

Then restart pi. All commands appear in `/` autocomplete.

## Configure Models

Edit the prompt files in `prompts/` to match your available models. The defaults assume:

| Role | Default Model | Thinking | Why |
|---|---|---|---|
| Architect | `openrouter/openai/gpt-5.4` | high | Sees gaps, corrects plans, writes contracts |
| Scout | `openrouter/xiaomi-mimo-v2-pro` | low | Fast cheap recon |
| Builder | `openrouter/trinity-large-thinking` | high/medium | Executes within contract boundaries |
| Reviewer | `zai/GLM5.1` | low | Runs agent-spec lifecycle + deterministic checks |

To change a model, edit the `model:` field in the prompt file. Example:

```yaml
# prompts/idea.md
---
model: openrouter/your-model-here
thinking: high
---
```

## Commands

### Starting a new piece of work

| Command | Model | What it does |
|---|---|---|
| `/idea <description + repos/URLs>` | GPT-5.4 | Explores, plans, writes `plan.md` + `.spec` contracts |
| `/plan <description>` | GPT-5.4 | Plan only — you already have context. Generates contracts. |
| `/explore <question>` | cheap model | Quick codebase/URL research, no planning |
| `/status` | cheap model | Show `plan.md` progress |

### Executing tasks

| Command | Model | What it does |
|---|---|---|
| `/next` | trinity | Execute next pending task (implements against contract) |
| `/add <feature>` | trinity | Build a feature against a contract |
| `/fix <bug>` | trinity | Fix a bug within boundaries |
| `/refactor <scope>` | trinity | Restructure code within boundaries |
| `/optimize <target>` | current | Autoresearch loop: benchmark, iterate, keep winners |

### Verification

| Command | Model | What it does |
|---|---|---|
| `/contract [spec]` | current | Show the contract for a task |
| `/verify` | current | Run agent-spec guard + full project checks |
| `/review` | reviewer | Full verification: agent-spec lifecycle + bombadil + project checks |
| `/scout <area>` | scout (cheap) | Isolated recon, returns compressed context |

### Documentation

| Command | Model | What it does |
|---|---|---|
| `/docs [area]` | cheap | Generate/update project docs (magic-docs format) |
| `/docs all` | cheap | Generate full doc set (architecture, decisions, onboarding) |

### Swan (autoresearch-specific)

| Command | What it does |
|---|---|
| `/swan-explore <target>` | Online research + codebase analysis |
| `/swan-prototype <theories>` | 3 parallel workers in worktrees test theories |
| `/swan-integrate <prototype>` | Integrate winning prototype into production |
| `/swan-optimize <target>` | Autoresearch loop on a target |

## The Workflow

```
IDEA ──► EXPLORE ──► PLAN ──► EXECUTE ──► VERIFY ──► DOCS ──► SHIP
          (cheap)    (GPT-5.4) (trinity)   (agent-spec) (cheap)  (you)
          repos/     atomic    /next × N   contracts              ✓
          URLs       tasks     implements  + bombadil
                     plan.md   against     + project
                     .spec     contracts   checks
```

Docs are auto-tracked by pi-magic-docs. After conversations go idle, Haiku nudges updates if needed.

### 1. Start with an idea

```
/idea I want to add caching to the API, look at github.com/user/project
```

This uses GPT-5.4 with high thinking to:
- Scout the repo or fetch URLs
- Understand what exists
- Decide: proceed, pivot, or kill
- Write `plan.md` with atomic tasks
- **Generate `.spec` contracts** for each worker task

### 2. Review the plan + contracts

The architect presents the plan and contracts. You approve, modify, or kill.

Each contract defines:
- **Intent**: what to build and why
- **Decisions**: technical choices already fixed
- **Boundaries**: which files the worker may change
- **Completion Criteria**: BDD scenarios with explicit test selectors

### 3. Execute task by task

```
/next    → reads contract, implements within boundaries, self-verifies
/next    → and the next
/next    → and the next
/status  → check progress anytime
```

Each `/next` picks the right agent, reads the contract, implements within boundaries, and runs `agent-spec lifecycle` to self-verify.

### 4. Verify

```
/verify  → agent-spec guard + full project checks
/review  → reviewer runs agent-spec lifecycle + bombadil + project checks
```

### 5. Ship

When all contracts pass and all checks are green, commit.

## Contract Format (agent-spec)

Tasks in `plan.md` reference `.spec` files:

```markdown
### TASK 2: Add Redis client module
- **Agent**: worker
- **Depends on**: TASK 1
- **Contract**: specs/task-redis-client.spec
- **Verify**: agent-spec lifecycle specs/task-redis-client.spec
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

## Skills

| Skill | Phases | Contract |
|---|---|---|
| `explore` | DEFINE → SCOUT → SYNTHESIZE → PROTOTYPE | No (read-only) |
| `plan` | UNDERSTAND → DECOMPOSE → WRITE CONTRACTS → WRITE PLAN → REVIEW → HAND OFF | Generates contracts |
| `add-feature` | SPEC → RECON → BUILD → VERIFY → PRESENT | Implements against contract |
| `fix` | REPRODUCE → DIAGNOSE → FIX → VERIFY → PREVENT | Within boundaries |
| `refactor` | ASSESS → EXECUTE → VERIFY → PRESENT | Behavior preservation contract |

## Agents

| Agent | Model | Tools | Purpose |
|---|---|---|---|
| `scout` | cheap model | read-only + write | Fast codebase recon |
| `worker` | strong model | all | Building within contract boundaries |
| `reviewer` | cheap model | read-only + bash | agent-spec lifecycle + bombadil + checks |

## Directory Structure

```
pi-workflows/
├── package.json
├── README.md
├── agents/
│   ├── scout.md          # cheap, read-only recon
│   ├── worker.md         # strong, implements within contracts
│   └── reviewer.md       # cheap, runs agent-spec + bombadil
├── skills/
│   ├── explore/SKILL.md  # research + synthesize + prototype
│   ├── plan/SKILL.md     # decompose into atomic tasks + generate contracts
│   ├── add-feature/SKILL.md  # spec → build → verify against contract
│   ├── fix/SKILL.md      # reproduce → diagnose → fix within boundaries
│   └── refactor/SKILL.md # assess → execute → verify behavior preserved
└── prompts/
    ├── idea.md           # /idea — architect explores + plans + writes contracts
    ├── plan.md           # /plan — decompose from existing context + generate contracts
    ├── explore.md        # /explore — quick research
    ├── add.md            # /add — build feature against contract
    ├── fix.md            # /fix — fix bug within boundaries
    ├── refactor.md       # /refactor — restructure with behavior preservation
    ├── optimize.md       # /optimize — autoresearch loop
    ├── scout.md          # /scout — cheap subagent recon
    ├── review.md         # /review — agent-spec + bombadil + project checks
    ├── verify.md         # /verify — agent-spec guard on all contracts
    ├── contract.md       # /contract — show contract for a task
    ├── next.md           # /next — execute next task (reads contract first)
    ├── status.md         # /status — show plan progress
    ├── swan-explore.md   # /swan-explore
    ├── swan-prototype.md # /swan-prototype — parallel experiments
    ├── swan-integrate.md # /swan-integrate — integrate winner
    └── swan-optimize.md  # /swan-optimize — autoresearch
```

## Cost Strategy

```
CHEAP  (explore/scout/status/docs):  cheap model + low thinking
MEDIUM (fix):                        strong model  + medium thinking
FULL   (plan/build/refactor):        strongest     + high thinking
CURRENT (optimize):                  whatever you're on
```

## Review Rubric (from pi-review)

The reviewer uses a structured rubric with priority levels:

| Priority | Meaning |
|---|---|
| **P0** | Drop everything to fix. Blocking release/operations. |
| **P1** | Urgent. Should be addressed in the next cycle. |
| **P2** | Normal. Fix eventually. |
| **P3** | Low. Nice to have. |

Review covers:
- **Security**: untrusted input, SQL injection, open redirects
- **Error handling**: fail-fast, no silent degradation
- **Simplicity**: no overcomplication, no speculative abstractions
- **Human callouts**: migrations, new dependencies, auth changes, breaking changes

### REVIEW_GUIDELINES.md

Add a `REVIEW_GUIDELINES.md` to your project root for project-specific rules. The reviewer loads it automatically. See `templates/REVIEW_GUIDELINES.md` for a starter template.

## Coding Guidelines (Karpathy)

Workers follow these behavioral rules:

1. **Think Before Coding** — state assumptions, surface tradeoffs, ask if uncertain
2. **Simplicity First** — minimum code, no speculative features, no unnecessary abstractions
3. **Surgical Changes** — touch only what you must, match existing style
4. **Goal-Driven Execution** — define success criteria, loop until verified
5. **Fail-Fast Error Handling** — propagate errors, don't swallow, crash over silent degradation

## Quality Pipeline

```
ARCHITECT (GPT-5.4)
    │
    ├── Writes plan.md with atomic tasks
    ├── Generates .spec contracts with:
    │   ├── Intent (what + why)
    │   ├── Decisions (fixed choices)
    │   ├── Boundaries (allowed/forbidden files)
    │   └── Completion Criteria (BDD scenarios + test selectors)
    │
    ▼
WORKER (trinity)
    │
    ├── Reads contract before building
    ├── Implements within Boundaries
    ├── Writes tests matching Completion Criteria
    ├── Self-verifies with agent-spec lifecycle
    │
    ▼
REVIEWER (GLM5.1)
    │
    ├── agent-spec lifecycle (contract verification)
    ├── agent-spec guard (boundary enforcement)
    ├── bombadil (PBT for web UIs, if applicable)
    └── Project checks (tests, lint, types, build)
```

## Help

Type `/help-workflows` in pi to see a quick reference.
