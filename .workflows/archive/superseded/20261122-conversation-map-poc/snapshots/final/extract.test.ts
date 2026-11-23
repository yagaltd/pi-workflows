import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { extractPlan, type PlanSources } from "./extract.ts";
import { renderDetail, renderTree } from "./render.ts";

const fixtureDir = new URL("./fixtures/", import.meta.url);
const read = (name: string) => readFileSync(new URL(name, fixtureDir), "utf8");

function sources(): PlanSources {
  return {
    planText: read("plan-079.md"),
    logText: read("log-079.md"),
    reviewFiles: [
      { path: ".workflows/reviews/task-1-079.md", text: read("reviews/task-1-079.md") },
      { path: ".workflows/reviews/task-2-079.md", text: read("reviews/task-2-079.md") },
      { path: ".workflows/reviews/task-3-079.md", text: read("reviews/task-3-079.md") },
      { path: ".workflows/reviews/task-4-079.md", text: read("reviews/task-4-079.md") },
      { path: ".workflows/reviews/task-6-079.md", text: read("reviews/task-6-079.md") },
    ],
    proofText: read("proofs/proofs-079.jsonl"),
    journalText: read("journal-079.jsonl"),
  };
}

const graph = () => extractPlan(sources());
const node = (g: ReturnType<typeof graph>, id: string) => {
  const found = g.nodes.find((n) => n.id === id);
  if (!found) throw new Error(`missing node ${id}`);
  return found;
};

describe("plan-level extraction", () => {
  test("root carries plan identity, status and ship target", () => {
    const g = graph();
    const plan = g.nodes.find((n) => n.kind === "plan")!;
    expect(plan.id).toBe("plan-079");
    expect(plan.summary).toBe("Evasion oracle");
    expect(plan.status).toBe("in-progress");
    expect(g.shipTarget).toBe("v0.15.18");
    expect(plan.evidence.length).toBeGreaterThan(0);
  });

  test("task count, order, titles and statuses come from the plan", () => {
    const tasks = graph().nodes.filter((n) => n.kind === "task");
    expect(tasks.map((n) => n.id)).toEqual(["T1", "T2", "T3", "T4", "T5", "T6"]);
    expect(tasks.map((n) => n.summary)).toEqual([
      "Tier-0 evasion scanner",
      "judge evasion question pack",
      "oracle-binding disclosure rule",
      "oracle variation between passes",
      "proof gate resume",
      "docs sweep",
    ]);
    expect(tasks.map((n) => n.status)).toEqual([
      "done", "fixed", "done", "done", "needs-you", "done",
    ]);
  });

  test("worker nodes record who did the work", () => {
    const g = graph();
    const workers = g.nodes.filter((n) => n.kind === "worker");
    expect(workers.map((n) => n.id)).toContain("worker-T2");
    expect(node(g, "worker-T2").summary).toContain("worker");
    expect(node(g, "T2").owner).toContain("w79-t2");
    expect(g.edges).toContainEqual({ from: "T2", to: "worker-T2", kind: "contains" });
  });

  test("verification layers appear only with evidence, in review-chain order", () => {
    const g = graph();
    const layers = (id: string) =>
      g.nodes.filter(
        (n) => n.parent === id &&
          ["mechanical", "typed", "kani", "agent-review"].includes(n.kind),
      );
    expect(layers("T1").map((n) => n.kind)).toEqual(["mechanical", "typed", "agent-review"]);
    expect(layers("T1").map((n) => n.summary)).toEqual(["mechanical ✓", "typed ok", "agent ok"]);
    expect(layers("T2").map((n) => n.kind)).toEqual(["mechanical", "typed", "agent-review"]);
    expect(layers("T3").map((n) => n.kind)).toEqual(["mechanical", "agent-review"]);
    expect(layers("T4").map((n) => n.kind)).toEqual(["typed", "kani", "agent-review"]);
    expect(layers("T6").map((n) => n.kind)).toEqual(["agent-review"]);
    expect(node(g, "agent-review-T2").summary).toBe("agent ok:false → fixed");
    expect(node(g, "typed-T4").summary).toBe("typed ok");
  });

  test("Kani layer reads proofs when present and vanishes without them", () => {
    const g = graph();
    expect(node(g, "kani-T4").summary).toBe("Kani proofs passed");
    expect(node(g, "kani-T4").status).toBe("done");
    expect(node(g, "kani-T5").summary).toBe("Kani pending");
    expect(node(g, "kani-T5").status).toBe("pending");
    expect(node(g, "kani-T4").detail).toContain("proof obligations");
    const withoutProofs = extractPlan({ ...sources(), proofText: "" });
    expect(withoutProofs.nodes.filter((n) => n.kind === "kani")).toHaveLength(0);
  });

  test("human escalation carries the question and the approval links back to it", () => {
    const g = graph();
    const escalation = node(g, "escalation-T5");
    expect(escalation.kind).toBe("escalation");
    expect(escalation.status).toBe("needs-you");
    expect(escalation.summary).toBe("Approve resume after proof failure?");

    const approval = node(g, "decision-T5");
    expect(approval.kind).toBe("decision");
    expect(approval.summary).toBe("Resume granted");
    expect(approval.status).toBe("done");
    expect(approval.answersId).toBe("escalation-T5");
    expect(g.edges).toContainEqual({
      from: "decision-T5", to: "escalation-T5", kind: "answers",
    });
  });

  test("forks and open gates become branch, pending and blocked nodes", () => {
    const g = graph();
    const branch = g.nodes.find((n) => n.kind === "branch")!;
    expect(branch.summary).toBe("Fork: judge-pack worker");
    expect(g.edges).toContainEqual({ from: "T2", to: branch.id, kind: "fork" });
    expect(node(g, "pending-T5").kind).toBe("pending");
    expect(node(g, "pending-T5").summary).toBe("Kani proof pending");
    expect(node(g, "blocked-T5").kind).toBe("blocked");
    expect(node(g, "blocked-T5").summary).toBe("Owner gate blocked");
  });

  test("every node is a small, evidenced human shape and output is deterministic", () => {
    const g = graph();
    for (const n of g.nodes) {
      expect(n.id).toBeTruthy();
      expect(n.summary.length).toBeGreaterThan(0);
      expect(n.summary.length).toBeLessThanOrEqual(60);
      expect(n.detail.length).toBeGreaterThan(0);
      expect(n.evidence.length).toBeGreaterThan(0);
      expect(["done", "in-progress", "fixed", "failed", "needs-you", "blocked", "pending", "unknown"])
        .toContain(n.status);
    }
    expect(JSON.stringify(graph())).toBe(JSON.stringify(g));
  });

  test("fixtures contain no absolute paths, tokens or email addresses", () => {
    for (const name of [
      "plan-079.md", "log-079.md", "journal-079.jsonl", "proofs/proofs-079.jsonl",
      "reviews/task-1-079.md", "reviews/task-2-079.md",
    ]) {
      const text = read(name);
      expect(text).not.toMatch(/\/home\/|\/Users\//);
      expect(text).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/);
      expect(text).not.toMatch(/sk-[A-Za-z0-9]{8,}|TYPELLM_API_KEY\s*=/);
    }
  });
});

