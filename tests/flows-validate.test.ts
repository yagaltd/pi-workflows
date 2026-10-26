import { describe, expect, test } from "bun:test";
import { BLOCKED_CODES, exampleFlow } from "../scripts/flow-schema.mjs";
import { computeWaves, validateFlow } from "../scripts/flow-validate.mjs";

const task = (id, wave, deps = [], over = {}) => ({
  id, kind: "task", title: `Task ${id}`, tier: "B", wave, depends_on: deps,
  tdd: false, allowed: [`src/${id}.ts`], verify: "bun test",
  model: "standard", thinking: "medium", role: "worker", ...over,
});
const gate = (id, wave, deps = [], name = "review") => ({ id, kind: "gate", gate: name, wave, depends_on: deps });

describe("flow-validate (plan 20261025-022)", () => {
  test("flows validate against the schema with blocked codes", () => {
    const good = exampleFlow();
    expect(validateFlow(good)).toEqual({ ok: true, errors: [] });

    const bad = { slug: "Bad_Slug", title: "", steps: [{ ...task("s1", 1), verify: "" }] };
    const r = validateFlow(bad);
    expect(r.ok).toBe(false);
    const codes = r.errors.map((e) => e.code);
    expect(codes).toContain(BLOCKED_CODES.SCHEMA);

    const unknown = { slug: "u", title: "u", steps: [{ id: "x", kind: "quantum", wave: 1, depends_on: [] }] };
    expect(validateFlow(unknown).errors[0].code).toBe(BLOCKED_CODES.UNKNOWN_KIND);
  });

  test("cycles self-edges and missing refs are blocked codes", () => {
    const flow = { slug: "c", title: "c", steps: [task("a", 1, ["b"]), task("b", 2, ["a"])] };
    const r = validateFlow(flow);
    expect(r.errors.map((e) => e.code)).toContain(BLOCKED_CODES.CYCLE);

    const self = { slug: "s", title: "s", steps: [task("a", 1, ["a"])] };
    expect(validateFlow(self).errors.map((e) => e.code)).toContain(BLOCKED_CODES.SELF_EDGE);

    const missing = { slug: "m", title: "m", steps: [task("a", 1, ["ghost"])] };
    expect(validateFlow(missing).errors.map((e) => e.code)).toContain(BLOCKED_CODES.MISSING_REF);
  });

  test("empty waves and duplicate ids are blocked codes", () => {
    const gappy = { slug: "g", title: "g", steps: [task("a", 1), task("b", 3)] };
    expect(validateFlow(gappy).errors.map((e) => e.code)).toContain(BLOCKED_CODES.EMPTY_WAVE);

    const dup = { slug: "d", title: "d", steps: [task("a", 1), gate("a", 2)] };
    expect(validateFlow(dup).errors.map((e) => e.code)).toContain(BLOCKED_CODES.DUP_ID);

    const depWave = { slug: "w", title: "w", steps: [task("a", 2), task("b", 2, ["a"])] };
    expect(validateFlow(depWave).errors.map((e) => e.code)).toContain(BLOCKED_CODES.BAD_DEP_WAVE);
  });

  test("computeWaves orders distinct waves ascending", () => {
    expect(computeWaves({ steps: [task("a", 2), gate("g", 1)] })).toEqual([1, 2]);
  });
});
