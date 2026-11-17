---
description: "Restart — rebuild session state from the digest, then act on it"
---

Run the digest for the repo you are standing in — the digest it prints IS the
session state (plan position, verdicts, budget, gates, git). Do not rediscover
state by reading files around.

Which script to run — the digest always targets the current directory's repo,
never the repo the script lives in:

1. The repo's own `scripts/resume-digest.sh` when it exists — the normal case
   after `/init`: `bash scripts/resume-digest.sh`.
2. If the repo has no such script, the installed package copy: locate it via
   the pi-workflows skill path or `pi list`, then run it by absolute path from
   the repo you are in. A bare `bash scripts/resume-digest.sh` exits 127
   outside the pi-workflows repo itself.

Both forms take `--root <dir>` when you need to digest another repo.

Verify before acting: where the next action depends on a digest claim, confirm it against the repo — a stale digest misleads worse than none. A dirty git tree is reported to the owner, never stashed or cleaned up.

Then follow the plan lifecycle in `agents/execution-doctrine.md` — continue work via `/next`, close via `/review`.

Named `/restart`, not `/resume`: pi's built-in session picker owns `/resume` and
built-ins outrank package commands (gate: `tests/prompt-doctrine.test.ts`).
