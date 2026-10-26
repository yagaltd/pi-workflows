#!/usr/bin/env node
// format-chooser — the output-artifact chooser (plan 20261026-032).
// Two advisory questions, one judge call: does this output need a visual
// artifact (none/table/mermaid/html), and which diagram type fits?
// The chooser suggests; the agent decides. Audited via judge.mjs ask
// (the single judge client, DEC-001). Fail-open to none (prose).
//
// Ladder doctrine (source: diagram-design SKILL.md §2): prose is rung 1;
// a visual is earned only when the reader learns more from it than from
// prose or a table. HTML artifacts are generated views — never gates,
// regenerable from the md source (DEC-005).
//
// Usage:
//   node scripts/format-chooser.mjs choose --for <closeout|plan-approval|challenge|brainstorm-graduation>
//                                          --content-file <file> [--audit <file>]
// Exit: 0 always (advisory) · 2 usage.

import fs from "node:fs";
import { ask } from "./judge.mjs";

export const BOUNDARIES = ["closeout", "plan-approval", "challenge", "brainstorm-graduation"];
export const ARTIFACTS = ["none", "table", "mermaid", "html"];
const TYPE_GROUPS = {
  "data-flow": "bottleneck, fan-in, queue depth, finite capacity",
  flowchart: "decision logic with branches",
  "state-machine": "states, transitions, guards",
  tree: "parent-children hierarchy or decomposition",
  loop: "reinforcing cycle, the last step feeds the first",
  quadrant: "two-axis positioning or prioritization",
  timeline: "events or phases positioned in time",
  architecture: "components and connections in one snapshot",
  sankey: "a quantity splitting and merging across stages",
  other: "none of these — pick from the 45-type guide",
};

const LADDER = `Prose is the default. Use a table when 3 columns communicate the same thing. Use a diagram only when the reader learns more from a visual than from prose or a table: multi-system architecture, state machines, decision graphs, flows of quantity. Lists of things are not diagrams. One-shape diagrams are a sentence.`;

export function parseArgs(argv) {
  const o = { cmd: null, for: null, contentFile: null, audit: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "choose") o.cmd = a;
    else if (a === "--for") o.for = argv[++i];
    else if (a === "--content-file") o.contentFile = argv[++i];
    else if (a === "--audit") o.audit = argv[++i];
    else return { error: `unknown argument: ${a}` };
  }
  if (o.cmd !== "choose") return { error: "subcommand required: choose" };
  if (!BOUNDARIES.includes(o.for)) return { error: `--for must be one of ${BOUNDARIES.join("|")}` };
  if (!o.contentFile) return { error: "--content-file is required" };
  return { opts: o };
}

export function buildQuestions(boundary, content) {
  const state = `Boundary: ${boundary}\n\nOUTPUT CONTENT:\n${content.slice(0, 4000)}`;
  return [
    {
      id: "artifact",
      question: `Which artifact form serves a human decision on this output best? Ladder: ${LADDER}\nAnswer none when prose suffices — none is the correct default, not a failure.`,
      schema: { type: "string", enum: ARTIFACTS },
    },
    {
      id: "type",
      question: `Speculative premise: a visual artifact is chosen. If the artifact is none or table, this answer is unused. Which diagram family fits the content best? Groups: ${Object.entries(TYPE_GROUPS).map(([k, v]) => `${k} = ${v}`).join("; ")}`,
      schema: { type: "string", enum: Object.keys(TYPE_GROUPS) },
    },
  ];
}

export function readVerdict(r) {
  const rows = Array.isArray(r?.verdict) ? r.verdict : [];
  const artifactRow = rows.find((x) => x.id === "artifact") ?? {};
  const typeRow = rows.find((x) => x.id === "type") ?? {};
  return {
    artifact: ARTIFACTS.includes(artifactRow.verdict) ? artifactRow.verdict : "none",
    artifactConfidence: typeof artifactRow.confidence === "number" ? artifactRow.confidence : null,
    type: TYPE_GROUPS[typeRow.verdict] ? typeRow.verdict : null,
    typeConfidence: typeof typeRow.confidence === "number" ? typeRow.confidence : null,
  };
}

export async function choose({ boundary, content, auditFile, ask: askFn = ask }) {
  const r = await askFn({ questions: buildQuestions(boundary, content), ...(auditFile ? { auditFile } : {}) });
  if (!r || r.skipped) {
    return { boundary, artifact: "none", skipped: true, reason: "judge unavailable — prose stands (ladder rung 1)" };
  }
  return { boundary, ...readVerdict(r), skipped: false };
}

export async function main(argv, { ask: askFn = ask, err = process.stderr } = {}) {
  const { opts, error } = parseArgs(argv);
  if (error) { err.write(`usage error: ${error}\n`); return 2; }
  if (!fs.existsSync(opts.contentFile)) { err.write(`usage error: content file not found: ${opts.contentFile}\n`); return 2; }
  const content = fs.readFileSync(opts.contentFile, "utf8");
  const c = await choose({ boundary: opts.for, content, ...(opts.audit ? { auditFile: opts.audit } : {}), ask: askFn });
  if (c.skipped) err.write(`FORMAT CHOOSER SKIPPED (${c.reason})\n`);
  console.log(JSON.stringify({ ...c, note: "advisory — the agent may overrule with a stated reason; html artifacts are generated views, never gates" }));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).then((code) => process.exit(code));
