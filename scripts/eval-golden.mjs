#!/usr/bin/env node
// eval-golden — golden eval runner with baseline flip-watching (plan 20261025-021).
//
// Zero dependencies, deterministic only — no live model calls, ever.
// Cases: .workflows/evals/golden/*.json — { id, kind, tags, input?, recorded?, expected }
//   dispatcher  — spawns `bun scripts/eval-dispatch-probe.ts <case>` (the real
//                 resolveNext; the runner never re-implements dispatcher logic)
//   gate        — replays a recorded verifier output {tool, exit, findings?}
//   degradation — asserts documented-gap markers (JUDGE SKIPPED (...) / advisory)
//   archive     — replays SHIP-archive preconditions (plan id format + changelog mention)
//   docs        — computes stamp expiry from recorded fields
//
// Each case runs twice (run-twice rule): agreement required, disagreement = flaky.
// Baseline diff: stable pass→fail is a FLIP and exits 1 unless the id is passed
// via --accept-flip. Missing baseline: warn, write, proceed once.
//
// Usage:
//   node scripts/eval-golden.mjs [--cases-dir DIR] [--baseline FILE]
//                                 [--update-baseline] [--accept-flip ID]...
// Exit: 0 clean or first-baseline · 1 flips (unaccepted) · 2 usage/internal error.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const RUNS = 2;

export function parseArgs(argv) {
  const opts = { casesDir: ".workflows/evals/golden", baseline: ".workflows/evals/baseline.jsonl", acceptFlips: [], updateBaseline: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cases-dir") opts.casesDir = argv[++i];
    else if (a === "--baseline") opts.baseline = argv[++i];
    else if (a === "--accept-flip") opts.acceptFlips.push(argv[++i]);
    else if (a === "--update-baseline") opts.updateBaseline = true;
    else return { error: `unknown argument: ${a}` };
  }
  return { opts };
}

export function loadCases(dir) {
  if (!fs.existsSync(dir)) return { error: `cases dir not found: ${dir}` };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const cases = [];
  for (const f of files) {
    try {
      const c = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      if (!c.id || !c.kind || !c.expected) return { error: `${f}: case needs id, kind, expected` };
      cases.push(c);
    } catch (e) {
      return { error: `${f}: ${e.message}` };
    }
  }
  return { cases };
}

// --- per-kind checks: return {ok, note} — pure functions of the case record ---

export function checkGate(c) {
  const r = c.recorded ?? {};
  const pass = r.exit === 0;
  if (c.expected.verdict === "PASS") return { ok: pass, note: `exit=${r.exit}` };
  if (c.expected.verdict === "FAIL")
    return { ok: pass === false && Array.isArray(r.findings) && r.findings.length > 0, note: `exit=${r.exit} findings=${(r.findings ?? []).length}` };
  return { ok: false, note: `expected.verdict must be PASS|FAIL` };
}

export function checkDegradation(c) {
  const r = c.recorded ?? {};
  const markerOk = typeof r.marker === "string" && /^JUDGE SKIPPED \(.+\)$/.test(r.marker);
  const advisoryOk = r.mode === "advisory";
  return { ok: (markerOk || advisoryOk) && c.expected.proceed === true && c.expected.documented_gap === true, note: markerOk ? r.marker : advisoryOk ? "advisory" : "no documented-gap marker" };
}

export function checkArchive(c) {
  const r = c.recorded ?? {};
  const idOk = /^\d{8}-\d{3}$/.test(r.planId ?? "");
  const mentionOk = r.changelogMentions === true;
  return { ok: idOk && mentionOk === (c.expected.ship === "pass"), note: `planId=${r.planId} mentions=${r.changelogMentions}` };
}

export function docsExpired(rec) {
  const gen = Date.parse(rec.generated_at);
  if (Number.isNaN(gen)) return null;
  const ageDays = (Date.parse(rec.now) - gen) / 86400000;
  return ageDays > rec.stale_after_days;
}

export function checkDocs(c) {
  const r = c.recorded ?? {};
  const expired = docsExpired(r);
  if (expired === null) return { ok: false, note: "bad generated_at" };
  const sawExpired = c.expected.finding === "stamp-expired";
  return { ok: expired === sawExpired, note: `expired=${expired}` };
}

