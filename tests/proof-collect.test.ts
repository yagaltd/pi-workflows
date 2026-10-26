import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../scripts/proof-ledger.mjs";

describe("proof-collect (plan 20261025-025)", () => {
  test("collect unifies journal reviews and proofs into per-task evidence", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pcollect-"));
    const journal = path.join(dir, "journal.jsonl");
    const reviews = path.join(dir, "reviews");
    const ledger = path.join(dir, "proofs.jsonl");
    fs.mkdirSync(reviews);
    fs.writeFileSync(journal, [
      JSON.stringify({ ts: "t", planId: "p1", taskId: "task-1", event: "dispatched" }),
      JSON.stringify({ ts: "t", planId: "p1", taskId: "task-1", event: "done" }),
      JSON.stringify({ ts: "t", planId: "p1", taskId: "task-2", event: "dispatched" }),
    ].join("\n") + "\n");
    fs.writeFileSync(path.join(reviews, "task-1.md"), "## Round 1\n**ok: true**");
    fs.writeFileSync(ledger, JSON.stringify({ ts: "t", planId: "p1", taskId: "task-1", command: "true", exit: 0, outputHash: "x" }) + "\n");

    const out = path.join(dir, "evidence-p1.json");
    expect(await main(["collect", "--plan", "p1", "--journal", journal, "--reviews", reviews, "--ledger", ledger, "--out", out])).toBe(0);
    const e = JSON.parse(fs.readFileSync(out, "utf8"));
    expect(e.tasks["task-1"].journal).toEqual(["dispatched", "done"]);
    expect(e.tasks["task-1"].verdictOk).toBe(true);
    expect(e.tasks["task-1"].proofs).toBe(1);
    expect(e.tasks["task-2"].journal).toEqual(["dispatched"]);
    expect(e.tasks["task-2"].missingEvidence).toBe(true);
    expect(e.referencedTrails.judgeAudit).toBe(".workflows/judge-audit.jsonl");
  });

  test("collect flags tasks missing proofs or verdicts", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pcollect-"));
    const journal = path.join(dir, "journal.jsonl");
    const ledger = path.join(dir, "proofs.jsonl");
    fs.writeFileSync(journal, JSON.stringify({ ts: "t", planId: "p9", taskId: "task-7", event: "dispatched" }) + "\n");
    const out = path.join(dir, "evidence-p9.json");
    await main(["collect", "--plan", "p9", "--journal", journal, "--ledger", ledger, "--out", out]);
    const e = JSON.parse(fs.readFileSync(out, "utf8"));
    expect(e.tasks["task-7"].missingEvidence).toBe(true);
  });
});
