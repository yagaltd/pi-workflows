---
name: brainstorm
description: "Divergent thinking mode — build, validate, and invalidate ideas with a living markmap ledger before any productization. Use for brainstorming, market/competitor research, product ideation, 'what should we build', sharing half-formed ideas, or research that opens new questions. No code, no specs, no commitment."
user-invocable: true
argument-hint: "<topic, question, or 'resume'>"
---

# Brainstorm Workflow

Divergent research mode. You and the human think together; the agent
structures the conversation into a durable, versioned research ledger;
read-only subagents fetch evidence on demand. Nothing is built, specced, or
committed to beyond the ledger.

```
chat rounds (diverge ↔ challenge ↔ associate)
  → ledger update (agent is the single writer)
  → on demand: research subagents (web / repo / synthesis)
  → findings close branches ✅/❌ or open frontier questions ❓
  → converge: rank frontier, park dead ends 💤
  → graduate: /explore (one hypothesis) or /idea (productize) or park
```

This is the phase BEFORE `/explore` (decisive kill/pivot on one question)
and `/idea` (productization). Do not drift into planning: no task lists, no
specs, no contracts, no code.

## The ledger — `.workflows/research/<slug>/ledger.md`

One folder per brainstorm topic. `<slug>` = 2-4 short hyphenated words from
the topic. Contents over time:

```
.workflows/research/<slug>/
  ledger.md              the living mindmap (markmap-renderable)
  report-<NN>-<slug>.md  research subagent reports (evidence, numbered R1..)
  brief-<topic>.md       deep-research briefs (scope freezes)
```

### Ledger template

```markdown
---
markmap:
  initialExpandLevel: 3
  colorFreezeLevel: 2
---
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

### Markmap rules (the ledger MUST stay renderable)

- Headings = nodes, bullets = children. Keep every label **short** (< 60
  chars); prose lives in reports, not in the tree.
- No tables, no code blocks, no long paragraphs inside the tree.
- Status emoji leads every branch label: ❓ open · ✅ validated · ❌
  invalidated · 💤 parked. A branch changes status ONLY on evidence, never
  on vibes.
- Render anytime: `npx markmap-cli ledger.md -o ledger.html --offline`.
  **`--offline` is required** — without it the output is a 4KB shell that
  loads d3 + markmap from a CDN at open time and renders a blank page
  offline/`file://`. The offline build embeds all assets (~350KB), opens
  anywhere. (Verified by browser-render test: default = 0 nodes,
  offline = full tree.)

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

## Research on demand — pi-core-subagent dispatches

Ad-hoc angles (NOT registry roles — inline prompts per the registry
doctrine). All read-only: bash-bearing angles use the reviewer-style
allowlist with "bash is for fetch/run only — NEVER modify files" discipline.

### Web / market / competitor research

```text
subagent({
  agent: "web-<angle>",
  prompt: "You are a research analyst. You investigate your assigned angle
           with web searches (curl, or a web-search tool if available) and
           report findings with a source URL for every claim. Bash is for
           fetching and running read-only commands — you NEVER modify,
           create, or delete files. Distinguish fact / estimate / opinion.
           If a claim can't be sourced, label it UNSUBSTANTIATED.",
  tools: ["read","grep","find","ls","bash"],
  thinking: "medium",
  autoAwait: true,
  task: `Research for: <central question>
Angle: <e.g. competitor pricing for task-tracking tools / market size /
prior art for X / library landscape>

