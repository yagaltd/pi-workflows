import { describe, expect, test } from "bun:test";
import fs from "node:fs";

describe("intent hook wiring (plan 20261026-030)", () => {
  test("readme documents the intent-guard suggestion hook", () => {
    const readme = fs.readFileSync("README.md", "utf8");
    expect(readme).toContain("## Intent-guard hook");
    expect(readme).toContain("Suggest-only");
    expect(readme).toContain("never auto-executed");
    expect(readme).toContain("trail.jsonl");
  });

  test("queue json drops the shipped c row", () => {
    const rows = JSON.parse(fs.readFileSync(".workflows/queue.json", "utf8"));
    expect(rows.some((r) => r.option.startsWith("C "))).toBe(false);
    const d = rows.find((r) => r.option.startsWith("D "));
    expect(d.recommend).toContain("next");
  });
});
