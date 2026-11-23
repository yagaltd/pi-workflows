#!/usr/bin/env node
// closeout — the SHIP close-out generator and settle judge
// (plan 20261025-028). The close-out renders in the chat; the settle judge
// checks its clarity at the boundary. Zero dependencies.
//
// Marker contract (plan Execution Notes):
//   - DEVIATION: <what> — because <why> — implication: <impact>
//   - DISCOVERY: <fact>
//   - DEFERRED: <item> — <why> — implication: <impact>
//
// Usage:
//   node scripts/closeout.mjs report --plan <plan.md> [--journal F] [--proofs F]
//                                   [--lessons F] [--golden N] [--diagram]
//   node scripts/closeout.mjs judge  --plan <plan.md> [--report-file F] [--audit F]
// Exit: report 0 · judge 0 (advisory) · 2 usage.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ask } from "./judge.mjs";
import { decideOutputPolicy } from "./output-policy.mjs";
import { renderDiagram } from "./open-diagram-render.mjs";

const SECTIONS = ["Shipped", "Deviations", "Discoveries", "Deferred", "Watch"];
const DIAGRAM_HEADER = "### Generated view";

/**
 * @cc [label:closeout-output] artifact-block-removable
 * A generated-view block is appended after the canonical report and contains
 * only the artifact paths and alt text; removing it restores the exact text.
 */
export function diagramArtifact({ svgPath, pngPath, altText }) {
  return [DIAGRAM_HEADER, `![${altText}](${svgPath})`, `PNG: ${pngPath}`].join("\n");
}

export function stripDiagramArtifact(reportText) {
  const marker = `\n\n${DIAGRAM_HEADER}\n`;
  const at = reportText.indexOf(marker);
  return at < 0 ? reportText : reportText.slice(0, at);
}

export function parseArgs(argv) {
  const o = { cmd: null, plan: ".workflows/plan.md", journal: ".workflows/journal.jsonl", proofs: ".workflows/proofs/proofs.jsonl", lessons: ".workflows/lessons/lessons.jsonl", queue: ".workflows/queue.json", golden: 11, diagram: false, reportFile: null, audit: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "report" || a === "judge") o.cmd = a;
    else if (a === "--plan") o.plan = argv[++i];
    else if (a === "--journal") o.journal = argv[++i];
    else if (a === "--proofs") o.proofs = argv[++i];
    else if (a === "--lessons") o.lessons = argv[++i];
    else if (a === "--queue") o.queue = argv[++i];
    else if (a === "--golden") o.golden = Number(argv[++i]);
    else if (a === "--diagram") o.diagram = true;
    else if (a === "--report-file") o.reportFile = argv[++i];
    else if (a === "--audit") o.audit = argv[++i];
    else return { error: `unknown argument: ${a}` };
  }
  if (!o.cmd) return { error: "subcommand required: report | judge" };
  return { opts: o };
}

const readLines = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean) : []);
const jsonLines = (f) => readLines(f).map((l) => JSON.parse(l));
const marker = (notes, tag) => notes
  .split("\n")
  .filter((l) => l.trim().startsWith(`- ${tag}:`))
  .map((l) => l.trim().replace(`- ${tag}:`, "").trim());

