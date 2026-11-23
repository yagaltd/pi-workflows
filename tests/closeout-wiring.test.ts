import { describe, expect, test } from "bun:test";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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

  test("--diagram wires injected policy and renderer only when requested", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "co-wire-"));
    const plan = path.join(dir, "plan.md");
    const queue = path.join(dir, "queue.json");
    fs.writeFileSync(plan, "# Plan: wiring\n\n> Plan ID: 20261123-075\n\n## Tasks\n\n### TASK 1 (Tier B): shipped — a.ts\n- **Status**: ✅ DONE\n\n## Execution Notes\n");
    fs.writeFileSync(queue, JSON.stringify([{ option: "SHIP", what: "ship", effort: "S", risk: "low", unblocks: "release", recommend: "yes" }]));
    const artifact = { svgPath: "/tmp/wired.svg", pngPath: "/tmp/wired.png", altText: "Diagram: wired close-out" };
    const calls = { policy: [] as unknown[], renderer: [] as unknown[] };
    const policy = (input: unknown) => { calls.policy.push(input); return { prose: true, statusTokens: true, table: true, diagram: true }; };
    const renderer = async (input: unknown) => { calls.renderer.push(input); return artifact; };
    const capture = async (argv: string[]) => {
      const lines: string[] = [];
      const orig = console.log;
      console.log = (...a: unknown[]) => lines.push(a.map(String).join(" "));
      try { return { code: await main(argv, { policy, renderer }), text: lines.join("\n") }; } finally { console.log = orig; }
    };
    const args = ["report", "--plan", plan, "--queue", queue];

    const withDiagram = await capture([...args, "--diagram"]);
    expect(withDiagram.code).toBe(0);
    expect(calls.policy.length).toBe(1);
    expect(calls.renderer.length).toBe(1);
    expect(withDiagram.text).toContain(artifact.svgPath);
    expect(withDiagram.text).toContain(artifact.altText);

    calls.policy.length = 0;
    calls.renderer.length = 0;
    const proseOnly = await capture(args);
    expect(proseOnly.code).toBe(0);
    expect(calls.policy.length).toBe(0);
    expect(calls.renderer.length).toBe(0);
    expect(proseOnly.text).not.toContain(artifact.svgPath);
  });

  test("test_final_review_integration_gates", () => {
    const root = path.resolve(import.meta.dir, "..");
    const source = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
    const policyCli = source("scripts/output-policy-cli.mjs");
    expect(policyCli).toContain("decideOutputPolicy");
    expect(source("scripts/output-policy.mjs")).not.toMatch(/process\.(env|argv)|node:fs|console\./);
    expect(source("scripts/wf.sh")).toContain("output-policy-cli.mjs");
    expect(source(".mise/tasks/output-policy")).toContain("wf.sh output-policy");
    expect(source("scripts/format-chooser.mjs")).toContain("parsePolicyArgs");
    expect(source("scripts/open-diagram-render.mjs")).toContain("OPEN_DIAGRAM_CLI");
    const closeout = source("scripts/closeout.mjs");
    expect(closeout).toContain("graph LR");
    expect(closeout).toContain("generated-view.json");
    expect(closeout).toContain("onReport");
    expect(source("extensions/index.ts")).toContain("produceGeneratedViewMessage");
    expect(source("README.md")).toContain("OPEN_DIAGRAM_CLI");
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
