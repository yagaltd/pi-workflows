import { describe, expect, test } from "bun:test";
import {
  AUDIT_BATCH_SCHEMA,
  AUDIT_SEVERITIES,
  auditBatchVerdicts,
  type JudgeBackend,
  renderAuditDigest,
} from "../extensions/index.ts";
import {
  AUDIT_BATCH_FIXTURES,
  evalAuditBatchBackend,
  recordedAuditBatchBackend,
} from "../scripts/bench-intake-triage.ts";

/* ── plan 078 T4: /audit batch verdicts ──
 * The audit checklist becomes many typed questions over ONE codebase batch:
 * boolean gate-questions (confirmed) + enum severities (P0-P3 — the audit
 * output schema is unchanged) + number evidence counts. Findings are
 * pre-verified by the judge, the owner receives the verified digest, and
 * uncertain rows stay for the agent. /audit exists as a pi-workflows command
 * (prompts/audit.md) — this capability rides the same seam; the wiring note
 * for prompts/audit.md Phase 3 is REPORTED (that file is outside this plan's
 * Allowed Changes; no new command was invented). */

const CANDIDATES = [
  { id: "c1", finding: "ship path swallows write failures — errors caught and never surfaced", claimedSeverity: "P1" },
  { id: "c2", finding: "typo in a code comment — 'recieve'", claimedSeverity: "P3" },
  { id: "c3", finding: "auth boundary has no rate limit on the token endpoint", claimedSeverity: "P0" },
];

const backendOk = (rows: unknown[], confidence = 0.9): JudgeBackend => ({
  name: "fake-auditbatch",
  classify: async () => ({
    skipped: false,
    bucket: null,
    value: { findings: rows, confidence },
    confidence,
  }),
});

describe("audit batch verdicts (plan 078 T4) — schema", () => {
  test("typed questions: boolean confirmed + enum severities + number evidence counts", () => {
    expect(AUDIT_SEVERITIES).toEqual(["P0", "P1", "P2", "P3"]);
    const props = (AUDIT_BATCH_SCHEMA as any).properties;
    const item = props.findings.items;
    expect(item.properties.confirmed.type).toBe("boolean");
    expect(item.properties.severity.enum).toEqual(AUDIT_SEVERITIES);
    expect(item.properties.evidenceCount.type).toBe("integer");
    expect(item.properties.evidenceCount.minimum).toBe(1);
    expect(item.required).toContain("finding");
    expect(item.required).toContain("severity");
    expect(item.required).toContain("confirmed");
    expect(item.required).toContain("evidenceCount");
    expect((AUDIT_BATCH_SCHEMA as any).additionalProperties).toBe(false);
  });
});

