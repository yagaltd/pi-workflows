import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { requireLiveState } from "./state-helpers";

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

  const queueLive = requireLiveState(".workflows/queue.json", "live queue: no D-option row remains after shipping, the queue may be empty, and any row keeps all columns as strings");
  test.skipIf(!queueLive)("queue json drops the shipped d row", () => {
    const rows = JSON.parse(fs.readFileSync(".workflows/queue.json", "utf8"));
    // Structural (032): D never returns; queue may be empty; any row keeps all columns.
    expect(rows.some((r) => r.option.startsWith("D "))).toBe(false);
    for (const r of rows) for (const c of ["option", "what", "effort", "risk", "unblocks", "recommend"]) {
      expect(typeof r[c]).toBe("string");
    }
  });
});
