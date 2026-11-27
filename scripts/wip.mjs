#!/usr/bin/env node
// wip.mjs — executable WIP batch state. The JSON file is the source of truth;
// commit trailers are linkage only. Proof seams take one explicit verdict file
// and one explicit changed-file list so no directory scan can revive stale proof.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const STATUSES = new Set(["awaiting-review", "ready-to-ship", "shipped"]);
const STATE_KEYS = [
  "id",
  "kind",
  "scope",
  "root_cause",
  "verdict",
  "status",
  "created_at",
  "task_ids",
  "verified_files",
];
const TASK_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const BATCH_ID_RE = /^([A-Za-z0-9][A-Za-z0-9._-]*)\/([A-Za-z0-9][A-Za-z0-9._-]*(?:[+,][A-Za-z0-9][A-Za-z0-9._-]*)*)$/;
const VERDICT_MTIME_TOLERANCE_MS = 1000;

function emit(payload, code = 0) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(code);
}

function fail(reason, extra = {}) {
  emit({ ok: false, reason, ...extra }, 1);
}

/** Parse the flat CLI form: one command, then --key value (repeatable for scope). */
function parseArgs(argv) {
  const opts = { repo: process.cwd(), scope: [], positionals: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      opts.positionals.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const value = argv[++i];
    if (value === undefined) fail(`missing value for --${key}`);
    if (key === "scope") opts[key].push(value);
    else opts[key] = value;
  }
  return opts;
}

function normalizePath(value) {
  const trimmed = String(value).trim().replace(/^\.\//, "");
  if (!trimmed || trimmed.startsWith("/") || trimmed.includes("\\")) return null;
  const parts = trimmed.split("/");
  if (parts.includes("") || parts.includes(".") || parts.includes("..")) return null;
  return parts.join("/");
}

function parsePaths(values) {
  const result = [];
  for (const value of values) {
    for (const part of String(value).split(",")) {
      const normalized = normalizePath(part);
      if (!normalized) fail(`invalid path in scope: ${part || "(empty)"}`);
      if (!result.includes(normalized)) result.push(normalized);
    }
  }
  return result;
}

function parseBatchId(id) {
  if (typeof id !== "string") return null;
  const match = BATCH_ID_RE.exec(id);
  if (!match) return null;
  const taskIds = match[2].split(/[+,]/);
  if (taskIds.some((task) => !TASK_ID_RE.test(task))) return null;
  return { plan: match[1], task_ids: taskIds };
}

function stateDir(repo) {
  return path.join(repo, ".workflows", "wip");
}

/** Slash/plus in an id are encoded so the id stays one file, never a subtree. */
function statePath(repo, id) {
  return path.join(stateDir(repo), `${encodeURIComponent(id)}.json`);
}

function idFromFile(entry) {
  try {
    return decodeURIComponent(entry.slice(0, -5));
  } catch {
    return null;
  }
}

/**
 * @cc [label:wip-state,id:wip-schema-is-closed] wip-schema-is-closed
 * WIP state is exactly the nine declared keys; malformed state fails loudly
 * instead of being repaired or silently ignored.
 */
function validateState(state, file) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return `${file}: malformed WIP state (expected a JSON object)`;
  }
  const missing = STATE_KEYS.filter((key) => !(key in state));
  if (missing.length) return `${file}: malformed WIP state (missing ${missing.join(", ")})`;
  if (Object.keys(state).some((key) => !STATE_KEYS.includes(key))) {
    return `${file}: malformed WIP state (unknown key)`;
  }
  const parsedId = parseBatchId(state.id);
  if (!parsedId) return `${file}: malformed WIP state id (${String(state.id)})`;
  if (!Array.isArray(state.task_ids) || state.task_ids.length === 0) {
    return `${file}: malformed WIP state task_ids`;
  }
  if (JSON.stringify(state.task_ids) !== JSON.stringify(parsedId.task_ids)) {
    return `${file}: malformed WIP state task_ids (do not match id suffix)`;
  }
  if (typeof state.kind !== "string" || !state.kind.trim()) {
    return `${file}: malformed WIP state kind`;
  }
  if (!Array.isArray(state.scope) || state.scope.some((entry) => normalizePath(entry) === null)) {
    return `${file}: malformed WIP state scope`;
  }
  if (typeof state.root_cause !== "string" || !state.root_cause.trim()) {
    return `${file}: malformed WIP state root_cause`;
  }
  if (state.verdict !== null && (typeof state.verdict !== "string" || !state.verdict.trim())) {
    return `${file}: malformed WIP state verdict`;
  }
  if (!STATUSES.has(state.status)) return `${file}: malformed WIP state status (${String(state.status)})`;
  if (typeof state.created_at !== "string" || !Number.isFinite(Date.parse(state.created_at))) {
    return `${file}: malformed WIP state created_at`;
  }
  if (
    !Array.isArray(state.verified_files)
    || state.verified_files.some((entry) => normalizePath(entry) === null)
  ) {
    return `${file}: malformed WIP state verified_files`;
  }
  return null;
}

