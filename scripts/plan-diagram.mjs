#!/usr/bin/env node
// plan-diagram — deterministic plan.md + specs/*.spec → SeeCode JSON
// flowchart diagram(s) (plan 20261104-057, task 1). Zero dependencies.
//
// Format: SeeCode flowchart spec — nodes = [{id,label,sub,row,col}],
// edges = [[a,b,label?]], budget ≤ 9 nodes / 12 edges per diagram.
// Over-budget plans split into multiple diagram objects (array output).
//
// Usage:
//   node scripts/plan-diagram.mjs [--plan <path>] [--specs-dir <dir>] [--out <path>]
// Exit: 0 written · 2 usage/input error.

import fs from "node:fs";
import path from "node:path";

const NODE_BUDGET = 9;
const EDGE_BUDGET = 12;
const SUB_CAP = 40;

export function parseArgs(argv) {
  const o = { plan: ".workflows/plan.md", specsDir: ".workflows/specs", out: "diagrams/pi-workflows.json" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--plan") o.plan = argv[++i];
    else if (argv[i] === "--specs-dir") o.specsDir = argv[++i];
    else if (argv[i] === "--out") o.out = argv[++i];
    else return { error: `unknown argument: ${argv[i]}` };
  }
  return { opts: o };
}

// `## Tasks` section, two accepted shapes:
//   pinned:  `N. **name** (worker)` lines
//   repo:    `### TASK N (…): name` headings + `- **Agent**: worker`
export function parsePlan(text) {
  const tasks = [];
  let inTasks = false;
  let current = null;
  for (const line of text.split("\n")) {
    if (/^## Tasks\s*$/.test(line)) { inTasks = true; continue; }
    if (inTasks && /^## /.test(line)) { inTasks = false; current = null; }
    if (!inTasks) continue;
    const numbered = line.match(/^\s*(\d+)\.\s+\*\*(.+?)\*\*\s*(?:\(([^)]+)\))?/);
    if (numbered) {
      current = { id: numbered[1], label: numbered[2].trim(), worker: (numbered[3] || "").trim() };
      tasks.push(current);
      continue;
    }
    const heading = line.match(/^###\s+TASK\s+(\d+)\s*(?:\([^)]*\))?\s*:?\s*(.*)$/);
    if (heading) {
      current = { id: heading[1], label: (heading[2] || "").trim(), worker: "" };
      tasks.push(current);
      continue;
    }
    if (!current) continue;
    const agent = line.match(/^\s*-\s*\*\*Agent\*\*:\s*(.+)$/);
    if (agent && !current.worker) current.worker = agent[1].trim();
  }
  return tasks;
}

// `name:` header + `## Intent` first clause → { name, sub }
export function parseSpec(text) {
  let name = "";
  const nameMatch = text.match(/^name:\s*(.+)$/m);
  if (nameMatch) name = nameMatch[1].trim();
  const intentBlock = text.match(/^## Intent\s*\n([\s\S]*?)(?=\n## |\n*$)/m);
  let sub = "";
  if (intentBlock) {
    const firstLine = intentBlock[1].split("\n").find((l) => l.trim());
    if (firstLine) {
      const clause = firstLine.split(/[.;!?]/)[0].trim();
      sub = clause.length > SUB_CAP ? clause.slice(0, SUB_CAP).replace(/\s+\S*$/, "").trimEnd() : clause;
    }
  }
  return { name, sub };
}

// Chain tasks in declared order; split into ≤9-node / ≤12-edge diagrams.
export function buildDiagrams(tasks, specs) {
  const chunks = [];
  for (let i = 0; i < tasks.length; i += NODE_BUDGET) chunks.push(tasks.slice(i, i + NODE_BUDGET));
  return chunks.map((chunk, ci) => {
    const nodes = chunk.map((t, i) => {
      const spec = specs.get(t.id);
      return {
        id: `task-${t.id}`,
        label: t.label,
        ...(spec?.sub ? { sub: spec.sub } : {}),
        row: i,
        col: 1,
        ...(i === 0 ? { shape: "terminal" } : i === chunk.length - 1 && ci === chunks.length - 1 ? { shape: "terminal" } : {}),
      };
    });
    const edges = [];
    for (let i = 0; i < chunk.length - 1; i++) edges.push([`task-${chunk[i].id}`, `task-${chunk[i + 1].id}`]);
    return {
      type: "flowchart",
      title: chunks.length > 1 ? `Plan tasks (${ci + 1}/${chunks.length})` : "Plan tasks",
      nodes,
      edges,
    };
  });
}

export function run(argv) {
  const parsed = parseArgs(argv);
  if (parsed.error) { console.error(`plan-diagram: ${parsed.error}`); return 2; }
  const { plan, specsDir, out } = parsed.opts;
  if (!fs.existsSync(plan)) { console.error(`plan-diagram: plan not found: ${plan}`); return 2; }
  const tasks = parsePlan(fs.readFileSync(plan, "utf8"));
  if (tasks.length === 0) { console.error("plan-diagram: no numbered tasks found under ## Tasks"); return 2; }
  const specs = new Map();
  if (fs.existsSync(specsDir)) {
    for (const f of fs.readdirSync(specsDir).filter((f) => f.endsWith(".spec")).sort()) {
      const text = fs.readFileSync(path.join(specsDir, f), "utf8");
      const taskId = f.match(/(\d+)\.spec$/)?.[1];
      const spec = parseSpec(text);
      if (taskId) specs.set(taskId, spec);
      else if (spec.name) {
        const byLabel = tasks.find((t) => t.label === spec.name);
        if (byLabel) specs.set(byLabel.id, spec);
      }
    }
  }
  const diagrams = buildDiagrams(tasks, specs);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(diagrams.length === 1 ? diagrams[0] : diagrams, null, 2) + "\n");
  console.log(`plan-diagram: wrote ${out} (${diagrams.length} diagram${diagrams.length > 1 ? "s" : ""}, ${tasks.length} tasks)`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(run(process.argv.slice(2)));
}
