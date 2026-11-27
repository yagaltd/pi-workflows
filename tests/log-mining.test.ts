import { describe, expect, test } from "bun:test";
import { doctrineCandidate, type JudgeBackend, mineLog, TRIAGE_CONFIDENCE_FLOOR } from "../extensions/index.ts";

/* ── plan 077 Tasks 3+4: LOG → knowledge mining + incident → doctrine ──
 * Task 3: TypeLLM structured pull compiles the accreting .workflows/LOG.md
 * into knowledge-promotion candidates (the 073 promotion vocabulary:
 * {candidate, trigger, gateBinding, logTurn}) — periodic scan → candidate
 * rows → the existing sieve judges → promoted or dropped. Task 4: when an
 * incident adds a rule, the incident itself extracts that rule as a
 * STRUCTURED sieve candidate {rule, trigger, gateBinding} — rules enter as
 * DATA, never as prose accretion. Both: schema-driven, loud-skip,
 * confidence-gated, never closing alone (candidates feed the sieve —
 * NOTHING is auto-promoted here). */

const LOG = `2026-11-10 SHIP 076 → v0.15.14: the judge seam landed. check-drift must stay CLEAN after every plan.
2026-11-11 INCIDENT: docs-lint flagged three stale stamps; the stamps must be refreshed on every docs edit (gate: docs-lint.sh).
2026-11-12 WAVE 2 dispatched; two workers ran in parallel on disjoint files.
2026-11-13 LESSON: bun test flakiness traced to a shared tmpdir — suite tests must use mkdtemp.
`;

function miningBackend(
  perSlice: (input: string) => Record<string, unknown> | { skip: string },
): { backend: JudgeBackend; calls: string[] } {
  const calls: string[] = [];
  return {
    backend: {
      name: "mining-fake",
      async classify(schema, input) {
        calls.push(input);
        const out = perSlice(input);
        if ("skip" in out) return { skipped: true, bucket: null, confidence: 0, reason: out.skip };
        return { skipped: false, bucket: null, value: out, confidence: 0.9 };
      },
    },
    calls,
  };
}

