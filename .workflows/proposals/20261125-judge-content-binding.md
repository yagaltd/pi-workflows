# Proposal — Judge pre-flight content binding

> Status: PROPOSED 2026-11-25 · Repo: pi-workflows
> Source: live failure observed while generating M7 contracts in `agent-whatsapp`
> (audit files `.workflows/reviews/judge-20261124-005*.md` in that repo).

## Problem

`judge.mjs` sends **only the question strings** to `/v1/systemone`:

- `translate(questions)` builds `{ type, instructions: q.question, criteria }`
  (`scripts/judge.mjs:74-78`).
- `ask()` posts `questions: translate(questions)` (`scripts/judge.mjs:155-160`).
- There is no file read, repo scan, or diff attachment anywhere in the request.

But the `/plan` pre-flight template tells agents to write questions like
*"Contract `.workflows/specs/foo.spec`: is every scenario mechanically testable?"*
(`skills/plan/SKILL.md:604`). The model receives a path and **no contract text**,
so it can only guess. In the observed run, path-only severity questions returned
`flag-critical` at **0.16–0.47 confidence** across three specs — below the 0.6
floor, unusable, and expensive to route.

The same questions re-asked with the **verbatim spec embedded** in the question
string and a yes/no schema produced actionable answers (`criterion_testable yes
0.72`, `has_negative yes 0.95` for one spec; boundary gaps surfaced at 0.68–0.81).
Two real boundary omissions were then found by manual audit and fixed.

**Root cause:** missing evidence binding in the question payload, compounded by
a severity enum that offers no free-text finding field. It is not a model-quality
problem.

## Principle

A judge question must carry its own evidence. A path is a pointer for a human,
not evidence for a model. Pre-flight verdicts must be either:

1. **content-bound** — the relevant file text is embedded in the question, or
2. **diff-bound** — routed through `bench verdicts` with a real diff summary.

Path-only questions are invalid pre-flight input.

## Proposed changes

### Task 1 — content-binding flag in `judge.mjs`
Add `--context <path>` (repeatable) to `judge ask`. Before `translate()`:

- read each path as UTF-8 text; reject binary and key-shaped files;
- cap per-question context (start 24k chars) and total request (64k), with an
  explicit `[truncated]` marker and an audit field recording truncation;
- prefix each question's `instructions` with
  `CONTEXT <path>:\n<text>\n\n<original question>`.

Keep the current key chain, loud-skip, caps, and answer mapping unchanged.

### Task 2 — question lint
Add a mechanical pre-flight lint (next to `spec-selectors`) that rejects
question sets which reference `.workflows/...spec` or `Contract <path>` without
embedded context. Exit 1 with `file:line: path-only judge question; embed the
contract or use bench verdicts`. This turns the finding into a gate instead of
tribal knowledge.

### Task 3 — plan skill template
Update `skills/plan/SKILL.md` Phase 5 pre-flight step: the ready-to-write JSON
template must call the context-bound helper (or embed the contract text) instead
of writing a bare `<spec path>` reference. Keep the five finding kinds verbatim;
prefer yes/no (`schema.enum: ["no","yes"]`) for pass/fail checks. Severity enums
are allowed only when the question itself names the exact defect class.

### Task 4 — fixture harness
Add a mock-backend fixture that records the outgoing payload for:

- path-only question → rejected by lint, never sent;
- context-bound question → payload contains the full spec text;
- truncation → marker + audit field present.

Verify with `bun test`; no network calls in the fixture.

## Acceptance criteria

- `judge ask --questions ... --context <spec>` sends spec text in `instructions`.
- A path-only question fails the new lint with the exact finding above.
- `skills/plan/SKILL.md` no longer contains the bare `<spec path>` template.
- `bun test` green; `check-drift` clean.

## Refactor assessment (mandatory)

- **Scan:** `scripts/judge.mjs` (translate/ask), `skills/plan/SKILL.md` (Phase 5
  pre-flight template), `scripts/bench-intake-triage.ts` (existing `verdicts`
  mode already carries a diff summary), and `.workflows/reviews/preflight-*.json`
  artifacts from the observed run.
- **Verdict:** `extend` — the single judge seam and the bench verdicts path
  already exist; this proposal adds content binding and a lint on top of them.
- **Block rule:** if the chosen backend gains a provider-side file-read tool,
  stop and re-plan — that would change the trust and redaction boundary.

## Docs impact (mandatory)

- `scripts/judge.mjs` — header usage and flag documentation for `--context`.
- `skills/plan/SKILL.md` — pre-flight template and yes/no guidance.
- `docs/canon.md` — state the rule "paths are pointers, not evidence".
- CHANGELOG: `081 — Fixed: judge pre-flight questions bind contract content; path-only questions now fail lint` (or next plan number at ship).

## Risks / open questions

- Context bloat raises token cost; start with hard caps and record usage.
- Redaction: do not embed key files, env files, or `.sqlite`; allow a text
  extension allowlist and reject obvious secret names.
- Truncation can silently remove the decisive criterion; require the marker and
  surface `truncated` in the audit, never a silent pass.
- The confidence floor stays 0.6; low-confidence rows still route to the human.

## Non-goals

- No change to the typesafe backend or its schema language.
- No provider-side file access.
- No retry or scoring changes.
