# Plan: Adaptive output format

> Plan ID: 20261123-075
> Created: 2026-11-23
> Status: IN PROGRESS

## Lifecycle
- Plan ID is assigned once at bootstrap: 20261123-075 (NNN = entries in `.workflows/archive/done` + `.workflows/archive/superseded` + 1, zero-padded to 3). Never reuse a Plan ID.
- `/idea` and `/plan` refuse to overwrite a live plan (DRAFT/APPROVED/IN PROGRESS) — route it to `/review` (ship → `archive/done/`) or `/abort` (abandon → `archive/superseded/`) first.
- SHIP (`/review`, all tasks ✅) → set Status: DONE and move the bundle (plan.md + specs/ + reviews/ + CONTEXT.snapshot.md) to `.workflows/archive/done/20261123-075-adaptive-output-format/`.
- SHIP gate: run `bash "${PI_WORKFLOWS_BIN:-./scripts/wf.sh}" archive-check <archive-target-dir>` before the bundle move — a missing declared Docs impact path or a CHANGELOG without the Plan ID refuses the archive.
- `/abort` → Status: SUPERSEDED, bundle to `.workflows/archive/superseded/20261123-075-adaptive-output-format/` with reason.
- `.workflows/CONTEXT.md`, `docs/adr/`, `knowledge/`, `LOG.md` are never archived — durable knowledge outlives every plan.

## Context
- Owner-approved rule: canonical text first; a diagram is earned only when shape carries information text does not. Encode as deterministic policy in code; the judge stays advisory (`scripts/format-chooser.mjs:1-9`; `agents/execution-doctrine.md` Judge placement).
- Existing chooser is advisory, fail-open to prose, and already exposes `none/table/mermaid/html` with a prose-first ladder (`scripts/format-chooser.mjs:14-22,38-72`); this plan extends it, not replaces it with a judge path.
- `/status` is a fixed markdown template with ✅/🔄/⬜/❌ task lines and bottleneck tags; status pills already exist as display-only decoration (`prompts/status.md:21-65`; `templates/STATUS-VOCABULARY.md:11-28`; `README.md:146-158`).
- Close-out already has a `--diagram` seam emitting Mermaid `graph LR`, while `### Next moves` is a mandatory table and the settle judge reads report text only (`scripts/closeout.mjs:101-139,137,141-165`; `agents/registry.md:145-148`; `templates/FOLLOW-UP-TABLE.md:13-20,22-46`).
- Generated-view seams already exist and stay regenerable, never gates (`scripts/plan-diagram.mjs:78-129`; `scripts/ship-diagram.mjs:66-105`; `.workflows/tree.json:7`).
- Pi TUI has a built-in `Image` component and tool-result images become `Image` components; markdown `![](path)` is not fetched (`.../pi/docs/tui.md:36`, source survey 2026-11-23). Local settings use `imageWidthCells=120`, `autoResize=false`, `blockImages=true` (`~/.pi/agent/settings.json`, read 2026-11-23); image protocols are auto-detected/overridable (`.../terminal-setup.md:211,216,219`; `.../environment-variables.md:97`).
- open-diagram 0.4.0 is verified locally in `/home/aurel/.local/share/open-diagram/venv`; `/tmp/open-diagram-example/pi-workflows.py` produced SVG + PNG (2020 x 711 px, smallest text 10.5 px, 0 layout problems).
- Standing gates: `bun test`, `scripts/check-drift.sh`, `scripts/docs-lint.sh`, `scripts/agents-lint.sh`. New scripts need `scripts/wf.sh` + `.mise/tasks/*` wiring and tests (`tests/wf-launcher.test.ts`, `tests/mise-tasks.test.ts`); README command table is generated (`scripts/gen-docs.mjs`, `scripts/docs-lint.sh`) and golden cases are conventional (`.workflows/evals/golden/`).

## Sieve

| Cell | Verdict |
|---|---|
| V value | `must-have` |
| R risk | `serious` |
| E effort | `m` |
| path | `inspect` |

Outcome: propose

## Decisions

- **Canonical text first; diagram only when shape carries information text does not**: every surface keeps prose as the source of truth and treats any image as a generated view.
  - `Cost of inaction:` image-only output keeps getting proposed; judge-readable reports and follow-ups become unreadable in text-only gates.
  - `Blast radius:` `/status` +, SHIP close-out +, plan-approval view +; plan grammar neutral; verdict semantics neutral.
