// flow-schema — the flow format (plan 20261025-022).
// A flow is declarative input to the dispatcher: steps, waves, gates.
// Zero dependencies; runs anywhere node runs.

export const STEP_KINDS = ["task", "gate", "transform", "decision"];
export const GATE_NAMES = ["contract", "test-quality", "review"];
export const QUESTION_KINDS = ["choose", "rate", "verify", "probability"];
export const TIERS = ["A", "B", "C"];

export const BLOCKED_CODES = {
  SCHEMA: "schema-invalid",
  DUP_ID: "dup-id",
  UNKNOWN_KIND: "unknown-kind",
  SELF_EDGE: "self-edge",
  CYCLE: "cycle",
  MISSING_REF: "missing-ref",
  EMPTY_WAVE: "empty-wave",
  BAD_DEP_WAVE: "bad-dep-wave",
};

export function exampleFlow() {
  return {
    slug: "example",
    title: "Example flow",
    steps: [
      { id: "s1", kind: "task", title: "First task", tier: "B", wave: 1, depends_on: [], tdd: false, allowed: ["src/a.ts"], verify: "bun test", model: "standard", thinking: "medium", role: "worker" },
      { id: "g1", kind: "gate", gate: "review", wave: 2, depends_on: ["s1"] },
    ],
  };
}
