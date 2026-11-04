#!/usr/bin/env node
// ship-diagram — git diff → ship report + SeeCode bar spec (plan 20261104-057 T2).
// Deterministic only: classifies `git diff --name-status` (A/M/Rxx/D), emits a
// grouped markdown report and a bar JSON. Zero dependencies (node builtins).
//
// Usage:
//   node scripts/ship-diagram.mjs [--from <tag>] [--to <ref>=HEAD]
//        [--diff-file <fixture>] [--out-dir diagrams/]
//   --diff-file reads fixture lines instead of running git.
// Exit: 0 ok · 2 usage.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function classifyStatus(line) {
  const m = /^([AMD])\t(.+)$/.exec(line.trim());
  if (!m) {
    const r = /^R\d+\t(.+)\t(.+)$/.exec(line.trim());
    if (r) return { kind: "moved", file: `${r[1]} → ${r[2]}` };
    return null;
  }
  const kind = { A: "added", M: "modified", D: "removed" }[m[1]];
  return { kind, file: m[2] };
}

export function buildReport(from, to, diffLines) {
  const groups = { added: [], modified: [], moved: [], removed: [] };
  for (const line of diffLines) {
    const c = classifyStatus(line);
    if (c) groups[c.kind].push(c.file);
  }
  const sections = Object.entries(groups)
    .map(([kind, files]) => [`## ${kind[0].toUpperCase() + kind.slice(1)} (${files.length})`, ...files.map((f) => `- ${f}`)].join("\n"))
    .join("\n\n");
  const total = Object.values(groups).reduce((n, f) => n + f.length, 0);
  return `# Ship report: ${from}..${to}\n\n${sections}\n\nTotal: ${total} files changed\n`;
}

export function extractFeatures(changelog, version) {
  const lines = changelog.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${version}`);
  if (start === -1) return [];
  const feats = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^## /.test(l.trim())) break;
    if (/^\s*[-*] /.test(l)) feats.push(l.replace(/^\s*[-*] /, "").trim());
  }
  return feats;
}

export function parseVerdict(markdown) {
  const parsed = { ok: null, criticality: null, issues: [] };
  for (const l of markdown.split("\n")) {
    const ok = /Verdict:\s*\*\*ok:\s*(true|false)\*\*/i.exec(l);
    if (ok) parsed.ok = ok[1] === "true";
    const crit = /criticality[:\s]*\**([a-z]+)\**/i.exec(l);
    if (crit && !parsed.criticality) parsed.criticality = crit[1];
    const issue = /issue:\s*(.+)/i.exec(l);
    if (issue) parsed.issues.push(issue[1].trim().replace(/\*\*/g, ""));
  }
  return parsed;
}

export function buildBarSpec(from, to, diffLines) {
  const counts = { added: 0, modified: 0, moved: 0, removed: 0 };
  for (const line of diffLines) {
    const c = classifyStatus(line);
    if (c) counts[c.kind]++;
  }
  return {
    type: "bar",
    title: `Ship ${from}..${to} by change kind`,
    unit: "files",
    sort: "desc",
    data: Object.entries(counts).map(([label, v]) => [label, v]),
  };
}

function gitDiffLines(from, to) {
  return execFileSync("git", ["diff", "--name-status", `${from}..${to}`], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
    .split("\n")
    .filter(Boolean);
}

export async function main(argv = process.argv.slice(2)) {
  const o = { from: null, to: "HEAD", diffFile: null, outDir: "diagrams" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--from") o.from = argv[++i];
    else if (argv[i] === "--to") o.to = argv[++i];
    else if (argv[i] === "--diff-file") o.diffFile = argv[++i];
    else if (argv[i] === "--out-dir") o.outDir = argv[++i];
    else return 2;
  }
  if (!o.from) return 2;

  const diffLines = o.diffFile ? fs.readFileSync(o.diffFile, "utf8").split("\n").filter(Boolean) : gitDiffLines(o.from, o.to);

  fs.mkdirSync(o.outDir, { recursive: true });
  const base = `ship-${o.from}..${o.to}`;
  fs.writeFileSync(path.join(o.outDir, `${base}.md`), buildReport(o.from, o.to, diffLines));
  fs.writeFileSync(path.join(o.outDir, `${base}.json`), JSON.stringify(buildBarSpec(o.from, o.to, diffLines), null, 2) + "\n");
  console.log(`${path.join(o.outDir, base + ".md")} ${path.join(o.outDir, base + ".json")}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
