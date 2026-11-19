# Proposal — Plan 079: the evasion-resistant oracle

> Status: QUEUED 2026-11-19 (owner diagnosis: "the harness reported agreement it had not earned… all were confidence bought too cheaply") — executes after plan 078 (landed) · Repos: pi-workflows (doctrine + scanner + judge pack) · first target: MorphNSH's review harness
> Source: MorphNSH review findings 2026-11-19 — five passes, five unearned agreements: unpinned wikilink/attribute divergences, a zero-width separator, an env var bypassing a pin, a root rule swapping cases. All one disease: **oracle binding too weak, blind spots correlated across passes**.

## The doctrine line this plan pins

**An oracle is only worth what its binding.** Every agreement verdict must state what the oracle bound to; every pass must vary the binding; every evasion class with a deterministic detector gets a script before it gets a prompt.

## Tasks

### Task 1 — Tier-0 evasion scanner (deterministic, wired into the review gate)
`scripts/evasion-scan.*`: zero-width/bidi/invisible-character byte scan (U+200B–200D, FEFF, 2060, tag chars), unicode-confusable detection (homoglyphs via the confusables table), env-var-bypass scan (reads of pinned env names in the diff), case-normalization diff (compare behavior under NFKC + casefold). Output: findings with byte-offset evidence. Wired: review gate runs it BEFORE the judge; findings enter the verdict batch as evidence. (A zero-width separator is a byte fact — scripts close it, per the layered doctrine.)

### Task 2 — judge evasion-detection question pack (TypeLLM, batched)
Every reviewVerdicts batch gains the evasion questions: `{invisible_chars: number}`, `{env_bypass: boolean, instructions: "does any pinned literal have a runtime bypass path"}`, `{normalization_equivalent: boolean}`, `{oracle_binding_stated: boolean}` — reading the scanner output as evidence. The judge verdicts on evasion, not just feature-completion.

### Task 3 — oracle-binding disclosure rule (reviewer doctrine)
Every agreement verdict states WHAT the oracle bound to (the exact matcher + normalization). The reviewer audits oracle strength as a standing question ("would this oracle catch a zero-width separator / env bypass / case swap?"). An unaudited agreement is a finding — *agreeing-is-a-finding* (the 068/077 discipline extended).

### Task 4 — oracle variation between passes
The harness varies normalization/matcher/granularity per pass (the permutation insight applied to oracles) so blind spots stop correlating: pass 1 exact-match, pass 2 normalized, pass 3 semantic-judge. Converging agreements across VARIED oracles are earned; converging agreements across IDENTICAL oracles are not.

## Standing constraints

Schema-driven, loud-skip, confidence-gated, never closes alone, env-side key — unchanged. The scanner is deterministic and always runs (no key needed); the judge questions ride the seam.

## First target

MorphNSH's review harness — T1 would have caught the zero-width separator on pass one.
