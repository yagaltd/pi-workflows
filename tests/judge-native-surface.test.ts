import { describe, expect, test } from "bun:test";
import {
  BATCH_HEADER_PREFIX,
  DECOMPOSE_INPUT_MARKER,
  REVIEW_VERDICTS,
  REVIEW_VERDICT_SCHEMA,
  REVIEW_CONTEXT_WINDOW,
  makeTypellmBackend,
  reviewVerdicts,
  reviewVerdictsBatched,
  reviewVerdictsDag,
  type JudgeBackend,
  type ReviewScenario,
} from "../extensions/index.ts";

/* ── plan 077 Task 1: the TypeLLM native-surface transport upgrade ──
 * The landed phases hand-rolled or under-used six native capabilities.
 * This file pins the upgrades at the transport and runner level:
 *   1. nullable output types (["verdict","null"]) — architectural
 *      no-answer; a null verdict maps to uncertain (Tier 2), never a guess;
 *   2. native return_probabilities + permutations — position-bias-averaged
 *      probabilities FROM THE API (the hand-rolled 2-call decompose
 *      permutation loop is deleted; decompose runs once);
 *   3. array-of-objects verdict questions — the flat {id}_verdict key hack
 *      is deleted, per-scenario rows ride one native array question;
 *   4. 128K context window — the 32K chunk constant is raised; chunking
 *      only fires beyond 128K chars;
 *   5. images pass-through (Base64 data URIs, ≤8/call ×10MB, loud-skip on
 *      violation);
 *   6. thinking + thinking_budget per question (opt-in via the schema);
 *   + usage token accounting surfaced on results.
 * Contracts preserved: {verdict, confidence, evidence}, floor 0.6,
 * uncertain→Tier 2, loud-skip, render tables. */

const SCENARIOS: ReviewScenario[] = [
  { id: "S1", claim: "claim one" },
  { id: "S2", claim: "claim two" },
  { id: "S3", claim: "claim three" },
];

/** Verdict rows in the native array-of-objects response shape. A null
 *  override verdict is preserved (the native abstention). */
function verdictRows(
  input: string,
  over?: Record<string, { verdict?: string | null; confidence?: number; probabilities?: Record<string, number> }>
): Record<string, unknown>[] {
  return SCENARIOS.filter((s) => input.includes(`Scenario ${s.id}:`)).map((s) => {
    const o = over?.[s.id] ?? {};
    const row: Record<string, unknown> = {
      id: s.id,
      verdict: "verdict" in o ? o.verdict : "pass",
      confidence: o.confidence ?? 0.9,
      evidence: `evidence for ${s.id}`,
    };
    if (o.probabilities) row.probabilities = o.probabilities;
    return row;
  });
}

/** A capture fake answering the native array shape. */
function captureFake(
  answer?: (schema: object, input: string) => Record<string, unknown> | { skip: string }
) {
  const calls: { schema: object; input: string }[] = [];
  const backend: JudgeBackend = {
    name: "capture-fake",
    async classify(schema, input) {
      calls.push({ schema, input });
      const out = answer?.(schema, input) ?? { verdicts: verdictRows(input) };
      if ("skip" in out)
        return { skipped: true, bucket: null, confidence: 0, reason: out.skip };
      return { skipped: false, bucket: null, value: out, confidence: 0.9 };
    },
  };
  return { calls, backend };
}

/* ── 1. nullable abstention ── */