export function gather({ plan, journal, proofs, lessons, golden, queue = ".workflows/queue.json" }) {
  const text = fs.readFileSync(plan, "utf8");
  const planId = (/Plan ID: (\S+)/.exec(text) ?? [])[1] ?? "unknown";
  const notesStart = text.indexOf("## Execution Notes");
  const notes = notesStart >= 0 ? text.slice(notesStart) : "";

  const tasks = [];
  const re = /^###\s+TASK\s+(\d+)\s*\(([^)]*)\):\s*(.+)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    const body = text.slice(m.index + m[0].length).split(/^###\s+TASK\s+\d+/m)[0].split(/^## /m)[0];
    tasks.push({
      id: `task-${m[1]}`,
      tier: /Tier ([ABC])/.exec(m[2])?.[1] ?? "?",
      title: m[3].split("—")[0].trim(),
      status: /Status\*\*:\s*✅/.test(body) ? "done" : /Status\*\*:\s*❌/.test(body) ? "failed" : "pending",
    });
  }

  const jEntries = jsonLines(journal).filter((e) => e.planId === planId);
  const openDispatches = jEntries.filter((e) => e.event === "dispatched")
    .filter((e) => !jEntries.some((x) => x.taskId === e.taskId && x.event === "done"));
  const proofRows = jsonLines(proofs).filter((r) => r.planId === planId);
  const lessonRows = jsonLines(lessons);
  const untrusted = lessonRows.filter((l) => l.type === "lesson" && l.provenance === "from_untrusted").length;
  let queueRows = null;
  if (fs.existsSync(queue)) {
    try {
      const raw = JSON.parse(fs.readFileSync(queue, "utf8"));
      if (Array.isArray(raw)) queueRows = raw.filter((r) => r && typeof r === "object");
    } catch {
      queueRows = null;
    }
  }

  return {
    planId,
    planFile: plan,
    tasks,
    shipped: tasks.filter((t) => t.status === "done"),
    deviations: marker(notes, "DEVIATION"),
    discoveries: marker(notes, "DISCOVERY"),
    deferred: marker(notes, "DEFERRED"),
    watch: {
      openDispatches: openDispatches.map((e) => e.taskId),
      proofsRecorded: proofRows.length,
      lessonsUntrusted: untrusted,
      goldenCases: golden,
    },
    queue: queueRows,
  };
}

export function renderReport(g, { diagram = false } = {}) {
  const out = [];
  out.push(`## Close-out — ${g.planId}`);
  out.push("");
  out.push(`### Shipped`);
  for (const t of g.shipped) out.push(`- ${t.id} (${t.tier}) ${t.title}`);
  if (g.shipped.length === 0) out.push("- nothing marked done");
  out.push("");
  out.push(`### Deviations`);
  for (const d of g.deviations) out.push(`- ${d}`);
  if (g.deviations.length === 0) out.push("- none declared");
  out.push("");
  out.push(`### Discoveries`);
  for (const d of g.discoveries) out.push(`- ${d}`);
  if (g.discoveries.length === 0) out.push("- none declared");
  out.push("");
  out.push(`### Deferred`);
  for (const d of g.deferred) out.push(`- ${d}`);
  if (g.deferred.length === 0) out.push("- none declared");
  out.push("");
  out.push(`### Watch`);
  out.push(`- open dispatches: ${g.watch.openDispatches.join(", ") || "none"}`);
  out.push(`- proofs recorded: ${g.watch.proofsRecorded}`);
  out.push(`- lessons from_untrusted: ${g.watch.lessonsUntrusted}`);
  out.push(`- golden cases: ${g.watch.goldenCases}`);
  out.push("");
  out.push(`### Next moves`);
  if (!g.queue) {
    out.push("- no queue file — next moves undecided; create .workflows/queue.json");
  } else if (g.queue.length === 0) {
    out.push("- queue empty — nothing open");
  } else {
    out.push("| Option | What | Effort | Risk | Unblocks | Recommend |");
    out.push("|---|---|---|---|---|---|");
    for (const q of g.queue) out.push(`| ${q.option} | ${q.what} | ${q.effort} | ${q.risk} | ${q.unblocks} | ${q.recommend} |`);
  }
  if (diagram) out.push(mermaid(g));
  return out.join("\n");
}

function closeoutPolicyInput(g) {
  return {
    rows: g.queue?.length ?? 0,
    fields: 6,
    artifact: "closeout-next-moves",
    tasks: g.tasks.length,
    statusMix: new Set(g.tasks.map((t) => t.status)).size,
  };
}

function diagramPaths(g) {
  const dir = g.planFile ? path.dirname(g.planFile) : os.tmpdir();
  const base = `closeout-${g.planId}`;
  return { specPath: path.join(dir, `${base}.mmd`), out: path.join(dir, base) };
}

/**
 * @cc [label:closeout-output] text-first-additive-diagram
 * The five text sections and the six-column Next moves table are emitted by
 * renderReport unchanged; an approved diagram is appended after them, never
 * substituted for them.
 */
/**
 * @cc [label:closeout-output] policy-only-diagram-gate
 * Close-out calls TASK 1 policy once and renders only on its diagram positive;
 * otherwise the explicit --diagram mermaid text fallback is preserved.
 */
