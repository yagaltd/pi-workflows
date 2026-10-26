import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildQuestions, choose, main, parseArgs, readVerdict } from "../scripts/format-chooser.mjs";

const CONTENT = `# Plan: fixture\n\n### TASK 1: the loop — three stages feed each other in a cycle.\n### TASK 2: docs pass.\n`;

const stubAsk = (artifact, type, aConf = 0.9, tConf = 0.8) => async ({ questions }) => {
  // questions reach the judge client; assert shape at the boundary
  if (!questions.some((q) => q.id === "artifact") || !questions.some((q) => q.id === "type")) throw new Error("missing questions");
  return {
    status: 0,
    verdict: [
      { id: "artifact", verdict: artifact, confidence: aConf },
      { id: "type", verdict: type, confidence: tConf },
    ],
  };
};

describe("format chooser (plan 20261026-032)", () => {
  test("chooser ranks artifact form and diagram type from one judge call", async () => {
    const c = await choose({ boundary: "closeout", content: CONTENT, ask: stubAsk("html", "loop") });
    expect(c.artifact).toBe("html");
    expect(c.artifactConfidence).toBe(0.9);
    expect(c.type).toBe("loop");
    expect(c.typeConfidence).toBe(0.8);
    expect(c.skipped).toBe(false);

    const prose = await choose({ boundary: "closeout", content: CONTENT, ask: stubAsk("none", null, 0.95) });
    expect(prose.artifact).toBe("none");
    expect(prose.type).toBe(null); // speculative answer unused

    const qs = buildQuestions("challenge", CONTENT);
    expect(qs[0].schema.enum).toEqual(["none", "table", "mermaid", "html"]);
    expect(qs[0].question).toContain("none is the correct default");
    expect(qs[1].question).toContain("Speculative premise");
    expect(readVerdict({ verdict: [{ id: "artifact", verdict: "bogus" }] }).artifact).toBe("none");
  });

  test("chooser fails open to none when the judge is unavailable", async () => {
    const c = await choose({ boundary: "plan-approval", content: CONTENT, ask: async () => ({ status: 0, skipped: true }) });
    expect(c.artifact).toBe("none");
    expect(c.skipped).toBe(true);
    expect(c.reason).toContain("prose stands");

    const errs = [];
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fc-"));
    const f = path.join(tmp, "content.md");
    fs.writeFileSync(f, CONTENT);
    const code = await main(["choose", "--for", "plan-approval", "--content-file", f], {
      ask: async () => ({ status: 0, skipped: true }),
      err: { write: (s) => errs.push(s) },
    });
    expect(code).toBe(0);
    expect(errs.join("")).toContain("FORMAT CHOOSER SKIPPED");
  });

  test("chooser rejects unknown boundaries and missing content files", async () => {
    expect(parseArgs(["choose", "--for", "casual-chat", "--content-file", "x"]).error).toContain("--for must be one of");
    expect(parseArgs(["choose", "--for", "closeout"]).error).toContain("--content-file is required");
    const errs = [];
    const code = await main(["choose", "--for", "closeout", "--content-file", "/nonexistent.md"], { err: { write: (s) => errs.push(s) } });
    expect(code).toBe(2);
    expect(errs.join("")).toContain("not found");
  });
});
