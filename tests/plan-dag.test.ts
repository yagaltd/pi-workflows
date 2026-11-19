import { describe, expect, test } from "bun:test";
import {
  PLAN_DAG_SCHEMA,
  extractPlanDag,
  renderPlanDagTable,
  validatePlanDag,
  planDagInput,
  TRIAGE_CONFIDENCE_FLOOR,
  type JudgeBackend,
} from "../extensions/index.ts";
import {
  PLAN_DAG_FIXTURES,
  evalPlanDagBackend,
  recordedPlanDagBackend,
} from "../scripts/bench-intake-triage.ts";

/* ── plan 078 T3: /plan-time DAG extraction ──
 * The landed decompose machinery (REVIEW_DECOMPOSE_SCHEMA) generalized into a
 * plan-edge extractor: plan text → task `Depends On` edges, position-bias
 * controlled natively (probabilities + permutations on the edges question).
 * The /plan flow renders the edges for the OWNER to CONFIRM — wrong edges are
 * a finding, never silent acceptance. plan-check validates the confirmed
 * edges after (extraction before, validation after). */

const PLAN = [
  "# Plan 906",
  "",
  "## Spec Map",
  "",
  "| Task | Agent | Goal | Bottleneck | Testing Strategy | Wave | Depends On |",
  "|------|-------|------|------------|------------------|------|------------|",
  "| TASK_1 | scout | Survey auth module | ⚪ STANDARD | — | 0 | — |",
  "| TASK_2 | worker | Add login API `tdd:` | 🔴 BLOCKING | example-based | 1 | TASK_1 |",
  "| TASK_3 | worker | Add OAuth flow | 🟡 RISKY | example-based | 1 | TASK_1 |",
  "| TASK_4 | worker | Rate limiter | 🟠 VERIFICATION_HEAVY | property-based | 2 | TASK_2 |",
  "",
  "### TASK 1: Scout auth",
  "- **Depends on**: none",
  "",
  "### TASK 2: Build login",
  "- **Depends on**: TASK 1",
  "",
  "### TASK 4: Rate limiter",
  "- **Depends on**: TASK 2",
].join("\n");

const TASK_IDS = ["TASK_1", "TASK_2", "TASK_3", "TASK_4"];

const backendOk = (edges: { task: string; dependsOn: string[] }[], confidence = 0.9): JudgeBackend => ({
  name: "fake-plandag",
  classify: async () => ({
    skipped: false,
    bucket: null,
    value: { edges, confidence },
    confidence,
  }),
});

describe("plan DAG extraction (plan 078 T3) — schema", () => {
  test("the edges question carries native position-bias control (permutations)", () => {
    const props = (PLAN_DAG_SCHEMA as any).properties;
    expect(props.edges.type).toBe("array");
    expect(props.edges.probabilities.permutations).toBeGreaterThanOrEqual(2);
    expect(props.edges.items.required).toContain("task");
    expect(props.edges.items.required).toContain("dependsOn");
    expect((PLAN_DAG_SCHEMA as any).required).toContain("edges");
    expect((PLAN_DAG_SCHEMA as any).required).toContain("confidence");
    expect((PLAN_DAG_SCHEMA as any).additionalProperties).toBe(false);
  });

  test("questionsOf maps the schema onto the native surface (permutations survive transport mapping)", async () => {
    const captured: { init: any } | null = { init: null as any };
    let body: any;
    const backend = (await import("../extensions/index.ts")).makeTypellmBackend({
      key: "test-key",
      baseUrl: "http://127.0.0.1:1",
      fetchImpl: async (_url: any, init: any) => {
        body = JSON.parse(init.body);
        return { ok: false, status: 503, text: async () => "down" };
      },
    });
    await backend.classify(PLAN_DAG_SCHEMA, "irrelevant");
    const q = body.questions.edges;
    expect(q.return_probabilities).toBe(true);
    expect(q.permutations).toBeGreaterThanOrEqual(2);
    expect(q.items.type).toBe("object");
    void captured;
  });
});

