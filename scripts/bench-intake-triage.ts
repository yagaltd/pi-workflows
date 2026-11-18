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
// Plan 077 modes (each has a fixture eval + a review-time/advisory shape;
// skips are counted loudly, never scored as passes):
//
//   claims    — Task 2: claim verification against session turns. Fixture
//               eval by default; `--report <claims.json> --turns <turns.json>`
//               runs real input (the CALLER supplies the turns — the
//               flow-level seam; in-extension transcript access is limited,
//               reported per the plan).
//   logmining — Task 3: LOG → knowledge-promotion candidates (the 073
//               vocabulary; SIEVE candidates, never auto-promoted).
//               `--log <file>` mines a real LOG.
//   doctrine  — Task 4: incident → structured rule candidate. `--incident
//               <file>` extracts from a real incident text.
//   brief     — Task 5: the minimal per-task brief (AUGMENT-ONLY parity —
//               contract markers must survive extraction). `--plan <file>
//               --task <id>` extracts from a real plan.
//   specdraft — Task 6: draft .spec scenarios (status: draft — owner review
//               before agent-spec init; never written to specs/).
//               `--plan <file>` drafts from a real plan.
//
// Usage:
//   bun scripts/bench-intake-triage.ts eval [--live]
//   bun scripts/bench-intake-triage.ts verdicts [--live]
//   bun scripts/bench-intake-triage.ts verdicts [--live] --mode per-scenario|batched|batched-dag|all
//   bun scripts/bench-intake-triage.ts verdicts --scenarios <file> --diff <file>
//   bun scripts/bench-intake-triage.ts modes [--live]
//   bun scripts/bench-intake-triage.ts triage --findings <file>
//   bun scripts/bench-intake-triage.ts claims [--live] [--report <f> --turns <f>]
//   bun scripts/bench-intake-triage.ts logmining [--live] [--log <f>]
//   bun scripts/bench-intake-triage.ts doctrine [--live] [--incident <f>]
//   bun scripts/bench-intake-triage.ts brief [--live] [--plan <f> --task <id>]
//   bun scripts/bench-intake-triage.ts specdraft [--live] [--plan <f>]
//
// Exit: eval/verdicts 0 · triage 0 (advisory) · usage 2.
//
// The probe imports the shipped triage + verdict runner; it never
// re-implements classification.
import fs from "node:fs";
import {
  BATCH_HEADER_PREFIX,
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
  renderClaimDigest,
  reviewVerdicts,
  reviewVerdictsBatched,
  reviewVerdictsDag,
  scenarioInput,
  triageFinding,
  verifyClaims,
  mineLog,
  doctrineCandidate,
  extractTaskBrief,
  draftSpecScenarios,
  renderSpecDraft,
  type JudgeBackend,
  type ReviewScenario,
  type ReviewVerdict,
  type ReviewVerdictResult,
  type TriageBucket,
  type TriageResult,
  type ReportClaim,
  type SessionTurn,
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
 *  Deterministic, keyless, network-free. Understands ALL the runner call
 *  shapes over the same fixture slice (plan 077 T1 native surface): the
 *  Phase-2 per-scenario input, the BATCH body (native array-of-objects
 *  verdict rows with probabilities), and the decompose call (one group
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
      if (input.includes(BATCH_HEADER_PREFIX)) {
        // native array-of-objects batch answer (plan 077 T1)
        const ids = idsPresent(input);
        if (!ids.length)
          return skip("recorded fixture replay: input is not in the verdict fixture slice");
        const verdicts = ids.map((id) => {
          const f = byId.get(id)!;
          return {
            id,
            verdict: f.expected,
            confidence: 0.9,
            evidence: `recorded:${f.id}`,
            probabilities: { [f.expected]: 0.92 } as Record<string, number>,
          };
        });
        return { skipped: false, bucket: null, value: { verdicts }, confidence: 0.9 };
      }
      const ids = idsPresent(input);
      if (!ids.length)
        return skip("recorded fixture replay: input is not in the verdict fixture slice");
      return skip("recorded fixture replay: unscripted input shape");
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

/* ── plan 077 harness modes: Tasks 2-6 fixture slices ──
 * Each extraction/judgment task lands with its own fixture mode reporting
 * accuracy/precision; a skip is NEVER scored as a pass (loud-skip doctrine).
 * All modes run the recorded replay by default (deterministic, keyless,
 * network-free); --live swaps in the real transport when TYPELLM_API_KEY is
 * present. All modes are ADVISORY (exit 0): the sieve, the reviewer and the
 * owner close — the judge never does. */

/* ── claims mode (Task 2): claim verification against session turns ── */

export interface ClaimFixture {
  id: string;
  report: string;
  turns: SessionTurn[];
  claims: ReportClaim[];
  /** Expected verdict per claim index (0-based). */
  expected: Record<number, "TRUE" | "FALSE" | "UNVERIFIABLE">;
}

export const CLAIMS_FIXTURES: ClaimFixture[] = [
  {
    id: "cf01",
    report: "Tests pass 40/0; README untouched; the drift gate exits 0.",
    turns: [
      { role: "assistant", text: "Ran bun test — 40 pass, 0 fail." },
      { role: "assistant", text: "Edited extensions/index.ts to add the seam." },
      { role: "assistant", text: "The drift gate exits 0 on the final state." },
    ],
    claims: [
      { claim: "Tests pass 40/0.", type: "test-result", sessionTurn: 0 },
      { claim: "README untouched.", type: "scope", sessionTurn: 1 },
      { claim: "The drift gate exits 0.", type: "gate", sessionTurn: 2 },
      { claim: "Docs updated for the seam.", type: "docs", sessionTurn: 9 },
    ],
    expected: { 0: "TRUE", 1: "FALSE", 2: "TRUE", 3: "FALSE" },
  },
  {
    id: "cf02",
    report: "Added the mining slice; benchmarked at 2 calls; opinion: the design is clean.",
    turns: [
      { role: "assistant", text: "Added logSlices with whole-line boundaries." },
      { role: "assistant", text: "Harness run: 2 calls for the 40-entry fixture." },
      { role: "assistant", text: "I think the design is clean." },
    ],
    claims: [
      { claim: "logSlices uses whole-line boundaries.", type: "implementation", sessionTurn: 0 },
      { claim: "Benchmarked at 2 calls.", type: "measurement", sessionTurn: 1 },
      { claim: "The design is clean.", type: "opinion", sessionTurn: 2 },
    ],
    expected: { 0: "TRUE", 1: "TRUE", 2: "UNVERIFIABLE" },
  },
  {
    id: "cf03",
    report: "No key material in README (074 pin verified); missing pointer claim.",
    turns: [{ role: "assistant", text: "Verified the 074 pin: no key material in README." }],
    claims: [
      { claim: "No key material in README.", type: "security", sessionTurn: 0 },
      { claim: "The key chain resolves env-side.", type: "config" } as ReportClaim,
    ],
    expected: { 0: "TRUE", 1: "FALSE" },
  },
];

/** Recorded claims backend: replays the claims fixtures' ground truth. The
 *  claim TEXT is the key (the runner sends `Claim Cn [type ...]: <claim>`
 *  lines over the transcript). Unknown claims are a LOUD skip. Wrong-pointer
 *  claims never reach a backend at all (deterministic pre-check). */
export function recordedClaimsBackend(): JudgeBackend {
  const byClaim = new Map<string, "TRUE" | "FALSE" | "UNVERIFIABLE">();
  for (const f of CLAIMS_FIXTURES)
    for (const [i, verdict] of Object.entries(f.expected))
      byClaim.set(f.claims[Number(i)].claim, verdict as "TRUE" | "FALSE" | "UNVERIFIABLE");
  return {
    name: "typellm-recorded-claims",
    async classify(_schema, input) {
      const ids = [...input.matchAll(/Claim (C\d+) \[type [^\]]+\] \(sessionTurn [^)]+\): (.*)$/gm)];
      if (!ids.length)
        return { skipped: true, bucket: null, confidence: 0, reason: "recorded replay: no claims in the input" };
      const rows: Record<string, unknown>[] = [];
      let unknown = false;
      for (const [, id, text] of ids) {
        const verdict = byClaim.get(text.trim());
        if (!verdict) {
          unknown = true;
          continue;
        }
        rows.push({ id, verdict, confidence: 0.9, evidence: "recorded" });
      }
      if (!rows.length)
        return { skipped: true, bucket: null, confidence: 0, reason: "recorded replay: claims not in the fixture slice" };
      void unknown;
      return { skipped: false, bucket: null, value: { claimVerdicts: rows }, confidence: 0.9 };
    },
  };
}

