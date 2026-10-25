spec: task
name: "layerfs-integration-spike"
tags: []
---

## Intent

Feasibility spike (plan 20261025-020 D2, read-only): can LayerFS replace `.git/subagents/**` git worktrees as the pi-core-subagent write-child backend WITHOUT forking pi-core-subagent? Read the LayerFS plugin/API surface (local checkout `api/` — `@layerfs/agent`, `@layerfs/backend`, `plugins/` examples) and pi-core-subagent's worktree-creation point, then report the integration shape (backend option / wrapper / fork), an effort estimate, and blockers. No code written.

## Decisions

- Findings file: `.workflows/reviews/layerfs-feasibility.md` — the ONLY file written. Every claim cites file:line in the cited codebase.
- Integration shapes to evaluate: (a) pi-core-subagent backend option (upstream change), (b) pi-workflows-level wrapper (create/commit/discard around the child dispatch, no dependency change), (c) fork of pi-core-subagent. Each gets: effort (S/M/L), risk, verdict.
- The spike also records the LayerFS lifecycle mapping: workspace create ↔ `git worktree add`, commit ↔ the gate's merge step, discard ↔ `git worktree remove` — where the semantics differ (no .git inside the workspace; Store durability), name it.
- Stop rule: if neither (a) nor (b) is plausible without forking, say so plainly — that is a valid finding feeding NO-GO.

## Boundaries

### Allowed Changes
- .workflows/reviews/layerfs-feasibility.md

### Forbidden
- Do not write any other file.
- Do not modify the LayerFS checkout, pi-core-subagent, or any production file.
- Do not run builds (TASK 1 owns the build).

## Completion Criteria

Scenario: cites the layerfs api surface with file:line
  Test: grep -qE "api/.*:[0-9]+" .workflows/reviews/layerfs-feasibility.md
  Given the LayerFS checkout api/ tree
  When the findings file is inspected
  Then the API surface claims carry file:line citations

Scenario: cites the pi-core-subagent worktree creation point with file:line
  Test: grep -qE "pi-core-subagent.*:[0-9]+" .workflows/reviews/layerfs-feasibility.md
  Given pi-core-subagent's dist/source
  When the findings file is inspected
  Then the worktree-creation point carries a file:line citation

Scenario: names the integration shape and effort estimate
  Test: grep -qiE "effort.*(S|M|L)" .workflows/reviews/layerfs-feasibility.md
  Given the three integration shapes
  When the findings file is inspected
  Then each shape carries an effort estimate and the recommended one is named

Scenario: names blockers if any
  Test: grep -qi "blocker" .workflows/reviews/layerfs-feasibility.md
  Given the spike findings
  When the file is inspected
  Then blockers (or "none found") are stated explicitly
