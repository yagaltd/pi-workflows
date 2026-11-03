#!/usr/bin/env node
// eval-orchestration — batched Jev rubric judgment of representative dispatch
// packs (plan 20261102-052 T1; judge-client pattern: plan 20261025-029/017).
//
// Measures the ORCHESTRATION SURFACE — the dispatch prompts themselves, not
// the workers' output: "prompts that scored well at launch quietly got
// worse" is the defect class this catches. Five fixture packs in
// fixtures/evals/packs/ (real dispatch shapes: Role header, GUARD step,
// context pack, boundaries, budget, verify, report format; two packs
// deliberately defective) are judged per rubric dimension with one
// judge.mjs ask() per pack (≤ QUESTION_CAP questions). Scores append to
// .workflows/evals/orchestration/history.jsonl — one row per git revision,
// committed data — and kaizen triggers fire from threshold rules.
//
// Trigger rules (pure, thresholds in fixtures/evals/thresholds.json):
//   daily-kaizen — exactly one dimension newly below floor (previous >=
//                  floor) AND overall drop <= drift
//   kaizen-event — any dimension below floor in `consecutive` consecutive
//                  entries, OR >=2 dimensions below floor in one run, OR
//                  overall drop > drift
//   stable       — else
//
// Measurement outcomes ALWAYS exit 0. Usage/input errors exit 2. Missing
// key → loud JUDGE SKIPPED, exit 0, NO history row (NO-JUDGE degradation,
// plan-017 D2 — never block, never fabricate).
//
// Usage:
//   node scripts/eval-orchestration.mjs [--packs DIR] [--rubric FILE]
//        [--thresholds FILE] [--history FILE]
//   (defaults: fixtures/evals/{packs,rubric.json,thresholds.json},
//    .workflows/evals/orchestration/history.jsonl)

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ask as judgeAsk, QUESTION_CAP } from "./judge.mjs";

// ── CLI ──────────────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const opts = {
    packs: "fixtures/evals/packs",
    rubric: "fixtures/evals/rubric.json",
    thresholds: "fixtures/evals/thresholds.json",
    history: ".workflows/evals/orchestration/history.jsonl",
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const val = argv[i + 1];
    if (flag === "--packs" || flag === "--rubric" || flag === "--thresholds" || flag === "--history") {
      if (val === undefined) return { error: `flag ${flag} requires a value` };
      opts[flag.slice(2)] = val;
      i++;
    } else {
      return { error: `unknown argument: ${flag}` };
    }
  }
  return { opts };
}