export interface ClaimsScore {
  name: string;
  correct: number;
  total: number;
  skipped: number;
  accuracy: number;
  bouncedToWorker: number;
  bouncedToReviewer: number;
}

/** Score claim verification over the fixture slice. A judge skip is NEVER a
 *  pass: skipped claims count as not-correct and are reported separately. */
export async function evalClaimsBackend(
  backend: JudgeBackend,
  fixtures: ClaimFixture[] = CLAIMS_FIXTURES
): Promise<ClaimsScore> {
  let correct = 0;
  let total = 0;
  let skipped = 0;
  let worker = 0;
  let reviewer = 0;
  for (const f of fixtures) {
    const r = await verifyClaims(backend, f.claims, f.turns);
    total += f.claims.length;
    for (const [i, expected] of Object.entries(f.expected)) {
      const claim = f.claims[Number(i)];
      const verified = r.verified.find((c) => c.claim === claim.claim);
      const bounced = r.bounced.find((c) => c.claim === claim.claim);
      const skipPath = !!bounced?.reason.includes("JUDGE SKIPPED");
      if (skipPath) {
        // a judge skip is NEVER scored as a pass — even when the verdict
        // vocabulary matches (the honest outcome came from the skip path)
        skipped++;
      } else if (String(expected) === "TRUE") {
        if (verified) correct++;
      } else if (bounced && bounced.verdict === expected) {
        correct++;
      }
      if (bounced?.route === "worker") worker++;
      if (bounced?.route === "reviewer") reviewer++;
    }
  }
  return {
    name: backend.name,
    correct,
    total,
    skipped,
    accuracy: total ? correct / total : 0,
    bouncedToWorker: worker,
    bouncedToReviewer: reviewer,
  };
}

