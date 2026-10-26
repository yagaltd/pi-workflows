#!/usr/bin/env node
// flow-run — the flow control plane (plan 20261025-022, D1/D5).
//
// Validates a flow, computes waves, dispatch-decides every task step through
// the REAL resolveNext (via the shipped bun probe), writes per-task dispatch
// packs + a run report, and executes gate steps at wave boundaries.
// Workers stay with /next — this is the control plane, not a second engine.
//
// Usage:
//   node scripts/flow-run.mjs <flow.json> [--dry-run] [--runs-dir DIR]
// Exit: 0 clean · 1 validation | gate failure | unexpected blocked code · 2 usage.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { computeWaves, validateFlow } from "./flow-validate.mjs";
import { gateCommands, runGate } from "./flow-gates.mjs";
import { runDecisionStep } from "./flow-decision.mjs";
import { ask as judgeAsk } from "./judge.mjs";

const TIER_RANK = { A: 0, B: 1, C: 2 };

export function renderPlan(flow, statuses) {
  const taskSteps = flow.steps.filter((s) => s.kind === "task")
    .sort((a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9) || (a.id < b.id ? -1 : 1));
  const nums = new Map(taskSteps.map((s, i) => [s.id, i + 1]));
  let text = `# Plan: ${flow.title} (flow ${flow.slug})\n\n> Plan ID: flow-${flow.slug}\n> Status: APPROVED (flow run)\n\n## Tasks\n\n`;
  for (const s of taskSteps) {
    const num = nums.get(s.id);
    const deps = (s.depends_on ?? []).map((d) => `TASK ${nums.get(d)}`).join(", ") || "none";
    text += `### TASK ${num} (Tier ${s.tier}, ${s.tag ?? "⚪"}): ${s.title} — ${s.allowed.join(", ")}\n`;
    text += `- **Status**: ${statuses.get(num) ?? "⬜ PENDING"}\n- **Wave**: ${s.wave}\n- **Depends On**: ${deps}\n- **tdd**: ${s.tdd === true}\n`;
    text += `- **Allowed**: ${s.allowed.join(", ")}\n- **Verify**: ${s.verify}\n\n`;
  }
  return { text, nums, taskSteps };
}

function probe(caseObj, tmpFile) {
  fs.writeFileSync(tmpFile, JSON.stringify(caseObj));
  const s = spawnSync("bun", ["scripts/eval-dispatch-probe.ts", tmpFile], { encoding: "utf8", timeout: 60000 });
  if (s.error || s.status !== 0) return { error: `probe failed: ${(s.stderr ?? s.error?.message ?? "").slice(0, 200)}` };
  try { return JSON.parse(s.stdout.trim().split("\n").pop()); } catch { return { error: "probe printed no JSON" }; }
}

