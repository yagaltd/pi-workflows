import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { adrRefs, check, main } from "../scripts/decisions.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "dec-"));
const run = (argv) => main(argv);

const seed = (dir) => {
  fs.writeFileSync(path.join(dir, "plan.md"), "# Plan\n\nadr: DEC-001 stays the decision link (see also DEC-002).\n");
  return [
    ["record", "--id", "DEC-001", "--title", "Single judge client", "--rule", "All typed calls go through scripts/judge.mjs ask", "--scope", "scripts/**", "--decided-by", "20261025-017", "--revisit", "a second judge need appears", "--dir", dir],
    ["record", "--id", "DEC-002", "--title", "Flows compile onto resolveNext", "--rule", "No second scheduler", "--scope", "scripts/flow-*.mjs", "--decided-by", "20261025-022", "--revisit", "the dispatcher contract changes", "--dir", dir],
  ];
};

describe("decisions (plan 20261025-027)", () => {
  test("decision records round-trip through record list and supersede", async () => {
    const dir = tmp();
    for (const argv of seed(dir)) expect(await run(argv)).toBe(0);
    expect(await run(["supersede", "--id", "DEC-002", "--by", "DEC-001", "--reason", "consolidated into the judge client", "--dir", dir])).toBe(0);
    const rec = fs.readFileSync(path.join(dir, "DEC-002.md"), "utf8");
    expect(rec).toContain("superseded (by DEC-001 — consolidated into the judge client)");
    const index = fs.readFileSync(path.join(dir, "INDEX.md"), "utf8");
    expect(index).toContain("DEC-001");
    expect(index).toContain("revisit when: a second judge need appears");
  });

  test("adr references in the live plan resolve to records", async () => {
    const dir = tmp();
    for (const argv of seed(dir)) expect(await run(argv)).toBe(0);
    expect(adrRefs("see adr: DEC-001 and adr DEC-002")).toEqual(["DEC-001", "DEC-002"]);
    expect(await run(["check", "--plan", path.join(dir, "plan.md"), "--dir", dir])).toBe(0);
  });

  test("check flags index drift and unresolved references", async () => {
    const dir = tmp();
    for (const argv of seed(dir)) expect(await run(argv)).toBe(0);
    fs.writeFileSync(path.join(dir, "INDEX.md"), "hand-edited garbage\n");
    let code = await run(["check", "--plan", path.join(dir, "plan.md"), "--dir", dir]);
    expect(code).toBe(1);
    await run(["index", "--dir", dir]);
    fs.writeFileSync(path.join(dir, "plan.md"), "adr: DEC-009 unresolved\n");
    code = await run(["check", "--plan", path.join(dir, "plan.md"), "--dir", dir]);
    expect(code).toBe(1);
    const malformed = path.join(dir, "DEC-003.md");
    fs.writeFileSync(malformed, "# DEC-003: no fields\n");
    code = await run(["check", "--plan", path.join(dir, "plan.md"), "--dir", dir]);
    expect(code).toBe(1);
  });
});
