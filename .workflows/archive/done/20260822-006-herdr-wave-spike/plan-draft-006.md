# Plan 006 (Draft): herdr wave-orchestrator spike

Status: DISPATCHED (amended: +T5 inline hardening, +T6 thinking maps; spike chain unchanged)

## Context
- v0.5.3 tiers (A/B/C) multiply waves; parent pays 3-line summaries per task, and `await_subagent` re-dumps settled reports on every wake — parent context cost grows with wave count (scout: "Known orchestrator cost (issue #9)").
- Goal: prove/kill a per-wave orchestrator — a pi session spawned in its own herdr tab (via herdr CLI), running ONE wave of tasks using its own in-process subagent children (pi-core-subagent v1.3.28, in-process, `needs:` edges — scout: "pi-core-subagent v1.3.28"), then reporting a compact verdict summary so the parent pays 3 lines, not the wave's await traffic.
- herdr 0.8.2 CLI + socket live locally; surface: `tab create`, `pane send_text/wait_for_output`, `agent start/prompt/wait/read` (scout: "Local install state", "herdr Socket API").
- pi-herdr orchestrator extension already installed (`~/.pi/agent/settings.json:19`, unopened) — inventory first, invent second (scout: "pi-herdr extension surface unverified").
- Known risks on record: sockets/CLI grant `server.stop` → child must be scoped to its own workspace; child pi gets extensions from profile resolution, NOT inherited from parent (scout: "Constraints / risks").

## Decisions
- **D1 — Verdict artifact is the sole spike deliverable**: a GO/NO-GO report file with live-fire evidence; no production files change regardless of outcome (Tier C rule). NO-GO is a successful spike.
- **D2 — Comms path**: report-file on disk + `herdr agent.wait`/`agent.read` as primary; `agent-letterbox-herdr` (on-disk letters) is a fallback candidate only, not built.
- **D3 — Blast radius**: child orchestrator owns one workspace + one tab; it may issue no server-level calls (`server.*`); it calls only pane/agent surface inside its own workspace.
- **D4 — Live-fire target = a real pi-workflows task**: pick one small, self-contained Tier A/B worker task on this repo; execute the wave through the child orchestrator and cite its real dispatch artifacts as evidence. Scratch dispatch is rejected (fake-work risk on record).

## Spec Map

| Task | Contract | Wave | Model @model |
|------|----------|------|--------------|
| TASK 1 | — (scout inventory; adjudicated via verdict spec evidence) | 0 | @model:standard |
| TASK 2 | — (spike harness; same adjudication) | 0 | @model:strong |
| TASK 3 | — (live-fire run; same adjudication) | 0 | @model:strong |
| TASK 4 | task-spike-verdict.spec | 0 | @model:strong |
| TASK 5 | — (Verify: line, orchestrator-inline — Tier A) | 1 | parent |
| TASK 6 | task-thinking-maps.spec | 1 | @model:standard |

One spec for the whole spike (adversarial-pass ruling): doctrine requires a
verdict, a verdict requires a mechanical contract — recon/harness/run tasks
are adjudicated through the verdict spec's evidence criteria, not spec-less.

## Tasks

### TASK 1 (Tier A): Inventory what's installed
- **Agent**: scout (@model:standard, scout role)
- **Contract**: none (recon)
- **What**: Read pi-herdr ext tool surface + `~/.pi/agent/extensions/herdr-agent-state.ts`; enumerate herdr CLI `agent`/`tab`/`pane` subcommands for spawning a headless pi session; confirm how child pi picks up pi-core-subagent (profile/config resolution — drafter-flagged ambiguity); VERIFY `agent.wait` semantics (what it matches — agent-state vs output) vs `pane.wait_for_output` fallback. Record facts with `file:line` anchors into the verdict evidence file.
- **Status**: PENDING

### TASK 2 (Tier C): Spike harness — spawn child orchestrator in its own tab
- **Agent**: spike-orchestrator (build/run)
- **Contract**: none (spike harness, scratch proof-of-path; zero production edits)
- **What**: Minimal glue: herdr CLI to create a workspace/tab, send_text a `pi` invocation (print/JSON or RPC mode per scout: "pi CLI modes") that loads pi-core-subagent, prompt it to run ONE wave, `agent.wait`→`agent.read` to collect a compact summary. Scope strictly to own workspace.
- **Status**: PENDING

### TASK 3 (Tier C): Live-fire wave run against a real task
- **Agent**: spike-orchestrator (run)
- **Contract**: none (evidence capture)
- **What**: PINNED live-fire micro-task (adversarial-pass ruling — no ad-hoc selection): the child orchestrator dispatches ONE worker subagent to append a dated spike-note line to `.workflows/LOG.md` (Allowed = that file only; GUARD per house rules). Capture: dispatch artifacts, per-task verdict, wave duration, and the context metric — parent-absorbed BYTES (summary the parent reads) vs the full await/report traffic the child absorbed (mechanically computable from the child's log — replaces the fuzzy "token delta"). MANDATORY cleanup: `herdr tab.close` (+ workspace teardown if created) after the run, successful or not.
- **Status**: PENDING

### TASK 4 (Tier C): Verdict artifact
- **Agent**: spike-orchestrator (author)
- **Contract**: none (analysis)
- **What**: Write `.workflows/scout/006-wave-orchestrator-verdict.md` with GO/NO-GO + live evidence (TASK 2/3 artifacts), measured parent-context savings (or failure), and a one-paragraph recommended production shape if GO.
- **Status**: PENDING

### TASK 5 (Tier A, orchestrator-inline): value/impact matrix in the adversarial pass
- **Agent**: parent (inline — the round-trip costs more than the edit; the tier rule applied to itself)
- **Contract**: Verify: grep -c "cheapest path" skills/plan/SKILL.md → ≥1
- **What**: One bullet in the Drafting Pipeline phase-3 checklist: for every task ask "what is the
  cheapest path to the user-visible outcome?" — delete or inline tasks that only serve the design;
  a plan that survives is minimal, not just decomposed.
- **Status**: PENDING

### TASK 6 (Tier B): thinking maps in the registry
- **Agent**: worker (@model:standard/high) · **Contract**: task-thinking-maps.spec
- **What**: registry roles gain `thinking: { supported, source }`; scan resolves from the installed
  pi package's model registry (authoritative, path-anchored) with constants fallback
  (pro-0813: [high,xhigh] — observed live 2026-08-22; observed-only subsets never invented);
  one dispatch-guard sentence in agents/registry.md Model resolution; tests + live re-seed.
- **Status**: PENDING

## Out of scope
- No production code change beyond minimal glue (Tier C).
- No letterbox build (fallback candidate only).
- No multi-wave / parallel-group orchestration in this spike — ONE wave only.
- No change to `/next` dispatch loop or await_subagent internals.
- No server-level calls from any child.