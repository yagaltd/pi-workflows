#!/usr/bin/env node
// format-chooser — the output-artifact chooser (plan 20261123-075).
// The deterministic output policy decides the artifact form; one judge call
// supplies advisory diagram-family input and confidence. The chooser
// suggests; the agent decides. Audited via judge.mjs ask (the single judge
// client, DEC-001). Fail-open to none (prose).
//
// Ladder doctrine (source: diagram-design SKILL.md §2): prose is rung 1;
// a visual is earned only when the reader learns more from it than from
// prose or a table. HTML artifacts are generated views — never gates,
// regenerable from the md source (DEC-005).
//
// Usage:
//   node scripts/format-chooser.mjs choose --for <closeout|plan-approval|challenge|brainstorm-graduation>
//                                          --content-file <file> [--audit <file>]
//                                          [--tasks N] [--dependencies N] [--waves N]
//                                          [--rows N] [--fields N] [--fix-loop] ...
// Exit: 0 always (advisory) · 2 usage.

import fs from "node:fs";
import { ask } from "./judge.mjs";
import { parsePolicyArgs } from "./output-policy-cli.mjs";
import { decideOutputPolicy } from "./output-policy.mjs";

export const BOUNDARIES = ["closeout", "plan-approval", "challenge", "brainstorm-graduation"];
export const ARTIFACTS = ["none", "table", "mermaid", "html"];
const POLICY_DIAGRAM_FORM = "mermaid"; // canonical diagram form; html stays a generated view
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

const LADDER =
  `Prose is the default. Use a table when 3 columns communicate the same thing. Use a diagram only when the reader learns more from a visual than from prose or a table: multi-system architecture, state machines, decision graphs, flows of quantity. Lists of things are not diagrams. One-shape diagrams are a sentence.`;

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
      question:
        `Which artifact form serves a human decision on this output best? Ladder: ${LADDER}\nAnswer none when prose suffices — none is the correct default, not a failure.`,
      schema: { type: "string", enum: ARTIFACTS },
    },
    {
      id: "type",
      question:
        `Speculative premise: a visual artifact is chosen. If the artifact is none or table, this answer is unused. Which diagram family fits the content best? Groups: ${
          Object.entries(TYPE_GROUPS).map(([k, v]) => `${k} = ${v}`).join("; ")
        }`,
      schema: { type: "string", enum: Object.keys(TYPE_GROUPS) },
    },
  ];
}

export function readVerdict(r) {
  const rows = Array.isArray(r?.verdict) ? r.verdict : [];
  const artifactRow = rows.find((x) => x.id === "artifact") ?? {};
  const typeRow = rows.find((x) => x.id === "type") ?? {};
  const reason = [artifactRow.reason, typeRow.reason, r?.reason].find((x) => typeof x === "string") ?? null;
  return {
    artifact: ARTIFACTS.includes(artifactRow.verdict) ? artifactRow.verdict : "none",
    artifactConfidence: typeof artifactRow.confidence === "number" ? artifactRow.confidence : null,
    type: TYPE_GROUPS[typeRow.verdict] ? typeRow.verdict : null,
    typeConfidence: typeof typeRow.confidence === "number" ? typeRow.confidence : null,
    reason,
  };
}

/**
 * @cc [label:output-policy] policy-authoritative-artifact
 * Only the deterministic policy result may select table or diagram forms; judge answers stay advisory.
 */
/**
 * @cc [label:output-policy] chooser-fail-open-to-prose
 * An unavailable judge yields artifact none with a loud skip even on a policy visual positive.
 */
export async function choose({ boundary, content, auditFile, policy, ask: askFn = ask }) {
  const decision = policy ?? decideOutputPolicy();
  const policyFlags = { table: decision.table === true, diagram: decision.diagram === true };
  const r = await askFn({ questions: buildQuestions(boundary, content), ...(auditFile ? { auditFile } : {}) });
  if (!r || r.skipped) {
    return {
      boundary,
      policy: policyFlags,
      artifact: "none",
      diagram: false,
      skipped: true,
      reason: "judge unavailable — prose stands (ladder rung 1)",
    };
  }
  const verdict = readVerdict(r);
  const artifact = policyFlags.table ? "table" : policyFlags.diagram ? POLICY_DIAGRAM_FORM : "none";
  const { artifact: judgeArtifact, artifactConfidence, type, typeConfidence, reason } = verdict;
  return {
    boundary,
    policy: policyFlags,
    artifact,
    diagram: artifact === POLICY_DIAGRAM_FORM,
    artifactConfidence,
    type,
    typeConfidence,
    reason,
    judgeSuggestion: { artifact: judgeArtifact, artifactConfidence, type, typeConfidence, reason },
    skipped: false,
  };
}

export async function main(argv, { ask: askFn = ask, err = process.stderr, out = (s) => console.log(s), policy } = {}) {
  const { input: policyInput, rest, error: policyError } = parsePolicyArgs(argv);
  if (policyError) {
    err.write(`usage error: ${policyError}\n`);
    return 2;
  }
  const { opts, error } = parseArgs(rest);
  if (error) {
    err.write(`usage error: ${error}\n`);
    return 2;
  }
  if (!fs.existsSync(opts.contentFile)) {
    err.write(`usage error: content file not found: ${opts.contentFile}\n`);
    return 2;
  }
  const content = fs.readFileSync(opts.contentFile, "utf8");
  const effectivePolicy = policy ?? (Object.keys(policyInput).length ? decideOutputPolicy(policyInput) : undefined);
  const c = await choose({
    boundary: opts.for,
    content,
    ...(opts.audit ? { auditFile: opts.audit } : {}),
    ...(effectivePolicy ? { policy: effectivePolicy } : {}),
    ask: askFn,
  });
  if (c.skipped) err.write(`FORMAT CHOOSER SKIPPED (${c.reason})\n`);
  out(
    JSON.stringify({
      ...c,
      note: "advisory — the agent may overrule with a stated reason; html artifacts are generated views, never gates",
    }),
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).then((code) => process.exit(code));