/* ── logmining mode (Task 3): LOG → knowledge candidates ── */

export interface LogMiningFixture {
  id: string;
  log: string;
  /** Each expected row counts when a mined candidate's text includes it. */
  expectedCandidates: { includes: string; gateBinding: string }[];
}

export const LOGMINING_FIXTURES: LogMiningFixture[] = [
  {
    id: "lm01",
    log: [
      "2026-11-10 SHIP 076: the judge seam landed.",
      "2026-11-11 INCIDENT: docs-lint flagged three stale stamps — stamps must refresh on every docs edit (gate: docs-lint.sh).",
      "2026-11-12 LESSON: suite tests must use mkdtemp, never a shared tmpdir (gate: bun test).",
    ].join("\n"),
    expectedCandidates: [
      { includes: "stamps", gateBinding: "docs-lint.sh" },
      { includes: "mkdtemp", gateBinding: "bun test" },
    ],
  },
  {
    id: "lm02",
    log: [
      "2026-11-13 SHIP 077 T1: the native surface landed — flat-key code deleted.",
      "2026-11-14 NOTE: drift must stay CLEAN (gate: check-drift.sh) — caught twice this week.",
    ].join("\n"),
    expectedCandidates: [{ includes: "drift", gateBinding: "check-drift.sh" }],
  },
];

/** Recorded mining backend: replays the log fixtures' ground truth by
 *  matching the fixture log text. Unknown logs are a LOUD skip. */
export function recordedLogMiningBackend(): JudgeBackend {
  return {
    name: "typellm-recorded-mining",
    async classify(_schema, input) {
      const f = LOGMINING_FIXTURES.find((fx) => fx.log.split("\n").every((l) => input.includes(l.replace(/^\S*\s/, "")) || input.includes(l)));
      if (!f)
        return { skipped: true, bucket: null, confidence: 0, reason: "recorded replay: log not in the fixture slice" };
      const lines = [...input.matchAll(/\[log line (\d+)\] (.*)/g)];
      const rows = f.expectedCandidates.map((e, i) => {
        const line = lines.find(([, , text]) => text.toLowerCase().includes(e.includes.toLowerCase()));
        return {
          candidate: `Candidate: ${e.includes} (from fixture ${f.id})`,
          trigger: "when editing the bound surface",
          gateBinding: e.gateBinding,
          logTurn: line ? Number(line[1]) : 1,
          confidence: 0.9,
        };
      });
      return { skipped: false, bucket: null, value: { knowledge: rows }, confidence: 0.9 };
    },
  };
}

export interface MiningScore {
  name: string;
  expectedRows: number;
  found: number;
  candidates: number;
  precision: number;
  skipped: number;
  deferred: number;
}