- **Policy lives in one deterministic module, not in the judge**: `scripts/output-policy.mjs` decides prose/table/diagram from explicit thresholds; the judge may only suggest and be overruled with a stated reason.
  - `Cost of inaction:` advisory output stays nondeterministic and drifts between chooser, status, and close-out.
  - `Blast radius:` `scripts/format-chooser.mjs` +, `scripts/closeout.mjs` +, `prompts/status.md` +; judge client/gates neutral.
- **Always prose summary + status tokens**: every rendered surface emits a short prose summary plus display-only tokens (`[[Done]]`, `[[Decision]]`, `[[Pending]]`, `[[Failed]]`, `[[Unverified]]`).
  - `Cost of inaction:` readers lose at-a-glance task state when visuals are unavailable or images are blocked.
  - `Blast radius:` `/status` +, close-out +; plan status markers and dispatcher parsing neutral.
- **Table when ≥3 rows share ≥3 comparable fields, or the artifact is the mandatory closeout/next-moves table**: tables stay text and keep their pinned columns.
  - `Cost of inaction:` either every multi-row comparison becomes a picture or the mandatory follow-up table gets dropped.
  - `Blast radius:` `scripts/closeout.mjs` +, `templates/FOLLOW-UP-TABLE.md` +, `agents/registry.md` +; table grammar neutral.
- **open-diagram when ≥4 tasks AND (dependencies ≥2 OR waves ≥2 OR status mix ≥2), OR a fix loop/state machine must be understood, OR ≥3 components with ≥2 meaningful links must be seen together**: renderer is invoked only on a policy positive.
  - `Cost of inaction:` diagrams appear for simple lists, or complex loops stay invisible in prose.
  - `Blast radius:` renderer seam +, chooser +, TUI hook +, close-out +; `bun test` gates neutral.
- **Never image-only; never replace judge-readable text or the mandatory follow-up table**: PNG/SVG is additive, with alt text; text gates keep reading the markdown report.
  - `Cost of inaction:` settle judge, close-out audit, and SHIP follow-up drain lose their input.
  - `Blast radius:` settle judge neutral (text input preserved), SHIP follow-up table neutral, docs +.
- **Pi hook/extension only renders image + alt text**: no policy, chooser, or verdict logic in `extensions/index.ts`.
  - `Cost of inaction:` a second decision path appears inside the TUI and diverges from deterministic policy.
  - `Blast radius:` `extensions/index.ts` +, `tests/extension.test.ts` +; dispatch/verdict gates neutral.
- **No separate judge path; TypeLLM only as a backend through the existing JudgeBackend seam if ever used**: this plan adds no judge call, no plan grammar change, and no dispatched-verdict semantics change.
  - `Cost of inaction:` parallel policy engines and verdict types make gates disagree.
  - `Blast radius:` `scripts/judge.mjs` neutral, `agents/execution-doctrine.md` neutral, plan grammar neutral.

## Exploration
Scout artifact: `.workflows/scout/20261123-075-adaptive-output-format.md`. Confirmed surfaces: advisory chooser with fail-open prose (`scripts/format-chooser.mjs:1-9,14-22`), fixed `/status` template (`prompts/status.md:21-65`), close-out `--diagram` seam plus mandatory text follow-up table (`scripts/closeout.mjs:137,141-153`; `agents/registry.md:145-148`), existing generated-view seams (`scripts/plan-diagram.mjs:78-129`; `scripts/ship-diagram.mjs:66-105`), Pi TUI `Image` support with host image settings, and a locally verified open-diagram 0.4.0 renderer. Gates and launcher conventions are listed in the Context section; no new judge path or grammar surface is needed.

## Refactor assessment
- **Scan**: `scripts/format-chooser.mjs` already owns artifact selection; `scripts/closeout.mjs --diagram` already owns a diagram seam; `prompts/status.md` already renders status; `scripts/plan-diagram.mjs`/`scripts/ship-diagram.mjs` and `.workflows/tree.json:7` already establish generated views. No existing deterministic policy or TUI image hook exists.
- **Verdict**: `extend`
- **Block rule**: overlap discovered mid-plan that contradicts this verdict stops the plan and escalates to the human; never absorb silent overlap.

