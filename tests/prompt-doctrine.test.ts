import { describe, expect, test } from "bun:test";
import fs from "node:fs";

// Plan 20261102-050 T1 — role-file doctrine: the three DSH/Bise steals.
// Pins the exact doctrine lines in agents/worker.md and agents/reviewer.md.

const WORKER = fs.readFileSync("agents/worker.md", "utf8");
const REVIEWER = fs.readFileSync("agents/reviewer.md", "utf8");

const BUDGET =
  "Budget: at most 60 tool calls on standard tasks; judge/API-call caps are set per contract — when any budget is spent, report and stop, naming the spent line item.";
const DONE_WHEN =
  "Every pack carries a 'Done when:' acceptance checklist derived from the contract's verify command and completion criteria; the final report asserts each line individually.";
const CITE =
  "Doc- or claim-producing tasks: every factual claim cites file:line or a URL, or lands in an 'Open questions' section of the final report. An uncited, unflagged claim is a defect.";

describe("prompt doctrine: budget, done-when, cite-or-open-questions (plan 20261102-050 T1)", () => {
  test("budget line is pinned verbatim in worker and reviewer role files", () => {
    expect(WORKER).toContain(BUDGET);
    expect(REVIEWER).toContain(BUDGET);
  });

  test("done-when checklist line is pinned verbatim in the worker role file", () => {
    expect(WORKER).toContain(DONE_WHEN);
  });

  test("cite-or-open-questions line is pinned verbatim in worker and reviewer role files", () => {
    expect(WORKER).toContain(CITE);
    expect(REVIEWER).toContain(CITE);
  });

  test("doctrine lines sit in natural sections (worker: task-execution rules area; reviewer: verification rules area)", () => {
    const workerExec = WORKER.indexOf("## While You Build");
    const workerExecEnd = WORKER.indexOf("## Deterministic Verification");
    expect(workerExec).toBeGreaterThan(-1);
    expect(workerExecEnd).toBeGreaterThan(workerExec);
    const workerSlice = WORKER.slice(workerExec, workerExecEnd);
    expect(workerSlice).toContain(BUDGET);
    expect(workerSlice).toContain(DONE_WHEN);
    expect(workerSlice).toContain(CITE);

    const reviewerRules = REVIEWER.indexOf("## Rules");
    expect(reviewerRules).toBeGreaterThan(-1);
    const reviewerSlice = REVIEWER.slice(reviewerRules);
    expect(reviewerSlice).toContain(BUDGET);
    expect(reviewerSlice).toContain(CITE);
  });
});

const readT2 = (p: string) =>
  fs.readFileSync(p, "utf8").replace(/\s+/g, " ");

// --- T2: dispatch-policy pins (plan 20261102-050) ---
describe("prompt doctrine — dispatch policy (T2, plan 20261102-050)", () => {
  test("registry dispatch policy assigns per-task budgets in the pack", () => {
    const registry = readT2("agents/registry.md");
    expect(registry).toContain(
      "The orchestrator assigns each task's budget in the pack (default 60 tool calls from role doctrine; judge/API-call caps explicit when the task touches judge/API surfaces)."
    );
  });

  test("execution doctrine report rules carry the Done-when assertion duty", () => {
    const doctrine = readT2("agents/execution-doctrine.md");
    expect(doctrine).toContain(
      "final report asserts each Done-when line individually"
    );
  });

  test("verify reviewer checklist gains the additive cite-check line", () => {
    const verify = readT2("prompts/verify.md");
    expect(verify).toContain(
      "Cite-check: spot-check that factual claims in doc-producing tasks carry file:line/URL citations; uncited claims are findings."
    );
  });

  test("contract format documents the optional Budget section (prose, not a parser key)", () => {
    const format = readT2("templates/CONTRACT-FORMAT.md");
    expect(format).toContain("## Budget");
    expect(format).toContain("human-readable prose");
    expect(format).toContain("NOT an agent-spec parser key");
  });
});

// --- T3: /init model policy + catalog-first resolution (plan 20261102-051) ---
const readT3 = (p: string) => fs.readFileSync(p, "utf8");
const normT3 = (s: string) => s.replace(/\s+/g, " ");

describe("prompt doctrine — /init model policy + catalog-first resolution (T3, plan 20261102-051)", () => {
  test("init skill has a Model policy step 7 between the Charter probe and the handoff (renumbered 8)", () => {
    const skill = readT3("skills/init/SKILL.md");
    const probe = skill.indexOf("**Charter probe**");
    const model = skill.indexOf("**Model policy**");
    const handoff = skill.indexOf("**Hand off**");
    expect(probe).toBeGreaterThan(-1);
    expect(model).toBeGreaterThan(probe);
    expect(handoff).toBeGreaterThan(model);
    expect(skill).toMatch(/7\. \*\*Model policy\*\*/);
    expect(skill).toMatch(/8\. \*\*Hand off\*\*/);
  });

  test("model policy step queries the live pi catalog, presents the tier shortlist at a human gate, and writes models/registry.json with pi-catalog provenance", () => {
    const step = normT3(readT3("skills/init/SKILL.md"));
    const m = step.indexOf("Model policy");
    const slice = step.slice(m, step.indexOf("Hand off", m));
    expect(slice).toContain("catalog");
    expect(slice).toContain("strong/standard/scout/vision");
    expect(slice).toContain("🛑");
    expect(slice).toContain("models/registry.json");
    expect(slice).toContain("pi-catalog");
    expect(slice).toContain("native");
  });

  test("catalog = capability, never key files: the never-read-keys rule is pinned in the model policy step", () => {
    const step = normT3(readT3("skills/init/SKILL.md"));
    const m = step.indexOf("Model policy");
    const slice = step.slice(m, step.indexOf("Hand off", m));
    expect(slice).toContain("capability");
    expect(slice).toContain("NEVER");
    expect(slice).toMatch(/key files|key contents|API keys/);
  });

  test("registry.md Model resolution order: live pi catalog (native-preferred) → models/registry.json → legacy constants with loud WARN", () => {
    const registry = normT3(readT3("agents/registry.md"));
    const m = registry.indexOf("## Model resolution");
    expect(m).toBeGreaterThan(-1);
    const slice = registry.slice(m, registry.indexOf("## Dispatch cwd policy")).toLowerCase();
    const cat = slice.indexOf("live pi catalog");
    const file = slice.indexOf("models/registry.json", cat + 1);
    const legacy = slice.indexOf("legacy", file + 1);
    expect(cat).toBeGreaterThan(-1);
    expect(file).toBeGreaterThan(cat);
    expect(legacy).toBeGreaterThan(file);
    expect(slice).toContain("native-preferred");
    expect(slice).toContain("never silent");
    expect(slice).toContain("never key files");
  });

  test("legacy deepseek constants remain marked fallbacks in registry.md", () => {
    const registry = normT3(readT3("agents/registry.md"));
    expect(registry).toContain("deepseek/deepseek-v4-pro");
    expect(registry).toContain("openrouter/~deepseek/deepseek-flash-latest");
    expect(registry).toContain("fallback");
  });
});