/** Score LOG mining: precision = expected rows found / candidates produced
 *  (a candidate that matches nothing counts against precision); skips and
 *  deferred rows are reported, never scored as passes. */
export async function evalLogMiningBackend(
  backend: JudgeBackend,
  fixtures: LogMiningFixture[] = LOGMINING_FIXTURES
): Promise<MiningScore> {
  let expectedRows = 0;
  let found = 0;
  let candidates = 0;
  let skipped = 0;
  let deferred = 0;
  for (const f of fixtures) {
    const r = await mineLog(backend, f.log);
    expectedRows += f.expectedCandidates.length;
    candidates += r.candidates.length;
    deferred += r.deferred.length;
    if (r.skippedAll) skipped++;
    for (const e of f.expectedCandidates) {
      const hit = r.candidates.find(
        (c) => c.candidate.toLowerCase().includes(e.includes.toLowerCase()) && c.gateBinding === e.gateBinding
      );
      if (hit) found++;
    }
  }
  return {
    name: backend.name,
    expectedRows,
    found,
    candidates,
    precision: candidates ? found / candidates : 0,
    skipped,
    deferred,
  };
}

/* ── doctrine mode (Task 4): incident → structured rule candidate ── */

export interface DoctrineFixture {
  id: string;
  incident: string;
  expectedRuleIncludes: string;
  expectedGate: string;
}

export const DOCTRINE_FIXTURES: DoctrineFixture[] = [
  {
    id: "df01",
    incident:
      "INCIDENT: a worker edited templates/DOCS-POLICY.md outside its Allowed Changes. RULE: containment violations are reported, never fixed (gate: agents/registry.md).",
    expectedRuleIncludes: "reported, never fixed",
    expectedGate: "agents/registry.md",
  },
  {
    id: "df02",
    incident:
      "INCIDENT: a stale generated_at stamp shipped. RULE: docs stamps refresh on every docs edit (gate: docs-lint.sh).",
    expectedRuleIncludes: "stamps refresh",
    expectedGate: "docs-lint.sh",
  },
];

/** Recorded doctrine backend: replays the incident fixtures by marker. */
export function recordedDoctrineBackend(): JudgeBackend {
  return {
    name: "typellm-recorded-doctrine",
    async classify(schema, incident) {
      const f = DOCTRINE_FIXTURES.find((fx) => incident.includes(fx.incident));
      if (!f)
        return { skipped: true, bucket: null, confidence: 0, reason: "recorded replay: incident not in the fixture slice" };
      void schema;
      return {
        skipped: false,
        bucket: null,
        value: {
          rule: `Incident rule: ${f.expectedRuleIncludes}`,
          trigger: "when the incident's situation recurs",
          gateBinding: f.expectedGate,
          confidence: 0.9,
        },
        confidence: 0.9,
      };
    },
  };
}

export interface DoctrineScore {
  name: string;
  correct: number;
  total: number;
  skipped: number;
  accuracy: number;
}

/** Score doctrine extraction: a candidate counts when its rule includes the
 *  expected phrase AND the gate binding matches. Skips are never passes. */
export async function evalDoctrineBackend(
  backend: JudgeBackend,
  fixtures: DoctrineFixture[] = DOCTRINE_FIXTURES
): Promise<DoctrineScore> {
  let correct = 0;
  let skipped = 0;
  for (const f of fixtures) {
    const r = await doctrineCandidate(backend, f.incident);
    if (r.skipped) {
      skipped++;
      continue;
    }
    if (
      r.candidate &&
      r.candidate.rule.toLowerCase().includes(f.expectedRuleIncludes.toLowerCase()) &&
      r.candidate.gateBinding === f.expectedGate
    )
      correct++;
  }
  return { name: backend.name, correct, total: fixtures.length, skipped, accuracy: fixtures.length ? correct / fixtures.length : 0 };
}

/* ── brief mode (Task 5): the minimal per-task brief, augment-only parity ── */

export interface BriefFixture {
  id: string;
  plan: string;
  taskId: string;
  /** Contract markers (paths, deliverables) that must survive extraction —
   *  the parity proof: the brief carries what the full doc carries. */
  expectedMarkers: string[];
}

