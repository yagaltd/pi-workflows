// bench-intake-triage — the EVAL-SLICE measurement harness for the ship-flow
// intake triage (plan 20261117-076 Phase 1). Two modes:
//
//   eval    — replay the 12-finding fixture slice against one or more judge
//             backends and report per-backend accuracy. Default backend is
//             the recorded-fixture replay (deterministic, no key, no net);
//             --live swaps in the real TypeLLM transport when
//             TYPELLM_API_KEY is present. This is the Phase-2 gate
//             instrument: Phase 2 (Jev sieve vs TypeLLM) is decided on the
//             per-backend numbers this prints.
//
//   triage  — classify worker findings at ship time through the same seam:
//             `--findings <file>` (JSON array of strings, or JSONL with a
//             `finding` field). Advisory like the other ship-flow judge
//             passes: prints the triage table, exit 0. Skips print LOUD
//             (JUDGE SKIPPED) and stay in the default path.
//
// Usage:
//   bun scripts/bench-intake-triage.ts eval [--live]
//   bun scripts/bench-intake-triage.ts triage --findings <file>
//
// Exit: eval 0 · triage 0 (advisory) · usage 2.
//
// The probe imports the shipped triage; it never re-implements classification.
import fs from "node:fs";
import {
  TRIAGE_BUCKETS,
  TRIAGE_CONFIDENCE_FLOOR,
  TRIAGE_SCHEMA,
  makeTypellmBackend,
  renderTriageTable,
  triageFinding,
  type JudgeBackend,
  type TriageBucket,
  type TriageResult,
} from "../extensions/index.ts";

export interface TriageFixture {
  id: string;
  finding: string;
  expected: TriageBucket;
}

/** The EVAL-SLICE: 12 worker findings with the 071 bucket ground truth
 *  (queued = P0–P2 owner queue · batched = P3 bundle · closed = deleted
 *  with why · done = already fixed). Realistic shapes from the review
 *  flow's Stage-2 output rows. */
export const FIXTURES: TriageFixture[] = [
  { id: "f01", finding: "README install command 404s — the curl line references a retired v0.9 tag", expected: "queued" },
  { id: "f02", finding: "test fixture carries live-shaped API key material — rotate and redact", expected: "queued" },
  { id: "f03", finding: "docs still mention the retired gitleaks gate as active", expected: "queued" },
  { id: "f04", finding: "ship path swallows write failures — errors are caught and never surfaced", expected: "queued" },
  { id: "f05", finding: "three P3 comment-spacing nits across scripts/*, same shape", expected: "batched" },
  { id: "f06", finding: "naming drift: 'sieve' vs 'gate' for the same mechanism across two prompts", expected: "batched" },
  { id: "f07", finding: "changelog heading style inconsistent across older entries only", expected: "batched" },
  { id: "f08", finding: "typo in a code comment — 'recieve'", expected: "closed" },
  { id: "f09", finding: "duplicate helper left from an earlier refactor — dead code, delete with one line why", expected: "closed" },
  { id: "f10", finding: "memory leak in the watchdog — fixed by the task-3 dedupe patch", expected: "done" },
  { id: "f11", finding: "flaky queue test — resolved by the retry pin in task 2", expected: "done" },
  { id: "f12", finding: "074 key pin verified — no key material in README, nothing to do", expected: "done" },
];

/** Recorded-fixture backend: replays the slice's ground truth. Deterministic,
 *  keyless, network-free — the default eval mode. Unknown input is a LOUD
 *  skip (the recorded replay never invents an answer). */
export function recordedBackend(): JudgeBackend {
  const byFinding = new Map(FIXTURES.map((f) => [f.finding, f]));
  return {
    name: "typellm-recorded",
    async classify(schema, input) {
      const f = byFinding.get(input);
      if (!f)
        return {
          skipped: true,
          bucket: null,
          confidence: 0,
          reason: "recorded fixture replay: input is not in the fixture slice",
        };
      return { skipped: false, bucket: f.expected, confidence: 0.9, evidence: `recorded:${f.id}` };
    },
  };
}

/** The real TypeLLM transport through the seam — the live eval/triage mode. */
export function liveBackend(): JudgeBackend {
  return makeTypellmBackend();
}

export interface BackendScore {
  name: string;
  correct: number;
  total: number;
  skipped: number;
  accuracy: number;
}