function readStateFile(file, expectedId = null) {
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    return { error: `${file}: malformed WIP state (unreadable)` };
  }
  let state;
  try {
    state = JSON.parse(text);
  } catch {
    return { error: `${file}: malformed WIP state (invalid JSON)` };
  }
  const error = validateState(state, file);
  if (error) return { error };
  if (expectedId !== null && state.id !== expectedId) {
    return { error: `${file}: malformed WIP state (id does not match filename)` };
  }
  return { state };
}

function writeState(repo, state) {
  const dir = stateDir(repo);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(statePath(repo, state.id), `${JSON.stringify(state, null, 2)}\n`);
}

const EMPTY_STATUS = { ok: true, active: false, batch: null, id: null, status: null, count: 0, states: [] };

/**
 * @cc [label:wip-state,id:status-is-read-only] status-is-read-only
 * WIP status inspection never writes state; it reads .workflows/wip/*.json
 * and fails loudly on malformed or ambiguous active batches. An unreadable
 * state directory is a structured failure, never a thrown exception.
 */
export function readWipStatus(repo) {
  try {
    const dir = stateDir(repo);
    if (!fs.existsSync(dir)) return EMPTY_STATUS;
    const states = [];
    for (const entry of fs.readdirSync(dir).sort()) {
      if (!entry.endsWith(".json")) continue;
      const file = path.join(dir, entry);
      const expectedId = idFromFile(entry);
      if (expectedId === null) {
        return { ...EMPTY_STATUS, ok: false, reason: `${file}: malformed WIP state (invalid filename)` };
      }
      const parsed = readStateFile(file, expectedId);
      if (parsed.error) {
        return { ...EMPTY_STATUS, ok: false, reason: parsed.error };
      }
      states.push(parsed.state);
    }
    const active = states.filter((state) => state.status !== "shipped");
    if (active.length > 1) {
      return {
        ...EMPTY_STATUS,
        ok: false,
        active: true,
        count: active.length,
        states,
        reason: `multiple active WIP batches: ${active.map((state) => state.id).join(", ")}`,
      };
    }
    const current = active[0] ?? null;
    return {
      ok: true,
      active: current !== null,
      batch: current?.id ?? null,
      id: current?.id ?? null,
      status: current?.status ?? null,
      count: active.length,
      states,
    };
  } catch (error) {
    return { ...EMPTY_STATUS, ok: false, reason: `unreadable WIP state: ${String(error)}` };
  }
}

/**
 * @cc [label:wip-dispatch,id:active-wip-blocks-dispatch] active-wip-blocks-dispatch
 * An active or malformed WIP batch maps to a structured ok:false dispatch
 * block that names the /review remedy; the helper never writes files.
 */
export function wipBlockResult(status) {
  if (!status.ok) {
    return {
      ok: false,
      blocked: "wip-active",
      reason: `${status.reason} — resolve WIP state with /review before dispatching`,
      eligible: [],
    };
  }
  if (!status.active) return null;
  return {
    ok: false,
    blocked: "wip-active",
    reason:
      `WIP batch ${status.batch} is ${status.status} — run /review to consume it (wip ready + wip verify + wip ship) before dispatching`,
    eligible: [],
  };
}

function resolveState(repo, opts) {
  if (opts.id) {
    if (!parseBatchId(opts.id)) fail(`invalid WIP batch id (${opts.id})`);
    const parsed = readStateFile(statePath(repo, opts.id), opts.id);
    if (parsed.error) fail(parsed.error);
    return parsed.state;
  }
  const status = readWipStatus(repo);
  if (!status.ok) fail(status.reason);
  if (!status.active) fail("no active WIP batch");
  const parsed = readStateFile(statePath(repo, status.id), status.id);
  if (parsed.error) fail(parsed.error);
  return parsed.state;
}

function readScopeFile(repo, file) {
  if (!file) fail("wip verify requires --scope-file");
  let text;
  try {
    text = fs.readFileSync(path.isAbsolute(file) ? file : path.resolve(repo, file), "utf8");
  } catch {
    fail(`malformed scope file (${file}): unreadable`);
  }
  const paths = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const normalized = normalizePath(line);
    if (normalized === null) fail(`invalid changed path (${line.trim()})`);
    if (!paths.includes(normalized)) paths.push(normalized);
  }
  return paths;
}

