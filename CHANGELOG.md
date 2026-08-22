# Changelog

## v0.5.4 (2026-08-22)

### Added — herdr wave-orchestrator spike (verdict: NO-GO, successful spike) + two dogfood hardenings (plan 20260822-006)

First plan run end-to-end through the v0.5.3 delegated drafting pipeline (scout facts → strong-model draft → adversarial pass → spec-drafter fan-out → human gate). The spike asked: can a per-wave orchestrator pi session in its own herdr tab run waves via in-process children so the parent pays summaries only?

- **Spike verdict: NO-GO** (`.workflows/scout/006-wave-orchestrator-verdict.md`) — harness and economics PROVEN (TUI child in own workspace, lifecycle-tracked, ground-truth verification, ~**100:1 context compression** for $0.028; print-mode children invisible to herdr — `herdr-agent-state.ts:228`), but **depth-2 dispatch is systematically broken**: child→grandchild workers executed ZERO tools in 2/2 rounds (0 tools · 1 turn, ↓75–152B) while the runtime reported ✓ succeeded. Depth-1 on the same model worked all session. Next step: root-cause nested tool execution, then re-spike. NO-GO is a successful spike per doctrine.
- **Value/impact matrix** (T5, orchestrator-inline — the tier rule applied to itself): every task in the adversarial pass must answer "cheapest path to the user-visible outcome?" — delete or inline tasks that only serve the design.
- **Thinking maps in the registry** (T6): roles gain `thinking: {supported, source}` resolved at scan time from the installed pi package's provider data (`pi-package:` anchors) with observed/constants fallback — kills the `thinking:medium`-on-pro-0813 dispatch failure class hit live during this plan's own drafting. Tests 40/40.

Pipeline dogfood findings on record: 3× `stopReason:length` on pro-0813 (read-heavy + high-thinking dies mid-generation — mitigation: compact contracts, inlined evidence, early writes); spec criteria must be re-checked when a plan is amended post-draft (C10/C17 stale after +T6); grep-literal criteria need the artifact author to know the exact strings.

---

## v0.5.3 (2026-08-22)

### Added — task tiers, delegated drafting pipeline, plan hygiene (plan 20260822-005)

