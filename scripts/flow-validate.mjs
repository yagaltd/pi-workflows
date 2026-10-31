// flow-validate — validate a flow before it may dispatch (plan 20261025-022).
// Pure JS, zero deps. Returns { ok, errors: [{code, step, message}] }.
// Blocked codes (scripts/flow-schema.mjs BLOCKED_CODES): an invalid flow
// never reaches the dispatcher — loud, per the degradation doctrine.
//
// Usage:
//   node scripts/flow-validate.mjs <flow.json>
// Exit: 0 valid · 1 validation errors · 2 usage | unreadable flow.

import fs from "node:fs";
import { BLOCKED_CODES, GATE_NAMES, QUESTION_KINDS, STEP_KINDS, TIERS } from "./flow-schema.mjs";

const isInt = (n) => Number.isInteger(n) && n >= 1;

function checkStep(flow, s, ids, err) {
  const at = s.id;
  if (typeof s.id !== "string" || !s.id) { err(BLOCKED_CODES.SCHEMA, at, "step.id must be a non-empty string"); return; }
  if (!STEP_KINDS.includes(s.kind)) { err(BLOCKED_CODES.UNKNOWN_KIND, at, `kind must be one of ${STEP_KINDS.join("|")}`); return; }
  if (!Array.isArray(s.depends_on)) s.depends_on = [];
  for (const d of s.depends_on) {
    if (d === s.id) err(BLOCKED_CODES.SELF_EDGE, at, `step depends on itself`);
    else if (!ids.has(d)) err(BLOCKED_CODES.MISSING_REF, at, `depends_on references unknown step "${d}"`);
  }
  if (s.kind === "task") {
    for (const key of ["title", "verify", "model", "thinking", "role"]) {
      if (typeof s[key] !== "string" || !s[key]) { err(BLOCKED_CODES.SCHEMA, at, `task.${key} must be a non-empty string`); }
    }
    if (!TIERS.includes(s.tier)) err(BLOCKED_CODES.SCHEMA, at, `task.tier must be one of ${TIERS.join("|")}`);
    if (!isInt(s.wave)) err(BLOCKED_CODES.SCHEMA, at, `task.wave must be an integer >= 1`);
    if (!Array.isArray(s.allowed) || s.allowed.length === 0) err(BLOCKED_CODES.SCHEMA, at, "task.allowed must be a non-empty array");
    if (typeof s.tdd !== "boolean") err(BLOCKED_CODES.SCHEMA, at, "task.tdd must be boolean");
  } else if (s.kind === "gate") {
    if (!GATE_NAMES.includes(s.gate)) err(BLOCKED_CODES.SCHEMA, at, `gate must be one of ${GATE_NAMES.join("|")}`);
    if (!isInt(s.wave)) err(BLOCKED_CODES.SCHEMA, at, `gate.wave must be an integer >= 1`);
  } else if (s.kind === "transform") {
    if (!isInt(s.wave)) err(BLOCKED_CODES.SCHEMA, at, `transform.wave must be an integer >= 1`);
    if (typeof s.set !== "object" || s.set === null || Array.isArray(s.set)) err(BLOCKED_CODES.SCHEMA, at, "transform.set must be an object");
  } else if (s.kind === "decision") {
    if (!isInt(s.wave)) err(BLOCKED_CODES.SCHEMA, at, `decision.wave must be an integer >= 1`);
    if (!Array.isArray(s.questions) || s.questions.length === 0 || s.questions.length > 64) {
      err(BLOCKED_CODES.SCHEMA, at, "decision.questions must be an array of 1..64");
    } else {
      for (const q of s.questions) {
        if (typeof q.id !== "string" || !q.id) { err(BLOCKED_CODES.SCHEMA, at, "question.id must be a non-empty string"); continue; }
        if (typeof q.prompt !== "string" || !q.prompt) err(BLOCKED_CODES.SCHEMA, at, `question ${q.id}: prompt must be a non-empty string`);
        if (!QUESTION_KINDS.includes(q.kind)) err(BLOCKED_CODES.SCHEMA, at, `question ${q.id}: kind must be one of ${QUESTION_KINDS.join("|")}`);
        if ((q.kind === "choose" || q.kind === "rate") && !(Array.isArray(q.options) && q.options.length > 0) && !(Array.isArray(q.levels) && q.levels.length > 0))
          err(BLOCKED_CODES.SCHEMA, at, `question ${q.id}: ${q.kind} needs options[] or levels[]`);
      }
    }
    if (s.assert !== undefined) {
      const a = s.assert;
      if (typeof a !== "object" || typeof a.question !== "string" || !a.question) err(BLOCKED_CODES.SCHEMA, at, "assert.question must be a non-empty string");
      const has = ["equals", "in", "min_confidence"].some((k) => a[k] !== undefined);
      if (!has) err(BLOCKED_CODES.SCHEMA, at, "assert needs equals | in | min_confidence");
    }
  }
}

