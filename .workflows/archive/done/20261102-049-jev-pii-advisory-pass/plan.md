# Plan 20261102-049 — JEV-batched PII advisory pass

> Plan ID: 20261102-049

**Status:** DONE — SHIPPED v0.14.3 (owner approved 20261102)
**Evidence:** `.workflows/knowledge/evidence-20261102-jev-pii.md` (TypeSafe docs/cookbook numbers; mailbox-parser harness patterns; judge.mjs mechanics)
**Intent:** an advisory PII pass for `/review` — one JEV call per changed data/doc file, state = inventory/schema only (never values), speculative question fan-out up to 64 per call, disagreement-first triage against gitleaks, findings routed to the close-out's Watch section. Gitleaks stays the only mechanical gate; the judge never pass/fails.

## Docs impact
- `skills/review/SKILL.md` — one line in Stage 2: optional judge PII advisory pass (scripts/pii-scan.mjs), findings → Watch
- `.gitignore` — `.workflows/pii/` (ruler may hold excerpts; gitignored like mailbox-parser's reviewed rows)
- `CHANGELOG.md` — v0.14.3 entry at SHIP

## Decisions
1. **State = inventory/schema only, never values** — extractor reads headers/column names/structure only; enforced by construction and pinned by a test that asserts no fixture value string appears in the state. THE core guardrail: the scan must not exfiltrate the data it protects.
2. **Batching = per file, speculative fan-out**: one JEV call per changed data/doc file, up to 64 typed questions (judge.mjs QUESTION_CAP already enforced); questions include speculative ones (schema-level PII likelihood, identifier exposure, free-text likelihood) — extras cost a few tokens, discarded freely.
3. **Disagreement-first triage** (mailbox-parser pattern): gitleaks findings vs judge findings → disagreements listed first in the report; agreements grouped after.
4. **Adjudication ruler**: findings append idempotently to `.workflows/pii/reviewed_v1.jsonl` (gitignored — may hold excerpts; backup-worthy). Agreement-with-human measurement deferred until ≥50 reviewed rows (documented, not coded).
5. **Degradation, never silent**: no `TYPESAFE_API_KEY` / endpoint down / no changed data-or-doc files / all files state-free → `JUDGE SKIPPED (<reason>)` per judge.mjs + plan-level skip note. A file with no extractable schema (binary) → skipped per file, named.
6. **Advisory only**: no gate, no pass/fail — gitleaks stays the mechanical gate (doctrine: judge flags/routes, never gates).
7. Scope = files changed in the diff per review (data: json/csv/yaml/toml; docs: md) — not the whole repo.

## Spec Map

| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |
|------|-------|------|------------|------------------|------|------------|
| TASK_1 | worker | pii-scan.mjs: state builder + question fan-out + judge call + ruler (TDD) | 🟠 VERIFICATION_HEAVY | property/example-based | 1 | — |
| TASK_2 | worker | /review integration + docs | ⚪ | example-based | 2 | TASK_1 |

## Tasks

### TASK 1 (Tier B, 🟠): pii-scan.mjs (TDD)
- **Agent**: worker (tester-style — tests first)
- **Depends On**: none
- **Wave**: 1
- **Allowed**: scripts/pii-scan.mjs (new), tests/pii-scan.test.ts (new), .gitignore (one line: .workflows/pii/)
- **Contract**: .workflows/specs/task-1.spec
- **What**: (a) state builder: for each changed data/doc file — extract headers/column names/structure ONLY (never values; enforced by a test asserting no fixture value string appears in any built state). (b) question fan-out: ≤64 typed questions per call, chunked per file, speculative set per Decision 2. (c) one judge call per file via judge.mjs `ask()`; findings = answers ≠ clean. (d) disagreement-first report: judge-flagged vs gitleaks-findings vs agreed. (e) ruler append: idempotent to `.workflows/pii/reviewed_v1.jsonl`. (f) degradation per Decision 5, every skip naming its reason.
- **Verify**: `bun test tests/pii-scan.test.ts` all pass incl. the values-never-extract guardrail test + triad of fixture scans (clean file / PII-schema file / binary file); `JUDGE SKIPPED` path tested with key unset
- **Status**: ✅ DONE (verdict ok:true, reviews/task-1.md; merged 7eb45e7; fix round aa122fa, reviews/fix-round-049.md)
- context: pii-scan state = inventory only; sanitizeName (redact-then-truncate) guards value+header+heading+key-name positions; guardrail test pins all four
- [PARALLEL-GROUP: SOLO]

### TASK 2 (Tier B, ⚪): /review integration + docs
- **Agent**: worker
- **Depends On**: TASK 1
- **Wave**: 2
- **Allowed**: skills/review/SKILL.md
- **Contract**: .workflows/specs/task-2.spec
- **What**: one Stage 2 line: optional judge PII advisory pass — `node scripts/pii-scan.mjs --plan <id>` on changed data/doc files; findings → close-out Watch section; `JUDGE SKIPPED` = documented gap, findings route to the human. No gate semantics.
- **Verify**: `bash scripts/check-drift.sh` CLEAN; greps for the pass line + pii-scan reference
- **Status**: ✅ DONE (orchestrator-inline Tier A, reviews/task-2.md; merged e0f7160)
- context: one advisory-pass line in /review Stage 2; findings → Watch; JUDGE SKIPPED = documented gap; values never sent (sanitizer named)

(No verify/quality tasks in plan: `/next` verdict-gates every task automatically; `/review` is the final gate at SHIP.)

## Risks
- 🟠 TASK 1: the values-never-extract guardrail is the core — a state builder that leaks values defeats the plan; the fixture-value test pins it.
- 🟡 Exfiltration irony (documented in evidence): the judge API receives inventory/schema only; raw values never leave the machine — enforced, not hoped.
- ⚪ Cost: cents per file (TypeSafe cookbook 12.2× batching + $0.042/Mtok output); speculative fan-out adds tokens by design.