## Docs impact
Docs impact:
- `README.md` — document canonical-text-first policy, table/diagram thresholds, image-as-generated-view rule, and any new launcher commands.
- `docs/architecture.md` — add policy module → chooser/status/close-out/TUI renderer flow and note no new judge path.
- `CHANGELOG.md` — `plan 20261123-075: adaptive output format — deterministic text-first policy with earned diagrams`.
- `scripts/docs-lint-baseline.json` — update drift baseline for generated README command table and doc changes.
- `tests/wf-launcher.test.ts`, `tests/mise-tasks.test.ts` — launcher/mise coverage for any new scripts.
- `tests/chooser-wiring.test.ts`, `tests/gen-docs.test.ts`, `tests/eval-golden.test.ts`, `.workflows/evals/golden/` — wiring, generated-docs, and golden-case coverage.
- `scripts/wf.sh`, `.mise/tasks/output-policy`, `.mise/tasks/open-diagram-render` — new entrypoints for the new scripts.
CHANGELOG: next version — one-line entry containing Plan ID `20261123-075` (archive gate requirement).

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK 1 (Tier B 🔴) | worker | Deterministic output policy module | 🔴 BLOCKING | property-based (pure-function invariants) | 1 | — |
| TASK 2 (Tier B 🔴) | worker | open-diagram renderer seam | 🔴 BLOCKING | example-based + artifact checks | 1 | — |
| TASK 3 (Tier B ⚪) | worker | Advisory chooser consumes policy | ⚪ STANDARD | example-based | 2 | TASK 1 |
| TASK 4 (Tier B 🟠) | worker | TUI image + alt-text hook | 🟠 VERIFICATION_HEAVY | example-based | 2 | TASK 1, TASK 2 |
| TASK 5 (Tier B ⚪) | worker | `/status` wiring | ⚪ STANDARD | example-based | 2 | TASK 1 |
| TASK 6 (Tier B 🟠) | worker | Close-out/SHIP wiring | 🟠 VERIFICATION_HEAVY | example-based | 2 | TASK 1, TASK 2 |
| TASK 7 (Tier B 🔵) | worker | Docs, gates, launcher, release | 🔵 TIME_CONSUMING | example-based | 3 | TASK 1–6 |
| TASK 8 (Tier B 🟠) | worker | Final-review integration fixes | 🟠 VERIFICATION_HEAVY | example-based | 4 | TASK 1–7 |

Wave 1: TASK 1 + TASK 2 (`[PARALLEL-GROUP: A]`). Wave 2: TASK 3 + TASK 4 + TASK 5 + TASK 6 (`[PARALLEL-GROUP: B]`). Wave 3: TASK 7. Wave 4: TASK 8 (final-review fixes). All tasks in a wave must complete before the next wave starts; `/next` verdict-gates each task and `/review` is the final gate.

## Tasks

### TASK 1 (Tier B 🔴 BLOCKING): Deterministic output policy module
- **Agent**: worker
- **Wave**: 1
- **Depends On**: none
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-1.spec
- **Allowed**: `scripts/output-policy.mjs`, `tests/output-policy.test.ts`
- **Bottleneck**: 🔴 BLOCKING
- **Testing strategy**: property-based (pure-function invariants)
- **What**: Add a pure policy function returning `{ prose: true, statusTokens: true, table, diagram }` from explicit inputs. Encode: always prose summary + status tokens; table when ≥3 rows share ≥3 comparable fields or the artifact is mandatory closeout/next-moves; open-diagram when ≥4 tasks AND (dependencies ≥2 OR waves ≥2 OR status mix ≥2), OR a fix loop/state machine must be understood, OR ≥3 components with ≥2 meaningful links must be seen together; never image-only; never replace judge-readable text or the mandatory follow-up table. No judge call, no I/O, no grammar change.
- **Verify**: `bun test tests/output-policy.test.ts`
- **Status**: ✅ DONE

