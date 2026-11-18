import { describe, expect, test } from "bun:test";
import {
  DECOMPOSE_INPUT_MARKER,
  REVIEW_VERDICTS,
  REVIEW_VERDICT_SCHEMA,
  makeTypellmBackend,
  renderVerdictTable,
  reviewVerdictsBatched,
  reviewVerdictsDag,
  scenarioInput,
  TRIAGE_CONFIDENCE_FLOOR,
  type JudgeBackend,
  type ReviewScenario,
} from "../extensions/index.ts";
import {
  VERDICT_FIXTURES,
  evalVerdictBackend,
  evalVerdictMode,
  recordedVerdictBackend,
} from "../scripts/bench-intake-triage.ts";

/* ── plan 20261117-076 Phase 3: batched-DAG review judging (TypeLLM-only) ──
 * The Phase-2 per-scenario pattern costs one API call per scenario (12–27
 * calls per review) and judges each scenario blind to the others. Phase 3:
 * (1) BATCH — one call carries ALL scenarios + real file contents within the
 * context window (deterministic whole-scenario chunking when over) and the
 * response parses into the per-scenario verdict array; (2) DAG — decompose
 * the review into dependency-ordered sub-judgments with position-bias
 * permutations, later verdicts receiving earlier ones as context; (3)
 * calibration — the prompt penalizes confident guesses on ambiguous
 * evidence (the Phase-2 miss class). Verdict + schema + render contracts
 * are PRESERVED: {verdict, confidence, evidence} per scenario, floor 0.6,
 * uncertain always routes to Tier 2, skips are LOUD, never silent passes. */

const SCENARIOS: ReviewScenario[] = [
  { id: "S1", claim: "The report's claims match what the diff actually does." },
  { id: "S2", claim: "README/docs lines changed in the diff match the code." },
  { id: "S3", claim: "The new test pins assert what their scenarios claim." },
];

/** Long-claim scenarios for chunking tests — each block overflows a small
 *  window, forcing deterministic whole-scenario chunk boundaries. */
const BIG_SCENARIOS: ReviewScenario[] = SCENARIOS.map((s, i) => ({
  id: s.id,
  claim: `${s.claim} ${"detail ".repeat(28)}`.trim(),
  ...{ i },
})) as ReviewScenario[];

const FILES = [
  { path: "extensions/index.ts", content: "export const PIN = 1;\n" },
  { path: "README.md", content: "docs reference the PIN export.\n" },
];

/** Flat per-scenario answers in the batch encoding: {S1_verdict, S1_confidence,
 *  S1_evidence, ...} for every id found in the input. */
function flatAnswers(
  scenarios: ReviewScenario[],
  input: string,
  over?: Record<string, { verdict?: string; confidence?: number }>
) {
  const out: Record<string, unknown> = {};
  for (const s of scenarios) {
    if (!input.includes(`Scenario ${s.id}:`)) continue;
    const o = over?.[s.id] ?? {};
    out[`${s.id}_verdict`] = o.verdict ?? "pass";
    out[`${s.id}_confidence`] = o.confidence ?? 0.9;
    out[`${s.id}_evidence`] = `evidence for ${s.id}`;
  }
  return out;
}

const idsIn = (scenarios: ReviewScenario[], input: string): string[] =>
  orderIn(scenarios, input);

/** Scenario ids in the order they are PRESENTED in the input body (by
 *  position, not by the array's order) — this is what position-bias tests
 *  must observe. */
