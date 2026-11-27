#!/usr/bin/env node
// open-diagram-render — injectable renderer seam (plan 20261123-075).
// Turns a supplied diagram spec into SVG + PNG plus the measurements a caller
// needs. The runner defaults to the local open-diagram 0.4.0 CLI; tests inject
// a stub. No format decision, judge call or output policy lives here.
//
// Usage:
//   node scripts/open-diagram-render.mjs --spec <file> --title <text> --out <base> [--subtitle <text>]
// Exit: 0 success · 1 render failure · 2 usage.

import { execFile } from "node:child_process";

export const OPEN_DIAGRAM_CLI = "/home/aurel/.local/share/open-diagram/venv/bin/open-diagram";
export const MIN_TEXT_PX = 10;
const SUMMARY =
  /wrote\s+.+?:\s*([\d.]+)\s*x\s*([\d.]+)\s*px;\s*smallest text\s*([\d.]+)\s*px;\s*(\d+)\s+layout problem\(s\)/;

function runOpenDiagram(args) {
  return new Promise((resolve, reject) => {
    execFile(args[0], args.slice(1), (error, stdout, stderr) => {
      if (error && (error.signal || typeof error.code !== "number")) return reject(error);
      resolve({ status: error?.code ?? 0, stdout: stdout || "", stderr: stderr || "" });
    });
  });
}

/**
 * @cc [label:diagram-render] cli-path-override
 * OPEN_DIAGRAM_CLI selects the executable for each render; the verified local
 * path is only a default, so another installation can be used without a code edit.
 */
/**
 * @cc [label:diagram-render,id:layout-problems-rejected] layout-problems-rejected
 * Any layout problem reported by open-diagram rejects the render with the
 * problem named; no partial artifact-and-metrics result is returned.
 */
/**
 * @cc [label:diagram-render,id:illegible-text-rejected] illegible-text-rejected
 * A diagram whose smallest measured text is below 10 px is rejected with the
 * measurement named in the error; no result is returned for it.
 */
/**
 * @cc [label:diagram-render,id:alt-text-additive] alt-text-additive
 * The renderer returns a textual description beside the artifact paths; it
 * never decides whether a diagram is warranted or replaces canonical text.
 */
export async function renderDiagram({ spec, out, run = runOpenDiagram }) {
  const specPath = typeof spec === "string" ? spec : spec?.path;
  const title = typeof spec === "string" ? "" : spec?.title;
  if (!specPath || typeof specPath !== "string") throw new Error("renderDiagram: spec.path is required");
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new Error(`renderDiagram: ${specPath} needs a descriptive title for alt text`);
  }
  if (!out || typeof out !== "string") throw new Error("renderDiagram: out is required (path without extension)");

  // Environment override is read per call so the default runner can be
  // pointed at a different installation without changing this module.
  const cli = process.env.OPEN_DIAGRAM_CLI?.trim() || OPEN_DIAGRAM_CLI;
  const invocation = await run([cli, "draw", specPath, "-o", out]);
  const status = invocation?.status ?? 0;
  const stdout = invocation?.stdout ?? "";
  const stderr = invocation?.stderr ?? "";
  const summary = SUMMARY.exec(stdout);
  const namedProblems = stdout.split("\n").filter((line) => /^\s+-\s+/.test(line)).map((line) => line.trim());
  const failures = [];
  if (status !== 0) failures.push(`open-diagram exited with status ${status}`);
  if (!summary) failures.push("could not read the open-diagram measurement summary");
  if (summary) {
    const problems = Number(summary[4]);
    const smallestTextPx = Number(summary[3]);
    if (problems > 0) failures.push(`${problems} layout problem(s): ${namedProblems.join("; ") || "(none listed)"}`);
    if (smallestTextPx < MIN_TEXT_PX) {
      failures.push(`smallest text ${smallestTextPx} px is below the ${MIN_TEXT_PX} px legibility floor`);
    }
  }
  if (failures.length) {
    throw new Error(`open-diagram render rejected (${specPath}): ${failures.join("; ")}\n${stdout}${stderr}`);
  }

  const subtitle = typeof spec === "string" ? "" : spec.subtitle?.trim();
  return {
    svgPath: `${out}.svg`,
    pngPath: `${out}.png`,
    widthPx: Number(summary[1]),
    heightPx: Number(summary[2]),
    smallestTextPx: Number(summary[3]),
    layoutProblems: Number(summary[4]),
    altText: `Diagram: ${title.trim()}${subtitle ? `. ${subtitle}` : ""}`,
  };
}

export function parseArgs(argv) {
  const o = { spec: null, title: null, subtitle: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--spec") o.spec = argv[++i];
    else if (a === "--title") o.title = argv[++i];
    else if (a === "--subtitle") o.subtitle = argv[++i];
    else if (a === "--out") o.out = argv[++i];
    else return { error: `unknown argument: ${a}` };
  }
  if (!o.spec) return { error: "--spec is required" };
  if (!o.title) return { error: "--title is required" };
  if (!o.out) return { error: "--out is required" };
  return { opts: o };
}

export async function main(argv, { run = runOpenDiagram, stdout = process.stdout, stderr = process.stderr } = {}) {
  const { opts, error } = parseArgs(argv);
  if (error) {
    stderr.write(`usage error: ${error}\n`);
    return 2;
  }
  try {
    const result = await renderDiagram({
      spec: { path: opts.spec, title: opts.title, ...(opts.subtitle ? { subtitle: opts.subtitle } : {}) },
      out: opts.out,
      run,
    });
    stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (e) {
    stderr.write(`open-diagram render failed: ${e instanceof Error ? e.message : String(e)}\n`);
    return 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2)).then((code) => process.exit(code));
