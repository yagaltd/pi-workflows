spec: task
name: "Depth-2 fix — in-place patch of installed pi-core-subagent"
tags: [patch, pi-core-subagent, agentfile, manager, depth-2]
max-rounds: 2
---

## Intent

Fix the depth-2 zero-tool failure at its source: the installed
`~/.pi/agent/npm/node_modules/@arhen/pi-core-subagent` (v1.3.28) gets a surgical, backed-up,
diff-recorded patch. Upstream repo is NOT local — the diff artifact is the upstreaming vehicle.

## Decisions

- D1 (plan 20260822-007): precedence flip + mismatch guard — `input.tools` (explicit) wins over
  any agent-file match; a file match is IGNORED (with WARN) when `input.write` is true and the
  file's tools lack both `edit` and `write`; file may still supply prompt/body when its tools are
  compatible or tools were not explicitly passed.
- D2: match threshold — `bestScore >= 2` in `resolveAgentFile` (both the cwd-walk and home loops).
- D3: zero-tool warning — at completion, write-capable toolset + `toolCalls === 0` ⇒ prefix
  finalText with `WARN: zero tool calls`.
- D4: `.orig` backups beside each patched file; unified diff saved to
  `/home/aurel/Documents/github/pi-workflows/.workflows/patches/pi-core-subagent-1.3.28/` (files:
  `pi-core-subagent-1.3.28.patch` + `README.md` stating version, date, rationale, upstream URL).

## Boundaries

### Allowed Changes
- ~/.pi/agent/npm/node_modules/@arhen/pi-core-subagent/src/manager.ts (+ .orig backup)
- ~/.pi/agent/npm/node_modules/@arhen/pi-core-subagent/src/agentfile.ts (+ .orig backup)
- /home/aurel/Documents/github/pi-workflows/.workflows/patches/pi-core-subagent-1.3.28/** (new)

### Forbidden
- Every other file in the package (child.ts, index.ts, schemas.ts, types.ts, package.json, dist)
- pi-workflows repo files outside .workflows/patches/
- Deleting originals without backup; any change to ~/.pi/agent/settings.json or other packages

## Completion Criteria

Scenario: Backups exist
  Test: ls ~/.pi/agent/npm/node_modules/@arhen/pi-core-subagent/src/*.orig
  Then manager.ts.orig and agentfile.ts.orig present, non-empty

Scenario: Precedence flip landed
  Test: grep -n "input.tools" ~/.pi/agent/npm/node_modules/@arhen/pi-core-subagent/src/manager.ts | head -3
  Then the baseTools resolution checks input.tools BEFORE the file match; the write-mismatch guard (WARN + ignore) greppable

Scenario: Threshold landed
  Test: grep -n "bestScore" ~/.pi/agent/npm/node_modules/@arhen/pi-core-subagent/src/agentfile.ts
  Then both loops require bestScore >= 2 (constant or inline) before a match returns

Scenario: Zero-tool warning landed
  Test: grep -n "WARN: zero tool calls" ~/.pi/agent/npm/node_modules/@arhen/pi-core-subagent/src/manager.ts
  Then present in the completion path, gated on write-capable toolset && toolCalls === 0

Scenario: Diff artifact saved
  Test: test -f /home/aurel/Documents/github/pi-workflows/.workflows/patches/pi-core-subagent-1.3.28/pi-core-subagent-1.3.28.patch && wc -l < /home/aurel/Documents/github/pi-workflows/.workflows/patches/pi-core-subagent-1.3.28/pi-core-subagent-1.3.28.patch
  Then exists, >20 lines; applies cleanly to the .orig files (diff -u .orig current); README.md present with version/date/rationale/upstream URL

Scenario: Syntax-verified, non-executional
  Test: worker's chosen method (bun build / tsc --noEmit / equivalent) — cite the exact command + output in the report
  Then both patched files pass with zero errors; NO execution of the patched code in T1 (live proof is T2, orchestrator-run)

Verify: `ls ~/.pi/agent/npm/node_modules/@arhen/pi-core-subagent/src/*.orig | wc -l | grep -q '^2$' && grep -q 'WARN: zero tool calls' ~/.pi/agent/npm/node_modules/@arhen/pi-core-subagent/src/manager.ts && test -f /home/aurel/Documents/github/pi-workflows/.workflows/patches/pi-core-subagent-1.3.28/pi-core-subagent-1.3.28.patch`
