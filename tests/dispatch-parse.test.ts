import { describe, expect, test } from "bun:test";
import { parsePlan, parseTaskBullets } from "../extensions/index.ts";

// Plan 20261104-062 T1 — dispatcher colon-placement tolerance. The TASK
// bullet grammar is `- **Label**: value` (colon outside bold, canonical);
// the dispatcher must also parse `- **Label:** value` (legacy, colon
// inside bold) identically.

const CANONICAL_BODY = `Some prose intro.
- **Status**: ⬜
- **Wave**: 2
- **Depends On**: TASK 1
- **tdd**: true
- **Allowed**: src/a.ts, tests/a.test.ts
- **Verify**: bun test
`;

const LEGACY_BODY = CANONICAL_BODY.replace("**Status**:", "**Status:**")
  .replace("**Wave**:", "**Wave:**")
  .replace("**Depends On**:", "**Depends On:**")
  .replace("**tdd**:", "**tdd:**")
  .replace("**Allowed**:", "**Allowed:**")
  .replace("**Verify**:", "**Verify:**");

describe("parseTaskBullets: colon-placement tolerance (plan 20261104-062 T1)", () => {
  test("(a) canonical and colon-inside-bold forms parse identically for every label", () => {
    const canonical = parseTaskBullets(CANONICAL_BODY);
    const legacy = parseTaskBullets(LEGACY_BODY);
    expect(legacy).toEqual(canonical);
    for (const label of [
      "Status",
      "Wave",
      "Depends On",
      "tdd",
      "Allowed",
      "Verify",
    ]) {
      expect(legacy[label]).toBe(canonical[label]);
    }
    expect(canonical["Allowed"]).toBe("src/a.ts, tests/a.test.ts");
    expect(canonical["Wave"]).toBe("2");
    expect(canonical["Depends On"]).toBe("TASK 1");
    expect(canonical["Verify"]).toBe("bun test");
    expect(canonical["Status"]).toBe("⬜");
    expect(canonical["tdd"]).toBe("true");
  });

  test("(b) canonical regression: full TASK body parses identically before/after", () => {
    const plan = `# Plan: x
> Plan ID: 20261104-062

## Tasks

### TASK 1 (Tier B, 🟡): do the thing

- **Status**: ⬜
- **Wave**: 1
- **Depends On**: None
- **tdd**: true
- **Allowed**: src/a.ts, tests/a.test.ts
- **Verify**: bun test

## Notes
`;
    const t = parsePlan(plan)[0];
    expect(t).toMatchObject({
      id: "task-1",
      num: "1",
      tier: "B",
      tag: "🟡",
      status: "pending",
      wave: 1,
      deps: [],
      tdd: true,
      allowed: ["src/a.ts", "tests/a.test.ts"],
      verify: "bun test",
      contractPath: ".workflows/specs/task-1.spec",
    });
    // and the same plan in legacy colon form must parse identically
    const legacyPlan = plan
      .replace("**Status**:", "**Status:**")
      .replace("**Wave**:", "**Wave:**")
      .replace("**Depends On**:", "**Depends On:**")
      .replace("**tdd**:", "**tdd:**")
      .replace("**Allowed**:", "**Allowed:**")
      .replace("**Verify**:", "**Verify:**");
    expect(parsePlan(legacyPlan)[0]).toEqual(t);
  });

  test("(c) bare-text bullets without bold stay unparsed", () => {
    const bullets = parseTaskBullets("- Allowed: src/a.ts\n- Wave: 1\n");
    expect(bullets["Allowed"]).toBeUndefined();
    expect(bullets["Wave"]).toBeUndefined();
    expect(Object.keys(bullets)).toHaveLength(0);
  });
});