describe("plan DAG extraction (plan 078 T3) — extraction", () => {
  test("planDagInput frames the extraction over the plan text", () => {
    const input = planDagInput(PLAN);
    expect(input).toContain("Depends On");
    expect(input).toContain("TASK_2");
  });

  test("usable edges come back with findings empty and defaultPath false", async () => {
    const edges = [
      { task: "TASK_1", dependsOn: [] },
      { task: "TASK_2", dependsOn: ["TASK_1"] },
      { task: "TASK_3", dependsOn: ["TASK_1"] },
      { task: "TASK_4", dependsOn: ["TASK_2"] },
    ];
    const r = await extractPlanDag(backendOk(edges), PLAN);
    expect(r.skipped).toBe(false);
    expect(r.defaultPath).toBe(false);
    expect(r.edges).toEqual(edges);
    expect(r.findings).toEqual([]);
    expect(r.calls).toBe(1);
  });

  test("an edge naming an unknown task is a FINDING, never silently dropped", async () => {
    const edges = [
      { task: "TASK_1", dependsOn: [] },
      { task: "TASK_2", dependsOn: ["TASK_9"] }, // unknown id
    ];
    const r = await extractPlanDag(backendOk(edges), PLAN, TASK_IDS);
    expect(r.findings.some((f) => f.kind === "unknown-task" && f.detail.includes("TASK_9"))).toBe(true);
    expect(r.edges).toEqual(edges); // the wrong edge stays VISIBLE for the owner
  });

  test("a duplicate task row is a finding", async () => {
    const edges = [
      { task: "TASK_1", dependsOn: [] },
      { task: "TASK_1", dependsOn: ["TASK_2"] },
    ];
    const r = await extractPlanDag(backendOk(edges), PLAN, TASK_IDS);
    expect(r.findings.some((f) => f.kind === "duplicate-task")).toBe(true);
  });

  test("a cyclic extraction is a finding (never accepted silently)", async () => {
    const edges = [
      { task: "TASK_1", dependsOn: ["TASK_2"] },
      { task: "TASK_2", dependsOn: ["TASK_1"] },
    ];
    const r = await extractPlanDag(backendOk(edges), PLAN, TASK_IDS);
    expect(r.findings.some((f) => f.kind === "cycle")).toBe(true);
  });

  test("a backend skip is LOUD — the hand-derived path applies", async () => {
    const backend: JudgeBackend = {
      name: "no-key",
      classify: async () => ({ skipped: true, bucket: null, confidence: 0, reason: "missing key" }),
    };
    const r = await extractPlanDag(backend, PLAN, TASK_IDS);
    expect(r.skipped).toBe(true);
    expect(r.defaultPath).toBe(true);
    expect(r.reason).toContain("missing key");
    expect(renderPlanDagTable(r)).toContain("JUDGE SKIPPED");
  });

  test("below-floor confidence routes to the default path loudly (the same floor as the seam)", async () => {
    const r = await extractPlanDag(
      backendOk([{ task: "TASK_1", dependsOn: [] }], 0.3),
      PLAN,
      TASK_IDS
    );
    expect(r.skipped).toBe(true);
    expect(r.defaultPath).toBe(true);
    expect(r.reason).toContain("below confidence floor");
    expect(TRIAGE_CONFIDENCE_FLOOR).toBe(0.6);
  });

  test("native null abstention (no extractable edges) is surfaced, not a guess", async () => {
    const backend: JudgeBackend = {
      name: "null-abstain",
      classify: async () => ({
        skipped: false,
        bucket: null,
        value: { edges: null, confidence: 0.9 },
        confidence: 0.9,
      }),
    };
    const r = await extractPlanDag(backend, PLAN, TASK_IDS);
    expect(r.skipped).toBe(false);
    expect(r.edges).toEqual([]);
    expect(r.findings).toEqual([]);
    expect(r.reason).toContain("no extractable edges");
  });
});

describe("plan DAG extraction (plan 078 T3) — rendering for owner confirmation", () => {
  test("the table carries task → depends-on rows + the confirmation framing", async () => {
    const edges = [
      { task: "TASK_1", dependsOn: [] },
      { task: "TASK_2", dependsOn: ["TASK_1"] },
    ];
    const r = await extractPlanDag(backendOk(edges), PLAN, TASK_IDS);
    const out = renderPlanDagTable(r);
    expect(out).toContain("CONFIRM");
    expect(out).toContain("TASK_2");
    expect(out).toContain("TASK_1");
  });

  test("findings render as FINDING rows — wrong edges are a finding, never silent", async () => {
    const edges = [
      { task: "TASK_1", dependsOn: [] },
      { task: "TASK_2", dependsOn: ["TASK_9"] },
    ];
    const r = await extractPlanDag(backendOk(edges), PLAN, TASK_IDS);
    const out = renderPlanDagTable(r);
    expect(out).toContain("FINDING");
    expect(out).toContain("TASK_9");
  });
});

describe("plan DAG extraction (plan 078 T3) — plan-check validates the confirmed edges after", () => {
  test("matching edges validate clean against the written plan", () => {
    const edges = [
      { task: "TASK 1", dependsOn: [] },
      { task: "TASK 2", dependsOn: ["TASK 1"] },
      { task: "TASK 4", dependsOn: ["TASK 2"] },
    ];
    const v = validatePlanDag(PLAN, edges);
    expect(v.ok).toBe(true);
    expect(v.mismatches).toEqual([]);
  });

  test("a wrong confirmed edge is a mismatch (named per task)", () => {
    const edges = [
      { task: "TASK 2", dependsOn: ["TASK 3"] }, // plan says TASK 1
    ];
    const v = validatePlanDag(PLAN, edges);
    expect(v.ok).toBe(false);
    expect(v.mismatches.join("\n")).toContain("TASK 2");
  });

  test("an edge for a task the plan does not define is a mismatch", () => {
    const v = validatePlanDag(PLAN, [{ task: "TASK 7", dependsOn: [] }]);
    expect(v.ok).toBe(false);
    expect(v.mismatches.join("\n")).toContain("TASK 7");
  });
});

describe("harness plandag mode (plan 078 T3)", () => {
  test("recorded replay: expected edges found, accuracy 1.0", async () => {
    const s = await evalPlanDagBackend(recordedPlanDagBackend());
    expect(s.total).toBe(PLAN_DAG_FIXTURES.length);
    expect(s.correct).toBe(s.total);
    expect(s.accuracy).toBe(1);
    expect(s.skipped).toBe(0);
    expect(s.findings).toBeGreaterThanOrEqual(1); // the messy fixture yields a visible finding
  });

  test("a judge skip is never a pass", async () => {
    const skipping: JudgeBackend = {
      name: "no-key",
      classify: async () => ({ skipped: true, bucket: null, confidence: 0, reason: "missing key" }),
    };
    const s = await evalPlanDagBackend(skipping);
    expect(s.correct).toBe(0);
    expect(s.skipped).toBe(PLAN_DAG_FIXTURES.length);
    expect(s.accuracy).toBe(0);
  });
});