export function validateFlow(flow) {
  const errors = [];
  const err = (code, step, message) => errors.push({ code, step, message });
  if (typeof flow !== "object" || flow === null || Array.isArray(flow)) {
    return { ok: false, errors: [{ code: BLOCKED_CODES.SCHEMA, step: null, message: "flow must be an object" }] };
  }
  if (typeof flow.slug !== "string" || !/^[a-z0-9-]+$/.test(flow.slug)) err(BLOCKED_CODES.SCHEMA, null, "flow.slug must be kebab-case");
  if (typeof flow.title !== "string" || !flow.title) err(BLOCKED_CODES.SCHEMA, null, "flow.title must be a non-empty string");
  if (!Array.isArray(flow.steps) || flow.steps.length === 0) {
    return { ok: false, errors: [...errors, { code: BLOCKED_CODES.EMPTY_WAVE, step: null, message: "flow.steps must be a non-empty array" }] };
  }

  const ids = new Set();
  for (const s of flow.steps) {
    if (typeof s.id === "string" && s.id) {
      if (ids.has(s.id)) err(BLOCKED_CODES.DUP_ID, s.id, `duplicate step id`);
      ids.add(s.id);
    }
  }
  for (const s of flow.steps) checkStep(flow, s, ids, err);

  // dependency waves: every dep must sit in a strictly earlier wave
  const byId = new Map(flow.steps.filter((s) => typeof s.id === "string").map((s) => [s.id, s]));
  for (const s of flow.steps) {
    if (!isInt(s.wave)) continue;
    for (const d of s.depends_on ?? []) {
      const dep = byId.get(d);
      if (dep && isInt(dep.wave) && dep.wave >= s.wave) err(BLOCKED_CODES.BAD_DEP_WAVE, s.id, `depends on wave ${dep.wave} step "${d}" but sits in wave ${s.wave}`);
    }
  }

  // cycle detection over depends_on (DFS, iterative)
  const state = new Map();
  const stack = [];
  const visit = (id) => {
    if (state.get(id) === "in-stack") { err(BLOCKED_CODES.CYCLE, id, `cycle through "${id}"`); return; }
    if (state.get(id) === "done") return;
    state.set(id, "in-stack");
    stack.push(id);
    const s = byId.get(id);
    for (const d of s?.depends_on ?? []) if (ids.has(d)) visit(d);
    stack.pop();
    state.set(id, "done");
  };
  for (const s of flow.steps) if (typeof s.id === "string") visit(s.id);

  // waves present without steps
  const waves = new Set(flow.steps.map((s) => s.wave).filter(isInt));
  const maxWave = Math.max(0, ...waves);
  for (let w = 1; w <= maxWave; w++) if (!waves.has(w)) err(BLOCKED_CODES.EMPTY_WAVE, null, `wave ${w} has no steps`);

  return { ok: errors.length === 0, errors };
}

export function computeWaves(flow) {
  const waves = new Set((flow.steps ?? []).map((s) => s.wave).filter((w) => Number.isInteger(w) && w >= 1));
  return [...waves].sort((a, b) => a - b);
}

function main(argv) {
  const file = argv.find((a) => !a.startsWith("--"));
  if (!file) { console.error("usage: node scripts/flow-validate.mjs <flow.json>"); return 2; }
  let flow;
  try { flow = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.error(`flow-validate: unreadable flow: ${e.message}`); return 2; }
  const v = validateFlow(flow);
  if (!v.ok) {
    for (const e of v.errors) console.error(`BLOCKED ${e.code}${e.step ? ` at ${e.step}` : ""}: ${e.message}`);
    return 1;
  }
  console.log(`ok: ${flow.slug} — ${flow.steps.length} step(s), waves ${computeWaves(flow).join(",")}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