describe("mineLog — the 073 promotion vocabulary (plan 077 T3)", () => {
  test("mines candidate rows {candidate, trigger, gateBinding, logTurn} with line provenance", async () => {
    const { backend, calls } = miningBackend(() => ({
      knowledge: [
        {
          candidate: "Refresh doc stamps on every docs edit",
          trigger: "editing a doc with a stale generated_at",
          gateBinding: "docs-lint.sh",
          logTurn: 2,
          confidence: 0.9,
        },
        {
          candidate: "Suite tests use mkdtemp, never a shared tmpdir",
          trigger: "writing a suite test",
          gateBinding: "bun test",
          logTurn: 4,
          confidence: 0.85,
        },
      ],
    }));
    const r = await mineLog(backend, LOG);
    expect(r.skippedAll).toBe(false);
    expect(r.candidates).toHaveLength(2);
    expect(r.candidates[0]).toMatchObject({
      candidate: "Refresh doc stamps on every docs edit",
      trigger: "editing a doc with a stale generated_at",
      gateBinding: "docs-lint.sh",
      logTurn: 2,
      confidence: 0.9,
    });
    // the log rides the call line-addressed so logTurn cites real lines
    expect(calls[0]).toContain("[log line 2]");
    // candidates feed the SIEVE — the result has no promoted state
    expect(Object.keys(r).sort()).toEqual(
      ["abstainedSlices", "backend", "calls", "candidates", "deferred", "reason", "skippedAll", "slices", "usage"]
        .filter(
          (k) => k in r,
        ).sort() as string[],
    );
    expect("promoted" in r).toBe(false);
  });

  test("candidates over a big LOG chunk deterministically, one call per slice", async () => {
    const entries: string[] = [];
    for (let i = 0; i < 40; i++) {
      entries.push(`2026-11-10 entry ${i}: a lesson about gate ${i} — must be pinned (gate: scripts/gate-${i}.sh).`);
    }
    const bigLog = entries.join("\n");
    const { backend, calls } = miningBackend((input) => ({
      knowledge: [
        {
          candidate: `gate ${[...input.matchAll(/entry (\d+)/g)].map((m) => m[1]).join(",")} mined`,
          trigger: "t",
          gateBinding: "g",
          logTurn: 1,
          confidence: 0.9,
        },
      ],
    }));
    const r = await mineLog(backend, bigLog, { sliceBudget: 1_500 });
    expect(r.slices).toBeGreaterThanOrEqual(2);
    expect(calls.length).toBe(r.slices);
    expect(r.candidates.length).toBe(r.slices);
  });

  test("a skipped slice is LOUD: its candidates are missing, the others proceed", async () => {
    const { backend } = miningBackend((input) =>
      input.includes("slice B") ? { skip: "endpoint error (HTTP 503)" } : {
        knowledge: [
          {
            candidate: `mined-${input.includes("slice A") ? "a" : "c"}`,
            trigger: "t",
            gateBinding: "g",
            logTurn: 1,
            confidence: 0.9,
          },
        ],
      }
    );
    const r = await mineLog(backend, "slice A lesson\nslice B lesson\nslice C lesson", { sliceBudget: 20 });
    expect(r.skippedAll).toBe(false);
    expect(r.reason).toContain("503");
    expect(r.candidates.length).toBe(2); // slices A and C mined; B skipped loudly
  });

  test("ALL slices skipped → skippedAll with the reason surfaced (never a silent pass)", async () => {
    const { backend } = miningBackend(() => ({ skip: "missing TYPELLM_API_KEY" }));
    const r = await mineLog(backend, LOG);
    expect(r.skippedAll).toBe(true);
    expect(r.reason).toContain("TYPELLM_API_KEY");
    expect(r.candidates).toHaveLength(0);
  });

  test("below-floor rows are DEFERRED, never counted as candidates (confidence-gated)", async () => {
    const { backend } = miningBackend(() => ({
      knowledge: [
        { candidate: "solid", trigger: "t", gateBinding: "g", logTurn: 1, confidence: 0.9 },
        { candidate: "shaky", trigger: "t", gateBinding: "g", logTurn: 2, confidence: TRIAGE_CONFIDENCE_FLOOR - 0.05 },
      ],
    }));
    const r = await mineLog(backend, LOG);
    expect(r.candidates.map((c) => c.candidate)).toEqual(["solid"]);
    expect(r.deferred).toHaveLength(1);
    expect(r.deferred[0].reason).toContain("floor");
  });

  test("a native null (no knowledge in this slice) is surfaced, not guessed", async () => {
    const { backend } = miningBackend(() => ({ knowledge: null }));
    const r = await mineLog(backend, LOG);
    expect(r.candidates).toHaveLength(0);
    expect(r.abstainedSlices).toBe(1);
    expect(r.reason).toContain("abstain");
  });

  test("rows missing the promotion fields are deferred loudly, others proceed", async () => {
    const { backend } = miningBackend(() => ({
      knowledge: [
        { candidate: "good", trigger: "t", gateBinding: "g", logTurn: 1, confidence: 0.9 },
        { candidate: "no-provenance", trigger: "t", gateBinding: "g", confidence: 0.9 },
      ],
    }));
    const r = await mineLog(backend, LOG);
    expect(r.candidates.map((c) => c.candidate)).toEqual(["good"]);
    expect(r.deferred[0].reason).toContain("logTurn");
  });
});