const orderIn = (scenarios: ReviewScenario[], input: string): string[] =>
  scenarios
    .map((s) => ({ id: s.id, at: input.indexOf(`Scenario ${s.id}:`) }))
    .filter((p) => p.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((p) => p.id);

/** A capture fake: records every classify (schema, input) pair and answers
 *  from the flat encoding. The batch/DAG runners speak the flat per-scenario
 *  question encoding on top of the unchanged seam. */
function captureFake(
  scenarios: ReviewScenario[],
  answer?: (schema: object, input: string) => Record<string, unknown> | { skip: string }
) {
  const calls: { schema: object; input: string }[] = [];
  const backend: JudgeBackend = {
    name: "capture-fake",
    async classify(schema, input) {
      calls.push({ schema, input });
      const out = answer?.(schema, input) ?? flatAnswers(scenarios, input);
      if ("skip" in out)
        return { skipped: true, bucket: null, confidence: 0, reason: out.skip };
      return {
        skipped: false,
        bucket: null,
        value: out,
        confidence: typeof out.confidence === "number" ? out.confidence : 0.9,
      };
    },
  };
  return { calls, backend };
}

describe("batched review verdicts — one call, all scenarios, real files (Phase 3)", () => {
  test("ONE call carries ALL scenarios + diff summary + real file contents", async () => {
    const { calls, backend } = captureFake(SCENARIOS);
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "the diff summary", { files: FILES });
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toContain("the diff summary");
    for (const s of SCENARIOS) {
      expect(calls[0].input).toContain(`Scenario ${s.id}:`);
      expect(calls[0].input).toContain(s.claim);
    }
    expect(calls[0].input).toContain("extensions/index.ts");
    expect(calls[0].input).toContain("export const PIN = 1;");
    expect(calls[0].input).toContain("README.md");
    expect(r.results).toHaveLength(3);
  });

  test("per-scenario verdicts parsed from the batch response into the verdict array", async () => {
    const { backend } = captureFake(SCENARIOS, (_schema, input) =>
      flatAnswers(SCENARIOS, input, { S2: { verdict: "fail", confidence: 0.85 } })
    );
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(r.results[1]).toMatchObject({
      scenario: "S2",
      verdict: "fail",
      confidence: 0.85,
      evidence: "evidence for S2",
    });
    expect(r.results[0]).toMatchObject({ scenario: "S1", verdict: "pass", confidence: 0.9 });
    expect(r.deepRead).toEqual([]);
    expect(r.skippedAll).toBe(false);
  });

  test("window cap: over-window scenario sets chunk deterministically, whole scenarios only", async () => {
    const { calls, backend } = captureFake(BIG_SCENARIOS);
    const r = await reviewVerdictsBatched(backend, BIG_SCENARIOS, "d", { window: 600 });
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const c of calls) expect(c.input.length).toBeLessThanOrEqual(600);
    // whole-scenario boundaries: every scenario block appears in exactly one
    // chunk, complete (claim + detail body), never split mid-scenario
    const seen: Record<string, number> = {};
    for (const c of calls) for (const id of idsIn(BIG_SCENARIOS, c.input)) seen[id] = (seen[id] ?? 0) + 1;
    for (const s of BIG_SCENARIOS) expect(seen[s.id]).toBe(1);
    for (const c of calls)
      for (const id of idsIn(BIG_SCENARIOS, c.input))
        expect(c.input).toContain(BIG_SCENARIOS.find((s) => s.id === id)!.claim);
    // chunk order follows the input order (deterministic)
    expect(idsIn(BIG_SCENARIOS, calls[0].input)[0]).toBe("S1");
    expect(r.results.map((x) => x.scenario)).toEqual(["S1", "S2", "S3"]);
  });

  test("file contents respect the window: oversized files are truncated deterministically", async () => {
    const { calls, backend } = captureFake(SCENARIOS);
    const big = { path: "big.ts", content: "x".repeat(10_000) };
    await reviewVerdictsBatched(backend, SCENARIOS, "d", { files: [big], window: 2_000 });
    expect(calls).toHaveLength(1);
    expect(calls[0].input.length).toBeLessThanOrEqual(2_000);
    expect(calls[0].input).toContain("big.ts");
    expect(calls[0].input).toContain("truncated");
  });

  test("loud-skip PER CHUNK: a failed chunk marks ITS scenarios uncertain, others proceed", async () => {
    const { backend } = captureFake(BIG_SCENARIOS, (_schema, input) =>
      input.includes("Scenario S2:") ? { skip: "endpoint error (HTTP 503)" } : flatAnswers(BIG_SCENARIOS, input)
    );
    const r = await reviewVerdictsBatched(backend, BIG_SCENARIOS, "d", { window: 600 });
    const s2 = r.results.find((x) => x.scenario === "S2");
    expect(s2?.verdict).toBe("uncertain");
    expect(s2?.skipped).toBe(true);
    expect(s2?.reason).toContain("503");
    expect(r.results.find((x) => x.scenario === "S1")?.verdict).toBe("pass");
    expect(r.results.find((x) => x.scenario === "S3")?.verdict).toBe("pass");
    expect(r.deepRead).toEqual(["S2"]);
    expect(r.skippedAll).toBe(false);
  });

  test("ALL chunks skipped → skippedAll with the reason surfaced (never a silent pass)", async () => {
    const { backend } = captureFake(SCENARIOS, () => ({ skip: "missing TYPELLM_API_KEY" }));
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(r.skippedAll).toBe(true);
    expect(r.reason).toContain("TYPELLM_API_KEY");
    expect(r.results.every((x) => x.verdict === "uncertain" && x.skipped)).toBe(true);
    expect(r.deepRead).toEqual(["S1", "S2", "S3"]);
  });

  test("missing per-scenario keys in the response → that scenario loud-skips, others proceed", async () => {
    const { backend } = captureFake(SCENARIOS, (_schema, input) => {
      const out = flatAnswers(SCENARIOS, input);
      delete out.S3_verdict;
      delete out.S3_confidence;
      return out;
    });
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    const s3 = r.results.find((x) => x.scenario === "S3");
    expect(s3?.verdict).toBe("uncertain");
    expect(s3?.skipped).toBe(true);
    expect(r.results.find((x) => x.scenario === "S1")?.verdict).toBe("pass");
    expect(r.deepRead).toEqual(["S3"]);
  });

  test("floor semantics preserved: below-floor confidence → uncertain + deep-read", async () => {
    const { backend } = captureFake(SCENARIOS, (_schema, input) =>
      flatAnswers(SCENARIOS, input, { S1: { confidence: 0.4 } })
    );
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(r.results[0].verdict).toBe("uncertain");
    expect(r.results[0].reason).toContain("0.4");
    expect(r.deepRead).toEqual(["S1"]);
  });

  test("verdict outside the enum → loud skip for that scenario only", async () => {
    const { backend } = captureFake(SCENARIOS, (_schema, input) =>
      flatAnswers(SCENARIOS, input, { S2: { verdict: "ship-it" } })
    );
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(r.results.find((x) => x.scenario === "S2")?.skipped).toBe(true);
    expect(r.deepRead).toContain("S2");
  });

  test("result renders through the UNCHANGED renderVerdictTable (contract preservation)", async () => {
    const { backend } = captureFake(SCENARIOS, (_schema, input) =>
      flatAnswers(SCENARIOS, input, { S1: { confidence: 0.4 } })
    );
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    const out = renderVerdictTable(r);
    expect(out).toContain("TIER-1 VERDICT TABLE");
    expect(out).toContain("DEEP-READ");
    expect(out).toContain("0.4");
  });

  test("call count is surfaced for the harness comparison", async () => {
    const { backend } = captureFake(SCENARIOS);
    const one = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(one.calls).toBe(1);
    const chunked = await reviewVerdictsBatched(backend, BIG_SCENARIOS, "d", { window: 600 });
    expect(chunked.calls).toBe(chunked.chunks);
    expect(chunked.chunks).toBeGreaterThanOrEqual(2);
  });

  test("the live transport stays on the {context, questions} contract: flat per-scenario questions, one POST", async () => {
    const bodies: any[] = [];
    const backend = makeTypellmBackend({
      key: "k",
      fetchImpl: async (_url: string, init: any) => {
        bodies.push(JSON.parse(init.body));
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              result: {
                S1_verdict: "pass",
                S1_confidence: 0.9,
                S1_evidence: "ok",
                S2_verdict: "fail",
                S2_confidence: 0.9,
              },
            }),
        };
      },
    } as any);
    const r = await reviewVerdictsBatched(backend, SCENARIOS.slice(0, 2), "d", { files: FILES });
    expect(bodies).toHaveLength(1);
    expect(bodies[0].questions.S1_verdict.enum).toEqual(REVIEW_VERDICTS);
    expect(bodies[0].questions.S2_confidence.type).toBe("number");
    expect(bodies[0].context).toContain("Scenario S1:");
    expect(r.results[0].verdict).toBe("pass");
    expect(r.results[1].verdict).toBe("fail");
  });
});

