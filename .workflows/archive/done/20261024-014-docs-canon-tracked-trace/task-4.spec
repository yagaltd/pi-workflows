spec: task
name: "contract-format-front-matter"
tags: []
---

## Intent

Fix `templates/CONTRACT-FORMAT.md`: the documented contract template lacks the agent-spec front-matter block (`spec: task` / `name:` / `tags: []` terminated by `---`), which was the root cause of three round-1 contract defects in plan 20260924-013 — every contract drafted from the template failed `agent-spec parse` with "missing front-matter separator '---'". The template must carry the exact block and state the requirement.

## Decisions

- The template's example contract opens with the front-matter block — keys first, `---` terminator second, no leading separator.
- A warning line states the failure signature verbatim so drafters recognize it: `error: invalid front-matter: missing front-matter separator '---'`.
- No H1 title inside a contract — the front matter `name:` key is the identity.

## Boundaries

### Allowed Changes
- templates/CONTRACT-FORMAT.md

### Forbidden
- Do not change any other template or doc.
- Do not alter the selector-syntax sections.

## Completion Criteria

Scenario: template carries the exact front-matter block
  Test: grep -q "^spec: task" templates/CONTRACT-FORMAT.md && grep -q '^---$' templates/CONTRACT-FORMAT.md
  Given templates/CONTRACT-FORMAT.md after the change
  When its template block is inspected
  Then it opens with spec: task / name: / tags: keys terminated by a --- line
  And the block appears before the Intent section

Scenario: failure signature documented
  Test: grep -q "missing front-matter separator" templates/CONTRACT-FORMAT.md
  Given templates/CONTRACT-FORMAT.md after the change
  When the warning text is inspected
  Then the verbatim parse-error signature is present
