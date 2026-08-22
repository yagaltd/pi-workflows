# Role registry — dispatch policy (single source of truth)

The role files in `agents/` are **verbatim subagent system prompts** (no
frontmatter, no agent-file magic — pi-core-subagent never reads agent files).
Dispatch shapes reference them as `@role:<name>`; the pi-workflows extension
substitutes the verbatim body at execution time (without the extension, the
orchestrator reads and pastes the file — see dispatch-shapes.md). This file
is the dispatch policy: toolset, model, thinking, verification tiers. If
this table and a prompt disagree, this file wins and the prompt must be
fixed.

## Roles

Roles are referenced as `@role:<name>` in dispatch shapes — the pi-workflows
extension (shipped in this package) substitutes the verbatim role body at
execution time; without the extension, the orchestrator reads and pastes
`agents/<name>.md` itself.

| id | prompt file | toolset | model | thinking default |
|---|---|---|---|---|
| scout | `agents/scout.md` | read-only (`write: false`) | inherit parent | low |
| worker | `agents/worker.md` | `write: true` | inherit parent | medium |
| reviewer | `agents/reviewer.md` | `tools: ["read","grep","find","ls","bash"]` (needs bash to run agent-spec) — **bash non-optional** — dispatching a reviewer without bash is a dispatch bug; the role itself VOIDs mechanical layers without it (see agents/reviewer.md) | inherit parent | high |
| quality-reviewer | `agents/quality-reviewer.md` | read-only (`write: false`) | inherit parent | medium |
| spec-drafter | `agents/spec-drafter.md` | `write: true`, contract-limited to `.workflows/specs/**` | `@model:standard` | high |

Never improvise a role not listed here. **Fix rounds dispatch the worker
role** (with rejection evidence prepended and `thinking: high`) — there is
no separate fixer role; reusing the worker keeps the role set closed.
Ad-hoc angles (research, security review, performance) get an inline
`prompt:` written per call — they are not roles and do not get files.

## Model + thinking policy (per-task, dynamic)

