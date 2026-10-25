# Plan: toolchain defect batch — verifier port, guard scoping, lint parser (016)

> Plan ID: 20261025-016
> Status: SHIPPED 2026-10-25 — final gate review-final-r3 ok:true
> Created: 2026-10-25
> Shape: pi-workflows plan-draft (house format), ≤110 lines. THREE repos: vibe/coding-agent/agent-spec (fork, release/1.4.0) · github/tdd-guard or vibe/tdd-guard (lint fix — working clone TBD at T3 dispatch) · pi-workflows (docs + wiring).

## Context

Backlog item 11 (`.workflows/proposals/20261024-session-backlog.md`) — the toolchain defect batch: (a) agent-spec fork lacks a Node/`.test.ts` lifecycle verifier — lifecycle = NoopVerifier on bun/TS repos, 3/3 Skip, exit 1 (plan-013 T4 evidence); (b) `guard --spec-dir` scans the whole shared spec-dir and verifies cross-repo specs against the wrong tree (plan-013 T4 R3); (c) tdd-guard v0.1.0 `no-assertionless-tests` parser false positives — 4 repro classes: destructuring-from-call, template interpolation, nested literals, unicode consts; base 25 → 22 violations in pi-workflows `tests/extension.test.ts` are ALL false (plan-013 T4 R4); (d) no canonical `--tests <dir>` verify invocation (plan-013 T1 R2 reviewer recommendation).

Evidence anchors: upstream `github/agent-spec` main (@b2462a5 lineage) already contains the Node/.test.ts verifier the fork lacks; the fork is a local clone at release/1.4.0 (HEAD 2483398). pi-workflows is the standing fixture repo (bun + `.test.ts`).

## Decisions

- **D1 — Verifier port, not cherry-pick.** The fork diverged from upstream main (1.4.0 vs 0.2.7-era line). Port the DESIGN: extend `src/spec_verify/test_verifier.rs` + `detect_test_verifier` to recognize `*.test.ts`/`*.spec.ts` test files and bind a Node-family runner (`bun test` preferred when bun exists, else `node --test`), mapping `Test:` selectors to runner filters. Upstream main is the reference implementation, not a patch source.
- **D2 — Guard single-spec mode (additive).** New flag `agent-spec guard --spec <file>` (mutually exclusive with `--spec-dir`): verifies exactly one contract. Default behavior unchanged — zero breakage for existing invocations.
- **D3 — Lint parser fix with regression fixtures.** Fix `no-assertionless-tests` detection for the 4 documented false-positive classes; each class becomes a fixture pair (false-positive source + asserted-clean result) in the tdd-guard test suite. The 22 real pi-workflows cases become the acceptance corpus.
- **D4 — Canonical verify adoption.** After T1–T3 land and binaries are reinstalled: pi-workflows reviewer/dispatch/skills text standardizes on `tdd-gate ... --tests <dir>` and `tdd-guard lint --tests <dir>` invocations; the accepted-limitation notes (Skip-only, parser quirk) are REMOVED where the fix eliminates them.
- **D5 — Rollout is owner-visible.** `cargo install --path <fork>` + `npm link` (tdd-guard) run inside this plan's gates (orchestrator-executable); version bumps: fork 1.4.0 → 1.5.0, tdd-guard 0.1.0 → 0.1.1, pi-workflows 0.8.0 → 0.8.1.

## Spec Map

| Task | Repo | Contract | Wave | Mode |
|------|------|----------|------|------|
| T1 lifecycle Node/.test.ts verifier port | vibe/coding-agent/agent-spec | task-1.spec | 1 | dispatched Tier B 🔴 |
| T2 guard `--spec <file>` single-spec mode | vibe/coding-agent/agent-spec | task-2.spec | 2 (after T1, same repo) | dispatched Tier B 🟡 |
| T3 tdd-guard lint parser fix + fixtures | tdd-guard clone | task-3.spec | 1 (parallel, different repo) | dispatched Tier B 🟡 |
| T4 pi-workflows canonical verify + docs + reinstall gates | pi-workflows | task-4.spec | 3 (after T1–T3) | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🔴): lifecycle Node/.test.ts verifier — REPO: vibe/coding-agent/agent-spec ✅
- Port per D1 referencing upstream main's `spec_verify` (design only). `bun test -t <selector>` binding preferred. Fixture: a bun/`.test.ts` fixture repo ships in the fork's tests.
- **Verify**: fork test suite green + fixture lifecycle exits 0 with scenarios bound (0 Skip) on a `.test.ts` repo.

### TASK 2 (Tier B, 🟡): guard `--spec <file>` — REPO: vibe/coding-agent/agent-spec ✅
- Additive flag per D2; verifies exactly the named contract; boundary check unchanged.
- **Verify**: fork suite green + per-spec guard run against pi-workflows' task-scoped spec passes where the old whole-dir form failed.

### TASK 3 (Tier B, 🟡): tdd-guard lint parser fix — REPO: tdd-guard clone ✅
- Fix the 4 false-positive classes per D3; regression fixtures per class; the 22 pi-workflows cases added as an acceptance fixture file.
- **Verify**: tdd-guard suite green + `lint --src tests` on pi-workflows reports 0 no-assertionless false positives.

### TASK 4 (Tier A, ⚪): pi-workflows adoption + reinstall gates — orchestrator-inline ✅
- `cargo install --path <fork>` + tdd-guard relink; canonical verify sweep (D4) across reviewer/dispatch/skills text; README optional-deps refresh; CHANGELOG v0.8.1.
- **Verify**: on pi-workflows — lifecycle binds (0 Skip), per-spec guard passes, lint reports 0 false positives; drift CLEAN; bun 109/109.

## Adversarial pass (on record)

- Upstream verifier code may not transplant cleanly into the 1.4.0 fork (API drift) → D1 ports the design; if the port exceeds ~200 lines, STOP and re-scope with the owner (the upstream verifier may have fork-side prerequisites).
- Guard `--spec` flag collision risk with existing `--spec-dir` users → additive flag, default unchanged, conformance test added.
- Lint fix must not weaken the rule: real assertionless tests must still fail — the fixture corpus includes true positives from the plan-013 R4 evidence.
- Reinstall replaces the owner's global agent-spec binary — SAME version line (fork 1.5.0), owner-approved by this plan; no upstream-main install (plan-013 R2 incident class).
- Cross-repo protocol (plan-013 D8 pattern): REPO GUARD lines carry cwd; Verify: lines cd into the target repo.

## Verification (whole-plan final gate)

pi-workflows as fixture: `agent-spec lifecycle task-1.spec --code .` binds (0 Skip) · per-spec guard passes · `tdd-guard lint --src extensions --tests tests` 0 false positives · drift CLEAN · bun 109/109 · docs-lint exit 0 · final whole-plan reviewer dispatch (read-only over committed evidence — the plan-015 R4 pattern).
