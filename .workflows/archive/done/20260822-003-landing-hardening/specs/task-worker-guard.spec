spec: task
name: "worker.md — Step 0 GUARD + anti-scaffold"
tags: [docs, worker, guard, anti-scaffold]
max-rounds: 2
---

## Intent

The worker role can no longer trust its assumed working directory, can no longer conflate an unreachable contract with a deliberately-absent one, and can never scaffold a project to make a task runnable.

## Decisions

- D2: New "Step 0 — GUARD (verify your landing)" before "1. Read the contract": run `pwd` + `git rev-parse --show-toplevel`; both must match the absolute repo path named in the task text's first line; mismatch → `WORKER_BLOCKER` (reason: inaccessible_resource) with found-vs-expected evidence. Never proceed, never improvise.
- D2 anti-scaffold clause: an empty or foreign project tree is an environment failure, NEVER a build instruction. Creating files to make an unreadable contract runnable (project scaffolding, deno.json/package.json, spec files, test harnesses) is forbidden — report the environment failure instead.
- D3: Spec reachability rule — spec deliberately absent (the plan/task says so) → proceed from task text; spec expected but unreadable at the verified root → WORKER_BLOCKER. Unreachable ≠ missing.
- D4: GUARD step reads AGENTS.md if present at the verified root (the harness does not inject it).
- The "Your bash already runs in the project working directory" assertion is corrected to a verify-it form pointing at Step 0.

## Boundaries

### Allowed Changes
- agents/worker.md only

### Forbidden
- Other agent files, tooling/, .workflows/, skills/, extension code

## Completion Criteria

Scenario: GUARD step exists and precedes contract reading
  Test: grep -n "Step 0" agents/worker.md
  Given the updated worker role
  Then a GUARD section precedes the contract-reading step and contains pwd + git rev-parse --show-toplevel + the WORKER_BLOCKER consequence

Scenario: Anti-scaffold clause present
  Test: grep -i "scaffold" agents/worker.md
  Then the clause forbids creating files to make an unreadable contract runnable, naming at least project scaffolding and spec files, and directs reporting instead

Scenario: Unreachable vs absent disambiguated
  Test: grep -i "unreachable" agents/worker.md
  Then the two cases are distinguished with their different outcomes (proceed vs blocker)

Scenario: AGENTS.md instruction present
  Test: grep "AGENTS.md" agents/worker.md
  Then the GUARD (or immediately following) step says to read AGENTS.md if present at the verified root
