import { describe, expect, test } from "bun:test";
import type { JudgeBackend } from "../extensions/index.ts";
import {
  CLAIMS_FIXTURES,
  DOCTRINE_FIXTURES,
  BRIEF_FIXTURES,
  LOGMINING_FIXTURES,
  SPECDRAFT_FIXTURES,
  evalBriefBackend,
  evalClaimsBackend,
  evalDoctrineBackend,
  evalLogMiningBackend,
  evalSpecDraftBackend,
  recordedBriefBackend,
  recordedClaimsBackend,
  recordedDoctrineBackend,
  recordedLogMiningBackend,
  recordedSpecDraftBackend,
  lintSpecSelector,
} from "../scripts/bench-intake-triage.ts";

/* ── plan 077 harness modes: Tasks 2-6 fixture slices ──
 * Each new mode reports accuracy/precision over its own fixture slice with a
 * recorded (deterministic, keyless, network-free) backend; a judge skip is
 * NEVER scored as a pass in any mode (loud-skip doctrine); the brief mode
 * scores augment-only PARITY (contract markers carried); the specdraft mode
 * lints drafted Test selectors parse-only. */

const skipping: JudgeBackend = {
  name: "no-key",
  classify: async () => ({ skipped: true, bucket: null, confidence: 0, reason: "missing key" }),
};

describe("harness claims mode (plan 077 T2)", () => {
  test("recorded replay: full accuracy on the fixture slice, bounces routed", async () => {
    const s = await evalClaimsBackend(recordedClaimsBackend());
    expect(s.total).toBe(CLAIMS_FIXTURES.reduce((n, f) => n + f.claims.length, 0));
    expect(s.correct).toBe(s.total);
    expect(s.accuracy).toBe(1);
    expect(s.bouncedToWorker).toBeGreaterThanOrEqual(3);
    expect(s.bouncedToReviewer).toBeGreaterThanOrEqual(1);
  });

  test("a judge skip is never a pass — deterministic pointer FALSEs still verify", async () => {
    const s = await evalClaimsBackend(skipping);
    // the 2 wrong-pointer claims are FALSE by the deterministic pre-check
    // (no judge involved); every judge-dependent claim skips and gets NO
    // credit — a skip is never a pass
    expect(s.correct).toBe(2);
    expect(s.skipped).toBe(s.total - 2);
    expect(s.accuracy).toBeLessThan(1);
  });
});

describe("harness logmining mode (plan 077 T3)", () => {
  test("recorded replay: expected rows found, precision 1.0", async () => {
    const s = await evalLogMiningBackend(recordedLogMiningBackend());
    expect(s.expectedRows).toBe(LOGMINING_FIXTURES.reduce((n, f) => n + f.expectedCandidates.length, 0));
    expect(s.found).toBe(s.expectedRows);
    expect(s.precision).toBe(1);
    expect(s.skipped).toBe(0);
  });

  test("a judge skip is never a pass", async () => {
    const s = await evalLogMiningBackend(skipping);
    expect(s.found).toBe(0);
    expect(s.skipped).toBe(LOGMINING_FIXTURES.length);
    expect(s.precision).toBe(0);
  });
});

describe("harness doctrine mode (plan 077 T4)", () => {
  test("recorded replay: full accuracy", async () => {
    const s = await evalDoctrineBackend(recordedDoctrineBackend());
    expect(s.correct).toBe(DOCTRINE_FIXTURES.length);
    expect(s.accuracy).toBe(1);
  });

  test("a judge skip is never a pass", async () => {
    const s = await evalDoctrineBackend(skipping);
    expect(s.correct).toBe(0);
    expect(s.skipped).toBe(DOCTRINE_FIXTURES.length);
  });
});

describe("harness brief mode (plan 077 T5 — augment-only parity)", () => {
  test("recorded replay: contract markers carried, parity 1.0", async () => {
    const s = await evalBriefBackend(recordedBriefBackend());
    expect(s.correct).toBe(BRIEF_FIXTURES.length);
    expect(s.markersFound).toBe(s.markers);
    expect(s.parity).toBe(1);
    expect(s.skipped).toBe(0);
  });

  test("a judge skip is never scored as a pass", async () => {
    const s = await evalBriefBackend(skipping);
    expect(s.correct).toBe(0);
    expect(s.skipped).toBe(BRIEF_FIXTURES.length);
    expect(s.parity).toBe(0);
  });
});

describe("harness specdraft mode (plan 077 T6)", () => {
  test("recorded replay: scenario counts match, selectors lint clean", async () => {
    const s = await evalSpecDraftBackend(recordedSpecDraftBackend());
    expect(s.correct).toBe(SPECDRAFT_FIXTURES.length);
    expect(s.accuracy).toBe(1);
    expect(s.scenarioCountMisses).toBe(0);
    expect(s.selectorFindings).toBe(0);
  });

  test("a judge skip is never a pass", async () => {
    const s = await evalSpecDraftBackend(skipping);
    expect(s.correct).toBe(0);
    expect(s.skipped).toBe(SPECDRAFT_FIXTURES.length);
  });

  test("lintSpecSelector enforces the check-spec-selectors rules (parse-only)", () => {
    expect(lintSpecSelector("")).toEqual(["empty selector"]);
    expect(lintSpecSelector("grep -Ax pattern file")[0]).toContain("non-numeric context flag value");
    expect(lintSpecSelector("grep -q '' file")[0]).toContain("empty quoted argument");
    expect(lintSpecSelector("grep -A6 -q 'ok' README.md")).toEqual([]);
    expect(lintSpecSelector("bun test tests/one.test.ts")).toEqual([]);
  });
});