### TASK 2 (Tier B 🔴 BLOCKING): open-diagram renderer seam
- **Agent**: worker
- **Wave**: 1
- **Depends On**: none
- **Parallel group**: [PARALLEL-GROUP: A]
- **Contract**: .workflows/specs/task-2.spec
- **Allowed**: `scripts/open-diagram-render.mjs`, `tests/open-diagram-render.test.ts`
- **Skills**: `open-diagram`
- **Bottleneck**: 🔴 BLOCKING
- **Testing strategy**: example-based + artifact checks
- **What**: Add an injectable seam that renders a supplied diagram spec through the locally verified open-diagram 0.4.0 CLI to SVG + PNG and returns path, dimensions, smallest-text size, layout-problem count, and alt text. Fail loudly on layout problems/illegible text; make no format decision. Unit tests stub the runner so no Python/CLI dependency is required in `bun test`.
- **Verify**: `bun test tests/open-diagram-render.test.ts`
- **Status**: ✅ DONE

### TASK 3 (Tier B ⚪ STANDARD): Advisory chooser consumes deterministic policy
- **Agent**: worker
- **Wave**: 2
- **Depends On**: TASK 1
- **Parallel group**: [PARALLEL-GROUP: B]
- **Contract**: .workflows/specs/task-3.spec
- **Allowed**: `scripts/format-chooser.mjs`, `tests/format-chooser.test.ts`
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: example-based
- **What**: Replace the chooser's heuristic ladder with the TASK 1 policy result while keeping the existing two typed judge questions, fail-open-to-`none`, loud skip, advisory JSON output, and stated-reason overrule. Judge suggestions cannot set `diagram` without a policy positive; no new boundary, question, gate, or TypeLLM path.
- **Verify**: `bun test tests/format-chooser.test.ts`
- **Status**: ✅ DONE

### TASK 4 (Tier B 🟠 VERIFICATION_HEAVY): TUI image + alt-text render hook
- **Agent**: worker
- **Wave**: 2
- **Depends On**: TASK 1, TASK 2
- **Parallel group**: [PARALLEL-GROUP: B]
- **Contract**: .workflows/specs/task-4.spec
- **Allowed**: `extensions/index.ts`, `tests/extension.test.ts`
- **Bottleneck**: 🟠 VERIFICATION_HEAVY
- **Testing strategy**: example-based
- **What**: When policy returns a diagram, render only the generated image via Pi's built-in `Image` component with alt text alongside the unchanged prose; keep text usable when images are blocked, respect configured image width, and add no policy/chooser/verdict logic. No markdown `![](path)` dependency.
- **Verify**: `bun test tests/extension.test.ts`
- **Status**: ✅ DONE

### TASK 5 (Tier B ⚪ STANDARD): `/status` wiring
- **Agent**: worker
- **Wave**: 2
- **Depends On**: TASK 1
- **Parallel group**: [PARALLEL-GROUP: B]
- **Contract**: .workflows/specs/task-5.spec
- **Allowed**: `prompts/status.md`, `tests/status-wiring.test.ts`
- **Bottleneck**: ⚪ STANDARD
- **Testing strategy**: example-based
- **What**: Keep the existing markdown template and task/cost sections; prepend the policy-mandated prose summary and display-only status tokens, and allow a policy-approved diagram as an additive view. Do not change status markers, plan parsing, or bottleneck tag grammar.
- **Verify**: `bun test tests/status-wiring.test.ts`
- **Status**: ✅ DONE

### TASK 6 (Tier B 🟠 VERIFICATION_HEAVY): Close-out/SHIP wiring
- **Agent**: worker
- **Wave**: 2
- **Depends On**: TASK 1, TASK 2
- **Parallel group**: [PARALLEL-GROUP: B]
- **Contract**: .workflows/specs/task-6.spec
- **Allowed**: `scripts/closeout.mjs`, `tests/closeout.test.ts`, `tests/closeout-wiring.test.ts`
- **Bottleneck**: 🟠 VERIFICATION_HEAVY
- **Testing strategy**: example-based
- **What**: Reuse the `--diagram` seam so a policy-approved open-diagram artifact is additive to the unchanged Shipped/Deviations/Discoveries/Deferred/Watch text report and `### Next moves` table. Keep settle-judge input as `reportText` (images are not text input), keep the mandatory follow-up table with pinned columns, and add no new judge call.
- **Verify**: `bun test tests/closeout.test.ts tests/closeout-wiring.test.ts`
- **Status**: ✅ DONE