Report (this exact shape, numbered findings):
## Angle: <name>
1. <finding> — <source url>
2. <finding> — <source url>
## Gaps — what I could NOT establish
## New questions this raises — bulleted, concrete`
})
```

### Local repo / codebase reading

Use the scout role (registry): read `.pi`-package `agents/scout.md` verbatim
into `prompt:`, `thinking: "low"`, read-only.

```text
task: `Investigate for: <central question>
Question: <e.g. can our stack support realtime collaboration without a rewrite?
          which existing modules could be reused for X?>
Report findings with exact paths and line ranges. NEVER modify anything.`
```

### Synthesis fan-in (many reports)

When 4+ reports or very long outputs would flood this context, dispatch a
synthesizer with `needs:` — upstream outputs arrive prepended automatically:

```text
subagent({
  autoAwait: true,
  tasks: [
    { id: "r1", ...research tasks as above... },
    { id: "r2", ... },
    { id: "syn", agent: "synthesizer", needs: ["r1","r2"],
      prompt: "You merge research reports into decision-ready findings.
               Deduplicate, flag contradictions between sources, keep every
               citation. NEVER modify files.",
      tools: ["read","grep","find","ls"], thinking: "medium",
      task: `Synthesize the reports above for: <central question>.
Output: consolidated findings (each with citations), contradictions,
implications per ledger branch, and up to 5 new frontier questions ranked
by impact vs effort.` },
  ],
})
```

### Report persistence

The agent writes each subagent report verbatim to
`research/<slug>/report-<NN>-<slug>.md` (NN zero-padded, sequential) and
cites it as `[R#]` in the ledger. Reports are never edited after writing —
corrections go in a new report or a ledger note.

### Deep-research briefs

When a frontier question deserves depth, freeze its scope FIRST in
`research/<slug>/brief-<topic>.md` — the research analog of a plan header:

```markdown
# Brief: <question>
Branch: <ledger branch> · Priority: impact H effort L
Success criteria: <what evidence settles it>
IN: <sources, markets, repos to cover>
OUT: <explicitly excluded>
Budget: <e.g. 2 subagent angles, one synthesis>
Output: report-<NN>-<slug>.md → closes/updates branch <name>
```

Then dispatch the research tasks for it (higher `thinking` for hard
analysis: high/xhigh).

## The loop with the human

1. **Open**: restate the topic as a central question; propose IN/OUT scope;
   create the folder + ledger skeleton. 1 question max if the topic is
   unclear — with a recommended default (grill bar: material, grounded,
   answerable).
2. **Diverge**: generate branches (Green hat — radically different angles:
   market, competitor, feasibility, differentiation, cost, timing). For
   each: what would validate it, what would kill it. Offer to run research
   before asking the human to opine on facts.
3. **React**: the human's taste is an unknown-known — capture their
   reactions ("I hate enterprise-y dashboards") as explicit branch criteria,
   not as evidence.
4. **Research**: dispatch on demand; persist reports; update branches and
   frontier. Findings may INVALIDATE the human's pet idea — say it plainly
   with the citation.
5. **Converge**: rank frontier by impact × effort (templates/THINKING-TOOLS
   §3 — package templates/, two dirs up from this skill); propose the next
   best question or the exit.
6. **Exit** (one of):
   - **Graduate → `/explore <hypothesis>`** — one branch needs a decisive
     kill/pivot bet.
   - **Graduate → `/idea`** — ready to productize; the ledger + reports are
     citable evidence; optionally synthesize
     `.workflows/knowledge/evidence-<date>-<slug>.md` first so `/idea`
     finds it in the standard place.
   - **Park** — mark open branches 💤 with revival conditions; the ledger
     stays for the next session.
   - **Kill** — evidence says no; record why in the ledger (this is a
     SUCCESSFUL outcome — cheap no).

Append to `.workflows/LOG.md` on open and exit:
`<date> BRAINSTORM <slug> — <opened | graduated-explore | graduated-idea | parked | killed>`.

## Resume protocol

`/brainstorm resume` (or `/brainstorm` with existing research folders):
list `.workflows/research/*/ledger.md`, show each central question + last
LOG line, ask which to continue. On resume: show the branch map (statuses),
frontier top-3, and propose where to pick up.

## Rules

- **No building.** No code writes, no specs, no contracts, no plan.md. This
  mode lives in `research/` (+ `knowledge/` at graduation) and nowhere else.
- **Single writer.** Subagents report; the agent writes ledger/reports.
- **Evidence-gated statuses.** ✅/❌ only with a cited `[R#]`/`[S#]`.
- **Lead with your recommendation.** Every question to the human carries
  Recommended + Evidence + "if you don't care, I'll proceed with <default>".
- **Kill fast, kill cheap.** The cheapest evidence that invalidates a
  branch is the best research you can run.
- **Timebox rounds.** Minutes per round, not hours; the human can leave
  anytime — the ledger is the state.
