# Research dispatch shapes — pi-core-subagent

Loaded on demand, when research is dispatched. Normative.

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

Use the scout role: `prompt: "@role:scout"` (resolved by the pi-workflows
extension; without it, paste `agents/scout.md` verbatim), `thinking: "low"`, read-only.

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

