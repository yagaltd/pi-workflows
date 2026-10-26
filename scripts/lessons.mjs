#!/usr/bin/env node
// lessons — the lessons ledger (plan 20261025-026). Append-only: transitions
// add entries, history is never rewritten, and a status change without a
// recorded reason is refused. Provenance is computed from recorded proofs,
// never claimed. Zero dependencies.
//
// Ledger: .workflows/lessons/lessons.jsonl
//   lesson:     { type:"lesson", id, ts, planId, taskId, lesson, status, provenance, sources }
//   transition: { type:"transition", target, to, reason, ts }
//
// Usage:
//   node scripts/lessons.mjs distill --plan-file <plan.md> --reviews-dir <dir> --plan-id <id>
//                                   [--proofs .workflows/proofs/proofs.jsonl] [--ledger FILE]
//   node scripts/lessons.mjs set --id <lesson-id> --status <valid|superseded|failed|speculative>
//                                --reason "<why>" [--ledger FILE]
//   node scripts/lessons.mjs list [--status s] [--tag t] [--text q] [--ledger FILE]
// Exit: 0 ok · 1 nothing distilled / unknown id · 2 usage.

import fs from "node:fs";

const STATUSES = ["valid", "superseded", "failed", "speculative"];
const DEFAULT_LEDGER = ".workflows/lessons/lessons.jsonl";

export function parseArgs(argv) {
  const o = { cmd: null, ledger: DEFAULT_LEDGER, status: null, tag: null, text: null, id: null, reason: null, to: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "distill" || a === "set" || a === "list") o.cmd = a;
    else if (a === "--plan-file") o.planFile = argv[++i];
    else if (a === "--reviews-dir") o.reviewsDir = argv[++i];
    else if (a === "--plan-id") o.planId = argv[++i];
    else if (a === "--proofs") o.proofs = argv[++i];
    else if (a === "--ledger") o.ledger = argv[++i];
    else if (a === "--status") o.status = argv[++i];
    else if (a === "--tag") o.tag = argv[++i];
    else if (a === "--text") o.text = argv[++i];
    else if (a === "--id") o.id = argv[++i];
    else if (a === "--reason") o.reason = argv[++i];
    else if (a === "--to") o.to = argv[++i];
    else return { error: `unknown argument: ${a}` };
  }
  if (!o.cmd) return { error: "subcommand required: distill | set | list" };
  if (o.cmd === "distill" && (!o.planFile || !o.reviewsDir || !o.planId)) return { error: "distill needs --plan-file, --reviews-dir, --plan-id" };
  if (o.cmd === "set" && (!o.id || !o.to)) return { error: "set needs --id and --to" };
  if (o.cmd === "set" && !o.reason) return { error: "set needs --reason — never change a lesson status without a recorded reason" };
  if (o.cmd === "set" && !STATUSES.includes(o.to)) return { error: `--to must be one of ${STATUSES.join("|")}` };
  if (o.cmd === "list" && o.status && !STATUSES.includes(o.status)) return { error: `--status must be one of ${STATUSES.join("|")}` };
  return { opts: o };
}

