#!/usr/bin/env node
// proof-ledger — per-task proofs: verifier command, exit code, output hash
// (plan 20261025-025). Proofs are recorded data — a failing verifier still
// records its proof. Zero dependencies.
//
// Ledger: .workflows/proofs/proofs.jsonl
//   record: { ts, planId, taskId, command, exit, outputHash, runner?, replayable?, specHash? }
//     runner: who ran the verifier (worker | reviewer | orchestrator); rows WITHOUT
//     a runner — historical — read as runner "worker".
//     replayable: rows WITHOUT it read as true.
//
// Usage:
//   node scripts/proof-ledger.mjs init [--ledger FILE]
//   node scripts/proof-ledger.mjs record --plan <id> --task <id> --verify "<cmd>" [--runner R] [--reviewer-token T] [--kind replayable|not_replayable] [--spec <path>] [--ledger FILE]
//   node scripts/proof-ledger.mjs show   --plan <id> [--task <id>] [--ledger FILE]
//   node scripts/proof-ledger.mjs verify --plan <id> --task <id>  [--ledger FILE]
//   node scripts/proof-ledger.mjs collect --plan <id> [--journal F] [--reviews DIR] [--ledger F] [--out F]
// Exit: record = verifier exit (after writing) · verify 0 replayable-confirmed /
//       1 replayable-drifted, not_replayable, or missing · show/collect/init 0 · 2 usage.
//
// Reviewer token gating (owner-approved C-lite): `--runner reviewer` records are
// token-gated — they refuse unless `--reviewer-token` matches
// .workflows/proofs/.reviewer-token (32-hex, mode 600; created by `init` or
// lazily by the first worker/orchestrator record). Structural protection
// against accidental mislabeling, not adversarial-process-proof (single-user
// machine — documented residual). Old reviewer rows predate the token and
// verify as "reviewer (self-attested, pre-token)" — forward-only.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const DEFAULT_LEDGER = ".workflows/proofs/proofs.jsonl";
// Reviewer-token file lives next to the ledger (default:
// .workflows/proofs/.reviewer-token). Local-only by design — .workflows/* is
// gitignored, so the token never leaves the machine.
const REVIEWER_TOKEN_FILE = ".reviewer-token";
export const reviewerTokenPath = (ledger) => path.join(path.dirname(ledger), REVIEWER_TOKEN_FILE);

// Idempotent: creates the dir and the 32-hex token on demand, never clobbers an
// existing token (rotation would strand nothing today, but least surprise wins).
export function initReviewerToken(ledger) {
  const file = reviewerTokenPath(ledger);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, randomBytes(16).toString("hex") + "\n", { mode: 0o600 });
    fs.chmodSync(file, 0o600); // deterministic regardless of umask
  }
  return file;
}
// Valid --kind values (BUG-4 fix): anything else is a usage error BEFORE any
// execution — a typo like "not-replayable" must never record replayable:true.
export const PROOF_KINDS = ["replayable", "not_replayable"];

