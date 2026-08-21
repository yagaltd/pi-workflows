# Bug Hunter scan report — branch diff master..HEAD (pi-workflows)

Scan-only, single-pass, local-sequential. 30 diff files read (all); runtime code
(`extensions/index.ts`, `tests/extension.test.ts`, `scripts/check-drift.sh`) deep-read
with live verification (bun test: 25/25 pass; live regex checks against the real
`.workflows/plan.md`; controlled check-drift.sh repro; pi extensions API contract
verified against the installed pi docs).

**Counts: confirmed 5 · dismissed 7 · manualReview 2 · unreviewed 0**

## Confirmed

| ID | Sev | File | Finding (first evidence line) |
|---|---|---|---|
| BH-001 | Medium | scripts/check-drift.sh:47-51 | New `@role:` check runs `err()` inside a piped `while read` subshell — `FAIL=1` lost; repro: `@role:ghostrole` missing → "DRIFT: @role:ghostrole referenced but agents/ghostrole.md missing" yet **exit 0 + "CLEAN — no drift."** (same flaw in the new 3b references loop). |
| BH-002 | Low | extensions/index.ts:31-39 | `roleBody` only strips a *leading* HTML comment, but real role files put the dispatch note *after* the `# Role:` line — live run: `roleBody(agents/worker.md)` starts with `<!-- Verbatim subagent system prompt — pasted into prompt: by the orchestrator` → orchestrator meta-note leaks into every `@role:` subagent prompt. |
| BH-003 | Medium | prompts/next.md:141,174,204,290 | Contradicts the normative docs: next.md's four dispatch templates still say `prompt: "<verbatim body of agents/worker.md>"` while `agents/dispatch-shapes.md` / `execution-doctrine.md` ("Normative — follow exactly") and `registry.md` mandate `prompt: "@role:worker"` — next.md never references `@role:` or dispatch-shapes.md. |
| BH-004 | Low | skills/docs-check/SKILL.md:32-35 | Duplicate step numbering after the README-freshness insert: steps run 1,2,3,4,**4**,5,6. |
| BH-005 | Low | CHANGELOG.md:12 | Claims "Pure logic unit-tested (13 tests, `bun test`)" — the shipped suite runs **25 tests** (bun test: 25 pass). |

## Manual review

| ID | File | Open question |
|---|---|---|
| BH-006 | extensions/index.ts:115-124 | `missingFinalVerdicts` counts review *files* with `**ok: true**` vs done *tasks* — stale ok:true files from an abandoned (non-archived) plan can mask real drift. Reminder-grade by design; tighten to per-task-id matching? |
| BH-007 | extensions/index.ts:150-160,262-279 | `changelogPending` never reads CHANGELOG.md (stale reminder can re-fire on any boolean flip), and header comment/CHANGELOG promise "once per new gap count" while the dedupe key is boolean-episode — which contract is intended? |

## Dismissed (7)

- execSync injection in `computeDocsDrift` — only git-produced hashes + fixed `HEAD` are interpolated; role names regex-constrained (`[a-z][a-z0-9-]*`).
- tool_call mutation/block semantics — matches the documented pi API (mutable `event.input`, `{block:true, reason}`); partial mutation before a block is inert.
- `before_agent_start` return shape — matches the documented message-injection API; `event?.cwd` falls back safely to `process.cwd()`.
- plan.md regexes vs real format — live-verified: done=4, total=4, markers=4, drift `{0,0}`; prose ✅ does not inflate counts.
- `isDocsExempt` over-exemption — documented coarse reminder-grade filter.
- `__dirname/../agents` when installed — `agents/` is a shipped package asset by design.
- single-mode vs `tasks[]` identity handling in `resolveSubagentInput` — duplicate-string case converges (each field gets its own iteration).

Canonical artifacts: `.bug-hunter/{hunter-findings,skeptic,referee,scan-report}.json` (schema-validated).
Coverage: all 30 diff files read this pass; no unreviewed findings; no required-verification failures.
