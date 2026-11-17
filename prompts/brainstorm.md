---
description: "Brainstorm — divergent research mode: think together, evidence branches, research ledger, no building"
argument-hint: "<topic or question | resume>"
---
# `/brainstorm`

Divergent research mode — build ideas WITH the human, validate/invalidate
them with evidence, and structure everything into a living research ledger.
No code, no specs, no tasks: this is the phase before `/explore` and `/idea`.

Follow the 'brainstorm' skill workflow — load its SKILL.md with the read
tool, then execute it. The ledger template, dispatch shapes, and update
discipline all live there.

## Quick reference

**Setup**: load `skills/brainstorm/SKILL.md` (this package). If the argument
is `resume` (or empty with existing research), run the resume protocol:
list `.workflows/research/*/ledger.md`, ask which to continue, show branch
map + frontier top-3.

**The loop**:

```text
1. OPEN     — central question, IN/OUT scope, mkdir .workflows/research/<slug>/,
              ledger skeleton, LOG.md line
2. DIVERGE  — Green-hat branches (market, competitor, feasibility,
              differentiation, cost, timing); per branch: what validates it,
              what kills it. Offer research before asking the human to opine.
3. REACT    — human taste = unknown-knowns: capture reactions as branch
              criteria, not evidence
4. RESEARCH — pi-core-subagent on demand (read-only angles: web/market with
              bash-for-fetch allowlist, repo via the scout role, synthesis
              via needs fan-in); persist report-<NN>-<slug>.md; update ledger
              branches + frontier with citations
5. CONVERGE — rank frontier by impact × effort; propose next question or exit
6. EXIT     — graduate to /explore (one hypothesis) or /idea (productize,
              optionally synthesize knowledge/evidence-*.md), park (💤 with
              revival conditions), or kill (cheap no = success). LOG.md line.
```

**Non-negotiables**: agent is the single writer of the ledger; subagents
report as text. ✅/❌ branch statuses only on cited evidence ([R#]/[S#]).
Update the ledger after every meaningful exchange — the ledger is the
memory, the chat is not. Nothing outside `.workflows/research/<slug>/`
(+ `knowledge/` at graduation). Visuals at graduation: run the format
chooser (`node scripts/format-chooser.mjs choose --for brainstorm-graduation --content-file <ledger.md>`); a visual pick generates a concept view via the diagram-design doctrine — HTML is a generated view, never a gate.

**Intake exit-rail**: when the session converges on concrete, productizable
requirements (typically at CONVERGE/EXIT), emit them as marked requirement
blocks — format in `tests/intake/README.md`, worked example in
`tests/intake/sample-intake.md` — to `.workflows/intake/<date>-<slug>.md`,
and annotate rejected blocks `rejected: <reason>` in the intake file. Then
stop at the human approval gate — that gate is the end of this workflow. The
import step is DEFERRED: `agent-spec requirements import` does not exist in
the installed agent-spec binary (0.2.7) or in the repo, so there is no command
to run here and nothing to verify — never tell the human their blocks were
imported or check them against `.workflows/requirements/` (`DEC-007`). This is
the one sanctioned write outside `.workflows/research/<slug>/`.

$@