pi-core-subagent resolves `model` (explicit `provider/model-id`, or empty =
parent's current model) and `thinking` (validated against the resolved
model's thinking level map) **per task**. Drive them from the task's
bottleneck tag in `.workflows/plan.md`:

| Bottleneck | Tier | model | thinking | extra |
|---|---|---|---|---|
| 🔴 BLOCKING | C or B (per plan) | `@model:strong` | xhigh | human review after |
| 🟡 RISKY | B | `@model:strong` | high | consider prototype first |
| 🔵 TIME_CONSUMING | B | `@model:standard` | medium | split if it stalls |
| 🟠 VERIFICATION_HEAVY | B | `@model:standard` | medium | budget extra verify time — Verify: line must run the full suite |
| ⚪ STANDARD | A or B (per plan) | `@model:standard` | medium | default flow |
| visual verification (screenshot smoke, design gates, "looks right" checks) | any | `@model:vision` | medium (validate: thinking map unknown — pi validates loudly) | read-only child; screenshot saved to disk first, child reads the image file via the read tool and reports structured findings |
| scout tasks (any tag) | A | `@model:scout` | low | recon only |
| reviewer tasks | spec-derived (complexity tier table below) | `@model:reviewer` | per tier | mechanical only |
| quality-reviewer tasks | — | inherit | medium | judgment review |

Tier refines routing:

- **A** → `@model:standard` + thinking low + grep-only review (one `Verify:`
  line suffices — no reviewer node) or orchestrator-inline
- **B** → existing per-tag routing above, unchanged
- **C** → `@model:strong` + thinking high + **serial, never parallel**

## Task tiers (routing overlay)

Tier is decided at plan time (adversarial pass), written next to each task
in `.workflows/plan.md` (the planner assigns it, the dispatcher reads it
verbatim), and refines — never overrides the existence of — reviewer
verdicts: **every tier still requires a verdict for ✅** (doctrine #7).

## Model resolution

The orchestrator resolves `@model:<role>` from `models/registry.json` at
dispatch time. The registry maps each role to a concrete model id with
provenance (provider, pricing, context window). If the role is unresolvable
(e.g., missing from registry, registry absent, parsing failure) the
orchestrator picks an **explicit legacy id** and prints a WARN line naming
the role and the fallback — **never silent**:

- `@model:strong` → `` `deepseek/deepseek-v4-pro` `` (fallback constant)
- `@model:standard`, `@model:reviewer`, `@model:scout` → `` `deepseek/deepseek-v4-flash` ``
  (fallback constant)

```
WARN: @model:<role> unresolvable — falling back to <legacy-id>
```

Legacy ids appear ONLY as marked fallback constants; the registry is the
single source of truth for live model resolution.

Rules:

- **A cheap model with high thinking usually beats an expensive model with
  low thinking for workers.** Spend tokens on reasoning, not name brands.
- **Never set `thinking` without checking the model supports it.**
  Non-reasoning models accept `thinking: "off"` only — the call fails loudly
  otherwise, which is correct: fix the pairing, don't silence the check.
- Consult the role's thinking.supported before setting thinking — never guess; empty array means unverified, pi validates loudly.
- Leave `model` empty (inherit) unless the bottleneck table says otherwise —
  the parent session already knows what's available and what it's paying.

## Dispatch cwd policy

Per-task `cwd` is mandatory in every dispatch — run-level/inherit alone is
never sufficient. Evidence: run-level cwd honored 3/10 spawns vs per-task +
GUARD 13/13 (MorphEditor 20260822-002 incident).

## Verification policy (complexity-gated reviewer tiers)

Single source of truth for reviewer dispatch cost. The orchestrator derives
the tier from the task's **spec** — tags + Intent + Boundaries — when building
the reviewer node; the worker never self-assesses its tier. Complexity scales
the reviewer's cost, never its existence: **every tier requires a reviewer
verdict for ✅** (doctrine #7 unchanged).

| Tier | Traits (from spec) | reviewer model | reviewer thinking | pass shape |
|---|---|---|---|---|
| docs-tier | pure docs / test-data / spec-only — no production code touched | `@model:standard` | low | one mechanical pass |
| standard-tier | ordinary code tasks (default) | inherit parent | medium–high | standard mechanical pipeline |
| high-risk-tier | security, concurrency, parsing, external input, crypto | `@model:strong` | xhigh | full mechanical pipeline + adversarial depth |

**Quality-reviewer placement**: per-task only for 🔴/🟡/🟠 bottleneck tags,
dispatched after mechanical `ok:true` — never per-wave. `/review` remains
the whole-plan quality gate. Rule lives in `agents/execution-doctrine.md`
(the loop section).

**Reviewer tier table notes — provenance + VOID semantics**: every reviewer
report opens with a `repo: <git toplevel>` provenance line. Wrong working
directory → output exactly one line (`VOID — wrong working directory (<found>
≠ <expected>); no verdicts emitted`). Details live in the role files
(`agents/reviewer.md`, `agents/quality-reviewer.md`).

## Toolsets

Two toolsets only (pi-core-subagent design): read-only (`read, grep, find,
ls`) or write (`read, grep, find, ls, bash, edit, write` via `write: true`).
The one exception is `reviewer`, which needs `bash` to run agent-spec but
must not edit — use the explicit `tools` allowlist above.

## Isolation policy (native worktrees)

pi-core-subagent 1.3.30 runs write-capable children isolated in **native
worktrees**: each write task runs at `.git/subagents/<run>/<task>` on
branch `subagents/<run>/<task>` (non-git repos fall back in-place).
Isolation mechanics:

- The extension auto-commits the child's changes to its worktree branch at
  completion and reports the **branch + diffstat** — that diffstat is the
  evidence of record for what changed.
- The leader merges each task branch back with `git merge --no-ff` (one
  merge per task branch); merged branches and worktree dirs are cleaned up.
- **Tasks in the same parallel wave MUST have disjoint `Allowed Changes`
  sets.** This is **merge-cleanliness / review hygiene**, not filesystem
  collision prevention: parallel tasks writing the same files produce
  merge conflicts when their branches merge. If two parallel tasks touch
  the same files, do not parallelize them — resequence (drop one into a
  later wave or make it `needs:` the other).
- Throwaway artifacts (prototypes, experiments) stay contained in their own
  subdir within the worktree (or in-place for read-only children) and never
  write outside it.
- After any wave of write tasks, the ground truth for what changed is each
  task's branch diff (`git diff <base>..<branch>` / the extension's
  diffstat) — under worktrees the main tree stays clean during a task.
- **Tripwire mandate**: after every claimed-done write task, the orchestrator
  runs `tooling/verify-landing.sh` (branch-aware) with the worker's Files
  Changed on stdin. ALARM → worker report untrusted → verify cwd →
  redispatch with explicit per-task cwd.
