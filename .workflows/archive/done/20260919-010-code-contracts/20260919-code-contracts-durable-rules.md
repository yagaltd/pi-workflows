# Code contracts — durable rules that live next to the code

- **Created**: 2026-09-19
- **Status**: APPROVED 2026-09-19 — all four decisions resolved WITH the
  recommendations: (1) adopt, steps 1–4 first; (2) scope **(b)** CONTRACTS +
  @cc on touched declarations; (3) fold — direction reversed by the same-day
  supersede of the Jev proposal: the trust test is absorbed here (rollout
  step 2); (4) pin cc-check, vendor only on churn.
- **Supersedes**: `20260918-improvements-jev-judgment-gates.md` (same day) —
  Jev usage now flows exclusively through steps 5–6 of this proposal.
  Overlap was one place (ADR staleness), now ours.
- **Kind**: working material (stays in `.workflows/`, never ships)

## What code-contracts is, in one paragraph

An open format by Stan Polu ("@cc" on GitHub) for writing rules **inside the
code files they govern**, instead of in separate documents. A rule ("contract")
is a short tagged comment attached to a function or class — or, for rules that
apply to a whole directory, a plain `CONTRACTS` file at the top of that
directory. Example, attached to the function it governs:

```typescript
/**
 * @cc [adr:0003,label:architecture] database-access-thru-resources
 * Database accesses must happen exclusively through `Resource`-like interfaces.
 */
export async function saveInvoice(...) { ... }
```

A small command-line tool (`cc-check`) ships with it. The tool only checks
spelling/shape of the comments and lists which contracts apply to a file —
**it deliberately never checks whether the code actually obeys the rule.**
That gap is the interesting part for us (see step 5). The format supports
TypeScript, Python, Rust, Go. It is young (launched 2026-09) and third-party
(MIT license).

## The problem being solved

Three gaps, all about **durable rules** — rules that must hold across every
task, every plan, forever — which today have no good home:

1. **No home for durable rules.** `.spec` contracts are per-task and get
   archived when the plan ships — correct for task boundaries, useless for
   "database access always goes through Resource interfaces". CONTEXT.md holds
   rulings as prose children demonstrably skip. ADRs are sparse by design.
   The result: a cross-task invariant lives nowhere a worker reliably sees it.
2. **"Read the ADR" is a hope, not a mechanism.** Documented incident
   (dispatch-shapes.md, ADR-slices rule): a round was burned building on an
   ADR *candidate* because **the ADR was never read at spec or dispatch
   time**. The current fix — planner writes a one-line ADR summary into the
   dispatch pack — depends on the planner remembering. The Jev proposal's
   problem 3 (plan-040 T7, same failure class) corroborates.
3. **Nothing enforces ADR read/update.** Verified current state: the rules
   already say the latest Accepted ADR is the truth, superseded ones are kept
   for history with a link, and ADRs are never archived — exactly right. What
   is missing is any check that (a) the worker actually saw the relevant ADR,
   and (b) a decision change actually superseded one when it should have.

## The design decision: add a layer, do not replace `.spec`

The first instinct — replace `.spec`'s shape with lists of files + `@cc` —
was examined and rejected:

| | `.spec` (keep) | `@cc` (add) |
|---|---|---|
| Lifetime | per-task, archived at ship | durable, lives with code |
| How enforced | **mechanical** — agent-spec runs the named tests; boundary guard checks git status | syntax-only tool; obedience is a judgment |
| Best at | task boundaries + done-ness | standing invariants + pointers |

`.spec` scenarios must name an exact test function; that executable link is
the core of verdict gating. `@cc` prose ("balance is decreased…") has no
executable link — swapping would trade our one hard gate for prose. Instead
`@cc` fills the layer `.spec` cannot cover: rules that outlive every plan.

## The pieces (adoption ladder — each step is independently useful)

1. **Mechanical syntax gate (no Jev, no cost).** Reviewer pipeline gains a
   step: when `@cc` comments or `CONTRACTS` files exist in the repo, run
   `cc-check format`. Exit code gates, like every other Layer 1 check.
2. **Rules ride the dispatch pack (kills problem 1+2 structurally).** For each
   task's files, `cc-check list` output goes into the dispatch context pack.
   The worker sees the governing rules without reading anything — colocation
   extended to dispatch. Replaces the hand-written ADR-slices summary with a
   mechanically exact list.
