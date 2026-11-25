#!/usr/bin/env node
// check-judge-context.mjs — parse-only lint for judge pre-flight questions.
// A question that names a contract path without supplying its contents is a
// finding: the judge client cannot read files, so such a prompt is unactionable.
// This lint only parses the question set; it sends no judge request, reads no
// context file, and never executes a selector.
//
// Usage:
//   node scripts/check-judge-context.mjs --questions <file> [--context <spec> ...]
// Exit: 0 no finding · 1 path-only finding · 2 usage / unreadable questions.

import fs from "node:fs";
import path from "node:path";

const FINDING = "path-only judge question; embed the contract or supply it with --context";
const SPEC_REF = /(?<![\w.-])\/?(?:[\w.-]+\/)+[\w.-]+\.spec(?![\w.-])/g;

function usage() {
  process.stderr.write(
    "usage: node scripts/check-judge-context.mjs --questions <file> [--context <spec> ...]\n",
  );
  process.exit(2);
}

function normalize(value) {
  return path.resolve(process.cwd(), value.replace(/\\/g, "/")).split(path.sep).join("/");
}

const args = process.argv.slice(2);
let questionsFile;
const contexts = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg !== "--questions" && arg !== "--context") usage();
  if (i + 1 >= args.length) usage();
  const value = args[++i];
  if (arg === "--questions") {
    if (questionsFile !== undefined) usage();
    questionsFile = value;
  } else {
    contexts.push(value);
  }
}
if (questionsFile === undefined) usage();

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(questionsFile, "utf8"));
} catch (err) {
  process.stderr.write(`cannot read questions file ${questionsFile}: ${err.message}\n`);
  process.exit(2);
}
const questions = Array.isArray(parsed) ? parsed : parsed?.questions;
if (!Array.isArray(questions)) usage();

const supplied = new Set(contexts.map(normalize));
const unbound = [];
questions.forEach((question, index) => {
  const text = typeof question === "string" ? question : question?.question;
  if (typeof text !== "string") usage();
  for (const [ref] of text.matchAll(SPEC_REF)) {
    const resolved = normalize(ref);
    if (!supplied.has(resolved)) unbound.push(`question ${index + 1}: ${ref}`);
  }
});

if (unbound.length === 0) process.exit(0);
for (const label of new Set(unbound)) process.stdout.write(`${label}: ${FINDING}\n`);
process.exit(1);
