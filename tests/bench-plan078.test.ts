import { describe, expect, test } from "bun:test";
import type { JudgeBackend } from "../extensions/index.ts";
import {
  AUDIT_BATCH_FIXTURES,
  INIT_ADOPT_FIXTURES,
  PLAN_DAG_FIXTURES,
  evalAuditBatchBackend,
  evalInitAdoptBackend,
  evalPlanDagBackend,
  recordedAuditBatchBackend,
  recordedPlanDagBackend,
} from "../scripts/bench-intake-triage.ts";
import { recordedAdoptBackend } from "../scripts/init-extract.ts";

/* ── plan 078 harness modes — fixture accuracy reported per mode ──
 * Every new seam surface lands with its own fixture slice and a recorded
 * (deterministic, keyless, network-free) replay; a judge skip is NEVER
 * scored as a pass in any mode (loud-skip doctrine). The sieve mode's tests
 * live in tests/sieve-seam.test.ts (T1). */

const skipping: JudgeBackend = {
  name: "no-key",
  classify: async () => ({ skipped: true, bucket: null, confidence: 0, reason: "missing key" }),
};

describe("harness initextract mode (plan 078 T2 — draft-by-judge, verify-by-gate)", () => {
  test(
    "recorded replay: drafts match fixture truth, lint verdicts correct per fixture",
    async () => {
      const s = await evalInitAdoptBackend(recordedAdoptBackend());
      expect(s.total).toBe(INIT_ADOPT_FIXTURES.length);
      expect(s.correct).toBe(s.total);
      expect(s.accuracy).toBe(1);
      expect(s.lintVerdictCorrect).toBe(s.total);
      expect(s.skipped).toBe(0);
    },
    60000
  );

  test(
    "a judge skip is never a pass",
    async () => {
      const s = await evalInitAdoptBackend(skipping);
      expect(s.correct).toBe(0);
      expect(s.skipped).toBe(INIT_ADOPT_FIXTURES.length);
      expect(s.accuracy).toBe(0);
    },
    60000
  );

  test("the fixture repos exist on disk (fake brownfield trees in tests/)", () => {
    for (const f of INIT_ADOPT_FIXTURES) {
      const manifest = `${process.cwd()}/${f.repo}/package.json`;
      expect(require("node:fs").existsSync(manifest)).toBe(true);
    }
  });
});

describe("harness plandag mode (plan 078 T3 — extraction before, validation after)", () => {
  test("recorded replay: expected edges found, the messy fixture surfaces its finding", async () => {
    const s = await evalPlanDagBackend(recordedPlanDagBackend());
    expect(s.total).toBe(PLAN_DAG_FIXTURES.length);
    expect(s.correct).toBe(s.total);
    expect(s.accuracy).toBe(1);
    expect(s.skipped).toBe(0);
    expect(s.findings).toBeGreaterThanOrEqual(1);
  });

  test("a judge skip is never a pass", async () => {
    const s = await evalPlanDagBackend(skipping);
    expect(s.correct).toBe(0);
    expect(s.skipped).toBe(PLAN_DAG_FIXTURES.length);
    expect(s.accuracy).toBe(0);
  });
});

describe("harness auditbatch mode (plan 078 T4 — pre-verified findings, digest to the owner)", () => {
  test("recorded replay: severity + confirmed + evidenceCount match ground truth", async () => {
    const s = await evalAuditBatchBackend(recordedAuditBatchBackend());
    expect(s.total).toBe(AUDIT_BATCH_FIXTURES.reduce((n, f) => n + f.expected.length, 0));
    expect(s.correct).toBe(s.total);
    expect(s.accuracy).toBe(1);
    expect(s.skipped).toBe(0);
  });

  test("a judge skip is never a pass", async () => {
    const s = await evalAuditBatchBackend(skipping);
    expect(s.correct).toBe(0);
    expect(s.skipped).toBe(AUDIT_BATCH_FIXTURES.length);
    expect(s.accuracy).toBe(0);
  });
});