export async function main(argv) {
  const file = argv.find((a) => !a.startsWith("--"));
  if (!file) { console.error("usage: node scripts/flow-run.mjs <flow.json> [--dry-run] [--runs-dir DIR]"); return 2; }
  const dryRun = argv.includes("--dry-run");
  const runsDirArg = argv.includes("--runs-dir") ? argv[argv.indexOf("--runs-dir") + 1] : null;

  let flow;
  try { flow = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.error(`flow-run: unreadable flow: ${e.message}`); return 2; }
  const v = validateFlow(flow);
  if (!v.ok) {
    for (const e of v.errors) console.error(`BLOCKED ${e.code}${e.step ? ` at ${e.step}` : ""}: ${e.message}`);
    return 1;
  }

  const runsDir = runsDirArg ?? path.join(".workflows", "flows", "runs", flow.slug);
  fs.rmSync(runsDir, { recursive: true, force: true });
  fs.mkdirSync(runsDir, { recursive: true });

  const statuses = new Map();
  const verdicts = [];
  const state = {};
  const report = { slug: flow.slug, dryRun, steps: [], gates: [] };
  const tmpFile = path.join(os.tmpdir(), `flow-run-case-${flow.slug}.json`);
  const sortedTasks = flow.steps.filter((s) => s.kind === "task")
    .sort((a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9) || (a.id < b.id ? -1 : 1));
  const byNum = new Map(sortedTasks.map((s, i) => [i + 1, s]));
  let exit = 0;

  for (const wave of computeWaves(flow)) {
    const waveSteps = flow.steps.filter((s) => s.wave === wave);
    const taskSteps = waveSteps.filter((s) => s.kind === "task");

    // dispatch-decide every task step of the wave
    let guard = 0;
    while (taskSteps.some((s) => !s._packed)) {
      if (++guard > 500) { console.error("flow-run: dispatch loop guard tripped"); return 2; }
      const { text } = renderPlan(flow, statuses);
      const r = probe({ plan: text, registry: regFor(flow), reviewFiles: verdicts }, tmpFile);
      if (r.error) { console.error(`flow-run: ${r.error}`); return 2; }
      if (r.ok === false && r.blocked === "no-tasks") break;
      if (r.ok === false) { console.error(`BLOCKED ${r.blocked}: ${r.reason}`); return 1; }
      const num = Number(r.id.replace("task-", ""));
      const step = byNum.get(num);
      if (!step || step._packed) { console.error(`flow-run: probe selected unknown or packed ${r.id}`); return 2; }
      statuses.set(num, "✅ DONE");
      verdicts.push({ name: `task-${num}.md`, content: "## Round 1\n**ok: true**" });
      step._packed = true;
      const packFile = path.join(runsDir, `pack-${step.id}.txt`);
      fs.writeFileSync(packFile, r.pack ?? "");
      report.steps.push({ id: step.id, kind: "task", wave, status: "packed", pack: packFile, selected: r.id });
    }

    // gates + transforms of this wave, after its tasks
    for (const s of waveSteps.filter((x) => x.kind !== "task")) {
      if (s.kind === "decision") {
        const d = await runDecisionStep(s, { ask: judgeAsk });
        report.steps.push({ id: s.id, kind: "decision", wave, status: d.status, reason: d.reason ?? null, answers: d.answers ?? null });
        console.log(`DECISION ${s.id}: ${d.status}${d.reason ? ` — ${d.reason}` : ""}`);
        if (d.answers) Object.assign(state, { [s.id]: d.answers });
        if (d.status === "fail") exit = 1; // failed assertion blocks; skipped is a documented gap
        continue;
      }
      if (s.kind === "transform") {
        Object.assign(state, s.set ?? {});
        report.steps.push({ id: s.id, kind: "transform", wave, status: "set", fields: Object.keys(s.set ?? {}) });
        continue;
      }
      if (dryRun) {
        report.gates.push({ id: s.id, gate: s.gate, status: "dry-run", commands: gateCommands(s.gate) });
        console.log(`DRY-RUN gate ${s.id} (${s.gate}): ${(gateCommands(s.gate) ?? []).join(" && ")}`);
        continue;
      }
      const g = runGate(s.gate);
      report.gates.push({ id: s.id, gate: s.gate, status: g.status, reason: g.reason ?? null });
      console.log(`GATE ${s.id} (${s.gate}): ${g.status}${g.reason ? ` — ${g.reason}` : ""}`);
      if (g.status === "fail") { exit = 1; }
      // skipped is a documented gap, recorded — never a pass
    }
    if (exit !== 0) break;
  }

  report.state = state;
  fs.writeFileSync(path.join(runsDir, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`flow-run: ${report.steps.filter((s) => s.status === "packed").length} task(s) packed · ${report.gates.length} gate(s) · report ${path.join(runsDir, "report.json")}`);
  return exit;
}

function numOf(flow, step) {
  const taskSteps = flow.steps.filter((s) => s.kind === "task")
    .sort((a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9) || (a.id < b.id ? -1 : 1));
  return taskSteps.indexOf(step) + 1;
}

function regFor(flow) {
  const reg = {};
  for (const s of flow.steps.filter((x) => x.kind === "task")) {
    reg[`task-${numOf(flow, s)}`] = { model: s.model, thinking: s.thinking, role: s.role };
  }
  return reg;
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).then((code) => process.exit(code));
