# Plan 20261117-073 — the sieve gate: forced-choice triage at proposal entry, + knowledge promotion

> Plan ID: 20261117-073
> Created: 20261117
> Owner: Aurel
> Status: DONE (shipped v0.15.9 — 20261117)
> Supersedes: none (follows 20261117-072)

## Ledger Resolution

| # | Item | Disposition | Note |
|---|---|---|---|
| — | none — ledger EMPTY at plan time (closed by 072) | done(n/a) | this plan adds the intake gate; its own follow-ups enter via the triage rule |

## Lifecycle

DRAFT → APPROVED → CONTRACTED → EXECUTING → REVIEWED → SHIPPED → ARCHIVED

## Context

The owner asked where the over-engineering questions live (what if we don't do
it? blast radius? value/effort?) and pointed at pi-majordome's sieve — a
4-cell forced-choice matrix (V value × R risk × E effort × path) with pure
outcome rules: nice-to-have+standalone → park; severe risk → park+flag;
must-have+xs → build-direct; else propose. Decision: adopt the sieve as a
GATE at proposal entry (/idea, /plan, /add, /prototype — the surfaces that
create new scope), not as a separate decision model. Obligation flows (/fix,
/debug, /docs, /verify, /review) are exempt: they answer to broken things,
not to value verdicts. Enforcement is mechanical, not a new model: the
orchestrator answers the 4 forced choices, the reviewer verifies them against
evidence (existing two-role structure), and agent-spec plan-check validates
the Sieve section grammar. A separate judge model (majordome's typellm
pattern) is the documented upgrade path if verdicts drift — candidates if
that day comes: ship-time intake triage classification, ambiguous-ask flow
routing, reviewer-verdict consistency. Also lands: the TokenEconomizer
promotion pattern (a fact enters durable doctrine only after confirmations;
contradiction drops it) and the two missing decision-row fields (cost of
inaction, blast radius with direction).

## Exploration

- pi-majordome `ext/proposals.ts:sieveOutcome` — pure threshold rules, no
  weighting; `docs/JUDGMENT-FLOWS.md` §3 — the matrix with probabilities.
- pi-workflows gaps: /idea grills only unresolved decisions; /plan has no
  entry gate; no value column anywhere; no inaction-cost or blast-radius
  question in any flow.
- TokenEconomizer `plugin/paths.py` — state keyed by repository (origin
  remote), machine-local `~/.tokeneconomizer`; facts confirmed over 3
  sessions, dropped on contradiction (micro-skills). Tool pruning inert on
  Pi (four tools only).

## Spec Map

- `.workflows/specs/task-1.spec` — sieve doctrine in pi-workflows (T1)
- `.workflows/specs/task-2.spec` — plan-check Sieve grammar (T2, agent-spec)
- `.workflows/specs/task-3.spec` — tdd-guard Rust classification (T3, added by
  adjudication of the T2 review: the lint half of the Rust-support row)

## Tasks

### TASK 1 (⚪ STANDARD, Tier B): sieve doctrine + decision fields + promotion rule

- **Agent**: worker · **Wave**: 1 · **Depends On**: none
- **Contract**: .workflows/specs/task-1.spec
- **Status**: ✅ DONE (verdicts + fix round in reviews/fix-round-073.md; merged)
- **Problem**: proposal flows have no forced value/risk/effort gate; decision
  rows never ask cost-of-inaction or blast radius; knowledge promotion has no
  confirmation rule.
- **Allowed**: skills/idea/SKILL.md, skills/plan/SKILL.md,
  skills/add-feature/SKILL.md, prompts/prototype.md, agents/registry.md,
  templates/STATUS-VOCABULARY.md, tests/prompt-doctrine.test.ts
- **Verify**: bun test && bash scripts/check-drift.sh && bash scripts/docs-lint.sh

### TASK 2 (⚪ STANDARD): plan-check Sieve grammar

- **Agent**: worker · **Wave**: 1 · **Depends On**: none (grammar is normative
  in this plan's Execution Notes)
- **Contract**: .workflows/specs/task-2.spec · **Repo**: agent-spec
- **Status**: ⬜ PENDING
- **Problem**: the Sieve section (when a plan carries one) is unvalidated
  prose; a parked idea must never become a plan file.
- **Allowed**: src/main.rs, tests/**, docs/**, CHANGELOG.md, ./Cargo.toml,
  ./Cargo.lock
- **Verify**: cargo test --quiet && cargo clippy --all-targets -- -D warnings

### TASK 3 (⚪ STANDARD): tdd-guard Rust classification

- **Agent**: worker · **Wave**: 1 · **Depends On**: none (added 20261117 by
  adjudication of the T2 review — lint half of the Rust-support row)
- **Contract**: .workflows/specs/task-3.spec · **Repo**: tdd-guard
- **Status**: ⬜ PENDING
- **Problem**: lint loud-fails on Rust repos (0 parseable test files) instead
  of classifying them; 0.1.4 fixed verify's selector resolution, lint is the
  remaining half.

## Contracts (generated after approval)

- .workflows/specs/task-1.spec · .workflows/specs/task-2.spec · .workflows/specs/task-3.spec

## Docs impact

- the four doctrine files + the vocabulary mapping — inside Allowed (T1)
- agent-spec CHANGELOG 0.3.5 (T2, its repo)
- `CHANGELOG.md` — pi-workflows v0.15.9 entry at SHIP

## Execution Notes

NORMATIVE SIEVE GRAMMAR (both tasks implement this exact shape — plan-check
validates when a plan carries `## Sieve`; absence is legal for
non-proposal plans):

    ## Sieve

    | Cell | Verdict |
    |---|---|
    | V value | valuable |
    | R risk | contained |
    | E effort | s |
    | path | none |

    Outcome: propose

- V ∈ {nice-to-have, useful, valuable, must-have}; R ∈ {trivial, contained,
  serious, severe}; E ∈ {xs, s, m, l}; path ∈ {research, inspect, grill,
  none}; Outcome ∈ {propose, build-direct} — `park` in a plan file is an
  ERROR (parked ideas are ledger rows, never plan files).
- Outcome rules (pure, mirrored from majordome): V=nice-to-have/useful +
  standalone → park (ledger row instead) · R=severe → park + decompose flag ·
  V∈{valuable, must-have} + E=xs → build-direct (lightweight tier, no spec
  ceremony) · else → propose.
- Decision rows gain two required fields: `Cost of inaction:` (what breaks or
  stays slow if we don't) and `Blast radius:` (which flows/gates/repos this
  touches, each +, −, or neutral).
- Knowledge promotion (registry): a repo fact enters durable doctrine
  (AGENTS.md, templates, docs) only after confirmation in 3 independent
  sessions or verdicts; a contradiction reverts it to the ledger.
