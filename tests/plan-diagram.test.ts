/**
 * Tests for scripts/plan-diagram.mjs — plan.md + specs/*.spec → SeeCode
 * JSON flowchart diagram(s) (plan 20261104-057, task 1).
 *
 * Run: bun test tests/plan-diagram.test.ts
 *
 * Self-contained fixtures (mkdtemp tmpdirs; no external fixture files).
 * Format research: SeeCode JSON spec — flowchart type, nodes = [{id,label,
 * sub,row,col,shape}], edges = [[a,b,label?]], budget ≤ 9 nodes / 12 edges
 * per diagram, else split into multiple diagram objects.
 */

import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  parsePlan,
  parseSpec,
  buildDiagrams,
  run,
} from "../scripts/plan-diagram.mjs";

function tmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "plan-diagram-"));
}

function writeFixture(dir: string): void {
  fs.mkdirSync(path.join(dir, ".workflows", "specs"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, ".workflows", "plan.md"),
    `# Plan — demo

## Tasks

1. **core parser** (worker) — parse plan and specs into a graph.
2. **budget split** (worker) — split diagrams over the 9-node budget.
3. **cli wiring** (worker) — wire flags and file output.
4. **ship gate** (gate) — verify and render.
`,
  );
  fs.writeFileSync(
    path.join(dir, ".workflows", "specs", "task-1.spec"),
    `---
spec: task
name: core-parser
---

## Intent

Parse the plan tasks and spec intents into a deterministic graph. Nothing else.
`,
  );
  fs.writeFileSync(
    path.join(dir, ".workflows", "specs", "task-2.spec"),
    `---
spec: task
name: budget-split
---

## Intent

Split output into multiple diagram objects. Extra clause ignored.
`,
  );
}

describe("parsePlan", () => {
  test("extracts numbered tasks: id, label, worker", () => {
    const dir = tmp();
    writeFixture(dir);
    const tasks = parsePlan(fs.readFileSync(path.join(dir, ".workflows", "plan.md"), "utf8"));
    expect(tasks.length).toBe(4);
    expect(tasks[0]).toEqual({ id: "1", label: "core parser", worker: "worker" });
    expect(tasks[3].worker).toBe("gate");
  });

  test("ignores non-task lines", () => {
    const tasks = parsePlan("# Plan\n\nsome prose\n\n## Tasks\n\nno matches here\n");
    expect(tasks).toEqual([]);
  });

  test("also parses repo-style ### TASK N headings with Agent lines", () => {
    const tasks = parsePlan(
      "## Tasks\n\n### TASK 1 (Tier B): pii-scan.mjs (TDD)\n- **Agent**: worker\n\n### TASK 2: docs\n- **Agent**: gate\n",
    );
    expect(tasks.length).toBe(2);
    expect(tasks[0].label).toBe("pii-scan.mjs (TDD)");
    expect(tasks[0].worker).toBe("worker");
    expect(tasks[1].worker).toBe("gate");
  });
});

describe("parseSpec", () => {
  test("name from header, sub from Intent first clause (~40 chars)", () => {
    const dir = tmp();
    writeFixture(dir);
    const spec = parseSpec(fs.readFileSync(path.join(dir, ".workflows", "specs", "task-1.spec"), "utf8"));
    expect(spec.name).toBe("core-parser");
    expect(spec.sub).toBe("Parse the plan tasks and spec intents");
    expect(spec.sub.length).toBeLessThanOrEqual(40);
  });

  test("first clause stops at the first sentence period", () => {
    const spec = parseSpec("---\nname: x\n---\n\n## Intent\n\nFirst clause. Second clause.\n");
    expect(spec.sub).toBe("First clause");
  });
});

describe("buildDiagrams", () => {
  test("nodes keyed by task id, edges follow declared order", () => {
    const dir = tmp();
    writeFixture(dir);
    const plan = parsePlan(fs.readFileSync(path.join(dir, ".workflows", "plan.md"), "utf8"));
    const specs = new Map([
      ["1", parseSpec(fs.readFileSync(path.join(dir, ".workflows", "specs", "task-1.spec"), "utf8"))],
      ["2", parseSpec(fs.readFileSync(path.join(dir, ".workflows", "specs", "task-2.spec"), "utf8"))],
    ]);
    const diagrams = buildDiagrams(plan, specs);
    expect(diagrams.length).toBe(1);
    const d = diagrams[0];
    expect(d.type).toBe("flowchart");
    expect(d.nodes.map((n: any) => n.id)).toEqual(["task-1", "task-2", "task-3", "task-4"]);
    expect(d.nodes[0].label).toBe("core parser");
    expect(d.nodes[0].sub).toBe("Parse the plan tasks and spec intents");
    expect(d.edges).toEqual([
      ["task-1", "task-2"],
      ["task-2", "task-3"],
      ["task-3", "task-4"],
    ]);
    expect(d.nodes.length).toBeLessThanOrEqual(9);
    expect(d.edges.length).toBeLessThanOrEqual(12);
  });

  test("splits >9 tasks into multiple diagrams within budget", () => {
    const tasks = Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      label: `task ${i + 1}`,
      worker: "worker",
    }));
    const diagrams = buildDiagrams(tasks, new Map());
    expect(diagrams.length).toBe(2);
    for (const d of diagrams) {
      expect(d.nodes.length).toBeLessThanOrEqual(9);
      expect(d.edges.length).toBeLessThanOrEqual(12);
      expect(d.type).toBe("flowchart");
    }
    expect(diagrams[0].nodes.map((n: any) => n.id)).toEqual(
      Array.from({ length: 9 }, (_, i) => `task-${i + 1}`),
    );
    expect(diagrams[1].nodes.map((n: any) => n.id)).toEqual(["task-10", "task-11", "task-12"]);
    // last edge of chunk k links to first node of chunk k+1
    expect(diagrams[0].edges.at(-1)).toEqual(["task-8", "task-9"]);
    expect(diagrams[1].edges.at(-1)).toEqual(["task-11", "task-12"]);
  });
});

describe("run (CLI)", () => {
  test("writes diagrams/pi-workflows.json with valid SeeCode shape", () => {
    const dir = tmp();
    writeFixture(dir);
    const out = path.join(dir, "diagrams", "pi-workflows.json");
    const code = run(["--plan", path.join(dir, ".workflows", "plan.md"),
      "--specs-dir", path.join(dir, ".workflows", "specs"), "--out", out]);
    expect(code).toBe(0);
    const parsed = JSON.parse(fs.readFileSync(out, "utf8"));
    const list = Array.isArray(parsed) ? parsed : [parsed];
    for (const d of list) {
      expect(d.type).toBe("flowchart");
      expect(Array.isArray(d.nodes)).toBe(true);
      expect(Array.isArray(d.edges)).toBe(true);
      for (const n of d.nodes) {
        expect(typeof n.id).toBe("string");
        expect(typeof n.label).toBe("string");
        expect(typeof n.row).toBe("number");
        expect(typeof n.col).toBe("number");
      }
    }
  });

  test("missing plan exits 2", () => {
    const dir = tmp();
    expect(run(["--plan", path.join(dir, "nope.md"), "--out", path.join(dir, "o.json")])).toBe(2);
  });
});
