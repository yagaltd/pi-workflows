# Plan: Subagent landing hardening — cwd anchoring + anti-phantom tripwire

> Plan ID: 20260822-003 (pi-workflows)
> Created: 2026-08-22 · Status: SHIPPED
> Evidence base: MorphEditor plan 20260822-002 incident (LOG.md 2026-08-22 INCIDENT) + post-mortem analysis in this session.

## Context

During MorphEditor plan 20260822-002, pi-core-subagent's run-level `cwd` was honored by only ~3/10 spawns (Run A); children landed in an empty session-default directory. Blast radius: one worker **scaffolded an entire fake project** to make its task runnable (wiped, no loss), three refused cleanly, four reviewers/quality-nodes produced void verdicts from the wrong root. All retries with **explicit per-task `cwd` + GUARD-first** landed correctly: **13/13**. Domain Memory already carries a weaker note ("MUST set per-task cwd", after 2 earlier mis-dispatches) — but nothing in the role files or dispatch shapes *enforces* it, and nothing detects fake work. Root causes (chain): RC1 infra cwd bug (trigger) → RC2 worker.md asserts unverified truth ("your bash already runs in the project working directory") → RC3 all task paths relative → RC4 "if no .spec exists, work from task description" conflates *deliberately absent* with *unreachable* → RC5 no anti-scaffold rule. Detection gap: a worker report claiming ✓ with zero diff in the expected repo was trusted until manually checked; LOC metrics would NOT have caught it (the phantom produced a full project — the failure is **location, not volume**).

## Decisions

- **D1 — Per-task cwd is mandatory.** Every dispatch shape template carries `cwd: "<absolute repo path>"`; run-level cwd alone is never sufficient (3/10 vs 13/13 evidence). Absolute repo path also appears in the task text's first line.
- **D2 — Worker GUARD step 0.** Before any work: `pwd` + `git rev-parse --show-toplevel` must equal the repo named (absolutely) in the task text; mismatch → `WORKER_BLOCKER: inaccessible_resource`, never improvised work. Includes the **anti-scaffold clause**: an empty or foreign project tree is an environment failure, NEVER a build instruction — creating files (project scaffolding, deno.json, spec files) to make an unreadable contract runnable is forbidden; report instead.
- **D3 — Unreachable ≠ deliberately absent.** Spec deliberately absent (plan says so) → proceed from task text. Spec expected but unreadable at the verified root → `WORKER_BLOCKER`. The RC4 escape hatch closes.
- **D4 — GUARD reads AGENTS.md if present** at the verified root (repo operating rules are not injected by the harness — verified empirically: child sessions receive only role prompt + task text).
- **D5 — Reviewer VOID semantics.** Every reviewer/quality-reviewer report opens with a provenance line (`repo: <git toplevel>`). Wrong root → output exactly one line ("VOID — wrong working directory (<found> ≠ <expected>); no verdicts emitted") — never per-spec fail verdicts from a wrong root (fail verdicts from a phantom dir are noise that must be discarded manually today).
- **D6 — Landing tripwire script** `tooling/verify-landing.sh <repo> <allowed-path>... [claims on stdin]`: S1 landing check (binary — any git status/diff within the task's Allowed paths; zero diff + claimed ✓ = ALARM), S2 claims-vs-reality (every file in the worker's Files Changed report must appear in `git status` — catches partial fakes), S3 magnitude (informational numstat + new-file count; untracked files counted explicitly because numstat skips them). LOC/tokei explicitly rejected as detectors. Orchestrator MUST run it after every claimed-done write task; any ALARM → worker report untrusted → verify cwd → redispatch with explicit per-task cwd.
- **D7 — Loop instrumentation honesty** (doctrine): (a) when parallel waves share one worktree, wave-time `agent-spec guard` is union-noise — a **consolidated final review** over the full tree is the review of record; (b) `agent-spec lifecycle` scenario skips are "unverified-by-lifecycle", a documented gap — reviewers must be instructed explicitly how to cover them (tdd-guard selectors + suite), never silently treat as pass; (c) **live smoke is an explicit loop layer** for UI-facing plans — unit-green ≠ working (F1 form-persist and F2 stale-serve both passed unit suites and failed live).
- **D8 — Context routing unchanged**: Decisions reach executors via specs (the single channel — worked); quality-reviewer keeps its self-serve CONTEXT.md domain-memory read; scout manifests are cited section-addressed in task texts, never whole-file; mechanical reviewer deliberately receives no narrative context.

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing | Wave | Depends |
|------|-------|------|------------|---------|------|----------|
| TASK 0 | worker | verify-landing.sh tripwire script | 🟡 | example-based (fixtures) | 1 | — |
| TASK 1 | worker | registry.md cwd + tripwire policy | ⚪ | grep-based | 1 | — |
| TASK 2 | worker | worker.md GUARD + anti-scaffold | ⚪ | grep-based | 1 | — |
| TASK 3 | worker | reviewer/quality VOID semantics | ⚪ | grep-based | 1 | — |
| TASK 4 | worker | doctrine + shapes loop upgrades | 🟡 | grep-based | 2 | TASK 0,1,2,3 |
| TASK 5 | worker | LOG + Domain Memory | ⚪ | grep-based | 3 | TASK 0-4 |

