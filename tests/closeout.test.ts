import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gather, main, mermaid, renderCloseout, renderReport, settleJudge, settleQuestions, stripDiagramArtifact } from "../scripts/closeout.mjs";
import { requireLiveState } from "./state-helpers";

const PLAN = `# Plan: fixture closeout (055)

> Plan ID: 20261025-055
> Status: APPROVED

## Tasks

### TASK 1 (Tier B, 🟡): the shipped task — src/a.ts
- **Status**: ✅ DONE
- **Wave**: 1

### TASK 2 (Tier A, ⚪): the failed task — src/b.ts
- **Status**: ❌ FAILED
- **Wave**: 2

## Execution Notes

- TASK 1 ✅ context: no changes
- DEVIATION: paths moved from src/ to scripts/ — because repo layout differs — implication: spec Allowed sets re-anchored
- DISCOVERY: spec Test lines bind to bun test names
- DEFERRED: hook wiring — because routing not trusted — implication: guard stays manual
`;

const sectionAt = (text: string, name: string) => {
  const start = text.indexOf(`### ${name}`);
  if (start < 0) return null;
  const rest = text.slice(start);
  const next = rest.indexOf("\n### ", 1);
  return (next < 0 ? rest : rest.slice(0, next)).replace(/\n$/, "");
};

const setup = (dir) => {
  fs.writeFileSync(path.join(dir, "plan.md"), PLAN);
  fs.writeFileSync(path.join(dir, "journal.jsonl"), [
    JSON.stringify({ ts: "t", planId: "20261025-055", taskId: "task-1", event: "dispatched" }),
    JSON.stringify({ ts: "t", planId: "20261025-055", taskId: "task-1", event: "done" }),
    JSON.stringify({ ts: "t", planId: "20261025-055", taskId: "task-2", event: "dispatched" }),
  ].join("\n") + "\n");
  fs.writeFileSync(path.join(dir, "proofs.jsonl"), JSON.stringify({ ts: "t", planId: "20261025-055", taskId: "task-1", command: "bun test", exit: 0, outputHash: "h" }) + "\n");
  fs.writeFileSync(path.join(dir, "lessons.jsonl"), JSON.stringify({ type: "lesson", id: "l1", planId: "p", taskId: "t", lesson: "x", status: "valid", provenance: "from_untrusted" }) + "\n");
};