export async function renderCloseout(g, { diagram = false, policy = decideOutputPolicy, renderer = renderDiagram, specPath, out } = {}) {
  if (!diagram) return renderReport(g);
  if (!policy(closeoutPolicyInput(g)).diagram) return renderReport(g, { diagram: true });

  const paths = diagramPaths(g);
  const spec = specPath ?? paths.specPath;
  if (!specPath) fs.writeFileSync(spec, `---\ntitle: Close-out — ${g.planId}\n---\n${mermaid(g)}\n`);
  const artifact = await renderer({
    spec: { path: spec, title: `Close-out — ${g.planId}`, subtitle: "Task delivery status" },
    out: out ?? paths.out,
  });
  return `${renderReport(g)}\n\n${diagramArtifact(artifact)}`;
}

export function mermaid(g) {
  const lines = ["```mermaid", "graph LR"];
  let prev = null;
  for (const t of g.tasks) {
    const cls = t.status === "done" ? "done" : t.status === "failed" ? "fail" : "pend";
    lines.push(`  ${t.id}["${t.id} ${t.status}"]:::${cls}`);
    if (prev) lines.push(`  ${prev} --> ${t.id}`);
    prev = t.id;
  }
  lines.push("  classDef done fill:#dfd;classDef fail fill:#fdd;classDef pend fill:#ffd;");
  lines.push("```");
  return lines.join("\n");
}

export const settleQuestions = [
  { id: "deviations_complete", question: "Does the close-out list every deviation declared in the plan Execution Notes?", schema: { type: "string", enum: ["yes", "no"] } },
  { id: "implications_stated", question: "Does every deviation and deferral state its implication?", schema: { type: "string", enum: ["yes", "no"] } },
  { id: "deferrals_named", question: "Are all deferred items named in the Deferred section?", schema: { type: "string", enum: ["yes", "no"] } },
  { id: "watch_present", question: "Does the Watch section carry open dispatches, proof count, untrusted lesson count and golden case count?", schema: { type: "string", enum: ["yes", "no"] } },
  { id: "decision_brief_present", question: "Does the Next moves section carry every open item with all six columns (option, what, effort, risk, unblocks, recommend)? An explicitly empty queue — the line 'queue empty — nothing open' — is a valid brief and counts as yes.", schema: { type: "string", enum: ["yes", "no"] } },
];

/**
 * @cc [label:closeout-judge] report-text-only-input
 * The settle judge receives canonical report text only, once: artifact paths,
 * alt text and renderer metrics never enter the five settle questions.
 */
export async function settleJudge(reportText, { ask: askFn = ask, audit } = {}) {
  const text = stripDiagramArtifact(reportText).slice(0, 4000);
  const questions = settleQuestions.map((q) => ({ id: q.id, question: `${q.question}\n\nREPORT:\n${text}`, schema: q.schema }));
  const r = await askFn({ questions, auditFile: audit });
  if (!r || r.skipped) {
    return { status: "skipped", reason: "judge unavailable (NO-JUDGE degradation)", findings: [] };
  }
  const rows = Array.isArray(r.verdict) ? r.verdict : [];
  const findings = [];
  for (const q of settleQuestions) {
    const row = rows.find((x) => x.id === q.id);
    if (!row || row.verdict !== "yes") findings.push(`${q.id}: not confirmed${row?.verdict ? ` (${row.verdict})` : ""}`);
  }
  return { status: findings.length ? "findings" : "pass", findings, answers: rows };
}

export async function main(argv, { ask: askFn = ask, policy = decideOutputPolicy, renderer = renderDiagram } = {}) {
  const { opts, error } = parseArgs(argv);
  if (error) { console.error(`usage error: ${error}`); return 2; }
  const g = gather(opts);

  if (opts.cmd === "report") {
    console.log(await renderCloseout(g, { diagram: opts.diagram, policy, renderer }));
    return 0;
  }
  if (opts.cmd === "judge") {
    const reportText = opts.reportFile ? fs.readFileSync(opts.reportFile, "utf8") : renderReport(g);
    const s = await settleJudge(reportText, { ask: askFn, ...(opts.audit ? { audit: opts.audit } : {}) });
    console.log(`settle judge: ${s.status}${s.reason ? ` — ${s.reason}` : ""}`);
    for (const f of s.findings) console.log(`FINDING: ${f}`);
    return 0;
  }
  return 2;
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).then((code) => process.exit(code));