/* ── DAG decompose ── */

/** A DAG fake: answers the decompose call with a scripted decomposition and
 *  per-scenario verdict calls with the flat encoding. `decomposeValidFor` can
 *  key off the presented scenario order to simulate position bias. */
function dagFake(opts: {
  groups: { id: string; scenarios: string[]; depends_on?: string[] }[];
  scenarios?: ReviewScenario[];
  decomposeValidFor?: (input: string) => boolean;
  verdictOver?: Record<string, { verdict?: string; confidence?: number }>;
}) {
  const scenarios = opts.scenarios ?? SCENARIOS;
  const verdictCalls: { schema: object; input: string }[] = [];
  const decomposeCalls: string[] = [];
  const backend: JudgeBackend = {
    name: "dag-fake",
    async classify(schema, input) {
      if (input.includes(DECOMPOSE_INPUT_MARKER)) {
        decomposeCalls.push(input);
        if (opts.decomposeValidFor && !opts.decomposeValidFor(input))
          return { skipped: true, bucket: null, confidence: 0, reason: "degenerate on this order" };
        return {
          skipped: false,
          bucket: null,
          value: { decomposition: JSON.stringify({ groups: opts.groups }) },
          confidence: 0.9,
        };
      }
      verdictCalls.push({ schema, input });
      const out = flatAnswers(scenarios, input, opts.verdictOver);
      if (Object.keys(out).length === 0)
        return { skipped: true, bucket: null, confidence: 0, reason: "unscripted verdict call" };
      return { skipped: false, bucket: null, value: out, confidence: 0.9 };
    },
  };
  return { backend, verdictCalls, decomposeCalls };
}

