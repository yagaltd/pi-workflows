import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../scripts/flow-run.mjs";
import { main as proofMain } from "../scripts/proof-ledger.mjs";

const flow = {
  slug: "test-flow",
  title: "Two-wave test flow",
  steps: [
    { id: "b-task", kind: "task", title: "Tier B second", tier: "B", wave: 1, depends_on: [], tdd: false, allowed: ["src/b.ts"], verify: "bun test", model: "standard", thinking: "medium", role: "worker" },
    { id: "a-task", kind: "task", title: "Tier A first", tier: "A", wave: 1, depends_on: [], tdd: false, allowed: ["src/a.ts"], verify: "bun test", model: "standard", thinking: "medium", role: "worker" },
    { id: "review-gate", kind: "gate", gate: "review", wave: 2, depends_on: ["a-task", "b-task"] },
    { id: "t-state", kind: "transform", set: { channel: "flows" }, wave: 2, depends_on: ["a-task"] },
  ],
};

const writeFlow = (dir, f) => { const p = path.join(dir, "flow.json"); fs.writeFileSync(p, JSON.stringify(f)); return p; };

describe("flow-run (plan 20261025-022)", () => {
  test("flow-run compiles a flow onto resolveNext wave order", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "flowrun-"));
    const file = writeFlow(tmp, flow);
    const code = await main([file, "--dry-run", "--runs-dir", path.join(tmp, "runs")]);
    expect(code).toBe(0);
    // tier-then-id order inside the wave: a-task (Tier A) packs before b-task (Tier B)
    const steps = JSON.parse(fs.readFileSync(path.join(tmp, "runs", "report.json"), "utf8")).steps
      .filter((s) => s.kind === "task");
    expect(steps.map((s) => s.id)).toEqual(["a-task", "b-task"]);
  });

  test("flow-run emits dispatch packs and a run report", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "flowrun-"));
    const file = writeFlow(tmp, flow);
    const runs = path.join(tmp, "runs");
    const code = await main([file, "--dry-run", "--runs-dir", runs]);
    expect(code).toBe(0);
    const pack = fs.readFileSync(path.join(runs, "pack-a-task.txt"), "utf8");
    expect(pack).toContain("TASK 1:");
    expect(pack).toContain("Verify: bun test");
    const report = JSON.parse(fs.readFileSync(path.join(runs, "report.json"), "utf8"));
    expect(report.state).toEqual({ channel: "flows" });
    expect(report.gates[0].status).toBe("dry-run");
    expect(report.gates[0].commands.length).toBe(2);
  });

  test("invalid flows never dispatch", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "flowrun-"));
    const cyclic = { ...flow, slug: "cyclic", steps: [task("a", 1, ["b"]), task("b", 1, ["a"])] };
    const file = writeFlow(tmp, cyclic);
    const runs = path.join(tmp, "runs");
    const code = await main([file, "--runs-dir", runs]);
    expect(code).toBe(1);
    expect(fs.existsSync(path.join(runs, "pack-a.txt"))).toBe(false);
  });

  test("evidence gate is reachable via a flow step — runs with taskId against flow planId (plan 20261031-048 BUG-1)", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "flowrun-ev-"));
    const repoCwd = process.cwd();
    process.chdir(tmp);
    try {
      fs.mkdirSync(path.join(tmp, ".workflows", "proofs"), { recursive: true });
      const ledger = path.join(tmp, ".workflows", "proofs", "proofs.jsonl");
      // an independent reviewer-run proof under the flow's plan id (flow-<slug>)
      expect(await proofMain(["record", "--plan", "flow-ev-flow", "--task", "t1", "--verify", "echo independent", "--runner", "reviewer", "--ledger", ledger])).toBe(0);
      const evFlow = { slug: "ev-flow", title: "Evidence flow", steps: [
        task("t1", 1),
        { id: "ev", kind: "gate", gate: "evidence", wave: 2, depends_on: ["t1"], taskId: "t1" },
      ] };
      const file = writeFlow(tmp, evFlow);
      const code = await main([file, "--runs-dir", path.join(tmp, "runs")]);
      expect(code).toBe(0);
      const report = JSON.parse(fs.readFileSync(path.join(tmp, "runs", "report.json"), "utf8"));
      expect(report.gates).toEqual([{ id: "ev", gate: "evidence", status: "pass", reason: null }]);
      // fail-closed: an evidence step WITHOUT taskId runs loud, not silent
      const noTask = { ...evFlow, slug: "ev-notask", steps: [task("t1", 1), { id: "ev", kind: "gate", gate: "evidence", wave: 2, depends_on: ["t1"] }] };
      const file2 = writeFlow(tmp, noTask);
      const code2 = await main([file2, "--runs-dir", path.join(tmp, "runs2")]);
      expect(code2).toBe(1);
      const report2 = JSON.parse(fs.readFileSync(path.join(tmp, "runs2", "report.json"), "utf8"));
      expect(report2.gates[0].status).toBe("fail");
      expect(report2.gates[0].reason).toContain("no taskId");
    } finally {
      process.chdir(repoCwd);
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("evidence gate is planId-scoped — a task never borrows another plan's proofs (plan 20261031-048 BUG-2)", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "flowrun-evx-"));
    const repoCwd = process.cwd();
    process.chdir(tmp);
    try {
      fs.mkdirSync(path.join(tmp, ".workflows", "proofs"), { recursive: true });
      const ledger = path.join(tmp, ".workflows", "proofs", "proofs.jsonl");
      // probe 1:1 — the ONLY rows in the ledger belong to plan-OLD; flow plan is flow-ev-x
      expect(await proofMain(["record", "--plan", "plan-OLD", "--task", "t1", "--verify", "echo borrowed", "--runner", "reviewer", "--ledger", ledger])).toBe(0);
      const evFlow = { slug: "ev-x", title: "Evidence cross-plan", steps: [
        task("t1", 1),
        { id: "ev", kind: "gate", gate: "evidence", wave: 2, depends_on: ["t1"], taskId: "t1" },
      ] };
      const file = writeFlow(tmp, evFlow);
      const code = await main([file, "--runs-dir", path.join(tmp, "runs")]);
      expect(code).toBe(1); // plan-NEW sees NO rows of its own — loud not_checked fail, never a borrowed pass
      const report = JSON.parse(fs.readFileSync(path.join(tmp, "runs", "report.json"), "utf8"));
      expect(report.gates[0].status).toBe("fail");
      expect(report.gates[0].reason).toContain("not_checked");
    } finally {
      process.chdir(repoCwd);
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

function task(id, wave, deps = []) {
  return { id, kind: "task", title: `Task ${id}`, tier: "B", wave, depends_on: deps, tdd: false, allowed: [`src/${id}.ts`], verify: "bun test", model: "standard", thinking: "medium", role: "worker" };
}
