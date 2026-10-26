import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gather, renderReport, settleJudge, settleQuestions } from "../scripts/closeout.mjs";

const PLAN = `# Plan: fixture queue (061)

> Plan ID: 20261025-061

### TASK 1 (Tier B, 🟡): the task — src/a.ts
- **Status**: ✅ DONE
`;

const setup = (dir, queue) => {
  fs.writeFileSync(path.join(dir, "plan.md"), PLAN);
  if (queue !== undefined) fs.writeFileSync(path.join(dir, "queue.json"), JSON.stringify(queue));
};

const row = (option) => ({ option, what: `do ${option}`, effort: "S", risk: "low", unblocks: "next", recommend: "now" });

describe("closeout next moves (plan 20261025-029)", () => {
  test("closeout renders next moves table from queue.json", () => {
    const withQ = fs.mkdtempSync(path.join(os.tmpdir(), "q-"));
    setup(withQ, [row("C"), row("D")]);
    const g = gather({ plan: path.join(withQ, "plan.md"), journal: path.join(withQ, "j.jsonl"), proofs: path.join(withQ, "p.jsonl"), lessons: path.join(withQ, "l.jsonl"), queue: path.join(withQ, "queue.json") });
    const report = renderReport(g);
    expect(report).toContain("### Next moves");
    expect(report).toContain("| Option | What | Effort | Risk | Unblocks | Recommend |");
    expect(report).toContain("| C | do C | S | low | next | now |");
    expect(report).toContain("| D |");

    const noQ = fs.mkdtempSync(path.join(os.tmpdir(), "q-"));
    setup(noQ, undefined);
    const g2 = gather({ plan: path.join(noQ, "plan.md"), journal: path.join(noQ, "j.jsonl"), proofs: path.join(noQ, "p.jsonl"), lessons: path.join(noQ, "l.jsonl"), queue: path.join(noQ, "queue.json") });
    expect(renderReport(g2)).toContain("no queue file — next moves undecided");
  });

  test("settle judge checks the decision brief columns", async () => {
    expect(settleQuestions.map((q) => q.id)).toContain("decision_brief_present");
    const rows = settleQuestions.map((q) => ({ id: q.id, verdict: q.id === "decision_brief_present" ? "no" : "yes" }));
    const r = await settleJudge("report text", { ask: async () => ({ status: 0, verdict: rows }) });
    expect(r.status).toBe("findings");
    expect(r.findings.join("\n")).toContain("decision_brief_present");
  });
});
