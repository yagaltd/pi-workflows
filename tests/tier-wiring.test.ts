import { describe, expect, test } from "bun:test";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(p, "utf8");

describe("intent tier wiring (plan 20261026-033)", () => {
  test("add prompt routes problem solution and procedure to the right command", () => {
    const add = read("prompts/add.md");
    for (const bin of ["**problem**", "**solution**", "**procedure**"]) expect(add).toContain(bin);
    expect(add).toContain("route to `/idea`");
    expect(add).toContain("route to `/plan`");
    expect(add).toContain("ask approval here");
    expect(read("skills/plan/SKILL.md")).toContain("problem, a solution, or a procedure");
  });

  test("readme documents the intent tier question", () => {
    const readme = read("README.md");
    expect(readme).toContain("**Intent tier**");
    expect(readme).toContain("stuwe.dev");
    expect(readme).toContain("tierRoute");
  });
});
