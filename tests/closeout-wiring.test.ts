import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { main } from "../scripts/closeout.mjs";
import { requireLiveState } from "./state-helpers";

const read = (p: string) => fs.readFileSync(p, "utf8");

describe("closeout wiring (plan 20261025-028)", () => {
  test("review skill carries the close-out and settle judge steps", () => {
    const review = read("skills/review/SKILL.md"); // plan 038: the SKILL is the sole flow authority
    expect(review).toContain("closeout.mjs report");
    expect(review).toContain("closeout.mjs judge");
    expect(review).toContain("wait for the owner");
  });

  const planLive = requireLiveState(".workflows/plan.md", "closeout runs against the live plan and emits exit 0 with the Shipped Deviations Discoveries Deferred and Watch sections");
  test.skipIf(!planLive)("closeout runs on the live repo state and emits all sections", async () => {
    const out: string[] = [];
    const orig = console.log;
    console.log = (...a: unknown[]) => out.push(a.map(String).join(" "));
    const code = await main(["report", "--plan", ".workflows/plan.md"]);
    console.log = orig;
    expect(code).toBe(0);
    for (const s of ["### Shipped", "### Deviations", "### Discoveries", "### Deferred", "### Watch"]) {
      expect(out.join("\n")).toContain(s);
    }
  });
});
