# Jev judgment gates — plain-language proposal

- **Created**: 2026-09-18, rewritten 2026-09-19 (previous version was
  research shorthand; this one explains itself)
- **Status**: SUPERSEDED 2026-09-19 — same day, by
  `20260919-code-contracts-durable-rules.md` (approved). Jev usage lives on
  THERE (steps 5–6: @cc compliance + ADR supersede routing, advisory-first,
  trust test absorbed as its rollout step 2). This proposal's other three
  checks (plan lint, memory audit, ship check) were NOT adopted — if wanted
  later, raise a new proposal. Kept for history per supersede convention.
- **Kind**: working material (stays in `.workflows/`, never ships)

## What is Jev, in one paragraph

Jev is a new AI model from a company called TypeSafe AI. Unlike ChatGPT-class
models, it cannot write text or code at all. It does exactly one thing: you
give it some material (text, JSON) and a list of small questions, and it
answers each one with either a yes/no probability ("is this claim supported:
87%"), a pick from a list you defined ("which category: billing / technical
/ other"), or a rating on a scale you defined. All questions answer at once,
in about a tenth of a second, for about a hundredth of a cent. Its answers
are always in the shape you asked for (it cannot produce garbage or invent
categories) and it is trained to be honest about how sure it is — so when it
says 90%, it's right about 90% of the time. That last property is the whole
point: we can set a rule like "above 90% act automatically, below that ask a
human."

**Important honesty note**: Jev is roughly mid-tier in judgment quality —
below the best chat models. It's for cheap, frequent, small checks where
today we either burn orchestrator context or dispatch an LLM child. It is
NOT a replacement for workers, reviewers, or you.

## What we'd need to use it

An API key (a paid account, like any AI API). Two ways to get one:

1. Directly from TypeSafe at console.typesafe.ai — currently a **waitlist**
   (the model launched 2026-09-15, access is granted in waves).
2. Through **Vercel's AI Gateway** — a reseller that carries many models
   under one account, available immediately, same price per token.

Either way, the key plugs into an existing open-source package called
`pi-typesafe` (a pi extension that wraps the Jev API: key handling, spending
caps, and a testing toolkit). We would install that one package and call it
from the workflow — no new model slots, no new subagents.

## The problem being solved

Four places where pi-workflows has repeatedly failed in ways the existing
mechanical checks cannot catch — because the failure is about *meaning*, not
about commands exiting 0 or 1:

1. **A spec silently contradicts a ruling you made.** Happened: the
   fence-model round — three waves of work built on a paraphrase of
   something you'd ruled, 2,200 lines thrown away.
2. **A verify line that doesn't actually prove anything.** Specs now carry
   `verify:` lines, but nothing checks the line tests the right thing.
3. **Stale memory.** CONTEXT.md rulings and ADRs age; a ruling that no
   longer matches the code still rides every dispatch pack and misleads
   children. Happened: plan-040 T7 treated an ADR *candidate* as accepted.
4. **The final summary lies.** "All tasks done" claims that don't match the
   verdict chain — the success signal has been systematically wrong before.

## The four checks (what each would actually do)

1. **Trust test first — before anything goes live.** We have history:
   `.workflows/reviews/` verdict files from past plans. We replay old tasks
   through the Jev checks and see whether Jev's answers agree with what
   actually happened (ok / needed fixes / failed). The pi-typesafe package
   includes a small testing toolkit that turns this replay into accuracy
   numbers and picks safe thresholds. No check is trusted until this passes.
2. **Plan lint (2 questions per spec, at plan time).** "Does any decision in
   this spec contradict a recorded ruling, quoted word-for-word?" and "Does
   the verify line actually prove the spec's goal?" Failures are shown to
   you at the approval gate — you decide, nothing is blocked.
3. **Memory audit (once per plan).** For each ruling/ADR: has the code it
   talks about changed since it was written (git knows this mechanically),
   and does Jev think it still matches reality? Status per entry:
   current / stale / superseded / not-enough-evidence, plus a
   contradiction check between entries. Flagged entries go to you —
   nothing is ever auto-deleted or rewritten (your rulings are your words).
4. **Ship check (1 question at closeout).** "Does the done-list in the ship
   summary match the verdict chain?" Catches summary drift before you read
   a wrong "all green".

## What we deliberately do NOT do (learned the hard way)

- No replacing the reviewer children — the tier table and mechanical checks
  already do that job deterministically.
- No Jev picking models, thinking levels, or tool lists per task — the
  registry tables are policy; overriding them with a mid-tier model is
  over-engineering.
- No per-scenario verification battery — agent-spec already executes the
  spec's test lines mechanically; the semantic residue belongs in
  agent-spec itself (its `--ai-mode` slot), as a separate upstream idea.
- No tool-usage policing inside child sessions — roles already carry
  explicit toolsets; anything more is pi-warden territory (a separate
  personal tool, not a pi-workflows dependency).

Full rejection list with reasons is in the git history of this file
(2026-09-18 versions) if ever needed.

## Rollout, in order

1. Get a key (you) → install pi-typesafe → replay old verdicts → look at
   the accuracy numbers together.
2. If numbers are good: checks 2 and 4 run in "advisory" mode — they show
   flags, they block nothing. See if their flags are useful in practice.
3. Check 3 (memory audit) advisory.
4. Only then discuss letting any check actually gate something.

## What needs your decision

1. Do you want to pursue this at all? (Step 1 costs ~nothing and commits us
   to nothing beyond getting a key.)
2. If yes: key from TypeSafe directly (waitlist, unknown wait) or Vercel
   Gateway (immediate, needs a Vercel account)?
3. Memory audit v1: rulings + ADRs only, or also the dated Decisions
   entries in CONTEXT.md?
