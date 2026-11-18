// bench-intake-triage — the EVAL-SLICE measurement harness for the ship-flow
// intake triage and the review Tier-1 verdicts (plan 20261117-076). Modes:
//
//   eval     — replay the 12-finding fixture slice against one or more judge
//              backends and report per-backend accuracy. Default backend is
//              the recorded-fixture replay (deterministic, no key, no net);
//              --live swaps in the real TypeLLM transport when
//              TYPELLM_API_KEY is present. This is the Phase-2 gate
//              instrument: Phase 2 (Jev sieve vs TypeLLM) is decided on the
//              per-backend numbers this prints.
//
//   verdicts — TWO shapes. Fixture eval (default, `--live` for the real
//              transport): replay the review-verdict fixture slice (content-
//              fact scenarios + diff summaries with expected pass/fail/
//              uncertain) and report per-backend accuracy — the Phase-2
//              measurement instrument. Phase 3 adds harness MODES over the
//              same fixtures: `--mode per-scenario|batched|batched-dag|all`
//              reports accuracy + API call count + wall latency per mode
//              (precision decides the default). Review-time
//              (`--scenarios <file> --diff <file>`): run Tier-1 verdicts for
//              real review input and print the verdict table; ADVISORY —
//              routing only, never a verdict; the reviewer subagent still
//              runs ALWAYS.
//
//   modes    — the full Phase-3 comparison table: all three modes on the
//              SAME fixture slice, one row each (accuracy, calls, wallMs).
//
//   triage   — classify worker findings at ship time through the same seam:
//              `--findings <file>` (JSON array of strings, or JSONL with a
//              `finding` field). Advisory like the other judge passes:
//              prints the triage table, exit 0. Skips print LOUD
//              (JUDGE SKIPPED) and stay in the default path.
//
// Usage:
//   bun scripts/bench-intake-triage.ts eval [--live]
//   bun scripts/bench-intake-triage.ts verdicts [--live]
//   bun scripts/bench-intake-triage.ts verdicts [--live] --mode per-scenario|batched|batched-dag|all
//   bun scripts/bench-intake-triage.ts verdicts --scenarios <file> --diff <file>
//   bun scripts/bench-intake-triage.ts modes [--live]
//   bun scripts/bench-intake-triage.ts triage --findings <file>
//
// Exit: eval/verdicts 0 · triage 0 (advisory) · usage 2.
//
// The probe imports the shipped triage + verdict runner; it never
// re-implements classification.
import fs from "node:fs";
import {
  TRIAGE_BUCKETS,
  TRIAGE_CONFIDENCE_FLOOR,
  TRIAGE_SCHEMA,
  REVIEW_VERDICTS,
  REVIEW_VERDICT_SCHEMA,
  DECOMPOSE_INPUT_MARKER,
  REVIEW_CONTEXT_WINDOW,
  makeTypellmBackend,
  renderTriageTable,
  renderVerdictTable,
  reviewVerdicts,
  reviewVerdictsBatched,
  reviewVerdictsDag,
  scenarioInput,
  triageFinding,
  type JudgeBackend,
  type ReviewScenario,
  type ReviewVerdict,
  type ReviewVerdictResult,
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

/* ── verdict mode (plan 20261117-076 Phase 2): review-verdict fixtures ── */

export interface VerdictFixture {
  id: string;
  scenario: ReviewScenario;
  diffSummary: string;
  expected: ReviewVerdict;
}

/** The review-verdict EVAL-SLICE: content-fact scenarios + the diff summary
 *  they are judged against, with ground-truth verdicts (pass = the evidence
 *  satisfies the claim · fail = it visibly contradicts it · uncertain = the
 *  evidence cannot decide — exactly the Tier-1/Tier-2 boundary). */
export const VERDICT_FIXTURES: VerdictFixture[] = [
  {
    id: "v01",
    scenario: { id: "S1", claim: "The report's claim that all spec scenarios pass matches the diff's test changes." },
    diffSummary: "tests/dispatch-parse.test.ts adds 4 cases covering the new colon-tolerant parser; spec task-3 scenarios map 1:1 onto them.",
    expected: "pass",
  },
  {
    id: "v02",
    scenario: { id: "S2", claim: "README lines changed in the diff match the code's actual behavior." },
    diffSummary: "README documents `--format json` for ship-diagram; the diff's ship-diagram.mjs has no --format flag and no JSON path.",
    expected: "fail",
  },
  {
    id: "v03",
    scenario: { id: "S3", claim: "The new test pins assert what their scenarios claim (non-vacuous)." },
    diffSummary: "test asserts expect(rows.length).toBe(2) after seeding exactly 2 rows and asserting intermediate state first.",
    expected: "pass",
  },
  {
    id: "v04",
    scenario: { id: "S1", claim: "The report's claim that tests cover the new verify line matches the diff." },
    diffSummary: "report claims coverage for the new CLI flag; the diff adds the flag to cli.ts but touches no test file.",
    expected: "fail",
  },
  {
    id: "v05",
    scenario: { id: "S4", claim: "Version/CHANGELOG claims in the diff are truthful (no stale version strings)." },
    diffSummary: "CHANGELOG entry names v0.15.12; package.json version is 0.15.12; cli.ts --version derives from package.json.",
    expected: "pass",
  },
  {
    id: "v06",
    scenario: { id: "S3", claim: "The new test pins assert what their scenarios claim (non-vacuous)." },
    diffSummary: "test imports the module and asserts expect(true).toBe(true) beside a commented-out real assertion.",
    expected: "fail",
  },
  {
    id: "v07",
    scenario: { id: "S2", claim: "Docs lines changed in the diff match the code's actual behavior." },
    diffSummary: "docs mention a retry cap of 3; the diff sets retries = 3 in one path and 5 in another; the doc's singular claim may match either.",
    expected: "uncertain",
  },
  {
    id: "v08",
    scenario: { id: "S1", claim: "The report's claim that boundaries are respected matches the diff." },
    diffSummary: "report says only agents/worker.md changed; the summary shows changes to agents/worker.md plus one test file inside Allowed; nothing outside Allowed is visible.",
    expected: "uncertain",
  },
];

/** Recorded verdict backend: replays the verdict slice's ground truth.
 *  Deterministic, keyless, network-free. Understands ALL THREE Phase-3 call
 *  shapes over the same fixture slice: the Phase-2 per-scenario input, the
 *  batch body (flat per-scenario keys), and the decompose call (one group
 *  covering every scenario present). Unknown input is a LOUD skip. */
export function recordedVerdictBackend(): JudgeBackend {
  const byInput = new Map(
    VERDICT_FIXTURES.map((f) => [scenarioInput(f.scenario, f.diffSummary), f])
  );
  const byId = new Map(VERDICT_FIXTURES.map((f) => [f.id, f]));
  const skip = (why: string) => ({
    skipped: true,
    bucket: null as null,
    confidence: 0,
    reason: why,
  });
  const idsPresent = (input: string): string[] => {
    const ids = [...new Set([...input.matchAll(/Scenario ([A-Za-z0-9_-]+):/g)].map((m) => m[1]))];
    return ids.filter((id) => byId.has(id));
  };
  return {
    name: "typellm-recorded-verdicts",
    async classify(schema, input) {
      const legacy = byInput.get(input);
      if (legacy)
        return {
          skipped: false,
          bucket: null,
          value: { verdict: legacy.expected, confidence: 0.9, evidence: `recorded:${legacy.id}` },
          confidence: 0.9,
          evidence: `recorded:${legacy.id}`,
        };
      if (input.includes(DECOMPOSE_INPUT_MARKER)) {
        const ids = idsPresent(input);
        if (!ids.length) return skip("recorded fixture replay: no fixture scenarios in the decompose input");
        return {
          skipped: false,
          bucket: null,
          value: { decomposition: JSON.stringify({ groups: [{ id: "J1", scenarios: ids, depends_on: [] }] }) },
          confidence: 0.9,
        };
      }
      const ids = idsPresent(input);
      if (!ids.length)
        return skip("recorded fixture replay: input is not in the verdict fixture slice");
      const out: Record<string, unknown> = {};
      for (const id of ids) {
        const f = byId.get(id)!;
        out[`${id}_verdict`] = f.expected;
        out[`${id}_confidence`] = 0.9;
        out[`${id}_evidence`] = `recorded:${f.id}`;
      }
      return { skipped: false, bucket: null, value: out, confidence: 0.9 };
    },
  };
}

export interface VerdictScore {
  name: string;
  correct: number;
  total: number;
  skipped: number;
  accuracy: number;
}

/** Score one backend against the verdict slice. A skip is NEVER a pass:
 *  skipped rows count as not-correct and are reported separately (loud-skip
 *  doctrine). An expected-uncertain fixture scores correct only when the
 *  backend honestly returns uncertain — a confident guess at pass/fail is
 *  scored as the miss it is. */
export async function evalVerdictBackend(
  backend: JudgeBackend,
  fixtures: VerdictFixture[] = VERDICT_FIXTURES
): Promise<VerdictScore> {
  let correct = 0;
  let skipped = 0;
  for (const f of fixtures) {
    const v = await backend.classify(REVIEW_VERDICT_SCHEMA, scenarioInput(f.scenario, f.diffSummary));
    if (v.skipped) {
      skipped++;
      continue;
    }
    if (v.value?.verdict === f.expected) correct++;
  }
  return {
    name: backend.name,
    correct,
    total: fixtures.length,
    skipped,
    accuracy: fixtures.length ? correct / fixtures.length : 0,
  };
}

/** Per-backend rows — the Phase-2 comparison table (typellm today, a Jev
 *  backend slots in without harness changes). */
export async function evalVerdictBackends(
  backends: JudgeBackend[],
  fixtures: VerdictFixture[] = VERDICT_FIXTURES
): Promise<VerdictScore[]> {
  const rows: VerdictScore[] = [];
  for (const b of backends) rows.push(await evalVerdictBackend(b, fixtures));
  return rows;
}

/* ── Phase-3 harness modes: per-scenario | batched | batched-dag ──
 *  Same fixtures, same accuracy scoring; calls + wall latency reported per
 *  mode — precision (accuracy) decides the default, cost is the tiebreaker. */

export type VerdictMode = "per-scenario" | "batched" | "batched-dag";
export const VERDICT_MODES: VerdictMode[] = ["per-scenario", "batched", "batched-dag"];

export interface VerdictModeScore extends VerdictScore {
  mode: VerdictMode;
  /** API calls actually made (counted at the seam, not assumed). */
  calls: number;
  /** Wall latency for the mode's whole eval pass, in ms. */
  wallMs: number;
}

/** Wrap a backend so the harness counts REAL classify invocations. */
function countingBackend(backend: JudgeBackend): { backend: JudgeBackend; count: () => number } {
  let calls = 0;
  return {
    backend: {
      name: backend.name,
      async classify(schema, input) {
        calls++;
        return backend.classify(schema, input);
      },
    },
    count: () => calls,
  };
}

/** Run one harness mode over the fixture slice and score accuracy + calls +
 *  wall latency. A skip is NEVER a pass in any mode (loud-skip doctrine). */
export async function evalVerdictMode(
  mode: VerdictMode,
  backend: JudgeBackend,
  fixtures: VerdictFixture[] = VERDICT_FIXTURES
): Promise<VerdictModeScore> {
  const { backend: counted, count } = countingBackend(backend);
  const t0 = Date.now();
  let correct = 0;
  let skipped = 0;
  if (mode === "per-scenario") {
    // the Phase-2 pattern: one call per scenario, no cross-scenario context
    for (const f of fixtures) {
      const r = await reviewVerdicts(counted, [f.scenario], f.diffSummary);
      const v = r.results[0];
      if (!v || v.skipped) skipped++;
      else if (v.verdict === f.expected) correct++;
    }
  } else {
    // batch / batched-dag: the whole slice rides as few calls as the window
    // allows; each fixture's scenario id is its unique key
    const scenarios: ReviewScenario[] = fixtures.map((f) => ({ id: f.id, claim: f.scenario.claim }));
    const evidence = Object.fromEntries(fixtures.map((f) => [f.id, f.diffSummary]));
    const r =
      mode === "batched"
        ? await reviewVerdictsBatched(counted, scenarios, "", { evidence, window: REVIEW_CONTEXT_WINDOW })
        : await reviewVerdictsDag(counted, scenarios, "", { evidence, window: REVIEW_CONTEXT_WINDOW });
    for (const f of fixtures) {
      const v = r.results.find((x) => x.scenario === f.id);
      if (!v || v.skipped) skipped++;
      else if (v.verdict === f.expected) correct++;
    }
  }
  return {
    mode,
    name: backend.name,
    correct,
    total: fixtures.length,
    skipped,
    accuracy: fixtures.length ? correct / fixtures.length : 0,
    calls: count(),
    wallMs: Date.now() - t0,
  };
}

/** All three modes on the SAME fixture slice — the Phase-3 comparison table. */
export async function evalVerdictModes(
  backend: JudgeBackend,
  fixtures: VerdictFixture[] = VERDICT_FIXTURES
): Promise<VerdictModeScore[]> {
  const rows: VerdictModeScore[] = [];
  for (const mode of VERDICT_MODES) rows.push(await evalVerdictMode(mode, backend, fixtures));
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

/** Scenarios file: JSON array of {id, claim} rows or plain claim strings
 *  (ids auto-assigned S1..Sn). Bounded shape — the same grammar the review
 *  flow's Tier-1 step writes. */
export function loadScenarios(file: string): ReviewScenario[] {
  const raw = fs.readFileSync(file, "utf8").trim();
  const arr = JSON.parse(raw);
  if (!Array.isArray(arr) || arr.length === 0)
    throw new Error("scenarios file must be a non-empty JSON array");
  return arr.map((x: any, i: number) => {
    if (typeof x === "string" && x.trim()) return { id: `S${i + 1}`, claim: x.trim() };
    if (x && typeof x.id === "string" && x.id.trim() && typeof x.claim === "string" && x.claim.trim())
      return { id: x.id.trim(), claim: x.claim.trim() };
    throw new Error("scenarios rows must be non-empty strings or {id, claim} objects");
  });
}

function verdictScoreLines(rows: VerdictScore[]): string[] {
  const lines = [
    "backend              correct/total  skipped  accuracy   (floor "
      + TRIAGE_CONFIDENCE_FLOOR + " · verdicts " + REVIEW_VERDICTS.join("/") + ")",
  ];
  for (const r of rows) {
    const name = r.name.padEnd(20);
    const frac = `${r.correct}/${r.total}`.padEnd(13);
    const skip = String(r.skipped).padEnd(8);
    lines.push(`${name} ${frac} ${skip} ${(r.accuracy * 100).toFixed(1)}%`);
  }
  return lines;
}

function verdictModeLines(rows: VerdictModeScore[]): string[] {
  const lines = [
    "mode            correct/total  skipped  accuracy   calls  wallMs   (floor "
      + TRIAGE_CONFIDENCE_FLOOR + " · verdicts " + REVIEW_VERDICTS.join("/") + ")",
  ];
  for (const r of rows) {
    const mode = r.mode.padEnd(15);
    const frac = `${r.correct}/${r.total}`.padEnd(13);
    const skip = String(r.skipped).padEnd(8);
    const acc = `${(r.accuracy * 100).toFixed(1)}%`.padEnd(10);
    const calls = String(r.calls).padEnd(6);
    lines.push(`${mode} ${frac} ${skip} ${acc} ${calls} ${r.wallMs}`);
  }
  // precision decides the default; a tie on accuracy breaks to the fewest calls
  const best = rows.reduce((a, b) =>
    b.accuracy > a.accuracy || (b.accuracy === a.accuracy && b.calls < a.calls) ? b : a
  , rows[0]);
  lines.push(`default: ${best.mode} (precision decides — accuracy ${(best.accuracy * 100).toFixed(1)}% on ${best.calls} call(s))`);
  return lines;
}

async function cmdVerdicts(argv: string[]): Promise<number> {
  const live = argv.includes("--live");
  let scenariosFile: string | null = null;
  let diffFile: string | null = null;
  let mode: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--live") continue;
    if (argv[i] === "--scenarios") scenariosFile = argv[++i] ?? null;
    else if (argv[i] === "--diff") diffFile = argv[++i] ?? null;
    else if (argv[i] === "--mode") mode = argv[++i] ?? null;
    else {
      console.error(`usage error: unknown argument ${argv[i]}`);
      return 2;
    }
  }
  if (mode !== null && scenariosFile === null && diffFile === null) {
    // Phase-3 harness modes: same fixtures, accuracy + calls + wall per mode.
    if (mode !== "all" && !VERDICT_MODES.includes(mode as VerdictMode)) {
      console.error(`usage error: --mode must be one of ${VERDICT_MODES.join("|")}|all`);
      return 2;
    }
    const backend = live ? liveBackend() : recordedVerdictBackend();
    const rows =
      mode === "all"
        ? await evalVerdictModes(backend)
        : [await evalVerdictMode(mode as VerdictMode, backend)];
    console.log(
      `review-verdicts mode eval (plan 20261117-076 Phase 3) — ${mode} — ${live ? "LIVE typellm" : "recorded fixtures"}`
    );
    for (const line of verdictModeLines(rows)) console.log(line);
    const totalSkips = rows.reduce((n, r) => n + r.skipped, 0);
    if (live && totalSkips === rows.reduce((n, r) => n + r.total, 0))
      console.error(
        `JUDGE SKIPPED (all rows skipped across modes — check TYPELLM_API_KEY / endpoint; skips are never passes)`
      );
    return 0;
  }
  if (scenariosFile !== null || diffFile !== null) {
    if (!scenariosFile || !diffFile) {
      console.error("usage: bun scripts/bench-intake-triage.ts verdicts --scenarios <file> --diff <file>");
      return 2;
    }
    // Review-time shape: Tier-1 verdicts for real review input. ADVISORY —
    // routing only, never a verdict; the reviewer subagent still runs ALWAYS.
    const scenarios = loadScenarios(scenariosFile);
    const diffSummary = fs.readFileSync(diffFile, "utf8").trim();
    const backend = live ? liveBackend() : recordedVerdictBackend();
    const result: ReviewVerdictResult = await reviewVerdicts(backend, scenarios, diffSummary);
    console.log(renderVerdictTable(result));
    if (result.skippedAll)
      console.error(
        `JUDGE SKIPPED (${result.reason ?? "unspecified"}) — ALL scenarios route to Tier 2 deep-read`
      );
    else
      console.error(
        `Tier 1: ${result.results.length - result.deepRead.length}/${result.results.length} verdicts on the table; ` +
          `${result.deepRead.length} route to Tier 2 deep-read (floor ${TRIAGE_CONFIDENCE_FLOOR}). ` +
          "The judge never closes a review alone — the reviewer verifies intent."
      );
    return 0;
  }
  const backend = live ? liveBackend() : recordedVerdictBackend();
  const rows = await evalVerdictBackends([backend]);
  console.log(
    `review-verdicts eval (plan 20261117-076 Phase 2) — ${live ? "LIVE typellm" : "recorded fixtures"}`
  );
  for (const line of verdictScoreLines(rows)) console.log(line);
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
    case "verdicts":
      return await cmdVerdicts(rest);
    case "modes": {
      const live = rest.includes("--live");
      const backend = live ? liveBackend() : recordedVerdictBackend();
      const rows = await evalVerdictModes(backend);
      console.log(
        `review-verdicts mode comparison (plan 20261117-076 Phase 3) — ${live ? "LIVE typellm" : "recorded fixtures"}`
      );
      for (const line of verdictModeLines(rows)) console.log(line);
      return 0;
    }
    case "triage":
      return await cmdTriage(rest);
    default:
      console.error(
        "usage: bun scripts/bench-intake-triage.ts eval [--live] | verdicts [--live] [--mode per-scenario|batched|batched-dag|all] | verdicts --scenarios <file> --diff <file> | modes [--live] | triage --findings <file>"
      );
      return 2;
  }
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