describe("native nullable abstention (plan 077 T1)", () => {
  test("the review-verdict schema's verdict question is nullable (native no-answer)", () => {
    const verdict = (REVIEW_VERDICT_SCHEMA as any).properties.verdict;
    expect(Array.isArray(verdict.type)).toBe(true);
    expect(verdict.type).toContain("null");
    expect(verdict.type).toContain("string");
    // vocabulary contract unchanged
    expect(verdict.enum).toEqual(REVIEW_VERDICTS);
  });

  test("a null verdict answer maps to uncertain + Tier 2, never a guess", async () => {
    const backend: JudgeBackend = {
      name: "abstaining",
      async classify() {
        return {
          skipped: false,
          bucket: null,
          value: { verdict: null, confidence: 0.8, evidence: "cannot decide" },
          confidence: 0.8,
        };
      },
    };
    const r = await reviewVerdicts(backend, SCENARIOS.slice(0, 1), "d");
    expect(r.results[0].verdict).toBe("uncertain");
    expect(r.results[0].skipped).toBeFalsy(); // an honest abstention, not a transport skip
    expect(r.results[0].reason).toContain("abstention");
    expect(r.deepRead).toEqual(["S1"]);
    expect(r.skippedAll).toBe(false);
  });

  test("a null verdict in a batch row maps to uncertain for THAT scenario only", async () => {
    const { backend } = captureFake((_s, input) => ({
      verdicts: verdictRows(input, { S2: { verdict: null } }),
    }));
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(r.results.find((x) => x.scenario === "S2")?.verdict).toBe("uncertain");
    expect(r.results.find((x) => x.scenario === "S2")?.reason).toContain("abstention");
    expect(r.results.find((x) => x.scenario === "S1")?.verdict).toBe("pass");
    expect(r.deepRead).toEqual(["S2"]);
  });

  test("the transport validates null against a nullable schema field", async () => {
    const bodies: any[] = [];
    const backend = makeTypellmBackend({
      key: "k",
      fetchImpl: async (_url: string, init: any) => {
        bodies.push(JSON.parse(init.body));
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ result: { verdict: null, confidence: 0.7 } }),
        };
      },
    } as any);
    const schema = {
      type: "object",
      properties: {
        verdict: { type: ["string", "null"], enum: ["a", "b"], description: "d" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
      },
      required: ["verdict"],
    };
    const v = await backend.classify(schema as object, "x");
    expect(bodies[0].questions.verdict.nullable).toBe(true);
    expect(v.skipped).toBe(false);
    expect(v.value?.verdict).toBe(null);
  });
});

/* ── 2. native return_probabilities + permutations ── */

describe("native probabilities (plan 077 T1)", () => {
  test("the batch verdict question carries native return_probabilities + permutations", async () => {
    const { calls, backend } = captureFake();
    await reviewVerdictsBatched(backend, SCENARIOS, "d");
    const q: any = (calls[0].schema as any).properties.verdicts;
    expect(q.probabilities?.permutations).toBeGreaterThanOrEqual(2);
  });

  test("row probabilities are surfaced on the scenario verdicts", async () => {
    const { backend } = captureFake((_s, input) => ({
      verdicts: verdictRows(input, {
        S1: { probabilities: { pass: 0.9, fail: 0.06, uncertain: 0.04 } },
      }),
    }));
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(r.results[0].probabilities).toEqual({ pass: 0.9, fail: 0.06, uncertain: 0.04 });
  });

  test("decompose runs ONCE — the hand-rolled 2-call permutation loop is gone", async () => {
    let decomposeCalls = 0;
    const backend: JudgeBackend = {
      name: "one-shot-decompose",
      async classify(_schema, input) {
        if (input.includes(DECOMPOSE_INPUT_MARKER)) {
          decomposeCalls++;
          return {
            skipped: false,
            bucket: null,
            value: {
              decomposition: JSON.stringify({
                groups: [
                  { id: "J1", scenarios: ["S1", "S2"], depends_on: [] },
                  { id: "J2", scenarios: ["S3"], depends_on: ["J1"] },
                ],
              }),
            },
            confidence: 0.9,
          };
        }
        return { skipped: false, bucket: null, value: { verdicts: verdictRows(input) }, confidence: 0.9 };
      },
    };
    const r = await reviewVerdictsDag(backend, SCENARIOS, "d");
    expect(decomposeCalls).toBe(1);
    expect(r.calls).toBe(3); // 1 decompose + 2 sub-judgments
    expect(r.results).toHaveLength(3);
  });
});

/* ── 3. array-of-objects verdict questions (flat-key hack deleted) ── */

