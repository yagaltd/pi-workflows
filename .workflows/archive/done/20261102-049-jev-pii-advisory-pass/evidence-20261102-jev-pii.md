# Evidence — JEV-batched PII advisory pass (plan 20261102-049)

Research date: 2026-11-02 · Sources: TypeSafe official docs/cookbook/lessons, mailbox-parser harness (~/Documents/github/mailbox-parser/eval/ + .workflows/research/mailbox-typellm-value/), pi-workflows judge.mjs internals.

## TypeSafe System One / Jev — verified facts

- Endpoint: `POST /v1/systemone`, body `{model, state, questions}`; answers keyed by question id; usage returned. `state` = the content being evaluated; all questions score against that one state, independently, in parallel.
- **Batching measured by TypeSafe** (cookbook parallel_questions, 13 questions over a document): one call with all N questions is **12.2× cheaper and 10.0× faster** than N calls, with **no change in answers** — each question is scored independently.
- Official lesson "Ask everything at once": extra questions add "a few tokens and almost no time" — **ask speculative questions you might discard**.
- Shape rule (Spring AI TypeSafe): N questions about ONE state = one call; the same question about MANY states = irreducibly one call per item → **batch per file**, not per repo.
- Pricing (Jev 1.14/1.13): $42/Btok input, **$0.042/Mtok output**; 64k per-request / 32k per-question context. Limits: 32 MiB body, gzip/zstd ok.
- Judge caveat (honeyhive): Jev **does not explain its answers** — agreement with human labels must be measured before trusting.

## judge.mjs mechanics (pi-workflows, verified)

- `ask({questions})` = one POST with the whole array; `QUESTION_CAP = 64` per call; questions `{id, question, schema}` — `schema.enum` → typed verdicts.
- NO-JUDGE degradation: missing `TYPESAFE_API_KEY` / unreachable endpoint → `JUDGE SKIPPED (<reason>)` + audit entry, exit 0, never blocks. Audit: `.workflows/judge-audit.jsonl`.
- Existing call sites (all advisory): closeout settle judge, spec-sanity pre-pass, wave-settle compaction, intent guard, contract pre-flight.

## mailbox-parser harness patterns (proven on real mail)

- **Two-engine disagreement-first triage**: deterministic lexicon pass vs model pass → `engines_disagree` → "review these first". Batches = the adjudication queue (`lexicon.jsonl`, `model.jsonl`, `disagreements.jsonl`, `diff.md`).
- **Adjudication ruler**: reviewed rows append idempotently to `reviewed_v1.jsonl`; ruler-only until ≥50 rows, then 80/20 split; "the irreplaceable asset: back it up".
- **Raw content stays local**: raw email text gitignored — "PII... local only". The judge layer never receives raw personal content.
- **Triage rule**: "wrong + high conf = P1".
- **Honesty rule (R3-A6)**: "nobody publishes classifier accuracy; every number is marketing" — bounded, ruler-measured claims only.

## Design guardrail (this plan's core constraint)

The judge PII pass must NOT exfiltrate the data it protects: `state` = file inventory + column/schema names + structure summary — **never raw values**. Enforced by construction (extractor reads headers/schema only) and pinned by test.

## Doctrine fit

- Judge findings are advisory: flags and routes, never pass/fail (execution-doctrine). Gitleaks stays the only mechanical secrets gate.
- `JUDGE SKIPPED` is a documented gap, never a pass.
- gitleaks ≠ judge: credentials-in-code (mechanical) vs personal-data-in-data/docs (semantic, advisory). Complementary layers.