/**
 * A verdict file is bound to one batch: every `task_ids` entry must have a
 * final **ok: true** marker in THAT file, newer than the batch's created_at.
 * Both standalone and `- Verdict: **ok: true** ...` forms are accepted. The
 * last marker for a task wins so a corrected final verdict replaces an
 * earlier rejection in the same review file.
 */
function parseVerdictFile(text, file, taskIds) {
  const fileTask = path.basename(file, path.extname(file));
  const verdicts = new Map();
  let headingTask = null;
  for (const line of text.split(/\r?\n/)) {
    if (/^#{1,6}\s/.test(line)) {
      const mentioned = taskIds.filter((task) => line.toLowerCase().includes(task.toLowerCase()));
      headingTask = mentioned.length === 1 ? mentioned[0] : null;
    }
    const marker = /\*\*ok:\s*(true|false)\*\*/i.exec(line);
    if (!marker) continue;
    const mentioned = taskIds.filter((task) => line.toLowerCase().includes(task.toLowerCase()));
    const owners = mentioned.length
      ? mentioned
      : headingTask
      ? [headingTask]
      : taskIds.includes(fileTask)
      ? [fileTask]
      : taskIds.length === 1
      ? [taskIds[0]]
      : [];
    for (const task of owners) verdicts.set(task, marker[1].toLowerCase() === "true");
  }
  return taskIds.filter((task) => verdicts.get(task) !== true);
}

function checkVerdict(state, repo) {
  if (typeof state.verdict !== "string" || !state.verdict.trim()) {
    return { error: `missing verdict for WIP batch ${state.id} — run /review to bind a verdict file` };
  }
  const file = path.isAbsolute(state.verdict) ? state.verdict : path.resolve(repo, state.verdict);
  let text;
  let stats;
  try {
    stats = fs.statSync(file);
    text = fs.readFileSync(file, "utf8");
  } catch {
    return { error: `missing verdict file for WIP batch ${state.id}: ${state.verdict}` };
  }
  // Filesystem mtime can be coarser than the millisecond precision of created_at;
  // a verdict written in the same clock tick can appear earlier. Bound the
  // tolerance to one second so clearly older verdicts still fail.
  if (stats.mtimeMs + VERDICT_MTIME_TOLERANCE_MS < Date.parse(state.created_at)) {
    return { error: `stale verdict for WIP batch ${state.id}: ${state.verdict} predates created_at` };
  }
  const missing = parseVerdictFile(text, file, state.task_ids);
  if (missing.length) {
    return {
      error: `missing final ok:true verdict for task ${missing.join(", ")} in WIP batch ${state.id}`,
    };
  }
  return { ok: true, file };
}

function checkScope(state, changed) {
  const scope = state.scope.map(normalizePath);
  for (const entry of changed) {
    if (!scope.some((allowed) => entry === allowed || entry.startsWith(`${allowed}/`))) {
      return {
        error: `out-of-scope changed file ${entry} (WIP-Scope: ${scope.join(", ")}) in WIP batch ${state.id}`,
      };
    }
  }
  return { ok: true };
}

/**
 * @cc [label:wip-state,id:wip-verify-needs-proof] wip-verify-needs-proof
 * Verification requires ready-to-ship state, the batch's one bound verdict
 * file, and a changed-file list wholly inside the state's declared scope; it
 * never repairs state or scans other verdicts.
 */
function verifyState(state, repo, changed) {
  if (state.status !== "ready-to-ship") {
    return {
      error: `WIP batch ${state.id} is ${state.status}, not ready-to-ship — run wip ready first`,
    };
  }
  const verdict = checkVerdict(state, repo);
  if (verdict.error) return verdict;
  const scope = checkScope(state, changed);
  if (scope.error) return scope;
  return { ok: true, tasks: state.task_ids, verdict: state.verdict, verified_files: changed };
}

function validateMessage(text) {
  const batchLines = [...text.matchAll(/^WIP-Batch:[ \t]*(.*?)[ \t]*$/gm)].map((m) => m[1]);
  const scopeLines = [...text.matchAll(/^WIP-Scope:[ \t]*(.*?)[ \t]*$/gm)].map((m) => m[1]);
  if (batchLines.length > 1) return { error: "WIP-Batch trailer appears more than once" };
  const batch = batchLines[0]?.trim() ?? null;
  if (batch !== null && !parseBatchId(batch)) return { error: `malformed WIP-Batch trailer (${batch || "empty"})` };
  const scope = [];
  for (const line of scopeLines) {
    if (!line.trim()) return { error: "malformed WIP-Scope trailer (empty)" };
    for (const part of line.split(",")) {
      const normalized = normalizePath(part);
      if (!normalized) return { error: `malformed WIP-Scope trailer (${part.trim() || "empty"})` };
      if (!scope.includes(normalized)) scope.push(normalized);
    }
  }
  return { ok: true, batch, scope };
}

