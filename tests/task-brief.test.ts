import { describe, expect, test } from "bun:test";
import {
  extractTaskBrief,
  findTaskSlice,
  type JudgeBackend,
} from "../extensions/index.ts";

/* ── plan 077 Tasks 5+6: the extraction pair ──
 * Task 5: TypeLLM pulls the MINIMAL per-task brief from long brownfield
 * plans/docs (32k slice budget, chunked search) — dispatch packs carry the
 * extracted slice instead of full documents. Augment-only: contracts stay
 * the primary context mechanism; the harness proves worker-success parity
 * (brief vs full doc) on fixtures.
 * Task 6: plan text → draft .spec scenarios/steps/selectors skeleton for
 * OWNER REVIEW before agent-spec init. Output is a DRAFT — never written to
 * specs/ automatically. Both: schema-driven, loud-skip, native abstention
 * (no brief / no scenarios → surfaced, never guessed). */

/** A long brownfield plan: Task 3's real content sits behind ~80k of filler. */
function longPlan(): string {
  const filler = (tag: string, n: number) =>
    Array.from({ length: n }, (_, i) => `${tag} filler line ${i}: background context for the plan. Note the constraints.`).join("\n");
  return [
    "# Plan 900 — brownfield",
    filler("Task1", 900),
    "### Task 3",
    "Deliverable: rewrite scripts/closeout.mjs queue section.",
    "Allowed Changes: scripts/closeout.mjs, tests/closeout-queue.test.ts",
    "Boundary: never touch templates/.",
    filler("mid", 900),
    "### Task 4",
    "Deliverable: docs sweep.",
    filler("Task4", 900),
  ].join("\n");
}

function briefBackend(
  answer: (input: string) => Record<string, unknown> | { skip: string }
): { backend: JudgeBackend; calls: string[] } {
  const calls: string[] = [];
  return {
    backend: {
      name: "brief-fake",
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

describe("findTaskSlice — the 32k-budget slice (plan 077 T5)", () => {
  test("finds the task's section inside a long plan, within budget, without the neighbors", () => {
    const plan = longPlan();
    const slice = findTaskSlice(plan, "3", 32_000);
    expect(slice).not.toBe(null);
    expect(slice!.text).toContain("rewrite scripts/closeout.mjs");
    expect(slice!.text).toContain("Allowed Changes: scripts/closeout.mjs");
    expect(slice!.text.length).toBeLessThanOrEqual(32_000);
    // the distant Task 4 section is not the slice's center
    expect(slice!.text.indexOf("rewrite scripts/closeout.mjs")).toBeLessThan(slice!.text.length / 2);
  });

  test("a task id absent from the plan → null (caller loud-skips)", () => {
    expect(findTaskSlice(longPlan(), "99", 32_000)).toBe(null);
  });
});

describe("extractTaskBrief — the minimal per-task brief (plan 077 T5)", () => {
  test("ONE call over the task's slice → {taskId, objective, deliverables, constraints}", async () => {
    const { backend, calls } = briefBackend(() => ({
      taskId: "3",
      objective: "Rewrite the closeout queue section.",
      deliverables: ["scripts/closeout.mjs queue rewrite", "tests/closeout-queue.test.ts pins"],
      constraints: ["never touch templates/", "augment-only: contracts stay primary"],
      confidence: 0.9,
    }));
    const plan = longPlan();
    const r = await extractTaskBrief(backend, plan, "3");
    expect(r.skipped).toBe(false);
    expect(r.brief).toMatchObject({
      taskId: "3",
      objective: "Rewrite the closeout queue section.",
      constraints: ["never touch templates/", "augment-only: contracts stay primary"],
    });
    expect(r.brief!.deliverables).toHaveLength(2);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("rewrite scripts/closeout.mjs");
    // chunked input ok: the call rides the 32k slice, well under the window
    expect(calls[0].length).toBeLessThanOrEqual(32_000 + 4_000);
  });

  test("absent task id → LOUD skip, no call", async () => {
    const { backend, calls } = briefBackend(() => ({}));
    const r = await extractTaskBrief(backend, longPlan(), "99");
    expect(r.skipped).toBe(true);
    expect(r.reason).toContain("99");
    expect(calls).toHaveLength(0);
    expect(r.brief).toBe(null);
  });

  test("backend skip → LOUD skip (the worker gets the full doc, never a silent gap)", async () => {
    const { backend, calls } = briefBackend(() => ({ skip: "missing TYPELLM_API_KEY" }));
    const r = await extractTaskBrief(backend, longPlan(), "3");
    expect(r.skipped).toBe(true);
    expect(r.reason).toContain("TYPELLM_API_KEY");
    expect(calls).toHaveLength(1);
    expect(r.brief).toBe(null);
  });

  test("native abstention (objective null) → loud no-brief, never guessed", async () => {
    const { backend } = briefBackend(() => ({ taskId: "3", objective: null, confidence: 0.8 }));
    const r = await extractTaskBrief(backend, longPlan(), "3");
    expect(r.skipped).toBe(false);
    expect(r.brief).toBe(null);
    expect(r.reason).toContain("abstention");
  });
});
