#!/usr/bin/env node
// run-journal — the run journal, budget check, and mechanical resume
// (plan 20261025-024). Append-only JSONL; zero dependencies.
//
// Journal:  .workflows/journal.jsonl  (default)
//   entry: { ts, planId, taskId?, event, cost?, note? }
//   events: dispatched | done | failed | blocked | budget-exhausted
// Budget:   .workflows/budget.json  (optional — absent ⇒ no ceiling)
//   { max_tasks?: number, max_cost_usd?: number }
//
// Usage:
//   node scripts/run-journal.mjs record --plan <id> [--task <id>] --event <event>
//                                [--cost N] [--note s] [--journal FILE]
//   node scripts/run-journal.mjs check  --plan <id> [--budget FILE] [--journal FILE]
//   node scripts/run-journal.mjs resume --plan <id> [--budget FILE] [--journal FILE]
// Exit: record/resume 0 · check 0 ok, 1 exhausted · 2 usage.

import fs from "node:fs";
import path from "node:path";

export const EVENTS = ["dispatched", "done", "failed", "blocked", "budget-exhausted"];
const round4 = (n) => Math.round(n * 10000) / 10000;

export function parseArgs(argv) {
  const o = { journal: ".workflows/journal.jsonl", budget: ".workflows/budget.json", plan: null, task: null, event: null, cost: null, note: null, cmd: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "record" || a === "check" || a === "resume") o.cmd = a;
    else if (a === "--plan") o.plan = argv[++i];
    else if (a === "--task") o.task = argv[++i];
    else if (a === "--event") o.event = argv[++i];
    else if (a === "--cost") o.cost = Number(argv[++i]);
    else if (a === "--note") o.note = argv[++i];
    else if (a === "--journal") o.journal = argv[++i];
    else if (a === "--budget") o.budget = argv[++i];
    else return { error: `unknown argument: ${a}` };
  }
  if (!o.cmd) return { error: "subcommand required: record | check | resume" };
  if (!o.plan) return { error: "--plan is required" };
  if (o.cmd === "record") {
    if (!o.event || !EVENTS.includes(o.event)) return { error: `--event must be one of ${EVENTS.join("|")}` };
  }
  return { opts: o };
}

export function appendEntry(file, entry) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n");
}

export function readJournal(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

export function budgetFrom(file) {
  if (!fs.existsSync(file)) return null;
  const b = JSON.parse(fs.readFileSync(file, "utf8"));
  const out = {};
  if (Number.isInteger(b.max_tasks)) out.max_tasks = b.max_tasks;
  if (typeof b.max_cost_usd === "number") out.max_cost_usd = b.max_cost_usd;
  return Object.keys(out).length ? out : null;
}

export function spent(entries) {
  const dispatches = entries.filter((e) => e.event === "dispatched");
  const cost = round4(entries.reduce((a, e) => a + (typeof e.cost === "number" ? e.cost : 0), 0));
  return { tasks: dispatches.length, cost };
}

export function checkBudget(entries, budget) {
  const spentNow = spent(entries);
  if (!budget) return { ok: true, spent: spentNow };
  if (budget.max_tasks !== undefined && spentNow.tasks >= budget.max_tasks)
    return { ok: false, reason: `max_tasks reached (${spentNow.tasks}/${budget.max_tasks})`, spent: spentNow };
  if (budget.max_cost_usd !== undefined && spentNow.cost > budget.max_cost_usd)
    return { ok: false, reason: `max_cost_usd exceeded ($${spentNow.cost} > $${budget.max_cost_usd})`, spent: spentNow };
  return { ok: true, spent: spentNow };
}

export function resumeState(entries, budget) {
  const inPlan = entries.filter((e) => e.event !== "budget-exhausted");
  const byTask = new Map();
  for (const e of inPlan) {
    if (!e.taskId) continue;
    byTask.set(e.taskId, e.event);
  }
  const done = [...byTask].filter(([, v]) => v === "done").map(([k]) => k);
  const failed = [...byTask].filter(([, v]) => v === "failed").map(([k]) => k);
  const open = [...byTask].filter(([, v]) => v === "dispatched" || v === "blocked").map(([k]) => k);
  const spentNow = spent(entries);
  const exhausted = inPlan.some((e) => e.event === "budget-exhausted");
  const budgetLeft = budget
    ? {
        tasks: budget.max_tasks !== undefined ? Math.max(0, budget.max_tasks - spentNow.tasks) : null,
        cost: budget.max_cost_usd !== undefined ? round4(Math.max(0, budget.max_cost_usd - spentNow.cost)) : null,
      }
    : null;
  return { done, failed, openDispatches: open, spent: spentNow, budgetExhausted: exhausted, budgetLeft };
}

export async function main(argv) {
  const { opts, error } = parseArgs(argv);
  if (error) { console.error(`usage error: ${error}`); return 2; }
  const budget = budgetFrom(opts.budget);

  if (opts.cmd === "record") {
    appendEntry(opts.journal, { planId: opts.plan, ...(opts.task ? { taskId: opts.task } : {}), event: opts.event, ...(typeof opts.cost === "number" ? { cost: round4(opts.cost) } : {}), ...(opts.note ? { note: opts.note } : {}) });
    console.log(`recorded ${opts.event}${opts.task ? ` ${opts.task}` : ""} → ${opts.journal}`);
    return 0;
  }

  const entries = readJournal(opts.journal).filter((e) => e.planId === opts.plan);
  if (opts.cmd === "check") {
    const c = checkBudget(entries, budget);
    console.log(JSON.stringify({ ok: c.ok, spent: c.spent, ...(c.reason ? { reason: c.reason } : {}), budget: budget ?? null }));
    if (!c.ok) {
      appendEntry(opts.journal, { planId: opts.plan, event: "budget-exhausted", note: c.reason });
      return 1;
    }
    return 0;
  }

  // resume
  const s = resumeState(entries, budget);
  console.log(JSON.stringify({ planId: opts.plan, ...s }, null, 2));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).then((code) => process.exit(code));
