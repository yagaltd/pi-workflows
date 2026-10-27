import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appendIntentTrail, intentGuardApplies, intentGuardSuggest } from "../extensions/index";

const PLAN = `# Plan: fixture (062)

### TASK 1 (Tier B, 🟡): ledger — scripts/x.mjs
- **Status**: ⬜ PENDING
`;

describe("intent-guard hook (plan 20261026-030)", () => {
  test("hook suggestion carries the tier and entry command for problem-level answers", () => {
    const problem = intentGuardSuggest({ route: "answer", kind: "unrelated", confidence: 0.88, tier: "problem" });
    expect(problem?.message.content).toContain("/idea");
    expect(problem?.message.content).toContain("tier=problem");
    const solution = intentGuardSuggest({ route: "answer", kind: "unrelated", confidence: 0.9, tier: "solution" });
    expect(solution?.message.content).toContain("/plan");
    const procedure = intentGuardSuggest({ route: "answer", kind: "unrelated", confidence: 0.9, tier: "procedure" });
    expect(procedure?.message.content).toContain("/add");
    const noTier = intentGuardSuggest({ route: "answer", kind: "unrelated", confidence: 0.9 });
    expect(noTier?.message.content).not.toContain("consider");
    const amend = intentGuardSuggest({ route: "amend", kind: "amend_needed", confidence: 0.93, tier: "solution" });
    expect(amend?.message.content).toContain("tier=solution");
    expect(intentGuardSuggest({ route: "proceed", kind: "current_spec", confidence: 0.95, tier: "procedure" })).toBeUndefined();
  });

  test("hook builds a suggest-only message for user prompts on a live plan", () => {
    const amend = intentGuardSuggest({ route: "amend", kind: "amend_needed", confidence: 0.93 });
    expect(amend?.message.customType).toBe("pi-workflows-intent-guard");
    expect(amend?.message.content).toContain("/amend");
    expect(amend?.message.content).toContain("suggest-only");

    const answer = intentGuardSuggest({ route: "answer", kind: "unrelated", confidence: 0.88 });
    expect(answer?.message.content).toContain("do not start tasks");

    const ask = intentGuardSuggest({ route: "ask", kind: "clarification", kind2: undefined, confidence: 0.5 } as never);
    expect(ask?.message.content).toContain("clarifying question");

    expect(intentGuardSuggest({ route: "proceed", kind: "current_spec", confidence: 0.95 })).toBeUndefined();
    expect(intentGuardSuggest({ route: "ask-human", kind: null, confidence: null })).toBeUndefined();
  });

  test("hook stays inert for commands custom messages or no live plan", () => {
    expect(intentGuardApplies({ messageType: "user", prompt: "/amend the thing" })).toBe(false); // explicit command
    expect(intentGuardApplies({ messageType: "custom", message: {} })).toBe(false);
    expect(intentGuardApplies({ messageType: "user", prompt: "   " })).toBe(false);
    expect(intentGuardApplies({ messageType: "user", prompt: "finish the ledger" })).toBe(true);
    expect(intentGuardApplies(undefined)).toBe(false);
  });

  test("hook appends the verdict to the intent trail", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ih-"));
    const trail = path.join(tmp, "trail.jsonl");
    appendIntentTrail(trail, "finish the ledger", { route: "proceed", kind: "current_spec", confidence: 0.92, probabilities: { current_spec: 0.92 } });
    const rows = fs.readFileSync(trail, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(rows).toHaveLength(1);
    expect(rows[0].route).toBe("proceed");
    expect(rows[0].query).toBe("finish the ledger");
    expect(rows[0].threshold).toBe(0.85);
    expect(rows[0].probabilities.current_spec).toBeCloseTo(0.92);
    // best-effort: unwritable path never throws
    expect(() => appendIntentTrail("/proc/definitely/trail.jsonl", "q", { route: "ask", kind: null, confidence: null })).not.toThrow();
  });
});