export function runOnce(c) {
  if (c.kind === "dispatcher") {
    const s = spawnSync("bun", ["scripts/eval-dispatch-probe.ts", c._caseFile ?? ""], { encoding: "utf8", timeout: 30000 });
    if (s.error || s.status !== 0) return { ok: false, note: `probe failed: ${s.error?.message ?? s.stderr?.slice(0, 200)}` };
    let out;
    try { out = JSON.parse(s.stdout.trim().split("\n").pop()); } catch { return { ok: false, note: "probe printed no JSON" }; }
    const e = c.expected;
    const ok = out.ok === e.ok && (e.ok ? out.id === e.id && out.wave === e.wave : out.blocked === e.blocked);
    return { ok, note: out.ok ? `selected ${out.id} wave ${out.wave}` : `blocked=${out.blocked}` };
  }
  if (c.kind === "gate") return checkGate(c);
  if (c.kind === "degradation") return checkDegradation(c);
  if (c.kind === "archive") return checkArchive(c);
  if (c.kind === "docs") return checkDocs(c);
  return { ok: false, note: `unknown kind: ${c.kind}` };
}

export function classify(outcomes) {
  const [a, b] = outcomes;
  if (a === b) return a ? "pass" : "fail";
  return "flaky";
}

export function compareBaseline(baseline, id, outcome, acceptFlips) {
  const prev = baseline.get(id);
  if (!prev) return { status: "new" };
  if (outcome === "flaky") return { status: "flaky" };
  if (prev === "pass" && outcome === "fail") {
    return acceptFlips.includes(id) ? { status: "flip-accepted" } : { status: "flip" };
  }
  if (prev === "fail" && outcome === "pass") return { status: "fixed" };
  return { status: "stable" };
}

export async function main(argv) {
  const { opts, error } = parseArgs(argv);
  if (error) { console.error(`usage error: ${error}`); return 2; }
  const { cases, error: loadErr } = loadCases(opts.casesDir);
  if (loadErr) { console.error(`eval-golden: ${loadErr}`); return 2; }
  if (cases.length === 0) { console.error("eval-golden: no cases found"); return 2; }

  const firstRun = !fs.existsSync(opts.baseline);
  const baseline = new Map();
  if (!firstRun) {
    for (const line of fs.readFileSync(opts.baseline, "utf8").split("\n").filter(Boolean)) {
      const rec = JSON.parse(line);
      baseline.set(rec.id, rec.outcome);
    }
  } else {
    console.warn(`WARN: no baseline at ${opts.baseline} — writing it; flip-watching starts next run`);
  }

  const rows = [];
  let flips = 0;
  for (const c of cases) {
    c._caseFile = c._caseFile ?? path.join(opts.casesDir, `${c.id}.json`);
    const outcomes = [];
    let note = "";
    for (let i = 0; i < RUNS; i++) {
      const r = runOnce(c);
      outcomes.push(r.ok);
      note = r.note;
    }
    const outcome = classify(outcomes);
    const cmp = compareBaseline(baseline, c.id, outcome, opts.acceptFlips);
    if (cmp.status === "flip") flips++;
    rows.push({ id: c.id, kind: c.kind, outcome, prev: baseline.get(c.id) ?? null, status: cmp.status, note });
  }

  const stable = rows.filter((r) => r.outcome !== "flaky").every((r) => r.outcome === (r.prev ?? r.outcome) || ["new", "flip-accepted", "fixed", "flaky"].includes(r.status));
  for (const r of rows) {
    const mark = r.outcome === "pass" ? "PASS" : r.outcome === "fail" ? "FAIL" : "FLAKY";
    console.log(`${mark.padEnd(5)} ${r.id.padEnd(34)} ${String(r.status).padEnd(13)} ${r.note}`);
  }
  const fails = rows.filter((r) => r.outcome === "fail" && r.status !== "flip" && r.status !== "flip-accepted").length;
  const flaky = rows.filter((r) => r.outcome === "flaky").length;
  console.log(`eval-golden: ${rows.length} cases · ${rows.length - fails - flaky} pass · ${fails} fail · ${flaky} flaky · ${flips} flip(s)`);

  if (firstRun || opts.updateBaseline) {
    fs.mkdirSync(path.dirname(opts.baseline), { recursive: true });
    fs.writeFileSync(opts.baseline, rows.map((r) => JSON.stringify({ id: r.id, outcome: r.outcome })).join("\n") + "\n");
    console.log(`baseline ${firstRun ? "written" : "updated"}: ${opts.baseline}`);
  } else {
    fs.writeFileSync(opts.baseline.replace(/\.jsonl$/, ".last.jsonl"), rows.map((r) => JSON.stringify({ id: r.id, outcome: r.outcome })).join("\n") + "\n");
  }

  if (fails > 0) return 1;
  if (flips > 0) { console.error(`FLIPS BLOCK: ${flips} case(s) flipped pass→fail — annotate or fix before SHIP`); return 1; }
  void stable;
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).then((code) => process.exit(code));
