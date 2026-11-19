import { describe, expect, test } from "bun:test";
import {
  BATCH_HEADER_PREFIX,
  EVASION_QUESTIONS,
  REVIEW_VERDICT_SCHEMA,
  batchVerdictSchema,
  renderVerdictTable,
  reviewVerdictsBatched,
  reviewVerdictsDag,
  type EvasionAssessment,
  type JudgeBackend,
  type ReviewScenario,
} from "../extensions/index.ts";

/* ── plan 20261119-079 Task 2: the judge evasion-detection pack ──
 * Every reviewVerdicts batch gains the evasion questions —
 * {invisible_chars, env_bypass, normalization_equivalent, oracle_binding_stated}
 * — with evidence-quoted instructions (abstain when the scanner did not
 * run: an unanswered evasion question is a loud Tier-2 flag, never a
 * guess), and the Tier-0 scanner's findings ride the batch input as
 * evidence. The verdict contract is UNCHANGED otherwise: per-scenario rows
 * stay {id, verdict, confidence, evidence}, the enum/floor/Tier-2 routing
 * are untouched, and a skip leaves the evasion questions unanswered —
 * flagged loudly, never silent. */

const SCENARIOS: ReviewScenario[] = [
  { id: "S1", claim: "The diff honors the pinned rule name." },
  { id: "S2", claim: "Docs lines match the code." },
];

const SCANNER_FINDINGS =
  "invisible-char U+200B ZERO WIDTH SPACE — byte 10, line 1: rule alpha\\u{200b}-beta";

/** A capture fake that answers verdict rows + the evasion questions when
 *  the batch asks for them. */
function evasionFake(
  answer?: { evasion?: Record<string, unknown> | null; skip?: string; rows?: boolean }
) {
  const calls: { schema: object; input: string }[] = [];
  const backend: JudgeBackend = {
    name: "evasion-fake",
    async classify(schema, input) {
      calls.push({ schema, input });
      if (answer?.skip)
        return { skipped: true, bucket: null, confidence: 0, reason: answer.skip };
      const schemaAny = schema as any;
      const wantsEvasion = !!schemaAny.properties?.evasion;
      const rows = [
        { id: "S1", verdict: "pass", confidence: 0.9, evidence: "ev1" },
        { id: "S2", verdict: "fail", confidence: 0.9, evidence: "ev2" },
      ].filter((r) => input.includes(`Scenario ${r.id}:`));
      const value: Record<string, unknown> = { verdicts: rows };
      if (wantsEvasion && answer?.evasion !== null)
        value.evasion =
          answer?.evasion ?? {
            invisible_chars: 0,
            env_bypass: false,
            normalization_equivalent: false,
            oracle_binding_stated: true,
          };
      return { skipped: false, bucket: null, value, confidence: 0.9 };
    },
  };
  return { calls, backend };
}

describe("evasion pack — the questions ARE in the batch body", () => {
  test("batchVerdictSchema carries exactly the four evasion questions with instructions", () => {
    const schema = batchVerdictSchema(["S1"]) as any;
    const evasion = schema.properties.evasion;
    expect(evasion).toBeTruthy();
    expect(Object.keys(evasion.properties).sort()).toEqual(
      ["env_bypass", "invisible_chars", "normalization_equivalent", "oracle_binding_stated"]
    );
    expect(evasion.properties.invisible_chars.type).toBe("integer");
    expect(evasion.properties.env_bypass.type).toBe("boolean");
    expect(evasion.properties.normalization_equivalent.type).toBe("boolean");
    expect(evasion.properties.oracle_binding_stated.type).toBe("boolean");
    // instructions: quote the evidence; never guess on a missing scanner
    const text = JSON.stringify(evasion);
    expect(text).toContain("evidence");
    expect(text).toContain("ABSTAIN");
  });

  test("EVASION_QUESTIONS is exported for the harness and names the doctrine", () => {
    expect(Object.keys(EVASION_QUESTIONS).sort()).toEqual(
      ["env_bypass", "invisible_chars", "normalization_equivalent", "oracle_binding_stated"]
    );
    expect(JSON.stringify(EVASION_QUESTIONS)).toContain("oracle");
  });

  test("the verdicts contract is UNCHANGED: row shape + verdict schema untouched", () => {
    const schema = batchVerdictSchema(["S1"]) as any;
    const item = schema.properties.verdicts.items;
    expect(Object.keys(item.properties).sort()).toEqual(
      ["confidence", "evidence", "id", "verdict"].sort()
    );
    expect(item.required).toEqual(["id", "verdict"]);
    expect((REVIEW_VERDICT_SCHEMA as any).properties.evasion).toBeUndefined();
  });
});

