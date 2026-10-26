# Ledger format — .workflows/research/<slug>/ledger.md

Loaded at session open (and whenever the ledger is written). Normative.

## The ledger — `.workflows/research/<slug>/ledger.md`

One folder per brainstorm topic. `<slug>` = 2-4 short hyphenated words from
the topic. Contents over time:

```
.workflows/research/<slug>/
  ledger.md              the living research tree (markdown)
  report-<NN>-<slug>.md  research subagent reports (evidence, numbered R1..)
  brief-<topic>.md       deep-research briefs (scope freezes)
```

### Ledger template

```markdown
# <Central question — one line, ends with ?>

## 🎯 Scope
- IN: <what this research covers>
- OUT: <explicitly excluded — revisit only if ...>
- Decision owner: <human> · Started: <date>

## 💡 Branches
### ❓ <Hypothesis / idea A — short label>
- Status: ❓ open · since <date>
- Evidence: [R1] <one-line finding + source>
- Implication: <what it means for the question>
- Settled by: <what evidence would close it>
### ✅ <Hypothesis B — short label>
- Status: ✅ validated <date> — [R2] <why>
### ❌ <Hypothesis C — short label>
- Status: ❌ invalidated <date> — [R3] <why>
### 💤 <Hypothesis D — short label>
- Status: 💤 parked — <revival condition>

## 🔥 Frontier — open questions, ranked
1. ❓ <question> — impact H/M/L · effort H/M/L · opened by [R1]
2. ❓ <question> — impact H · effort L — **next best question**

## 📚 Sources
- [S1] <url/repo/file> — <what it established>
- [R1] report-01-<slug>.md — <angle> · <date>
```

### Ledger rules (markdown tree)

- Headings = nodes, bullets = children. Keep every label **short** (< 60
  chars); prose lives in reports, not in the tree.
- No tables, no code blocks, no long paragraphs inside the tree.
- Status emoji leads every branch label: ❓ open · ✅ validated · ❌
  invalidated · 💤 parked. A branch changes status ONLY on evidence, never
  on vibes.
- Markmap tooling retired (plan 20261026-032); visuals generate at graduation via the format chooser + diagram-design.

### Update discipline

- The agent (this session) is the **single writer** of the ledger.
  Subagents return findings as text; they never write here.
- Update the ledger **after every meaningful exchange** — a new branch, a
  status change, a new frontier question, a scope adjustment. Small diffs,
  frequently. The ledger is the memory; the chat is not.
- Every evidence line cites a report (`[R#]`) or source (`[S#]`). No
  uncited claims in the tree.
- Commit ledger changes with the project repo as you go (git versions the
  research history) — but never commit, merge, or push anything else.

