---
description: "Plan — decompose into atomic tasks from existing context"
---

Draft guidance: proposals follow `templates/PROPOSAL-FORMAT.md` — the Refactor
assessment and Docs impact sections are mandatory (the archive gate reads the
Docs impact declaration at SHIP).

Follow the 'plan' skill workflow — load its SKILL.md with the read tool, then execute it.

## Contract pre-flight (Phase 5 addendum — after the skill's Phase 5, before the approval ask)

The skill's Phase 5 (GENERATE CONTRACTS) ends by presenting the generated
contracts to the human. Before that approval ask, run the judge pre-flight:
ONE judge call per drafted contract, findings fed back to the spec drafter
as fix rounds, re-run after fixes — only then the approval ask.

### Step 1 — write the question file (one per contract)

For each drafted `.spec`, write
`.workflows/reviews/preflight-<task-id>.json` from the template below —
five questions, one per finding kind, schema-typed. Do not add or drop
kinds: the five are the contract's full defect surface.

### Step 2 — run the judge (one call per contract)

```bash
node scripts/judge.mjs ask --questions .workflows/reviews/preflight-<task-id>.json --audit .workflows/reviews/judge-<plan-id>.md
```

Five questions per call stays far under the client's 64-question cap (the
cap is per call — a many-contract plan is many small calls, never one
giant call). The audit file (one JSONL line per call) is archived with the
plan bundle at SHIP.

### Step 3 — feed findings to the spec drafter as fix rounds

Read the verdict table and route each finding to the drafter:
`criterion_testable` / `boundary_complete` → rewrite the scenario's
`Test:` selector or the boundary paths; `ambiguity` → reword the flagged
phrase; `missing_scenarios` → add the named scenario;
`second_path_violation` → close the alternate path (dead end, boundary,
or decision note) that satisfies the selectors. Dispatch the findings as
one fix round, then re-run the pre-flight on the revised contract (same
command, same audit file).

### Step 4 — stop clean or escalate

A clean re-run proceeds to the approval ask. Remaining findings after the
fix round are NOT silently dropped — list them for the human at the
approval ask. Low-confidence rows (`confidence: low`) escalate to the
human the same way: the judge flags and routes, it never passes or fails
a contract, and agent-spec lint stays the mechanical authority.

### Step 5 — NO-JUDGE degradation

`JUDGE SKIPPED` (missing `TYPESAFE_API_KEY` — env or `~/.pi/agent/auth.json` — or unreachable endpoint) is
the tested default path: the skip prints loudly and lands in the audit
file, and you proceed straight to the approval ask. The judge informs the
human gate; it never is the gate — the approval ask is unchanged.

### Pre-flight question template (ready-to-write JSON)

Replace `<spec path>` with the contract under test; keep the five ids and
schemas verbatim.

```json
[
  {
    "id": "criterion_testable",
    "question": "Contract <spec path>: is every Acceptance-Criteria scenario mechanically testable as written — explicit Test: selector, observable post-state? Flag any scenario a machine cannot verify.",
    "schema": {
      "type": "object",
      "properties": {
        "verdict": { "enum": ["flag", "clear"] },
        "confidence": { "enum": ["low", "medium", "high"] },
        "finding": { "type": "string" }
      },
      "required": ["verdict", "confidence"]
    }
  },
  {
    "id": "boundary_complete",
    "question": "Contract <spec path>: do Allowed Changes list every file the implementation must touch, and Forbidden exclude the out-of-scope paths? Flag any file the work needs but the boundaries omit.",
    "schema": {
      "type": "object",
      "properties": {
        "verdict": { "enum": ["flag", "clear"] },
        "confidence": { "enum": ["low", "medium", "high"] },
        "finding": { "type": "string" }
      },
      "required": ["verdict", "confidence"]
    }
  },
  {
    "id": "ambiguity",
    "question": "Contract <spec path>: which wording could a worker read two ways? Flag each ambiguous phrase, quote it, and rate the risk (minor/blocking) in the finding.",
    "schema": {
      "type": "object",
      "properties": {
        "verdict": { "enum": ["flag", "clear"] },
        "confidence": { "enum": ["low", "medium", "high"] },
        "finding": { "type": "string" }
      },
      "required": ["verdict", "confidence"]
    }
  },
  {
    "id": "missing_scenarios",
    "question": "Contract <spec path>: which failure, edge, or integration scenarios does it omit — error paths, empty states, cross-task effects? Flag each omission and name the scenario to add.",
    "schema": {
      "type": "object",
      "properties": {
        "verdict": { "enum": ["flag", "clear"] },
        "confidence": { "enum": ["low", "medium", "high"] },
        "finding": { "type": "string" }
      },
      "required": ["verdict", "confidence"]
    }
  },
  {
    "id": "second_path_violation",
    "question": "Contract <spec path>: could any scenario pass via a path other than the specified one — a silent fallback, dead-end workaround, or alternate route that satisfies the Test: selectors while violating a boundary or decision? Flag the path.",
    "schema": {
      "type": "object",
      "properties": {
        "verdict": { "enum": ["flag", "clear"] },
        "confidence": { "enum": ["low", "medium", "high"] },
        "finding": { "type": "string" }
      },
      "required": ["verdict", "confidence"]
    }
  }
]
```
