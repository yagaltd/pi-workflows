---
description: "Resume — rebuild session state, then act on it"
---

Run `bash scripts/resume-digest.sh` — the digest it prints IS the session state (plan position, verdicts, budget, gates, git). Do not rediscover state by reading files around.

Verify before acting: where the next action depends on a digest claim, confirm it against the repo — a stale digest misleads worse than none. A dirty git tree is reported to the owner, never stashed or cleaned up.

Then follow the plan lifecycle in `agents/execution-doctrine.md` — continue work via `/next`, close via `/review`.
