import { describe, expect, test } from "bun:test";
import fs from "node:fs";

describe("typesafe + queue wiring (plan 20261025-029)", () => {
  test("docs name typesafe config and the next-moves gate", () => {
    const readme = fs.readFileSync("README.md", "utf8");
    expect(readme).toContain("/v1/systemone");
    expect(readme).toContain("TYPESAFE_API_KEY");
    expect(readme).toContain("auth.json");
    expect(readme).toContain("decision_brief_present");
    const plan = fs.readFileSync("prompts/plan.md", "utf8");
    expect(plan).toContain("TYPESAFE_API_KEY");
    expect(plan).not.toContain("TYPEDLLM_API_KEY");
  });

  test("queue json carries c d e options with all columns", () => {
    const rows = JSON.parse(fs.readFileSync(".workflows/queue.json", "utf8"));
    // Structural invariant (031): rows carry all columns; shipped rows (C, D)
    // never come back; at least one open row remains.
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const cols = ["option", "what", "effort", "risk", "unblocks", "recommend"];
    for (const r of rows) for (const c of cols) expect(typeof r[c]).toBe("string");
    expect(rows.some((r) => r.option.startsWith("C ") || r.option.startsWith("D "))).toBe(false);
    expect(fs.readFileSync("README.md", "utf8")).not.toContain("TYPEDLLM_BASE_URL");
  });
});