describe("DAG review verdicts — decompose, order, context flow (Phase 3)", () => {
  test("decompose presents scenarios in a PERMUTED order (position-bias control)", async () => {
    const f = dagFake({
      groups: [
        { id: "J1", scenarios: ["S1"] },
        { id: "J2", scenarios: ["S2"] },
        { id: "J3", scenarios: ["S3"] },
      ],
    });
    const r = await reviewVerdictsDag(f.backend, SCENARIOS, "d");
    expect(f.decomposeCalls.length).toBeGreaterThanOrEqual(1);
    expect(orderIn(SCENARIOS, f.decomposeCalls[0]).join(",")).not.toBe(
      SCENARIOS.map((s) => s.id).join(",")
    );
    expect(r.results).toHaveLength(3);
  });

  test("a degenerate decompose on one order is retried on the next permutation (bias control)", async () => {
    // valid ONLY when the presentation order starts with S2 — the first
    // (reversed) presentation degenerates; the second permutation rescues it
    const f = dagFake({
      groups: [
        { id: "J1", scenarios: ["S1", "S2"], depends_on: [] },
        { id: "J2", scenarios: ["S3"], depends_on: ["J1"] },
      ],
      decomposeValidFor: (input) => orderIn(SCENARIOS, input)[0] === "S2",
    });
    const r = await reviewVerdictsDag(f.backend, SCENARIOS, "d");
    expect(f.decomposeCalls.length).toBeGreaterThanOrEqual(2);
    expect(r.degraded).toBeUndefined();
    expect(r.results).toHaveLength(3);
  });

  test("verdicts execute in DAG order: dependencies judged before dependents", async () => {
    const f = dagFake({
      groups: [
        { id: "J2", scenarios: ["S2"], depends_on: ["J1"] },
        { id: "J1", scenarios: ["S1", "S3"], depends_on: [] },
      ],
    });
    await reviewVerdictsDag(f.backend, SCENARIOS, "d");
    const judged: string[] = f.verdictCalls.map((c) => orderIn(SCENARIOS, c.input).join("+"));
    expect(judged[0]).toBe("S1+S3");
    expect(judged[1]).toBe("S2");
  });

  test("context flow: a dependent sub-judgment RECEIVES the earlier verdicts as context", async () => {
    const f = dagFake({
      groups: [
        { id: "J1", scenarios: ["S1"], depends_on: [] },
        { id: "J2", scenarios: ["S2"], depends_on: ["J1"] },
        { id: "J3", scenarios: ["S3"], depends_on: ["J2"] },
      ],
      verdictOver: { S1: { verdict: "fail", confidence: 0.9 } },
    });
    await reviewVerdictsDag(f.backend, SCENARIOS, "d");
    // J2's call quotes J1's verdict; J3's call quotes both
    const j2 = f.verdictCalls.find((c) => orderIn(SCENARIOS, c.input).join() === "S2");
    expect(j2?.input).toContain("S1");
    expect(j2?.input).toContain("fail");
    const j3 = f.verdictCalls.find((c) => orderIn(SCENARIOS, c.input).join() === "S3");
    expect(j3?.input).toContain("S2");
    expect(j3?.input).toContain("pass");
  });

  test("degenerate decompose (missing scenarios) → LOUD deterministic fallback, verdicts still produced", async () => {
    const f = dagFake({
      groups: [{ id: "J1", scenarios: ["S1", "S9"] }], // S9 does not exist
      decomposeValidFor: () => true,
    });
    const r = await reviewVerdictsDag(f.backend, SCENARIOS, "d");
    expect(r.degraded).toBeTruthy();
    expect(r.degraded).toContain("decompose");
    expect(r.results).toHaveLength(3);
    expect(r.results.every((x) => x.verdict === "pass")).toBe(true);
  });

  test("floor + uncertain routing preserved through the DAG runner", async () => {
    const f = dagFake({
      groups: [
        { id: "J1", scenarios: ["S1"] },
        { id: "J2", scenarios: ["S2"], depends_on: ["J1"] },
        { id: "J3", scenarios: ["S3"] },
      ],
      verdictOver: { S2: { confidence: 0.5 } },
    });
    const r = await reviewVerdictsDag(f.backend, SCENARIOS, "d");
    expect(r.results.find((x) => x.scenario === "S2")?.verdict).toBe("uncertain");
    expect(r.deepRead).toEqual(["S2"]);
  });

  test("call accounting: decompose run(s) + one call per sub-judgment", async () => {
    const f = dagFake({
      groups: [
        { id: "J1", scenarios: ["S1", "S2"] },
        { id: "J2", scenarios: ["S3"], depends_on: ["J1"] },
      ],
    });
    const r = await reviewVerdictsDag(f.backend, SCENARIOS, "d");
    expect(r.calls).toBe(f.decomposeCalls.length + 2);
    expect(f.verdictCalls).toHaveLength(2);
  });
});

