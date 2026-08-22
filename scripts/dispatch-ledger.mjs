#!/usr/bin/env node
/**
 * dispatch-ledger — mechanical telemetry + outcome ledger for pi-core-subagent dispatches.
 *
 * Evidence source: child session JSONLs under ~/.pi/agent/sessions/. A child is any
 * session whose first line carries a `parentSession` field (set by pi-core-subagent's
 * SessionManager.create). This catches worktree (write) children AND read-only children.
 *
 * Usage:
 *   node dispatch-ledger.mjs scan                # backfill/refresh ledger from sessions (idempotent)
 *   node dispatch-ledger.mjs report              # aggregate by model × thinking
 *   node dispatch-ledger.mjs show [pattern]      # list ledger rows matching pattern (task/run/repo)
 *   node dispatch-ledger.mjs annotate <sessionId|run/task> <outcome>
 *                                                # persist a known outcome: ok | misfire:<class> | rejected | failed
 *
 * Files:
 *   ~/.pi/agent/dispatch-ledger.jsonl            # append-only telemetry entries (one per child session)
 *   ~/.pi/agent/dispatch-ledger-outcomes.json    # human/orchestrator outcome overrides (keyed by sessionId)
 *
 * Outcome heuristics (scan):
 *   branch subagents/<run>/<task> exists in the repo → "partial" (failed tasks keep branches)
 *   branch absent → "merged-or-discarded"           (cleanupMerged removes merged branches)
 *   non-worktree child → "unknown"
 * Annotations always win over heuristics.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const SESSIONS_DIR = join(homedir(), ".pi/agent/sessions");
const LEDGER = join(homedir(), ".pi/agent/dispatch-ledger.jsonl");
const OUTCOMES = join(homedir(), ".pi/agent/dispatch-ledger-outcomes.json");

// ── helpers ──────────────────────────────────────────────────────────────────

function loadLedger() {
  const map = new Map();
  if (!existsSync(LEDGER)) return map;
  for (const line of readFileSync(LEDGER, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      map.set(e.sessionId, e);
    } catch {}
  }
  return map;
}

function loadOutcomes() {
  if (!existsSync(OUTCOMES)) return {};
  try { return JSON.parse(readFileSync(OUTCOMES, "utf8")); } catch { return {}; }
}

function saveOutcomes(o) { writeFileSync(OUTCOMES, JSON.stringify(o, null, 2)); }

function summarizeSession(file) {
  let head = null;
  let firstTs = null, lastTs = null;
  const models = new Set();
  let thinking = null, turns = 0, input = 0, output = 0, reasoning = 0, cost = 0;
  let lastRole = null, stopReason = null, name = null;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (!head && (e.type === "session" || e.parentSession)) head = e;
    const ts = e.timestamp || e.ts;
    if (ts) { firstTs ??= ts; lastTs = ts; }
    if (e.type === "model_change" && e.modelId) models.add(e.modelId);
    if (e.type === "thinking_level_change") thinking = e.thinkingLevel ?? e.level ?? e.thinking ?? e.value ?? null;
    if (e.type === "session_info" && e.name) name = e.name.replace(/^subagent:\s*/, "");
    if (e.type === "message") {
      const m = e.message ?? e;
      if (m.role === "assistant") {
        turns++;
        if (m.model) models.add(m.model);
        const u = m.usage ?? {};
        input += u.input ?? 0;
        output += u.output ?? 0;
        reasoning += u.reasoning ?? 0;
        cost += u.cost?.total ?? 0;
        if (m.stopReason) stopReason = m.stopReason;
      }
      lastRole = m.role;
    }
  }
  if (!head) return null;
  const durSec = firstTs && lastTs ? (Date.parse(lastTs) - Date.parse(firstTs)) / 1000 : null;
  return {
    sessionId: head.id ?? file.split("/").pop().replace(/\.jsonl$/, ""),
    name,
    file,
    cwd: head.cwd ?? null,
    parentSession: head.parentSession ?? null,
    startedAt: firstTs,
    durationSec: durSec,
    model: [...models].at(-1) ?? null,
    thinking, turns,
    inputTokens: input, outputTokens: output, reasoningTokens: reasoning,
    cost: Math.round(cost * 10000) / 10000,
    stopReason,
  };
}

function classify(cwd) {
  // worktree child: <repo>/.git/subagents/<run>/<task>
  const m = cwd?.match(/^(.*)\/\.git\/subagents\/([^/]+)\/([^/]+)$/);
  if (m) return { repo: m[1], runId: m[2], taskId: m[3] };
  return { repo: cwd ?? null, runId: null, taskId: null };
}

function branchExists(repo, runId, taskId) {
  try {
    const out = execSync(
      `git -C ${JSON.stringify(repo)} rev-parse --verify --quiet refs/heads/subagents/${runId}/${taskId}`,
      { stdio: ["ignore", "pipe", "ignore"], timeout: 5000 },
    ).toString();
    return out.trim().length > 0;
  } catch { return false; }
}

function outcomeFor(entry, outcomes) {
  const annotated = outcomes[entry.sessionId];
  if (annotated) return annotated;
  if (entry.runId && entry.repo) {
    return branchExists(entry.repo, entry.runId, entry.taskId) ? "partial" : "merged-or-discarded";
  }
  return "unknown";
}

