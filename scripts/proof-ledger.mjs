#!/usr/bin/env node
// proof-ledger — per-task proofs: verifier command, exit code, output hash
// (plan 20261025-025). Proofs are recorded data — a failing verifier still
// records its proof. Zero dependencies.
//
// Ledger: .workflows/proofs/proofs.jsonl
//   record: { ts, planId, taskId, command, exit, outputHash, specHash? }
//
// Usage:
//   node scripts/proof-ledger.mjs record --plan <id> --task <id> --verify "<cmd>" [--spec <path>] [--ledger FILE]
//   node scripts/proof-ledger.mjs show   --plan <id> [--task <id>] [--ledger FILE]
//   node scripts/proof-ledger.mjs verify --plan <id> --task <id>  [--ledger FILE]
//   node scripts/proof-ledger.mjs collect --plan <id> [--journal F] [--reviews DIR] [--ledger F] [--out F]
// Exit: record = verifier exit (after writing) · verify 0 match / 1 drift-or-missing
//       show/collect 0 · 2 usage.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const DEFAULT_LEDGER = ".workflows/proofs/proofs.jsonl";

export function parseArgs(argv) {
  const o = { cmd: null, plan: null, task: null, verify: null, spec: null, ledger: DEFAULT_LEDGER, journal: ".workflows/journal.jsonl", reviews: ".workflows/reviews", out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "record" || a === "show" || a === "verify" || a === "collect") o.cmd = a;
    else if (a === "--plan") o.plan = argv[++i];
    else if (a === "--task") o.task = argv[++i];
    else if (a === "--verify") o.verify = argv[++i];
    else if (a === "--spec") o.spec = argv[++i];
    else if (a === "--ledger") o.ledger = argv[++i];
    else if (a === "--journal") o.journal = argv[++i];
    else if (a === "--reviews") o.reviews = argv[++i];
    else if (a === "--out") o.out = argv[++i];
    else return { error: `unknown argument: ${a}` };
  }
  if (!o.cmd) return { error: "subcommand required: record | show | verify | collect" };
  if (!o.plan) return { error: "--plan is required" };
  if ((o.cmd === "record") && (!o.task || !o.verify)) return { error: "record needs --task and --verify" };
  if ((o.cmd === "verify") && !o.task) return { error: "verify needs --task" };
  return { opts: o };
}

export function appendProof(file, proof) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(proof) + "\n");
}

export function readProofs(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

export function record(opts, exec = (cmd) => spawnSync("bash", ["-c", cmd], { encoding: "utf8" })) {
  const s = exec(opts.verify);
  const stdout = s.stdout ?? "";
  const stderr = s.stderr ?? "";
  const proof = {
    ts: new Date().toISOString(),
    planId: opts.plan,
    taskId: opts.task,
    command: opts.verify,
    exit: s.status ?? 1,
    outputHash: sha256(stdout + stderr),
    ...(opts.spec && fs.existsSync(opts.spec) ? { specHash: sha256(fs.readFileSync(opts.spec)) } : {}),
  };
  appendProof(opts.ledger, proof);
  console.log(`proof recorded: ${opts.task} exit=${proof.exit} outputHash=${proof.outputHash.slice(0, 12)} → ${opts.ledger}`);
  return { proof, exit: proof.exit };
}

export function verifyLast(records, opts, exec = (cmd) => spawnSync("bash", ["-c", cmd], { encoding: "utf8" })) {
  const mine = records.filter((r) => r.planId === opts.plan && r.taskId === opts.task);
  if (mine.length === 0) return { status: "missing", reason: `no proof recorded for ${opts.task}`, exit: 1 };
  const last = mine[mine.length - 1];
  const s = exec(last.command);
  const hash = sha256((s.stdout ?? "") + (s.stderr ?? ""));
  const same = (s.status ?? 1) === last.exit && hash === last.outputHash;
  return {
    status: same ? "match" : "drift",
    exit: 1,
    ...(same ? {} : { recorded: { exit: last.exit, outputHash: last.outputHash }, now: { exit: s.status ?? 1, outputHash: hash } }),
    command: last.command,
  };
}

export function collectEvidence({ planId, journalFile, reviewsDir, ledgerFile, now = new Date().toISOString() }) {
  const journal = fs.existsSync(journalFile)
    ? fs.readFileSync(journalFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.planId === planId)
    : [];
  const proofs = readProofs(ledgerFile).filter((r) => r.planId === planId);

  const tasks = {};
  for (const e of journal) {
    if (!e.taskId) continue;
    tasks[e.taskId] ??= { journal: [], verdictOk: null, proofs: 0, missingEvidence: false };
    tasks[e.taskId].journal.push(e.event);
  }
  if (fs.existsSync(reviewsDir)) {
    for (const f of fs.readdirSync(reviewsDir).filter((f) => f.startsWith("task-") && f.endsWith(".md"))) {
      const key = f.replace(/\.md$/, "");
      if (tasks[key]) tasks[key].verdictOk = /ok:\s*true/i.test(fs.readFileSync(path.join(reviewsDir, f), "utf8"));
    }
  }
  for (const p of proofs) if (tasks[p.taskId]) tasks[p.taskId].proofs += 1;
  for (const [id, t] of Object.entries(tasks)) {
    const settled = t.journal.includes("done") || t.journal.includes("failed");
    t.missingEvidence = t.journal.includes("dispatched") && !settled && t.proofs === 0;
    void id;
  }

  const trail = ".workflows/intent/trail.jsonl";
  const audit = ".workflows/judge-audit.jsonl";
  const rowCount = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).length : 0);
  return {
    planId, now,
    tasks,
    referencedTrails: { runJournal: journalFile, intentTrail: trail, intentRows: rowCount(trail), judgeAudit: audit, judgeRows: rowCount(audit) },
  };
}

export async function main(argv) {
  const { opts, error } = parseArgs(argv);
  if (error) { console.error(`usage error: ${error}`); return 2; }

  if (opts.cmd === "record") {
    const { proof, exit } = record(opts);
    void proof;
    return exit;
  }
  if (opts.cmd === "show") {
    const mine = readProofs(opts.ledger).filter((r) => r.planId === opts.plan && (!opts.task || r.taskId === opts.task));
    console.log(JSON.stringify(mine, null, 2));
    return 0;
  }
  if (opts.cmd === "verify") {
    const r = verifyLast(readProofs(opts.ledger), opts);
    console.log(JSON.stringify(r, null, 2));
    return r.status === "match" ? 0 : 1;
  }
  if (opts.cmd === "collect") {
    const evidence = collectEvidence({ planId: opts.plan, journalFile: opts.journal, reviewsDir: opts.reviews, ledgerFile: opts.ledger });
    const out = opts.out ?? `.workflows/proofs/evidence-${opts.plan}.json`;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(evidence, null, 2) + "\n");
    const missing = Object.entries(evidence.tasks).filter(([, t]) => t.missingEvidence).map(([id]) => id);
    console.log(`evidence written: ${out} · ${Object.keys(evidence.tasks).length} task(s) · missing-evidence: ${missing.length ? missing.join(", ") : "none"}`);
    return 0;
  }
  return 2;
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).then((code) => process.exit(code));
