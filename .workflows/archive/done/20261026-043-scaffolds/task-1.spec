spec: task
name: "scaffold-generator-adr-kind"
tags: []
---

## Intent

Land the scaffold mechanism: (1) `scripts/scaffold.sh <kind> <name>` — kind from the profile's `scaffolds.kinds`, template rendered with `{{name}}` (sanitized `[a-z0-9-]`), `{{date}}` (ISO today), `{{next:N}}` (next free zero-padded sequence computed from existing files matching the target pattern); refuses unknown kinds, existing targets, invalid names; writes the file, prints the created path, no hooks, no git ops; (2) profile kind `adr`: template `templates/ADR.md`, target `.workflows/decisions/DEC-{{next:3}}-{{name}}.md`; (3) profile-lint extension: every kind entry must have an existing `template` and a `target` containing `{{name}}`.

## Decisions

- Name sanitization: `[a-z0-9-]` only; uppercase, slash, dot, `..` → `FAIL: invalid name`.
- `{{next:N}}`: scan the target's directory for files matching the pattern with the sequence placeholder replaced by `[0-9]{N}`; next = max + 1, zero-padded to N.
- Overwrite refusal: target exists → `FAIL: target exists: <path>`, exit 1, no writes.
- Unknown kind → `FAIL: unknown kind: <k> (known: <list>)`, exit 1.
- `templates/ADR.md` may gain placeholder lines (e.g. a title line `# ADR-{{next:3}}: {{name}}`) so renders carry the name — minimal edit.

## Boundaries

### Allowed Changes
- scripts/scaffold.sh
- .workflows/profile.json
- templates/ADR.md
- scripts/profile-lint.sh

### Forbidden
- Do not touch `skills/**`, `extensions/**`, CHANGELOG/package.json (TASK 2 scope), README/DOCS-POLICY (TASK 2 scope).
- Do not modify `.workflows/decisions/*` content (the probe creates and removes its own file).
- Do not add dependencies.

## Completion Criteria

Scenario: scaffold adr creates the next-numbered file
  Test: bash scripts/scaffold.sh adr test-slug > /dev/null && test -f .workflows/decisions/DEC-006-test-slug.md && grep -q "test-slug" .workflows/decisions/DEC-006-test-slug.md && rm .workflows/decisions/DEC-006-test-slug.md
  Given the profile kind adr and DEC-001..005 present
  When scaffold adr runs with a fresh slug
  Then the next-numbered file exists with the name rendered, and the probe cleans up after itself

Scenario: unknown kind fails with the kind list
  Test: if bash scripts/scaffold.sh nope x > /tmp/p43-unknown.txt 2>&1; then exit 1; fi; grep -q "adr" /tmp/p43-unknown.txt
  Given an unknown kind
  When scaffold runs
  Then it exits non-zero and lists the known kinds

Scenario: overwrite refuses
  Test: bash scripts/scaffold.sh adr dup-test > /dev/null; if bash scripts/scaffold.sh adr dup-test > /tmp/p43-dup.txt 2>&1; then exit 1; fi; grep -q "target exists" /tmp/p43-dup.txt; rm .workflows/decisions/DEC-006-dup-test.md
  Given a kind whose target already exists
  When scaffold runs again with the same name
  Then it exits non-zero with a target-exists failure, and the probe cleans up

Scenario: invalid name fails
  Test: if bash scripts/scaffold.sh adr Bad_Name > /tmp/p43-bad.txt 2>&1; then exit 1; fi; grep -q "invalid name" /tmp/p43-bad.txt
  Given a name with uppercase and underscore
  When scaffold runs
  Then it exits non-zero with an invalid-name failure

Scenario: profile lint validates kind entries
  Test: bash scripts/profile-lint.sh .workflows/profile.json
  Given the profile with the adr kind after the change
  When profile-lint runs
  Then it exits 0 (template exists, target carries {{name}}) — and the lint contains the kind checks
