import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { main } from "../scripts/decisions.mjs";

describe("decision index wiring (plan 20261025-027)", () => {
  test("seeded standing decisions render to the index and pass check", async () => {
    for (const id of ["DEC-001", "DEC-002", "DEC-003"]) {
      expect(fs.existsSync(path.join(".workflows/decisions", `${id}.md`))).toBe(true);
    }
    expect(fs.existsSync(".workflows/decisions/INDEX.md")).toBe(true);
    const code = await main(["check", "--plan", ".workflows/plan.md", "--dir", ".workflows/decisions"]);
    expect(code).toBe(0);
  });

  test("review and plan prompts carry the decision index gate", () => {
    const review = fs.readFileSync("prompts/review.md", "utf8");
    expect(review).toContain("decisions.mjs check");
    const plan = fs.readFileSync("skills/plan/SKILL.md", "utf8");
    expect(plan).toContain("decisions.mjs record");
  });
});