export const BRIEF_FIXTURES: BriefFixture[] = [
  {
    id: "bf01",
    plan: [
      "# Plan 902",
      "### Task 1",
      "Deliverable: rewrite scripts/closeout.mjs queue section.",
      "Allowed Changes: scripts/closeout.mjs, tests/closeout-queue.test.ts",
      "Boundary: never touch templates/.",
      "### Task 2",
      "Deliverable: docs sweep across skills/.",
    ].join("\n"),
    taskId: "1",
    expectedMarkers: ["scripts/closeout.mjs", "tests/closeout-queue.test.ts", "templates/"],
  },
  {
    id: "bf02",
    plan: [
      "# Plan 903",
      "### Task 3",
      "Deliverable: mine the LOG into sieve candidates.",
      "Allowed Changes: extensions/index.ts",
      "Gate: check-drift.sh stays clean.",
      "### Task 4",
      "Deliverable: docs row.",
    ].join("\n"),
    taskId: "3",
    expectedMarkers: ["extensions/index.ts", "check-drift.sh"],
  },
];

/** Recorded brief backend: derives the brief DETERMINISTICALLY from the
 *  slice text (Deliverable:/Allowed Changes:/Boundary:/Gate: lines) — the
 *  extraction contract replayed against its own input. */
export function recordedBriefBackend(): JudgeBackend {
  return {
    name: "typellm-recorded-brief",
    async classify(_schema, input) {
      const m = input.match(/Extract the minimal brief for Task (\S+)/);
      const slice = input.slice(input.indexOf("\n\n") + 2);
      if (!m)
        return { skipped: true, bucket: null, confidence: 0, reason: "recorded replay: not a brief call" };
      const deliverable = slice.match(/^Deliverable:\s*(.+)$/m)?.[1] ?? "";
      if (!deliverable)
        return { skipped: true, bucket: null, confidence: 0, reason: "recorded replay: no deliverable in the slice" };
      const allowed = slice.match(/^Allowed Changes:\s*(.+)$/m)?.[1] ?? "";
      const boundary = slice.match(/^Boundary:\s*(.+)$/m)?.[1] ?? "";
      const gate = slice.match(/^Gate:\s*(.+)$/m)?.[1] ?? "";
      return {
        skipped: false,
        bucket: null,
        value: {
          taskId: m[1],
          objective: deliverable,
          deliverables: [deliverable, ...allowed.split(/,\s*/).filter(Boolean)],
          constraints: [boundary, gate].filter(Boolean),
          confidence: 0.9,
        },
        confidence: 0.9,
      };
    },
  };
}

export interface BriefScore {
  name: string;
  correct: number;
  total: number;
  markers: number;
  markersFound: number;
  parity: number;
  skipped: number;
}

/** Score brief extraction on PARITY: every expected contract marker present
 *  in the full doc must be present in the brief (augment-only proof). A
 *  skipped extraction is never scored as a pass. */
export async function evalBriefBackend(
  backend: JudgeBackend,
  fixtures: BriefFixture[] = BRIEF_FIXTURES
): Promise<BriefScore> {
  let correct = 0;
  let skipped = 0;
  let markers = 0;
  let found = 0;
  for (const f of fixtures) {
    const r = await extractTaskBrief(backend, f.plan, f.taskId);
    if (r.skipped || !r.brief) {
      skipped++;
      markers += f.expectedMarkers.length;
      continue;
    }
    const briefText = [r.brief.objective, ...r.brief.deliverables, ...r.brief.constraints].join(" ");
    const allFound = f.expectedMarkers.every((mk) => {
      const hit = briefText.includes(mk);
      markers++;
      if (hit) found++;
      return hit;
    });
    if (allFound) correct++;
  }
  return {
    name: backend.name,
    correct,
    total: fixtures.length,
    markers,
    markersFound: found,
    parity: markers ? found / markers : 0,
    skipped,
  };
}

/* ── specdraft mode (Task 6): draft .spec scenarios + selector lint ── */

export interface SpecDraftFixture {
  id: string;
  plan: string;
  expectedScenarios: number;
}

export const SPECDRAFT_FIXTURES: SpecDraftFixture[] = [
  {
    id: "sf01",
    plan: [
      "# Plan 904 — the selector gate",
      "Task 1: add scripts/selector-gate.sh; it must reject empty quoted patterns.",
      "Task 2: pin the numeric -A6 acceptance in the gate's fixture.",
    ].join("\n"),
    expectedScenarios: 2,
  },
  {
    id: "sf02",
    plan: [
      "# Plan 905 — the stamp refresher",
      "Task 1: docs stamps refresh on edit; gate: docs-lint.sh must exit 0 after.",
    ].join("\n"),
    expectedScenarios: 1,
  },
];

