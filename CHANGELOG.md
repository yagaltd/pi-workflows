# Changelog

All notable changes to pi-workflows are documented here.

---

## v0.4.0 (2026-08-21)

### Breaking: migrated to @arhen/pi-core-subagent

Replaced the removed `pi-subagents` + `pi-prompt-template-model` (+ implicit `pi-intercom`) extensions with `@arhen/pi-core-subagent`. No functional feature was lost — the wave engine and per-task model routing got better.

### Added — verdict gating + bounded fix rounds + reviews/ audit trail (ported from pi-specflow)

- **No model marks its own work done**: a task's ✅ is written only from a reviewer verdict `ok:true` (mechanical stage strictly before judgment). Reviewer and quality-reviewer role prompts now end with a binding `## Verdict` block (`ok: true|false` + evidence-backed findings; never ok:true with findings). `/next` and `/auto-next` run worker → reviewer → verdict for every task; parallel waves parse per-task verdicts.
- **Bounded fix rounds**: `ok:false` → fix round (worker role, rejection evidence prepended verbatim, `thinking: high`) → re-review → repeat while `N < max-rounds` (spec frontmatter, default 2). Rounds exhausted → ❌ FAILED with the verdict chain to the human — rejection loops escalate, never spin. Fix rounds are follow-up dispatches, never pre-declared graph nodes. **Reviewers verify, never fix.** No separate fixer role — worker keeps the role set closed (registry).
- **Verdict artifacts**: every round appended to `.workflows/reviews/<task-id>.md` (orchestrator-written per the charter). `/review` Stage 1 gains Layer 3: verdict trail — a ✅ task without a final ok:true on file is a reported red flag.
- **Worker discipline lines**: bash runs in project dir (never `cd`), NEVER commit/merge/push (the uncommitted diff IS the reviewer's ground truth), a deviation is a finding to report, not an accomplishment.

### Added — `/audit` (codebase map + adversarial pre-scan)

Preflight (0 tokens) → recon scout → durable `.workflows/knowledge/map.md` (modules, trust boundaries, risk concentrations; updated not replaced, never archived) → bug-hunter scan subagent (repo scope, `--security` adds security lenses) → distilled findings routed into `/plan`. LOG.md line per audit. Audit feeds planning; it never plans, fixes, or commits.

### Added — `scripts/check-drift.sh`

Always-on drift checker (specflow `check-views.sh` pattern): dead prompt frontmatter keys, removed-extension API remnants, role files present + registered, skill/template references resolve, peerDeps pin the current engine, README command table ↔ prompt files. Exit 1 on any drift; verified both green and (injected-violation) red. Run after every refactor of this package.

### Added — `/brainstorm` (divergent research mode)

New command + skill for the phase before `/explore`/`/idea`: market/competitor research, product ideation, half-formed ideas — think together with the human, no building. Living **markmap-renderable ledger** at `.workflows/research/<slug>/ledger.md` (branches with evidence-gated statuses ✅/❌/❓/💤, ranked frontier of open questions, cited sources); read-only research subagents (web/market angle with bash-for-fetch allowlist, repo via scout role, synthesis via `needs` fan-in) whose reports persist verbatim as `report-<NN>-<slug>.md`; deep-research briefs freeze scope before heavy passes; resume protocol for multi-session topics; graduation paths to `/explore`, `/idea` (optionally synthesizing `knowledge/evidence-*.md`), park, or kill. Containment: orchestrator is the single writer; `research/` joins the never-archived durable knowledge tier.

### Added (plan versioning, charter, grill — ported from pi-specflow / grill-for-unknowns)

- **Versioned plans**: `Plan ID: YYYYMMDD-NNN` in plan.md; `/idea` + `/plan` refuse to overwrite a live plan (route to `/review` or `/abort` first). SHIP (`/review` Stage 3) archives the bundle (plan.md + specs/ + reviews/ + CONTEXT.snapshot.md) to `.workflows/archive/done/<id>-<slug>/`; new `/abort` archives to `.workflows/archive/superseded/`. CONTEXT.md, ADRs, LOG.md stay live and never archive. Plan IDs derive from the archive listing so they never collide.
- **Project charter**: new `templates/AGENTS.md` copied to the project root by `/idea` — pi auto-loads AGENTS.md for every session including pi-core-subagent children, so containment rules bind everyone: single status writer for `.workflows/`, contract-bounded code writes, no subagent commits/merges/pushes, throwaway artifacts stay in their lanes, fail loud.
- **Grill protocol completed** (in `/idea` already; now full): unknowns taxonomy (map vs territory — known knowns / known unknowns / unknown knowns / unknown unknowns), blindspot pass for unknown unknowns before planning, unknown-knowns routing to prototypes instead of text questions, one-blocking-question-at-a-time template with AFK default, question quality bar (material / grounded / answerable) also in `/explore` and `/amend`. Protocol adapted from the grill-for-unknowns skill (Nico Bailon, Matt Pocock); pi-specflow's refinement (Recommended + Evidence + Consequence-if-different payload) folded back in.

- **Thinking tools** (new `templates/THINKING-TOOLS.md`, wired into the skills that need them): **Five Whys** systemic why-chain in `/fix` diagnosis (verifiable whys only, end at a missing guard never "human error", explicit fix level: code/test/process; recurrence tests cover the class); **Six Thinking Hats** divergence→convergence for option generation in `/idea`, `/prototype` (Green generates radically different structures, White/Yellow/Black evaluate); **Impact × Effort matrix** for option convergence in `/idea`, `/optimize` (Quick Wins in, Big Bets de-risked via prototype, Money Pits dropped in writing), `/plan` (quadrants drive bottleneck tags), `/explore` (kill/pivot evidence). Recommendation-with-question was already mandatory via the grill payload — unchanged.

- **Durable knowledge tier `.workflows/knowledge/`**: `/explore` now writes `explore-<date>-<slug>.md` (question, per-angle findings with citations, synthesis, verdict) + a `LOG.md` line; `/idea` persists substantial recon as `evidence-<date>-<slug>.md`; `/next` persists scout reports verbatim as `scout-<task-id>.md`. Subagents stay read-only by design (single-writer) — the orchestrator persists what they return. `knowledge/` joins CONTEXT/ADR/LOG as never-archived. Previously exploration findings were chat-only ephemera (nothing hit disk even pre-refactor).

### Added — `skills/optimize` (deep optimization mode)

Measurement-gated optimization skill (appeared during user testing, adopted): Phase 0 baseline-or-nothing hard gate (committed benchmark, N reps, median + spread, baked-in equivalence oracle), Phase 1 profile-names-the-target, Phase 2 double contracts (equivalence clause + measured-delta clause with rejection floors), Phase 3 per-task worker+reviewer with independently reproduced numbers, Phase 4 integrated re-run + no-regression sweep. `prompts/optimize.md` now routes explicitly: experiment mode (parallel candidates, this prompt) vs deep mode (this skill).

### Added — `/optimize` mode 3: pi-autoresearch handoff

`/optimize` now routes three modes (experiments / contracted deep pass / unattended loop). Loop mode hands off to the pi-autoresearch extension like `/review` hands off to bug-hunter, but file-based: Phase 0/1 run here first, then the skill's **Handoff to pi-autoresearch** section maps contract vocabulary onto `.auto/` session files — benchmark → `measure.sh` (METRIC output), equivalence oracle + suite → `checks.sh` (oracle failure blocks keep: mechanical per-iteration equivalence), Allowed Changes/Forbidden → `prompt.md` Files in Scope/Off Limits. Handoff artifacts are verified (one measure run + one checks run) before entering the loop. Close chain: `autoresearch-finalize` → `/review` (tier-2 SHIP stays human-gated). Graceful fallback to deep mode when the extension is absent.

### Fixed

- **`tdd-guard spec-verify` → `tdd-guard verify`**: prompts called a command the installed CLI doesn't have (`spec-verify`); every invocation would fail as unknown-command and be skipped. Fixed in agents/reviewer.md, agents/worker.md, skills/add-feature.

### Fixed (bombadil correction)

The previous entry misclassified **bombadil** as a dead integration — it is installed and supported: restored as an optional dep (property-based testing for web/terminal UIs, Antithesis). Wiring: plan skill testing table routes web UI to example-based + browser subagent (quick) / bombadil (property-based); add-feature UI verification gains a property check (`bombadil test <origin> --exit-on-violation`) for 🟠 VERIFICATION_HEAVY web tasks; package.json + README optional deps. Drift checker un-bans bombadil (pi-annotate / pi-boomerang / pi-interview stay banned).

Also: removed the internal probity-evaluation note from the README requirements — the README is user documentation; evaluation rationale lives here.

Not adopted: **lonkero** (dynamic web security scanner) — requires a vendor API license key; no integration.

### Changed (integration reality check)

- **agent-spec**: requirements now point at the upstream [ZhangHanDong/agent-spec](https://github.com/ZhangHanDong/agent-spec) (the fork URL was stale; the installed v1.4.0 builds from upstream).
- **tdd-guard** now documented as a first-class optional dep (yagaltd fork, clone + `npm link` — not on npm; npm's `tdd-guard@1.7.0` is an unrelated project). Evaluated **probity** (TDD Guard's successor) as replacement — **not adopted**: continuous agent-transcript hook (Claude Code/Codex/Copilot CLI only, no pi), no agent-spec integration; revisit if pi support lands.
- **Removed dead integrations everywhere** (never in the active toolchain): pi-interview (skills now interview in chat per the grill protocol), pi-annotate (UI fixes use a browser-automation subagent — agent-browser skill), pi-boomerang, bombadil (add-feature checklist/sections, fix annotate flow, plan testing table, README journeys/guidance, package.json optionalPeerDeps).
- **package.json optionalPeerDependencies** now match reality: agent-spec, tdd-guard, pi-autoresearch.
- **Drift checker hardened**: catches dead integrations (pi-annotate/pi-boomerang/pi-interview/bombadil), stale agent-spec fork URL, and `.pi/agents/` resurrection. Verified green + red.
- Deleted stale `.pi/agents/*` legacy files (were gitignored, disk-only).

- **CONTEXT.md update made deterministic** (root cause of missed updates: conditional step + no structural forcing): worker reports now carry a **mandatory `## Domain Memory`** section (Terms/Decisions/Conflicts, "none" valid — never omitted); `/next` + `/auto-next` always record a `context: <updated|no changes>` marker per task in Execution Notes; `/status` reports `context markers: X/Y`; `/review` Layer 3 audits markers and SHIP gains a **domain-memory sweep** (guaranteed backstop — promotes unpersisted terms/decisions to CONTEXT.md/ADRs before archive).
- **`/review` is risk-tiered (Stage 0)**: fast path for small/low-risk plans (≤2 tasks, no 🔴/🟠, docs-only/single-module diff — skips Stage 2 unless security-relevant) vs full path default. Irreducible core never skipped: repo-wide guard, one final suite run on the integrated state, verdict trail, SHIP. Rationale: per-task verification runs on partial states and cannot see cross-task regressions or cumulative boundary violations — only the final pass sees the whole change set.
- **Plans end at build (+ optional docs) tasks**: plan-level "verify"/"quality review" tasks removed from the plan skill — they duplicated the gate chain (per-task verdict gating in `/next` + tier-2 `/review`). Reviewer/quality-reviewer are roles, not plan tasks.

- **Dispatch policy moved to `agents/registry.md`** (new, single source of truth): role → prompt file + toolset, and the bottleneck-tag → `model`/`thinking` ladder, applied **per task at dispatch time** (was: hardcoded model frontmatter + `subagents.agentOverrides` settings).
- **Agent files are now verbatim role prompts** pasted into `subagent({ prompt })` — no more agent-file frontmatter, `reads:` preloading, `progress:`, or `inheritProjectContext`. The `task:` text names the files each child must read.
- **Waves are now `needs` edges**: `/next` parallel waves and reviewer/quality-reviewer gating dispatch as one graph call — pi-core-subagent schedules waves, prepends upstream outputs to dependents, and auto-aborts dependents of failed tasks.
- **`/auto-next`**: background runs with `notifyPerTask` + `await_subagent` loop, `reply_subagent`/`steer_subagent` for live steering, `subagent_cancel` on blockers. Removed the per-task `create_goal()` wrappers from both `/next` and `/auto-next` (proof moved to `git diff --stat` + `Verify:` exit codes; pi-native goals remain usable ad hoc).
- **Isolation without worktrees** (in-process children share the filesystem): parallel tasks MUST have disjoint contract `Allowed Changes`; prototypes/experiments isolate by directory (`prototype/variation-a/`, `optimize/exp-a/`) — verified post-run with `git diff --stat` / `git status --porcelain`.
- **Proof over self-report**: every dispatched task carries a runnable `Verify:` line; the orchestrator reconciles results against `git diff --stat` (exit code + diff are ground truth).
- Prompt templates dropped `model:`/`thinking:`/`skill:`/`restore:` frontmatter (unsupported keys); `skill:` became an explicit "load SKILL.md" body instruction. Bug-hunter dispatch is now an inline subagent prompt instead of a CLI invocation.
- README: requirements, model configuration, and directory structure updated.

### Removed

- `pi-subagents`, `pi-prompt-template-model` peer dependencies (now `@arhen/pi-core-subagent`).
- `subagents.agentOverrides` settings pattern (replaced by `agents/registry.md`).

---

## v0.3.0 (2026-06-10)

### New Commands

- **`/auto-next`** — fires a parent `create_goal()` and autonomously executes ALL tasks in `.workflows/plan.md`, wave by wave, parallelizing within waves. Only surfaces on blockers or completion.
- **`/challenge`** — adversarial grill of your plan against domain model. Walks the decision tree, sharpens terminology, updates `.workflows/CONTEXT.md` inline.

### Flow Change

- **Plan → Approve → Contracts**: `/plan` and `/idea` now write the plan first, stop for human approval, then generate `.spec` contracts. No more spec files written before you've green-lit the plan.
- `/next` and `/auto-next` both wrap every subagent dispatch with `create_goal() / update_goal()` for deterministic tracking (inspired by [pi-codex-goal](https://github.com/fitchmultz/pi-codex-goal)).

### Structural

- **`.workflows/` prefix**: All generated artifacts now live under `.workflows/` — `plan.md`, `specs/`, `CONTEXT.md`, `CONTEXT-MAP.md`, `docs/`, `REVIEW_GUIDELINES.md`. No more root clutter.
- **Deterministic bootstrap**: Every workflow starts with `mkdir -p .workflows/` so the agent never hesitates.
- **Templates added**: `templates/CONTEXT-FORMAT.md` (domain glossary format), `templates/ADR-FORMAT.md` (architecture decision record format).

### Spec Improvements

- **Diagrams in contracts**: Contract template now includes an optional `## Diagrams` section with Mermaid examples (flowcharts, state machines, sequence diagrams).

### Verification

- **bug-hunter** integration in `/next` post-task pipeline.
- **open-code-review** line-level AI review after each task.
- **TDD vertical slices**: Workers now write one test → one implementation at a time per contract scenario (RED → GREEN → refactor).

### README

- Updated flow diagram: `PLAN → APPROVE (🛑 GATE) → CONTRACTS (generated) → EXECUTE`.
- `/auto-next` added to all command tables and user journeys.

---

## v0.2.0 (2026-04-xx)

- 8 improvements from V3 upgrade plan
- Subagent delegation for explore + wave execution for `/next`
- Model ID updates, restored upfront spec writing
- Removed JIT contracts (contracts written upfront, not lazily)
- Removed `/help-workflows` (moved to README)
- Strengthened evidence-first workflows
- Documented optional UX extensions (pi-interview, pi-annotate, bombadil, pi-boomerang)

---

## v0.1.0 (2026-03-xx)

- Initial release of pi-workflows
- Contract-driven multi-model workflow for pi
- Core commands: `/idea`, `/plan`, `/explore`, `/next`, `/add`, `/fix`, `/refactor`, `/review`, `/verify`, `/docs`
- agent-spec contract verification (BDD scenarios + boundary enforcement)
- pi-subagents parallel execution
- Bottleneck tags and testing strategy matrix
- Cost logging per task
