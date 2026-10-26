import { describe, expect, test } from "bun:test";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(p, "utf8");

describe("ship wiring — eval doctrine (plan 20261025-021)", () => {
  test("review prompt carries the golden-eval layer", () => {
    const s = read("prompts/review.md");
    expect(s).toContain("Layer 5: Golden evals (flip-watching)");
    expect(s).toContain("eval-golden.mjs --baseline .workflows/evals/baseline.jsonl");
    expect(s).toContain("blocks");
  });

  test("README documents the doctrine and names the gate", () => {
    const s = read("README.md");
    expect(s).toContain("## Eval Doctrine");
    expect(s).toContain("eval-golden.mjs --baseline");
  });

  test("release recorded", () => {
    const changelog = read("CHANGELOG.md");
    expect(changelog).toContain("plan 20261025-021");
    const top = /## .*— (v[0-9.]+):/.exec(changelog)[1];
    expect(JSON.parse(read("package.json")).version).toBe(top.slice(1));
  });
});