## Tasks

### TASK 0: Tripwire script
- **Agent**: worker (deepseek-v4-pro/high) · **Contract**: task-verify-landing-script.spec
- **What**: `tooling/verify-landing.sh` — S1/S2/S3 per D6, plus `--selftest` mode that builds mktemp fixture repos (clean repo → S1 ALARM; landed edit → OK; claimed-file-missing → S2 ALARM; non-repo → ALARM) and exits 0 only if all four behave. Portability: bash, git, awk only — no tokei, no node.
- **Status**: ✅ DONE

### TASK 1: registry.md policy
- **Agent**: worker (deepseek-v4-flash/high) · **Contract**: task-registry-cwd-policy.spec
- **What**: Dispatch policy section — per-task cwd mandatory (D1, with the 3/10 vs 13/13 evidence line); Isolation policy gains the tripwire mandate (run verify-landing.sh after every claimed-done write task; ALARM → distrust + redispatch); reviewer tier table notes the provenance line + VOID semantics pointer.
- **Status**: ✅ DONE

### TASK 2: worker.md GUARD
- **Agent**: worker (deepseek-v4-flash/high) · **Contract**: task-worker-guard.spec
- **What**: New "Step 0 — GUARD (verify your landing)" before "1. Read the contract": pwd + toplevel check against the absolute path in the task text (D2), mismatch → WORKER_BLOCKER; anti-scaffold clause verbatim policy (D2); unreachable-vs-absent spec rule (D3); read AGENTS.md if present (D4). Fixes the "your bash already runs in the project working directory" assertion to "verify it — see Step 0".
- **Status**: ✅ DONE

### TASK 3: reviewer + quality VOID semantics
- **Agent**: worker (deepseek-v4-flash/high) · **Contract**: task-reviewer-void.spec
- **What**: Both role files gain Step 0 (same GUARD, read-only variant) + provenance header line in the report format (`repo: <git toplevel>`) + VOID rule (D5): wrong root → exactly one VOID line, no verdict blocks. quality-reviewer keeps its CONTEXT.md self-serve read (D8 — unchanged, stated for clarity).
- **Status**: ✅ DONE

### TASK 4: doctrine + shapes loop upgrades
- **Agent**: worker (deepseek-v4-pro/high) · **Contract**: task-doctrine-loop-upgrades.spec
- **What**: execution-doctrine.md — tripwire step in the loop (between worker settle and ✅ persist: orchestrator runs verify-landing.sh; ALARM = phantom → redispatch, no review of fake work), consolidated final review pattern (D7a), lifecycle-skip honesty (D7b), live-smoke layer (D7c). dispatch-shapes.md — every template gains `cwd: "<absolute repo path>"`; worker task-text templates open with the repo-absolute first line; a live-smoke task shape is added for UI-facing plans.
- **Status**: ✅ DONE

### TASK 5: LOG + Domain Memory
- **Agent**: worker (deepseek-v4-flash/high) · **Contract**: task-log-memory.spec
- **What**: .workflows/LOG.md plan entry; .workflows/CONTEXT.md Domain Memory — supersede the 20260821 cwd note with the enforced version (GUARD + per-task cwd + tripwire, incident reference, evidence numbers). CHANGELOG untouched (SHIP gate).
- **Status**: ✅ DONE

## Out of scope
pi-core-subagent upstream fix (file separately with pi); pi extension automating the tripwire via `tool_call`/`tool_result` events (follow-up task after this ships); agent-spec verifier-mapping bootstrap for consumer repos; any change to tier thresholds or verdict gating semantics.