// ── input loading (fail fast, loud — usage errors exit 2) ────────────────────

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${file}: ${e.message}`);
  }
}

export function loadPacks(dir) {
  if (!fs.existsSync(dir)) return { error: `packs dir not found: ${dir}` };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) return { error: `packs dir has no .json packs: ${dir}` };
  const packs = [];
  for (const f of files) {
    let p;
    try {
      p = readJson(path.join(dir, f));
    } catch (e) {
      return { error: e.message };
    }
    if (!p || typeof p.packText !== "string" || !p.packText.trim())
      return { error: `${f}: pack needs a non-empty packText (the literal dispatch prompt)` };
    if (typeof p.scenario !== "string" || !p.scenario.trim())
      return { error: `${f}: pack needs a scenario` };
    packs.push({ id: f.replace(/\.json$/, ""), scenario: p.scenario, roleContext: p.roleContext ?? "worker", packText: p.packText });
  }
  return { packs };
}

export function loadRubric(file) {
  let r;
  try {
    r = readJson(file);
  } catch (e) {
    return { error: e.message };
  }
  const dimensions = r?.dimensions;
  if (!dimensions || typeof dimensions !== "object" || Array.isArray(dimensions))
    return { error: `${file}: rubric needs a dimensions object` };
  const ids = [];
  for (const [dim, qs] of Object.entries(dimensions)) {
    if (!Array.isArray(qs) || qs.length === 0) return { error: `${file}: dimension ${dim} needs a non-empty question list` };
    for (const q of qs) {
      if (!q || typeof q.id !== "string" || !q.id.trim() || typeof q.question !== "string" || !q.question.trim())
        return { error: `${file}: dimension ${dim} question needs non-empty id + question` };
      ids.push(`${dim}:${q.id}`);
    }
  }
  const questionCount = ids.length;
  if (questionCount > QUESTION_CAP)
    return { error: `${file}: ${questionCount} questions exceeds the ${QUESTION_CAP}-question judge cap` };
  if (new Set(ids).size !== ids.length) return { error: `${file}: duplicate question ids in rubric` };
  return { rubric: { dimensions }, questionCount };
}

export function loadThresholds(file) {
  let t;
  try {
    t = readJson(file);
  } catch (e) {
    return { error: e.message };
  }
  const { floor, drift, consecutive } = t ?? {};
  const ok =
    typeof floor === "number" && floor > 0 && floor <= 1 &&
    typeof drift === "number" && drift >= 0 &&
    Number.isInteger(consecutive) && consecutive >= 2;
  if (!ok) return { error: `${file}: thresholds need floor (0,1], drift >= 0, consecutive int >= 2` };
  return { thresholds: { floor, drift, consecutive } };
}

// ── questions + scoring (pure) ───────────────────────────────────────────────

/** One question per rubric entry; each embeds the pack text so the judge can
    score the dispatch prompt standalone (evalkit prompt-embedding pattern). */
export function buildQuestions(pack, rubric) {
  const questions = [];
  for (const [dim, qs] of Object.entries(rubric.dimensions)) {
    for (const q of qs) {
      questions.push({
        id: `${dim}:${q.id}`,
        question: `${q.question}\n\nDispatch pack to judge:\n${pack.packText}`,
        schema: { type: "string", enum: ["yes", "no"] },
      });
    }
  }
  return questions;
}

/** Verdict rows → per-dimension pass ratios; overall = mean of dimensions.
    A missing answer is a fail — never silently excused. */
export function scoreAnswers(questions, rows) {
  const verdictById = new Map((rows ?? []).map((r) => [r.id, r.verdict]));
  const perDimension = {};
  const totals = {};
  for (const q of questions) {
    const dim = q.id.split(":")[0];
    totals[dim] = (totals[dim] ?? 0) + 1;
    if (verdictById.get(q.id) === "yes") perDimension[dim] = (perDimension[dim] ?? 0) + 1;
  }
  for (const [dim, total] of Object.entries(totals)) perDimension[dim] = (perDimension[dim] ?? 0) / total;
  const values = Object.values(perDimension);
  const overall = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return { perDimension, overall };
}

// ── trigger rules (pure — test-heavy) ────────────────────────────────────────

/** entries: ordered oldest→newest history rows [{perDimension, overall}];
    last entry is the current run. Returns "daily-kaizen" | "kaizen-event" | "stable". */
export function classifyTrigger(entries, thresholds) {
  const { floor, drift, consecutive } = thresholds;
  const cur = entries[entries.length - 1];
  const prev = entries.length >= 2 ? entries[entries.length - 2] : null;
  const below = Object.keys(cur.perDimension ?? {}).filter((d) => (cur.perDimension ?? {})[d] < floor);
  const drop = prev ? prev.overall - cur.overall : 0;

  if (below.length === 1 && prev) {
    const d = below[0];
    const prevVal = prev.perDimension?.[d];
    if (prevVal !== undefined && prevVal >= floor && drop <= drift) return "daily-kaizen";
  }
  if (below.length >= 2) return "kaizen-event";
  if (entries.length >= consecutive && below.length >= 1) {
    const window = entries.slice(-consecutive);
    const streak = below.some((d) => window.every((e) => e.perDimension?.[d] !== undefined && e.perDimension[d] < floor));
    if (streak) return "kaizen-event";
  }
  if (prev && drop > drift) return "kaizen-event";
  return "stable";
}

// ── history ──────────────────────────────────────────────────────────────────

export function appendHistory(file, row) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`);
}

export function lastHistoryRow(file) {
  try {
    const lines = fs.readFileSync(file, "utf8").split("\n").filter((l) => l.trim());
    if (lines.length === 0) return null;
    return JSON.parse(lines[lines.length - 1]);
  } catch {
    return null;
  }
}

// ── run ──────────────────────────────────────────────────────────────────────

const fmt = (v) => v.toFixed(2);
const sha = () => execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

