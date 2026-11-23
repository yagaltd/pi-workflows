import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const SKILL = path.join(ROOT, "skills", "refactor", "SKILL.md");
const text = () => fs.readFileSync(SKILL, "utf8");

function phase2(): string {
  const source = text();
  const start = source.indexOf("## Phase 2: EXECUTE");
  const end = source.indexOf("## Phase 3: VERIFY", start);
  return source.slice(start, end);
}

describe("refactor skill resolves commit contradiction", () => {
  test("test_refactor_step_emits_wip_state", () => {
    const phase = phase2();
    expect(phase).toContain("wip start");
    expect(phase).toContain("PI_WORKFLOWS_BIN:-./scripts/wf.sh");
    expect(phase).toMatch(/scope[^\n]*Allowed Changes/i);
    expect(phase).not.toContain("Commit the step");
    expect(phase).not.toMatch(/git\s+add\s+-A\s*&&\s*git\s+commit/);
    expect(phase).toMatch(/rollback\s+point/i);
  });

  test("test_refactor_stop_verbatim", () => {
    expect(text()).toContain("🛑 **STOP HERE.** Wait for human approval.");
    expect(text()).toContain("Human decides: keep or rollback.");
  });

  test("test_refactor_final_commit_with_review", () => {
    expect(text()).toMatch(/final\s+SHIP\s+commit\s+belongs\s+to\s+`\/review`/i);
    expect(text()).not.toMatch(/git\s+add\s+-A\s*&&\s*git\s+commit/);
  });

  test("test_refactor_single_wip_batch_per_task", () => {
    const phase = phase2();
    expect([...phase.matchAll(/wip\s+start/g)].length).toBe(1);
    expect(phase).toMatch(/once\s+per\s+task/i);
    expect(phase).toContain("<PlanID>/<task-id>");
    expect(phase).not.toMatch(/for each step[\s\S]{0,240}wip\s+start/i);
  });
});