/* ── uncertainty calibration (the Phase-2 miss class) ── */

const AMBIGUOUS_FIXTURE = VERDICT_FIXTURES.find((f) => f.id === "v08")!;

/** The Phase-2 miss class: over-confident pass on ambiguous evidence. The
 *  calibrated variant reads the schema prompt — when the calibration
 *  instruction is present it returns honest uncertain on ambiguity. */
function overConfidentBackend(calibrated: boolean): JudgeBackend {
  return {
    name: calibrated ? "calibrated" : "over-confident",
    async classify(schema, input) {
      const desc = JSON.stringify(schema);
      const calibrated_ =
        desc.includes("ambiguous") && desc.includes("uncertain rather than a confident guess");
      if (calibrated && calibrated_ && input.includes("Allowed"))
        return {
          skipped: false,
          bucket: null,
          value: { verdict: "uncertain", confidence: 0.8, evidence: "evidence is partial" },
          confidence: 0.8,
        };
      return {
        skipped: false,
        bucket: null,
        value: { verdict: "pass", confidence: 0.95, evidence: "seems fine" },
        confidence: 0.95,
      };
    },
  };
}

describe("uncertainty calibration — ambiguous evidence → uncertain, not confident-wrong", () => {
  test("the review-verdict prompt carries the calibration instruction", () => {
    const desc = JSON.stringify(REVIEW_VERDICT_SCHEMA);
    expect(desc).toContain("ambiguous");
    expect(desc).toContain("uncertain rather than a confident guess");
    // schema SHAPE unchanged (contract preservation)
    const props = (REVIEW_VERDICT_SCHEMA as any).properties;
    expect(props.verdict.enum).toEqual(REVIEW_VERDICTS);
    expect(props.confidence.minimum).toBe(0);
    expect(props.confidence.maximum).toBe(1);
    expect((REVIEW_VERDICT_SCHEMA as any).required).toEqual(["verdict", "confidence"]);
  });

  test("v08-style ambiguity: uncalibrated backend stays confident-wrong; calibrated returns uncertain", async () => {
    const wrong = await evalVerdictBackend(overConfidentBackend(false), [AMBIGUOUS_FIXTURE]);
    expect(wrong.correct).toBe(0); // the Phase-2 miss reproduced on the fixture
    const fixed = await evalVerdictBackend(overConfidentBackend(true), [AMBIGUOUS_FIXTURE]);
    expect(fixed.correct).toBe(1); // calibration flips the miss to an honest uncertain
  });

  test("floor is unchanged (0.6) — calibration is prompt-side, not a floor change", () => {
    expect(TRIAGE_CONFIDENCE_FLOOR).toBe(0.6);
    expect(scenarioInput({ id: "S1", claim: "c" }, "d")).toContain("S1");
  });
});