describe("native array-of-objects verdicts (plan 077 T1)", () => {
  test("the batch schema is ONE native array question — no flat {id}_verdict keys", async () => {
    const { calls, backend } = captureFake();
    await reviewVerdictsBatched(backend, SCENARIOS, "d");
    const schema: any = calls[0].schema;
    const keys = Object.keys(schema.properties);
    expect(keys).toEqual(["verdicts"]);
    expect(schema.properties.verdicts.type).toBe("array");
    expect(schema.properties.verdicts.items.type).toBe("object");
    expect(schema.properties.verdicts.items.properties.verdict.enum).toEqual(REVIEW_VERDICTS);
    expect(schema.properties.verdicts.minItems).toBeGreaterThanOrEqual(1);
    expect(schema.properties.verdicts.maxItems).toBeLessThanOrEqual(200);
    expect(JSON.stringify(schema)).not.toContain("_verdict");
  });

  test("per-scenario rows parsed by id into the verdict array", async () => {
    const { backend } = captureFake((_s, input) => ({
      verdicts: verdictRows(input, { S2: { verdict: "fail", confidence: 0.85 } }),
    }));
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(r.results.map((x) => x.scenario)).toEqual(["S1", "S2", "S3"]);
    expect(r.results[1]).toMatchObject({
      scenario: "S2",
      verdict: "fail",
      confidence: 0.85,
      evidence: "evidence for S2",
    });
    expect(r.deepRead).toEqual([]);
  });

  test("a missing row id → THAT scenario loud-skips, the others proceed", async () => {
    const { backend } = captureFake((_s, input) => ({
      verdicts: verdictRows(input).filter((row) => row.id !== "S3"),
    }));
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    const s3 = r.results.find((x) => x.scenario === "S3");
    expect(s3?.verdict).toBe("uncertain");
    expect(s3?.skipped).toBe(true);
    expect(s3?.reason).toContain("S3");
    expect(r.results.find((x) => x.scenario === "S1")?.verdict).toBe("pass");
    expect(r.deepRead).toEqual(["S3"]);
    expect(r.skippedAll).toBe(false);
  });

  test("enum-invalid verdict inside a row → loud skip for that scenario only", async () => {
    const { backend } = captureFake((_s, input) => ({
      verdicts: verdictRows(input, { S2: { verdict: "ship-it" } }),
    }));
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(r.results.find((x) => x.scenario === "S2")?.skipped).toBe(true);
    expect(r.deepRead).toContain("S2");
  });
});

/* ── 4. the 128K window ── */

describe("128K context window (plan 077 T1)", () => {
  test("the chunk constant is 128K — chunking only fires beyond it", () => {
    expect(REVIEW_CONTEXT_WINDOW).toBe(128_000);
  });

  test("a 100KB diff fits UNCHUNKED in one call (per-scenario evidence)", async () => {
    const { calls, backend } = captureFake();
    const diff = "x".repeat(100_000);
    const r = await reviewVerdictsBatched(backend, SCENARIOS.slice(0, 1), diff);
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toContain(diff);
    expect(calls[0].input.length).toBeLessThanOrEqual(REVIEW_CONTEXT_WINDOW);
    expect(r.calls).toBe(1);
    expect(r.results).toHaveLength(1);
  });

  test("evidence beyond the window still chunks deterministically, never over it", async () => {
    const { calls, backend } = captureFake();
    // three scenarios each carrying a 60KB evidence block: the shared diff
    // repeats per block, so blocks pair up under the 128K window → 2 chunks
    const diff = "y".repeat(60_000);
    const r = await reviewVerdictsBatched(backend, SCENARIOS, diff);
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const c of calls) expect(c.input.length).toBeLessThanOrEqual(REVIEW_CONTEXT_WINDOW);
    expect(r.chunks).toBe(calls.length);
  });
});

/* ── 5. images pass-through ── */

const PNG_URI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

describe("images pass-through (plan 077 T1)", () => {
  test("the transport passes images through in the request body", async () => {
    const bodies: any[] = [];
    const backend = makeTypellmBackend({
      key: "k",
      fetchImpl: async (_url: string, init: any) => {
        bodies.push(JSON.parse(init.body));
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ result: { bucket: "done", confidence: 0.9 }, usage: { input_tokens: 5 } }),
        };
      },
    } as any);
    const v = await backend.classify(
      // a minimal triage-shaped schema for the answer
      {
        type: "object",
        properties: {
          bucket: { type: "string", enum: ["done"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["bucket", "confidence"],
      } as object,
      "see the screenshot",
      { images: [PNG_URI] }
    );
    expect(bodies[0].images).toEqual([PNG_URI]);
    expect(v.skipped).toBe(false);
  });

  test("more than 8 images per call → LOUD skip before any network call", async () => {
    let called = 0;
    const backend = makeTypellmBackend({
      key: "k",
      fetchImpl: (async () => {
        called++;
        throw new Error("must not be called");
      }) as any,
    });
    const v = await backend.classify({ type: "object", properties: {} } as object, "x", {
      images: Array.from({ length: 9 }, () => PNG_URI),
    });
    expect(v.skipped).toBe(true);
    expect(v.reason).toContain("8");
    expect(called).toBe(0);
  });

  test("an image over 10MB → LOUD skip; a non-data-URI → LOUD skip", async () => {
    let called = 0;
    const backend = makeTypellmBackend({
      key: "k",
      fetchImpl: (async () => {
        called++;
        throw new Error("must not be called");
      }) as any,
    });
    const huge = `data:image/png;base64,${"A".repeat(14 * 1024 * 1024)}`;
    const v1 = await backend.classify({ type: "object", properties: {} } as object, "x", { images: [huge] });
    expect(v1.skipped).toBe(true);
    expect(v1.reason).toContain("10MB");
    const v2 = await backend.classify({ type: "object", properties: {} } as object, "x", {
      images: ["https://example.com/shot.png"],
    });
    expect(v2.skipped).toBe(true);
    expect(v2.reason).toContain("data URI");
    expect(called).toBe(0);
  });
});

