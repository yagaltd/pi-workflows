import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const GOLDEN = ".workflows/evals/golden";

describe("golden set v1 (plan 20261025-021)", () => {
  test("at least ten cases across all five kinds", () => {
    const files = fs.readdirSync(GOLDEN).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(10);
    const kinds = new Set(files.map((f) => JSON.parse(fs.readFileSync(path.join(GOLDEN, f), "utf8")).kind));
    for (const k of ["dispatcher", "gate", "degradation", "archive", "docs"]) expect(kinds.has(k)).toBe(true);
  });

  test("full suite passes with a fresh baseline", () => {
    const { spawnSync } = require("node:child_process");
    const bl = path.join(GOLDEN, "..", "baseline.jsonl");
    fs.rmSync(bl, { force: true });
    const first = spawnSync("node", ["scripts/eval-golden.mjs"], { encoding: "utf8" });
    expect(first.status).toBe(0);
    const second = spawnSync("node", ["scripts/eval-golden.mjs"], { encoding: "utf8" });
    expect(second.status).toBe(0);
    expect(second.stdout).toContain("0 flip(s)");
  });
});
