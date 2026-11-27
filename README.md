# pi-workflows

<p align="center">
  <img src="asset/cover.png" alt="pi-workflows" width="100%">
</p>

Contract-driven multi-model workflow for [pi](https://github.com/badlogic/pi-mono).

**Describe what you want.
Agents plan, build, and verify through enforceable contracts.**

## Install

```bash
pi install git:github.com/yagaltd/pi-workflows
```

Restart pi. All commands appear in `/` autocomplete.

Requires [pi](https://github.com/badlogic/pi-mono) ≥ 0.60 · [@arhen/pi-core-subagent](https://www.npmjs.com/package/@arhen/pi-core-subagent) (in-process subagents) · [agent-spec](https://github.com/ZhangHanDong/agent-spec) (contract verification). Optional tools (bombadil, and `cc-check` via `npm:@spolu/cc-check`) degrade gracefully with a note — the machinery is described in [docs/architecture.md](docs/architecture.md).

## Quick Start

```sh
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

## Commands

One command per prompt file — descriptions from each prompt's frontmatter
(generated — do not hand-edit; run `node scripts/gen-docs.mjs`):

<!-- generated:commands:start -->
| Command | What it does |
|---|---|
| `/abort` | Abort — abandon the live plan, archive it to .workflows/archive/superseded/ |
| `/add` | Add feature — execute approved contract; broad ideas route to /idea |
| `/amend` | Amend — update existing plan/specs when decisions change |
| `/audit` | Audit — codebase map + adversarial pre-scan: know the terrain before planning |
| `/auto-next` | Run ALL pending tasks in .workflows/plan.md autonomously — the dispatcher picks each task, you dispatch and gate until done |
| `/brainstorm` | Brainstorm — divergent research mode: think together, evidence branches, research ledger, no building |
| `/challenge` | Challenge — adversarial grill of your plan against domain model, sharpens terminology, updates .workflows/CONTEXT.md inline |
| `/contract` | Show contract — display the agent-spec contract for a task |
| `/debug` | Debug — hypothesis-driven investigation for complex bugs |
| `/docs` | Docs — generate/update project documentation |
| `/explore` | Explore — parallel multi-angle research, kill/pivot/proceed with evidence |
| `/fix` | Fix bug — feedback loop, hypotheses, regression test, verifies with agent-spec |
| `/idea` | Idea — productize: explore → grill decisions → plan → specs → approval |
| `/init` | Init — bootstrap a project: architecture design, folder tree, charter, docs skeleton → hands off to /plan |
| `/next` | Dispatch the next pending task from .workflows/plan.md — the dispatcher selects, you dispatch and gate |
| `/optimize` | Optimize — experiments, contracted deep passes, or an autoresearch loop |
| `/plan` | Plan — decompose into atomic tasks from existing context |
| `/prototype` | Prototype — run parallel A/B/C prototypes, benchmark, keep the winner |
| `/refactor` | Refactor — powerful model, deep thinking, structure change only |
| `/restart` | Restart — rebuild session state from the digest, then act on it |
| `/review` | Review — run /verify first, then quality review with bug-hunter + judgment |
| `/status` | Show current .workflows/plan.md progress with contract status and cost summary |
| `/verify` | Verify — run agent-spec guard on all contracts + full project checks |
<!-- generated:commands:end -->

## The loop

```sh
/idea or /plan  → scouts + writes .workflows/plan.md (bottleneck tags) → STOP: you approve
                → .spec contracts generated for every task
/next × N       → dispatch_next picks the task → worker implements → reviewer verdict gates it
                  (or /auto-next: all pending tasks, waves in order, stops on blockers)
/review         → mechanical verification + adversarial + quality review
all green?      → SHIP: commit + archive + CHANGELOG entry      (/abort to supersede)
```

Contracts are the authority — you approve contracts, not code. Format:
[templates/CONTRACT-FORMAT.md](templates/CONTRACT-FORMAT.md); `/contract [spec]` shows a task's contract.
Boundaries lint mechanically — a criterion path outside Allowed Changes
fails at lint time (agent-spec boundaries-path), so scope errors die
before a worker dispatches.

Back after a break (or in a different checkout)? `/restart` runs the read-only
resume digest for the repo you stand in — its output IS the session state, so
nothing is rediscovered by reading files around.

Reviews and ship reports end with the follow-up table
(`templates/FOLLOW-UP-TABLE.md`): every open item is triaged — queued,
batched, closed, or done — and in-scope defects are fixed in the loop,
never queued. A plan's rows drain before the next plan opens; the queue
grows only through triage, never through prose.

## Gates

`bash scripts/check-drift.sh` runs thirteen drift sections on every commit
(`.githooks/pre-commit`) and push (CI) — views must agree with sources;
exit 1 on drift:

| # | Section | What it proves |
| --- | --- | --- |
| 1 | Prompt frontmatter | only supported keys (`description`, `argument-hint`, `hidden`) |
| 2 | Old-API remnants | no removed-extension API, dead integrations, or stale fork pointers |
| 3 | Roles | role files registered; every `@role:` ref resolves |
| 4 | Skills | every skill a prompt follows exists (`skills/<name>/SKILL.md`) |
| 5 | Templates | template files referenced by skills/prompts exist |
| 6 | peerDependencies | `@arhen/pi-core-subagent` pinned |
| 7 | Commands | every README command row resolves to `prompts/*.md` |
| 8 | agents-lint | AGENTS.md doctrine: core + pointers + budget (`scripts/agents-lint.sh`) |
| 9 | profile-lint | `.workflows/profile.json` schema + repo facts (`scripts/profile-lint.sh`) |
| 10 | metric-gates | complexity + duplication thresholds (`scripts/metric-gates.sh`; absent tools skip) |
| 11 | Archive coverage | Bundles for shipped plan IDs |
| 12 | Durable knowledge | whitelisted `.workflows` paths are tracked |
| 13 | WIP batch | verdict + scope proof before SHIP |

### Format Gate

`mise run format-check` runs `dprint check --list-different` read-only over
TS/JS/JSON source files; Markdown is excluded and `scripts/docs-lint.sh` is
the sole Markdown authority (gate: `.mise/tasks/format-check`,
`scripts/docs-lint.sh`).
Worker Verify runs that read-only format check scoped to the task's explicit
paths, never `fmt` in that leg; `fmt` is allowed only in an explicitly
contracted formatting task on explicit paths (gate: `skills/init/SKILL.md`).
The mutating `mise run format` task is optional and out of band (gate:
`.mise/tasks/format`). Pre-commit checks staged bytes, skips excluded source
paths, and never rewrites files; `/init` offers detected formatter profiles
only after owner approval. `/review` Stage 1 runs `mise run format-check` over
the whole tree (gate: `.githooks/pre-commit`, `skills/init/SKILL.md`,
`skills/review/SKILL.md`).

### Rust Structural Gate

The Rust structural gate is a flat `[tasks]` check line that `/init` emits
for a detected Rust stack; the existing parser reads it without a new branch
(gate: `tests/flow-gates-mise.test.ts`):

```toml
check = "cargo metadata --no-deps --format-version 1 >/dev/null && cargo tree --locked --workspace -e normal,build --target all >/dev/null && cargo clippy --locked --workspace --all-targets -- -D warnings && { if command -v cargo-deny >/dev/null 2>&1; then cargo deny --config deny.toml --locked check; else echo 'SKIP: cargo-deny absent — install with cargo install cargo-deny --locked' >&2; fi; } && { if command -v deslop-please >/dev/null 2>&1; then deslop-please; else echo 'SKIP: deslop-please absent — install deslop-please (needs rust-analyzer: rustup component add rust-analyzer)' >&2; fi; }"
```

The chain runs `cargo metadata` without `--locked` first to bootstrap
`Cargo.lock` in a fresh workspace, then locked `cargo tree`, `cargo clippy`,
optional `cargo deny` and `deslop-please`. No `--allow` flag or generated
allow file is needed — allow lists are owner-managed and tree-declared.
An absent optional tool writes `SKIP` with an install hint to `stderr` and the
chain continues; findings exit 1 (gate: `tests/mise-tasks.test.ts`).
Crate-boundary claims must name `rust-crate-architecture`; gate: `docs/canon.md`
The four-skill Rust family covers the rest: `rust-review`,
`rust-best-practices`, `rust-port`.

## Flows

A flow is declarative data — `.workflows/flows/<slug>.json` with steps (`task` | `gate` | `transform`), waves, and `depends_on`. Flows validate before run (`node scripts/flow-validate.mjs`; blocked codes include `cycle`, `missing-ref`, `bad-dep-wave`) and execute as dispatcher input: `node scripts/flow-run.mjs <flow.json>` computes waves, dispatch-decides every task through the real `resolveNext`, writes per-task packs for `/next`, and runs gate steps (contract | test-quality | review) at wave boundaries. See `skills/flows/SKILL.md`.

## Decision steps + intent guard

Flow `decision` steps make one calibrated judge call (`node scripts/judge.mjs ask` — the single judge client: typed question sets to the System One API `/v1/systemone`; key chain `TYPESAFE_API_KEY` environment → `~/.pi/agent/auth.json`); `assert` gates on value or confidence, and an unavailable judge is a loud skip, never a pass. `node scripts/intent-guard.mjs --query "..."` classifies a query against the live plan before dispatch — proceed / amend / answer / ask — failing open to `ask-human`. Provenance: decision answers in the run report, guard verdicts in `.workflows/intent/trail.jsonl`.

Plan pre-flight binds contract text into every judge question: paths are pointers, not evidence. `bash scripts/wf.sh judge-context --questions <file> --context <spec>` rejects path-only question sets; `judge ask --context <spec>` embeds the spec in every instruction and fails closed before the network on cap breach. Low-confidence rows route to the human; judges never gate.

## Run budget + journal

`/auto-next` and `/next` record every dispatch and verdict to the run journal (`.workflows/journal.jsonl`) via `node scripts/run-journal.mjs record` (the extension auto-records on FINAL verdicts). A budget file (`.workflows/budget.json`: `{max_tasks, max_cost_usd}`, both optional) caps the run: before each dispatch the check runs — exhaustion records `budget-exhausted` and stops (a stop, not a failure). Resume is mechanical: `node scripts/run-journal.mjs resume --plan <id>` prints done, failed, and open dispatches with budget headroom. Raising the budget is the owner's edit.

## Proof ledger

Per-task proofs live in `.workflows/proofs/proofs.jsonl` — the Verify command, its exit code, and an SHA-256 of the verifier output: `node scripts/proof-ledger.mjs record --plan <id> --task <id> --verify "<cmd>" --spec <spec>`. `verify` re-runs the recorded command and flags drift by hash; `collect --plan <id>` merges the run journal, review verdicts, and proof counts into the SHIP evidence file. Proofs are recorded data: a failing verifier still records. Reviewer records are token-gated: `record --runner reviewer` requires the session token from `.workflows/proofs/.reviewer-token` (created by `proof-ledger init`); `verify` annotates reviewer rows `token-verified` vs legacy `self-attested, pre-token`.

## Lessons ledger

At SHIP, `/review` Stage 3 distills the archived bundle into `.workflows/lessons/lessons.jsonl` (`node scripts/lessons.mjs distill ...`). One lesson per task; `provenance` is computed — `verified` with a recorded proof, `from_untrusted` without. Statuses change only via `node scripts/lessons.mjs set --id <id> --to <status> --reason "<why>"` — no reason, no transition, history never rewritten. `/plan` and `/challenge` read the ledger before drafting and grilling.

## Intent-guard hook

User prompts (not `/commands`) under a live plan with tasks get one judge classification — Suggest-only: the routing line is injected into the turn, never auto-executed. `amend` → "run /amend before touching tasks"; `answer` → unrelated, answer directly; `ask` → ambiguous, one clarifying question first; `proceed` / judge unavailable → silent. **Intent tier**: the same call asks one more choice — problem / solution / procedure — and `tierRoute` maps them to `/idea`, `/plan`, `/add` (origin: why/what/how tiers of thinking, stuwe.dev). Every verdict appends to `.workflows/intent/trail.jsonl`. Explicit `/commands` are never overridden — owner routing stays final.

## Format chooser

Decision outputs get the artifact a human decision needs — `node scripts/format-chooser.mjs choose --for <closeout|plan-approval|challenge|brainstorm-graduation> --content-file <output.md>`: two advisory judge questions. Q1 picks the form — `none` (prose, the correct default) · table · mermaid · html; Q2 names the diagram family. Closed boundary set; the agent may overrule with a stated reason; a skipped judge fails open to prose. HTML artifacts are generated views — never hand-edited, never gates.

## Output Format Policy

`scripts/output-policy.mjs` (`decideOutputPolicy`) is the deterministic
source of truth. Canonical prose plus display-only status tokens — Done,
Decision, Pending, Failed, Unverified — always stand; no reply is image-only.
Tokens decorate chat only, never a tracked file; the mapping of record lives
in `templates/STATUS-VOCABULARY.md`. The policy flows to
`scripts/format-chooser.mjs`, `/status`, close-out, and the TUI renderer;
the chooser's judge answers stay advisory and fail open to prose.

A table is earned when `>=3` rows share `>=3` comparable fields, and it is
mandatory for the close-out/next-moves table. A diagram is earned when `>=4`
tasks AND (`>=2` dependencies OR `>=2` waves OR `>=2` status mix), OR a
fix loop or state machine must be understood, OR `>=3` components with `>=2`
meaningful links must be seen together. PNG/SVG from `open-diagram` is an
additive generated view: it carries alt text, never replaces judge-readable
text or the follow-up table.

This plan adds no new judge call, no new `TypeLLM` path, and no change to
dispatched-verdict semantics. The pure policy module does no file or network
access; the wrapper `scripts/output-policy-cli.mjs` takes explicit flags
(`--tasks 4`, `--waves 2`), prints the four-boolean JSON decision, and works
with no input. `mise run output-policy` and `bash scripts/wf.sh output-policy`
invoke that wrapper; `mise run open-diagram-render` and
`bash scripts/wf.sh open-diagram-render` invoke the renderer through the same
root-resolving launcher. `OPEN_DIAGRAM_CLI` overrides the external
open-diagram executable; the verified local Python environment path is only
the default and no package dependency is added.

## The Reply-Style Companion

Ship reports open with a one-line scoreboard, and each status speaks as a
pill — Done, Decision, Pending, Failed, Unverified. Rendering belongs to
pi-emphasis, a display-only pi extension (installed stock):

```bash
pi install git:github.com/johnlindquist/pi-emphasis
```

The token-to-pill mapping of record lives in `templates/STATUS-VOCABULARY.md`.
The companion is optional and not a package dependency: without it, pill
tokens render as plain text — nothing breaks, every word is still there.

## Close-out

At SHIP the close-out renders in chat — Shipped · Deviations · Discoveries · Deferred · Watch — from the plan's Execution Notes markers plus the run journal, proofs, and lessons (`node scripts/closeout.mjs report --plan .workflows/plan.md`). One advisory settle-judge call verifies the report — its fifth question (`decision_brief_present`) checks the next-moves table rendered from `.workflows/queue.json` (never listed from memory). The owner acks the close-out before the next task starts.

## Eval Doctrine

A golden eval set lives in `.workflows/evals/golden/` — one JSON case per file, harvested from shipped evidence: dispatcher selection, gate verdict replays, degradation honesty, archive preconditions, docs stamp expiry. Every case runs twice; only stable outcomes count. The SHIP gate runs `node scripts/eval-golden.mjs --baseline .workflows/evals/baseline.jsonl`: a case that passed at baseline and now stably fails is a FLIP and blocks SHIP unless the owner annotates it. Add a golden case whenever a gate, the dispatcher, or the flow of commands changes.

## Pointers

- [AGENTS.md](AGENTS.md) — binding rules for every agent session (the charter)
- [docs/canon.md](docs/canon.md) — docs canon: doc types, doc-drift rules
- [docs/architecture.md](docs/architecture.md) — the machinery: flow, gates, extension, dispatcher
- [CHANGELOG.md](CHANGELOG.md) — shipped history, one entry per plan

## Contributing

PRs are welcome — before opening one, run `bun test` (suite green) and `bash scripts/check-drift.sh` (CLEAN), and respect the contract boundaries in [AGENTS.md](AGENTS.md).

## License

MIT.
