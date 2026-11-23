/**
 * Plan-level manager view — pure extraction from plan/verdict/LOG state.
 *
 * No transcript parsing, no IO, no clocks. Every node has a short human
 * summary; command output and tool calls stay in evidence[].
 */

export type Status =
  | "done" | "in-progress" | "fixed" | "failed" | "approved"
  | "needs-you" | "blocked" | "pending" | "unknown";

export type NodeKind =
  | "plan" | "task" | "phase" | "worker" | "mechanical" | "typed" | "kani"
  | "agent-review" | "decision" | "escalation" | "branch"
  | "pending" | "blocked";

export interface Evidence {
  source: string;
  label: string;
  text?: string;
}

export interface GraphNode {
  id: string;
  kind: NodeKind;
  summary: string;
  detail: string;
  status: Status;
  /** Raw source phrasing when the status has no pill of its own (e.g. APPROVED). */
  statusText?: string;
  evidence: Evidence[];
  parent?: string;
  owner?: string;
  answersId?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "contains" | "answers" | "fork";
}

export interface PlanGraph {
  id: string;
  title: string;
  status: Status;
  shipTarget?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ReviewFile {
  path: string;
  text: string;
}

export interface PlanSources {
  planText: string;
  logText?: string;
  reviewFiles?: ReviewFile[];
  proofText?: string;
  journalText?: string;
}

export const LAYER_ORDER: NodeKind[] = ["mechanical", "typed", "kani", "agent-review"];
// Only words from pi-emphasis VOCABULARY.core. A status without a word is
// shown as raw source text, never as an invented pill.
export const STATUS_PILL: Partial<Record<Status, string>> = {
  done: "Done",
  "in-progress": "In progress",
  fixed: "Fixed",
  failed: "Failed",
  "needs-you": "Needs you",
  blocked: "Blocked",
  pending: "Pending",
  unknown: "Unverified",
};

const NODE_RANK: Record<NodeKind, number> = {
  plan: 0, task: 1, phase: 1, worker: 2, mechanical: 3, typed: 4, kani: 5,
  "agent-review": 6, branch: 7, pending: 8, blocked: 9,
  escalation: 10, decision: 11,
};

const compact = (s: string) => s.replace(/\s+/g, " ").trim();
const short = (s: string, max = 60): string => {
  const t = compact(s);
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
};
const sentence = (s: string) => short(compact(s).split(/[;.]/)[0].replace(/[*\s]+$/, ""));
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const lineAt = (text: string, index: number) => `${index + 1}`;

function taskNumber(id: string): number {
  return Number.parseInt(id.replace(/\D/g, ""), 10) || 0;
}

function statusFrom(text: string): Status {
  if (/fix round|\bfixed\b|ok:false\s*→\s*fixed/i.test(text)) return "fixed";
  if (/needs owner|needs you|awaiting (owner|approval)|awaiting review/i.test(text)) return "needs-you";
  if (/\bblocked\b/i.test(text)) return "blocked";
  if (/\b(failed|rejected|ok:false)\b/i.test(text)) return "failed";
  if (/\b(done|shipped|complete|ok:true|verified|passed)\b/i.test(text)) return "done";
  if (/in progress|executing|running|active/i.test(text)) return "in-progress";
  if (/\b(pending|queued|draft|planned)\b/i.test(text)) return "pending";
  return "unknown";
}

interface TaskDraft {
  id: string;
  title: string;
  status: Status;
  owner?: string;
  statusLine: number;
  headingLine: number;
}

/** A phased plan (like live plan 076) has bullets, not ### TASK blocks. */
function parsePhases(
  planText: string, logText: string, planId: string,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const lines = planText.split(/\r?\n/);
  const logLines = logText.split(/\r?\n/);
  const planDigits = planId.replace(/\D/g, "");
  const phases: { id: string; n: number; summary: string; line: number }[] = [];
  lines.forEach((line, i) => {
    const match = line.match(/^[-*]\s+\*\*Phase\s+(\d+)(?:\s+\([^)]*\))?\s*\*\*:\s*(.*)$/i);
    if (!match) return;
    const body = match[2].replace(/\*\*/g, "");
    const title = sentence(body.replace(/\s*\([^)]*\).*$/, ""));
    phases.push({ id: `P${match[1]}`, n: Number(match[1]), summary: `Phase ${match[1]}: ${title}`, line: i + 1 });
  });
  if (!phases.length) return { nodes: [], edges: [] };

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const logAt = (pattern: RegExp) => {
    const i = logLines.findIndex((line) => pattern.test(line));
    return i < 0 ? undefined : { source: `LOG.md:${i + 1}`, text: logLines[i] };
  };

  for (const phase of phases) {
    const shipped = logAt(new RegExp(`PLAN\\s+${planDigits}\\s+PHASE\\s+${phase.n}\\s+SHIPPED\\b`, "i"));
    const evidence: Evidence[] = [{
      source: `plan:${phase.line}`,
      label: "phase bullet",
      text: compact(lines[phase.line - 1]),
    }];
    if (shipped) evidence.push({ source: shipped.source, label: "phase shipped", text: compact(shipped.text) });
    nodes.push({
      id: phase.id,
      kind: "phase",
      summary: phase.summary,
      detail: `${phase.summary}; ${shipped ? "shipped per LOG" : "no shipped LOG entry"}`,
      status: shipped ? "done" : "unknown",
      parent: planId,
      evidence,
    });
    edges.push({ from: planId, to: phase.id, kind: "contains" });
  }

  // The plan's explicit human gate is an escalation; a later LOG approval is its answer.
  const gateIndex = lines.findIndex((l) => /^##\s+Post-.*gate/i.test(l));
  if (gateIndex >= 0) {
    const questionLine = lines.findIndex((l, i) => i > gateIndex && l.trim() && !/^#{1,6}\s/.test(l));
    if (questionLine >= 0) {
      const question = sentence(lines[questionLine]);
      nodes.push({
        id: "escalation-P1",
        kind: "escalation",
        summary: question,
        detail: `Human gate from plan: ${question}`,
        status: "needs-you",
        parent: "P1",
        evidence: [{ source: `plan:${questionLine + 1}`, label: "human gate", text: compact(lines[questionLine]) }],
      });
      edges.push({ from: "P1", to: "escalation-P1", kind: "contains" });
      const approval = logAt(new RegExp(`PLAN\\s+${planDigits}\\s+PHASE\\s+2\\s+APPROVED\\b`, "i"));
      if (approval) {
        nodes.push({
          id: "decision-P1",
          kind: "decision",
          summary: short(`Phase 2 approved${approval.text.match(/owner\s+"[^"]+"/i)?.[0] ? ` (${approval.text.match(/owner\s+"([^"]+)"/i)![1]})` : ""}`),
          detail: `Owner answer to the post-phase-1 gate: ${compact(approval.text)}`,
          status: "done",
          parent: "P1",
          answersId: "escalation-P1",
          evidence: [{ source: approval.source, label: "owner answer", text: compact(approval.text) }],
        });
        edges.push({ from: "decision-P1", to: "escalation-P1", kind: "answers" });
      }
    }
  }
  return { nodes, edges };
}

interface ReviewDraft {
  taskId: string;
  path: string;
  line: number;
  layer: "mechanical" | "typed" | "agent-review";
  text: string;
}

function parsePlan(planText: string): {
  id: string;
  title: string;
  summary: string;
  status: Status;
  shipTarget?: string;
  tasks: TaskDraft[];
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const lines = planText.split(/\r?\n/);
  const headingIndex = lines.findIndex((l) => /^#\s+\S/.test(l));
  const heading = headingIndex >= 0 ? compact(lines[headingIndex].replace(/^#+\s*/, "")) : "Plan";
  const digits = [...heading.matchAll(/\b(\d{3})\b/g)].map((m) => m[1]);
  const statusLine = lines.find((l) => /^>\s*(?:.*\bStatus:\s*\S)/i.test(l)) ?? "";
  const statusText = compact(statusLine.match(/\bStatus:\s*([^·;]+)/i)?.[1] ?? "");
  const status: Status = /\bapproved\b/i.test(statusText) ? "approved" : statusFrom(statusText);
  const shipLine = lines.find((l) => /^>\s*Ship target:/i.test(l) || /\bShip target:\s*v\d/i.test(l))
    ?? lines.find((l) => /shipped\s+v\d/i.test(l)) ?? "";
  const shipTarget = compact(shipLine).match(/v\d+(?:\.\d+)*\+?/)?.[0];

  const afterDash = heading.match(/^Plan\s*[:#]?\s*\d*\s*[—–-]\s*(.+)$/i);
  const afterColon = heading.match(/^Plan:\s*(.+?)\s*\(\d+\)$/i);
  const rawSummary = afterDash?.[1] ?? afterColon?.[1]
    ?? heading.replace(/^Plan\s*[:#]?\s*/i, "").replace(/\s*\(\d+\)\s*$/, "");
  const summary = short(cap(compact(rawSummary)));
  const planId = `plan-${digits.at(-1) ?? "000"}`;

  const planNode: GraphNode = {
    id: planId,
    kind: "plan",
    summary,
    detail: `${heading}; status ${statusText || "unknown"}`
      + (shipTarget ? `; ship target ${shipTarget}` : ""),
    status,
    ...(statusText ? { statusText } : {}),
    evidence: [
      {
        source: `plan:${lineAt(planText, headingIndex)}`,
        label: "plan heading",
        text: heading,
      },
      ...(statusLine
        ? [{ source: `plan:${lines.indexOf(statusLine) + 1}`, label: "plan status", text: compact(statusLine) }]
        : []),
    ],
  };

  const tasks: TaskDraft[] = [];
  lines.forEach((line, i) => {
    const match = line.match(/^###\s+TASK\s+(\d+[a-z]?)\b[^:]*:\s*(.*)$/i)
      ?? line.match(/^###\s+TASK\s+(\d+[a-z]?)\s+[—–-]\s*(.*)$/i);
    if (!match) return;
    const nextHeading = lines.findIndex((l, j) => j > i && /^#{1,3}\s+\S/.test(l));
    const end = nextHeading < 0 ? lines.length : nextHeading;
    const body = lines.slice(i, end);
    const statusRaw = body.find((l) => /\*\*Status\*\*:/i.test(l)) ?? "";
    const ownerRaw = body.find((l) => /\*\*Owner\*\*:/i.test(l)) ?? "";
    tasks.push({
      id: `T${match[1]}`,
      title: short(compact(match[2])),
      status: statusFrom(statusRaw),
      owner: ownerRaw ? compact(ownerRaw.replace(/^.*\*\*Owner\*\*:\s*/i, "")) : undefined,
      statusLine: i + body.indexOf(statusRaw) + 1,
      headingLine: i + 1,
    });
  });

  const nodes: GraphNode[] = [planNode];
  const edges: GraphEdge[] = [];
  for (const task of tasks) {
    nodes.push({
      id: task.id,
      kind: "task",
      summary: task.title,
      detail: `${task.id} ${task.title}; plan status ${task.status}`
        + (task.owner ? `; owner ${task.owner}` : ""),
      status: task.status,
      owner: task.owner,
      parent: planId,
      evidence: [
        {
          source: `plan:${task.headingLine}`,
          label: "task heading",
          text: compact(lines[task.headingLine - 1]),
        },
        {
          source: `plan:${task.statusLine}`,
          label: "task status",
          text: compact(lines[task.statusLine - 1]),
        },
      ],
    });
    edges.push({ from: planId, to: task.id, kind: "contains" });
  }

  return { id: planId, title: heading, summary, status, shipTarget, tasks, nodes, edges };
}

function parseReviews(reviewFiles: ReviewFile[]): ReviewDraft[] {
  const drafts: ReviewDraft[] = [];
  for (const file of reviewFiles ?? []) {
    const taskId = compact(file.path).match(/task[-_]?(\d+[a-z]?)/i)?.[1];
    if (!taskId) continue;
    file.text.split(/\r?\n/).forEach((line, i) => {
      let layer: ReviewDraft["layer"] | undefined;
      if (/^\s*[-*]?\s*mechanical\b/i.test(line)) layer = "mechanical";
      else if (/^\s*[-*]?\s*typed\b/i.test(line)) layer = "typed";
      else if (/^\s*[-*]?\s*agent review\b/i.test(line) || /verdict:/i.test(line)) layer = "agent-review";
      if (layer) {
        drafts.push({ taskId: `T${taskId}`, path: file.path, line: i + 1, layer, text: compact(line) });
      }
    });
  }
  return drafts;
}

function reviewVerdict(text: string): { status: Status; phrase: string } {
  const found = [...text.matchAll(/ok\s*[:=]\s*(true|false)/gi)].map((m) => m[1].toLowerCase());
  const anyFalse = found.includes("false");
  const laterTrue = found.indexOf("true") > found.indexOf("false") && found.includes("false");
  if (anyFalse && (laterTrue || /fix round|fixed/i.test(text))) {
    return { status: "fixed", phrase: "ok:false → fixed" };
  }
  if (anyFalse) return { status: "failed", phrase: "ok:false" };
  return { status: "done", phrase: "ok" };
}

function layerSummary(kind: NodeKind, phrase: string): string {
  if (kind === "mechanical") return phrase === "ok" ? "mechanical ✓" : `mechanical ${phrase}`;
  if (kind === "typed") return phrase === "ok" ? "typed ok" : `typed ${phrase} → fix round`;
  return phrase === "ok" ? "agent ok" : `agent ${phrase}`;
}

export function extractPlan(sources: PlanSources): PlanGraph {
  const plan = parsePlan(sources.planText);
  const nodes = [...plan.nodes];
  const edges = [...plan.edges];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const taskIds = new Set(plan.tasks.map((t) => t.id));
  const add = (node: GraphNode, edge?: GraphEdge) => {
    if (!byId.has(node.id)) {
      nodes.push(node);
      byId.set(node.id, node);
    }
    if (edge) edges.push(edge);
    return byId.get(node.id)!;
  };
  if (!plan.tasks.length) {
    const phased = parsePhases(sources.planText, sources.logText ?? "", plan.id);
    for (const node of phased.nodes) add(node);
    for (const edge of phased.edges) edges.push(edge);
  }
  const evidenceToTask = (taskId: string, ev: Evidence) => {
    const task = byId.get(taskId);
    if (task && !task.evidence.some((e) => e.source === ev.source && e.label === ev.label)) {
      task.evidence.push(ev);
    }
  };

  // Workers named in the plan are discovery, not transcript inference.
  for (const task of plan.tasks) {
    const owner = task.owner;
    if (!owner || !/worker|w\d+-/i.test(owner)) continue;
    const workerId = compact(owner.replace(/^worker\s+/i, ""));
    add(
      {
        id: `worker-${task.id}`,
        kind: "worker",
        summary: short(workerId),
        detail: `Worked on ${task.id} ${task.title}`,
        status: task.status,
        parent: task.id,
        owner: workerId,
        evidence: [{
          source: `plan:${task.statusLine}`,
          label: "owner assignment",
          text: `Owner: ${owner}`,
        }],
      },
      { from: task.id, to: `worker-${task.id}`, kind: "contains" },
    );
  }

  // Mechanical gates → typed decision/judge → agent review, only when a verdict exists.
  for (const review of parseReviews(sources.reviewFiles ?? [])) {
    if (!taskIds.has(review.taskId)) continue;
    const verdict = reviewVerdict(review.text);
    const id = `${review.layer}-${review.taskId}`;
    const ev: Evidence = {
      source: `${review.path}:${review.line}`,
      label: `${review.layer} verdict`,
      text: review.text,
    };
    evidenceToTask(review.taskId, ev);
    const layer = add(
      {
        id,
        kind: review.layer,
        summary: layerSummary(review.layer, verdict.phrase),
        detail: `${cap(review.layer)} verdict for ${review.taskId}: ${verdict.phrase}`,
        status: verdict.status,
        parent: review.taskId,
        evidence: [ev],
      },
      { from: review.taskId, to: id, kind: "contains" },
    );
    if (review.layer === "mechanical" && verdict.status === "failed") layer.evidence[0].text = review.text;
  }

  // Kani proofs come from proof state, never from a transcript.
  const proofText = sources.proofText ?? "";
  proofText.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    let task: string | undefined;
    let result: Status | undefined;
    let detail: string | undefined;
    try {
      const row = JSON.parse(line) as {
        task?: string; tool?: string; result?: string; detail?: string; checks?: number;
      };
      if (!/kani/i.test(row.tool ?? "")) return;
      task = row.task;
      detail = row.detail ?? (row.checks !== undefined ? "proof checks recorded" : "proof recorded");
      result = /verified|passed|ok/i.test(row.result ?? "") ? "done"
        : /failed|error/i.test(row.result ?? "") ? "failed" : "pending";
    } catch {
      const match = line.match(/\b(T\d+[a-z]?).*\bkani\b.*\b(verified|passed|pending|failed)\b/i);
      if (!match) return;
      task = match[1];
      result = statusFrom(match[2]);
      detail = compact(line);
    }
    const taskId = task ? `T${task.replace(/^T/i, "")}` : "";
    if (!taskIds.has(taskId) || !result) return;
    const id = `kani-${taskId}`;
    const summary = result === "done" ? "Kani proofs passed"
      : result === "failed" ? "Kani proofs failed" : "Kani pending";
    const proofEv: Evidence = {
      source: `.workflows/proofs/proofs-079.jsonl:${i + 1}`,
      label: "proof result",
      text: compact(line),
    };
    evidenceToTask(taskId, proofEv);
    add(
      {
        id,
        kind: "kani",
        summary,
        detail: `Kani proof state for ${taskId}: ${detail ?? result}`,
        status: result,
        parent: taskId,
        evidence: [proofEv],
      },
      { from: taskId, to: id, kind: "contains" },
    );
    if (result === "pending") {
      add(
        {
          id: `pending-${taskId}`,
          kind: "pending",
          summary: "Kani proof pending",
          detail: `Kani proof for ${taskId} has no passing result yet`,
          status: "pending",
          parent: taskId,
          evidence: [{
            source: `.workflows/proofs/proofs-079.jsonl:${i + 1}`,
            label: "open proof gate",
            text: compact(line),
          }],
        },
        { from: taskId, to: `pending-${taskId}`, kind: "contains" },
      );
    }
  });

  // LOG + journal: forks, escalations, answers, open gates. Deduplicated by id.
  const questionById = new Map<string, { taskId: string; question: string; source: string; text: string }>();
  const answerById = new Map<string, { id: string; taskId: string; answer: string; source: string; text: string }>();
  const logText = sources.logText ?? "";
  const journalText = sources.journalText ?? "";

  logText.split(/\r?\n/).forEach((line, i) => {
    const source = `log:${i + 1}`;
    const need = line.match(/NEEDS OWNER\s+(esc-(\w+)):\s*(.+)/i);
    if (need) {
      questionById.set(need[1], {
        taskId: `T${need[2].replace(/\D/g, "")}`,
        question: sentence(need[3]),
        source,
        text: compact(line),
      });
    }
    const answer = line.match(/OWNER ANSWER\s+(esc-(\w+)):\s*(.+)/i);
    if (answer) {
      answerById.set(answer[1], {
        id: answer[1], taskId: `T${answer[2].replace(/\D/g, "")}`,
        answer: sentence(answer[3]), source, text: compact(line),
      });
    }
    const fork = line.match(/\bFORK\s+\S+\s*→\s*branch\s+(\S+)\s*\(([^)]+)\)/i);
    const taskFromFork = compact(line).match(/\bT(\d+[a-z]?)\b/)?.[0];
    if (fork && taskFromFork && taskIds.has(taskFromFork)) {
      const id = `branch-${taskFromFork}`;
      add(
        {
          id,
          kind: "branch",
          summary: short(`Fork: ${fork[2]}`),
          detail: `Subagent branch ${fork[1]} for ${taskFromFork}`,
          status: byId.get(taskFromFork)?.status ?? "unknown",
          parent: taskFromFork,
          evidence: [{ source, label: "fork record", text: compact(line) }],
        },
        { from: taskFromFork, to: id, kind: "fork" },
      );
      const worker = byId.get(`worker-${taskFromFork}`);
      if (worker) {
        worker.summary = short(fork[2]);
        worker.evidence.push({ source, label: "worker fork", text: compact(line) });
      }
    }
    const blocked = compact(line).match(/\b(T\d+[a-z]?) blocked on owner:\s*(.+)/i);
    if (blocked && taskIds.has(blocked[1])) addGate(blocked[1], "blocked", blocked[2], source, line);
  });

  journalText.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    let row: Record<string, unknown>;
    try { row = JSON.parse(line) as Record<string, unknown>; } catch { return; }
    const source = `journal:${i + 1}`;
    const taskId = typeof row.task === "string" ? `T${row.task.replace(/^T/i, "")}` : "";
    if (row.kind === "fork" && taskIds.has(taskId)) {
      const label = typeof row.label === "string" ? row.label : String(row.node ?? "worker");
      const id = `branch-${taskId}`;
      add(
        {
          id,
          kind: "branch",
          summary: short(`Fork: ${label}`),
          detail: `Subagent branch ${String(row.branch ?? "recorded")} for ${taskId}`,
          status: byId.get(taskId)?.status ?? "unknown",
          parent: taskId,
          evidence: [{ source, label: "fork record", text: compact(line) }],
        },
        { from: taskId, to: id, kind: "fork" },
      );
      const worker = byId.get(`worker-${taskId}`);
      if (worker) {
        worker.summary = short(label);
        worker.evidence.push({ source, label: "worker fork", text: compact(line) });
      } else {
        add(
          {
            id: `worker-${taskId}`,
            kind: "worker",
            summary: short(label),
            detail: `Worked on ${taskId}`,
            status: byId.get(taskId)?.status ?? "unknown",
            parent: taskId,
            evidence: [{ source, label: "worker fork", text: compact(line) }],
          },
          { from: taskId, to: `worker-${taskId}`, kind: "contains" },
        );
      }
    }
    if (row.kind === "ask_parent" && taskIds.has(taskId)) {
      const id = typeof row.id === "string" ? row.id : `esc-${taskId.toLowerCase()}`;
      questionById.set(id, {
        taskId,
        question: sentence(String(row.question ?? "Human decision needed")),
        source,
        text: compact(line),
      });
    }
    if (row.kind === "answer" && typeof row.answersId === "string") {
      answerById.set(row.answersId, {
        id: row.answersId,
        taskId: taskIds.has(taskId) ? taskId : `T${row.answersId.replace(/\D/g, "")}`,
        answer: sentence(String(row.text ?? "Approved")),
        source,
        text: compact(line),
      });
    }
  });

  for (const task of plan.tasks) {
    if (task.status === "blocked" && !byId.has(`blocked-${task.id}`)) {
      addGate(task.id, "blocked", "owner approval", `plan:${task.statusLine}`, `Status: ${task.status}`);
    }
  }

  function addGate(taskId: string, kind: "pending" | "blocked", reason: string, source: string, raw: string) {
    const id = `${kind}-${taskId}`;
    const existing = byId.get(id);
    if (existing) {
      existing.evidence.push({ source, label: "open gate", text: compact(raw) });
      return existing;
    }
    return add(
      {
        id,
        kind,
        summary: kind === "blocked" ? "Owner gate blocked" : "Gate pending",
        detail: `${cap(kind)} on ${taskId}: ${reason}`,
        status: kind,
        parent: taskId,
        evidence: [{ source, label: "open gate", text: compact(raw) }],
      },
      { from: taskId, to: id, kind: "contains" },
    );
  }

  for (const [id, q] of questionById) {
    if (!taskIds.has(q.taskId)) continue;
    const escalationId = `escalation-${q.taskId}`;
    add(
      {
        id: escalationId,
        kind: "escalation",
        summary: short(q.question),
        detail: `Escalation ${id} from ${q.taskId}: ${q.question}`,
        status: "needs-you",
        parent: q.taskId,
        evidence: [{ source: q.source, label: "escalation", text: q.text }],
      },
      { from: q.taskId, to: escalationId, kind: "contains" },
    );
  }

  for (const [id, a] of answerById) {
    const escalationId = `escalation-${a.taskId}`;
    if (!byId.has(escalationId)) continue;
    const decisionId = `decision-${a.taskId}`;
    add(
      {
        id: decisionId,
        kind: "decision",
        summary: short(a.answer),
        detail: `Human answer to ${id}: ${a.answer}`,
        status: "done",
        parent: a.taskId,
        answersId: escalationId,
        evidence: [{ source: a.source, label: "human answer", text: a.text }],
      },
      { from: decisionId, to: escalationId, kind: "answers" },
    );
  }

  nodes.sort((a, b) => {
    const rank = NODE_RANK[a.kind] - NODE_RANK[b.kind];
    if (rank !== 0) return rank;
    return taskNumber(a.id) - taskNumber(b.id) || a.id.localeCompare(b.id);
  });

  return {
    id: plan.id,
    title: plan.title,
    status: plan.status,
    ...(plan.shipTarget ? { shipTarget: plan.shipTarget } : {}),
    nodes,
    edges,
  };
}
