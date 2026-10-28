import { describe, expect, test } from "bun:test";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(p, "utf8");

describe("budget + journal wiring (plan 20261025-024)", () => {
  test("auto-next carries the budget stop; record steps are extension-owned (plan 036)", () => {
    const auto = read("prompts/auto-next.md");
    expect(auto).toContain("BUDGET STOP");
    expect(auto).toContain(".workflows/budget.json");
    expect(auto).toContain("dispatch_next");
    const next = read("prompts/next.md");
    expect(next).toContain("dispatch_next");
    // plan 20261026-036: record steps moved into the extension — the prompts
    // stay silent about proof-ledger/run-journal invocations.
    expect(next).not.toContain("run-journal.mjs record");
    expect(auto).not.toContain("run-journal.mjs record");
  });

  test("readme documents the budget file and resume command", () => {
    const s = read("README.md");
    expect(s).toContain(".workflows/budget.json");
    expect(s).toContain("run-journal.mjs resume --plan");
    expect(s).toContain("Run budget + journal");
  });
});
