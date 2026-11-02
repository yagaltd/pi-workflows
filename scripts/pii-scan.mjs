#!/usr/bin/env node
/**
 * pii-scan — JEV-batched PII advisory pass over changed data/doc files
 * (plan 20261102-049, task 1).
 *
 * Scans the merge-base..HEAD diff (or --files override) for json/csv/yaml/
 * toml/md files, builds STRUCTURE-ONLY state per file (CSV header row,
 * JSON/YAML/TOML key paths, MD heading inventory + free-text flag — never
 * values), fans out ≤ 64 questions per call (QUESTION_CAP reused from
 * scripts/judge.mjs; chunked per file) to the judge (`ask`), and appends
 * an idempotent review ruler to .workflows/pii/reviewed_v1.jsonl keyed by
 * file + question id (dir created on demand).
 *
 * Degradation (scan outcomes always exit 0 — advisory only, never
 * passes/fails a task):
 *   - judge key missing / endpoint down → judge.ask returns
 *     {status: 0, skipped: true} after printing `JUDGE SKIPPED (...)`;
 *     surfaced loudly here, exit 0, NO ruler rows for that file.
 *   - gitleaks report not provided → judge-only report with a loud
 *     `gitleaks absent` note (gitleaks owner-removed; --gitleaks <report>
 *     restores triage with disagreement-first ordering).
 *   - binary / unparseable / unsupported-extension files → skipped per
 *     file with a named reason.
 *
 * GUARDRAIL — values-never-extract (precision-worded): data VALUES never
 * reach state, questions, output, or the ruler; gitleaks Secret/Match
 * fields are dropped at parse time. Field NAMES (CSV header cells, MD
 * heading text, JSON/YAML/TOML key names) DO pass through — but only via
 * sanitizeName(): truncated to 24 chars, with any ≥8-char alphanumeric run
 * mixing letters and digits replaced by `[redacted:<len>]`. Field semantics
 * survive (a column named `email` stays `email`); literal-bearing names die
 * (`SECRETVALUE42` → `[redacted:13]`). Data values and literal-bearing
 * names never leave the machine verbatim.
 *
 * Usage:
 *   node scripts/pii-scan.mjs --plan <id> [--files f1,f2] [--gitleaks <report.json>]
 *
 * Zero dependencies (node: builtins + scripts/judge.mjs), ESM, Node ≥ 18.
 */

import { readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, basename, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ask, QUESTION_CAP } from "./judge.mjs";

// ── contract constants ───────────────────────────────────────────────────

export const DATA_DOC_EXTENSIONS = [".json", ".csv", ".yaml", ".yml", ".toml", ".md"];

/** Speculative PII set: the categories each file's structure is asked about. */
export const SPECULATIVE_PII_SET = [
  "email addresses",
  "phone numbers",
  "person names",
  "postal addresses",
  "API keys or tokens",
  "passwords or secrets",
  "government identifiers (SSN, passport)",
  "credit card numbers",
  "birthdates",
  "IP addresses",
  "geolocation coordinates",
  "health or medical data",
];

const repoRoot = () => resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RULER_PATH = () => join(repoRoot(), ".workflows", "pii", "reviewed_v1.jsonl");
const MAX_KEY_PATHS = 2000;

// ── name sanitizer (GUARDRAIL: names pass through, literals die) ─────────

/** Length bound for name-like pass-throughs (header cells, key names, heading text). */
export const NAME_BOUND = 24;

/**
 * Deterministic sanitize for NAME-like structure that reaches the judge:
 * replace any alphanumeric run of ≥ 8 chars mixing letters and digits with
 * `[redacted:<len>]` (redact BEFORE truncating so markers carry the original
 * run length and no partial runs survive the cut), then bound the result.
 * Field semantics survive: `email` stays `email`, `user_email_2024` keeps
 * its words; literal secrets embedded in names die: `SECRETVALUE42` →
 * `[redacted:13]`. Idempotent (the `[redacted:N]` marker re-sanitizes to
 * itself). Unit-tested in tests/pii-scan.test.ts.
 */