describe("closeout (plan 20261025-028)", () => {
  test("closeout gathers shipped tasks deviations and discoveries into the fixed sections", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "co-"));
    setup(dir);
    const g = gather({
      plan: path.join(dir, "plan.md"),
      journal: path.join(dir, "journal.jsonl"),
      proofs: path.join(dir, "proofs.jsonl"),
      lessons: path.join(dir, "lessons.jsonl"),
      golden: 11,
    });
    expect(g.planId).toBe("20261025-055");
    expect(g.shipped.map((t) => t.id)).toEqual(["task-1"]);
    expect(g.deviations[0]).toContain("implication: spec Allowed sets re-anchored");
    expect(g.discoveries[0]).toContain("bun test names");
    expect(g.deferred[0]).toContain("hook wiring");
    expect(g.watch.openDispatches).toEqual(["task-2"]);
    expect(g.watch.proofsRecorded).toBe(1);
    expect(g.watch.lessonsUntrusted).toBe(1);

    const report = renderReport(g);
    for (const s of ["### Shipped", "### Deviations", "### Discoveries", "### Deferred", "### Watch"]) {
      expect(report).toContain(s);
    }
  });

  test("closeout diagram renders plan versus actual with deviation markers", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "co-"));
    setup(dir);
    const g = gather({
      plan: path.join(dir, "plan.md"),
      journal: path.join(dir, "journal.jsonl"),
      proofs: path.join(dir, "proofs.jsonl"),
      lessons: path.join(dir, "lessons.jsonl"),
      golden: 11,
    });
    const m = mermaid(g);
    expect(m).toContain("```mermaid");
    expect(m).toContain('task-1["task-1 done"]');
    expect(m).toContain('task-2["task-2 failed"]');
    expect(m).toContain("classDef done");
  });

  test("settle judge flags missing implications and skipped judges loudly", async () => {
    const no = async () => ({ status: 0, verdict: [{ id: "deviations_complete", verdict: "no" }, { id: "implications_stated", verdict: "no" }, { id: "deferrals_named", verdict: "yes" }, { id: "watch_present", verdict: "yes" }] });
    const r1 = await settleJudge("report text", { ask: no });
    expect(r1.status).toBe("findings");
    expect(r1.findings.join("\n")).toContain("deviations_complete");

    const skip = await settleJudge("report text", { ask: async () => ({ status: 0, skipped: true }) });
    expect(skip.status).toBe("skipped");
    expect(skip.reason).toContain("NO-JUDGE");

    const yes = async () => ({ status: 0, verdict: settleQuestions.map((q) => ({ id: q.id, verdict: "yes" })) });
    const r3 = await settleJudge("report text", { ask: yes });
    expect(r3.status).toBe("pass");
  });

  const DIAGRAM_PLAN = `# Plan: fixture closeout (075)

> Plan ID: 20261123-075
> Status: APPROVED

## Tasks

### TASK 1 (Tier B, 🟡): the shipped task — src/a.ts
- **Status**: ✅ DONE
- **Wave**: 1

## Execution Notes

- DEVIATION: paths moved from src/ to scripts/ — because repo layout differs — implication: spec Allowed sets re-anchored
- DISCOVERY: spec Test lines bind to bun test names
- DEFERRED: hook wiring — because routing not trusted — implication: guard stays manual
`;
  const QUEUE_ROW = { option: "SHIP", what: "close out plan 075", effort: "S", risk: "low", unblocks: "release", recommend: "yes" };
  const ARTIFACT = {
    svgPath: "/tmp/closeout-fixture.svg",
    pngPath: "/tmp/closeout-fixture.png",
    altText: "Diagram: close-out flow — task delivery status",
    widthPx: 1200,
    heightPx: 400,
    smallestTextPx: 11,
    layoutProblems: 0,
  };

  const diagramFixture = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "co-diagram-"));
    const planPath = path.join(dir, "plan.md");
    const queuePath = path.join(dir, "queue.json");
    fs.writeFileSync(planPath, DIAGRAM_PLAN);
    fs.writeFileSync(queuePath, JSON.stringify([QUEUE_ROW]));
    const load = () => gather({ plan: planPath, journal: path.join(dir, "journal.jsonl"), proofs: path.join(dir, "proofs.jsonl"), lessons: path.join(dir, "lessons.jsonl"), golden: 11, queue: queuePath });
    return { dir, planPath, queuePath, load, g: load() };
  };

  const policyStub = (value: boolean, calls: unknown[] = []) => (input: unknown) => {
    calls.push(input);
    return { prose: true, statusTokens: true, table: true, diagram: value };
  };

  const rendererStub = (artifact = ARTIFACT) => {
    const calls: unknown[] = [];
    const renderer = async (input: unknown) => { calls.push(input); return artifact; };
    return { calls, renderer };
  };

  const captureLog = async (fn: () => Promise<number>) => {
    const lines: string[] = [];
    const orig = console.log;
    console.log = (...a: unknown[]) => lines.push(a.map(String).join(" "));
    try { return { code: await fn(), text: lines.join("\n") }; } finally { console.log = orig; }
  };

  test("test_closeout_diagram_is_additive", async () => {
    const { dir, g } = diagramFixture();
    const policyCalls: unknown[] = [];
    const { calls, renderer } = rendererStub();
    const report = await renderCloseout(g, {
      diagram: true,
      policy: policyStub(true, policyCalls),
      renderer,
      specPath: path.join(dir, "spec.mmd"),
      out: path.join(dir, "closeout"),
    });
    const base = renderReport(g);

    expect(policyCalls.length).toBe(1);
    expect(calls.length).toBe(1);
    expect(report.startsWith(`${base}\n\n`)).toBe(true);
    expect(report).not.toContain("```mermaid");
    const block = report.slice(base.length + 2);
    for (const value of [ARTIFACT.svgPath, ARTIFACT.pngPath, ARTIFACT.altText]) expect(block).toContain(value);
    expect(stripDiagramArtifact(report)).toBe(base);
    for (const section of ["Shipped", "Deviations", "Discoveries", "Deferred", "Watch"]) {
      expect(sectionAt(report, section)).toBe(sectionAt(base, section));
    }
  });

  test("test_closeout_keeps_next_moves_table", async () => {
    const { dir, queuePath, load, g } = diagramFixture();
    const { renderer } = rendererStub();
    const options = { diagram: true, policy: policyStub(true), renderer, specPath: path.join(dir, "spec.mmd"), out: path.join(dir, "closeout") };
    const report = await renderCloseout(g, options);
    const header = "| Option | What | Effort | Risk | Unblocks | Recommend |";
    const separator = "|---|---|---|---|---|---|";
    const nextMoves = sectionAt(report, "Next moves")!;
    expect(nextMoves).toContain(header);
    expect(nextMoves).toContain(separator);
    const tableLines = nextMoves.split("\n").filter((l) => l.startsWith("| "));
    expect(tableLines.length).toBe(2);
    for (const line of tableLines) expect(line.split("|").length - 2).toBe(6);
    expect(tableLines[1]).toBe(`| ${QUEUE_ROW.option} | ${QUEUE_ROW.what} | ${QUEUE_ROW.effort} | ${QUEUE_ROW.risk} | ${QUEUE_ROW.unblocks} | ${QUEUE_ROW.recommend} |`);
    expect(sectionAt(report, "Next moves")).toBe(sectionAt(renderReport(g), "Next moves"));

    fs.writeFileSync(queuePath, "[]");
    const empty = load();
    const emptyReport = await renderCloseout(empty, options);
    expect(emptyReport).toContain("- queue empty — nothing open");
    expect(stripDiagramArtifact(emptyReport)).toBe(renderReport(empty));
    expect(settleQuestions.at(-1)!.question).toContain("queue empty — nothing open");
  });

  test("test_closeout_judge_reads_text_only", async () => {
    const { dir, planPath, g } = diagramFixture();
    const { renderer } = rendererStub();
    const report = await renderCloseout(g, { diagram: true, policy: policyStub(true), renderer, specPath: path.join(dir, "spec.mmd"), out: path.join(dir, "closeout") });
    const base = renderReport(g);
    const calls: any[] = [];
    const askStub = async (args: any) => {
      calls.push(args);
      return { verdict: settleQuestions.map((q) => ({ id: q.id, verdict: "yes" })) };
    };

    const verdict = await settleJudge(report, { ask: askStub });
    expect(verdict.status).toBe("pass");
    expect(calls.length).toBe(1);
    expect(calls[0].questions.map((q: any) => q.id)).toEqual(settleQuestions.map((q) => q.id));
    for (const q of calls[0].questions) {
      expect(q.question).toContain("REPORT:\n");
      expect(q.question).toContain("### Shipped");
      for (const value of [ARTIFACT.svgPath, ARTIFACT.pngPath, ARTIFACT.altText, "--diagram", "layoutProblems", "smallestTextPx"]) {
        expect(q.question).not.toContain(value);
      }
    }
    expect(Object.keys(calls[0]).join(",").toLowerCase()).not.toMatch(/image|diagram|artifact|alt|metric/);

    const reportFile = path.join(dir, "report.md");
    fs.writeFileSync(reportFile, report);
    calls.length = 0;
    const run = await captureLog(() => main(["judge", "--plan", planPath, "--report-file", reportFile], { ask: askStub }));
    expect(run.code).toBe(0);
    expect(calls.length).toBe(1);
    expect(calls[0].questions[0].question).toContain(base.slice(0, 80));
  });

  test("test_closeout_no_policy_no_diagram", async () => {
    const { dir, planPath, queuePath, g } = diagramFixture();
    const { calls, renderer } = rendererStub();
    const throwingRenderer = async (input: unknown) => { calls.push(input); throw new Error("renderer must not run without policy approval"); };
    const fallback = renderReport(g, { diagram: true });
    const text = await renderCloseout(g, { diagram: true, policy: policyStub(false), renderer: throwingRenderer });

    expect(calls.length).toBe(0);
    expect(text).toBe(fallback);
    expect(text).toContain(mermaid(g));
    expect(text).not.toContain(ARTIFACT.svgPath);
    expect(text).not.toContain(ARTIFACT.pngPath);
    expect(text).not.toContain(ARTIFACT.altText);

    const run = await captureLog(() => main(["report", "--plan", planPath, "--queue", queuePath, "--journal", path.join(dir, "journal.jsonl"), "--proofs", path.join(dir, "proofs.jsonl"), "--lessons", path.join(dir, "lessons.jsonl"), "--diagram"], { policy: policyStub(false), renderer }));
    expect(run.code).toBe(0);
    expect(run.text.replace(/\r/g, "")).toBe(fallback);
    expect(calls.length).toBe(0);
  });

  const planLive = requireLiveState(".workflows/plan.md", "closeout report on the live plan exits 0 and prints the Shipped Deviations Discoveries Deferred and Watch section headers");
  test.skipIf(!planLive)("main report subcommand emits all section headers on the live repo state", async () => {
    const out = [];
    const orig = console.log;
    console.log = (...a) => out.push(a.join(" "));
    const code = await main(["report", "--plan", ".workflows/plan.md"]);
    console.log = orig;
    expect(code).toBe(0);
    const text = out.join("\n");
    for (const s of ["### Shipped", "### Deviations", "### Discoveries", "### Deferred", "### Watch"]) {
      expect(text).toContain(s);
    }
  });
});
