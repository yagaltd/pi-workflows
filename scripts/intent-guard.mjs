#!/usr/bin/env node
// intent-guard — classify a query against the live plan BEFORE dispatching
// (plan 20261025-023, D3). One judge call; the guard routes, never dispatches.
//
// Routes:
//   proceed — related to the live plan at confidence >= threshold
//   amend   — the query changes requirements (route to /amend)
//   answer  — unrelated: answer directly, no task jump
//   ask     — clarification or below-threshold confidence: one question
//   ask-human — judge unavailable (fail-open to current behavior)
//
// Every verdict appends to .workflows/intent/trail.jsonl (provenance for the
// lessons ledger). Usage:
//   node scripts/intent-guard.mjs --query "..." [--plan .workflows/plan.md]
//                                 [--threshold 0.85]
// Exit: 0 always except usage (2) — fail-open by design.

import fs from "node:fs";
import path from "node:path";
import { ask } from "./judge.mjs";

export function parseArgs(argv) {
  const opts = { plan: ".workflows/plan.md", threshold: 0.85, query: null, trail: ".workflows/intent/trail.jsonl" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--query") opts.query = argv[++i];
    else if (a === "--plan") opts.plan = argv[++i];
    else if (a === "--threshold") opts.threshold = Number(argv[++i]);
    else if (a === "--trail") opts.trail = argv[++i];
    else return { error: `unknown argument: ${a}` };
  }
  if (!opts.query) return { error: "--query is required" };
  if (!(opts.threshold > 0 && opts.threshold <= 1)) return { error: "--threshold must be in (0, 1]" };
  return { opts };
}

/** Task titles from the live plan — the classify question names them. */
export function planTasks(planText) {
  const out = [];
  const re = /^###\s+TASK\s+(\d+)\s*\(([^)]*)\):\s*(.+)$/gm;
  let m;
  while ((m = re.exec(planText)) !== null) out.push({ id: `task-${m[1]}`, title: m[3].split("—")[0].trim() });
  return out;
}

export function routeFor(kind, confidence, threshold) {
  if (kind === "amend_needed") return "amend";
  if (kind === "unrelated") return "answer";
  if (kind === "current_spec") return confidence >= threshold ? "proceed" : "ask";
  return "ask"; // clarification or unrecognized kind
}

export async function classify({ query, planText, threshold, ask: askFn }) {
  const tasks = planTasks(planText);
  const taskList = tasks.length ? tasks.map((t) => `${t.id}: ${t.title}`).join("; ") : "no live plan";
  const questions = [
    { id: "kind", question: `Live plan tasks: ${taskList}. Which does this request touch?`, schema: { type: "string", enum: ["current_spec", "amend_needed", "unrelated", "clarification"] } },
    { id: "confidence", question: "How confident is that classification?", schema: { type: "number", minimum: 0, maximum: 1 } },
  ];
  const r = await askFn({ questions });
  if (!r || r.skipped) return { route: "ask-human", kind: null, confidence: null, skipped: true, reason: "judge unavailable — ask the human (current behavior)" };
  const rows = Array.isArray(r.verdict) ? r.verdict : [];
  const row = (id) => rows.find((x) => x.id === id) ?? {};
  const kind = row("kind").verdict;
  const confidence = typeof row("confidence").verdict === "number" ? row("confidence").verdict : 0;
  return { route: routeFor(kind, confidence, threshold), kind, confidence, skipped: false };
}

export async function main(argv, { ask: askFn = ask } = {}) {
  const { opts, error } = parseArgs(argv);
  if (error) { console.error(`usage error: ${error}`); return 2; }
  const planText = fs.existsSync(opts.plan) ? fs.readFileSync(opts.plan, "utf8") : "";
  const c = await classify({ query: opts.query, planText, threshold: opts.threshold, ask: askFn });

  fs.mkdirSync(path.dirname(opts.trail), { recursive: true });
  fs.appendFileSync(opts.trail, JSON.stringify({ ts: new Date().toISOString(), query: opts.query, route: c.route, kind: c.kind, confidence: c.confidence, threshold: opts.threshold, skipped: c.skipped ?? false }) + "\n");

  console.log(JSON.stringify({ route: c.route, kind: c.kind, confidence: c.confidence, threshold: opts.threshold, ...(c.skipped ? { reason: c.reason } : {}) }));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).then((code) => process.exit(code));
