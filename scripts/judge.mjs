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
 *   node scripts/judge.mjs ask --questions <file.json> [--context <file.spec>]... [--audit <file>]
 *
 *   questions file: JSON array of {id, question, schema}. schema.enum
 *                   [yes,no] or type boolean → noul; schema.enum N values →
 *                   choice; anything else is rejected locally, never sent.
 *                   Hard cap: 64 questions.
 *   context file:   regular UTF-8 .spec under .workflows/specs/ only; bound into
 *                   every instruction as `CONTEXT <path>: <text>` before the question.
 *                   Caps apply to the final translated payload; breach = loud skip.
 *   audit file:     one JSON line per run (default: env JUDGE_AUDIT, else
 *                   <repoRoot>/.workflows/judge-audit.jsonl).
 */
import { appendFileSync, lstatSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TextDecoder } from "node:util";

export const QUESTION_CAP = 64;
const CONTEXT_QUESTION_CAP = 60_000;
const CONTEXT_PAYLOAD_CAP = 65_000;
const KEY_SHAPED_NAME =
  /(?:^|[^a-z0-9])(?:api[_-]?key|secret|token|password|passwd|credential|auth|key)(?:[^a-z0-9]|$)/i;
const DEFAULT_TIMEOUT_MS = 30_000;
const STATE = "pi-workflows judge question set";

const repoRoot = () => resolve(dirname(fileURLToPath(import.meta.url)), "..");
// The judge is package-owned but the contract belongs to the consumer: never
// resolve --context against the installed package root.
const specDir = () => join(process.cwd(), ".workflows", "specs");
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
    if (typeof q.question !== "string" || !q.question.trim()) {
      throw new Error(`${at} is missing a non-empty string question`);
    }
    if (q.schema !== undefined && (typeof q.schema !== "object" || q.schema === null || Array.isArray(q.schema))) {
      throw new Error(`${at} schema must be a JSON Schema object`);
    }
  });
  return raw;
}

/**
 * @cc [label:context-binding] spec-only-context
 * Context paths MUST resolve to regular UTF-8 `.spec` files directly under the
 * consumer working directory's spec directory; symlinks, outside paths and
 * key-shaped names MUST be rejected before any request is sent.
 */
function loadContext(paths) {
  const dir = specDir();
  return paths.map((supplied) => {
    if (typeof supplied !== "string" || !supplied.trim()) {
      throw new Error("context path must be a non-empty string");
    }
    const abs = resolve(process.cwd(), supplied);
    const name = basename(abs);
    let stat;
    try {
      stat = lstatSync(abs);
    } catch {
      throw new Error(`context ${supplied} must be a readable regular .spec file under .workflows/specs/`);
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`context ${supplied} is a symlink; symlink context is not allowed`);
    }
    if (!stat.isFile()) {
      throw new Error(`context ${supplied} must be a regular .spec file under .workflows/specs/`);
    }
    if (KEY_SHAPED_NAME.test(name)) {
      throw new Error(`context ${name} has a key-shaped name; keys, secrets and auth files are not allowed as context`);
    }
    if (dirname(abs) !== dir || !name.endsWith(".spec")) {
      throw new Error(`context ${supplied} must be a regular .spec file under .workflows/specs/`);
    }
    if (realpathSync(dirname(abs)) !== dirname(abs)) {
      throw new Error(`context ${supplied} traverses a symlink; symlink context is not allowed`);
    }
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(abs));
    } catch {
      throw new Error(`context ${supplied} is not valid UTF-8 text`);
    }
    if (text.includes("\0")) {
      throw new Error(`context ${supplied} is not regular UTF-8 text`);
    }
    return { path: supplied, text };
  });
}

/** Human-readable `CONTEXT <path>: <text>` blocks; empty means no binding. */
function formatContext(entries) {
  return entries.map(({ path, text }) => `CONTEXT ${path}: ${text}`).join("\n\n");
}

