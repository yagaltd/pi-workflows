import { describe, expect, test } from "bun:test";
import fs from "node:fs";

const read = (p: string) =>
  fs.readFileSync(p, "utf8").replace(/\s+/g, " ");

// T2 — dispatch-policy doctrine (plan 20261102-050).
// NOTE: created by the T2 worker; T1 pins (role doctrine) may be appended
// to this file by the T1 worker in its own describe block.
describe("prompt doctrine — dispatch policy (T2, plan 20261102-050)", () => {
  test("registry dispatch policy assigns per-task budgets in the pack", () => {
    const registry = read("agents/registry.md");
    expect(registry).toContain(
      "The orchestrator assigns each task's budget in the pack (default 60 tool calls from role doctrine; judge/API-call caps explicit when the task touches judge/API surfaces)."
    );
  });

  test("execution doctrine report rules carry the Done-when assertion duty", () => {
    const doctrine = read("agents/execution-doctrine.md");
    expect(doctrine).toContain(
      "final report asserts each Done-when line individually"
    );
  });

  test("verify reviewer checklist gains the additive cite-check line", () => {
    const verify = read("prompts/verify.md");
    expect(verify).toContain(
      "Cite-check: spot-check that factual claims in doc-producing tasks carry file:line/URL citations; uncited claims are findings."
    );
  });

  test("contract format documents the optional Budget section (prose, not a parser key)", () => {
    const format = read("templates/CONTRACT-FORMAT.md");
    expect(format).toContain("## Budget");
    expect(format).toContain("human-readable prose");
    expect(format).toContain("NOT an agent-spec parser key");
  });
});
