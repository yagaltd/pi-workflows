spec: task
name: "D5+D6 — pi-core-subagent 1.3.30 precedence-fix re-patch + issue draft"
tags:
  - pi-core-subagent
  - patch
  - precedence
  - write-guard
  - upstream-issue
max-rounds: 6
---

# Intent

Re-apply a **minimal, code-shape-adapted** version of the 1.3.28 precedence fix to the currently installed `@arhen/pi-core-subagent` **v1.3.30**, touching **only** `src/manager.ts` (with a `.orig` backup beside it), and produce the patch artifact + README at `.workflows/patches/pi-core-subagent-1.3.30/` plus a **non-submitted** upstream issue DRAFT. The patch covers exactly two fixes: (1) explicit `input.tools` (non-empty) beats agent-file tools; (2) a write-guard where `input.write: true` and the matched file's (intent-filtered) tools lack BOTH `edit` and `write` → the file's tools are ignored with a WARN and `WRITE_TOOLS` fallback applies. Upstream's narrowing intent is otherwise preserved: file tools still intersect with `allowedTools`, and the `canWrite` + worktree logic at manager.ts:662/668+ is left byte-for-byte untouched. The old 1.3.28 patch's D3 zero-tool WARN (the `task.toolCalls === 0` block) and the `agentfile.ts` MIN_MATCH_SCORE threshold (score already clamps) are deliberately NOT re-applied. Output is a unified diff + README + issue-draft.md; live execution of the patched code is out of scope (T5's proof).

## Decisions

### DECISION D5+D6 (verbatim)
> D5+D6: Minimal patch re-applied to installed pi-core-subagent 1.3.30, adapted to its new code shape — precedence fix only: (1) explicit `input.tools` (non-empty) wins over agent-file tools; (2) write-guard: when `input.write` is true and the matched file's (intent-filtered) tools lack BOTH `edit` and `write`, the file's tools are ignored with a WARN and WRITE_TOOLS applies. Upstream's narrowing-intent is otherwise preserved (file tools still intersect with the leader's intent; canWrite/worktree logic untouched). The old 1.3.28 patch's threshold (score() already clamps) and zero-tool WARN (worktree diffstat exposes empty results) are deliberately NOT re-applied. Discipline: .orig backups beside patched files; unified diff + README at .workflows/patches/pi-core-subagent-1.3.30/ (upstream URL, rationale, revert/apply commands); syntax-verified non-executionally. PLUS: upstream issue DRAFT (text artifact, NOT submitted): both un-fixed findings (explicit input.tools still narrowed by ambient file match; read-only agent file + write:true silently drops edit/write despite the trust-boundary intersection), the evidence chain (006 spike: two zero-tool fake-success grandchildren, session JSONLs cited; 008 re-fire: same scenario with precedence fix → 6/11/5 toolCalls), and the adapted patch as proposal. Saved as .workflows/patches/pi-core-subagent-1.3.30/issue-draft.md.

### Operational details (traceable)

- **Target package:** `~/.pi/agent/npm/node_modules/@arhen/pi-core-subagent`, confirmed v1.3.30. Prior 1.3.28 patch was wiped by an npm update — **no `.orig` exists**. Verify version before patching.
- **Current shape to adapt to** (manager.ts:656–659):
  ```ts
  const allowedTools = input.write ? WRITE_TOOLS : READONLY_TOOLS;   // line 656
  const fileTools = file?.tools?.filter((t) => allowedTools.includes(t));  // line 657
  const baseTools = fileTools?.length ? fileTools : (input.tools ?? allowedTools);  // line 658
  const tools = [...baseTools, ...(run.allowIntercom ? CHILD_TALK_TOOLS : [])];  // line 659
  ```
- **PATCH SCOPE = lines 656–658 (in the `resolveAgentFile`/tools block).** Line 659 (`tools` spread) is read-only context and must NOT be edited. `canWrite` (line 662) and the worktree block (line 668+) MUST remain byte-for-byte untouched.
- **Required behavior post-patch:**
  1. Explicit `input.tools` non-empty → win (no intersection, no file narrowing). 
  2. `input.write === true` AND matched file's intent-filtered tools (`fileTools`) lack BOTH `edit` AND `write` → ignore the fileTools, emit a WARN naming the file toolset + reason + WRITE_TOOLS fallback, then `WRITE_TOOLS` applies.
  3. Otherwise (file tools present and write-capable, or read-task, or no file match): file tools still intersect with `allowedTools` (upstream narrowing preserved), fallback remains `(input.tools ?? allowedTools)`.
  - The 1.3.28 patch committed to the 1.3.28 shape set `baseTools = input.tools` with a `fileCanWrite` probe; the 1.3.30 patch must express the SAME two rules but operate on the post-intersect `fileTools` array (already filtered by `allowedTools`) and the intersected fallback pipeline.