/** Recorded spec-draft backend: one scenario per Task line in the plan
 *  (deterministic extraction replayed against its own input). */
export function recordedSpecDraftBackend(): JudgeBackend {
  return {
    name: "typellm-recorded-draft",
    async classify(_schema, input) {
      const tasks = [...input.matchAll(/Task \d+:\s*(.+)/g)].map((m) => m[1].trim());
      if (!tasks.length)
        return { skipped: true, bucket: null, confidence: 0, reason: "recorded replay: no task lines in the plan" };
      const scenarios = tasks.map((t, i) => ({
        name: `task ${i + 1} end state`,
        test: `bash -n scripts/selector-gate.sh`,
        given: `the plan task: ${t}`,
        when: "the gate parses the end state",
        then: "the gate exits 0",
      }));
      return {
        skipped: false,
        bucket: null,
        value: { name: "Draft spec", tags: ["draft"], intent: "Draft intent", scenarios, confidence: 0.9 },
        confidence: 0.9,
      };
    },
  };
}

/** Selector well-formedness — the SAME checks check-spec-selectors.sh
 *  enforces, parse-only: bash -n syntax, numeric context flags, non-empty
 *  patterns. Returns findings (empty = clean). */
export function lintSpecSelector(selector: string): string[] {
  const findings: string[] = [];
  if (!selector.trim()) return ["empty selector"];
  const r = Bun.spawnSync(["bash", "-n"], { input: `${selector}\n` });
  if (r.exitCode !== 0) findings.push(`shell syntax error in selector: ${selector}`);
  if (/(^|\s)-[ABC][^0-9\s]/.test(selector)) findings.push(`non-numeric context flag value: ${selector}`);
  if (/(^|\s)-[ABC]\s+([^0-9]|$)/.test(selector)) findings.push(`non-numeric or missing context flag value: ${selector}`);
  if (/(^|\s)(''|"")($|\s)/.test(selector)) findings.push(`empty quoted argument: ${selector}`);
  return findings;
}

export interface SpecDraftScore {
  name: string;
  correct: number;
  total: number;
  scenarioCountMisses: number;
  selectorFindings: number;
  skipped: number;
  accuracy: number;
}

/** Score spec drafting: the drafted scenario count must match the expected
 *  count AND every drafted Test selector must lint clean (parse-only).
 *  Skips are never passes. The draft itself is owner-review material. */
export async function evalSpecDraftBackend(
  backend: JudgeBackend,
  fixtures: SpecDraftFixture[] = SPECDRAFT_FIXTURES
): Promise<SpecDraftScore> {
  let correct = 0;
  let skipped = 0;
  let countMisses = 0;
  let selectorFindings = 0;
  for (const f of fixtures) {
    const r = await draftSpecScenarios(backend, f.plan);
    if (r.skipped) {
      skipped++;
      continue;
    }
    const countOk = r.draft.scenarios.length === f.expectedScenarios;
    if (!countOk) countMisses++;
    for (const s of r.draft.scenarios) {
      const findings = lintSpecSelector(s.test);
      selectorFindings += findings.length;
    }
    if (countOk && selectorFindings === 0) correct++;
  }
  return {
    name: backend.name,
    correct,
    total: fixtures.length,
    scenarioCountMisses: countMisses,
    selectorFindings,
    skipped,
    accuracy: fixtures.length ? correct / fixtures.length : 0,
  };
}

