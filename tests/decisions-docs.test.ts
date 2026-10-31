import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { main } from "../scripts/decisions.mjs";
import { requireLiveState } from "./state-helpers";

describe("decision index wiring (plan 20261025-027)", () => {
  const decisionsLive = requireLiveState([".workflows/decisions/DEC-001.md", ".workflows/decisions/DEC-002.md", ".workflows/decisions/DEC-003.md", ".workflows/decisions/INDEX.md", ".workflows/plan.md"], "seeded standing decisions DEC-001 DEC-002 DEC-003 and INDEX.md exist and decisions.mjs check passes against the live plan");
  test.skipIf(!decisionsLive)("seeded standing decisions render to the index and pass check", async () => {
    for (const id of ["DEC-001", "DEC-002", "DEC-003"]) {
      expect(fs.existsSync(path.join(".workflows/decisions", `${id}.md`))).toBe(true);
    }
    expect(fs.existsSync(".workflows/decisions/INDEX.md")).toBe(true);
    const code = await main(["check", "--plan", ".workflows/plan.md", "--dir", ".workflows/decisions"]);
    expect(code).toBe(0);
  });

  test("review skill and plan prompt carry the decision index gate", () => {
    const review = fs.readFileSync("skills/review/SKILL.md", "utf8"); // plan 038: the SKILL is the sole flow authority
    expect(review).toContain("decisions.mjs check");
    const plan = fs.readFileSync("skills/plan/SKILL.md", "utf8");
    expect(plan).toContain("decisions.mjs record");
  });
});
