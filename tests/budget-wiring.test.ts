import { describe, expect, test } from "bun:test";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(p, "utf8");

describe("budget + journal wiring (plan 20261025-024)", () => {
  test("auto-next and next prompts carry the budget and journal protocol", () => {
    const auto = read("prompts/auto-next.md");
    expect(auto).toContain("Budget + journal");
    expect(auto).toContain("run-journal.mjs record");
    expect(auto).toContain("run-journal.mjs check");
    expect(auto).toContain("BUDGET STOP");
    expect(auto).toContain("budget-exhausted");
    const next = read("prompts/next.md");
    expect(next).toContain("run-journal.mjs record");
    expect(next).toContain("--event dispatched");
  });

  test("readme documents the budget file and resume command", () => {
    const s = read("README.md");
    expect(s).toContain(".workflows/budget.json");
    expect(s).toContain("run-journal.mjs resume --plan");
    expect(s).toContain("Run budget + journal");
  });
});
