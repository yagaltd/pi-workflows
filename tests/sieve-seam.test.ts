import { describe, expect, test } from "bun:test";
import {
  SIEVE_VALUE,
  SIEVE_RISK,
  SIEVE_EFFORT,
  SIEVE_PATH,
  SIEVE_OUTCOMES,
  SIEVE_SCHEMA,
  TRIAGE_CONFIDENCE_FLOOR,
  sieveOutcome,
  sieveInput,
  sieveProposal,
  renderSieveVerdict,
  type JudgeBackend,
  type SieveCells,
} from "../extensions/index.ts";
import {
  SIEVE_FIXTURES,
  evalSieveBackend,
  recordedSieveBackend,
} from "../scripts/bench-intake-triage.ts";

/* ── plan 078 T1: the 073 proposal-entry sieve consolidated onto JudgeBackend ──
 * The sieve (plan 20261117-073) predates the seam — its forced choices were
 * answered by hand from the doctrine text pinned in the proposal-entry skills.
 * T1 gives it its code surface ON the seam: same vocabulary, same pure outcome
 * rules, same confidence floor, same loud-skip — the doctrine pins in
 * tests/prompt-doctrine.test.ts (T1, plan 073) stay byte-identical throughout. */

const backend0_9 = (cells: Partial<SieveCells>): JudgeBackend => ({
  name: "fake-sieve",
  classify: async () => ({
    skipped: false,
    bucket: null,
    value: {
      value: "valuable",
      risk: "contained",
      effort: "s",
      path: "none",
      standalone: false,
      confidence: 0.9,
      evidence: "recorded",
      ...cells,
    },
    confidence: typeof cells.confidence === "number" ? cells.confidence : 0.9,
    evidence: "recorded",
  }),
});

describe("sieve seam consolidation (plan 078 T1) — vocabulary", () => {
  test("the four forced cells + outcomes are byte-identical to the 073 doctrine gate", () => {
    expect(SIEVE_VALUE).toEqual(["nice-to-have", "useful", "valuable", "must-have"]);
    expect(SIEVE_RISK).toEqual(["trivial", "contained", "serious", "severe"]);
    expect(SIEVE_EFFORT).toEqual(["xs", "s", "m", "l"]);
    expect(SIEVE_PATH).toEqual(["research", "inspect", "grill", "none"]);
    expect(SIEVE_OUTCOMES).toEqual(["park", "build-direct", "propose"]);
  });

  test("schema is schema-driven: enum cells, standalone boolean, confidence 0..1 required", () => {
    const props = (SIEVE_SCHEMA as any).properties;
    expect(props.value.enum).toEqual(SIEVE_VALUE);
    expect(props.risk.enum).toEqual(SIEVE_RISK);
    expect(props.effort.enum).toEqual(SIEVE_EFFORT);
    expect(props.path.enum).toEqual(SIEVE_PATH);
    expect(props.standalone.type).toBe("boolean");
    expect(props.confidence.minimum).toBe(0);
    expect(props.confidence.maximum).toBe(1);
    for (const cell of ["value", "risk", "effort", "path", "standalone", "confidence"])
      expect((SIEVE_SCHEMA as any).required).toContain(cell);
    expect((SIEVE_SCHEMA as any).additionalProperties).toBe(false);
  });

  test("the seam's shared confidence floor is the sieve's floor (one floor everywhere)", () => {
    expect(TRIAGE_CONFIDENCE_FLOOR).toBe(0.6);
  });
});

describe("sieve seam consolidation (plan 078 T1) — pure outcome rules", () => {
  test("nice-to-have or useful plus standalone → park (a ledger row, no plan)", () => {
    expect(sieveOutcome({ value: "nice-to-have", risk: "trivial", effort: "s", standalone: true })).toEqual({
      outcome: "park",
      decomposeFlag: false,
    });
    expect(sieveOutcome({ value: "useful", risk: "contained", effort: "m", standalone: true }).outcome).toBe("park");
    // NOT standalone → the park rule does not fire
    expect(sieveOutcome({ value: "useful", risk: "trivial", effort: "s", standalone: false }).outcome).toBe("propose");
  });

  test("severe → park plus a decompose flag (regardless of the other cells)", () => {
    expect(sieveOutcome({ value: "must-have", risk: "severe", effort: "l", standalone: false })).toEqual({
      outcome: "park",
      decomposeFlag: true,
    });
    expect(sieveOutcome({ value: "nice-to-have", risk: "severe", effort: "xs", standalone: true })).toEqual({
      outcome: "park",
      decomposeFlag: true,
    });
  });

  test("valuable or must-have with xs → build-direct (the lightweight tier)", () => {
    expect(sieveOutcome({ value: "valuable", risk: "contained", effort: "xs", standalone: false })).toEqual({
      outcome: "build-direct",
      decomposeFlag: false,
    });
    expect(sieveOutcome({ value: "must-have", risk: "trivial", effort: "xs", standalone: true })).toEqual({
      outcome: "build-direct",
      decomposeFlag: false,
    });
    // valuable at s (not xs) → propose
    expect(sieveOutcome({ value: "valuable", risk: "contained", effort: "s", standalone: false })).toEqual({
      outcome: "propose",
      decomposeFlag: false,
    });
  });

  test("any other verdict → propose", () => {
    expect(sieveOutcome({ value: "valuable", risk: "serious", effort: "m", standalone: true })).toEqual({
      outcome: "propose",
      decomposeFlag: false,
    });
    expect(sieveOutcome({ value: "must-have", risk: "contained", effort: "l", standalone: false })).toEqual({
      outcome: "propose",
      decomposeFlag: false,
    });
  });
});

