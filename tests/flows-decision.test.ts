import { describe, expect, test } from "bun:test";
import { BLOCKED_CODES } from "../scripts/flow-schema.mjs";
import { validateFlow } from "../scripts/flow-validate.mjs";
import { judgeQuestions, runDecisionStep } from "../scripts/flow-decision.mjs";

const step = {
  id: "d1", kind: "decision", wave: 1, depends_on: [],
  questions: [
    { id: "route", prompt: "What does this request touch?", kind: "choose", options: ["current_spec", "amend_needed", "unrelated", "clarification"] },
    { id: "sure", prompt: "How sure?", kind: "probability" },
  ],
  assert: { question: "sure", min_confidence: 0.8 },
};

describe("flow-decision (plan 20261025-023)", () => {
  test("decision steps ask the judge and record typed answers", async () => {
    const seen = [];
    const ask = async ({ questions }) => {
      seen.push(questions);
      return { status: 0, verdict: [{ id: "route", verdict: "current_spec" }, { id: "sure", verdict: 0.92, confidence: 0.92 }] };
    };
    const r = await runDecisionStep(step, { ask });
    expect(r.status).toBe("pass");
    expect(r.answers.route).toEqual({ value: "current_spec", confidence: 1 });
    expect(r.answers.sure.confidence).toBe(0.92);
    expect(seen[0][0].schema).toEqual({ type: "string", enum: step.questions[0].options });
  });

  test("decision steps skip loudly when the judge is unavailable", async () => {
    const r = await runDecisionStep(step, { ask: async () => ({ status: 0, skipped: true }) });
    expect(r.status).toBe("skipped");
    expect(r.reason).toContain("NO-JUDGE");
  });

  test("decision assertions fail the step below the confidence threshold", async () => {
    const low = await runDecisionStep(step, { ask: async () => ({ status: 0, verdict: [{ id: "sure", verdict: 0.9, confidence: 0.55 }] }) });
    expect(low.status).toBe("fail");
    expect(low.reason).toContain("0.55");

    const eq = await runDecisionStep({ ...step, assert: { question: "route", equals: "amend_needed" } },
      { ask: async () => ({ status: 0, verdict: [{ id: "route", verdict: "unrelated" }] }) });
    expect(eq.status).toBe("fail");

    const inside = await runDecisionStep({ ...step, assert: { question: "route", in: ["current_spec", "clarification"] } },
      { ask: async () => ({ status: 0, verdict: [{ id: "route", verdict: "weird" }] }) });
    expect(inside.status).toBe("fail");
  });

  test("validator accepts decision steps and flags malformed questions", () => {
    const ok = validateFlow({ slug: "d", title: "d", steps: [step] });
    expect(ok.ok).toBe(true);
    const bad = validateFlow({ slug: "d", title: "d", steps: [{ ...step, questions: [{ id: "q", prompt: "p", kind: "choose" }] }] });
    expect(bad.errors.map((e) => e.code)).toContain(BLOCKED_CODES.SCHEMA);
  });

  test("judgeQuestions enforces the question cap", () => {
    const many = { ...step, questions: Array.from({ length: 65 }, (_, i) => ({ id: `q${i}`, prompt: "p", kind: "verify" })) };
    expect(() => judgeQuestions(many)).toThrow(/1\.\.64/);
  });
});