export function sanitizeName(name) {
  const redacted = String(name).replace(/[A-Za-z0-9]+/g, (run) =>
    run.length >= 8 && /[A-Za-z]/.test(run) && /\d/.test(run) ? `[redacted:${run.length}]` : run,
  );
  return redacted.slice(0, NAME_BOUND).trim();
}

// ── changed-file discovery ───────────────────────────────────────────────

export function filterDataDocFiles(paths) {
  const exts = new Set(DATA_DOC_EXTENSIONS);
  return paths.filter((p) => exts.has(extname(p).toLowerCase()));
}

function git(cwd, args) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

/** git diff --name-only <merge-base>..HEAD; unresolvable base degrades loudly. */
export function listChangedFiles({ cwd = repoRoot(), base = process.env.PII_SCAN_BASE || "main" } = {}) {
  const candidates = [...new Set([base, "origin/main"])];
  let mergeBase = null;
  for (const candidate of candidates) {
    const mb = git(cwd, ["merge-base", "HEAD", candidate]);
    if (mb) {
      mergeBase = mb;
      break;
    }
  }
  if (!mergeBase) {
    return { files: [], note: `no merge-base resolvable from HEAD (tried: ${candidates.join(", ")}; set PII_SCAN_BASE)` };
  }
  const out = git(cwd, ["diff", "--name-only", `${mergeBase}..HEAD`]);
  if (out === null) return { files: [], note: "git diff failed (not a git worktree?)" };
  return { files: out.split("\n").filter(Boolean) };
}

// ── per-file state builder (GUARDRAIL: structure only; names sanitized, values never read) ──

function looksBinary(buf) {
  if (buf.includes(0)) return "binary file (NUL byte)";
  if (buf.toString("utf8").includes("\uFFFD")) return "binary or non-UTF-8 content";
  return null;
}

export function buildState(file) {
  let buf;
  try {
    buf = readFileSync(file);
  } catch (e) {
    return { file, skipped: true, reason: `unreadable: ${e.code || e.message}` };
  }
  const binary = looksBinary(buf);
  if (binary) return { file, skipped: true, reason: binary };
  const text = buf.toString("utf8");
  const ext = extname(file).toLowerCase();
  try {
    switch (ext) {
      case ".csv":
        return csvState(file, text);
      case ".json":
        return jsonState(file, text);
      case ".yaml":
      case ".yml":
        return lineKeyState(file, text, "yaml");
      case ".toml":
        return tomlState(file, text);
      case ".md":
        return mdState(file, text);
      default:
        return {
          file,
          skipped: true,
          reason: `unsupported extension: ${ext || "(none)"} (data/doc scan covers ${DATA_DOC_EXTENSIONS.join(", ")})`,
        };
    }
  } catch (e) {
    return { file, skipped: true, reason: `unparseable ${ext.slice(1) || "file"}: ${String(e.message).split("\n")[0]}` };
  }
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** CSV → header row ONLY, sanitized (data rows counted, never read). */
function csvState(file, text) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { file, type: "csv", headers: [], dataRows: 0 };
  return { file, type: "csv", headers: splitCsvLine(lines[0]).map(sanitizeName), dataRows: Math.max(lines.length - 1, 0) };
}

/** JSON → key paths (dotted; `x[]` for array-element object keys). */
function jsonState(file, text) {
  const parsed = JSON.parse(text); // throws → caught upstream: unparseable JSON
  const keyPaths = [];
  let truncated = false;
  const push = (p) => {
    if (keyPaths.length >= MAX_KEY_PATHS) {
      truncated = true;
      return false;
    }
    keyPaths.push(p);
    return true;
  };
  const walk = (node, prefix) => {
    if (truncated || !node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const el of node) {
        if (truncated) return;
        walk(el, `${prefix}[]`);
      }
    } else {
      for (const [k, v] of Object.entries(node)) {
        const p = prefix ? `${prefix}.${sanitizeName(k)}` : sanitizeName(k);
        if (!push(p)) return;
        walk(v, p);
      }
    }
  };
  walk(parsed, "");
  return { file, type: "json", keyPaths, ...(truncated && { truncated: true }) };
}