- **NOT re-applied (deliberate exclusions):**
  - 1.3.26 threshold: `agentfile.ts` is NOT patched this time — `score()` already clamps; `MIN_MATCH_SCORE` and the `bestScore >= MIN_MATCH_SCORE` guard stay out.
  - 1.3.28 zero-tool WARN: the `finalText` 'WARN: zero tool calls' block (`task.toolCalls === 0`, `writeCapable`) is NOT re-applied — worktree diffstat already exposes empty results.
- **Discipline:**
  - `.orig` backup: `cp src/manager.ts src/manager.ts.orig` (only for the file actually patched).
  - Artifacts dir: `.workflows/patches/pi-core-subagent-1.3.30/` with:
    - `pi-core-subagent-1.3.30.patch` (unified diff, `git diff`-style / `patch -p1`-compatible; MUST contain ONLY the manager.ts change, no agentfile.ts, no zero-tool block).
    - `README.md` (upstream URL, root-cause rationale, revert file, apply file, and note of what's NOT re-applied).
    - `issue-draft.md` (NOT submitted): both un-fixed findings, the evidence chain, and the adapted patch as proposal.
  - Syntax verification is NON-command-patch `bun build <file>` (see Completion Criteria). No execution of patched code.
- **Upstream URL (README + issue):** https://github.com/arhen/pi-extensions (pkg dir `packages/core/pi-core-subagent`).
- **Evidence chain to cite in issue-draft.md:**
  - Finding 1 — explicit `input.tools` still narrowed by file match (upstream bug A).
  - Finding 2 — read-only agent file + `write:true` silently drops `edit`/`write` despite trust-boundary intersection (upstream bug B).
  - 761_3 spike: two zero-tool fake-success groomed grandchildren, session JSONLs cited.
  - 755_8 re-fire: same scenario with precedence fix → 6/11/7 toolCalls (report signatures).
- **Ambient hazard (awareness, not a task):** `~/.pi/agent/agents/morphmap/*` (6 files) still match dispatch names by description token.

## Boundaries

- **Allowed (edits + artifacts):**
  - `~/.pi/agent/npm/node_modules/@arhen/pi-core-subagent/src/manager.ts` (the ONLY package source file patched) + its `.orig` backup beside it.
  - `/home/aurel/Documents/github/pi-workflows/.workflows/patches/pi-core-subagent-1.3.30/**` (new): `pi-core-subagent-1.3.30.patch`, `README.md`, `issue-draft.md`.
  - `/home/aurel/Documents/github/pi-workflows/.workflows/specs/task-patch-130.spec` (this contract file) for the README/issue reference.
- **Fun_forbidden:**
  - Every other package file (CRITICALLY `.../src/agentfile.ts` is NOT patched this time — the 1.3.26 threshold is dropped).
  - pi-workflows repo files outside `.workflows/patches/` and `.workflows/specs/`.
  - Execution/running of the patched `src/manager.ts` at all (live proof is T5's task; only `bun build` syntax-check without running the codepath).
  - Shipping/submitting the issue draft (text artifact only, "NOT submitted").
  - Creating a second `.spec` in `.workflows/specs/`.

## Completion Criteria

### Scenario 1 — precedence fix + write-guard (patched manager.ts)
**Test:** `fileTools` is the intent-filtered array from line 657 (`file?.tools?.filter((t) => allowedTools.includes(t))`). With explicit non-empty `input.tools`, and independently with `input.write === true` and a file whose `fileTools` lacks both `edit` and `write`, the resulting `baseTools`/`tools` must win accordingly (see Decisions → Operational details).
1. **then** an explicit non-empty `input.tools` wins over file tools.
2. **then** `input.write === true` + fileTools lacking both `edit` and `write` ignores them, emits a WARN (mentioning the file toolset, the missing write capability, and WRITE_TOOLS), and applies `WRITE_TOOLS`.
3. **then** file narrowing to `allowedTools` is preserved in all other branches (upstream intent kept).
4. **then** `canWrite` (line 662) and the worktree block (line 668+) are byte-for-byte unchanged from upstream 1.3.30.
5. **then** the zero-tool WARN block and `agentfile.ts` threshold are absent (NOT re-applied).

### Scenario 2 — artifacts + regression-avoidance
Scenario: artifact layout and verification.
6. **then** `~/.pi/agent/npm/node_modules/@arhen/pi-core-subagent/src/manager.ts.orig` exists (pristine pre-patch copy).
7. **then** `.workflows/patches/pi-core-subagent-1.3.30/` contains exactly `pi-core-subagent-1.3.30.patch`, `README.md`, `issue-draft.md`.
8. **then** the `.patch` is a unified diff touching only `src/manager.ts` (no agentfile.ts, no zero-tool block).
9. **then** the patched manager.ts passes a non-executional syntax check via bun build (see Verification for the proven command).

### Scenario 3 — README + upstream issue draft
Scenario: documentation completeness.
10. **then** `README.md` contains the upstream URL (https://github.com/arhen/pi-extensions, dir `packages/core/pi-core-subagent`), a concise rationale, revert commands, and apply commands.
11. **then** `issue-draft.md` documents BOTH un-fixed findings (input.tools narrowing; read-only file + write:true silently dropping edit/write across the trust boundary).
12. **then** `issue-draft.md` cites the 006 evidence chain (two zero-tool groomed false-succ rings, session JSONLs) and the 008 re-fire (6/11/7 toolCalls) in the file.
13. **then** `issue-draft.md` presents the adapted patch as a proposal (it is a text artifact, NOT submitted).

### Verification (post-edit, re-run)
- `git diff --stat` on the repo images ONLY `.workflows/` touch — the patch file itself is added under `.workflows/patches/pi-core-subagent-1.3.30/`; no production code inside the repo.
- Filesystem assertions:
  - `test -f .workflows/patches/pi-core-subagent-1.3.30/pi-core-subagent-1.3.30.patch`
  - `test -f .workflows/patches/pi-core-subagent-1.3.30/README.md`
  - `test -f .workflows/patches/pi-core-subagent-1.3.30/issue-draft.md`
  - `test -f ~/.pi/agent/npm/node_modules/@arhen/pi-core-subagent/src/manager.ts.orig`
  - assert the patch text contains `baseTools`, `input.tools`, `WRITE_TOOLS`, the WARN string, and does NOT contain the 1.3.28 zero-tool `'zero tool calls'` marker.
- Syntax check (the proven non-executional command): mirror the package tree to `/tmp`, symlink `@earendil-works` peers from `~/.npm-global`, then `bun build <file> --target=node`. Run and record this exact command + exit output as the pass proof. Do NOT execute the manager codepath.
- Grep for the two excluded blocks singles their ABSENCE:
  - no `MIN_MATCH_SCORE` in `agentfile.ts` implies no patch to that file (the file is closed/untouched).
  - no `zero tool calls` substring in the patched `manager.ts` (or in any diff line).
- Re-run any/all completion grep assertions after the final edit (post-edit re-greps), since the last tool use edited the patch or README.
- README (and issue-draft.md) contain the string `https://github.com/arhen/pi-extensions` — grep-assert it, since the upstream link must be verbatim for apply/revert traceability.
- The `.patch` unified diff must be intentionally releasable (upstream-format, `patch -p1`-applicable) — verify header `--- a/src/manager.ts` / `+++ b/src/manager.ts` and hunks reference the 1.3.30 base (line numbers 658-follow for the context lines, content-oriented).

## Report
- **Completed:** Y / N (+task number).
- **File:** path of the produced `.spec` / patch / README / issue-draft.
- **Verification:** the `bun build` command + exit code, git-diff-minus-spec stat, and the post-edit greps that pass.
- **Ambiguities:** none that blocked; any 1.3.28→1.3.30 line/offset drift I resolved by reading the actual current source (`manager.ts:330,656–659` verified above).
- **Notes:** .orig created from the verified 1.3.30 snapshot; patch written to the 1.3.30 BASE (not the 1.3.28 junkyard); the npm update had cleared the prior `.orig`, so the new `.orig` captures the pristine 1.3.30 state.