/** Return the first cap breach in the final translated payload, or "". */
function contextCapBreach(translated, contextPaths) {
  const from = contextPaths.length ? ` from context ${contextPaths.join(", ")}` : "";
  for (const [id, payload] of Object.entries(translated)) {
    const size = typeof payload?.instructions === "string" ? payload.instructions.length : 0;
    if (size > CONTEXT_QUESTION_CAP) {
      return `question ${id} instruction ${size} chars exceeds per-question cap ${CONTEXT_QUESTION_CAP}${from}`;
    }
  }
  const size = JSON.stringify(translated).length;
  if (size > CONTEXT_PAYLOAD_CAP) {
    return `translated payload ${size} chars exceeds payload cap ${CONTEXT_PAYLOAD_CAP}${from}`;
  }
  return "";
}

/**
 * @cc [label:context-binding] context-precedes-question
 * When context text is supplied, every translated instruction MUST contain it
 * before the original question, which stays verbatim and must not be replaced.
 */
/**
 * @cc [label:context-binding] no-context-compat
 * Calling translate without context MUST emit the original question as the
 * exact instruction, with no context scaffolding.
 */
export function translate(questions, contextText = "") {
  const out = {};
  for (const q of questions) {
    const instructions = contextText ? `${contextText}\n\n${q.question}` : q.question;
    const enumValues = q.schema?.enum;
    if (
      Array.isArray(enumValues) && enumValues.length === 2 && enumValues.every((v) => typeof v === "string")
      && enumValues.map((v) => v.toLowerCase()).sort().join() === "no,yes"
    ) {
      out[q.id] = { type: "noul", instructions };
    } else if (
      Array.isArray(enumValues) && enumValues.length >= 2 && enumValues.length <= 255
      && enumValues.every((v) => typeof v === "string")
    ) {
      const criteria = {};
      for (const v of enumValues) criteria[v] = v;
      out[q.id] = { type: "choice", instructions, criteria };
    } else if (q.schema?.type === "boolean") {
      out[q.id] = { type: "noul", instructions };
    } else {
      throw new Error(
        `question (${q.id}): unsupported schema for the typesafe backend — use schema.enum (yes/no or N options) or type boolean`,
      );
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

function auditEntry(
  auditFile,
  { endpoint, questions, status, reason, verdict, model, usage, contextPaths, truncated },
) {
  appendAudit(auditFile || auditPath(), {
    v: 1,
    ts: new Date().toISOString(),
    command: "ask",
    endpoint,
    questionCount: questions.length,
    questions,
    status,
    ...(contextPaths?.length ? { contextPaths } : {}),
    ...(truncated !== undefined && { truncated }),
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
 * @cc [label:context-binding] key-gate-first
 * A missing API key MUST skip before context validation, input processing
 * or any network call, with the same reason and audit entry as before.
 */
/**
 * @cc [label:context-binding] fail-closed-context-cap
 * A per-question or final-payload cap breach MUST skip before fetch, record
 * `truncated: true` in the audit entry, and send no request or partial prompt.
 */
/**
 * Ask the judge. Returns {status, skipped?, verdict?}.
 * Degrades (skipped, status 0) on missing key, invalid context, a cap breach,
 * unreachable endpoint, HTTP error, or a non-JSON response — anything that would
 * otherwise block the pipeline or tempt a fabricated answer.
 */
export async function ask(
  {
    questions,
    contextPaths = [],
    auditFile,
    fetchImpl = fetch,
    out = process.stdout,
    err = process.stderr,
    key = apiKey(),
  },
) {
  const endpoint = `${baseUrl()}/v1/systemone`;
  const common = { endpoint, questions };
  const audited = contextPaths.length ? { ...common, contextPaths } : common;
  if (!key) {
    skip(err, "missing TYPESAFE_API_KEY (env or ~/.pi/agent/auth.json)");
    auditEntry(auditFile, {
      ...common,
      status: "skipped",
      reason: "missing TYPESAFE_API_KEY (env or ~/.pi/agent/auth.json)",
    });
    return { status: 0, skipped: true };
  }

  let bodyText;
  try {
    const contextText = formatContext(loadContext(contextPaths));
    const translated = translate(questions, contextText);
    const breach = contextPaths.length ? contextCapBreach(translated, contextPaths) : "";
    if (breach) {
      const reason = `context exceeds cap: ${breach}`;
      skip(err, reason);
      auditEntry(auditFile, { ...audited, status: "skipped", reason, truncated: true });
      return { status: 0, skipped: true, truncated: true };
    }
    bodyText = JSON.stringify({ model: model(), state: STATE, questions: translated });
  } catch (e) {
    skip(err, e.message);
    auditEntry(auditFile, { ...audited, status: "skipped", reason: e.message });
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
    auditEntry(auditFile, { ...audited, status: "skipped", reason: `endpoint unreachable (${why})` });
    return { status: 0, skipped: true };
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    skip(err, `endpoint unreachable (HTTP ${res.status})`);
    auditEntry(auditFile, { ...audited, status: "skipped", reason: `endpoint unreachable (HTTP ${res.status})` });
    return { status: 0, skipped: true };
  }
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    skip(err, "endpoint returned a non-JSON response");
    auditEntry(auditFile, { ...audited, status: "skipped", reason: "endpoint returned a non-JSON response" });
    return { status: 0, skipped: true };
  }
  if (!parsed || typeof parsed !== "object" || !parsed.answers) {
    skip(err, "endpoint response missing answers");
    auditEntry(auditFile, { ...audited, status: "skipped", reason: "endpoint response missing answers" });
    return { status: 0, skipped: true };
  }

  const verdict = mapAnswers(parsed.answers);
  out.write(`${JSON.stringify(verdict, null, 2)}\n`);
  auditEntry(auditFile, { ...audited, status: "ok", verdict, model: parsed.model, usage: parsed.usage });
  return { status: 0, verdict };
}

// ── commands ─────────────────────────────────────────────────────────────────

/**
 * @cc [label:context-binding] repeatable-context-flag
 * cmdAsk MUST accept `--context <path>` repeatedly and forward every supplied
 * path, in order, to ask for binding into each question instruction.
 */
export async function cmdAsk(args, { out = process.stdout, err = process.stderr } = {}) {
  let questionsFile = null, auditFile = null;
  const contextPaths = [];
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const val = args[i + 1];
    if (flag === "--questions" || flag === "--audit" || flag === "--context") {
      if (val === undefined) throw new Error(`flag ${flag} requires a value`);
      if (flag === "--questions") questionsFile = val;
      else if (flag === "--audit") auditFile = val;
      else contextPaths.push(val);
      i++;
    } else {
      throw new Error(`unknown argument ${flag}`);
    }
  }
  if (!questionsFile) {
    throw new Error("usage: judge.mjs ask --questions <file.json> [--context <file.spec>]... [--audit <file>]");
  }

  // NO-JUDGE gate FIRST (plan-017 D2): key absence is the tested default path —
  // loud skip, exit 0, audit entry — BEFORE any input validation.
  if (!apiKey()) {
    err.write(`JUDGE SKIPPED (missing TYPESAFE_API_KEY (env or ~/.pi/agent/auth.json))\n`);
    appendAudit(auditFile || auditPath(), {
      v: 1,
      ts: new Date().toISOString(),
      command: "ask",
      questionCount: 0,
      status: "skipped",
      reason: "missing TYPESAFE_API_KEY (env or ~/.pi/agent/auth.json)",
    });
    return 0;
  }

  const questions = loadQuestions(questionsFile);
  if (questions.length > QUESTION_CAP) {
    throw new Error(`${questions.length} questions exceeds the ${QUESTION_CAP}-question cap; split the set`);
  }
  const af = auditFile || auditPath();
  const { status } = await ask({ questions, contextPaths, auditFile: af, out, err });
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
      console.error("usage: judge.mjs ask --questions <file.json> [--context <file.spec>]... [--audit <file>]");
      process.exitCode = 2;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
