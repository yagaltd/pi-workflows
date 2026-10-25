#!/usr/bin/env node
/**
 * judge — the repository's single judge client (TypeLLM /v1/generate).
 *
 * Posts a typed question set (JSON array of {id, question, schema}) to the
 * TypeLLM generate API and prints the verdict table to stdout. Config is
 * env-only: TYPEDLLM_API_KEY (required to call) + TYPEDLLM_BASE_URL
 * (default https://api.typellm.ai). NO-JUDGE degradation: key missing or
 * endpoint unreachable ⇒ exit 0, `JUDGE SKIPPED (<reason>)` on stderr, and a
 * skipped entry in the audit file. Never blocks, never invents answers.
 *
 * Usage:
 *   node scripts/judge.mjs ask --questions <file.json> [--audit <file>]
 *
 *   questions file: JSON array of {id, question, schema} (schema = per-question
 *                   JSON Schema for the answer). Hard cap: 64 questions —
 *                   larger sets are rejected locally, never sent.
 *   audit file:     one JSON line per run (default: env JUDGE_AUDIT, else
 *                   <repoRoot>/.workflows/judge-audit.jsonl) — timestamp,
 *                   question count, question set, verdict summary (+ verdict
 *                   itself, or the skip reason).
 */
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const QUESTION_CAP = 64;
const DEFAULT_TIMEOUT_MS = 30_000;

const repoRoot = () => resolve(dirname(fileURLToPath(import.meta.url)), "..");
const auditPath = () => process.env.JUDGE_AUDIT || join(repoRoot(), ".workflows", "judge-audit.jsonl");
const baseUrl = () => (process.env.TYPEDLLM_BASE_URL || "https://api.typellm.ai").replace(/\/+$/, "");
const apiKey = () => process.env.TYPEDLLM_API_KEY || "";
const timeoutMs = () => {
  const n = Number(process.env.TYPEDLLM_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
};

// ── helpers ──────────────────────────────────────────────────────────────────

/** Load + validate a question set. Throws on any shape violation (fail fast). */
export function loadQuestions(file) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`questions file ${file} is not valid JSON (${e.message})`);
  }
  if (!Array.isArray(raw)) throw new Error(`questions file ${file} must be a JSON array of {id, question, schema}`);
  if (raw.length === 0) throw new Error(`questions file ${file} is an empty question set`);
  raw.forEach((q, i) => {
    const at = `question[${i}]${q && typeof q === "object" && q.id ? ` (${q.id})` : ""}`;
    if (!q || typeof q !== "object" || Array.isArray(q)) throw new Error(`${at} must be an object`);
    if (typeof q.id !== "string" || !q.id.trim()) throw new Error(`${at} is missing a non-empty string id`);
    if (typeof q.question !== "string" || !q.question.trim()) throw new Error(`${at} is missing a non-empty string question`);
    if (q.schema !== undefined && (typeof q.schema !== "object" || q.schema === null || Array.isArray(q.schema)))
      throw new Error(`${at} schema must be a JSON Schema object`);
  });
  return raw;
}

/** Verdict summary for the audit line: compact, truncated, shape-agnostic. */
export function summarizeVerdict(verdict) {
  const rows = Array.isArray(verdict) ? `${verdict.length}-row table: ` : "";
  const s = JSON.stringify(verdict) ?? String(verdict);
  return rows + (s.length > 240 ? `${s.slice(0, 237)}...` : s);
}

export function appendAudit(file, entry) {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, `${JSON.stringify(entry)}\n`);
}

function auditEntry(auditFile, { endpoint, questions, status, reason, verdict }) {
  appendAudit(auditFile, {
    v: 1,
    ts: new Date().toISOString(),
    command: "ask",
    endpoint,
    questionCount: questions.length,
    questions,
    status,
    ...(reason !== undefined && { reason }),
    ...(verdict !== undefined && { verdict, summary: summarizeVerdict(verdict) }),
  });
}

