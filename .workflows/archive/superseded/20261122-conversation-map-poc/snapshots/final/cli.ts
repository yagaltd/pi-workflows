#!/usr/bin/env bun
/** CLI for the plan-level manager view. Default output is a static chat tree. */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { extractPlan, type PlanSources } from "./extract.ts";
import { renderDetail, renderEvidence, renderTree } from "./render.ts";

const USAGE = `Usage: bun prototype/poc/cli.ts [options]
  (default)          short manager tree from the redacted fixtures
  --verbose          tree + evidence sources (tool calls live here)
  --json             full machine-readable graph
  --detail <id>      full detail for one node (e.g. T2, decision-T5)
  --sources <dir>    read plan.md/LOG.md/reviews/proofs/journal from <dir>`;

function readUrl(url: URL): string {
  return readFileSync(url, "utf8");
}

function loadFixtures(): PlanSources {
  const dir = new URL("./fixtures/", import.meta.url);
  return {
    planText: readUrl(new URL("plan-079.md", dir)),
    logText: readUrl(new URL("log-079.md", dir)),
    reviewFiles: [
      { path: ".workflows/reviews/task-1-079.md", text: readUrl(new URL("reviews/task-1-079.md", dir)) },
      { path: ".workflows/reviews/task-2-079.md", text: readUrl(new URL("reviews/task-2-079.md", dir)) },
      { path: ".workflows/reviews/task-3-079.md", text: readUrl(new URL("reviews/task-3-079.md", dir)) },
      { path: ".workflows/reviews/task-4-079.md", text: readUrl(new URL("reviews/task-4-079.md", dir)) },
      { path: ".workflows/reviews/task-6-079.md", text: readUrl(new URL("reviews/task-6-079.md", dir)) },
    ],
    proofText: readUrl(new URL("proofs/proofs-079.jsonl", dir)),
    journalText: readUrl(new URL("journal-079.jsonl", dir)),
  };
}

function loadSources(dir: string): PlanSources {
  const read = (name: string) => readFileSync(join(dir, name), "utf8");
  const reviewDir = join(dir, "reviews");
  const proofDir = join(dir, "proofs");
  const reviewFiles = existsSync(reviewDir)
    ? readdirSync(reviewDir).filter((f) => f.endsWith(".md")).sort()
      .map((f) => ({ path: join(reviewDir, f), text: readFileSync(join(reviewDir, f), "utf8") }))
    : [];
  const proofFiles = existsSync(proofDir)
    ? readdirSync(proofDir).filter((f) => f.endsWith(".jsonl") || f.endsWith(".md")).sort()
    : [];
  return {
    planText: read("plan.md"),
    logText: existsSync(join(dir, "LOG.md")) ? read("LOG.md") : "",
    reviewFiles,
    proofText: proofFiles.map((f) => readFileSync(join(proofDir, f), "utf8")).join("\n"),
    journalText: ["journal.jsonl", "journal.md"]
      .filter((f) => existsSync(join(dir, f)))
      .map(read).join("\n"),
  };
}

const args = process.argv.slice(2);
let mode: "tree" | "verbose" | "json" | "detail" = "tree";
let ref = "";
let sourceDir = "";
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--verbose") mode = "verbose";
  else if (arg === "--json") mode = "json";
  else if (arg === "--detail") {
    ref = args[++i] ?? "";
    if (!ref) { console.error("Missing node id after --detail"); process.exit(1); }
    mode = "detail";
  } else if (arg === "--sources") {
    sourceDir = args[++i] ?? "";
    if (!sourceDir) { console.error("Missing directory after --sources"); process.exit(1); }
  } else if (arg === "--help" || arg === "-h") {
    console.log(USAGE);
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${arg}\n${USAGE}`);
    process.exit(1);
  }
}

const graph = extractPlan(sourceDir ? loadSources(sourceDir) : loadFixtures());
if (mode === "json") console.log(JSON.stringify(graph, null, 2));
else if (mode === "detail") console.log(renderDetail(graph, ref));
else if (mode === "verbose") console.log(`${renderTree(graph)}\n\n${renderEvidence(graph)}`);
else console.log(renderTree(graph));