### TASK 7 (Tier B 🔵 TIME_CONSUMING): Docs, gates, launcher, release
- **Agent**: worker
- **Wave**: 3
- **Depends On**: TASK 1, TASK 2, TASK 3, TASK 4, TASK 5, TASK 6
- **Contract**: .workflows/specs/task-7.spec
- **Allowed**: `scripts/wf.sh`, `scripts/gen-docs.mjs`, `package.json`, `.mise/tasks/output-policy`, `.mise/tasks/open-diagram-render`, `tests/wf-launcher.test.ts`, `tests/mise-tasks.test.ts`, `tests/chooser-wiring.test.ts`, `tests/gen-docs.test.ts`, `tests/eval-golden.test.ts`, `.workflows/evals/golden/`, `scripts/docs-lint-baseline.json`, `README.md`, `docs/architecture.md`, `CHANGELOG.md`
- **Bottleneck**: 🔵 TIME_CONSUMING
- **Testing strategy**: example-based
- **What**: Wire both new scripts through `scripts/wf.sh` and `.mise/tasks/*`; update generated README command table, architecture doc, drift baseline, wiring/golden tests, and the CHANGELOG with Plan ID `20261123-075`. Document text-first policy, diagram thresholds, generated-view rule, and no-new-judge-path boundary.
- **Verify**: `bun test tests/wf-launcher.test.ts tests/mise-tasks.test.ts tests/chooser-wiring.test.ts tests/gen-docs.test.ts tests/eval-golden.test.ts && bash scripts/docs-lint.sh && bash scripts/check-drift.sh`
- **Status**: ✅ DONE

### TASK 8 (Tier B 🟠 VERIFICATION_HEAVY): Final-review integration fixes
- **Agent**: worker
- **Wave**: 4
- **Depends On**: TASK 1, TASK 2, TASK 3, TASK 4, TASK 5, TASK 6, TASK 7
- **Contract**: .workflows/specs/task-8.spec
- **Allowed**: `scripts/output-policy.mjs`, `scripts/output-policy-cli.mjs`, `scripts/open-diagram-render.mjs`, `scripts/format-chooser.mjs`, `scripts/closeout.mjs`, `extensions/index.ts`, `prompts/status.md`, `scripts/wf.sh`, `.mise/tasks/output-policy`, `README.md`, `docs/architecture.md`, `scripts/docs-lint-baseline.json`, `tests/output-policy.test.ts`, `tests/open-diagram-render.test.ts`, `tests/format-chooser.test.ts`, `tests/closeout.test.ts`, `tests/closeout-wiring.test.ts`, `tests/extension.test.ts`, `tests/status-wiring.test.ts`, `tests/wf-launcher.test.ts`
- **Bottleneck**: 🟠 VERIFICATION_HEAVY
- **Testing strategy**: example-based
- **What**: Close the whole-plan review defects: real CLI policy inputs and output, renderer path override, fence-free close-out spec, canonical report before renderer failure, and an in-repo producer for the generated-view message. No test weakening; docs budgets hold or fall.
- **Verify**: `bun test && bash scripts/docs-lint.sh && bash scripts/check-drift.sh`
- **Status**: ✅ DONE

## Contracts (generated after approval)
| Task | Contract File | Scenarios |
|------|--------------|-----------|
| TASK 1 | .workflows/specs/task-1.spec | 5 scenarios (always prose/tokens, table threshold, mandatory table, diagram triggers, negative/no-image-only) |
| TASK 2 | .workflows/specs/task-2.spec | 4 scenarios (artifacts, metrics, alt text, layout failure) |
| TASK 3 | .workflows/specs/task-3.spec | 4 scenarios (policy binding, advisory judge, fail-open, negative/no-policy-diagram) |
| TASK 4 | .workflows/specs/task-4.spec | 4 scenarios (Image render, alt text, text fallback, negative/no-policy logic) |
| TASK 5 | .workflows/specs/task-5.spec | 3 scenarios (summary+tokens, additive diagram, unchanged markers) |
| TASK 6 | .workflows/specs/task-6.spec | 4 scenarios (additive diagram, mandatory table, text-only judge input, negative) |
| TASK 7 | .workflows/specs/task-7.spec | 4 scenarios (launcher wiring, generated docs, drift baseline clean, CHANGELOG Plan ID) |
| TASK 8 | .workflows/specs/task-8.spec | 7 scenarios (policy CLI, chooser inputs, renderer override, fence-free spec, report-first failure, TUI producer, full gates) |

