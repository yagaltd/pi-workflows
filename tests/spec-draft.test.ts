import { describe, expect, test } from "bun:test";
import {
  draftSpecScenarios,
  renderSpecDraft,
  type JudgeBackend,
} from "../extensions/index.ts";

/* ── Task 6: spec-draft extraction ── */

const PLAN_TEXT = [
  "# Plan 901 — the widget gate",
  "",
  "Task 1: add scripts/widget-gate.sh; it must fail on empty patterns.",
  "Gate: scripts/widget-gate.sh runs in CI; docs-lint stays clean.",
  "Test the gate rejects `grep -q '' f` selectors and accepts numeric -A6.",
].join("\n");

function draftBackend(
  answer: (input: string) => Record<string, unknown> | { skip: string }
): { backend: JudgeBackend; calls: string[] } {
  const calls: string[] = [];
  return {
    backend: {
      name: "draft-fake",
      async classify(schema, input) {
        calls.push(input);
        const out = answer(input);
        if ("skip" in out) return { skipped: true, bucket: null, confidence: 0, reason: out.skip };
        return { skipped: false, bucket: null, value: out, confidence: 0.9 };
      },
    },
    calls,
  };
}

describe("draftSpecScenarios — the draft-only skeleton (plan 077 T6)", () => {
  const SCENARIOS = [
    {
      name: "empty pattern rejected",
      test: "bash scripts/widget-gate.sh fixtures/bad.spec",
      given: "a selector with an empty quoted pattern",
      when: "the gate parses it",
      then: "a finding is emitted",
    },
    {
      name: "numeric context accepted",
      test: "bash scripts/widget-gate.sh fixtures/good.spec",
      given: "a selector with -A6",
      when: "the gate parses it",
      then: "no finding is emitted",
    },
  ];

  test("plan text → draft scenarios/steps/selectors, status draft", async () => {
    const { backend, calls } = draftBackend(() => ({
      name: "Widget gate",
      tags: ["fixture", "gate"],
      intent: "Fixture for scripts/widget-gate.sh",
      scenarios: SCENARIOS,
      confidence: 0.9,
    }));
    const r = await draftSpecScenarios(backend, PLAN_TEXT);
    expect(r.skipped).toBe(false);
    expect(r.status).toBe("draft"); // DRAFT ONLY — owner review before agent-spec init
    expect(r.draft.scenarios).toHaveLength(2);
    expect(r.draft.scenarios[0]).toMatchObject({
      name: "empty pattern rejected",
      test: "bash scripts/widget-gate.sh fixtures/bad.spec",
      given: "a selector with an empty quoted pattern",
      when: "the gate parses it",
      then: "a finding is emitted",
    });
    expect(calls[0]).toContain("widget-gate");
  });

  test("renderSpecDraft produces the .spec skeleton text for owner review", async () => {
    const { backend } = draftBackend(() => ({
      name: "Widget gate",
      tags: ["gate"],
      intent: "Fixture intent",
      scenarios: SCENARIOS,
      confidence: 0.9,
    }));
    const r = await draftSpecScenarios(backend, PLAN_TEXT);
    const text = renderSpecDraft(r.draft);
    expect(text).toContain("spec: task");
    expect(text).toContain('name: "Widget gate"');
    expect(text).toContain("## Intent");
    expect(text).toContain("Scenario: empty pattern rejected");
    expect(text).toContain("Test: bash scripts/widget-gate.sh fixtures/bad.spec");
    expect(text).toContain("Given a selector with an empty quoted pattern");
    expect(text).toContain("## Completion Criteria");
  });

  test("backend skip → LOUD skip", async () => {
    const { backend } = draftBackend(() => ({ skip: "missing TYPELLM_API_KEY" }));
    const r = await draftSpecScenarios(backend, PLAN_TEXT);
    expect(r.skipped).toBe(true);
    expect(r.reason).toContain("TYPELLM_API_KEY");
    expect(r.draft.scenarios).toHaveLength(0);
  });

  test("native abstention (no scenarios) → loud, empty draft", async () => {
    const { backend } = draftBackend(() => ({ name: "n", scenarios: null }));
    const r = await draftSpecScenarios(backend, "a plan with nothing extractable");
    expect(r.skipped).toBe(false);
    expect(r.draft.scenarios).toHaveLength(0);
    expect(r.reason).toContain("abstention");
  });
});
