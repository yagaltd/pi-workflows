import { describe, expect, test } from "bun:test";
import fs from "node:fs";

describe("lessons in plan + challenge (plan 20261026-031)", () => {
  test("plan and challenge prompts read the lessons ledger", () => {
    const plan = fs.readFileSync("skills/plan/SKILL.md", "utf8");
    expect(plan).toContain("lessons.mjs list");
    expect(plan).toContain("lessons: les-");
    expect(plan).toContain("from_untrusted");
    expect(plan).toContain("revisit-when");
    const challenge = fs.readFileSync("skills/challenge/SKILL.md", "utf8");
    expect(challenge).toContain("lessons.mjs list");
    expect(challenge).toContain("contradict an active lesson");
    expect(challenge).toContain("verified");
  });

  test("queue json drops the shipped d row", () => {
    const rows = JSON.parse(fs.readFileSync(".workflows/queue.json", "utf8"));
    expect(rows.some((r) => r.option.startsWith("D "))).toBe(false);
    const e = rows.find((r) => r.option.startsWith("E "));
    expect(e).toBeDefined();
    expect(e.recommend).toContain("later");
    for (const c of ["option", "what", "effort", "risk", "unblocks", "recommend"]) {
      expect(typeof e[c]).toBe("string");
    }
  });
});