async function cmdClaims(argv: string[]): Promise<number> {
  const live = argv.includes("--live");
  const reportIdx = argv.indexOf("--report");
  const turnsIdx = argv.indexOf("--turns");
  if (reportIdx >= 0 || turnsIdx >= 0) {
    // Review-time shape (plan 077 T2 wiring): the CALLER supplies the turns
    // (the worker's session file, JSONL entry order) and the report's claims
    // (JSON array of {claim, type, sessionTurn}). The in-extension transcript
    // access is limited — this is the flow-level seam, reported per the plan.
    if (reportIdx < 0 || turnsIdx < 0 || !argv[reportIdx + 1] || !argv[turnsIdx + 1]) {
      console.error("usage: claims --report <claims.json> --turns <turns.json>");
      return 2;
    }
    const claims = JSON.parse(fs.readFileSync(argv[reportIdx + 1], "utf8")) as ReportClaim[];
    const turns = JSON.parse(fs.readFileSync(argv[turnsIdx + 1], "utf8")) as SessionTurn[];
    const backend = live ? liveBackend() : recordedClaimsBackend();
    const r = await verifyClaims(backend, claims, turns);
    console.log(renderClaimDigest(r));
    if (r.skippedAll)
      console.error(`CLAIM VERIFICATION SKIPPED — all claims bounce, none verified (${r.reason ?? "unspecified"})`);
    else
      console.error(
        `${r.verified.length} verified / ${r.bounced.length} bounced (worker: ${r.bounced.filter((b) => b.route === "worker").length}, reviewer: ${r.bounced.filter((b) => b.route === "reviewer").length})`
      );
    return 0;
  }
  const backend = live ? liveBackend() : recordedClaimsBackend();
  const rows = await evalClaimsBackend(backend);
  console.log(
    `claim verification eval (plan 077 T2) — ${live ? "LIVE typellm" : "recorded fixtures"}`
  );
  console.log(
    `${rows.name.padEnd(24)} ${`${rows.correct}/${rows.total}`.padEnd(13)} skipped=${String(rows.skipped).padEnd(5)} accuracy=${(rows.accuracy * 100).toFixed(1)}%  bounced(worker=${rows.bouncedToWorker}, reviewer=${rows.bouncedToReviewer})`
  );
  if (live && rows.skipped === rows.total)
    console.error("JUDGE SKIPPED (all rows skipped — check TYPELLM_API_KEY; skips are never passes)");
  return 0;
}

async function cmdLogMining(argv: string[]): Promise<number> {
  const live = argv.includes("--live");
  const logIdx = argv.indexOf("--log");
  if (logIdx >= 0) {
    const backend = live ? liveBackend() : recordedLogMiningBackend();
    const r = await mineLog(backend, fs.readFileSync(argv[logIdx + 1], "utf8"));
    console.log(
      `LOG mining candidates (plan 077 T3 — SIEVE CANDIDATES, never auto-promoted): ${r.candidates.length} found, ${r.deferred.length} deferred, ${r.slices} slice(s), ${r.abstainedSlices} abstention(s)`
    );
    for (const c of r.candidates)
      console.log(
        `- [log line ${c.logTurn}] ${c.candidate} (trigger: ${c.trigger}; gate: ${c.gateBinding}; confidence ${c.confidence})`
      );
    for (const d of r.deferred) console.log(`- DEFERRED: ${d.reason}`);
    if (r.skippedAll) console.error(r.reason ?? "JUDGE SKIPPED — mine the LOG by hand");
    return 0;
  }
  const backend = live ? liveBackend() : recordedLogMiningBackend();
  const rows = await evalLogMiningBackend(backend);
  console.log(`log-mining eval (plan 077 T3) — ${live ? "LIVE typellm" : "recorded fixtures"}`);
  console.log(
    `${rows.name.padEnd(24)} expected=${rows.expectedRows} found=${rows.found} candidates=${rows.candidates} precision=${(rows.precision * 100).toFixed(1)}%  skipped=${rows.skipped} deferred=${rows.deferred}`
  );
  if (rows.skipped)
    console.error("JUDGE SKIPPED on one or more fixtures — skips are never scored as passes");
  return 0;
}

async function cmdDoctrine(argv: string[]): Promise<number> {
  const live = argv.includes("--live");
  const incidentIdx = argv.indexOf("--incident");
  if (incidentIdx >= 0) {
    const backend = live ? liveBackend() : recordedDoctrineBackend();
    const r = await doctrineCandidate(backend, fs.readFileSync(argv[incidentIdx + 1], "utf8"));
    if (r.candidate)
      console.log(
        `doctrine candidate (SIEVE candidate — judged via the normal promotion path):\n- rule: ${r.candidate.rule}\n- trigger: ${r.candidate.trigger}\n- gateBinding: ${r.candidate.gateBinding}\n- confidence: ${r.candidate.confidence}`
      );
    else console.log(`no doctrine candidate (${r.reason ?? "unspecified"})`);
    if (r.skipped) console.error(r.reason ?? "JUDGE SKIPPED");
    return 0;
  }
  const backend = live ? liveBackend() : recordedDoctrineBackend();
  const rows = await evalDoctrineBackend(backend);
  console.log(`doctrine-candidate eval (plan 077 T4) — ${live ? "LIVE typellm" : "recorded fixtures"}`);
  console.log(
    `${rows.name.padEnd(24)} ${`${rows.correct}/${rows.total}`.padEnd(13)} skipped=${String(rows.skipped).padEnd(5)} accuracy=${(rows.accuracy * 100).toFixed(1)}%`
  );
  if (live && rows.skipped === rows.total)
    console.error("JUDGE SKIPPED (all rows skipped — check TYPELLM_API_KEY; skips are never passes)");
  return 0;
}