export function readLedger(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

/** Parse house-format task blocks: header, status mark, title. */
export function parsePlanTasks(planText) {
  const out = [];
  const re = /^###\s+TASK\s+(\d+)\s*\(([^)]*)\):\s*(.+)$/gm;
  let m;
  while ((m = re.exec(planText)) !== null) {
    const rest = planText.slice(m.index + m[0].length);
    const body = rest.split(/^###\s+TASK\s+\d+/m)[0].split(/^## /m)[0];
    const done = /Status\*\*:\s*✅/.test(body);
    const failed = /Status\*\*:\s*❌/.test(body);
    out.push({ num: m[1], title: m[3].split("—")[0].trim(), status: failed ? "failed" : done ? "done" : "pending" });
  }
  return out;
}

const reviewVerdict = (reviewsDir, num) => {
  const f = `${reviewsDir}/task-${num}.md`;
  if (!fs.existsSync(f)) return null;
  return /ok:\s*true/i.test(fs.readFileSync(f, "utf8")) ? "ok:true" : "ok:false";
};

export function distill({ planFile, reviewsDir, planId, proofsFile, ledger }) {
  const planText = fs.readFileSync(planFile, "utf8");
  const tasks = parsePlanTasks(planText);
  const proofs = fs.existsSync(proofsFile)
    ? fs.readFileSync(proofsFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.planId === planId)
    : [];
  const existing = readLedger(ledger).filter((e) => e.type === "lesson" && e.planId === planId);
  const seen = new Set(existing.map((e) => e.taskId));

  const appended = [];
  for (const t of tasks) {
    const taskId = `task-${t.num}`;
    if (seen.has(taskId)) continue; // idempotent per (planId, taskId)
    const taskProofs = proofs.filter((p) => p.taskId === taskId);
    const verdict = reviewVerdict(reviewsDir, t.num);
    const status = t.status === "failed" ? "failed" : t.status === "done" && verdict === "ok:true" ? "valid" : "speculative";
    const provenance = taskProofs.length > 0 ? "verified" : "from_untrusted";
    const entry = {
      type: "lesson",
      id: `les-${planId}-${taskId}`,
      ts: new Date().toISOString(),
      planId,
      taskId,
      lesson: `${t.title} — outcome: ${t.status}${verdict ? ` (${verdict})` : ""}`,
      status,
      provenance,
      sources: {
        plan: planFile,
        review: `${reviewsDir}/task-${t.num}.md`,
        proofs: taskProofs.length,
      },
      tags: [planId, status, provenance],
    };
    appendLesson(ledger, entry);
    appended.push(entry);
  }
  return appended;
}

function appendLesson(file, entry) {
  fs.mkdirSync(file.split("/").slice(0, -1).join("/"), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(entry) + "\n");
}

export function currentStatus(entries, lessonId) {
  let s = null;
  for (const e of entries) {
    if (e.type === "lesson" && e.id === lessonId) s = e.status;
    if (e.type === "transition" && e.target === lessonId) s = e.to;
  }
  return s;
}

export async function main(argv) {
  const { opts, error } = parseArgs(argv);
  if (error) { console.error(`usage error: ${error}`); return 2; }

  if (opts.cmd === "distill") {
    const appended = distill({ ...opts, proofsFile: opts.proofs });
    if (appended.length === 0) { console.log("distill: nothing new (bundle already distilled)"); return 1; }
    for (const e of appended) console.log(`lesson ${e.id} [${e.status}/${e.provenance}] ${e.lesson}`);
    console.log(`distill: ${appended.length} lesson(s) → ${opts.ledger}`);
    return 0;
  }

  if (opts.cmd === "set") {
    const entries = readLedger(opts.ledger);
    const exists = entries.some((e) => e.type === "lesson" && e.id === opts.id);
    if (!exists) { console.error(`unknown lesson id: ${opts.id}`); return 1; }
    appendLesson(opts.ledger, { type: "transition", target: opts.id, to: opts.to, reason: opts.reason, ts: new Date().toISOString() });
    console.log(`transition recorded: ${opts.id} → ${opts.to} (${opts.reason})`);
    return 0;
  }

  // list
  const entries = readLedger(opts.ledger);
  let rows = entries.filter((e) => e.type === "lesson").map((e) => ({ ...e, current: currentStatus(entries, e.id) }));
  if (opts.status) rows = rows.filter((r) => r.current === opts.status);
  if (opts.tag) rows = rows.filter((r) => (r.tags ?? []).some((t) => t.includes(opts.tag)));
  if (opts.text) rows = rows.filter((r) => r.lesson.toLowerCase().includes(opts.text.toLowerCase()));
  for (const r of rows) console.log(`${r.id} [${r.current}/${r.provenance}] ${r.lesson}`);
  console.log(`list: ${rows.length} lesson(s)`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).then((code) => process.exit(code));
