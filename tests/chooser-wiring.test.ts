import { describe, expect, test } from "bun:test";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(p, "utf8");

describe("chooser wiring (plan 20261026-032)", () => {
  test("boundaries carry the chooser step and the view rules", () => {
    expect(read("prompts/review.md")).toContain("format-chooser.mjs choose --for closeout");
    expect(read("skills/plan/SKILL.md")).toContain("format-chooser.mjs choose --for plan-approval");
    expect(read("skills/challenge/SKILL.md")).toContain("format-chooser.mjs choose --for challenge");
    const bs = read("skills/brainstorm/SKILL.md");
    expect(bs).toContain("format-chooser.mjs choose --for brainstorm-graduation");
    expect(bs).toContain("never a gate");
    expect(read("prompts/review.md")).toContain("Overrule needs a stated reason");
    expect(read("README.md")).toContain("## Format chooser");
    expect(read("README.md")).toContain("the correct default");
  });

  test("markmap is retired from brainstorm surfaces", () => {
    const surfaces = ["skills/brainstorm/SKILL.md", "skills/brainstorm/references/ledger-format.md", "prompts/brainstorm.md"]
      .map(read)
      .join("\n");
    expect(surfaces).not.toContain("npx markmap-cli");
    expect(surfaces).not.toContain("initialExpandLevel");
    expect(surfaces).toContain("ledger");
  });

  test("queue drops the cancelled e row and may be empty", () => {
    const rows = JSON.parse(read(".workflows/queue.json"));
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.some((r) => r.option.startsWith("E "))).toBe(false);
    for (const r of rows) for (const c of ["option", "what", "effort", "risk", "unblocks", "recommend"]) expect(typeof r[c]).toBe("string");
  });
});