describe("evasion pack — scanner evidence rides the batch input", () => {
  test("evasionEvidence flows into every chunk's input as the evidence section", async () => {
    const { calls, backend } = evasionFake();
    await reviewVerdictsBatched(backend, SCENARIOS, "d", {
      evasionEvidence: SCANNER_FINDINGS,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toContain(BATCH_HEADER_PREFIX);
    expect(calls[0].input).toContain("EVASION EVIDENCE");
    expect(calls[0].input).toContain("U+200B");
    expect(calls[0].input).toContain("byte 10");
  });

  test("no scanner evidence → the input says the scanner did not run and orders abstention", async () => {
    const { calls, backend } = evasionFake();
    await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(calls[0].input).toContain("scanner did not run");
    expect(calls[0].input).toContain("ABSTAIN");
  });
});

describe("evasion pack — parsing the answers (loud when unanswered)", () => {
  test("an answered batch parses into the assessment, unanswered=false", async () => {
    const { backend } = evasionFake({
      evasion: {
        invisible_chars: 2,
        env_bypass: true,
        normalization_equivalent: false,
        oracle_binding_stated: true,
      },
    });
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d", {
      evasionEvidence: SCANNER_FINDINGS,
    });
    const ev: EvasionAssessment | undefined = r.evasion;
    expect(ev).toBeTruthy();
    expect(ev!.unanswered).toBe(false);
    expect(ev!.invisibleChars).toBe(2);
    expect(ev!.envBypass).toBe(true);
    expect(ev!.normalizationEquivalent).toBe(false);
    expect(ev!.oracleBindingStated).toBe(true);
  });

  test("verdicts answered but evasion omitted → unanswered=true with a reason (LOUD, never a guess)", async () => {
    const { backend } = evasionFake({ evasion: null });
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(r.evasion?.unanswered).toBe(true);
    expect(r.evasion?.reason).toBeTruthy();
    expect(r.results[0].verdict).toBe("pass"); // verdict rows unaffected
    const out = renderVerdictTable(r);
    expect(out).toContain("EVASION QUESTIONS UNANSWERED");
  });

  test("a partial/invalid evasion answer → unanswered (schema-invalid fields never parse as values)", async () => {
    const { backend } = evasionFake({
      evasion: { invisible_chars: 1, env_bypass: "yes" },
    });
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(r.evasion?.unanswered).toBe(true);
    expect(r.evasion?.envBypass).toBeNull();
  });

  test("a skipped call → evasion unanswered with the skip reason; rows loud-skip as before", async () => {
    const { backend } = evasionFake({ skip: "no key" });
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    expect(r.skippedAll).toBe(true);
    expect(r.evasion?.unanswered).toBe(true);
    expect(r.evasion?.reason).toContain("no key");
    const out = renderVerdictTable(r);
    expect(out).toContain("JUDGE SKIPPED");
    expect(out).toContain("EVASION QUESTIONS UNANSWERED");
  });

  test("an answered assessment renders its values into the table", async () => {
    const { backend } = evasionFake({
      evasion: {
        invisible_chars: 3,
        env_bypass: false,
        normalization_equivalent: true,
        oracle_binding_stated: false,
      },
    });
    const r = await reviewVerdictsBatched(backend, SCENARIOS, "d");
    const out = renderVerdictTable(r);
    expect(out).toContain("invisible_chars=3");
    expect(out).toContain("oracle_binding_stated=false");
  });
});

describe("evasion pack — the DAG runner carries the same pack", () => {
  test("every sub-judgment call's schema carries the evasion questions; the assessment aggregates", async () => {
    const { calls, backend } = evasionFake();
    const r = await reviewVerdictsDag(backend, SCENARIOS, "d", {
      evasionEvidence: SCANNER_FINDINGS,
    });
    // decompose + one call per sub-judgment (fallback: independent groups)
    const verdictCalls = calls.filter((c) =>
      (c.schema as any).properties?.verdicts !== undefined
    );
    expect(verdictCalls.length).toBeGreaterThanOrEqual(2);
    for (const c of verdictCalls)
      expect((c.schema as any).properties.evasion).toBeTruthy();
    expect(r.evasion?.unanswered).toBe(false);
  });

  test("DAG with no scanner evidence → unanswered loudly", async () => {
    const { backend } = evasionFake({ evasion: null });
    const r = await reviewVerdictsDag(backend, SCENARIOS, "d");
    expect(r.evasion?.unanswered).toBe(true);
    expect(renderVerdictTable(r)).toContain("EVASION QUESTIONS UNANSWERED");
  });
});
