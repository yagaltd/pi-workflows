// Live-state gating for fresh worktrees (plan 20261031-047).
//
// `.workflows/*` live state (plan.md, queue.json, decisions/, flows/, evals/) is
// gitignored: a fresh worktree lacks it while the gating checkout has it. Tests that
// READ live state route through requireLiveState(<paths>, <what it would check>):
// when the state is absent the helper warns the pinned reason `SKIPPED (state
// absent): <what>` and the suite skips the test via `test.skipIf(!live)` — never a
// red failure, never a silent pass. The <what> documents exactly what the test
// asserts on a lived-in repo; no assertion is deleted or weakened. On the gating
// checkout (state present) requireLiveState returns true and nothing skips.
import fs from "node:fs";

export const requireLiveState = (paths: string | string[], what: string): boolean => {
  const list = Array.isArray(paths) ? paths : [paths];
  if (list.every((p) => fs.existsSync(p))) return true;
  console.warn(`SKIPPED (state absent): ${what}`);
  return false;
};