3. **Workers write contracts on new seams.** A worker rule: public functions
   created or changed in Allowed Changes carry `@cc` for their invariants.
   The `adr:` attribute (format metadata is extensible — this is not a fork)
   points to the governing ADR when one exists. Rule travels with the code;
   the *why* stays one hop away in the ADR.
4. **`.spec` gains a section, not a new shape.** `## Applicable contracts` —
   the `@cc` IDs for this task's files, machine-generated from `cc-check
   list`. Replaces prose rule-recitations in specs with precise IDs.
5. **Jev checks obedience (needs a Jev key + a passed trust test — rollout
   step 2).** `cc-check` refuses this
   job by design; today it's "left to review agents" — i.e. nobody. One
   batched call per quality review: state = {diff summary, each touched
   contract's prose + code}, one yes/no question per contract ("does this
   code satisfy this rule?"). Same for ADRs: per governing ADR, one question
   picking `consistent | contradicts | supersedes | unrelated` against the
   diff. Flags route to the human — Jev never flips a verdict (standing rule
   from the Jev proposal).
6. **Supersede trigger (mechanical grep + Jev routing).** Extension watchdog:
   diff touches an ADR-governed seam or a `Decisions:` section changed with
   no new ADR file → ask Jev the supersedes question → real probability of
   `supersedes` → surface at the human gate. The supersede rule itself stays
   exactly as-is; this only makes it fire when it should.

## What we deliberately do NOT do

- **No replacing `.spec`** with `@cc` lists — loses the executable gate (the
  comparison above).
- **No ADR elimination.** `@cc` carries *what must hold*; ADRs carry *why*
  (context, tradeoffs, rejected alternatives). Reduces ADR reading, does not
  remove it — the `adr:` pointer keeps rationale one hop away. Density is
  also opposite: ADRs are rare by rule; contracts would be common.
- **No Jev in any verdict path** — flags route, humans/strong models decide
  (same guardrail as the Jev proposal).
- **No auto-rewrite or deletion of ADRs or contracts** — rulings are the
  owner's words; flags only.
- **No mandate that every function gets a contract** — durable invariants
  only (seams, boundaries, security rules). Per-task ephemera stays in
  `.spec`. Contract noise would bury the signal.
- **No vendoring/reimplementing `cc-check`** — it is read-only, tiny, and
  global-install; pin the version, note it in requirements. Revisit only if
  the young format churns.

## Rollout, in order

1. Steps 1–4 (no Jev, no key, no cost): `cc-check` install + dogfood in this
   repo — a `CONTRACTS` file for our own repo-level rules and `@cc` on the
   extension's real seams first. This tests the format on ourselves before
   recommending it to consumers.
2. **Jev gate** (self-contained — the superseded Jev proposal's replay idea
   is absorbed here): get a key, replay old verdict files from
   `.workflows/reviews/` + archive through the step-5 question shapes, look
   at accuracy numbers together. Only if good: steps 5–6 run advisory
   (flag, block nothing).
3. Only after both proposals' advisory phases prove useful: discuss gating.

## ADR (created at implementation time, per the sparse-ADR rule)

One ADR, likely warranted: "durable rules layer = code-contracts format"
(hard to reverse once contracts accumulate; surprising to a future reader;
real tradeoff vs CONTEXT.md-only or inventing our own format). Created at
implementation time, per the sparse-ADR rule — not now.

## What needs your decision

1. **Adopt `@cc` as the durable-rules layer at all?** Recommended: yes, steps
   1–4 only — mechanical, free, reversible (contracts are comments; deleting
   them costs a grep).
2. **v1 scope** — (a) `CONTRACTS` file only (repo-level rules, zero code
   touch), or (b) also `@cc` on declarations touched by plan tasks?
   Recommended: (b) — (a) alone doesn't fix the dispatch-pack problem, which
   is the documented failure.
3. **Jev-dependent steps 5–6**: fold into the Jev proposal as a fifth check
   ("contract compliance") or keep as separate advisory phase? Recommended:
   fold — one trust test, one rollout, one set of thresholds.
4. **Dependency posture on the young format**: pin + version-note now,
   vendor later only if upstream churns? Recommended: yes, exactly that.
