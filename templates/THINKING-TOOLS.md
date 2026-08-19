# Thinking tools — shared reference

Loaded on demand by skills that need them (`/fix`, `/idea`, `/plan`,
`/explore`, `/optimize`, `/prototype`). Each tool: when to use it, the
compact protocol, when NOT to use it. Don't apply all tools everywhere —
pick the one the moment calls for.

## 1. Five Whys — systemic root cause (recurrence)

**Use when:** a bug or failure *recurs*, or after fixing a bug — to decide
whether you fixed the symptom or the cause. This complements (does not
replace) hypothesis-driven diagnosis: hypotheses find *which mechanism*
broke; 5-whys asks *why the system let it break*.

**Protocol:**

```markdown
## Why-chain
1. Why <failure>? → <cause 1>
2. Why <cause 1>? → <cause 2>
3. Why <cause 2>? → <cause 3>
   ...stop as soon as the cause is actionable
```

Rules:
- Every "why" must be **verifiable against evidence** (code, tests, logs,
  git history) — not speculation. A why you can't check is a hypothesis,
  treat it as one.
- **Stop at the shallowest level you can actually change** — usually 2-3
  whys, max 5. Never end on "human error"; end on the missing guard that
  would have caught it (a test, a type, a check, a boundary).
- Choose the fix level deliberately: code fix (this instance), test fix
  (this class), process/architecture fix (this category). Log the level
  you chose and the levels you consciously skipped.

**Don't use when:** it's the first occurrence of a trivial typo — just fix it.

## 2. Six Thinking Hats — divergent option generation

**Use when:** generating options, design directions, or approaches
(`/idea` Phase 2, `/prototype` variations, `/optimize` strategies) and
before converging on one. The point is rotating lenses so one mindset
(usually black-hat caution) doesn't dominate.

**Protocol:** generate with green, evaluate each option with white → yellow →
black, sanity-check with red, then blue to converge:

| Hat | Lens | Ask |
|---|---|---|
| ⚪ White | Facts | What does the evidence (code/docs/benchmarks) actually say? |
| 🟢 Green | Alternatives | What radically different approach exists? (this is where /prototype variations come from) |
| 🟡 Yellow | Benefits | What's genuinely good about this option — best case? |
| ⚫ Black | Risks | How does this fail? What does it break? Cost when wrong? |
| 🔴 Red | Instinct | Gut/user reaction — would the user hate this? (proxy: unknown-knowns — show, don't ask) |
| 🔵 Blue | Process | What's the next concrete step — prototype, decide, or discard? |

Rules:
- **One hat at a time** — mixing "it's good BUT risky" is how options get
  muddled.
- Green before yellow/black — generate first, judge second.
- Every option must survive white (facts exist) before blue promotes it to
  a Decision Tree entry or a prototype.

**Don't use when:** there's exactly one obvious option and it's low-risk.

## 3. Impact × Effort matrix — converging on options

**Use when:** comparing 2+ viable options — strategies (`/optimize`),
task ordering (`/plan`), scope cuts (`/amend`, `/explore` kill/pivot calls).

**Protocol:** score each option, place it, act per quadrant:

```
                 High impact
                     │
     BIG BETS        │   QUICK WINS
     prototype       │   do first
     first (🟡 RISKY)│   (⚪ STANDARD)
 High ───────────────┼─────────────── Low effort
     MONEY PITS      │   FILL-INS
     avoid           │   batch or skip
                     │
                 Low impact
```

Rules:
- **Impact** = evidence-backed movement on the goal / contract criteria
  (benchmark delta, scenario coverage, risk removed) — never "feels
  important".
- **Effort** = from evidence: files touched, new deps, LOC, test surface.
- Quadrant actions: Quick Wins → schedule early. Big Bets → de-risk via
  `/prototype` or `/optimize` BEFORE committing (this is what 🟡 RISKY
  bottleneck tags mean). Money Pits → name them and drop them in writing.
  Fill-ins → batch at the end or cut.
- In `/plan`, the matrix feeds bottleneck tags: Quick Win → ⚪, Big Bet →
  🟡 (prototype first) or 🔴 if on the critical path, Verification-heavy
  Big Bet → 🟠.

**Don't use when:** options aren't actually comparable (different scopes) —
make them comparable first or don't pretend to score them.

## How they compose

```
generate options (Green) → score (White) → place (Impact×Effort)
→ de-risk Big Bets (/prototype) → grill the survivors (decision tree)
→ fix recurrence with Five Whys when things break anyway
```
