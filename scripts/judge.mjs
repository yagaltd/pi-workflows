#!/usr/bin/env node
/**
 * judge — the repository's single judge client (typesafe System One,
 * plan 20261025-029; origin: typellm until v0.10.x).
 *
 * Posts a typed question set (JSON array of {id, question, schema}) to
 * typesafe /v1/systemone (jev-latest) and prints verdict rows to stdout.
 * Key chain: TYPESAFE_API_KEY env → ~/.pi/agent/auth.json .typesafe.key.
 * NO-JUDGE degradation: key missing or endpoint unreachable ⇒ exit 0,
 * `JUDGE SKIPPED (<reason>)` on stderr, and a skipped entry in the audit
 * file. Never blocks, never invents answers.
 *
 * Usage:
 *   node scripts/judge.mjs ask --questions <file.json> [--audit <file>]
 *
 *   questions file: JSON array of {id, question, schema}. schema.enum
 *                   [yes,no] or type boolean → noul; schema.enum N values →
 *                   choice; anything else is rejected locally, never sent.
 *                   Hard cap: 64 questions.
 *   audit file:     one JSON line per run (default: env JUDGE_AUDIT, else
 *                   <repoRoot>/.workflows/judge-audit.jsonl).
 */
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

export const QUESTION_CAP = 64;
const DEFAULT_TIMEOUT_MS = 30_000;
const STATE = "pi-workflows judge question set";

const repoRoot = () => resolve(dirname(fileURLToPath(import.meta.url)), "..");
const auditPath = () => process.env.JUDGE_AUDIT || join(repoRoot(), ".workflows", "judge-audit.jsonl");
const baseUrl = () => (process.env.TYPESAFE_BASE_URL || "https://api.typesafe.ai").replace(/\/+$/, "");
const model = () => process.env.TYPESAFE_MODEL || "jev-latest";
const timeoutMs = () => {
  const n = Number(process.env.TYPESAFE_TIMEOUT_MS || process.env.TYPEDLLM_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
};

function readAuthKey() {
  try {
    const auth = JSON.parse(readFileSync(join(homedir(), ".pi", "agent", "auth.json"), "utf8"));
    return typeof auth?.typesafe?.key === "string" ? auth.typesafe.key : "";
  } catch {
    return "";
  }
}
const apiKey = () => process.env.TYPESAFE_API_KEY || readAuthKey();

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

/** Translate {id, question, schema} rows into one systemone request body. */
export function translate(questions) {
  const out = {};
  for (const q of questions) {
    const enumValues = q.schema?.enum;
    if (Array.isArray(enumValues) && enumValues.length === 2 && enumValues.every((v) => typeof v === "string") &&
        enumValues.map((v) => v.toLowerCase()).sort().join() === "no,yes") {
      out[q.id] = { type: "noul", instructions: q.question };
    } else if (Array.isArray(enumValues) && enumValues.length >= 2 && enumValues.length <= 255 && enumValues.every((v) => typeof v === "string")) {
      const criteria = {};
      for (const v of enumValues) criteria[v] = v;
      out[q.id] = { type: "choice", instructions: q.question, criteria };
    } else if (q.schema?.type === "boolean") {
      out[q.id] = { type: "noul", instructions: q.question };
    } else {
      throw new Error(`question (${q.id}): unsupported schema for the typesafe backend — use schema.enum (yes/no or N options) or type boolean`);
    }
  }
  return out;
}

/** Map systemone answers to verdict rows {id, verdict, confidence, probabilities?}. */
export function mapAnswers(answers) {
  const rows = [];
  for (const [id, a] of Object.entries(answers ?? {})) {
    if (a?.type === "noul") {
      rows.push({ id, verdict: a.noul >= 0.5 ? "yes" : "no", confidence: Math.max(a.noul, 1 - a.noul), pYes: a.noul });
    } else if (a?.type === "choice") {
      rows.push({ id, verdict: a.choice, confidence: a.confidence, probabilities: a.probabilities });
    } else if (a?.type === "score") {
      rows.push({ id, verdict: a.score, confidence: a.confidence, probabilities: a.probabilities });
    } else {
      rows.push({ id, verdict: null, confidence: 0 });
    }
  }
  return rows;
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

function auditEntry(auditFile, { endpoint, questions, status, reason, verdict, model, usage }) {
  appendAudit(auditFile || auditPath(), {
    v: 1,
    ts: new Date().toISOString(),
    command: "ask",
    endpoint,
    questionCount: questions.length,
    questions,
    status,
    ...(model !== undefined && { model }),
    ...(usage !== undefined && { usage }),
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
 * HTTP error, or a non-JSON response — anything that would otherwise
 * block the pipeline or tempt a fabricated answer.
 */
export async function ask({ questions, auditFile, fetchImpl = fetch, out = process.stdout, err = process.stderr, key = apiKey() }) {
  const endpoint = `${baseUrl()}/v1/systemone`;
  const common = { endpoint, questions };
  if (!key) {
    skip(err, "missing TYPESAFE_API_KEY (env or ~/.pi/agent/auth.json)");
    auditEntry(auditFile, { ...common, status: "skipped", reason: "missing TYPESAFE_API_KEY (env or ~/.pi/agent/auth.json)" });
    return { status: 0, skipped: true };
  }

  let bodyText;
  try {
    bodyText = JSON.stringify({ model: model(), state: STATE, questions: translate(questions) });
  } catch (e) {
    skip(err, e.message);
    auditEntry(auditFile, { ...common, status: "skipped", reason: e.message });
    return { status: 0, skipped: true };
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs());
  let res, body;
  try {
    res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: bodyText,
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
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    skip(err, "endpoint returned a non-JSON response");
    auditEntry(auditFile, { ...common, status: "skipped", reason: "endpoint returned a non-JSON response" });
    return { status: 0, skipped: true };
  }
  if (!parsed || typeof parsed !== "object" || !parsed.answers) {
    skip(err, "endpoint response missing answers");
    auditEntry(auditFile, { ...common, status: "skipped", reason: "endpoint response missing answers" });
    return { status: 0, skipped: true };
  }

  const verdict = mapAnswers(parsed.answers);
  out.write(`${JSON.stringify(verdict, null, 2)}\n`);
  auditEntry(auditFile, { ...common, status: "ok", verdict, model: parsed.model, usage: parsed.usage });
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
  // loud skip, exit 0, audit entry — BEFORE any input validation.
  if (!apiKey()) {
    err.write(`JUDGE SKIPPED (missing TYPESAFE_API_KEY (env or ~/.pi/agent/auth.json))\n`);
    appendAudit(auditFile || auditPath(), {
      v: 1, ts: new Date().toISOString(), command: "ask", questionCount: 0,
      status: "skipped", reason: "missing TYPESAFE_API_KEY (env or ~/.pi/agent/auth.json)",
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
    default: {
      console.error("usage: judge.mjs ask --questions <file.json> [--audit <file>]");
      process.exitCode = 2;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