The planning process itself got the contract treatment. Evidence base: three sessions showing workers rarely fail — seams and planning gaps do — plus the wave-parallelism incident (a worker briefly reverted a sibling's landed files in the shared tree) and a spec-design flaw surfaced by an honest reviewer (boundary vs. pre-existing state conflict → orchestrator amendment + round-2 verdict, the doctrine triangle working end to end).

- **Task tiers (routing overlay)**: every plan task carries Tier A (mechanical — `@model:standard`+low, grep-only review via the `Verify:` line, or **orchestrator-inline: don't dispatch at all**), B (bounded — existing per-tag pipeline), or C (spike/architecture — `@model:strong`+high, serial, never parallel). Decided in the adversarial pass, written next to each task; refines routing, never the existence of a verdict. Wired as a Tier column in `agents/registry.md` (16 `@model:` refs preserved).
- **Delegated drafting pipeline** (`skills/plan/SKILL.md`, insertions-only): scout facts artifact (`.workflows/scout/<plan-id>.md`, file:line grounding) → strong-model draft → **adversarial + SPLIT/RISK pass** (single-surface inventory, seam hunt, per-task tier check; why-waves rationale cited) → **spec-drafter fan-out** (one subagent per decision; decision verbatim + scout slices + boundaries; orchestrator mechanical review) → human gate. ≥2-wave plans default to the fan-out.
- **`agents/spec-drafter.md`** (fifth role): one decision in, one house-format spec out; SPEC_BLOCKER on ambiguity; filesystem-verified criteria for gitignored paths; task-scoped diff criteria.
- **Dispatch shapes**: `Spec drafting fan-out` + `Plan draft delegation` templates.
- **Hygiene**: consumed specs archive at ship (`archive/done/<plan-id>/specs/` — 003's and 004's nine archived retroactively); plan `Status:` line (single-writer orchestrator, stale-echo rule); **await-loop economy** (background-first, gated autoAwait, slice-loop awaits, targeted subagent_result — engine-native v1.3.28 mechanics).

Registry routing live-proven during this plan's own dispatch: `deepseek-v4-flash-0731` / `pro-0813` resolved and ran (no fallback needed).

---

## v0.5.2 (2026-08-22)

### Added — model registry + reviewer integrity hardening (plan 20260822-004)

Two live incidents from the MorphEditor sessions became enforced policy: a final reviewer dispatched without bash certified borrowed worker reports as PASS ("122/334/0 ✅ confirmed by others" — actual 121/333/1), and every dispatch hardcoded 0423-era model ids while newer, cheaper builds sat live.

- **`scripts/models-scan.mjs`** (new, zero-dep ESM): resolves preference slots to concrete provider/model ids from live OpenRouter pricing (`GET /api/v1/models`) + DeepSeek official docs constants (no pricing API exists). Newest-dated-build-wins, atomic temp+rename write, offline keeps last resolutions + WARN + exit 1 (never wipes), `--fixture`/`--dry-run`/`--prefs` flags. 11 offline tests.
- **`models/registry.json`** (new, user-editable): 4 role slots (standard/strong/reviewer/scout) — prefs order maps positionally to role order. Seeded live: flash-0731 $0.14/$0.28, pro-0813 $0.55/$2.19 per M (deepseek-api, official pricing — far below the old hardcoded OR aliases).
- **`agents/registry.md` + `agents/dispatch-shapes.md`**: bottleneck table speaks `@model:<role>` refs (13 across all 4 roles; raw ids only as marked fallback constants); resolve-or-**loud-fallback** contract (WARN naming role + fallback — never silent); reviewer toolset marked **bash non-optional**.
- **`agents/reviewer.md`**: **Step 0b — Capability check (VOID rule)** — no bash ⇒ every execution-dependent layer is VOID, NEVER PASS from worker/sibling reports ("borrowed evidence is not evidence"); any VOID ⇒ `ok: false` + orchestrator-must-re-run. Insertions-only (+12).
- **`agents/worker.md`**: evidence-timing rules — verification counts only if run AFTER the final file edit; doc counts derived from a post-edit run, never memory (+6). Kills the 3×-recurrence stale-count class.
- **`README.md`**: Model registry + Reviewer integrity sections.

Dogfooded live in-plan: every reviewer carried bash + the Step 0b discipline; the orchestrator's own re-verification caught one wave-parallelism incident (T2 briefly reverted T3's role files in the shared tree — steer + reconstruction verified insertions-only by diff). Spec-design finding ledgered for 005: `git diff`-style CCs must be task-scoped in shared parallel worktrees.

---

## v0.5.1 (2026-08-22)

### Added — subagent landing hardening: cwd GUARD + anti-phantom tripwire + VOID semantics (plan 20260822-003, dogfooded live)

Root cause chain from the MorphEditor 20260822-002 incident: pi-core-subagent honored run-level `cwd` in only 3/10 spawns → one worker scaffolded an entire fake project in a phantom directory; four reviews produced void verdicts from the wrong root. All retries with per-task `cwd` + a landing guard landed 13/13. This plan turned that fix into enforced policy — and validated itself during its own execution (11/11 nodes landed correctly; a round-1 boundary rejection was correctly vacated in round 2 as D7a union-noise, proven by the new tripwire's attribution).

- **`tooling/verify-landing.sh`** (new): mechanical phantom-work tripwire — S1 landing check (any diff within the task's Allowed paths in the expected repo; zero diff + claimed done = ALARM), S2 claims-vs-reality (every file in the worker's Files Changed must appear in `git status` — catches partial fakes), S3 magnitude (informational numstat + explicit untracked count). `--selftest` builds four mktemp fixture repos and asserts all behaviors (4 PASS). LOC/tokei deliberately rejected as detectors — the phantom produced a *full project*; the failure is location, not volume.
- **`agents/registry.md`**: dispatch cwd policy — per-task `cwd` mandatory, run-level/inherit never sufficient (evidence: 3/10 vs 13/13); isolation policy gains the tripwire mandate (run after every claimed-done write task; ALARM → report untrusted → verify cwd → redispatch); reviewer tier notes point at the new provenance line + VOID semantics.
- **`agents/worker.md`**: **Step 0 — GUARD (verify your landing)** before any work: `pwd` + `git rev-parse --show-toplevel` must match the absolute repo path named in the task text's first line; mismatch → `WORKER_BLOCKER: inaccessible_resource`. Includes the **anti-scaffold clause** (an empty or foreign project tree is an environment failure, NEVER a build instruction), the spec-reachability rule (deliberately absent → proceed from task text; expected-but-unreadable → blocker — unreachable ≠ missing), and read-AGENTS.md-if-present (the harness does not inject it — verified empirically). The old "your bash already runs in the project working directory" assertion corrected to a verify-it form.
- **`agents/reviewer.md` + `agents/quality-reviewer.md`**: read-only Step 0 GUARD + **VOID semantics** (wrong root → exactly one line `VOID — wrong working directory (<found> ≠ <expected>); no verdicts emitted` — never per-spec verdicts from a wrong root) + mandatory `repo: <git toplevel>` provenance line opening every report. Quality-reviewer's CONTEXT.md domain-memory read unchanged (context routing: specs are the single decision channel).
- **`agents/execution-doctrine.md`**: the loop gains the tripwire step between reviewer `ok:true` and verdict persist (fake work is never reviewed); **consolidated final review** rule (wave-time `agent-spec guard` over a shared worktree is union-noise; the full-tree review at plan end is the review of record — proven by live fire in this plan's own round-1/round-2 exchange); **lifecycle-skip honesty** (scenario skips are "unverified-by-lifecycle", a documented gap — never silently treated as pass); **live-smoke layer** (UI-facing plans include a live smoke task; unit-green ≠ working — F1 form-persist + F2 stale-serve evidence).
- **`agents/dispatch-shapes.md`**: every dispatch template gains `cwd: "<absolute repo path>"`; worker task-texts open with the absolute-repo GUARD anchor line; new **live-smoke dispatch shape**.

All notable changes to pi-workflows are documented here.

---

## v0.5.0 (2026-08-21)

### Fixed (review round — /review Stage 1-2 on this very branch)

- **Drift gate was a no-op (BH-001, critical)**: every `grep | while read` loop in `check-drift.sh` ran `err()` in a pipeline subshell — `FAIL=1` never reached the parent; drift printed yet the script exited 0 ("CLEAN"). All loops converted to process substitution (`done < <(cmd)`); the `ok:` line now only prints when its section is clean. Red-tested (injected ghost role → exit 1). This is why the findings below shipped green.
- **Dispatch-note leak into every subagent prompt (BH-002)**: `roleBody()` stripped only a *leading* HTML comment, but role files put the note *after* the `# Role:` line — the meta-note (with a dangling package-relative path) was injected into every `@role:` dispatch. Fixed strip order; regression test reads the real four role files; live-verified.
- **Dialect triplication (BH-003)**: `prompts/next.md` still used the verbatim-paste dialect in four templates, contradicting the `@role:` doctrine in dispatch-shapes/execution-doctrine/registry. Rewritten: routes to all three reference files, `@role:` everywhere, short task texts (workflow lives in the role prompt), duplicated verdict-format/fix-round/workflow blocks deleted (5.8KB). registry.md intro rewritten to the `@role:` mechanism.
- docs-check duplicate step numbering; CHANGELOG size/test-count/dedupe claims corrected to match the artifact.

### Added — pi-workflows extension (first runtime code) + lean-context architecture

Context-budget refactor: prompts shrank 40-70% by moving conditional content to on-demand reference files and making role dispatch mechanical.

- **`extensions/index.ts`** (registered via `pi.extensions`): (1) `@role:<name>` resolution — subagent tool calls with `prompt: "@role:worker"` get the verbatim `agents/<role>.md` body substituted at execution time (`tool_call` event, mutable input; unresolved refs BLOCK the call); the orchestrator never reads or pastes role files — kills the worker-workflow duplication structurally. (2) Hygiene watchdog (`before_agent_start`): ✅ tasks missing `context:` markers or final `ok:true` verdicts trigger a one-line reminder injection at the moment of drift (one reminder per drift episode — no spam). Pure logic unit-tested (`bun test`).
- **Reference-file splits** (progressive disclosure): `agents/execution-doctrine.md` (verdict gating + fix-round shapes + reviews/ format — loaded on rejection), `agents/dispatch-shapes.md` (parallel wave / scout / bug-hunter shapes — loaded when that shape fires), `templates/CONTRACT-FORMAT.md` (Phase 5 contract generation — loaded after plan approval), `skills/brainstorm/references/{ledger-format,dispatch-shapes,resume-protocol}.md` (loaded per phase).
- **Prompts rewritten lean**: next.md routes to `agents/{registry,execution-doctrine,dispatch-shapes}.md` (sequential shape inline with `@role:` refs, everything conditional referenced), auto-next.md 6.1KB → 3.8KB, brainstorm SKILL.md 10.2KB → 4.6KB router, plan SKILL.md 17.8KB → 14.4KB. Worker workflow stated ONCE (role file), not restated in task texts.
- **review.md / audit.md**: bug-hunter dispatch blocks → shared shape reference in `agents/dispatch-shapes.md`.
- **templates/AGENTS.md**: trimmed 3.7KB → 2.4KB (every rule intact, prose compressed) — always-on cost per user-project session reduced.
- **Drift checker**: new rules — every `@role:` ref resolves to a registered role file; every `references/*.md` module resolves; extension present + registered in the pi manifest. Red-tested.
- `.workflows/` gitignored (dogfooding artifacts stay local).

### Added — `/init` (project bootstrap) + documentation policy (plan 20260821-002)

- **`/init` command + skill**: the step before `/idea`/`/plan` — designs the structure the contracts will later enforce. Decide (stack/domain, grill protocol) → Design (modules, boundaries → future contract Forbidden lists, Mermaid data flow, ADRs) → **Tree proposal approved as an artifact** (seeds `.workflows/docs/architecture.md` pre-build, tree included) → Scaffold (one verdict-gated worker task: dirs + stubs per the tree) → Wire (charter to project root — moved from /idea's ownership, CONTEXT.md seed, README skeleton) → hands off to `/plan` with contract Boundaries deriving from the documented tree. Existing projects route through `/audit` first — never re-scaffold over live code.
- **Documentation policy** (`templates/DOCS-POLICY.md`, wired not inlined): README = current-state user docs, **same-task updates** (never catch-up commits — the rule violated 4× in this repo's own history, now enforced at three points: /next closeout, docs-check gate, /review Layer 4 README-freshness + folder-tree conformance check); CHANGELOG.md = append-only, **one curated entry per shipped plan, appended by the orchestrator at /review SHIP inside the commit** (workers never touch it); docs/ vs README vs `.workflows/docs/` placement rules; what never goes where (history never leaks into docs). Charter carries the binding one-liner.
- **AGENTS.md authoring rules** (DOCS-POLICY, wired into `/init` + `/idea`): the project's AGENTS.md holds binding rules + one-liner facts + **pointers to detail docs** (`Test: npm test` · `Tests detail: tests/README.md`) — never command inventories; nested AGENTS.md files don't auto-load (pi loads context files walking up from cwd only — verified), so pointers are the only correct indirection; ~50-line budget (AGENTS.md is always-on context for every session and subagent).
- **Docs-drift watchdog** (extension): README-staleness (code committed after README's last update, plan active — DOCS_EXEMPT filters docs/workflow-state/CI/assets/locks), docs/ staleness, and CHANGELOG-pending-at-complete-plan reminders; git-based with testable exec injection, episode-dedupe, graceful non-git degradation. Live-verified in real sessions; caught the historical README-lag episode at 14 stale files. Also fixed live: the original watchdog's reminder injection never worked (`event.injectMessage` doesn't exist — the real API is the `before_agent_start` return value); done-task counting no longer matches raw ✅ emoji (prose inflation); context-marker regex matches the inline-bullet format /next actually writes.

### Added — engine-enforced verification loop (plan 20260821-001, dogfooded live)

- **Unified worker→reviewer graph**: sequential `/next` dispatches ONE subagent call — `tasks: [worker, reviewer(needs: worker)]` — the reviewer fires mechanically when the worker settles (zero orchestrator turns; worker output auto-prepended). Engine = unconditional sequencing; orchestrator = conditionality (fix rounds and re-reviews stay follow-up dispatches). A failed worker auto-aborts its reviewer node — the abort is the failure signal.
- **Verification policy (complexity-gated reviewer tiers)**: registry table mapping task traits (derived orchestrator-side from spec tags + Intent + Boundaries — never worker self-assessed) to reviewer cost: docs-tier → low thinking, one pass; standard-tier → medium-high; security/concurrency/parsing/external-input traits → strongest model + xhigh. Complexity scales reviewer cost, never the verdict's existence.
- **Quality-reviewer placement**: per-task only for 🔴/🟡/🟠 tags, standalone follow-up after mechanical ok:true (never a `needs` node — conditional on the verdict), NEVER per-wave (waves are independent parallel tasks with disjoint boundaries; `/review` is the whole-plan quality gate).
- **Live evidence** (scratch-repo dogfood, all recorded in plan Execution Notes): reviewer auto-fired 5× via needs edges; tier dispatches differed correctly (docs→low, security→xhigh); a REAL rejection exercised the full fix-round loop (xhigh reviewer caught a contract self-conflict → amend → docs-only fix → ok); 🔴 task got its tag-gated quality review. Unplanned robustness proof: two orchestrator cwd mis-dispatches were each caught independently by worker (WORKER_BLOCKER), reviewer (FAIL), and quality-reviewer (refused phantom approval). Malformed graphs (needs→agent-name) rejected by the engine before spawning.

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