function main() {
  const [command, ...argv] = process.argv.slice(2);
  const opts = parseArgs(argv);
  const repo = path.resolve(opts.repo);

  switch (command) {
    case "start": {
      const id = opts.id;
      if (!parseBatchId(id)) fail("wip start requires --id \"<plan>/<task-ids>\"");
      if (fs.existsSync(statePath(repo, id))) fail(`WIP batch ${id} already exists`);
      const status = readWipStatus(repo);
      if (!status.ok) fail(status.reason);
      if (status.active) fail(`refusing second active WIP batch (${status.batch})`);
      const scope = parsePaths(opts.scope);
      if (!scope.length) fail("wip start requires --scope");
      if (!opts.kind?.trim()) fail("wip start requires --kind");
      if (!opts["root-cause"]?.trim()) fail("wip start requires --root-cause");
      const createdAt = opts["created-at"] ?? new Date().toISOString();
      if (!Number.isFinite(Date.parse(createdAt))) fail("invalid --created-at");
      const state = {
        id,
        kind: opts.kind.trim(),
        scope,
        root_cause: opts["root-cause"].trim(),
        verdict: null,
        status: "awaiting-review",
        created_at: createdAt,
        task_ids: parseBatchId(id).task_ids,
        verified_files: [],
      };
      const error = validateState(state, id);
      if (error) fail(error);
      writeState(repo, state);
      emit({ ok: true, batch: id, path: path.relative(repo, statePath(repo, id)), state });
      break;
    }
    case "status": {
      const status = readWipStatus(repo);
      if (!status.ok) fail(status.reason, { active: true });
      emit({ ok: true, ...status });
      break;
    }
    case "ready": {
      const state = resolveState(repo, opts);
      if (state.status !== "awaiting-review") {
        fail(`WIP batch ${state.id} is ${state.status}, not awaiting-review — wip ready requires an unreviewed batch`);
      }
      if (!opts.verdict?.trim()) fail("wip ready requires --verdict <file>");
      state.verdict = opts.verdict;
      const verdict = checkVerdict(state, repo);
      if (verdict.error) fail(verdict.error, { batch: state.id });
      state.status = "ready-to-ship";
      state.verified_files = [];
      writeState(repo, state);
      emit({ ok: true, batch: state.id, status: state.status, verdict: state.verdict });
      break;
    }
    case "verify": {
      const state = resolveState(repo, opts);
      const changed = readScopeFile(repo, opts["scope-file"]);
      const result = verifyState(state, repo, changed);
      if (result.error) fail(result.error, { batch: state.id });
      state.verified_files = result.verified_files;
      writeState(repo, state);
      emit({ ok: true, active: true, batch: state.id, status: state.status, ...result });
      break;
    }
    case "ship": {
      const state = resolveState(repo, opts);
      if (state.status !== "ready-to-ship") {
        fail(`WIP batch ${state.id} is ${state.status}, not ready-to-ship — wip ship requires a verified batch`);
      }
      const verdict = checkVerdict(state, repo);
      if (verdict.error) fail(verdict.error, { batch: state.id });
      if (!state.verified_files.length) {
        fail(`WIP batch ${state.id} has no verified_files — run wip verify before ship`, { batch: state.id });
      }
      const scope = checkScope(state, state.verified_files);
      if (scope.error) fail(scope.error, { batch: state.id });
      state.status = "shipped";
      writeState(repo, state);
      emit({ ok: true, batch: state.id, status: state.status });
      break;
    }
    case "message": {
      let text = "";
      if (opts.file) {
        try {
          text = fs.readFileSync(opts.file, "utf8");
        } catch {
          fail(`malformed commit message file (${opts.file}): unreadable`);
        }
      } else if (!process.stdin.isTTY) {
        text = fs.readFileSync(0, "utf8");
      }
      const parsed = validateMessage(text);
      if (parsed.error) fail(parsed.error);
      if (parsed.batch) {
        const status = readWipStatus(repo);
        if (!status.ok) fail(status.reason);
        if (!status.active || status.id !== parsed.batch) {
          fail(`WIP-Batch ${parsed.batch} has no matching active WIP batch`);
        }
      }
      emit({ ok: true, ...parsed });
      break;
    }
    default:
      fail("usage: wip <start|status|ready|ship|verify|message> [--repo <dir>] [options]");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
