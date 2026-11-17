# Review — task-1 (plan 065)

## Round 1 — 20261117 · reviewer

- Verdict: **ok: true**
- Bug reproduced independently: a temp git repo with a conspicuous plan id, the worktree's
  script invoked by absolute path with that repo as cwd → the plan id is reported and the
  pi-workflows checkout is never mentioned. Base script on the same input printed
  "note: no live plan".
- Non-git cwd → FAIL + non-zero exit, no repo state printed. `--root <dir>` honoured.
- Section invariants: base and branch scripts staged into the same temp repo → `diff` IDENTICAL,
  7 headers unchanged; the script diff is the resolution block only.
- `prompts/restart.md`: repo-local script first, installed package copy second, "the digest
  always targets the current directory's repo".
- Gates: bun test green, drift CLEAN, gen-docs --check 0, docs-lint CLEAN with no baseline write
  (markdownlint 1010 vs 1011, harper 1116 vs 1121 — the ratchet held and the prose was rewrapped).
- Note: the spec's "no live plan after 064" line is stale because this plan is live; the
  unchanged-behaviour case is asserted against a temp checkout shape (a real one would recurse
  through the profile's `bun test`).
