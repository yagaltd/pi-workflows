spec: task
name: "pii-scan-jev"
tags: [judge, pii, jev, advisory]
verify: "bun test tests/pii-scan.test.ts"
max-rounds: 3
---

## Intent

New `scripts/pii-scan.mjs`: an advisory JEV-batched PII pass for /review — per changed data/doc file, one judge call whose `state` is inventory/schema ONLY (never values), speculative question fan-out ≤64 per call, disagreement-first report, findings routed to the ruler. Advisory only: no gate, never pass/fail (gitleaks stays the mechanical gate).

## Decisions

- State builder extracts headers/column names/key paths/structure ONLY — never values. CSV: header row. JSON: key paths (top-level + nested). MD: heading inventory + a boolean "contains free text". Binary/unparseable → file skipped with a named reason.
- THE GUARDRAIL (test-pinned): fixture files carry sentinel values (e.g. `jane.doe@example.com`, `SECRETVALUE42`); the built state and the question set must contain ZERO of them.
- Question fan-out ≤ 64 questions per call (judge.mjs QUESTION_CAP), chunked per file: per-column/field PII-likeness enum [yes,no,unsure], identifier-exposure enum, free-text likelihood enum. Speculative extras allowed (judge docs: extras cost a few tokens).
- One judge call per file via judge.mjs `ask({questions})` (import it). No TYPESAFE_API_KEY → judge returns `JUDGE SKIPPED` internally (exit 0, skipped) — pii-scan reports the skip loudly and exits 0 (documented gap, never blocks).
- Gitleaks is ABSENT on this machine (owner-removed): when the gitleaks binary is missing, the report is judge-flagged-only with a loud `gitleaks absent` note (degradation, never silent). If a gitleaks JSON report is provided via `--gitleaks <file>`, disagreement-first ordering applies (judge-flagged-first, agreed-after).
- Ruler: findings append idempotently (key = file + question id) to `.workflows/pii/reviewed_v1.jsonl`; the directory is created on demand and `.workflows/pii/` is added to `.gitignore` (ruler may hold excerpts — local-only, backup-worthy, never committed).
- CLI: `node scripts/pii-scan.mjs --plan <id> [--files f1,f2] [--gitleaks <report>]` — changed data/doc files (json/csv/yaml/toml/md) derived from the plan diff unless `--files` is given. Binary/unextractable files → skipped per file with a named reason.

## Boundaries

### Allowed Changes
- scripts/pii-scan.mjs (new)
- tests/pii-scan.test.ts (new)
- .gitignore (one line: .workflows/pii/)

### Forbidden
- Do not modify scripts/judge.mjs (import ask; it is the shared client)
- Do not modify prompts/, skills/, scripts/flow-*.mjs, scripts/proof-ledger.mjs
- Do not send raw values in `state`: the values-never-extract test is the core guardrail
- No gate semantics: pii-scan must never pass/fail a task (advisory only)

## Completion Criteria

Scenario: state builder extracts headers and column names but never values
  Test: state builder extracts headers and column names but never values
  Given fixture files (CSV with header `email,phone` and value rows containing `jane.doe@example.com`; JSON with key paths and value `SECRETVALUE42`)
  When the state builder runs
  Then the built state contains `email`, `phone`, and the key paths, and contains NEITHER `jane.doe@example.com` NOR `SECRETVALUE42` anywhere

Scenario: question fan-out stays within 64 per call and chunks per file
  Test: question fan-out stays within 64 per call and chunks per file
  Given 3 changed files with 10, 40, and 90 candidate fields
  When the question sets are built
  Then file calls are ≤ 64 questions each, one judge call per file, and the 90-field file is truncated to the 64 highest-signal questions (truncation reported)

Scenario: judge skipped without API key
  Test: judge skipped without API key
  Given TYPESAFE_API_KEY unset and no key in auth.json
  When pii-scan runs against fixture files
  Then output contains `JUDGE SKIPPED` with the reason, exit code is 0, and no ruler row is written

Scenario: ruler appends idempotently
  Test: ruler appends idempotently
  Given two runs over the same fixture findings
  When each appends to the ruler
  Then `.workflows/pii/reviewed_v1.jsonl` (in a temp PII dir) contains each finding exactly once

Scenario: binary files are skipped with a named reason
  Test: binary files are skipped with a named reason
  Given a changed file `logo.png` in scope
  When pii-scan runs
  Then it is reported as skipped with a reason naming the file

Scenario: disagreement-first report ordering
  Test: disagreement-first report ordering
  Given judge-flagged findings and a gitleaks report with one overlapping finding and one gitleaks-only finding
  When the report renders
  Then judge-flagged findings appear first, agreed findings after, and the gitleaks-only finding is listed as gitleaks-only