function skip(out, reason) {
  out.write(`JUDGE SKIPPED (${reason})\n`);
}

/**
 * Ask the judge. Returns {status, skipped?, verdict?}.
 * Degrades (skipped, status 0) on missing key, unreachable endpoint,
 * HTTP error, or a non-JSON verdict — anything that would otherwise
 * block the pipeline or tempt a fabricated answer.
 */
export async function ask({ questions, auditFile, fetchImpl = fetch, out = process.stdout, err = process.stderr }) {
  const endpoint = `${baseUrl()}/v1/generate`;
  const common = { endpoint, questions };
  if (!apiKey()) {
    skip(err, "missing TYPEDLLM_API_KEY");
    auditEntry(auditFile, { ...common, status: "skipped", reason: "missing TYPEDLLM_API_KEY" });
    return { status: 0, skipped: true };
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs());
  let res, body;
  try {
    res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey()}` },
      body: JSON.stringify(questions),
      signal: ac.signal,
    });
    body = await res.text();
  } catch (e) {
    const why = e.name === "AbortError" ? `timed out after ${timeoutMs()}ms` : e.message;
    skip(err, `endpoint unreachable (${why})`);
    auditEntry(auditFile, { ...common, status: "skipped", reason: `endpoint unreachable (${why})` });
    return { status: 0, skipped: true };
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    skip(err, `endpoint unreachable (HTTP ${res.status})`);
    auditEntry(auditFile, { ...common, status: "skipped", reason: `endpoint unreachable (HTTP ${res.status})` });
    return { status: 0, skipped: true };
  }
  let verdict;
  try {
    verdict = JSON.parse(body);
  } catch {
    skip(err, "endpoint returned a non-JSON verdict");
    auditEntry(auditFile, { ...common, status: "skipped", reason: "endpoint returned a non-JSON verdict" });
    return { status: 0, skipped: true };
  }

  out.write(`${JSON.stringify(verdict, null, 2)}\n`);
  auditEntry(auditFile, { ...common, status: "ok", verdict });
  return { status: 0, verdict };
}

// ── commands ─────────────────────────────────────────────────────────────────

export async function cmdAsk(args, { out = process.stdout, err = process.stderr } = {}) {
  let questionsFile = null, auditFile = null;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const val = args[i + 1];
    if (flag === "--questions" || flag === "--audit") {
      if (val === undefined) throw new Error(`flag ${flag} requires a value`);
      if (flag === "--questions") questionsFile = val;
      else auditFile = val;
      i++;
    } else {
      throw new Error(`unknown argument ${flag}`);
    }
  }
  if (!questionsFile) throw new Error("usage: judge.mjs ask --questions <file.json> [--audit <file>]");

  // NO-JUDGE gate FIRST (plan-017 D2): key absence is the tested default path —
  // loud skip, exit 0, audit entry — BEFORE any input validation. A key-less
  // environment must never fail on input shape it will never send.
  if (!apiKey()) {
    err.write(`JUDGE SKIPPED (missing TYPEDLLM_API_KEY)\n`);
    appendAudit(auditFile || auditPath(), {
      v: 1, ts: new Date().toISOString(), command: "ask", questionCount: 0,
      status: "skipped", reason: "missing TYPEDLLM_API_KEY",
    });
    return 0;
  }

  const questions = loadQuestions(questionsFile);
  if (questions.length > QUESTION_CAP)
    throw new Error(`${questions.length} questions exceeds the ${QUESTION_CAP}-question cap; split the set`);
  const af = auditFile || auditPath();
  const { status } = await ask({ questions, auditFile: af, out, err });
  return status;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "ask": {
      process.exitCode = await cmdAsk(rest);
      break;
    }
    default:
      console.log("usage: judge.mjs ask --questions <file.json> [--audit <file>]");
      process.exitCode = cmd === undefined ? 0 : 1;
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) main().catch((e) => { console.error(`judge: ${e.message}`); process.exitCode = 1; });