## Ledger Resolution
Drain before grow: every row of the last ship report's follow-up table is resolved here — token grammar: `done(<task-ref>)` / `closed(<reason>)` / `deferred(trigger: <condition>)`.

| Item | Disposition | Note |
|------|-------------|------|
| Last ship report follow-up table | `closed(empty .workflows/queue.json)` | Verified 2026-11-23: queue contains `[]`; no open rows claimed resolved. |

## Execution Notes
<filled in as tasks are completed — includes cost, duration, and learnings per task>

- `lessons: les-20261026-032-task-1` — chooser engine predecessor; TASK 3 extends it, adds no judge path (provenance `from_untrusted`, informs only).
- `lessons: les-20261026-032-task-2` — wiring + release predecessor; TASK 7 keeps the launcher/docs pattern (provenance `from_untrusted`, informs only).
- `JUDGE SKIPPED` — native `typellm_judge` unavailable in this session; `.workflows/ideas.md` rows stay untriaged, none silently dropped.
- `JUDGE SKIPPED` — contract pre-flight object schemas are unsupported by the current `scripts/judge.mjs` backend; question files are kept at `.workflows/reviews/preflight-task-*.json`, no findings silently dropped, and agent-spec parse + selector lint are the mechanical authorities.
- Pre-approval: derive/confirm Depends On edges and run the advisory `format-chooser choose --for plan-approval` call; prose plan.md remains the source of truth.
- TASK 1: ok:true · 180.9k tokens / 8m06s (worker 60.2k/2m57s + reviewer 120.7k/5m09s) · verdict `.workflows/reviews/task-1.md`.
  context: no changes.
- TASK 2: ok:true · 137.2k tokens / 6m51s (worker 78.7k/4m03s + reviewer 58.5k/2m48s) · verdict `.workflows/reviews/task-2.md`.
  context: no changes.
- TASK 3: ok:true · 132.2k tokens / 6m30s (worker 69.8k/3m26s + reviewer 62.4k/3m04s) · verdict `.workflows/reviews/task-3.md`.
  context: no changes.
- TASK 4: ok:true · 173.9k tokens / 11m34s (worker 113.8k/7m40s + reviewer 60.1k/3m54s) · verdict `.workflows/reviews/task-4.md`.
  context: no changes.
- TASK 5: ok:true · 209.4k tokens / 9m13s (worker 156.8k/6m22s + reviewer 52.6k/2m51s) · verdict `.workflows/reviews/task-5.md`.
  context: no changes.
- TASK 6: ok:true · 168.7k tokens / 10m44s (worker 98.0k/7m00s + reviewer 70.7k/3m44s) · verdict `.workflows/reviews/task-6.md`.
  context: no changes.
- TASK 7: ok:true · 226.9k tokens / 16m14s (worker 147.1k/10m57s + reviewer 79.8k/5m17s) · verdict `.workflows/reviews/task-7.md`.
  context: no changes.
- FINAL REVIEW TASK 7: ok:false — full suite regression after merge (README literal pill tokens, docs-lint budget rise, package.json/CHANGELOG version mismatch). Fix round dispatched with expanded Allowed Changes including `package.json`.
- TASK 7 fix round closed: ok:true · 199.0k tokens / 17m22s (worker 130.7k/13m01s + reviewers 68.3k/4m21s) · verdict `.workflows/reviews/task-7.md` Round 3.
- FINAL REVIEW: bug-hunter confirmed 3 findings and quality review requested changes; TASK 8 added to close integration defects before SHIP.
- TASK 8: ok:true · 210.1k tokens / 19m35s (worker 139.2k/15m00s + reviewer 70.9k/4m35s) · verdict `.workflows/reviews/task-8.md`.
  context: no changes.
- Wave execution: Wave 1 TASK 1 + TASK 2 → Wave 2 TASK 3 + TASK 4 + TASK 5 + TASK 6 → Wave 3 TASK 7 → `/review` (final gate + SHIP).