describe("audit batch verdicts (plan 078 T4) — one batched call", () => {
  test("all candidates ride ONE classify call; rows come back pre-verified", async () => {
    let calls = 0;
    const inputs: string[] = [];
    const backend: JudgeBackend = {
      name: "counting",
      classify: async (_schema, input) => {
        calls++;
        inputs.push(input);
        return {
          skipped: false,
          bucket: null,
          value: {
            findings: [
              {
                finding: CANDIDATES[0].finding,
                severity: "P1",
                confirmed: true,
                evidenceCount: 2,
                evidence: "try/catch swallows",
                fileRefs: ["extensions/index.ts:100"],
              },
              {
                finding: CANDIDATES[1].finding,
                severity: "P3",
                confirmed: true,
                evidenceCount: 1,
                evidence: "the comment",
                fileRefs: ["scripts/x.ts:12"],
              },
              {
                finding: CANDIDATES[2].finding,
                severity: "P0",
                confirmed: false,
                evidenceCount: 1,
                evidence: "unverifiable from the batch",
              },
            ],
            confidence: 0.9,
          },
          confidence: 0.9,
        };
      },
    };
    const r = await auditBatchVerdicts(backend, CANDIDATES);
    expect(calls).toBe(1);
    expect(inputs[0]).toContain("rate limit");
    expect(r.rows.length).toBe(3);
    expect(r.rows[0].severity).toBe("P1");
    expect(r.rows[0].confirmed).toBe(true);
    expect(r.rows[0].evidenceCount).toBe(2);
    expect(r.forAgent).toEqual([CANDIDATES[2].finding]); // uncertain → the agent
    expect(r.skippedAll).toBe(false);
    expect(r.calls).toBe(1);
  });

  test("schema-invalid rows route to the agent loudly, never silently dropped", async () => {
    const backend = backendOk([
      { finding: CANDIDATES[0].finding, severity: "P9", confirmed: true, evidenceCount: 1 }, // enum violation
      { finding: CANDIDATES[1].finding, severity: "P3", confirmed: false, evidenceCount: 0 }, // evidenceCount < 1
    ]);
    const r = await auditBatchVerdicts(backend, CANDIDATES.slice(0, 2));
    expect(r.forAgent.length).toBe(2);
    expect(r.rows.every((row) => row.severity !== "P9")).toBe(true);
  });

  test("a backend skip is LOUD: skippedAll + every candidate routed to the agent", async () => {
    const backend: JudgeBackend = {
      name: "no-key",
      classify: async () => ({ skipped: true, bucket: null, confidence: 0, reason: "missing key" }),
    };
    const r = await auditBatchVerdicts(backend, CANDIDATES);
    expect(r.skippedAll).toBe(true);
    expect(r.forAgent).toEqual(CANDIDATES.map((c) => c.finding));
    expect(r.reason).toContain("missing key");
    expect(renderAuditDigest(r)).toContain("JUDGE SKIPPED");
  });

  test("below-floor confidence routes the whole batch to the agent (the same floor)", async () => {
    const backend = backendOk(
      [{ finding: CANDIDATES[0].finding, severity: "P1", confirmed: true, evidenceCount: 1 }],
      0.3,
    );
    const r = await auditBatchVerdicts(backend, CANDIDATES);
    expect(r.skippedAll).toBe(true);
    expect(r.forAgent).toEqual(CANDIDATES.map((c) => c.finding));
  });

  test("empty candidate list is legal and produces an empty digest, no call", async () => {
    let calls = 0;
    const backend: JudgeBackend = {
      name: "counting",
      classify: async () => {
        calls++;
        return { skipped: false, bucket: null, value: { findings: [], confidence: 0.9 }, confidence: 0.9 };
      },
    };
    const r = await auditBatchVerdicts(backend, []);
    expect(calls).toBe(0);
    expect(r.rows).toEqual([]);
    expect(r.forAgent).toEqual([]);
  });
});

describe("audit batch verdicts (plan 078 T4) — digest (audit output schema unchanged)", () => {
  test("the digest carries the Phase-3 sections: confirmed findings with [Pn] + the agent queue", async () => {
    const backend = backendOk([
      {
        finding: CANDIDATES[0].finding,
        severity: "P1",
        confirmed: true,
        evidenceCount: 2,
        evidence: "try/catch swallows",
        fileRefs: ["extensions/index.ts:100"],
      },
      { finding: CANDIDATES[2].finding, severity: "P0", confirmed: false, evidenceCount: 1 },
    ]);
    const r = await auditBatchVerdicts(backend, [CANDIDATES[0], CANDIDATES[2]]);
    const digest = renderAuditDigest(r);
    expect(digest).toContain("## Confirmed findings");
    expect(digest).toContain("[P1]");
    expect(digest).toContain("extensions/index.ts:100");
    expect(digest).toContain("## Manual review queue");
    expect(digest).toContain(CANDIDATES[2].finding);
  });

  test("the skip digest is loud and names the remediation", () => {
    const backend: JudgeBackend = {
      name: "no-key",
      classify: async () => ({ skipped: true, bucket: null, confidence: 0, reason: "no key" }),
    };
    return auditBatchVerdicts(backend, CANDIDATES).then((r) => {
      const d = renderAuditDigest(r);
      expect(d).toContain("JUDGE SKIPPED");
      expect(d).toContain("the agent verifies by hand");
    });
  });
});

describe("harness auditbatch mode (plan 078 T4)", () => {
  test("recorded replay: pre-verified rows match ground truth, accuracy 1.0", async () => {
    const s = await evalAuditBatchBackend(recordedAuditBatchBackend());
    expect(s.total).toBe(AUDIT_BATCH_FIXTURES.reduce((n, f) => n + f.expected.length, 0));
    expect(s.correct).toBe(s.total);
    expect(s.accuracy).toBe(1);
    expect(s.skipped).toBe(0);
  });

  test("a judge skip is never a pass", async () => {
    const skipping: JudgeBackend = {
      name: "no-key",
      classify: async () => ({ skipped: true, bucket: null, confidence: 0, reason: "missing key" }),
    };
    const s = await evalAuditBatchBackend(skipping);
    expect(s.correct).toBe(0);
    expect(s.skipped).toBe(AUDIT_BATCH_FIXTURES.length);
    expect(s.accuracy).toBe(0);
  });
});