async function cmdBrief(argv: string[]): Promise<number> {
  const live = argv.includes("--live");
  const planIdx = argv.indexOf("--plan");
  const taskIdx = argv.indexOf("--task");
  if (planIdx >= 0 || taskIdx >= 0) {
    if (planIdx < 0 || taskIdx < 0 || !argv[planIdx + 1] || !argv[taskIdx + 1]) {
      console.error("usage: brief --plan <plan.md> --task <id>");
      return 2;
    }
    const backend = live ? liveBackend() : recordedBriefBackend();
    const r = await extractTaskBrief(backend, fs.readFileSync(argv[planIdx + 1], "utf8"), argv[taskIdx + 1]);
    if (r.brief) {
      console.log(
        `task brief (AUGMENT-ONLY — contracts stay primary):\n- taskId: ${r.brief.taskId}\n- objective: ${r.brief.objective}\n- deliverables: ${r.brief.deliverables.join("; ")}\n- constraints: ${r.brief.constraints.join("; ")}`
      );
    } else console.log(`no brief (${r.reason ?? "unspecified"}) — the dispatch pack carries the full document`);
    if (r.skipped) console.error(r.reason ?? "JUDGE SKIPPED");
    return 0;
  }
  const backend = live ? liveBackend() : recordedBriefBackend();
  const rows = await evalBriefBackend(backend);
  console.log(`worker-pack brief eval (plan 077 T5, augment-only parity) — ${live ? "LIVE typellm" : "recorded fixtures"}`);
  console.log(
    `${rows.name.padEnd(24)} ${`${rows.correct}/${rows.total}`.padEnd(13)} parity=${(rows.parity * 100).toFixed(1)}% (${rows.markersFound}/${rows.markers} contract markers carried)  skipped=${rows.skipped}`
  );
  return 0;
}

async function cmdSpecDraft(argv: string[]): Promise<number> {
  const live = argv.includes("--live");
  const planIdx = argv.indexOf("--plan");
  if (planIdx >= 0) {
    const backend = live ? liveBackend() : recordedSpecDraftBackend();
    const r = await draftSpecScenarios(backend, fs.readFileSync(argv[planIdx + 1], "utf8"));
    console.log("DRAFT SPEC SKELETON (status: draft — owner review before agent-spec init; NEVER written to specs/ automatically):");
    console.log(renderSpecDraft(r.draft));
    if (r.skipped) console.error(r.reason ?? "JUDGE SKIPPED");
    else if (r.reason) console.error(`note: ${r.reason}`);
    return 0;
  }
  const backend = live ? liveBackend() : recordedSpecDraftBackend();
  const rows = await evalSpecDraftBackend(backend);
  console.log(`spec-draft eval (plan 077 T6) — ${live ? "LIVE typellm" : "recorded fixtures"}`);
  console.log(
    `${rows.name.padEnd(24)} ${`${rows.correct}/${rows.total}`.padEnd(13)} skipped=${String(rows.skipped).padEnd(5)} accuracy=${(rows.accuracy * 100).toFixed(1)}%  scenarioCountMisses=${rows.scenarioCountMisses} selectorFindings=${rows.selectorFindings}`
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
    case "claims":
      return await cmdClaims(rest);
    case "logmining":
      return await cmdLogMining(rest);
    case "doctrine":
      return await cmdDoctrine(rest);
    case "brief":
      return await cmdBrief(rest);
    case "specdraft":
      return await cmdSpecDraft(rest);
    default:
      console.error(
        "usage: bun scripts/bench-intake-triage.ts eval [--live] | verdicts [--live] [--mode per-scenario|batched|batched-dag|all] | verdicts --scenarios <file> --diff <file> | modes [--live] | triage --findings <file> | claims [--live] [--report <claims.json> --turns <turns.json>] | logmining [--live] [--log <file>] | doctrine [--live] [--incident <file>] | brief [--live] [--plan <file> --task <id>] | specdraft [--live] [--plan <file>]"
      );
      return 2;
  }
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