describe("sieve seam consolidation (plan 078 T1) — seam semantics", () => {
  test("sieveProposal rides classify(schema, input) — usable verdict → outcome + defaultPath false", async () => {
    const calls: { schema: unknown; input: string }[] = [];
    const backend: JudgeBackend = {
      name: "capturing",
      classify: async (schema, input) => {
        calls.push({ schema, input });
        return {
          skipped: false,
          bucket: null,
          value: {
            value: "must-have",
            risk: "trivial",
            effort: "xs",
            path: "none",
            standalone: true,
            confidence: 0.9,
          },
          confidence: 0.9,
        };
      },
    };
    const r = await sieveProposal(backend, "add the --version flag to the CLI");
    expect(calls.length).toBe(1);
    expect(calls[0].schema).toBe(SIEVE_SCHEMA);
    expect(calls[0].input).toContain("--version flag");
    expect(r.skipped).toBe(false);
    expect(r.outcome).toBe("build-direct");
    expect(r.decomposeFlag).toBe(false);
    expect(r.defaultPath).toBe(false);
    expect(r.backend).toBe("capturing");
  });

  test("below-floor verdict keeps the cells visible but routes to the default path, loudly", async () => {
    const r = await sieveProposal(
      backend0_9({ value: "valuable", risk: "contained", effort: "s", standalone: false, confidence: 0.4 }),
      "extract a shared judge seam"
    );
    expect(r.outcome).toBe("propose"); // cells still render
    expect(r.defaultPath).toBe(true);
    expect(r.reason).toContain("below confidence floor");
    expect(r.reason).toContain("hand");
  });

  test("a backend skip is LOUD — the hand-answered doctrine gate applies, never a silent pass", async () => {
    const backend: JudgeBackend = {
      name: "no-key",
      classify: async () => ({
        skipped: true,
        bucket: null,
        confidence: 0,
        reason: "missing TYPELLM_API_KEY (env or ~/.config/pi-majordome/typellm.key)",
      }),
    };
    const r = await sieveProposal(backend, "rewrite the dispatch engine");
    expect(r.skipped).toBe(true);
    expect(r.outcome).toBeNull();
    expect(r.defaultPath).toBe(true);
    expect(r.reason).toContain("missing TYPELLM_API_KEY");
    const rendered = renderSieveVerdict("rewrite the dispatch engine", r);
    expect(rendered).toContain("JUDGE SKIPPED");
    expect(rendered).toContain("by hand");
  });

  test("schema-invalid cells are a loud skip, never a guess", async () => {
    const backend: JudgeBackend = {
      name: "misbehaving",
      classify: async () => ({
        skipped: false,
        bucket: null,
        value: { value: "huge", risk: "meh", effort: "xxl", path: "sideways", standalone: "yes", confidence: 0.9 },
        confidence: 0.9,
      }),
    };
    const r = await sieveProposal(backend, "anything");
    expect(r.skipped).toBe(true);
    expect(r.reason).toContain("outside the vocabulary");
  });

  test("sieveInput frames the forced-choice gate over the ask", () => {
    const input = sieveInput("add a tiny CLI flag");
    expect(input).toContain("four forced choices");
    expect(input).toContain("add a tiny CLI flag");
  });
});

describe("sieve seam consolidation (plan 078 T1) — rendering", () => {
  test("usable verdict renders the doctrine gate table + outcome line", async () => {
    const r = await sieveProposal(
      backend0_9({ value: "must-have", risk: "trivial", effort: "xs", path: "none", standalone: true }),
      "add the --version flag"
    );
    const out = renderSieveVerdict("add the --version flag", r);
    expect(out).toContain("| V value | must-have |");
    expect(out).toContain("| R risk | trivial |");
    expect(out).toContain("| E effort | xs |");
    expect(out).toContain("| path | none |");
    expect(out).toContain("Outcome: build-direct");
  });

  test("severe renders the decompose flag next to the park outcome", async () => {
    const r = await sieveProposal(
      backend0_9({ value: "valuable", risk: "severe", effort: "m", path: "grill", standalone: false }),
      "replace the auth layer"
    );
    const out = renderSieveVerdict("replace the auth layer", r);
    expect(out).toContain("Outcome: park + decompose flag");
  });
});

describe("harness sieve mode (plan 078 T1 — fixtures in the shared harness)", () => {
  test("fixture vocabulary mirrors the doctrine outcomes", () => {
    for (const f of SIEVE_FIXTURES) expect(SIEVE_OUTCOMES).toContain(f.expected);
    expect(SIEVE_FIXTURES.length).toBeGreaterThanOrEqual(6);
  });

  test("recorded replay: full accuracy on the fixture slice", async () => {
    const s = await evalSieveBackend(recordedSieveBackend());
    expect(s.total).toBe(SIEVE_FIXTURES.length);
    expect(s.correct).toBe(s.total);
    expect(s.accuracy).toBe(1);
    expect(s.skipped).toBe(0);
  });

  test("a judge skip is never a pass", async () => {
    const skipping: JudgeBackend = {
      name: "no-key",
      classify: async () => ({ skipped: true, bucket: null, confidence: 0, reason: "missing key" }),
    };
    const s = await evalSieveBackend(skipping);
    expect(s.correct).toBe(0);
    expect(s.skipped).toBe(SIEVE_FIXTURES.length);
    expect(s.accuracy).toBe(0);
  });
});
