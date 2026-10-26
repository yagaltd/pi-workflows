import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../scripts/lessons.mjs";

const bundle = (dir) => {
  const planFile = path.join(dir, "plan.md");
  const reviews = path.join(dir, "reviews");
  const proofs = path.join(dir, "proofs.jsonl");
  fs.mkdirSync(reviews);
  fs.writeFileSync(planFile, `# Plan: fixture (091)

## Tasks

### TASK 1 (Tier B, 🟡): the good task — src/a.ts
- **Status**: ✅ DONE
- **Wave**: 1

### TASK 2 (Tier A, ⚪): the failed task — src/b.ts
- **Status**: ❌ FAILED
- **Wave**: 2

### TASK 3 (Tier A, ⚪): the unverified task — src/c.ts
- **Status**: ✅ DONE
- **Wave**: 3
`);
  fs.writeFileSync(path.join(reviews, "task-1.md"), "## Round 1\n**ok: true**");
  fs.writeFileSync(path.join(reviews, "task-2.md"), "## Round 1\n**ok: false** — fix rounds exhausted");
  fs.writeFileSync(proofs, [
    JSON.stringify({ ts: "t", planId: "p-091", taskId: "task-1", command: "bun test", exit: 0, outputHash: "h1" }),
    JSON.stringify({ ts: "t", planId: "p-091", taskId: "task-3", command: "bun test", exit: 0, outputHash: "h3" }),
  ].join("\n") + "\n");
  return { planFile, reviews, proofs };
};

const run = (argv) => main(argv);

describe("lessons (plan 20261025-026)", () => {
  test("distill turns archived verdicts and proofs into provenance-flagged lessons", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lessons-"));
    const { planFile, reviews, proofs } = bundle(dir);
    const ledger = path.join(dir, "lessons.jsonl");
    expect(await run(["distill", "--plan-file", planFile, "--reviews-dir", reviews, "--plan-id", "p-091", "--proofs", proofs, "--ledger", ledger])).toBe(0);
    const rows = fs.readFileSync(ledger, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(rows).toHaveLength(3);
    const byTask = Object.fromEntries(rows.map((r) => [r.taskId, r]));
    expect(byTask["task-1"].status).toBe("valid");
    expect(byTask["task-1"].provenance).toBe("verified");
    expect(byTask["task-2"].status).toBe("failed");
    expect(byTask["task-2"].provenance).toBe("from_untrusted");
    expect(byTask["task-3"].provenance).toBe("verified");
    // idempotent per (planId, taskId)
    expect(await run(["distill", "--plan-file", planFile, "--reviews-dir", reviews, "--plan-id", "p-091", "--proofs", proofs, "--ledger", ledger])).toBe(1);
    expect(fs.readFileSync(ledger, "utf8").trim().split("\n")).toHaveLength(3);
  });

  test("status transitions require a recorded reason and keep history", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lessons-"));
    const { planFile, reviews, proofs } = bundle(dir);
    const ledger = path.join(dir, "lessons.jsonl");
    await run(["distill", "--plan-file", planFile, "--reviews-dir", reviews, "--plan-id", "p-091", "--proofs", proofs, "--ledger", ledger]);
    expect(await run(["set", "--id", "les-p-091-task-1", "--to", "superseded", "--ledger", ledger])).toBe(2); // no reason — refused
    expect(await run(["set", "--id", "les-p-091-task-1", "--to", "superseded", "--reason", "superseded by plan 092", "--ledger", ledger])).toBe(0);
    const rows = fs.readFileSync(ledger, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(rows).toHaveLength(4); // original lesson kept + transition appended
    expect(rows[3].type).toBe("transition");
    expect(rows[3].reason).toContain("092");
  });

  test("lessons list and query filter by status tag and text", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lessons-"));
    const { planFile, reviews, proofs } = bundle(dir);
    const ledger = path.join(dir, "lessons.jsonl");
    await run(["distill", "--plan-file", planFile, "--reviews-dir", reviews, "--plan-id", "p-091", "--proofs", proofs, "--ledger", ledger]);
    const grab = async (argv) => {
      const out = [];
      const orig = console.log;
      console.log = (...a) => out.push(a.join(" "));
      await run(["list", ...argv, "--ledger", ledger]);
      console.log = orig;
      return out;
    };
    expect((await grab(["--status", "failed"])).join("\n")).toContain("task-2");
    expect((await grab(["--status", "valid"])).join("\n")).toContain("task-1");
    expect((await grab(["--text", "failed task"])).join("\n")).toContain("task-2");
    expect((await grab(["--tag", "verified"])).join("\n")).not.toContain("task-2");
  });
});
