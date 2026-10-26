import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { main } from "../scripts/closeout.mjs";

const read = (p: string) => fs.readFileSync(p, "utf8");

describe("closeout wiring (plan 20261025-028)", () => {
  test("review prompt carries the close-out and settle judge steps", () => {
    const review = read("prompts/review.md");
    expect(review).toContain("closeout.mjs report");
    expect(review).toContain("closeout.mjs judge");
    expect(review).toContain("wait for the owner");
  });

  test("closeout runs on the live repo state and emits all sections", async () => {
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
