/** Validation against the LIVE .workflows state (read-only, never written). */
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { extractPlan, type PlanSources } from "./extract.ts";
import { renderDetail, renderTree, resolveNode } from "./render.ts";

const REAL = "/home/aurel/Documents/github/pi-workflows/.workflows";
const read = (name: string) => readFileSync(join(REAL, name), "utf8");

function realSources(): PlanSources {
  const reviewDir = join(REAL, "reviews");
  const proofDir = join(REAL, "proofs");
  const reviewFiles = existsSync(reviewDir)
    ? readdirSync(reviewDir).filter((f) => f.endsWith(".md")).sort()
      .map((f) => ({ path: join(reviewDir, f), text: readFileSync(join(reviewDir, f), "utf8") }))
    : [];
  const proofFiles = existsSync(proofDir)
    ? readdirSync(proofDir).filter((f) => f.endsWith(".jsonl") || f.endsWith(".md")).sort()
    : [];
  return {
    planText: read("plan.md"),
    logText: read("LOG.md"),
    reviewFiles,
    proofText: proofFiles.map((f) => readFileSync(join(proofDir, f), "utf8")).join("\n"),
    journalText: ["journal.jsonl", "journal.md"].filter((f) => existsSync(join(REAL, f))).map(read).join("\n"),
  };
}

const sources = realSources();
const graph = extractPlan(sources);
const tree = renderTree(graph);
const node = (id: string) => {
  const found = graph.nodes.find((n) => n.id === id);
  if (!found) throw new Error(`missing node ${id}`);
  return found;
};

describe("live plan 076", () => {
  test("identity and inline blockquote status come from plan.md:1 and :3", () => {
    expect(sources.planText.split("\n")[0]).toContain("20261117-076");
    expect(sources.planText.split("\n")[2]).toContain("Status: APPROVED");
    expect(graph.id).toBe("plan-076");
    expect(node("plan-076").status).toBe("approved");
    expect(node("plan-076").evidence.map((e) => e.source)).toContain("plan:3");
    expect(renderDetail(graph, "plan-076")).toContain("status APPROVED");
    expect(tree).toContain("Plan 076");
  });

  test("plan.md has zero TASK blocks; its three phase bullets render with LOG evidence", () => {
    expect(sources.planText).not.toMatch(/^###\s+TASK\s/mi);
    expect(graph.nodes.filter((n) => n.kind === "task")).toHaveLength(0);
    const phases = graph.nodes.filter((n) => n.kind === "phase");
    expect(phases.map((n) => n.id)).toEqual(["P1", "P2", "P3"]);
    for (const phase of phases) {
      expect(phase.status).toBe("done");
      expect(phase.evidence.some((e) => e.source.startsWith("plan:"))).toBe(true);
      expect(phase.evidence.some((e) => /LOG\.md:\d+/.test(e.source))).toBe(true);
      expect(tree).toContain(`${phase.id} `);
    }
    expect(sources.logText).toMatch(/20261118 PLAN 076 PHASE 1 SHIPPED/);
    expect(node("P1").evidence.map((e) => e.source)).toContain("LOG.md:371");
    expect(node("P3").evidence.map((e) => e.source)).toContain("LOG.md:381");
  });

  test("the post-phase-1 gate is a needs-you node with an evidenced owner answer", () => {
    expect(node("escalation-P1").status).toBe("needs-you");
    expect(node("escalation-P1").evidence.map((e) => e.source)).toContain("plan:37");
    expect(node("decision-P1").status).toBe("done");
    expect(node("decision-P1").answersId).toBe("escalation-P1");
    expect(node("decision-P1").evidence.map((e) => e.source)).toContain("LOG.md:373");
    expect(tree).toContain("[[Needs you]]");
    expect(tree).toContain("[[Done]]");
  });

  test("detail follow-ups resolve phase gate aliases and print no blank status", () => {
    expect(resolveNode(graph, "esc-p1")?.id).toBe("escalation-P1");
    expect(resolveNode(graph, "decision-p1")?.id).toBe("decision-P1");
    expect(renderDetail(graph, "P1")).toContain("LOG.md:371");
    expect(renderDetail(graph, "plan-076").split("\n")[0]).not.toMatch(/\s$/);
  });

  test("no Kani layer is fabricated from proofs.jsonl (it has no Kani rows)", () => {
    expect(sources.proofText).not.toMatch(/kani/i);
    expect(graph.nodes.filter((n) => n.kind === "kani")).toHaveLength(0);
    expect(tree).not.toContain("Kani");
  });

  test("a review verdict from an older plan is not borrowed into plan 076", () => {
    expect(read("reviews/task-2.md")).toContain("ok: true");
    expect(graph.nodes.filter((n) => n.kind === "agent-review")).toHaveLength(0);
    expect(tree).not.toContain("task-2.md");
  });
});