describe("manager tree rendering", () => {
  test("default tree is short, pill-shaped and hides evidence/tool calls", () => {
    const lines = renderTree(graph()).trimEnd().split("\n");
    expect(lines.length).toBeLessThanOrEqual(20);
    expect(lines[0]).toContain("Plan 079 — Evasion oracle [[In progress]]");
    expect(lines[0]).toContain("ship v0.15.18");
    expect(renderTree(graph())).toContain("├──");
    expect(renderTree(graph())).toContain("└──");
    expect(lines[1]).toContain("T1 Tier-0 evasion scanner [[Done]] · mechanical ✓ · typed ok · agent ok");
    expect(lines.join("\n")).toContain("T4 oracle variation between passes [[Done]] · typed ok · Kani proofs passed · agent ok");
    expect(lines.join("\n")).toContain("[[Needs you]]");
    expect(lines.join("\n")).toContain("Approve resume after proof failure?");
    for (const toolish of ["bash", "grep", "bun test", "agent-spec", "toolCall", "readFileSync", "721/0", "0.91"]) {
      expect(lines.join("\n")).not.toContain(toolish);
    }
  });

  test("review chain order is mechanical → typed → Kani → agent review", () => {
    const t4 = renderTree(graph()).split("\n").find((l) => l.includes("T4 "))!;
    const positions = ["mechanical", "typed", "Kani", "agent"].map((s) => t4.indexOf(s));
    expect(positions[0]).toBe(-1); // no mechanical evidence on T4
    expect(t4.indexOf("typed ok")).toBeLessThan(t4.indexOf("Kani proofs passed"));
    expect(t4.indexOf("Kani proofs passed")).toBeLessThan(t4.indexOf("agent ok"));
    const t1 = renderTree(graph()).split("\n").find((l) => l.includes("T1 "))!;
    expect(t1.indexOf("mechanical ✓")).toBeLessThan(t1.indexOf("typed ok"));
    expect(t1.indexOf("typed ok")).toBeLessThan(t1.indexOf("agent ok"));
  });

  test("detail answers a follow-up without leaking other tasks' evidence", () => {
    const detail = renderDetail(graph(), "T2");
    expect(detail).toContain("T2 — judge evasion question pack [[Fixed]]");
    expect(detail).toContain("Status: fixed");
    expect(detail).toContain("agent ok:false → fixed");
    expect(detail).toContain("Evidence:");
    expect(detail).toContain("reviews/task-2-079.md");
    expect(detail).toContain("worker-T2");
    expect(detail).not.toContain("reviews/task-1-079.md");
    expect(renderDetail(graph(), "decision-T5")).toContain("Answers: escalation-T5");
  });
});