/** YAML → key paths via indentation-aware line scan (values after `:` never read; keys sanitized). */
function lineKeyState(file, text, type) {
  const keyPaths = [];
  let truncated = false;
  const stack = []; // { indent, key }
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = raw.match(/^(\s*)(?:-\s+)?([^\s:#][^:]*):(\s|$)/);
    if (!m) continue;
    const indent = m[1].replace(/\t/g, "  ").length;
    const key = sanitizeName(m[2].trim().replace(/^["']|["']$/g, ""));
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    stack.push({ indent, key });
    if (keyPaths.length >= MAX_KEY_PATHS) {
      truncated = true;
      break;
    }
    keyPaths.push(stack.map((s) => s.key).join("."));
  }
  return { file, type, keyPaths, ...(truncated && { truncated: true }) };
}

/** TOML → key paths from [table] headers + bare `key =` lines (names sanitized). */
function tomlState(file, text) {
  const keyPaths = [];
  let truncated = false;
  let table = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const t = line.match(/^\[\[?([^\]]+)\]?\]$/);
    if (t) {
      table = sanitizeName(t[1].trim());
      continue;
    }
    const kv = line.match(/^(?:"([^"]+)"|([A-Za-z0-9_.$-]+))\s*=[^=]/);
    if (kv) {
      if (keyPaths.length >= MAX_KEY_PATHS) {
        truncated = true;
        break;
      }
      keyPaths.push(table ? `${table}.${sanitizeName(kv[1] || kv[2])}` : sanitizeName(kv[1] || kv[2]));
    }
  }
  return { file, type: "toml", keyPaths, ...(truncated && { truncated: true }) };
}

/** MD → heading inventory (sanitized) + free-text flag (fenced content never read). */
function mdState(file, text) {
  const headings = [];
  let freeText = false;
  let inFence = false;
  for (const raw of text.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue; // fenced code may hold values — structure only
    const h = raw.match(/^ {0,3}(#{1,6})\s+(.*)$/);
    if (h) headings.push(sanitizeName(h[2].trim().replace(/#+\s*$/, "").trim()));
    else if (raw.trim()) freeText = true;
  }
  return { file, type: "md", headings, freeText };
}

// ── structural digest + question builder ─────────────────────────────────

export function structureDigest(state) {
  if (state.skipped) return `skipped (${state.reason})`;
  switch (state.type) {
    case "csv":
      return `csv columns [${state.headers.join(", ")}]; ${state.dataRows} data row(s) not read`;
    case "md":
      return `md headings [${state.headings.join(" / ")}]; free text present: ${state.freeText}`;
    case "json":
    case "yaml":
    case "toml": {
      const all = state.keyPaths;
      const shown = all.slice(0, 12).join(", ");
      return `${state.type} key paths (${all.length}${state.truncated ? "+, truncated" : ""}): ${shown}${all.length > 12 ? " …" : ""}`;
    }
    default:
      return "unknown structure";
  }
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** One question per speculative PII category, grounded in the structural digest only. */
export function buildQuestions(file, state) {
  if (state.skipped) return [];
  const base = basename(file);
  const digest = structureDigest(state);
  return SPECULATIVE_PII_SET.map((category, i) => ({
    id: `q${String(i + 1).padStart(2, "0")}-${slug(category)}`,
    question: `File "${base}" (${digest}). You see only this structural description, never file values. Could this file plausibly contain ${category}?`,
    schema: { enum: ["yes", "no"] },
  }));
}

/** ≤ cap questions per call, chunked per file. */
export function chunkQuestions(questions, cap = QUESTION_CAP) {
  const chunks = [];
  for (let i = 0; i < questions.length; i += cap) chunks.push(questions.slice(i, i + cap));
  return chunks;
}

// ── gitleaks triage (optional report) ────────────────────────────────────

/**
 * Parse a gitleaks JSON report → Map<basename, [{rule, description, line}]>.
 * Secret/Match fields are deliberately DROPPED — values never propagate.
 */
export function parseGitleaksReport(reportPath) {
  let raw;
  try {
    raw = readFileSync(reportPath, "utf-8");
  } catch (e) {
    return { perFile: new Map(), note: `gitleaks report unreadable: ${e.code || e.message}` };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { perFile: new Map(), note: "gitleaks report unparseable (not JSON)" };
  }
  if (!Array.isArray(parsed)) {
    return { perFile: new Map(), note: "gitleaks report unparseable (expected a JSON array of findings)" };
  }
  const perFile = new Map();
  for (const f of parsed) {
    const file = String(f?.File || "");
    if (!file) continue;
    const key = basename(file);
    if (!perFile.has(key)) perFile.set(key, []);
    perFile.get(key).push({
      rule: String(f?.RuleID || "unknown"),
      description: String(f?.Description || ""),
      line: Number.isFinite(f?.StartLine) ? f.StartLine : null,
    });
  }
  return { perFile, note: null };
}

// ── ruler: idempotent append (key = file + question id) ──────────────────

const rulerKey = (file, questionId) => JSON.stringify([file, questionId]);

function appendRuler(rulerFile, file, entries) {
  const existing = new Set();
  if (existsSync(rulerFile)) {
    for (const line of readFileSync(rulerFile, "utf-8").split("\n")) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        existing.add(rulerKey(r.file, r.questionId));
      } catch {
        // tolerate corrupt lines — never block the advisory pass
      }
    }
  }
  const fresh = entries.filter((e) => !existing.has(rulerKey(file, e.questionId)));
  if (fresh.length === 0) return 0;
  mkdirSync(dirname(rulerFile), { recursive: true });
  const ts = new Date().toISOString();
  appendFileSync(
    rulerFile,
    fresh
      .map((e) => JSON.stringify({ v: 1, ts, plan: e.plan, file, questionId: e.questionId, verdict: e.verdict, confidence: e.confidence }))
      .join("\n") + "\n",
  );
  return fresh.length;
}

// ── scan orchestration ───────────────────────────────────────────────────

/**
 * Run the advisory scan. Returns { exitCode: 0, summary, notes, appended }.
 * `askImpl` is injectable (defaults to the real judge `ask`) so callers and
 * tests can exercise judge-degraded paths without network or keys.
 */
export async function runScan({
  plan,
  files = null,
  gitleaksReport = null,
  askImpl = ask,
  cwd = repoRoot(),
  out = process.stdout,
  err = process.stderr,
  rulerFile = RULER_PATH(),
} = {}) {
  const notes = [];

  // 1. discovery — --files overrides the merge-base diff
  let targets;
  if (files && files.length) {
    targets = files.map((f) => (isAbsolute(f) ? f : resolve(cwd, f)));
  } else {
    const discovered = listChangedFiles({ cwd });
    if (discovered.note) notes.push(discovered.note);
    targets = filterDataDocFiles(discovered.files).map((f) => resolve(cwd, f));
  }
  if (targets.length === 0) notes.push("no changed data/doc files in scope");

  // 2. gitleaks triage — absent by default (owner-removed); report restores it
  let gl = { perFile: new Map(), note: null };
  let gitleaksAbsent = false;
  if (gitleaksReport) {
    gl = parseGitleaksReport(gitleaksReport);
    if (gl.note) notes.push(gl.note);
  } else {
    gitleaksAbsent = true;
    notes.push("gitleaks absent — judge-only advisory report (triage degraded; pass --gitleaks <report> to restore)");
  }

  // 3. per file: build state → questions → chunked asks → ruler
  const summary = [];
  let appended = 0;
  for (const file of targets) {
    const state = buildState(file);
    if (state.skipped) {
      notes.push(`skipped ${basename(file)} (${state.reason})`);
      summary.push({ file, order: "skipped", skipped: true, reason: state.reason, judge: null, gitleaksFindings: [] });
      continue;
    }

    const questions = buildQuestions(file, state);
    const verdicts = [];
    let judgeSkipped = false;
    for (const chunk of chunkQuestions(questions)) {
      const res = await askImpl({ questions: chunk });
      if (res?.skipped) {
        judgeSkipped = true;
        err.write(
          `pii-scan: JUDGE SKIPPED for ${basename(file)} — judge unavailable; NO ruler rows written for this file (advisory pass degraded, exit stays 0)\n`,
        );
        break;
      }
      verdicts.push(...(res.verdict || []));
    }
    const glFindings = gl.perFile.get(basename(file)) || [];
    if (judgeSkipped) {
      summary.push({ file, order: "judge-skipped", skipped: false, judge: { skipped: true }, gitleaksFindings: glFindings });
      continue;
    }

    const flagged = verdicts.filter((v) => v.verdict === "yes").map((v) => v.id);
    appended += appendRuler(
      rulerFile,
      file,
      verdicts.map((v) => ({ plan, questionId: v.id, verdict: v.verdict, confidence: v.confidence })),
    );

    const judgeFlagged = flagged.length > 0;
    const glFlagged = glFindings.length > 0;
    const order = gitleaksAbsent
      ? judgeFlagged
        ? "judge-flagged"
        : "clean"
      : judgeFlagged !== glFlagged
        ? "disagreement"
        : glFlagged
          ? "agree-flagged"
          : "agree-clean";
    summary.push({ file, order, skipped: false, judge: { asked: questions.length, flagged }, gitleaksFindings: glFindings });
  }

  // 4. disagreement-first ordering + report
  const rank = { disagreement: 0, "agree-flagged": 1, "judge-flagged": 1, "agree-clean": 2, clean: 2, "judge-skipped": 3, skipped: 3 };
  summary.sort((a, b) => rank[a.order] - rank[b.order] || String(a.file).localeCompare(String(b.file)));

  out.write(`pii-scan — PII advisory pass (plan ${plan})\n`);
  for (const r of summary) {
    if (r.skipped) {
      out.write(`  [skipped] ${basename(r.file)} — ${r.reason}\n`);
    } else if (r.judge?.skipped) {
      out.write(`  [judge-skipped] ${basename(r.file)} — no verdicts (judge unavailable)\n`);
    } else {
      const glPart = gitleaksAbsent ? "" : `; gitleaks: ${r.gitleaksFindings.length} finding(s)`;
      out.write(`  [${r.order}] ${basename(r.file)} — judge flagged ${r.judge.flagged.length}/${r.judge.asked} speculative categories${glPart}\n`);
    }
  }
  for (const n of notes) err.write(`pii-scan note: ${n}\n`);
  out.write(`ruler: ${rulerFile} (+${appended} rows)\n`);
  err.write("pii-scan: ADVISORY ONLY — this scan never passes or fails a task.\n");
  return { exitCode: 0, summary, notes, appended };
}

// ── CLI ──────────────────────────────────────────────────────────────────

const USAGE = "usage: node scripts/pii-scan.mjs --plan <id> [--files f1,f2] [--gitleaks <report.json>]";

export async function main(argv = process.argv.slice(2)) {
  let plan = null;
  let files = null;
  let gitleaks = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = argv[i + 1];
    if (a === "--plan") plan = val;
    else if (a === "--files") files = (files ? `${files},` : "") + val;
    else if (a === "--gitleaks") gitleaks = val;
    else if (a === "-h" || a === "--help") {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    } else {
      process.stderr.write(`pii-scan: unknown argument ${a}\n${USAGE}\n`);
      return 2;
    }
    if (val !== undefined) i++;
  }
  if (!plan) {
    process.stderr.write(`pii-scan: --plan <id> is required\n${USAGE}\n`);
    return 2;
  }
  const fileList = files ? files.split(",").map((s) => s.trim()).filter(Boolean) : null;
  const res = await runScan({ plan, files: fileList, gitleaksReport: gitleaks });
  return res.exitCode;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main(process.argv.slice(2)).then((code) => (process.exitCode = code));
