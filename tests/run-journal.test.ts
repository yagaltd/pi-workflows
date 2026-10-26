import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkBudget, main, resumeState, spent } from "../scripts/run-journal.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "rj-"));
const entry = (planId, taskId, event, cost) => ({ ts: "t", planId, ...(taskId ? { taskId } : {}), event, ...(cost !== undefined ? { cost } : {}) });

describe("run-journal (plan 20261025-024)", () => {
  test("journal appends and resumes a run from recorded task states", async () => {
    const dir = tmp();
    const j = path.join(dir, "journal.jsonl");
    expect(await main(["record", "--plan", "p1", "--task", "task-1", "--event", "dispatched", "--journal", j])).toBe(0);
    expect(await main(["record", "--plan", "p1", "--task", "task-1", "--event", "done", "--journal", j])).toBe(0);
    expect(await main(["record", "--plan", "p1", "--task", "task-2", "--event", "dispatched", "--journal", j])).toBe(0);
    expect(await main(["record", "--plan", "p1", "--event", "blocked", "--note", "stale", "--journal", j])).toBe(0);

    const resumeOut = [];
    const origLog = console.log;
    console.log = (...a) => resumeOut.push(a.join(" "));
    const code = await main(["resume", "--plan", "p1", "--journal", j]);
    console.log = origLog;
    expect(code).toBe(0);
    const s = JSON.parse(resumeOut.join("\n"));
    expect(s.done).toEqual(["task-1"]);
    expect(s.openDispatches).toEqual(["task-2"]);
    expect(s.spent.tasks).toBe(2);
    expect(s.budgetLeft).toBeNull();
  });

  test("budget exhaustion stops the run with a loud budget record", () => {
    const dir = tmp();
    const b = path.join(dir, "budget.json");
    fs.writeFileSync(b, JSON.stringify({ max_tasks: 2 }));
    const entries = [entry("p1", "task-1", "dispatched"), entry("p1", "task-1", "done"), entry("p1", "task-2", "dispatched")];
    const c = checkBudget(entries, { max_tasks: 2 });
    expect(c.ok).toBe(false);
    expect(c.reason).toContain("max_tasks");
    // budget-exhausted is recorded data, not an exception
    const withRecord = [...entries, entry("p1", null, "budget-exhausted")];
    expect(spent(withRecord).tasks).toBe(2);
  });

  test("cost budget sums recorded spend and blocks over the cap", () => {
    const entries = [entry("p1", "task-1", "dispatched", 0.4), entry("p1", "task-1", "done", 0.35), entry("p1", "task-2", "dispatched", 0.3)];
    expect(spent(entries).cost).toBe(1.05);
    expect(checkBudget(entries, { max_cost_usd: 1 }).ok).toBe(false);
    expect(checkBudget(entries, { max_cost_usd: 1.1 }).ok).toBe(true);
    expect(checkBudget(entries, null).ok).toBe(true); // no budget file ⇒ no ceiling
  });

  test("check CLI exits 1 on exhaustion and records budget-exhausted", async () => {
    const dir = tmp();
    const j = path.join(dir, "journal.jsonl");
    const b = path.join(dir, "budget.json");
    fs.writeFileSync(b, JSON.stringify({ max_tasks: 1 }));
    expect(await main(["record", "--plan", "p1", "--task", "task-1", "--event", "dispatched", "--journal", j, "--budget", b])).toBe(0);
    const code = await main(["check", "--plan", "p1", "--journal", j, "--budget", b]);
    expect(code).toBe(1);
    expect(readJournalLines(j).some((e) => e.event === "budget-exhausted")).toBe(true);
  });
});

function readJournalLines(file) {
  return fs.readFileSync(file, "utf8").trim().split("\n").map((l) => JSON.parse(l));
}
