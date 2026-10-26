import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { classify, main, planTasks } from "../scripts/intent-guard.mjs";

const PLAN = `# Plan: fixture (001)

## Tasks

### TASK 1 (Tier B, 🟡): flows runner — scripts/
- **Status**: ⬜ PENDING
- **Wave**: 1

### TASK 2 (Tier A, ⚪): docs pass — README.md
- **Status**: ⬜ PENDING
- **Wave**: 2
`;

const stubAsk = (kind, confidence) => async () => (
  kind === null ? { status: 0, skipped: true } : { status: 0, verdict: [{ id: "kind", verdict: kind }, { id: "confidence", verdict: confidence }] }
);

describe("intent-guard (plan 20261025-023)", () => {
  test("intent-guard classifies queries against the live plan", async () => {
    expect(planTasks(PLAN).map((t) => t.id)).toEqual(["task-1", "task-2"]);
    const c = await classify({ query: "finish the flows runner", planText: PLAN, threshold: 0.85, ask: stubAsk("current_spec", 0.92) });
    expect(c.route).toBe("proceed");
    const low = await classify({ query: "hmm the runner", planText: PLAN, threshold: 0.85, ask: stubAsk("current_spec", 0.6) });
    expect(low.route).toBe("ask");
  });

  test("intent-guard skips loudly without a judge key", async () => {
    const c = await classify({ query: "anything", planText: PLAN, threshold: 0.85, ask: stubAsk(null, 0) });
    expect(c.route).toBe("ask-human");
    expect(c.skipped).toBe(true);
    expect(c.reason).toContain("judge unavailable");
  });

  test("intent-guard routes amend-needed and unrelated without dispatch", async () => {
    expect((await classify({ query: "change the requirement", planText: PLAN, threshold: 0.85, ask: stubAsk("amend_needed", 0.9) })).route).toBe("amend");
    expect((await classify({ query: "what is the return policy", planText: PLAN, threshold: 0.85, ask: stubAsk("unrelated", 0.95) })).route).toBe("answer");
  });

  test("main appends the trail and always exits 0 (fail-open)", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "iguard-"));
    const plan = path.join(tmp, "plan.md");
    const trail = path.join(tmp, "trail.jsonl");
    fs.writeFileSync(plan, PLAN);
    const code = await main(["--query", "q", "--plan", plan, "--threshold", "0.85", "--trail", trail], { ask: stubAsk("clarification", 0.4) });
    expect(code).toBe(0);
    const rows = fs.readFileSync(trail, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(rows).toHaveLength(1);
    expect(rows[0].route).toBe("ask");
    expect(rows[0].threshold).toBe(0.85);
  });
});
