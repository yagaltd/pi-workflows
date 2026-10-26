import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gather, main, mermaid, renderReport, settleJudge, settleQuestions } from "../scripts/closeout.mjs";

const PLAN = `# Plan: fixture closeout (055)

> Plan ID: 20261025-055
> Status: APPROVED

## Tasks

### TASK 1 (Tier B, 🟡): the shipped task — src/a.ts
- **Status**: ✅ DONE
- **Wave**: 1

### TASK 2 (Tier A, ⚪): the failed task — src/b.ts
- **Status**: ❌ FAILED
- **Wave**: 2

## Execution Notes

- TASK 1 ✅ context: no changes
- DEVIATION: paths moved from src/ to scripts/ — because repo layout differs — implication: spec Allowed sets re-anchored
- DISCOVERY: spec Test lines bind to bun test names
- DEFERRED: hook wiring — because routing not trusted — implication: guard stays manual
`;

const setup = (dir) => {
  fs.writeFileSync(path.join(dir, "plan.md"), PLAN);
  fs.writeFileSync(path.join(dir, "journal.jsonl"), [
    JSON.stringify({ ts: "t", planId: "20261025-055", taskId: "task-1", event: "dispatched" }),
    JSON.stringify({ ts: "t", planId: "20261025-055", taskId: "task-1", event: "done" }),
    JSON.stringify({ ts: "t", planId: "20261025-055", taskId: "task-2", event: "dispatched" }),
  ].join("\n") + "\n");
  fs.writeFileSync(path.join(dir, "proofs.jsonl"), JSON.stringify({ ts: "t", planId: "20261025-055", taskId: "task-1", command: "bun test", exit: 0, outputHash: "h" }) + "\n");
  fs.writeFileSync(path.join(dir, "lessons.jsonl"), JSON.stringify({ type: "lesson", id: "l1", planId: "p", taskId: "t", lesson: "x", status: "valid", provenance: "from_untrusted" }) + "\n");
};

describe("closeout (plan 20261025-028)", () => {
  test("closeout gathers shipped tasks deviations and discoveries into the fixed sections", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "co-"));
    setup(dir);
    const g = gather({
      plan: path.join(dir, "plan.md"),
      journal: path.join(dir, "journal.jsonl"),
      proofs: path.join(dir, "proofs.jsonl"),
      lessons: path.join(dir, "lessons.jsonl"),
      golden: 11,
    });
    expect(g.planId).toBe("20261025-055");
    expect(g.shipped.map((t) => t.id)).toEqual(["task-1"]);
    expect(g.deviations[0]).toContain("implication: spec Allowed sets re-anchored");
    expect(g.discoveries[0]).toContain("bun test names");
    expect(g.deferred[0]).toContain("hook wiring");
    expect(g.watch.openDispatches).toEqual(["task-2"]);
    expect(g.watch.proofsRecorded).toBe(1);
    expect(g.watch.lessonsUntrusted).toBe(1);

    const report = renderReport(g);
    for (const s of ["### Shipped", "### Deviations", "### Discoveries", "### Deferred", "### Watch"]) {
      expect(report).toContain(s);
    }
  });

  test("closeout diagram renders plan versus actual with deviation markers", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "co-"));
    setup(dir);
    const g = gather({
      plan: path.join(dir, "plan.md"),
      journal: path.join(dir, "journal.jsonl"),
      proofs: path.join(dir, "proofs.jsonl"),
      lessons: path.join(dir, "lessons.jsonl"),
      golden: 11,
    });
    const m = mermaid(g);
    expect(m).toContain("```mermaid");
    expect(m).toContain('task-1["task-1 done"]');
    expect(m).toContain('task-2["task-2 failed"]');
    expect(m).toContain("classDef done");
  });

  test("settle judge flags missing implications and skipped judges loudly", async () => {
    const no = async () => ({ status: 0, verdict: [{ id: "deviations_complete", verdict: "no" }, { id: "implications_stated", verdict: "no" }, { id: "deferrals_named", verdict: "yes" }, { id: "watch_present", verdict: "yes" }] });
    const r1 = await settleJudge("report text", { ask: no });
    expect(r1.status).toBe("findings");
    expect(r1.findings.join("\n")).toContain("deviations_complete");

    const skip = await settleJudge("report text", { ask: async () => ({ status: 0, skipped: true }) });
    expect(skip.status).toBe("skipped");
    expect(skip.reason).toContain("NO-JUDGE");

    const yes = async () => ({ status: 0, verdict: settleQuestions.map((q) => ({ id: q.id, verdict: "yes" })) });
    const r3 = await settleJudge("report text", { ask: yes });
    expect(r3.status).toBe("pass");
  });

  test("main report subcommand emits all section headers on the live repo state", async () => {
    const out = [];
    const orig = console.log;
    console.log = (...a) => out.push(a.join(" "));
    const code = await main(["report", "--plan", ".workflows/plan.md"]);
    console.log = orig;
    expect(code).toBe(0);
    const text = out.join("\n");
    for (const s of ["### Shipped", "### Deviations", "### Discoveries", "### Deferred", "### Watch"]) {
      expect(text).toContain(s);
    }
  });
});
