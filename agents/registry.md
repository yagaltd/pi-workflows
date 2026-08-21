# Role registry — dispatch policy (single source of truth)

The role files in `agents/` are **verbatim subagent system prompts** (no
frontmatter, no agent-file magic — pi-core-subagent never reads agent files).
The orchestrator (`/next`, `/auto-next`, and anything else that dispatches)
reads the role file, pastes its body into the `prompt:` field, and applies
the dispatch policy below. If this table and a prompt disagree, this file
wins and the prompt must be fixed.

## Roles

Roles are referenced as `@role:<name>` in dispatch shapes — the pi-workflows
extension (shipped in this package) substitutes the verbatim role body at
execution time; without the extension, the orchestrator reads and pastes
`agents/<name>.md` itself.

| id | prompt file | toolset | model | thinking default |
|---|---|---|---|---|
| scout | `agents/scout.md` | read-only (`write: false`) | inherit parent | low |
| worker | `agents/worker.md` | `write: true` | inherit parent | medium |
| reviewer | `agents/reviewer.md` | `tools: ["read","grep","find","ls","bash"]` (needs bash to run agent-spec) | inherit parent | high |
| quality-reviewer | `agents/quality-reviewer.md` | read-only (`write: false`) | inherit parent | medium |

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

| Bottleneck | model | thinking | extra |
|---|---|---|---|
| 🔴 BLOCKING | strongest available model | xhigh | human review after |
| 🟡 RISKY | strong model | high | consider prototype first |
| 🔵 TIME_CONSUMING | default | medium | split if it stalls |
| 🟠 VERIFICATION_HEAVY | default | medium | budget extra verify time — Verify: line must run the full suite |
| ⚪ STANDARD | cheap/fast model | medium | default flow |
| scout tasks (any tag) | cheap model | low | recon only |
| reviewer tasks | per Verification policy tier (below) | per tier | mechanical only |
| quality-reviewer tasks | inherit | medium | judgment review |

Rules:

- **A cheap model with high thinking usually beats an expensive model with
  low thinking for workers.** Spend tokens on reasoning, not name brands.
- **Never set `thinking` without checking the model supports it.**
  Non-reasoning models accept `thinking: "off"` only — the call fails loudly
  otherwise, which is correct: fix the pairing, don't silence the check.
- Leave `model` empty (inherit) unless the bottleneck table says otherwise —
  the parent session already knows what's available and what it's paying.

## Verification policy (complexity-gated reviewer tiers)

Single source of truth for reviewer dispatch cost. The orchestrator derives
the tier from the task's **spec** — tags + Intent + Boundaries — when building
the reviewer node; the worker never self-assesses its tier. Complexity scales
the reviewer's cost, never its existence: **every tier requires a reviewer
verdict for ✅** (doctrine #7 unchanged).

| Tier | Traits (from spec) | reviewer model | reviewer thinking | pass shape |
|---|---|---|---|---|
| docs-tier | pure docs / test-data / spec-only — no production code touched | cheap model | low | one mechanical pass |
| standard-tier | ordinary code tasks (default) | inherit parent | medium–high | standard mechanical pipeline |
| high-risk-tier | security, concurrency, parsing, external input, crypto | strongest available model | xhigh | full mechanical pipeline + adversarial depth |

**Quality-reviewer placement**: per-task only for 🔴/🟡/🟠 bottleneck tags,
dispatched after mechanical `ok:true` — never per-wave. `/review` remains
the whole-plan quality gate. Rule lives in `agents/execution-doctrine.md`
(the loop section).

## Toolsets

Two toolsets only (pi-core-subagent design): read-only (`read, grep, find,
ls`) or write (`read, grep, find, ls, bash, edit, write` via `write: true`).
The one exception is `reviewer`, which needs `bash` to run agent-spec but
must not edit — use the explicit `tools` allowlist above.

## Isolation policy (no worktrees)

pi-core-subagent children run **in-process and share the parent's
filesystem** — there is no `worktree: true`. Isolation comes from contract
boundaries:

- **Tasks in the same parallel wave MUST have disjoint `Allowed Changes`
  sets.** If two parallel tasks touch the same files, do not parallelize
  them — resequence (drop one into a later wave or make it `needs:` the
  other).
- Throwaway artifacts (prototypes, experiments) isolate by directory: each
  gets its own subdir (`prototype/variation-a/`, `prototype/variation-b/`,
  ...) and never writes outside it.
- After any wave of write tasks, the orchestrator runs `git diff --stat` —
  the diff is the ground truth for what changed, not the child's report.