/** Score one backend against the slice. A skip is NEVER a pass: skipped rows
 *  count as not-correct and are reported separately (loud-skip doctrine). */
export async function evalBackend(
  backend: JudgeBackend,
  fixtures: TriageFixture[] = FIXTURES
): Promise<BackendScore> {
  let correct = 0;
  let skipped = 0;
  for (const f of fixtures) {
    const v = await backend.classify(TRIAGE_SCHEMA, f.finding);
    if (v.skipped) {
      skipped++;
      continue;
    }
    if (v.bucket === f.expected) correct++;
  }
  return {
    name: backend.name,
    correct,
    total: fixtures.length,
    skipped,
    accuracy: fixtures.length ? correct / fixtures.length : 0,
  };
}

/** Per-backend rows — the Phase-2 comparison shape (typellm today, a Jev
 *  backend slots into the same table without harness changes). */
export async function evalBackends(
  backends: JudgeBackend[],
  fixtures: TriageFixture[] = FIXTURES
): Promise<BackendScore[]> {
  const rows: BackendScore[] = [];
  for (const b of backends) rows.push(await evalBackend(b, fixtures));
  return rows;
}

function scoreLines(rows: BackendScore[]): string[] {
  const lines = [
    "backend              correct/total  skipped  accuracy   (floor "
      + TRIAGE_CONFIDENCE_FLOOR + " · buckets " + TRIAGE_BUCKETS.join("/") + ")",
  ];
  for (const r of rows) {
    const name = r.name.padEnd(20);
    const frac = `${r.correct}/${r.total}`.padEnd(13);
    const skip = String(r.skipped).padEnd(8);
    lines.push(`${name} ${frac} ${skip} ${(r.accuracy * 100).toFixed(1)}%`);
  }
  return lines;
}

/** Findings file: JSON array of strings, or JSONL rows carrying `finding`. */
export function loadFindings(file: string): string[] {
  const raw = fs.readFileSync(file, "utf8");
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    const arr = JSON.parse(trimmed);
    if (!Array.isArray(arr) || !arr.every((x) => typeof x === "string" && x.trim()))
      throw new Error("findings file must be a JSON array of non-empty strings");
    return arr;
  }
  const rows = trimmed
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
  if (!rows.every((r: any) => typeof r?.finding === "string" && r.finding.trim()))
    throw new Error("findings JSONL rows must carry a non-empty string `finding` field");
  return rows.map((r: any) => r.finding as string);
}

async function cmdEval(argv: string[]): Promise<number> {
  const live = argv.includes("--live");
  const backend = live ? liveBackend() : recordedBackend();
  const rows = await evalBackends([backend]);
  console.log(`intake-triage eval (EVAL-SLICE, plan 20261117-076) — ${live ? "LIVE typellm" : "recorded fixtures"}`);
  for (const line of scoreLines(rows)) console.log(line);
  if (live) {
    const r = rows[0];
    if (r.skipped === r.total)
      console.error(
        `JUDGE SKIPPED (all ${r.total} rows skipped — check TYPELLM_API_KEY / endpoint; skips are never passes)`
      );
  }
  return 0;
}

async function cmdTriage(argv: string[]): Promise<number> {
  let file: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--findings") file = argv[++i] ?? null;
    else {
      console.error(`usage error: unknown argument ${argv[i]}`);
      return 2;
    }
  }
  if (!file) {
    console.error("usage: bun scripts/bench-intake-triage.ts triage --findings <file>");
    return 2;
  }
  const findings = loadFindings(file);
  const backend = liveBackend();
  const results: TriageResult[] = [];
  for (const finding of findings) results.push(await triageFinding(backend, finding));
  console.log(renderTriageTable(results));
  const defaultPath = results.filter((r) => r.defaultPath);
  if (defaultPath.length)
    for (const r of defaultPath)
      console.error(
        `JUDGE SKIPPED (${r.reason ?? "below confidence floor"}) — finding stays in the default path`
      );
  const triaged = results.length - defaultPath.length;
  console.log(
    `intake triage: ${triaged}/${results.length} triaged, ${defaultPath.length} in the default path (floor ${TRIAGE_CONFIDENCE_FLOOR})`
  );
  return 0;
}

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case "eval":
      return await cmdEval(rest);
    case "triage":
      return await cmdTriage(rest);
    default:
      console.error("usage: bun scripts/bench-intake-triage.ts eval [--live] | triage --findings <file>");
      return 2;
  }
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
