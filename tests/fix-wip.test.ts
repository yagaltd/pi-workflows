import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const SKILL = path.join(ROOT, "skills", "fix", "SKILL.md");

function phase9(): string {
  const text = fs.readFileSync(SKILL, "utf8");
  const start = text.indexOf("## Phase 9: PREVENT");
  expect(start).toBeGreaterThan(-1);
  const rest = text.slice(start);
  const next = rest.indexOf("\n## ", 1);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("fix skill emits WIP state at STOP", () => {
  test("test_fix_phase9_emits_wip_start", () => {
    const phase = phase9();
    expect(phase).toContain("wip start");
    expect(phase).toContain("PI_WORKFLOWS_BIN:-./scripts/wf.sh");
    expect(phase).toMatch(/scope[^\n]*Allowed Changes/i);
    expect(phase).toContain("awaiting-review");
    expect(phase).toContain("<PlanID>/<task-id>");
  });

  test("test_fix_wip_state_id_includes_task_id", () => {
    const phase = phase9();
    expect(phase).toContain("--id");
    expect(phase).toMatch(/task[- ]id/i);
    expect(phase).not.toMatch(/--id\s+"[^"]*<task-id>[^"]*\+"/);
  });

  test("test_fix_stop_verbatim", () => {
    expect(phase9()).toContain("🛑 **STOP HERE.** Wait for human approval to commit.");
  });

  test("test_fix_has_no_agent_commit_instruction", () => {
    const phase = phase9();
    expect(phase).not.toMatch(/agent\s+(?:may|can|should|must)\s+commit/i);
    expect(phase).not.toMatch(/commit\s+without\s+(?:human\s+)?approval/i);
    expect(phase).not.toMatch(/agents?\s+commit/i);
    expect(phase).toContain("Wait for human approval to commit.");
  });

  test("test_fix_wip_linkage_only", () => {
    const phase = phase9();
    expect(phase).toContain("WIP-Batch");
    expect(phase).toMatch(/linkage\s+only/i);
    expect(phase).toMatch(/never\s+(?:create|update)\s+WIP\s+state/i);
  });
});
