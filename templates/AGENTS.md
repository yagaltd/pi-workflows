<!-- TEMPLATE — copy to ./AGENTS.md at the project root, fill <placeholder>s, drop this header.
     Doctrine: AGENTS.md = CORE + POINTERS + PROJECT, hard budget 60 lines.
     It carries binding rules, one-liner facts, and pointers ONLY — maps, ADR
     bodies, and command inventories live in the pointer targets, never here.
     Pointer paths are repo-relative and must exist (validate instances: bash
     scripts/agents-lint.sh AGENTS.md). Nested AGENTS.md files are dead weight:
     sessions load ancestors of cwd only, so point at READMEs and docs. -->

## CORE (binding)

- Containment: work only within your task's Allowed Changes; anything else is reported, never fixed.
- Commits: workers never commit, merge, or push; a gate commits after review passes.
- Refactor first: extend existing structure before adding new surface.
- TDD: write the failing test with the change, not after; keep the suite green.
- Subtract first: prefer deleting or simplifying over adding.
- Root causes: fix causes, not symptoms; never patch around a defect.
- Docs discipline: docs describe current state; history lands only in CHANGELOG.md.

## POINTERS

- Project overview (what this is, who it serves): `<placeholder>`
- Build and test (commands, fixtures): `<placeholder>`
- Architecture and docs index (map, ADRs): `<placeholder>`
- Conventions (style, docs policy): `<placeholder>`

## PROJECT

- <placeholder>: project-specific binding rules, one line each — only what
  every session must always obey; detail belongs in pointer targets.
