# pi-workflows

<p align="center">
  <img src="cover.png" alt="pi-workflows" width="100%">
</p>

Cost-optimized multi-model workflow system for [pi](https://github.com/mariozechner/pi-coding-agent).

Different tasks need different models. Exploring a codebase doesn't require deep reasoning. Planning needs it. Building needs it sometimes. Reviewing should be cheap and deterministic.

This package assigns the right model + thinking level to each task so you don't burn tokens on the wrong thing.

## Requirements

- [pi](https://github.com/mariozechner/pi-coding-agent) >= 0.60
- [pi-subagents](https://github.com/nicobailon/pi-subagents/) — parallel and chain execution
- [pi-prompt-template-model](https://github.com/nicopreme/pi-prompt-template-model) — per-command model/thinking control
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
| Architect | `openrouter/openai/gpt-5.4` | high | Sees gaps, corrects plans |
| Scout | `openrouter/xiaomi-mimo-v2-pro` | low | Fast cheap recon |
| Builder | `openrouter/trinity-large-thinking` | high/medium | Executes imprecise tasks well |
| Reviewer | `zai/GLM5.1` | low | Deterministic checks |
| Status | `openrouter/xiaomi-mimo-v2-pro` | low | Just reads plan.md |

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
| `/idea <description + repos/URLs>` | GPT-5.4 | Explores, plans, writes `plan.md` with atomic tasks |
| `/plan <description>` | GPT-5.4 | Plan only — you already have context |
| `/explore <question>` | cheap model | Quick codebase/URL research, no planning |
| `/status` | cheap model | Show `plan.md` progress |

### Executing tasks

| Command | Model | What it does |
|---|---|---|
| `/next` | trinity | Execute next pending task from `plan.md` |
| `/add <feature>` | trinity | Build a feature directly (skip planning) |
| `/fix <bug>` | trinity | Fix a bug directly (skip planning) |
| `/refactor <scope>` | trinity | Restructure code directly (skip planning) |
| `/optimize <target>` | current | Autoresearch loop: benchmark, iterate, keep winners |

### Delegated subagents

| Command | Agent | What it does |
|---|---|---|
| `/scout <area>` | scout (cheap) | Isolated recon, returns compressed context |
| `/review` | reviewer | Independent verification with deterministic tools |

### Swan (autoresearch-specific)

| Command | What it does |
|---|---|
| `/swan-explore <target>` | Online research + codebase analysis |
| `/swan-prototype <theories>` | 3 parallel workers in worktrees test theories |
| `/swan-integrate <prototype>` | Integrate winning prototype into production |
| `/swan-optimize <target>` | Autoresearch loop on a target |

## The Workflow

```
IDEA ──────► EXPLORE ──────► PLAN ──────► EXECUTE ──────► SHIP
             (cheap model)  (GPT-5.4)    (trinity)        (you)
               repos/URLs     atomic       /next × N        ✓
                              tasks        /review
                              plan.md
```

### 1. Start with an idea

```
/idea I want to add caching to the API, look at github.com/user/project
```

This uses GPT-5.4 with high thinking to:
- Scout the repo or fetch URLs
- Understand what exists
- Decide: proceed, pivot, or kill
- Write `plan.md` with atomic tasks

### 2. Review the plan

The architect presents the plan. You approve, modify, or kill it.

### 3. Execute task by task

```
/next    → runs the next pending task in plan.md
/next    → and the next
/next    → and the next
/status  → check progress anytime
```

Each `/next` picks the right agent (scout/worker/reviewer), runs verification, updates `plan.md`.

### 4. Ship

When all tasks are ✅, review the result and commit.

## Atomic Task Format

Tasks in `plan.md` look like:

```markdown
### TASK 1: Scout the API handler architecture
- **Agent**: scout
- **Depends on**: none
- **What**: Map all API handlers and data access patterns
- **Verify**: context.md exists with file list + data flow
- **Status**: ⬜ PENDING

### TASK 2: Add Redis client module
- **Agent**: worker
- **Depends on**: TASK 1
- **What**: Create src/cache/redis.rs with get/set/invalidate
- **Verify**: cargo test, cargo clippy clean
- **Parallel with**: TASK 3 (different files)
- **Status**: ⬜ PENDING
```

## Skills

| Skill | Phases |
|---|---|
| `explore` | DEFINE → SCOUT → SYNTHESIZE → PROTOTYPE |
| `plan` | UNDERSTAND → DECOMPOSE → WRITE PLAN → REVIEW → HAND OFF |
| `add-feature` | SPEC → RECON → BUILD → VERIFY → PRESENT |
| `fix` | REPRODUCE → DIAGNOSE → FIX → VERIFY → PREVENT |
| `refactor` | ASSESS → EXECUTE → VERIFY → PRESENT |

## Agents

Agents are subagent definitions used by `pi-subagents`:

| Agent | Model | Tools | Purpose |
|---|---|---|---|
| `scout` | cheap model | read-only + write | Fast codebase recon |
| `worker` | strong model | all | Building, fixing, implementing |
| `reviewer` | cheap model | read-only + bash | Deterministic verification |

## Directory Structure

```
pi-workflows/
├── package.json
├── README.md
├── agents/
│   ├── scout.md          # cheap, read-only recon
│   ├── worker.md         # strong, full capabilities
│   └── reviewer.md       # cheap, deterministic checks
├── skills/
│   ├── explore/SKILL.md  # research + synthesize + prototype
│   ├── plan/SKILL.md     # decompose into atomic tasks
│   ├── add-feature/SKILL.md  # spec → build → verify → ship
│   ├── fix/SKILL.md      # reproduce → diagnose → fix → prevent
│   └── refactor/SKILL.md # assess → execute → verify → present
└── prompts/
    ├── idea.md           # /idea — architect explores + plans
    ├── plan.md           # /plan — decompose from existing context
    ├── explore.md        # /explore — quick research
    ├── add.md            # /add — build feature
    ├── fix.md            # /fix — fix bug
    ├── refactor.md       # /refactor — restructure
    ├── optimize.md       # /optimize — autoresearch loop
    ├── scout.md          # /scout — cheap subagent recon
    ├── review.md         # /review — independent verification
    ├── next.md           # /next — execute next task in plan.md
    ├── status.md         # /status — show plan progress
    ├── swan-explore.md   # /swan-explore
    ├── swan-prototype.md # /swan-prototype — parallel experiments
    ├── swan-integrate.md # /swan-integrate — integrate winner
    └── swan-optimize.md  # /swan-optimize — autoresearch
```

## Cost Strategy

```
CHEAP  (explore/scout/status):  cheap model + low thinking
MEDIUM (fix):                    strong model  + medium thinking
FULL   (plan/build/refactor):    strongest     + high thinking
CURRENT (optimize):              whatever you're on
```

## Help

Type `/help-workflows` in pi to see a quick reference.