// ── commands ─────────────────────────────────────────────────────────────────

function cmdScan() {
  const ledger = loadLedger();
  const outcomes = loadOutcomes();
  let added = 0, refreshed = 0, skipped = 0;
  const out = [];
  for (const dir of readdirSync(SESSIONS_DIR)) {
    const full = join(SESSIONS_DIR, dir);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (!st.isDirectory()) continue;
    for (const f of readdirSync(full)) {
      if (!f.endsWith(".jsonl")) continue;
      const file = join(full, f);
      let s;
      try { s = summarizeSession(file); } catch { skipped++; continue; }
      if (!s || !s.parentSession) continue; // not a subagent child
      const cls = classify(s.cwd);
      const entry = { v: 1, ...s, ...cls, outcome: null, scannedAt: new Date().toISOString() };
      entry.outcome = outcomeFor(entry, outcomes);
      if (ledger.has(entry.sessionId)) refreshed++;
      else { added++; out.push(JSON.stringify(entry)); }
      ledger.set(entry.sessionId, entry);
    }
  }
  if (out.length) appendFileSync(LEDGER, out.join("\n") + "\n");
  console.log(`scan: ${added} added, ${refreshed} known, ${skipped} unreadable → ${LEDGER}`);
}

function cmdReport() {
  const outcomes = loadOutcomes();
  const ledger = [...loadLedger().values()].map((e) => ({ ...e, outcome: outcomes[e.sessionId] ?? e.outcome }));
  const groups = new Map();
  for (const e of ledger) {
    const key = `${(e.model ?? "?").replace(/.*\//, "")} / ${e.thinking ?? "default"} / ${e.outcome?.startsWith("misfire") ? "misfire" : "ok-ish"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  const med = (xs) => { const s=[...xs].sort((a,b)=>a-b); return s.length? s[Math.floor(s.length/2)] : 0; };
  console.log(`${ledger.length} dispatches on record\n`);
  console.log("model / thinking                      n   outcomes                                turns(med)  cost$   dur(med)");
  for (const [key, es] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    const oc = {};
    for (const e of es) oc[e.outcome] = (oc[e.outcome] ?? 0) + 1;
    const ocS = Object.entries(oc).map(([k, n]) => `${k}:${n}`).join(" ").slice(0, 40);
    const cost = es.reduce((a, e) => a + (e.cost ?? 0), 0);
    console.log(
      `${key.padEnd(38)} ${String(es.length).padStart(3)} ${ocS.padEnd(40)} ${String(med(es.map(e=>e.turns??0))).padStart(10)}  ${cost.toFixed(2).padStart(6)}  ${Math.round(med(es.map(e=>e.durationSec??0))/60)}m`,
    );
  }
  console.log("\noutcome key: ok/misfire:N/rejected/failed = annotated · partial = branch still exists (failed task kept it)");
  console.log("             merged-or-discarded = branch gone · unknown = no annotation, no branch signal");
}

function cmdShow(pattern = "") {
  const outcomes = loadOutcomes();
  const ledger = [...loadLedger().values()]
    .map((e) => ({ ...e, outcome: outcomes[e.sessionId] ?? e.outcome }))
    .sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? ""));
  for (const e of ledger) {
    const hay = `${e.sessionId} ${e.taskId ?? ""} ${e.runId ?? ""} ${e.repo ?? ""} ${e.name ?? ""}`;
    if (pattern && !hay.includes(pattern)) continue;
    const dur = e.durationSec != null ? `${Math.round(e.durationSec / 60)}m` : "?";
    console.log(
      `${(e.startedAt ?? "?").slice(5, 16)}  ${(e.name ?? e.taskId ?? e.sessionId.slice(0, 12)).padEnd(14)} ${(e.outcome ?? "?").padEnd(20)} ${dur.padStart(4)}  ${String(e.turns).padStart(3)}t  $${(e.cost ?? 0).toFixed(3)}  ${(e.repo ?? "").split("/").slice(-1)[0]}`,
    );
  }
}

function cmdAnnotate(key, outcome) {
  const outcomes = loadOutcomes();
  const ledger = loadLedger();
  let matched = 0;
  for (const e of ledger.values()) {
    if (e.sessionId === key || (e.runId && `${e.runId}/${e.taskId}` === key) || (e.taskId ?? "") === key || (e.name ?? "") === key) {
      outcomes[e.sessionId] = outcome;
      matched++;
    }
  }
  if (!matched && ledger.size === 0) { outcomes[key] = outcome; matched = 1; } // pre-register
  saveOutcomes(outcomes);
  console.log(`annotate: ${matched} entr${matched === 1 ? "y" : "ies"} → ${outcome}`);
}

// ── main ─────────────────────────────────────────────────────────────────────
const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case "scan": cmdScan(); break;
  case "report": cmdReport(); break;
  case "show": cmdShow(rest[0] ?? ""); break;
  case "annotate": cmdAnnotate(rest[0], rest[1]); break;
  default:
    console.log("usage: dispatch-ledger.mjs <scan|report|show [pattern]|annotate <key> <outcome>>");
}
