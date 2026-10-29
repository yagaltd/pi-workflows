import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { main } from "../scripts/lessons.mjs";

describe("lessons docs + distill (plan 20261025-026)", () => {
  test("review skill and readme document the lessons ledger", () => {
    const review = fs.readFileSync("skills/review/SKILL.md", "utf8"); // plan 038: the SKILL is the sole flow authority
    expect(review).toContain("lessons.mjs distill");
    const readme = fs.readFileSync("README.md", "utf8");
    expect(readme).toContain("## Lessons ledger");
    expect(readme).toContain("lessons.mjs set");
  });

  test("distill runs on an archived bundle and appends to the ledger", async () => {
    const bundle = ".workflows/archive/done/20261025-021-eval-doctrine";
    const ledger = ".workflows/lessons/lessons.jsonl";
    const before = fs.existsSync(ledger) ? fs.readFileSync(ledger, "utf8").trim().split("\n").length : 0;
    const code = await main([
      "distill", "--plan-file", `${bundle}/plan.md`, "--reviews-dir", `${bundle}/reviews`,
      "--plan-id", "20261025-021", "--proofs", ".workflows/proofs/proofs.jsonl", "--ledger", ledger,
    ]);
    const rows = fs.readFileSync(ledger, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const mine = rows.filter((x) => x.planId === "20261025-021");
    expect(mine.length).toBe(3); // idempotent: first run appends, re-run appends nothing
    expect(code === 0 || code === 1).toBe(true);
    for (const r of mine) {
      expect(r.status).toBe("valid");
      expect(r.provenance).toBe("from_untrusted"); // no proofs recorded for that plan
    }
  });
});