/* ── harness modes — accuracy + calls + latency per mode on the SAME fixtures ── */

describe("harness modes — per-scenario | batched | batched-dag (Phase 3 comparison)", () => {
  test("per-scenario mode: 8 fixtures → 8 calls, recorded accuracy 1.0", async () => {
    const s = await evalVerdictMode("per-scenario", recordedVerdictBackend());
    expect(s.mode).toBe("per-scenario");
    expect(s.total).toBe(VERDICT_FIXTURES.length);
    expect(s.correct).toBe(VERDICT_FIXTURES.length);
    expect(s.calls).toBe(VERDICT_FIXTURES.length);
    expect(s.accuracy).toBe(1);
    expect(typeof s.wallMs).toBe("number");
  });

  test("batched mode: one call for the whole fixture set, recorded accuracy 1.0", async () => {
    const s = await evalVerdictMode("batched", recordedVerdictBackend());
    expect(s.mode).toBe("batched");
    expect(s.calls).toBe(1);
    expect(s.accuracy).toBe(1);
    expect(s.total).toBe(VERDICT_FIXTURES.length);
  });

  test("batched-dag mode: decompose + per-sub-judgment calls, recorded accuracy 1.0", async () => {
    const s = await evalVerdictMode("batched-dag", recordedVerdictBackend());
    expect(s.mode).toBe("batched-dag");
    expect(s.calls).toBeGreaterThanOrEqual(2);
    expect(s.accuracy).toBe(1);
    expect(s.total).toBe(VERDICT_FIXTURES.length);
  });

  test("skips are never passes in any mode (loud-skip doctrine)", async () => {
    const skipping: JudgeBackend = {
      name: "no-key",
      classify: async () => ({ skipped: true, bucket: null, confidence: 0, reason: "missing key" }),
    };
    for (const mode of ["per-scenario", "batched", "batched-dag"] as const) {
      const s = await evalVerdictMode(mode, skipping);
      expect(s.correct).toBe(0);
      expect(s.skipped).toBe(VERDICT_FIXTURES.length);
      expect(s.accuracy).toBe(0);
    }
  });
});