describe("doctrineCandidate — incident → structured rule (plan 077 T4)", () => {
  const INCIDENT =
    "INCIDENT 2026-11-12: a worker edited templates/DOCS-POLICY.md outside its Allowed Changes boundary. "
    + "RULE: containment violations are reported, never fixed (gate: agents/registry.md).";

  test("extracts the rule as a structured sieve candidate {rule, trigger, gateBinding}", async () => {
    const calls: { schema: object; input: string }[] = [];
    const backend: JudgeBackend = {
      name: "doctrine-fake",
      async classify(schema, input) {
        calls.push({ schema, input });
        return {
          skipped: false,
          bucket: null,
          value: {
            rule: "Containment violations are reported, never fixed",
            trigger: "a write outside the task's Allowed Changes",
            gateBinding: "agents/registry.md",
            confidence: 0.92,
          },
          confidence: 0.92,
        };
      },
    };
    const r = await doctrineCandidate(backend, INCIDENT);
    expect(r.skipped).toBe(false);
    expect(r.belowFloor).toBe(false);
    expect(r.candidate).toMatchObject({
      rule: "Containment violations are reported, never fixed",
      trigger: "a write outside the task's Allowed Changes",
      gateBinding: "agents/registry.md",
    });
    expect(calls[0].input).toContain("INCIDENT");
    // the question is schema-validated: rule is nullable (native abstention)
    const rule: any = (calls[0].schema as any).properties.rule;
    expect(rule.type).toContain("null");
  });

  test("the candidate shares the sieve vocabulary with mineLog rows (same promotion path)", async () => {
    const backend: JudgeBackend = {
      name: "doctrine-fake",
      async classify() {
        return {
          skipped: false,
          bucket: null,
          value: {
            rule: "r",
            trigger: "t",
            gateBinding: "g",
            confidence: 0.9,
          },
          confidence: 0.9,
        };
      },
    };
    const d = await doctrineCandidate(backend, INCIDENT);
    const { backend: mb } = miningBackend(() => ({
      knowledge: [{ candidate: "c", trigger: "t2", gateBinding: "g2", logTurn: 1, confidence: 0.9 }],
    }));
    const m = await mineLog(mb, LOG);
    // both carry {trigger, gateBinding} — the fields the sieve judges on
    expect(Object.keys(d.candidate!).sort()).toEqual(["confidence", "gateBinding", "rule", "trigger"]);
    expect(m.candidates[0]).toHaveProperty("trigger");
    expect(m.candidates[0]).toHaveProperty("gateBinding");
  });

  test("no extractable rule → native abstention, LOUD (the agent does the work)", async () => {
    const backend: JudgeBackend = {
      name: "doctrine-fake",
      async classify() {
        return { skipped: false, bucket: null, value: { rule: null, confidence: 0.8 }, confidence: 0.8 };
      },
    };
    const r = await doctrineCandidate(backend, "a chat about lunch, no rule here");
    expect(r.skipped).toBe(false);
    expect(r.candidate).toBe(null);
    expect(r.reason).toContain("abstention");
  });

  test("backend skip → LOUD skip (never a silent pass)", async () => {
    const backend: JudgeBackend = {
      name: "doctrine-fake",
      async classify() {
        return { skipped: true, bucket: null, confidence: 0, reason: "missing TYPELLM_API_KEY" };
      },
    };
    const r = await doctrineCandidate(backend, INCIDENT);
    expect(r.skipped).toBe(true);
    expect(r.candidate).toBe(null);
    expect(r.reason).toContain("TYPELLM_API_KEY");
  });

  test("below-floor confidence → the deterministic path (no candidate promoted)", async () => {
    const backend: JudgeBackend = {
      name: "doctrine-fake",
      async classify() {
        return {
          skipped: false,
          bucket: null,
          value: { rule: "r", trigger: "t", gateBinding: "g", confidence: 0.4 },
          confidence: 0.4,
        };
      },
    };
    const r = await doctrineCandidate(backend, INCIDENT);
    expect(r.skipped).toBe(false);
    expect(r.belowFloor).toBe(true);
    expect(r.candidate).toBe(null);
    expect(r.reason).toContain("floor");
  });
});
