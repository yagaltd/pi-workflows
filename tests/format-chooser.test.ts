import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ARTIFACTS, BOUNDARIES, buildQuestions, choose, main, parseArgs, readVerdict } from "../scripts/format-chooser.mjs";

const CONTENT = `# Plan: fixture\n\n### TASK 1: the loop — three stages feed each other in a cycle.\n### TASK 2: docs pass.\n`;
const POLICY = { prose: true, statusTokens: true, table: false, diagram: false };
const TABLE_POLICY = { ...POLICY, table: true };
const DIAGRAM_POLICY = { ...POLICY, diagram: true };

const stubAsk = (artifact, type, aConf = 0.9, tConf = 0.8, reason?: string) => async ({ questions }) => {
  // questions reach the judge client; assert shape at the boundary
  if (!questions.some((q) => q.id === "artifact") || !questions.some((q) => q.id === "type")) throw new Error("missing questions");
  return {
    status: 0,
    verdict: [
      { id: "artifact", verdict: artifact, confidence: aConf, ...(reason ? { reason } : {}) },
      { id: "type", verdict: type, confidence: tConf },
    ],
  };
};

const tempContentFile = () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fc-"));
  const f = path.join(tmp, "content.md");
  fs.writeFileSync(f, CONTENT);
  return f;
};

describe("format chooser (plan 20261123-075)", () => {
  test("test_chooser_uses_policy_result", async () => {
    const seen: string[][] = [];
    const ask = async ({ questions }) => {
      seen.push(questions.map((q) => q.id));
      return stubAsk("none", "loop", 0.95) ({ questions });
    };

    const c = await choose({ boundary: "closeout", content: CONTENT, policy: TABLE_POLICY, ask });
    expect(c.artifact).toBe("table"); // judge said none; policy table wins
    expect(c.diagram).toBe(false);
    expect(c.skipped).toBe(false);
    expect(seen).toEqual([["artifact", "type"]]); // one call, two typed questions, no third

    const visual = await choose({ boundary: "closeout", content: CONTENT, policy: DIAGRAM_POLICY, ask: stubAsk("html", "loop") });
    expect(visual.artifact).toBe("mermaid");
    expect(visual.diagram).toBe(true);
    expect(visual.type).toBe("loop"); // judge refines the advisory type family only

    const both = await choose({ boundary: "closeout", content: CONTENT, policy: { ...DIAGRAM_POLICY, table: true }, ask: stubAsk("html", "loop") });
    expect(both.artifact).toBe("table"); // text table stays authoritative

    const qs = buildQuestions("challenge", CONTENT);
    expect(qs[0].schema.enum).toEqual(["none", "table", "mermaid", "html"]);
    expect(qs[0].question).toContain("none is the correct default");
    expect(qs[1].question).toContain("Speculative premise");
    expect(ARTIFACTS).toEqual(["none", "table", "mermaid", "html"]);
    expect(BOUNDARIES).toEqual(["closeout", "plan-approval", "challenge", "brainstorm-graduation"]);
    expect(readVerdict({ verdict: [{ id: "artifact", verdict: "bogus" }] }).artifact).toBe("none");
  });

  test("test_chooser_rejects_judge_only_diagram", async () => {
    const c = await choose({ boundary: "closeout", content: CONTENT, policy: POLICY, ask: stubAsk("html", "loop", 0.99) });
    expect(c.artifact).toBe("none");
    expect(c.diagram).toBe(false);
    expect(c.judgeSuggestion.artifact).toBe("html"); // advisory metadata only
    expect(c.judgeSuggestion.artifactConfidence).toBe(0.99);
    expect(c.judgeSuggestion.type).toBe("loop");

    const withTable = await choose({ boundary: "closeout", content: CONTENT, policy: TABLE_POLICY, ask: stubAsk("html", "loop", 0.99) });
    expect(withTable.artifact).toBe("table");
    expect(withTable.diagram).toBe(false);

    const noPolicy = await choose({ boundary: "closeout", content: CONTENT, ask: stubAsk("html", "loop", 0.99) });
    expect(noPolicy.artifact).toBe("none"); // default policy is deterministic prose
  });

  test("test_chooser_fail_open_without_judge", async () => {
    const skipped = { status: 0, skipped: true };
    const c = await choose({ boundary: "plan-approval", content: CONTENT, policy: DIAGRAM_POLICY, ask: async () => skipped });
    expect(c.artifact).toBe("none");
    expect(c.diagram).toBe(false);
    expect(c.skipped).toBe(true);
    expect(c.reason).toContain("prose stands");

    const errs: string[] = [];
    const outs: string[] = [];
    const code = await main(["choose", "--for", "plan-approval", "--content-file", tempContentFile()], {
      policy: DIAGRAM_POLICY,
      ask: async () => skipped,
      err: { write: (s) => errs.push(s) },
      out: (s) => outs.push(s),
    });
    expect(code).toBe(0);
    expect(errs.join("")).toContain("FORMAT CHOOSER SKIPPED");
    const emitted = JSON.parse(outs.join(""));
    expect(emitted.artifact).toBe("none");
    expect(emitted.skipped).toBe(true);
    expect(emitted.reason).toContain("prose stands");
  });

  test("test_chooser_preserves_advisory_note", async () => {
    const outs: string[] = [];
    const seen: string[][] = [];
    const code = await main(["choose", "--for", "closeout", "--content-file", tempContentFile()], {
      policy: DIAGRAM_POLICY,
      ask: async ({ questions }) => {
        seen.push(questions.map((q) => q.id));
        return stubAsk("html", "loop", 0.9, 0.8, "a loop carries more than prose")({ questions });
      },
      err: { write: () => {} },
      out: (s) => outs.push(s),
    });
    expect(code).toBe(0);
    expect(seen).toEqual([["artifact", "type"]]);
    const emitted = JSON.parse(outs.join(""));
    expect(emitted.artifact).toBe("mermaid");
    expect(emitted.type).toBe("loop");
    expect(emitted.typeConfidence).toBe(0.8);
    expect(emitted.reason).toBe("a loop carries more than prose");
    expect(emitted.note).toContain("advisory");
    expect(emitted.note).toContain("stated reason");
    expect(emitted.note).toContain("generated views, never gates");
  });

  test("chooser rejects unknown boundaries and missing content files", async () => {
    expect(parseArgs(["choose", "--for", "casual-chat", "--content-file", "x"]).error).toContain("--for must be one of");
    expect(parseArgs(["choose", "--for", "closeout"]).error).toContain("--content-file is required");
    const errs: string[] = [];
    const code = await main(["choose", "--for", "closeout", "--content-file", "/nonexistent.md"], { err: { write: (s) => errs.push(s) } });
    expect(code).toBe(2);
    expect(errs.join("")).toContain("not found");
  });
});