export async function runOrchestration({
  packsDir = "fixtures/evals/packs",
  rubricFile = "fixtures/evals/rubric.json",
  thresholdsFile = "fixtures/evals/thresholds.json",
  historyFile = ".workflows/evals/orchestration/history.jsonl",
  askImpl = judgeAsk,
  shaImpl = sha,
  nowImpl = () => new Date().toISOString(),
  out = process.stdout,
  err = process.stderr,
} = {}) {
  const inputError = (msg) => {
    err.write(`EVAL ORCHESTRATION ERROR: ${msg}\n`);
    return 2;
  };

  const { packs, error: packsError } = loadPacks(packsDir);
  if (packsError) return inputError(packsError);
  const { rubric, error: rubricError } = loadRubric(rubricFile);
  if (rubricError) return inputError(rubricError);
  const { thresholds, error: thresholdsError } = loadThresholds(thresholdsFile);
  if (thresholdsError) return inputError(thresholdsError);

  // One ask() per pack (≤ QUESTION_CAP each). Muted per-ask stdout — the run
  // prints compact ratios itself; judge skip lines still surface on stderr.
  const mute = { write: () => {} };
  const packScores = [];
  const skippedPacks = [];
  for (const pack of packs) {
    const questions = buildQuestions(pack, rubric);
    const r = await askImpl({ questions, out: mute, err });
    if (r?.skipped || r?.status !== 0) {
      skippedPacks.push(pack.id);
      continue;
    }
    const s = scoreAnswers(questions, r.verdict ?? []);
    packScores.push({ id: pack.id, ...s });
    out.write(`pack ${pack.id}: ` +
      Object.entries(s.perDimension).map(([d, v]) => `${d}=${fmt(v)}`).join(" ") +
      ` overall=${fmt(s.overall)}\n`);
  }

  // NO-JUDGE degradation: any skipped pack makes the run incomplete — loud
  // skip, exit 0, and NO history row (scores must never fabricate coverage).
  if (skippedPacks.length > 0) {
    err.write(`JUDGE SKIPPED (judge skipped for ${skippedPacks.length}/${packs.length} packs: ${skippedPacks.join(", ")}) — no history row appended\n`);
    return 0;
  }

  const dims = Object.keys(packScores[0].perDimension);
  const perDimension = Object.fromEntries(dims.map((d) => [
    d,
    packScores.reduce((a, p) => a + p.perDimension[d], 0) / packScores.length,
  ]));
  const overall = Object.values(perDimension).reduce((a, b) => a + b, 0) / dims.length;
  const row = { sha: shaImpl(), timestamp: nowImpl(), perDimension, overall };
  const previous = lastHistoryRow(historyFile);
  appendHistory(historyFile, row);

  out.write(`sha=${row.sha} timestamp=${row.timestamp} overall=${fmt(overall)} (mean of ${packScores.length} packs)\n`);
  out.write(`per-dimension: ${dims.map((d) => `${d}=${fmt(perDimension[d])}`).join(" ")}\n`);
  if (!previous) {
    out.write(`trigger: stable (first history row — baseline set; next run compares against it)\n`);
    return 0;
  }
  const trigger = classifyTrigger([previous, row], thresholds);
  const below = dims.filter((d) => perDimension[d] < thresholds.floor);
  const drop = previous.overall - overall;
  if (trigger === "stable") {
    out.write(`trigger: stable (no dimension below floor ${fmt(thresholds.floor)}; overall drift ${fmt(drop)} vs previous ≤ drift ${fmt(thresholds.drift)})\n`);
  } else if (trigger === "daily-kaizen") {
    const d = below[0];
    out.write(`trigger: daily-kaizen (${d} dipped below floor ${fmt(thresholds.floor)}: ${fmt(previous.perDimension[d] ?? 0)} → ${fmt(perDimension[d])}; overall drop ${fmt(drop)} ≤ drift ${fmt(thresholds.drift)})\n`);
  } else {
    const evidence = [];
    if (below.length >= 2) evidence.push(`${below.length} dimensions below floor ${fmt(thresholds.floor)} in one run: ${below.join(", ")}`);
    const streak = below.filter((d) => (previous.perDimension?.[d] ?? 1) < thresholds.floor);
    if (streak.length) evidence.push(`below floor in 2 consecutive entries: ${streak.join(", ")} (${streak.map((d) => fmt(previous.perDimension[d])).join(", ")} → ${streak.map((d) => fmt(perDimension[d])).join(", ")})`);
    if (drop > thresholds.drift) evidence.push(`overall drop ${fmt(drop)} > drift ${fmt(thresholds.drift)}`);
    out.write(`trigger: kaizen-event (${evidence.join("; ")})\n`);
  }
  return 0;
}

// ── commands ─────────────────────────────────────────────────────────────────

async function main(argv) {
  const { opts, error } = parseArgs(argv);
  if (error) {
    process.stderr.write(`EVAL ORCHESTRATION ERROR: ${error}\n` +
      "usage: eval-orchestration.mjs [--packs DIR] [--rubric FILE] [--thresholds FILE] [--history FILE]\n");
    return 2;
  }
  return runOrchestration(opts);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main(process.argv.slice(2));
}