export function parseArgs(argv) {
  const o = { cmd: null, plan: null, task: null, verify: null, spec: null, runner: null, kind: null, reviewerToken: null, ledger: DEFAULT_LEDGER, journal: ".workflows/journal.jsonl", reviews: ".workflows/reviews", out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "record" || a === "show" || a === "verify" || a === "collect" || a === "init") o.cmd = a;
    else if (a === "--plan") o.plan = argv[++i];
    else if (a === "--task") o.task = argv[++i];
    else if (a === "--verify") o.verify = argv[++i];
    else if (a === "--spec") o.spec = argv[++i];
    else if (a === "--runner") o.runner = argv[++i];
    else if (a === "--kind") o.kind = argv[++i];
    else if (a === "--reviewer-token") o.reviewerToken = argv[++i];
    else if (a === "--ledger") o.ledger = argv[++i];
    else if (a === "--journal") o.journal = argv[++i];
    else if (a === "--reviews") o.reviews = argv[++i];
    else if (a === "--out") o.out = argv[++i];
    else return { error: `unknown argument: ${a}` };
  }
  if (!o.cmd) return { error: "subcommand required: record | show | verify | collect | init" };
  if (!o.plan && o.cmd !== "init") return { error: "--plan is required" };
  if ((o.cmd === "record") && (!o.task || !o.verify)) return { error: "record needs --task and --verify" };
  if ((o.cmd === "record") && o.kind != null && !PROOF_KINDS.includes(o.kind)) return { error: `--kind must be one of ${PROOF_KINDS.join("|")}` };
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
  // Reviewer token gate — fail-closed BEFORE any execution (BUG-4 precedent):
  // a refused record runs no verifier and writes no row. worker/orchestrator
  // records are unaffected and lazily provision the token ("lazy first-record").
  const tokenFile = reviewerTokenPath(opts.ledger);
  if (opts.runner === "reviewer") {
    const expected = fs.existsSync(tokenFile) ? fs.readFileSync(tokenFile, "utf8").trim() : null;
    if (expected === null) {
      console.error(`refusing reviewer record: ${tokenFile} not found — run proof-ledger init first (reviewer packs carry the token path)`);
      return { refused: true, exit: 2 };
    }
    if (!opts.reviewerToken) {
      console.error(`refusing reviewer record: --reviewer-token required — reviewer packs carry the token path (${tokenFile})`);
      return { refused: true, exit: 2 };
    }
    if (opts.reviewerToken !== expected) {
      console.error(`refusing reviewer record: --reviewer-token mismatch with ${tokenFile}`);
      return { refused: true, exit: 2 };
    }
  } else {
    initReviewerToken(opts.ledger);
  }
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
    ...(opts.runner ? { runner: opts.runner } : {}),
    // The gate above guarantees this is only set on token-matched reviewer rows.
    ...(opts.runner === "reviewer" ? { tokenVerified: true } : {}),
    ...(opts.kind ? { replayable: opts.kind !== "not_replayable" } : {}),
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
  // Reviewer annotation, forward-only: token-era rows carry tokenVerified:true
  // (gated at record time); legacy reviewer rows predate the token and read as
  // self-attested. worker/orchestrator rows get no annotation. Annotation never
  // changes the exit code — old plans are unaffected (048 precedent).
  const runnerNote =
    last.runner === "reviewer"
      ? last.tokenVerified
        ? "reviewer (token-verified)"
        : "reviewer (self-attested, pre-token)"
      : null;
  const done = (r) => (runnerNote ? { ...r, runnerNote } : r);
  // Rows lacking `replayable` (historical) read as true — re-run them.
  if (last.replayable === false) return done({ status: "not_replayable", exit: 1, command: last.command });
  let s;
  try {
    s = exec(last.command);
  } catch {
    return { status: "not_replayable", exit: 1, command: last.command };
  }
  if (s?.error) return { status: "not_replayable", exit: 1, command: last.command };
  const nowExit = s.status ?? 1;
  const hash = sha256((s.stdout ?? "") + (s.stderr ?? ""));
  // A confirmed replay reproduces the recorded outcome: same exit AND same
  // output (BUG-3 fix — the recorded-exit comparison was dropped and let a
  // recorded failure replay to exit 0 on byte-identical output).
  if (nowExit !== last.exit) {
    return done({
      status: "replayable-drifted",
      exit: 1,
      recorded: { exit: last.exit, outputHash: last.outputHash },
      now: { exit: nowExit, outputHash: hash },
      command: last.command,
    });
  }
  if (nowExit === 0 && hash === last.outputHash) {
    return done({ status: "replayable-confirmed", exit: 0, command: last.command });
  }
  if (hash !== last.outputHash) {
    return done({
      status: "replayable-drifted",
      exit: 1,
      recorded: { exit: last.exit, outputHash: last.outputHash },
      now: { exit: nowExit, outputHash: hash },
      command: last.command,
    });
  }
  // Re-ran identically to a recorded failure — consistent, but no confirmed replay.
  return done({ status: "not_replayable", exit: 1, command: last.command });
}

// Verdicts (plan 20261031-048, ported from kwant) — PURE: no I/O, no new deps.
// Checks shape: { runner?, owner?, status: "passed"|"failed"|"not_replayable", replayable: boolean }

// kwant foundry.rs:636 1:1 — only non-`not_replayable` statuses count; none
// counted → "not_checked"; all counted "passed" → "passed"; else "failed".
export function exampleVerdict(checks) {
  const counted = checks.filter((c) => c.status !== "not_replayable");
  if (counted.length === 0) return "not_checked";
  return counted.every((c) => c.status === "passed") ? "passed" : "failed";
}

// kwant missions/mod.rs:359-381 adapted — any failure (status "failed",
// "not_replayable", or a claimed pass with replayable false) → "failed"; else
// no independent (explicit runner ≠ owner) replayable-confirmed pass →
// "not_independent" (kwant "Waiting"; nothing waits in our batch flow); else
// "passed". A missing runner reads as owner-run — self-attested never passes.
export function evidenceVerdict(owner, checks) {
  const failed = checks.some(
    (c) => c.status === "failed" || c.status === "not_replayable" || (c.status === "passed" && c.replayable === false),
  );
  if (failed) return "failed";
  const independent = checks.some(
    (c) => c.runner !== undefined && c.runner !== owner && c.status === "passed" && c.replayable !== false,
  );
  return independent ? "passed" : "not_independent";
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

  if (opts.cmd === "init") {
    const file = initReviewerToken(opts.ledger);
    console.log(`reviewer token ready: ${file}`);
    return 0;
  }
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
    return r.status === "replayable-confirmed" ? 0 : 1;
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