/* ── 6. thinking + thinking_budget (opt-in, per question) ── */

describe("thinking budget (plan 077 T1)", () => {
  test("a schema field opting into thinking maps to {thinking, thinking_budget}", async () => {
    const bodies: any[] = [];
    const backend = makeTypellmBackend({
      key: "k",
      fetchImpl: async (_url: string, init: any) => {
        bodies.push(JSON.parse(init.body));
        return { ok: true, status: 200, text: async () => JSON.stringify({ result: { verdict: "pass" } }) };
      },
    } as any);
    const schema = {
      type: "object",
      properties: {
        verdict: {
          type: "string",
          enum: ["pass", "fail"],
          description: "d",
          thinking: { budget: 512 },
        },
      },
    };
    await backend.classify(schema as object, "x");
    expect(bodies[0].questions.verdict.thinking).toBe(true);
    expect(bodies[0].questions.verdict.thinking_budget).toBe(512);
  });

  test("no thinking opt-in → no thinking fields on the wire", async () => {
    const bodies: any[] = [];
    const backend = makeTypellmBackend({
      key: "k",
      fetchImpl: async (_url: string, init: any) => {
        bodies.push(JSON.parse(init.body));
        return { ok: true, status: 200, text: async () => JSON.stringify({ result: { verdict: "pass" } }) };
      },
    } as any);
    await backend.classify(
      {
        type: "object",
        properties: { verdict: { type: "string", enum: ["pass"], description: "d" } },
      } as object,
      "x"
    );
    expect(bodies[0].questions.verdict.thinking).toBeUndefined();
    expect(bodies[0].questions.verdict.thinking_budget).toBeUndefined();
  });
});

/* ── + usage accounting surfaced ── */

describe("usage surfaced (plan 077 T1)", () => {
  test("the transport surfaces the endpoint's usage on the verdict", async () => {
    const backend = makeTypellmBackend({
      key: "k",
      fetchImpl: (async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ result: { bucket: "done", confidence: 0.9 }, usage: { input_tokens: 120, thinking_tokens: 40 } }),
      })) as any,
    });
    const v = await backend.classify(
      {
        type: "object",
        properties: {
          bucket: { type: "string", enum: ["done"] },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["bucket", "confidence"],
      } as object,
      "x"
    );
    expect(v.usage).toEqual({ input_tokens: 120, thinking_tokens: 40 });
  });

  test("the batched runner aggregates usage across its calls", async () => {
    let n = 0;
    const backend: JudgeBackend = {
      name: "usage-fake",
      async classify(_schema, input) {
        n++;
        return {
          skipped: false,
          bucket: null,
          value: { verdicts: verdictRows(input) },
          confidence: 0.9,
          usage: { input_tokens: 100 + n, thinking_tokens: 10 * n },
        };
      },
    };
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(r.usage).toEqual({ input_tokens: 101, thinking_tokens: 10 });
  });
});

/* ── the live transport stays on the {context, questions} contract ── */

describe("native-surface transport wire shape (plan 077 T1)", () => {
  test("batch call: one array question, native probability flags, one POST", async () => {
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
                verdicts: [
                  { id: "S1", verdict: "pass", confidence: 0.9 },
                  { id: "S2", verdict: "fail", confidence: 0.9 },
                ],
              },
            }),
        };
      },
    } as any);
    const r = await reviewVerdictsBatched(backend, SCENARIOS.slice(0, 2), "d");
    expect(bodies).toHaveLength(1);
    const q: any = bodies[0].questions.verdicts;
    expect(q.type).toBe("array");
    expect(q.return_probabilities).toBe(true);
    expect(q.permutations).toBeGreaterThanOrEqual(2);
    expect(q.items.properties.verdict.enum).toEqual(REVIEW_VERDICTS);
    expect(bodies[0].context).toContain("Scenario S1:");
    expect(r.results[0].verdict).toBe("pass");
    expect(r.results[1].verdict).toBe("fail");
  });

  test("the batch input header is a stable exported marker (harness replay seam)", () => {
    expect(BATCH_HEADER_PREFIX).toBe("Review judge:");
  });
});
