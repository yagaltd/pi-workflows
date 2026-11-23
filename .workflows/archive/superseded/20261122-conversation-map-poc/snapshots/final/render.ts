/** Static chat-tree renderer for the plan-level manager view. */

import {
  LAYER_ORDER, STATUS_PILL,
  type GraphEdge, type GraphNode, type PlanGraph,
} from "./extract.ts";

const CHILD_ORDER: Record<string, number> = {
  worker: 0, mechanical: 1, typed: 2, kani: 3, "agent-review": 4,
  branch: 5, pending: 6, blocked: 7, escalation: 8, decision: 9,
};

const num = (id: string) => Number.parseInt(id.replace(/\D/g, ""), 10) || 0;
const pill = (status: GraphNode["status"]) => {
  const word = STATUS_PILL[status];
  return word ? `[[${word}]]` : "";
};

function sortedChildren(graph: PlanGraph, id: string): GraphNode[] {
  return graph.nodes
    .filter((n) => n.parent === id)
    .sort((a, b) => (CHILD_ORDER[a.kind] ?? 99) - (CHILD_ORDER[b.kind] ?? 99) || a.id.localeCompare(b.id));
}

export function resolveNode(graph: PlanGraph, ref: string): GraphNode | undefined {
  const target = ref.trim().toLowerCase();
  const direct = graph.nodes.find((n) => n.id.toLowerCase() === target);
  if (direct) return direct;
  const alias = graph.nodes.find((n) =>
    n.summary.toLowerCase() === target || n.id.toLowerCase().endsWith(`-${target}`));
  if (alias) return alias;
  const digits = target.replace(/\D/g, "");
  if (/^(esc|escalation)/.test(target) && digits) {
    return graph.nodes.find((n) => n.id === `escalation-T${digits}` || n.id === `escalation-P${digits}`);
  }
  if (/^(ans|approval|decision)/.test(target) && digits) {
    return graph.nodes.find((n) => n.id === `decision-T${digits}` || n.id === `decision-P${digits}`);
  }
  return undefined;
}

export function renderTree(graph: PlanGraph): string {
  const plan = graph.nodes.find((n) => n.kind === "plan") ?? graph.nodes[0];
  if (!plan) return "(empty plan)";
  const planNumber = graph.id.replace(/^plan-/, "");
  const statusWord = pill(plan.status)
    || (plan.statusText ? `(${plan.statusText.split(/[\s(]/)[0]})` : "");
  const lines = [
    `Plan ${planNumber} — ${plan.summary}${statusWord ? ` ${statusWord}` : ""}`
      + (graph.shipTarget ? ` · ship ${graph.shipTarget}` : ""),
  ];
  const tasks = graph.nodes
    .filter((n) => n.kind === "task")
    .sort((a, b) => num(a.id) - num(b.id));
  // A phased plan has no TASK blocks; its evidence-backed phase bullets are the rows.
  const rows = tasks.length ? tasks : graph.nodes
    .filter((n) => n.kind === "phase")
    .sort((a, b) => num(a.id) - num(b.id));

  rows.forEach((task, index) => {
    const children = sortedChildren(graph, task.id);
    const layers = LAYER_ORDER.flatMap((kind) => children.filter((c) => c.kind === kind));
    const gates = children.filter((c) => (c.kind === "pending" || c.kind === "blocked")
      && !layers.some((l) => c.summary.split(" ")[0] === l.summary.split(" ")[0]));
    const chips = [...layers, ...gates].map((c) => c.summary);
    const lastTask = index === rows.length - 1;
    lines.push(
      `${lastTask ? "└──" : "├──"} ${task.id} ${task.summary} ${pill(task.status)}`
        + (chips.length ? ` · ${chips.join(" · ")}` : ""),
    );

    // Workers stay in evidence/detail; forks and human asks are visible in the tree.
    const visible = children.filter((c) => c.kind === "branch" || c.kind === "escalation");
    visible.forEach((child, childIndex) => {
      renderChild(child, `${lastTask ? "    " : "│   "}`, childIndex === visible.length - 1);
    });
  });

  return lines.join("\n");

  function renderChild(node: GraphNode, prefix: string, isLast: boolean) {
    const answer = graph.nodes.find((n) => n.answersId === node.id);
    lines.push(`${prefix}${isLast ? "└──" : "├──"} ${node.summary} ${pill(node.status)}`);
    if (answer) {
      lines.push(`${prefix}${isLast ? "    " : "│   "}└── ${answer.summary} ${pill(answer.status)}`);
    }
  }
}

export function renderEvidence(graph: PlanGraph): string {
  const lines = ["Evidence (hidden in the default tree):"];
  for (const node of graph.nodes) {
    lines.push(`- ${node.id} [${node.kind}] ${node.evidence.map((e) => e.source).join(", ")}`);
  }
  return lines.join("\n");
}

export function renderDetail(graph: PlanGraph, ref: string): string {
  const node = resolveNode(graph, ref);
  if (!node) return `Unknown node: ${ref}`;
  const lines = [
    `${node.id} — ${node.summary} ${pill(node.status)}`.trimEnd(),
    `Status: ${node.status}`,
    ...(node.owner ? [`Owner: ${node.owner}`] : []),
    `Detail: ${node.detail}`,
    ...(node.parent ? [`Parent: ${node.parent}`] : []),
    ...(node.answersId ? [`Answers: ${node.answersId}`] : []),
    "Evidence:",
    ...node.evidence.map((e) => `  - ${e.source} — ${e.label}${e.text ? ` — ${e.text}` : ""}`),
  ];
  const children = sortedChildren(graph, node.id);
  if (children.length) {
    lines.push("Children:");
    for (const child of children) {
      lines.push(`  - ${child.id} (${child.kind}) — ${child.summary} ${pill(child.status)}`);
    }
  }
  const links = graph.edges.filter(
    (e: GraphEdge) => (e.kind === "answers" && (e.from === node.id || e.to === node.id))
      || (e.kind === "fork" && (e.from === node.id || e.to === node.id)),
  );
  if (links.length) {
    lines.push("Links:");
    for (const link of links) {
      lines.push(`  - ${link.from} —${link.kind}→ ${link.to}`);
    }
  }
  return lines.join("\n");
}
