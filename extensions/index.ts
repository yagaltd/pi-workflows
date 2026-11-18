/**
 * pi-workflows extension — mechanical enforcement of the package's own
 * conventions, so the orchestrator prompts can stay lean:
 *
 * 1. `@role:<name>` resolution: subagent tool calls that use
 *    `prompt: "@role:worker"` get the verbatim body of
 *    `agents/<name>.md` substituted at execution time (tool_call event,
 *    mutable input). The leader never reads or pastes role files.
 *
 * 2. Hygiene watchdog (before_agent_start): when `.workflows/plan.md`
 *    shows ✅ tasks lacking the `context:` marker or a final `ok:true`
 *    verdict on file, inject a one-line reminder — drift surfaces at the
 *    moment it happens, not at /review time. Reminds once per new gap
 *    count (no spam).
 *
 * 3. Dispatcher (resolveNext): deterministic /next selection — task
 *    selection (pending ∧ deps-ok ∧ earliest wave; ties by tier then id),
 *    cache-affinity wave ordering (model → thinking → role), context-pack
 *    assembly (shared prefix first, per-task divergence last), and the
 *    gate command list. Pure: plan text, registry map, verdict files and
 *    a spec reader are passed in. /next and /auto-next are thin triggers
 *    over it.
 *
 * 4. Supersede watchdog (before_agent_start): mechanical trigger — a
 *    changed file carries an `adr:`-attributed `@cc` contract, or a
 *    spec's `## Decisions` section changed while no new ADR file exists —
 *    injects ONE advisory line naming the seam. Advisory only: it never
 *    edits, gates, or emits a verdict. The line is static text derived
 *    from the matched `@cc` contract's metadata: `owner:` attributes name
 *    the sign-off targets; with no `owner:` the generic human-gate line is
 *    emitted. Reminds once per new gap (no spam).
 *
 * 5. Auto-gate hook (tool_call): edit/write of code files while a live
 *    `.workflows/plan.md` exists runs the gate chain at write time —
 *    Layer 1 agent-spec (guard boundary, lifecycle scenarios) then Layer 2
 *    tdd-guard (lint/verify on the touched spec) — blocking the write on
 *    violation with the failing layer + command + first findings line.
 *    Toolchain absent ⇒ one-line advisory per file (deduped, watchdog
 *    pattern), write allowed. `*.md` writes outside the spec dirs skip
 *    silently (docs enforcement is the doc-drift gate's scope).
 *
 * 6. Intent-guard suggestion hook (before_agent_start, plan 20261026-030):
 *    user prompts (not `/commands`) under a live plan with tasks get one
 *    judge classification; amend/answer/ask routes inject a suggest-only
 *    routing line and append `.workflows/intent/trail.jsonl`. Proceed and
 *    judge-unavailable stay silent. Never blocks, never rewrites the
 *    prompt, fails open.
 *
 * 7. dispatch_next tool (plan 20261026-036 D1): the dispatcher registered
 *    as a model-callable tool — zero arguments, read-only, inert without a
 *    live plan (structured ok:false, never an error). The execute gathers
 *    the inputs itself (plan text, registry map built internally from
 *    agents/registry.md, verdict files, ctx.cwd) and returns the binding
 *    resolveNext() result plus the wave's eligible members.
 *
 * 8. Verdict automation (plan 20261026-036 D2/D3): a FINAL verdict write
 *    (`.workflows/reviews/<task-id>.md` carrying the `## Verdict` block
 *    with `**ok: true**`/`**ok: false**`) records the proof (proof-ledger)
 *    and the journal (run-journal done|failed) once per task:round
 *    (content-hashed dedupe), and — exactly when the wave's LAST pending
 *    task settles — runs the judge compaction (scripts/judge.mjs ask,
 *    64-cap split) and queues a fixed-size verdict table for injection at
 *    the next before_agent_start; `JUDGE SKIPPED` ⇒ one-sentence per-child
 *    fallback. Absent scripts ⇒ silent skip (documented degradation — the
 *    same class as the auto-gate advisory). Record-only: never blocks a
 *    write, separate registration branch from the auto-gate.
 *
 * 9. TypeLLM judge client + backend-pluggable intake triage (plan
 *    20261117-076 Phase 1): a judge-backend seam ({classify(schema, input)
 *    → verdict}) with the TypeLLM transport as the first implementation
 *    behind it (POST /v1/generate {context, questions} — the majordome
 *    judges.ts contract; key chain TYPELLM_API_KEY env →
 *    ~/.config/pi-majordome/typellm.key). No key / network error /
 *    schema-invalid response ⇒ LOUD skip — never a silent pass. triageFinding(s) classify ship findings into the 071
 *    buckets queued/batched/closed/done, confidence-gated (floor 0.6);
 *    skips and below-floor verdicts stay in the default path. Pure
 *    exports — the ship flow (skills/review) and the bench harness
 *    (scripts/bench-intake-triage.ts) drive them; nothing registers here.
 *
 * 9b. Review verdicts (plan 20261117-076 Phase 2): the Tier-1 first-pass
 *    over the SAME seam — reviewVerdicts judges content-fact scenarios
 *    (report-vs-diff, docs-vs-code, pin validity, claim truthfulness) on
 *    the diff summary, per-scenario pass/fail/uncertain with evidence
 *    quotes; below-floor (<0.6) and backend skips route to Tier 2 loudly
 *    (skippedAll + JUDGE SKIPPED). The reviewer subagent still runs ALWAYS
 *    — the judge never closes a review alone. Harness: bench-intake-triage
 *    verdicts mode (fixture accuracy, per-backend).
 *
 * Deliberately small: role substitution + drift watchdogs + write-time
 * gate. The watchdogs encode the docs/verdict policy checks (see
 * templates/DOCS-POLICY.md — the exemption list there and isDocsExempt
 * here must stay aligned); everything else stays out.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createHash } from "crypto";
import { execSync, spawnSync } from "child_process";


/**
 * @cc [label:substitution,id:role-body] role-body
 * Role body extraction is mechanical and verbatim — strips the leading "# Role:"
 * header and any HTML dispatch-note comment that follows it, returning exact content.
 *
 * Strip the leading "# Role:" header and any HTML dispatch-note comment
 *  that follows it (real role files put the note AFTER the heading, not
 *  before — bug-hunter BH-002). Also drops leading blank lines. */
export function roleBody(content: string): string {
  return content
    .replace(/^#\s*Role:[^\n]*\n+/, "")
    .replace(/^<!--[\s\S]*?-->\s*/, "")
    .replace(/^<!--[\s\S]*?-->\s*/, "")
    .replace(/^\s+/, "")
    .trim();
}

/** Resolve `@role:` refs in a single prompt string. Unknown roles: keep text, collect error. */
export function resolveRefs(
  text: string,
  readFile: (name: string) => string | null
): { text: string; errors: string[] } {
  const errors: string[] = [];
  const resolved = text.replace(/@role:([a-z][a-z0-9-]*)/g, (_full, name) => {
    const content = readFile(name);
    if (content === null) {
      errors.push(`@role:${name} — agents/${name}.md not found`);
      return _full;
    }
    return roleBody(content);
  });
  return { text: resolved, errors };
}

/** Rewrite every prompt-ish field of a subagent tool input in place.
 *  Walks input.prompt and tasks[].prompt directly; returns accumulated
 *  errors (missing role files). */
export function resolveSubagentInput(
  input: any,
  readFile: (name: string) => string | null
): string[] {
  const errors: string[] = [];
  const targets: string[] = [];
  if (input && typeof input === "object") {
    if (typeof input.prompt === "string") targets.push("prompt");
    if (Array.isArray(input.tasks)) {
      input.tasks.forEach((_: unknown, i: number) => {
        if (input.tasks[i] && typeof input.tasks[i].prompt === "string") targets.push(`tasks[${i}].prompt`);
      });
    }
  }
  for (const path of targets) {
    const obj = path === "prompt" ? input : input.tasks[Number(path.match(/\d+/)![0])];
    const f: string = obj.prompt;
    if (!f || !f.includes("@role:")) continue;
    const r = resolveRefs(f, readFile);
    if (r.errors.length) errors.push(...r.errors);
    obj.prompt = r.text;
  }
  return errors;
}

/**
 * @cc [label:watchdog,id:hygiene-drift-counting] hygiene-drift-counting
 * Done-task counts use the status-line pattern ("- **Status**: ✅"), not raw
 * ✅ emoji — raw emoji also appears in prose and inflates counts. Part of the
 * once-per-gap watchdog reminder chain.
 *
 * Hygiene drift between plan.md statuses and the audit trails.
 *  Done tasks are counted by status-line pattern — NOT raw ✅ emoji,
 *  which also appears in prose (headers, notes) and inflates counts. */
export function computeHygieneDrift(
  planContent: string,
  reviewFiles: { name: string; content: string }[]
): { missingContextMarkers: number; missingFinalVerdicts: number } {
  const doneTasks = (planContent.match(/- \*\*Status\*\*:? *✅/g) || []).length;
  // markers appear as bare lines (`context: updated`) or inline bullets
  // (`- **context: updated**`) per the /next closeout step
  const contextMarkers = (planContent.match(/^\s*-?\s*\*{0,2}context: /gm) || []).length;
  const finalOkTrue = reviewFiles.filter((f) => /\*\*ok:\s*true\*\*/.test(f.content)).length;
  return {
    missingContextMarkers: Math.max(0, doneTasks - contextMarkers),
    missingFinalVerdicts: Math.max(0, doneTasks - finalOkTrue),
  };
}

/** Files whose changes never require doc updates (docs/README/CHANGELOG
 *  are the docs themselves; workflow state, CI config, assets, and lock
 *  files are not user-facing behavior). */
export function isDocsExempt(file: string): boolean {
  return (
    file === "" ||
    file === "README.md" ||
    file === "CHANGELOG.md" ||
    file === ".gitignore" ||
    file === "LICENSE" ||
    file.endsWith(".lock") ||
    file === "package-lock.json" ||
    file === "bun.lockb" ||
    file.startsWith("docs/") ||
    file.startsWith(".workflows/") ||
    file.startsWith(".github/") ||
    file.startsWith(".git") ||
    file.startsWith("asset/") ||
    file.startsWith("assets/")
  );
}

export interface DocsDrift {
  /** code files committed after README.md's last commit (plan active) */
  staleReadmeCount: number;
  /** docs/*.md files while code changed since docs/'s last commit */
  staleDocsCount: number;
  /** plan complete (done === total > 0) → SHIP requires a CHANGELOG entry */
  changelogPending: boolean;
}

/** Docs-policy drift, git-based (falls back to zeros without git).
 *  exec runs a shell command in the project cwd and returns trimmed stdout
 *  or null on failure (injected for testability). ref overrides the head
 *  (used by the historical dogfood demo). */
export function computeDocsDrift(
  planContent: string,
  exec: (cmd: string) => string | null,
  listDocs: () => string[],
  ref = "HEAD"
): DocsDrift {
  const done = (planContent.match(/- \*\*Status\*\*:? *✅/g) || []).length;
  const total = (planContent.match(/- \*\*Status\*\*:/g) || []).length;
  const changelogPending = total > 0 && done === total;

  const codeChangedSince = (fromRef: string): number => {
    const out = exec(`git diff --name-only ${fromRef}..${ref}`);
    if (out === null || out === "") return 0;
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter((f) => !isDocsExempt(f)).length;
  };

  // README freshness: code committed after README's last commit,
  // while the plan is executing (at least one ✅).
  let staleReadmeCount = 0;
  const readmeCommit = exec(`git log -1 --format=%H ${ref} -- README.md`);
  if (readmeCommit && done > 0) {
    staleReadmeCount = codeChangedSince(readmeCommit);
  }

  // docs/ folder freshness: docs exist + code changed since docs/'s
  // last commit → all docs are potentially stale (coarse, reminder-grade).
  let staleDocsCount = 0;
  const docs = listDocs();
  if (docs.length > 0 && done > 0) {
    const lastDocsCommit = exec(`git log -1 --format=%H ${ref} -- docs`);
    if (lastDocsCommit && codeChangedSince(lastDocsCommit) > 0) {
      staleDocsCount = docs.length;
    }
  }

  return { staleReadmeCount, staleDocsCount, changelogPending };
}

/* ----------------------------- dispatcher (resolveNext) ----------------------------- */

/**
 * @cc [label:dispatcher,id:resolve-next-pure] resolve-next-pure
 * resolveNext is a pure selection function: plan text, registry map,
 * verdict files and a spec reader are passed in — no fs/git access here.
 * Blocked results are data, never dispatches: stale status (✅ without a
 * verdict on file) and missing specs must surface as {ok:false} before
 * any subagent call can be built.
 */

export type TaskStatus = "pending" | "done" | "failed";

/** One task parsed from a plan.md Tasks section (data only — no policy). */
export interface PlanTask {
  /** normalized id, e.g. "task-1" — the contract/review file base name */
  id: string;
  /** task number from the "### TASK <num>" header */
  num: string;
  goal: string;
  /** tier letter read verbatim from the header "(Tier B, …)" — A < B < C
   *  (registry.md: the planner assigns it, the dispatcher reads it verbatim) */
  tier: string;
  /** bottleneck-tag remainder of the header meta ("", "🟡", …) */
  tag: string;
  status: TaskStatus;
  wave: number;
  /** dependency ids, e.g. ["task-1"]; empty when none */
  deps: string[];
  /** plan `tdd:` flag — routes agent-spec's tdd-guard layer into gateCommands */
  tdd: boolean;
  /** [PARALLEL-GROUP: name] the task block sits under, null when unmarked */
  parallelGroup: string | null;
  allowed: string[];
  verify: string;
  contractPath: string;
}

/** Dispatch policy for one task — from the caller's registry map
 *  (agents/registry.md policy applied to the plan's tier + bottleneck tag). */
export interface DispatchPolicy {
  model: string;
  thinking: string;
  role: string;
}

/** Plan data merged with its registry policy — the dispatcher's unit of work. */
export interface DispatchTask extends PlanTask, DispatchPolicy {}

/** Plan header provenance — the shared prefix block of every pack. */
export interface PlanProvenance {
  planId: string;
  title: string;
  status: string;
  env: string;
  deadEnds: string;
}

export interface NextInput {
  /** plan.md content */
  plan: string;
  /** registry map: task id → dispatch policy (model/thinking/role per
   *  agents/registry.md); a selected task without an entry is blocked,
 *  never guessed */
  registry: Record<string, DispatchPolicy>;
  /** verdict files (.workflows/reviews/*.md) for the staleness check */
  reviewFiles: { name: string; content: string }[];
  /** injected spec reader — null means the contract is missing */
  readSpec: (contractPath: string) => string | null;
  /** repo root for the GUARD line (pack provenance only) */
  repo?: string;
}

export type NextResult =
  | { ok: true; task: DispatchTask; pack: string; gateCommands: string[] }
  | { ok: false; blocked: string; reason: string };

const STATUS_MARKS: Record<string, TaskStatus> = {
  "⬜": "pending",
  "✅": "done",
  "❌": "failed",
};

const TIER_RANK: Record<string, number> = { A: 0, B: 1, C: 2 };

const THINKING_RANK: Record<string, number> = {
  off: 0,
  low: 1,
  medium: 2,
  high: 3,
  xhigh: 4,
};

/** Label bullets of a TASK body: `- **Label**: value` (canonical, colon
 *  outside bold). The dispatcher also tolerates `- **Label:** value`
 *  (colon inside bold) so legacy plans parse identically. Bare-text
 *  bullets (no bold) are not field bullets and stay unparsed. */
export function parseTaskBullets(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /^[-*]\s*\*\*([^*]+?):?\*\*:?\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) out[m[1].trim()] = m[2].trim();
  return out;
}

/** Parse a plan.md Tasks section into data-only tasks. Field bullets are
 *  optional and default conservatively (status ⬜, wave 1, no deps). */
export function parsePlan(plan: string): PlanTask[] {
  const tasks: PlanTask[] = [];
  const headerRe = /^###\s+TASK\s+(\d+)\s*\(([^)]*)\):\s*(.+)$/gm;
  const groupRe = /\[PARALLEL-GROUP:\s*([^\]]+)\]/;
  let prevEnd = 0; // end of the previous header line — segments between
  let group: string | null = null; // headers carry [PARALLEL-GROUP] markers
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(plan)) !== null) {
    const g = groupRe.exec(plan.slice(prevEnd, m.index));
    if (g) group = g[1].trim();
    const rest = plan.slice(m.index + m[0].length);
    // block ends at the next task header or the next ## section
    const nextTask = rest.search(/^###\s+TASK\s+\d+/m);
    const nextSection = rest.search(/^## /m);
    const ends = [nextTask, nextSection].filter((i) => i >= 0);
    const body = rest.slice(0, ends.length ? Math.min(...ends) : rest.length);
    prevEnd = m.index + m[0].length;

    const bullets = parseTaskBullets(body);
    const statusMark = bullets["Status"]?.[0];
    const depsRaw = bullets["Depends On"];
    const waveRaw = bullets["Wave"];
    const allowedRaw = bullets["Allowed"];
    const num = m[1];
    tasks.push({
      id: `task-${num}`,
      num,
      goal: m[3].trim(),
      tier: /Tier\s*([A-C])/i.exec(m[2])?.[1]?.toUpperCase() ?? "",
      tag: m[2].replace(/Tier\s*[A-C]\s*,?\s*/i, "").trim(),
      status: (statusMark && STATUS_MARKS[statusMark]) || "pending",
      wave: waveRaw ? parseInt(/\d+/.exec(waveRaw)?.[0] ?? "1", 10) || 1 : 1,
      deps:
        depsRaw && !/^none$/i.test(depsRaw)
          ? Array.from(depsRaw.matchAll(/TASK\s+(\d+)/gi), (d) => `task-${d[1]}`)
          : [],
      tdd: /^true$/i.test(bullets["tdd"] ?? ""),
      parallelGroup: group,
      allowed: allowedRaw
        ? allowedRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      verify: bullets["Verify"] ?? "",
      contractPath: `.workflows/specs/task-${num}.spec`,
    });
  }
  return tasks;
}

/** Parse the plan header blockquotes — pack provenance. env/dead-ends are
 *  optional (`> env:` / `> dead-ends:` lines); the rest default empty. */
export function parseProvenance(plan: string): PlanProvenance {
  const grab = (label: string): string =>
    new RegExp(`^>\\s*${label}:\\s*(.+)$`, "m").exec(plan)?.[1].trim() ?? "";
  return {
    planId: grab("Plan ID"),
    title: /^#\s*Plan:\s*(.+)$/m.exec(plan)?.[1].trim() ?? "",
    status: grab("Status"),
    env: grab("env"),
    deadEnds: grab("dead-ends"),
  };
}

/** ok:true verdict on file for a task — a reviews file named for the task
 *  (task-1, not task-10) whose content carries the **ok: true** marker. */
export function verdictOnFile(
  taskId: string,
  reviewFiles: { name: string; content: string }[]
): boolean {
  const nameRe = new RegExp(`(^|[^0-9])${taskId}($|[^0-9])`);
  return reviewFiles.some(
    (f) => nameRe.test(f.name) && /\*\*ok:\s*true\*\*/.test(f.content)
  );
}

/** Cache-affinity wave ordering: sort by (model, thinking, role) so
 *  same-model/same-role dispatches are adjacent (prompt-cache prefix
 *  reuse); id breaks ties for determinism. Same-model launches ramp
 *  sequentially because equal models end up in contiguous runs. */
export function orderWave<
  T extends { id: string; model: string; thinking: string; role: string }
>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    if (a.model !== b.model) return a.model < b.model ? -1 : 1;
    const ta = THINKING_RANK[a.thinking] ?? 99;
    const tb = THINKING_RANK[b.thinking] ?? 99;
    if (ta !== tb) return ta - tb;
    if (a.role !== b.role) return a.role < b.role ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Selection mechanics shared by resolveNext and the thin prompts: pending
 *  tasks in the earliest wave with satisfied (and non-stale) dependencies,
 *  in cache-affinity order — or the blocker that explains the empty wave. */
export function eligibleTasks(input: NextInput): {
  eligible: DispatchTask[];
  blocked: { blocked: string; reason: string } | null;
} {
  const tasks: DispatchTask[] = parsePlan(input.plan).map((t) => {
    const policy = input.registry[t.id];
    return {
      ...t,
      model: policy?.model ?? "",
      thinking: policy?.thinking ?? "",
      role: policy?.role ?? "",
    };
  });
  if (tasks.length === 0)
    return {
      eligible: [],
      blocked: {
        blocked: "no-tasks",
        reason: "plan.md defines no TASK blocks — nothing to dispatch",
      },
    };
  const pending = tasks.filter((t) => t.status === "pending");
  if (pending.length === 0)
    return {
      eligible: [],
      blocked: {
        blocked: "no-pending",
        reason: "no ⬜ PENDING tasks remain — the plan is complete or failed",
      },
    };
  const minWave = Math.min(...pending.map((t) => t.wave));
  const waveTasks = pending.filter((t) => t.wave === minWave);
  // Integrity first: a stale ✅ dependency is a data gap, not a delay.
  for (const t of waveTasks) {
    for (const depId of t.deps) {
      const dep = tasks.find((x) => x.id === depId);
      if (dep && dep.status === "done" && !verdictOnFile(depId, input.reviewFiles)) {
        return {
          eligible: [],
          blocked: {
            blocked: "stale-status",
            reason: `TASK ${dep.num} is marked ✅ DONE but no ok:true verdict is on file (.workflows/reviews/${depId}.md) — reconcile before dispatching TASK ${t.num}`,
          },
        };
      }
    }
  }
  const eligible = waveTasks.filter((t) =>
    t.deps.every((depId) => tasks.find((x) => x.id === depId)?.status === "done")
  );
  if (eligible.length === 0) {
    const t = waveTasks[0];
    const depId = t.deps.find(
      (d) => tasks.find((x) => x.id === d)?.status !== "done"
    );
    const dep = depId ? tasks.find((x) => x.id === depId) : undefined;
    const depName = dep ? `TASK ${dep.num}` : depId ?? "?";
    const why = !dep
      ? `${depName} is not defined in the plan`
      : dep.status === "failed"
        ? `it is ❌ FAILED (unfinished)`
        : `it is ⬜ PENDING (unfinished)`;
    return {
      eligible: [],
      blocked: {
        blocked: "deps-unsatisfied",
        reason: `TASK ${t.num} depends on ${depName} — ${why}`,
      },
    };
  }
  return { eligible: orderWave(eligible), blocked: null };
}

/** Assemble the dispatch pack: shared prefix block first (GUARD line, plan
 *  provenance, env law, dead ends), per-task divergence last (TASK line,
 *  goal, Allowed paths, Verify line). The prefix is byte-identical across
 *  tasks of the same plan — that is the cache-affinity contract. */
export function buildPack(
  task: DispatchTask,
  prov: PlanProvenance,
  repo: string
): string {
  const lines = [
    // Keep the glob out of a literal slash-star-star so cc-check's scanner
    // does not read it as a doc comment: ${"**"} renders the same pack line.
    `Repo: ${repo} (GUARD: verify pwd + git toplevel — toplevel = repo root OR a <repo>/.git/subagents/${"**"} worktree).`,
    `Plan: ${prov.planId} — ${prov.title} (${prov.status})`,
  ];
  if (prov.env) lines.push(`Env: ${prov.env}`);
  if (prov.deadEnds) lines.push(`Dead ends: ${prov.deadEnds}`);
  lines.push(
    "",
    `TASK ${task.num}: ${task.goal}. Contract: ${task.contractPath} (first read — the workflow is in your role prompt).`,
    `Allowed paths: ${task.allowed.length ? task.allowed.join(", ") : "(none declared)"}`,
    `Verify: ${task.verify || "(none declared — run the project test suite)"}`
  );
  return lines.join("\n");
}

/** @cc [label:gate,id:gate-commands-name-real-tools] gate-commands-name-real-tools
 *  Gate commands name tools that exist — contract lifecycle, then the plan's
 *  Verify line. A task flagged `tdd:` runs the lifecycle with agent-spec's
 *  tdd-guard layer enabled — one real chain, no separate test-quality binary.
 *  The `tdd:` flag renders
 *  `agent-spec lifecycle <spec> --code . --layers lint,boundary,test,tdd-guard`
 *  and never emits a standalone test-quality binary. An absent tdd-guard stays
 *  agent-spec's loud SKIP, never a pass.
 */
export function gateCommandsFor(task: DispatchTask): string[] {
  const layers = task.tdd ? " --layers lint,boundary,test,tdd-guard" : "";
  const cmds = [`agent-spec lifecycle ${task.contractPath} --code .${layers}`];
  if (task.verify) cmds.push(task.verify);
  return cmds;
}

/** Deterministic /next: select the next eligible task (pending ∧ deps-ok ∧
 *  earliest wave; ties by tier A<B<C then id), assemble its pack and gate
 *  commands — or return the blocker. Never dispatches, never guesses: a
 *  selected task without a registry policy or with a missing spec is a
 *  blocked result, not a specless/policyless dispatch. */
export function resolveNext(input: NextInput): NextResult {
  const { eligible, blocked } = eligibleTasks(input);
  if (blocked) return { ok: false, blocked: blocked.blocked, reason: blocked.reason };
  const task = [...eligible].sort((a, b) => {
    const ra = TIER_RANK[a.tier] ?? 9;
    const rb = TIER_RANK[b.tier] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  })[0];
  if (!task.model || !task.thinking || !task.role) {
    return {
      ok: false,
      blocked: "no-policy",
      reason: `TASK ${task.num} (${task.id}) has no registry entry (model/thinking/role) — add it per agents/registry.md before dispatching`,
    };
  }
  if (input.readSpec(task.contractPath) === null) {
    return {
      ok: false,
      blocked: "missing-spec",
      reason: `${task.contractPath} not found for TASK ${task.num} — write or restore the contract; never dispatch specless`,
    };
  }
  return {
    ok: true,
    task,
    pack: buildPack(task, parseProvenance(input.plan), input.repo ?? ""),
    gateCommands: gateCommandsFor(task),
  };
}

/* ---------------------- dispatch_next tool (plan 20261026-036) ---------------------- */

/**
 * @cc [label:dispatcher,id:registry-policy-table] registry-policy-table
 * The registry map is built from agents/registry.md, never caller-supplied:
 * the task's bottleneck-tag row (the per-task policy table) wins, else its
 * tier bullet (the tier overlay); a task matching neither gets NO entry —
 * the dispatcher blocks it as no-policy rather than guessing model/thinking.
 */
export interface PolicyRow {
  model: string;
  thinking: string;
}

/** Parse the dispatch-policy rows of agents/registry.md: per-task tag rows
 *  from the policy table (e.g. `| 🟡 RISKY | B | ... | high |`) keyed by the
 *  row's emoji, and tier-overlay bullets (e.g. `- **A** → ... + thinking low`)
 *  keyed by tier. Markdown-shaped, column-count tolerant; rows without an
 *  emoji tag or a resolvable model+thinking pair are ignored (the Roles
 *  table and prose fall out naturally). */
export function parseRegistryPolicy(text: string): {
  byTag: Record<string, PolicyRow>;
  byTier: Record<string, PolicyRow>;
} {
  const byTag: Record<string, PolicyRow> = {};
  const byTier: Record<string, PolicyRow> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("|")) {
      const cells = line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
      if (cells.length < 4) continue;
      if (/^:?-{2,}:?$/.test(cells[0]) || /^bottleneck$/i.test(cells[0])) continue;
      const tag = /\p{Extended_Pictographic}/u.exec(cells[0])?.[0];
      const model = cells[2].replace(/`/g, "").trim();
      const thinking = cells[3].replace(/`/g, "").trim().split(/\s+/)[0];
      if (tag && model && thinking) byTag[tag] = { model, thinking };
      continue;
    }
    const tier = /^[-*]\s*\*\*([A-C])\*\*\s*→/.exec(line)?.[1];
    if (tier) {
      const model = /@model:[\w./-]+/.exec(line)?.[0];
      const thinking = /\bthinking\s+(off|low|medium|high|xhigh)\b/.exec(line)?.[1];
      if (model && thinking) byTier[tier] = { model, thinking };
    }
  }
  return { byTag, byTier };
}

/** Registry map for a plan's tasks, built from the agents/registry.md text:
 *  the task's bottleneck-tag row first, its tier bullet as fallback; role is
 *  `worker` for build tasks. Tasks with no matching row get no entry —
 *  resolveNext blocks them as no-policy (never guessed). */
export function buildRegistry(
  registryText: string,
  tasks: PlanTask[],
  role = "worker"
): Record<string, DispatchPolicy> {
  const { byTag, byTier } = parseRegistryPolicy(registryText);
  const map: Record<string, DispatchPolicy> = {};
  for (const t of tasks) {
    const row = (t.tag && byTag[t.tag]) || (t.tier && byTier[t.tier]);
    if (row) map[t.id] = { model: row.model, thinking: row.thinking, role };
  }
  return map;
}

/** The dispatch_next tool payload: the dispatcher result plus the wave's
 *  eligible members for the parallelism check ([] when blocked). */
export type DispatchNextResult = NextResult & { eligible: DispatchTask[] };

/** Gather the dispatcher inputs from the repo at cwd and resolve the next
 *  task — the tool's execute, fs at the edges only. READ-ONLY: plan,
 *  registry, verdict files and specs are read, never written. Inert without
 *  a live plan: a structured ok:false (no-plan), not an error. */
export function dispatchNext(opts: { cwd: string }): DispatchNextResult {
  const readText = (p: string): string | null => {
    try {
      return fs.readFileSync(p, "utf8");
    } catch {
      return null;
    }
  };
  const plan = readText(path.join(opts.cwd, ".workflows", "plan.md"));
  if (plan === null) {
    return {
      ok: false,
      blocked: "no-plan",
      reason: ".workflows/plan.md not found — nothing to dispatch (write a plan with /plan first)",
      eligible: [],
    };
  }
  const registry = buildRegistry(
    readText(path.join(opts.cwd, "agents", "registry.md")) ?? "",
    parsePlan(plan)
  );
  const reviewsDir = path.join(opts.cwd, ".workflows", "reviews");
  const reviewFiles: { name: string; content: string }[] = fs.existsSync(reviewsDir)
    ? fs
        .readdirSync(reviewsDir)
        .filter((f) => f.endsWith(".md"))
        .map((f) => ({ name: f, content: readText(path.join(reviewsDir, f)) ?? "" }))
    : [];
  const input: NextInput = {
    plan,
    registry,
    reviewFiles,
    readSpec: (p: string): string | null => readText(path.join(opts.cwd, p)),
    repo: opts.cwd,
  };
  const result = resolveNext(input);
  const eligible = result.ok ? eligibleTasks(input).eligible : [];
  return { ...result, eligible };
}

/* ------------------ verdict automation (plan 20261026-036 D2/D3) ------------------ */

/**
 * @cc [label:hook,id:verdict-automation] verdict-automation
 * The verdict branch is record-only: it never blocks a write, never edits
 * files, never emits a gate verdict — it spawns the record CLIs (proof-ledger,
 * run-journal) once per task:round and the wave-settle compaction once per
 * settled wave, then queues a fixed-size injection for the next
 * before_agent_start. Absent scripts are documented degradation: skip
 * silently (the same class as the auto-gate advisory — the hooks are
 * optional tooling).
 *
 * Parse a repo-relative write into a FINAL verdict trigger: a
 * `.workflows/reviews/<task-id>.md` path whose content carries the
 * `## Verdict` block with a `**ok: true**` / `**ok: false**` marker.
 * Notes, partial reviews, and other paths are null. */
export function parseVerdictWrite(
  file: string,
  content: string
): { taskId: string; ok: boolean } | null {
  const m = /^\.workflows\/reviews\/(task-\d+)\.md$/.exec(file);
  if (!m) return null;
  if (!/^##\s*Verdict\b/m.test(content)) return null;
  const ok = /\*\*ok:\s*(true|false)\*\*/.exec(content);
  if (!ok) return null;
  return { taskId: m[1], ok: ok[1] === "true" };
}

/** A settled wave child — the compaction question set's unit. */
export interface WaveChild {
  id: string;
  goal: string;
  ok: boolean;
}

/** The children of `wave`, or null while ANY task of the wave still lacks a
 *  FINAL verdict on file (the "last pending settles" rule — mechanical,
 *  independent of the plan's status marks, which may lag the verdict
 *  write). Single-task waves settle on their own verdict. */
export function waveSettledChildren(
  tasks: PlanTask[],
  wave: number,
  reviewFiles: { name: string; content: string }[]
): WaveChild[] | null {
  const inWave = tasks.filter((t) => t.wave === wave);
  if (inWave.length === 0) return null;
  const children: WaveChild[] = [];
  for (const t of inWave) {
    const f = reviewFiles.find((r) => r.name === `${t.id}.md`);
    if (!f) return null;
    const v = parseVerdictWrite(`.workflows/reviews/${f.name}`, f.content);
    if (v === null) return null;
    children.push({ id: t.id, goal: t.goal, ok: v.ok });
  }
  return children;
}

/** A judge question row — {id, question, schema} per scripts/judge.mjs. */
export interface JudgeQuestion {
  id: string;
  question: string;
  schema: { enum: string[] };
}

/** Question set for the settled children — outcome, blockers, deviations,
 *  cost bucket (four rows per child, per D3). The child's mechanical facts
 *  ride in the question text: the judge compresses, it does not discover. */
export function buildWaveQuestions(children: WaveChild[]): JudgeQuestion[] {
  const qs: JudgeQuestion[] = [];
  for (const c of children) {
    const fact = `${c.id} (${c.goal}) settled with final verdict ok:${c.ok}`;
    qs.push({
      id: `${c.id}-outcome`,
      question: `${fact}. Was the outcome ok?`,
      schema: { enum: ["yes", "no"] },
    });
    qs.push({
      id: `${c.id}-blockers`,
      question: `${fact}. Does it have unresolved blockers?`,
      schema: { enum: ["yes", "no"] },
    });
    qs.push({
      id: `${c.id}-deviations`,
      question: `${fact}. Did it deviate from its contract?`,
      schema: { enum: ["yes", "no"] },
    });
    qs.push({
      id: `${c.id}-cost`,
      question: `${fact}. Is its cost bucket low, medium, or high?`,
      schema: { enum: ["low", "medium", "high"] },
    });
  }
  return qs;
}

/** Honor the judge's 64-question cap per call: ordered chunks, none dropped. */
export function splitQuestions(qs: JudgeQuestion[], cap = 64): JudgeQuestion[][] {
  const out: JudgeQuestion[][] = [];
  for (let i = 0; i < qs.length; i += cap) out.push(qs.slice(i, i + cap));
  return out;
}

/** Parse judge ask stdout into verdict rows; null when not a JSON array. */
export function parseJudgeRows(
  stdout: string
): { id: string; verdict: string }[] | null {
  try {
    const j = JSON.parse(stdout);
    if (!Array.isArray(j)) return null;
    return j.filter((r: any) => r && typeof r.id === "string");
  } catch {
    return null;
  }
}

/** Fixed-size verdict table: one row per child, four bounded columns — no
 *  free text, length bounded by the children count. */
export function verdictTable(
  wave: number,
  children: WaveChild[],
  rows: { id: string; verdict: string }[]
): string {
  const byId = new Map(rows.map((r) => [r.id, String(r.verdict)]));
  const cell = (c: WaveChild, dim: string): string => byId.get(`${c.id}-${dim}`) ?? "?";
  return [
    `[pi-workflows wave-settle] wave ${wave} settled (${children.length} child/children) — compaction verdict table:`,
    "| child | outcome | blockers | deviations | cost |",
    "| --- | --- | --- | --- | --- |",
    ...children.map(
      (c) =>
        `| ${c.id} | ${cell(c, "outcome")} | ${cell(c, "blockers")} | ${cell(c, "deviations")} | ${cell(c, "cost")} |`
    ),
  ].join("\n");
}

/** JUDGE SKIPPED fallback — one sentence per child, from the mechanical
 *  facts only. Never silence: the wave settle is always surfaced. */
export function fallbackNote(wave: number, children: WaveChild[]): string {
  return [
    `[pi-workflows wave-settle] wave ${wave} settled (${children.length} child/children) — judge unavailable, per-child summary:`,
    ...children.map((c) => `- ${c.id} (${c.goal}): final verdict ok:${c.ok}.`),
  ].join("\n");
}

/** The record CLIs' argv (pure): proof-ledger record always carries the
 *  plan id, task id, Verify command and spec path (a failing verifier is
 *  still recorded data); run-journal records done|failed. Cost is omitted —
 *  child usage is not available on the write event. */
export function recordArgvs(opts: {
  planId: string;
  taskId: string;
  verify: string;
  contractPath: string;
  ok: boolean;
}): { proof: string[]; journal: string[] } {
  return {
    proof: [
      "record",
      "--plan",
      opts.planId,
      "--task",
      opts.taskId,
      "--verify",
      opts.verify,
      "--spec",
      opts.contractPath,
    ],
    journal: [
      "record",
      "--plan",
      opts.planId,
      "--task",
      opts.taskId,
      "--event",
      opts.ok ? "done" : "failed",
    ],
  };
}

/* ------------------- supersede watchdog (advisory only) ------------------- */

export interface AdrContract {
  id: string;
  label: string;
  adr: string;
  owners: string[];
}

/** Extract `@cc` directives that carry an `adr:` attribute from file text.
 *  Textual fallback used when `cc-check` is not installed. */
export function parseAdrContracts(text: string): AdrContract[] {
  const out: AdrContract[] = [];
  const re = /@cc\s+\[([^\]]*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const attrs = m[1];
    const adr = /(?:^|[,\s])adr:([^,\s\]]+)/.exec(attrs)?.[1];
    if (!adr) continue;
    const id = /(?:^|[,\s])id:([^,\s\]]+)/.exec(attrs)?.[1] ?? "?";
    const label = /(?:^|[,\s])label:([^,\s\]]+)/.exec(attrs)?.[1] ?? "";
    const owners = Array.from(
      attrs.matchAll(/(?:^|[,\s])owner:([^,\s\]]+)/g),
      (m) => m[1]
    );
    out.push({ id, label, adr, owners });
  }
  return out;
}

/** Parse `cc-check list` stdout into adr-attributed contracts — the primary
 *  source when the binary is installed; `parseAdrContracts` is the fallback. */
export function parseCcCheckList(output: string): AdrContract[] {
  const out: AdrContract[] = [];
  for (const block of output.split(/^◆\s*/m).slice(1)) {
    const adr = /adr:([^\s·]+)/.exec(block)?.[1];
    if (!adr) continue;
    const id = /id:([^\s·]+)/.exec(block)?.[1] ?? "?";
    const label = /label:([^\s·]+)/.exec(block)?.[1] ?? "";
    const owners = Array.from(block.matchAll(/owner:([^\s·]+)/g), (m) => m[1]);
    out.push({ id, label, adr, owners });
  }
  return out;
}

export interface SupersedeGap {
  seam: string;
  trigger: "adr-contract-file" | "decisions-changed";
  adr?: string;
  owners?: string[];
}

/** The supersede trigger — pure mechanics, no model. Fires when (a) a changed
 *  file carries an adr:-attributed contract, or (b) a spec's Decisions section
 *  changed while no new ADR file exists. Never edits, never blocks. */
export function detectSupersedeGaps(opts: {
  changedFiles: string[];
  adrContractsByFile: Record<string, AdrContract[]>;
  changedSpecDecisions: string[];
  newAdrFiles: string[];
}): SupersedeGap[] {
  const gaps: SupersedeGap[] = [];
  for (const file of opts.changedFiles) {
    for (const c of opts.adrContractsByFile[file] || []) {
      gaps.push({
        seam: `${file} (${c.id})`,
        trigger: "adr-contract-file",
        adr: c.adr,
        owners: c.owners,
      });
    }
  }
  if (opts.newAdrFiles.length === 0) {
    for (const spec of opts.changedSpecDecisions) {
      gaps.push({ seam: `${spec} (Decisions changed)`, trigger: "decisions-changed" });
    }
  }
  return gaps;
}

/** Extract a spec's `## Decisions` body — the watchdog compares it against HEAD. */
export function extractDecisionsSection(specText: string): string {
  const m = /(?:^|\n)## Decisions\b([\s\S]*?)(?=\n## |\s*$)/.exec(specText);
  return m ? m[1].trim() : "";
}

/** @cc [label:watchdog,id:supersede-advisory-only] supersede-advisory-only
 *  The supersede watchdog is advisory-only: it never edits files, never blocks
 *  dispatch, and never emits a verdict — at most one line per new gap
 *  (watchdog-remind-once), routing to the human gate only.
 *
 * The line is static text derived from contract metadata only: `owner:`
 *  attributes name the sign-off targets; without them the generic human-gate
 *  line is emitted. Routing only — never a verdict. */
function supersedeAdvisoryLine(gap: SupersedeGap): string {
  const base = `[pi-workflows supersede] ${gap.seam} (${gap.trigger}${
    gap.adr ? `, adr:${gap.adr}` : ""
  })`;
  if (gap.owners && gap.owners.length > 0) {
    return `${base} — possible ADR supersession — sign-off required from ${gap.owners.join(
      ", "
    )} at the human gate (advisory only).`;
  }
  return `${base} — static advisory: possible ADR supersession — raise it at the human gate (advisory only).`;
}

/** Remind-once gate shared by the watchdogs (contract watchdog-remind-once):
 *  returns true only for a NEW non-empty gap state; an empty key resets. */
export function makeRemindOnce(): (key: string) => boolean {
  let last = "";
  return (key: string): boolean => {
    if (key === "") {
      last = "";
      return false;
    }
    if (key === last) return false;
    last = key;
    return true;
  };
}

/* ---------------------- auto-gate hook (write time) ---------------------- */

/** Captured gate-command result. `code` is the exit status; `stdout`/`stderr`
 *  are the raw streams the layer verdict is parsed from (guard prints its
 *  findings on stderr; lifecycle JSON comes on stdout). */
export type GateRunResult = { code: number; stdout: string; stderr: string };

/** Injected gate runner. `null` = the command could not run (binary missing,
 *  timed out) — routes to the advisory path, never to a block (D5). */
export type GateRunner = (cmd: string, args: string[]) => GateRunResult | null;

/** No-shell gate runner — runCapture's sibling (argument arrays, filenames are
 *  data, never interpolated shell syntax). Returns exit code + both streams,
 *  or null when the binary could not run (missing toolchain, timeout) — null
 *  is the D5 advisory path, never a block.
 *
 *  `env: process.env` is pinned explicitly: under Bun, spawnSync resolves the
 *  executable and the child environment from the process-STARTUP snapshot when
 *  `env` is omitted, silently ignoring later PATH mutations (PATH-shimmed
 *  subagent contexts would run a different agent-spec than the one on the
 *  effective PATH). Pinning the live env restores Node's documented default on
 *  every runtime. */
export function runGate(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs = 10000
): GateRunResult | null {
  try {
    const r = spawnSync(cmd, args, {
      cwd,
      encoding: "utf8",
      timeout: timeoutMs,
      env: process.env,
    });
    if (r.error) return null;
    return {
      code: r.status ?? 1,
      stdout: typeof r.stdout === "string" ? r.stdout.trim() : "",
      stderr: typeof r.stderr === "string" ? r.stderr.trim() : "",
    };
  } catch {
    return null;
  }
}

/** Resolve a tool-call path against the project root; null when the file is
 *  outside the repo (never the gate's business). Returns posix separators. */
export function toRepoRelative(root: string, filePath: string): string | null {
  try {
    const abs = path.isAbsolute(filePath) ? filePath : path.resolve(root, filePath);
    const rel = path.relative(root, abs);
    if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return null;
    return rel.split(path.sep).join("/");
  } catch {
    return null;
  }
}

/** Does `file` fall under one Allowed Changes entry? Supported shapes: exact
 *  path ("extensions/index.ts"), dir glob ("src/**", "docs/*"), and suffix
 *  glob ("*.spec") — the shapes plans actually declare. */
export function matchesAllowed(file: string, allowed: string[]): boolean {
  for (const raw of allowed) {
    const pat = raw.trim();
    if (pat === "") continue;
    if (!pat.includes("*")) {
      if (file === pat) return true;
      continue;
    }
    const prefix = pat.slice(0, pat.indexOf("*"));
    const suffix = pat.slice(pat.lastIndexOf("*") + 1);
    if (
      file.startsWith(prefix) &&
      file.endsWith(suffix) &&
      file.length >= prefix.length + suffix.length
    )
      return true;
  }
  return false;
}

/** First human-readable findings line from gate output: a bold scenario
 *  marker (lifecycle failure_summary names the failing scenario), else a
 *  "- " bullet (agent-spec guard findings), else the first non-empty line. */
export function firstFindingsLine(output: string): string {
  const lines = output
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return (
    lines.find((l) => l.startsWith("**") && l.endsWith("**")) ??
    lines.find((l) => l.startsWith("- ")) ??
    lines[0] ??
    "no findings in output"
  );
}

/** Parse lifecycle --format json stdout; null when not a JSON object. */
function parseLifecycleJson(stdout: string): Record<string, any> | null {
  try {
    const j = JSON.parse(stdout);
    return j && typeof j === "object" && !Array.isArray(j) ? j : null;
  } catch {
    return null;
  }
}

/** First non-passing scenario from lifecycle JSON ("name (verdict x)"),
 *  falling back to the failure_summary text. */
function lifecycleFinding(j: Record<string, any>, stdout: string): string {
  const results = Array.isArray(j.verification?.results) ? j.verification.results : [];
  const bad = results.find((r: any) => r && typeof r.verdict === "string" && r.verdict !== "pass");
  if (bad) return `${bad.scenario_name} (verdict ${bad.verdict})`;
  return firstFindingsLine(typeof j.failure_summary === "string" ? j.failure_summary : stdout);
}

export interface AutoGateInput {
  /** repo-relative posix path of the touched file */
  file: string;
  /** live plan.md content ("" when absent — hook inert) */
  plan: string;
  /** stage the task's spec alone into a per-task spec dir (guard --spec-dir
   *  scoping, plan-013/014 adjudicated); null = spec missing/unstagable */
  stageSpec: (contractPath: string) => string | null;
  /** injected gate runner (spawn-based in the wiring, faked in tests) */
  run: GateRunner;
}

export type AutoGateDecision =
  | { action: "inert" }
  | { action: "allow"; limitations?: string[] }
  | { action: "block"; layer: string; command: string; reason: string }
  | { action: "advisory"; key: string; line: string };

const gateAdvisory = (key: string, line: string): AutoGateDecision => ({
  action: "advisory",
  key,
  line,
});

const gateBlock = (
  layer: string,
  command: string,
  finding: string,
  file: string
): AutoGateDecision => ({
  action: "block",
  layer,
  command,
  reason: `[pi-workflows auto-gate] ${layer} FAILED for ${file}\ncommand: ${command}\nfirst finding: ${finding}\nfix: resolve the violation (or supersede the spec) before this write.`,
});

/**
 * @cc [label:hook,id:auto-gate-write-time] auto-gate-write-time
 * Write-time gate for code files under a live plan: ordered chain, short-
 * circuit on first failure — guard (boundary, per-task staged spec dir) →
 * lifecycle --format json (scenarios) → tdd-guard lint/verify (test quality).
 * Block = failing layer + command + first findings line. Toolchain absent or
 * a layer verdict unreadable ⇒ advisory (write proceeds), never a block —
 * blocks only land on defined violation classes. Docs-only `*.md` writes
 * outside the spec dirs are inert. Files no plan task claims are probed with
 * guard alone: blocked only when EVERY task spec's guard rejects the change
 * (unanimous exclusion ⇒ outside Allowed Changes); one passing spec means the
 * plan text is stale and the spec — the boundary authority — allows it.
 *
 * The auto-gate decision core. Pure over its inputs (stageSpec/run
 * injected) — the wiring in register() supplies fs/spawn.
 * @test blocks a code write that violates contract boundaries
 * @test blocks when a lifecycle scenario fails
 * @test advises and allows when the toolchain is absent
 * @test skips docs only markdown writes
 * @test advises once per file (watchdog dedupe)
 */
export function autoGate(input: AutoGateInput): AutoGateDecision {
  const file = input.file;
  // Plan-013/014 adjudicated env limitations (backlog item 11): Skip-only
  // verifier results are recorded and tolerated — real FAILed scenarios and
  // boundary violations still block.
  const limitations: string[] = [];
  // Docs exemption: *.md writes never trigger the chain (the doc-drift gate
  // owns docs enforcement); .md under the spec dirs stays gated.
  if (file.endsWith(".md") && !file.startsWith(".workflows/specs/")) return { action: "inert" };
  const tasks = parsePlan(input.plan);
  if (tasks.length === 0) return { action: "inert" };

  const guardCommand = (contractPath: string, dir: string): string =>
    `agent-spec guard --spec-dir ${dir} --code . --change ${file} --change-scope worktree`;
  const runGuard = (
    contractPath: string,
    dir: string
  ): GateRunResult | null =>
    input.run("agent-spec", [
      "guard",
      "--spec-dir",
      dir,
      "--code",
      ".",
      "--change",
      file,
      "--change-scope",
      "worktree",
    ]);

  const matched = tasks.filter((t) => matchesAllowed(file, t.allowed));

  if (matched.length > 0) {
    // Files inside a task's Allowed Changes: the full ordered chain per
    // touched task, short-circuit on the first failure/advisory.
    for (const task of matched) {
      const dir = input.stageSpec(task.contractPath);
      if (dir === null) {
        return gateAdvisory(
          file,
          `[pi-workflows auto-gate] ${task.contractPath} missing or unstagable — gate skipped for ${file} (advisory only); restore the contract before merging.`
        );
      }
      // Layer 1a — guard (boundary). Verify-only failures ("0 failed, N
      // skipped" — no Node verifier, backlog item 11) are recorded as an
      // env limitation; boundary violations block.
      const g = runGuard(task.contractPath, dir);
      if (g === null) return advisoryToolchain(file);
      if (g.code !== 0) {
        const out = `${g.stdout}\n${g.stderr}`;
        if (/verification not passing: 0 failed/.test(out) && !/outside allowed/i.test(out)) {
          limitations.push("guard: scenario verify skipped — no Node verifier (backlog item 11)");
        } else
          return gateBlock(
            "Layer 1 boundary (agent-spec guard)",
            guardCommand(task.contractPath, dir),
            firstFindingsLine(out),
            file
          );
      }
      // Layer 1b — lifecycle (scenarios)
      const lifecycleCommand = `agent-spec lifecycle ${task.contractPath} --code . --format json`;
      const l = input.run("agent-spec", [
        "lifecycle",
        task.contractPath,
        "--code",
        ".",
        "--format",
        "json",
      ]);
      if (l === null) return advisoryToolchain(file);
      const j = parseLifecycleJson(l.stdout);
      if (j === null || typeof j.passed !== "boolean") return advisoryToolchain(file);
      const results = Array.isArray(j.verification?.results) ? j.verification.results : [];
      const failedScenarios = results.filter((r: any) => r && r.verdict !== "skip");
      if (j.passed === false && results.length > 0 && failedScenarios.length === 0) {
        limitations.push(
          `lifecycle: all ${results.length} scenarios skipped — no Node verifier (backlog item 11)`
        );
      } else if (j.passed === false)
        return gateBlock(
          "Layer 1 lifecycle (agent-spec)",
          lifecycleCommand,
          lifecycleFinding(j, l.stdout),
          file
        );
      // Layer 2 — test quality (tdd-guard: lint then spec verify); a missing
      // binary advises the sub-step only — Layer 1 still gated this write (D5).
      const lintCommand = "tdd-guard lint";
      const lint = input.run("tdd-guard", ["lint"]);
      if (lint === null) return advisoryTddGuard(file);
      if (lint.code !== 0)
        return gateBlock(
          "Layer 2 test-quality (tdd-guard lint)",
          lintCommand,
          firstFindingsLine(`${lint.stdout}\n${lint.stderr}`),
          file
        );
      const verifyCommand = `tdd-guard verify --spec ${task.contractPath}`;
      const verify = input.run("tdd-guard", ["verify", "--spec", task.contractPath]);
      if (verify === null) return advisoryTddGuard(file);
      if (verify.code !== 0)
        return gateBlock(
          "Layer 2 test-quality (tdd-guard verify)",
          verifyCommand,
          firstFindingsLine(`${verify.stdout}\n${verify.stderr}`),
          file
        );
    }
    return limitations.length > 0
      ? { action: "allow", limitations }
      : { action: "allow" };
  }

  // No plan task claims this file: guard alone adjudicates the boundary —
  // block only when EVERY probed task spec rejects the change.
  const failures: { command: string; finding: string }[] = [];
  let probed = 0;
  for (const task of tasks) {
    const dir = input.stageSpec(task.contractPath);
    if (dir === null) continue; // no spec to probe against
    probed++;
    const g = runGuard(task.contractPath, dir);
    if (g === null) return advisoryToolchain(file);
    if (g.code !== 0) {
      const out = `${g.stdout}\n${g.stderr}`;
      if (/verification not passing: 0 failed/.test(out) && !/outside allowed/i.test(out)) {
        const note = "guard: scenario verify skipped — no Node verifier (backlog item 11)";
        if (!limitations.includes(note)) limitations.push(note);
      } else
        failures.push({
          command: guardCommand(task.contractPath, dir),
          finding: firstFindingsLine(out),
        });
    }
  }
  if (probed > 0 && failures.length === probed) {
    return gateBlock(
      "Layer 1 boundary (agent-spec guard)",
      failures[0].command,
      failures[0].finding,
      file
    );
  }
  return { action: "allow" };
}

function advisoryToolchain(file: string): AutoGateDecision {
  return gateAdvisory(
    file,
    `[pi-workflows auto-gate] agent-spec not found on PATH (or its output was unreadable) — write-time gate skipped for ${file} (advisory only); run the Layer 1/2 gate chain manually before merging.`
  );
}

function advisoryTddGuard(file: string): AutoGateDecision {
  return gateAdvisory(
    file,
    `[pi-workflows auto-gate] tdd-guard not found on PATH — Layer 2 (test-quality) skipped for ${file} (advisory only); install it (git clone https://github.com/yagaltd/tdd-guard && npm install && npm run build && npm link); Layer 1 still gated this write.`
  );
}

/* ---------------------------------- wiring ---------------------------------- */

// ── 6. Intent-guard suggestion hook (plan 20261026-030) ───────────────────

/** Applies when: user message, non-empty prompt, not an explicit /command. */
export function intentGuardApplies(event: any): boolean {
  if (!event || event.messageType !== "user") return false;
  const p = typeof event.prompt === "string" ? event.prompt.trim() : "";
  return p.length > 0 && !p.startsWith("/");
}

/** Suggest-only routing line; proceed and ask-human stay silent.
 *  Tier (plan 20261026-033): an answer route appends the entry-command
 *  suggestion — problem→idea, solution→plan, procedure→add. */
export function intentGuardSuggest(c: {
  route: string;
  kind: string | null;
  confidence: number | null;
  tier?: string | null;
}): { message: { customType: string; content: string; display: boolean } } | undefined {
  const entry = c.tier === "problem" ? "/idea (or /brainstorm)" : c.tier === "solution" ? "/plan" : c.tier === "procedure" ? "/add" : null;
  const tail = `kind=${c.kind}, tier=${c.tier ?? "?"}, confidence=${c.confidence ?? "?"} — suggest-only, never auto-executed.`;
  if (c.route === "amend")
    return { message: { customType: "pi-workflows-intent-guard", content: `[pi-workflows intent-guard] this request changes requirements — run /amend before touching tasks (${tail})`, display: true } };
  if (c.route === "answer") {
    const entryLine = entry ? ` If it starts new work, consider ${entry}.` : "";
    return { message: { customType: "pi-workflows-intent-guard", content: `[pi-workflows intent-guard] unrelated to the live plan — answer directly, do not start tasks${entryLine} (${tail})`, display: true } };
  }
  if (c.route === "ask")
    return { message: { customType: "pi-workflows-intent-guard", content: `[pi-workflows intent-guard] ambiguous against the live plan — ask one clarifying question before touching tasks (${tail})`, display: true } };
  return undefined;
}

/** Best-effort trail append — same line shape as intent-guard.mjs main(). */
export function appendIntentTrail(
  trailPath: string,
  query: string,
  c: { route: string; kind: string | null; confidence: number | null; skipped?: boolean; probabilities?: Record<string, number> }
): void {
  try {
    fs.mkdirSync(path.dirname(trailPath), { recursive: true });
    fs.appendFileSync(
      trailPath,
      JSON.stringify({
        ts: new Date().toISOString(),
        query,
        route: c.route,
        kind: c.kind,
        confidence: c.confidence,
        threshold: 0.85,
        skipped: c.skipped ?? false,
        ...(c.probabilities ? { probabilities: c.probabilities } : {}),
      }) + "\n"
    );
  } catch {
    // trail is best-effort; the guard never breaks a turn
  }
}

// ── 9. TypeLLM judge client + intake triage (plan 20261117-076 Phase 1) ────

/** The four 071 intake-triage buckets (templates/FOLLOW-UP-TABLE.md discipline,
 *  machine-consistent per plan 20261117-076). Order is display order. */
export const TRIAGE_BUCKETS = ["queued", "batched", "closed", "done"] as const;
export type TriageBucket = (typeof TRIAGE_BUCKETS)[number];

/** Below this the verdict is not trusted — the finding stays in the default
 *  path (majordome's mandatory confidence-gating, plan 20261117-076). */
export const TRIAGE_CONFIDENCE_FLOOR = 0.6;

/** The triage classification schema sent with every request. The transport
 *  maps each property's {type, enum, description} onto the TypeLLM question
 *  shape and validates the response's `result` against the constraints this
 *  carries (enum membership, number range, required fields); anything it
 *  cannot validate is a loud skip, never a guess. */
export const TRIAGE_SCHEMA = {
  type: "object",
  properties: {
    bucket: {
      type: "string",
      enum: TRIAGE_BUCKETS,
      description:
        "Which of the four review-finding buckets does this finding belong to? " +
        "queued = a real P0-P2 problem for the owner's follow-up queue; " +
        "batched = a P3 nit that bundles with similar items into one row; " +
        "closed = not worth acting on, deleted with a one-line why; " +
        "done = already fixed or verified within this plan.",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description:
        "0-1 confidence in the bucket choice. Use the full range; 0.9+ only " +
        "when the finding unambiguously fits one bucket.",
    },
    evidence: {
      type: "string",
      description: "One short line citing the words in the finding that drove the choice.",
    },
  },
  required: ["bucket", "confidence"],
  additionalProperties: false,
} as const;

/** One judge classification. skipped=true is LOUD: `reason` always names
 *  why, and callers must surface it — a skip is never a silent pass.
 *  `value` (plan 20261117-076 Phase 2) is the schema-validated result payload:
 *  the verdict vocabulary rides the schema, not the seam — review-verdict
 *  consumers read value.verdict; triage reads bucket (a simple fake may pass
 *  bucket alone; the transport fills value with the whole result object). */
export interface TriageVerdict {
  skipped: boolean;
  bucket: TriageBucket | null;
  value?: Record<string, unknown>;
  confidence: number;
  evidence?: string;
  reason?: string;
}

/** The judge-backend seam (plan 20261117-076 owner steering): classification
 *  goes through classify(schema, input) — no schema/endpoint/key specifics
 *  leak past this shape. TypeLLM is the first implementation; a Jev backend
 *  (Phase 2 candidate) slots in without touching the triage. */
export interface JudgeBackend {
  name: string;
  classify(schema: object, input: string): Promise<TriageVerdict>;
}

/** Key chain (majordome judges.ts ground truth): TYPELLM_API_KEY env first,
 *  then ~/.config/pi-majordome/typellm.key, else null. Deps injectable for
 *  tests; defaults read the live environment. */
export function resolveTypellmKey(
  deps?: {
    env?: Record<string, string | undefined>;
    keyPath?: string;
    readFile?: (p: string) => string | null;
  }
): string | null {
  const env = deps?.env ?? process.env;
  const fromEnv = env.TYPELLM_API_KEY;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim();
  const read = deps?.readFile ?? defaultReadFile;
  const keyPath =
    deps?.keyPath ?? path.join(os.homedir(), ".config", "pi-majordome", "typellm.key");
  const fromFile = read(keyPath);
  if (typeof fromFile === "string" && fromFile.trim()) return fromFile.trim();
  return null;
}

function defaultReadFile(p: string): string | null {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

const TYPELLM_DEFAULT_TIMEOUT_MS = 30_000;

/** Validate a response `output` against the schema subset the triage uses:
 *  type string|number, enum membership, minimum/maximum, required. Returns
 *  the parsed value, or null when anything is off (caller skips loudly). */
function validateSchemaValue(
  schema: any,
  value: unknown
): { ok: true; value: any } | { ok: false; why: string } {
  if (!schema || typeof schema !== "object") return { ok: false, why: "schema is not an object" };
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return { ok: false, why: "schema: output is not an object" };
    const v = value as Record<string, unknown>;
    for (const req of schema.required ?? []) {
      if (!(req in v)) return { ok: false, why: `schema: missing required field '${req}'` };
    }
    for (const [key, propSchema] of Object.entries<any>(schema.properties ?? {})) {
      if (!(key in v) || v[key] === undefined) continue;
      const check = validateSchemaValue(propSchema, v[key]);
      if (!check.ok) return check;
    }
    return { ok: true, value: v };
  }
  if (schema.type === "string") {
    if (typeof value !== "string") return { ok: false, why: `schema: expected string, got ${typeof value}` };
    if (Array.isArray(schema.enum) && !schema.enum.includes(value))
      return { ok: false, why: `schema: value '${value}' is outside the enum` };
    return { ok: true, value };
  }
  if (schema.type === "number") {
    if (typeof value !== "number" || !Number.isFinite(value))
      return { ok: false, why: `schema: expected finite number, got ${typeof value}` };
    if (typeof schema.minimum === "number" && value < schema.minimum)
      return { ok: false, why: `schema: number ${value} below minimum ${schema.minimum}` };
    if (typeof schema.maximum === "number" && value > schema.maximum)
      return { ok: false, why: `schema: number ${value} above maximum ${schema.maximum}` };
    return { ok: true, value };
  }
  return { ok: false, why: `schema: unsupported type '${String(schema.type)}'` };
}

/** Map a JSON-schema object onto the TypeLLM questions shape — per field
 *  {type, enum?, instructions} with the schema's description as the
 *  instruction. Returns null (caller skips loudly) on any property the
 *  transport cannot express. */
function questionsOf(schema: any): Record<string, unknown> | null {
  if (schema?.type !== "object" || !schema.properties) return null;
  const questions: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries<any>(schema.properties)) {
    if (prop.type !== "string" && prop.type !== "number") return null;
    const q: Record<string, unknown> = {
      type: prop.type,
      instructions:
        (typeof prop.description === "string" && prop.description.trim()) ||
        `Value of the '${key}' field.`,
    };
    if (Array.isArray(prop.enum)) q.enum = prop.enum;
    questions[key] = q;
  }
  return questions;
}

/** The TypeLLM transport as the first JudgeBackend implementation — the
 *  majordome judges.ts contract (plan 20261117-076 ground truth): POST
 *  {baseUrl}/v1/generate {context, questions}, bearer key, response `result`
 *  object validated against the schema. Every failure mode is a LOUD skip
 *  with the reason named: no key (checked before any network call), HTTP
 *  error, non-JSON body, schema-invalid or missing result. Config injectable
 *  for tests; env defaults otherwise. */
export function makeTypellmBackend(
  deps?: {
    key?: string | null;
    fetchImpl?: typeof fetch;
    baseUrl?: string;
    timeoutMs?: number;
    env?: Record<string, string | undefined>;
    keyPath?: string;
    readFile?: (p: string) => string | null;
  }
): JudgeBackend {
  const env = deps?.env ?? process.env;
  const baseUrl = (deps?.baseUrl ?? env.TYPELLM_BASE_URL ?? "https://api.typellm.ai").replace(
    /\/+$/,
    ""
  );
  const timeoutMs = (() => {
    const n = Number(deps?.timeoutMs ?? env.TYPELLM_TIMEOUT_MS);
    return Number.isFinite(n) && n > 0 ? n : TYPELLM_DEFAULT_TIMEOUT_MS;
  })();
  return {
    name: "typellm",
    async classify(schema: object, input: string): Promise<TriageVerdict> {
      const key = deps && deps.key !== undefined ? deps.key : resolveTypellmKey({ env, keyPath: deps?.keyPath, readFile: deps?.readFile });
      if (!key)
        return {
          skipped: true,
          bucket: null,
          confidence: 0,
          reason: "missing TYPELLM_API_KEY (env or ~/.config/pi-majordome/typellm.key)",
        };
      const questions = questionsOf(schema);
      if (!questions)
        return { skipped: true, bucket: null, confidence: 0, reason: "schema not expressible as TypeLLM questions" };
      const endpoint = `${baseUrl}/v1/generate`;
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      let res: Response;
      let body: string;
      try {
        res = await (deps?.fetchImpl ?? fetch)(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
          body: JSON.stringify({ context: input, questions }),
          signal: ac.signal,
        });
        body = await res.text();
      } catch (e: any) {
        const why = e?.name === "AbortError" ? `timed out after ${timeoutMs}ms` : String(e?.message ?? e);
        return { skipped: true, bucket: null, confidence: 0, reason: `endpoint unreachable (${why})` };
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok)
        return { skipped: true, bucket: null, confidence: 0, reason: `endpoint error (HTTP ${res.status})` };
      let parsed: any;
      try {
        parsed = JSON.parse(body);
      } catch {
        return { skipped: true, bucket: null, confidence: 0, reason: "endpoint returned a non-JSON response" };
      }
      if (!parsed || typeof parsed !== "object" || !("result" in parsed))
        return { skipped: true, bucket: null, confidence: 0, reason: "endpoint response missing result" };
      const check = validateSchemaValue(schema, parsed.result);
      if (!check.ok)
        return { skipped: true, bucket: null, confidence: 0, reason: `schema-invalid response: ${check.why}` };
      const out = check.value as Record<string, unknown>;
      const confidence = typeof out.confidence === "number" ? out.confidence : 0;
      const evidence = typeof out.evidence === "string" ? out.evidence : undefined;
      return {
        skipped: false,
        bucket: typeof out.bucket === "string" ? (out.bucket as TriageBucket) : null,
        value: out,
        confidence,
        ...(evidence !== undefined ? { evidence } : {}),
      };
    },
  };
}

/** One triaged finding: the verdict plus the routing decision. defaultPath
 *  is true when the human's default handling stays in charge — backend
 *  skip OR confidence below the floor (the finding is never dropped). */
export interface TriageResult extends TriageVerdict {
  finding: string;
  backend: string;
  defaultPath: boolean;
}

/** Classify one worker finding through the seam. Below-floor verdicts keep
 *  their bucket for visibility but route to the default path, loudly. */
export async function triageFinding(backend: JudgeBackend, finding: string): Promise<TriageResult> {
  const v = await backend.classify(TRIAGE_SCHEMA, finding);
  if (v.skipped)
    return { ...v, finding, backend: backend.name, defaultPath: true };
  // bucket rides the dedicated field OR the schema-validated payload (value-only
  // fakes — the seam generalization keeps both shapes working).
  const bucket = (v.bucket ??
    (typeof v.value?.bucket === "string" ? (v.value.bucket as TriageBucket) : null)) as TriageBucket | null;
  if (v.confidence < TRIAGE_CONFIDENCE_FLOOR)
    return {
      ...v,
      bucket,
      finding,
      backend: backend.name,
      defaultPath: true,
      reason: `below confidence floor (${v.confidence} < ${TRIAGE_CONFIDENCE_FLOOR}) — stays in the default path`,
    };
  return { ...v, bucket, finding, backend: backend.name, defaultPath: false };
}

/** Triage a batch of findings; the summary counts buckets + default-path
 *  rows (skips and below-floor verdicts — never silent, never dropped). */
export async function triageFindings(
  backend: JudgeBackend,
  findings: string[]
): Promise<{ results: TriageResult[]; summary: Record<TriageBucket | "defaultPath", number> }> {
  const results: TriageResult[] = [];
  for (const finding of findings) results.push(await triageFinding(backend, finding));
  const summary: Record<TriageBucket | "defaultPath", number> = {
    queued: 0,
    batched: 0,
    closed: 0,
    done: 0,
    defaultPath: 0,
  };
  for (const r of results) {
    if (r.defaultPath) summary.defaultPath++;
    else if (r.bucket) summary[r.bucket]++;
  }
  return { results, summary };
}

/** Human-visible triage rows for the ship output: bucket + confidence when
 *  triaged; a LOUD default-path line (JUDGE SKIPPED / below floor) when not. */
export function renderTriageTable(results: TriageResult[]): string {
  const short = (f: string) => (f.length > 72 ? `${f.slice(0, 69)}...` : f);
  return results
    .map((r) => {
      if (r.defaultPath) {
        const why = r.skipped
          ? `JUDGE SKIPPED (${r.reason ?? "unspecified"})`
          : `JUDGE SKIPPED (${r.reason ?? "below confidence floor"})`;
        return `- ${short(r.finding)} → default path — ${why}`;
      }
      const ev = r.evidence ? ` [${r.evidence}]` : "";
      return `- ${short(r.finding)} → ${r.bucket} (confidence ${r.confidence})${ev}`;
    })
    .join("\n");
}

/* ── 9b. Review verdicts (plan 20261117-076 Phase 2) — the Tier-1 first-pass ──

 *  The reviewer's ~73 serial prompt checks map to three tiers: Tier 0 =
 *  script-covered gates (deleted from the prompt, cited in one line each),
 *  Tier 1 = THIS runner (content-fact scenarios judged on the diff with
 *  evidence quotes), Tier 2 = the reviewer subagent's deep read (intent,
 *  contradictions, uncertain verdicts). The judge never closes a review
 *  alone: every uncertain row — and every row at all on a backend skip —
 *  routes to Tier 2, loudly. Same seam, same confidence floor as triage. */

/** Tier-1 verdict vocabulary: pass = the diff satisfies the claim · fail = it
 *  visibly does not · uncertain = below-floor confidence or a backend skip
 *  (uncertain is ALWAYS Tier 2 — the reviewer deep-reads it). */
export const REVIEW_VERDICTS = ["pass", "fail", "uncertain"] as const;
export type ReviewVerdict = (typeof REVIEW_VERDICTS)[number];

/** One content-fact scenario the diff can pass or fail on (the contract's
 *  scenario/verify claims — report-vs-diff, docs-vs-code, pin validity,
 *  claim truthfulness). Intent and contradictions are NOT here — Tier 2. */
export interface ReviewScenario {
  id: string;
  claim: string;
}

/** Uncertainty calibration (plan 076 Phase 3 — the Phase-2 miss class was
 *  over-confident passes on ambiguous evidence): the judge is TOLD that a
 *  guess under ambiguity scores as a miss. Prompt-side lever — the schema
 *  shape and the verdict vocabulary stay exactly as Phase 2 shipped them. */
export const CALIBRATION_INSTRUCTION =
  "Penalize confident guesses: ambiguous or partial evidence is uncertain " +
  "rather than a confident guess.";

/** The per-scenario classification schema sent with every request (same
 *  shape discipline as TRIAGE_SCHEMA — the transport validates `result`
 *  against this; anything it cannot validate is a loud skip). */
export const REVIEW_VERDICT_SCHEMA = {
  type: "object",
  properties: {
    verdict: {
      type: "string",
      enum: REVIEW_VERDICTS,
      description:
        "Does the diff summary satisfy the scenario's claim? " +
        "pass = the claim holds on the evidence given; fail = the evidence " +
        "visibly contradicts the claim; uncertain = the evidence cannot decide " +
        `it. ${CALIBRATION_INSTRUCTION}`,
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description:
        "0-1 confidence in the verdict. Use the full range; 0.9+ only when the " +
        "evidence decides the claim unambiguously. An honest uncertain at " +
        "moderate confidence beats a guess on ambiguity.",
    },
    evidence: {
      type: "string",
      description:
        "One short quote from the claim or the diff summary that drove the verdict.",
    },
  },
  required: ["verdict", "confidence"],
  additionalProperties: false,
} as const;

/** One scenario's Tier-1 verdict. skipped=true is LOUD (reason named); an
 *  uncertain verdict — judge's own, below-floor, or skip — routes to Tier 2. */
export interface ScenarioVerdict {
  scenario: string;
  verdict: ReviewVerdict;
  confidence: number;
  evidence?: string;
  skipped?: boolean;
  reason?: string;
}

/** The Tier-1 result: per-scenario verdicts + the deep-read routing (the
 *  uncertain ids the reviewer must read) + the loud global-skip flag. */
export interface ReviewVerdictResult {
  results: ScenarioVerdict[];
  deepRead: string[];
  skippedAll: boolean;
  backend: string;
  reason?: string;
}

/** The judge's input for one scenario: the claim AND the diff summary — the
 *  judge compresses, it does not discover (the mechanical facts ride in the
 *  question; the harness replays this exact construction for fixtures). */
export function scenarioInput(scenario: ReviewScenario, diffSummary: string): string {
  return `Scenario ${scenario.id}: ${scenario.claim}\n\nDiff summary:\n${diffSummary}`;
}

/** Run Tier-1 review verdicts over the seam: one classify call per scenario.
 *  Below-floor confidence → uncertain (Tier 2) with the reason named; a
 *  backend skip → that scenario uncertain (skipped, loud); when EVERY
 *  scenario skips, skippedAll is set with the backend's reason surfaced —
 *  all scenarios route to Tier 2, never a silent pass. */
export async function reviewVerdicts(
  backend: JudgeBackend,
  scenarios: ReviewScenario[],
  diffSummary: string
): Promise<ReviewVerdictResult> {
  const results: ScenarioVerdict[] = [];
  const deepRead: string[] = [];
  let skippedAll = true;
  let reason: string | undefined;
  for (const scenario of scenarios) {
    const v = await backend.classify(REVIEW_VERDICT_SCHEMA, scenarioInput(scenario, diffSummary));
    if (v.skipped) {
      const why = v.reason ?? "judge skipped (unspecified)";
      reason ??= why;
      deepRead.push(scenario.id);
      results.push({
        scenario: scenario.id,
        verdict: "uncertain",
        confidence: 0,
        skipped: true,
        reason: why,
      });
      continue;
    }
    skippedAll = false;
    const verdict = v.value?.verdict;
    if (typeof verdict !== "string" || !REVIEW_VERDICTS.includes(verdict as ReviewVerdict)) {
      // schema-invalid payload from a misbehaving backend — loud skip
      const why = `schema-invalid response: verdict '${String(verdict)}' is outside the enum`;
      deepRead.push(scenario.id);
      results.push({ scenario: scenario.id, verdict: "uncertain", confidence: 0, skipped: true, reason: why });
      continue;
    }
    const confidence = typeof v.confidence === "number" ? v.confidence : 0;
    if (confidence < TRIAGE_CONFIDENCE_FLOOR) {
      deepRead.push(scenario.id);
      results.push({
        scenario: scenario.id,
        verdict: "uncertain",
        confidence,
        ...(v.evidence !== undefined ? { evidence: v.evidence } : {}),
        reason: `below confidence floor (${confidence} < ${TRIAGE_CONFIDENCE_FLOOR}) — Tier 2 deep-read`,
      });
      continue;
    }
    results.push({
      scenario: scenario.id,
      verdict: verdict as ReviewVerdict,
      confidence,
      ...(v.evidence !== undefined ? { evidence: v.evidence } : {}),
    });
  }
  return {
    results,
    deepRead,
    skippedAll: skippedAll && scenarios.length > 0,
    backend: backend.name,
    ...(skippedAll && scenarios.length > 0 && reason !== undefined ? { reason } : {}),
  };
}

/** The Tier-1 table fed into the reviewer's prompt: one row per scenario,
 *  uncertain rows marked DEEP-READ; a global skip prints JUDGE SKIPPED and
 *  the all-Tier-2 line loudly — a skip never reads as a pass. */
export function renderVerdictTable(result: ReviewVerdictResult): string {
  const lines: string[] = [];
  if (result.skippedAll)
    lines.push(
      `JUDGE SKIPPED (${result.reason ?? "unspecified"}) — ALL scenarios route to Tier 2 (the judge never closes a review alone)`
    );
  lines.push(`TIER-1 VERDICT TABLE (backend ${result.backend})`);
  lines.push("| scenario | verdict | confidence | evidence |");
  lines.push("|---|---|---|---|");
  for (const r of result.results) {
    const ev = r.evidence ? ` ${r.evidence}` : "";
    const verdictCell =
      r.verdict === "uncertain"
        ? r.skipped
          ? `uncertain — DEEP-READ (skipped: ${r.reason ?? "unspecified"})`
          : `uncertain — DEEP-READ${r.reason ? ` (${r.reason})` : ""}`
        : r.verdict;
    lines.push(`| ${r.scenario} | ${verdictCell} | ${r.confidence} |${ev}`);
  }
  return lines.join("\n");
}

/* ── 9c. Batched-DAG review judging (plan 20261117-076 Phase 3, TypeLLM-only) ──
 *
 *  The Phase-2 runner spent one API call per scenario (12–27 per review) and
 *  judged every scenario blind to the others. Phase 3 upgrades precision AND
 *  cost: (1) BATCH — one call carries ALL scenarios + the diff's real file
 *  contents within the context window (deterministic whole-scenario chunking
 *  when over — boundaries never split a scenario); a failed chunk marks ITS
 *  scenarios uncertain-loud, the others proceed. (2) DAG — the review
 *  decomposes into dependency-ordered sub-judgments (position-bias controlled:
 *  decompose runs over permuted presentations, the first valid decomposition
 *  wins, execution order comes from the DAG's own topological sort); each
 *  later sub-judgment RECEIVES the earlier verdicts as context. (3) The
 *  calibration instruction rides every prompt (see CALIBRATION_INSTRUCTION).
 *
 *  Contract preservation: the per-scenario verdict stays {verdict, confidence,
 *  evidence}; the schema vocabulary, the floor, the uncertain→Tier-2 routing,
 *  the loud-skip doctrine and renderVerdictTable are untouched. The flat
 *  {scenarioId}_verdict/_confidence/_evidence question encoding rides the
 *  UNCHANGED {context, questions} transport — one POST per call, the runner
 *  reassembles the per-scenario verdict array from the response keys. */

/** Context-window cap for one batched call, in characters (the 32k window).
 *  Over-window scenario sets chunk deterministically below this cap. */
export const REVIEW_CONTEXT_WINDOW = 32_000;

/** Marker line that keys a decompose call in the review body — the recorded
 *  harness backend and the DAG runner both key off it. */
export const DECOMPOSE_INPUT_MARKER =
  "decompose this review into dependency-ordered sub-judgments";

/** Real file contents carried alongside the diff summary — the judge reads
 *  the code, not just the report about the code. */
export interface ReviewFileContext {
  path: string;
  content: string;
}

export interface BatchedVerdictOptions {
  /** The diff's files, included up to the window (deterministic truncation). */
  files?: ReviewFileContext[];
  /** Context-window cap in characters (default REVIEW_CONTEXT_WINDOW). */
  window?: number;
  /** Per-scenario evidence override (scenario id → its evidence text);
   *  defaults every scenario to the shared diff summary. */
  evidence?: Record<string, string>;
}

/** Batched result: the Phase-2 verdict result PLUS the mechanics the harness
 *  comparison reports (API calls actually made, chunks the set split into). */
export interface BatchedReviewResult extends ReviewVerdictResult {
  calls: number;
  chunks: number;
}

export interface DagReviewResult extends BatchedReviewResult {
  /** Named when the decompose step was unusable and the runner fell back to
   *  independent sub-judgments — degraded context flow, never a silent pass. */
  degraded?: string;
}

function batchHeader(): string {
  return (
    "Review judge: judge every scenario below on the evidence (diff summary + files). " +
    `${CALIBRATION_INSTRUCTION} Return one verdict per scenario id.\n\n`
  );
}

function scenarioBlock(s: ReviewScenario, evidence: string): string {
  return `Scenario ${s.id}: ${s.claim}\nEvidence:\n${evidence}\n`;
}

/** Deterministic file-context fitting: the window minus the fixed parts and
 *  per-file overhead (head line + truncation marker + newline) splits evenly
 *  across files; each oversized file is truncated with an explicit
 *  `…[truncated N chars]` marker. Never silent — the marker names what the
 *  judge did not see. */
function fitFilesBlock(files: ReviewFileContext[], budget: number): string {
  if (!files.length || budget <= 64) return "";
  const sectionHead = "Files (real contents):\n";
  const heads = files.map((f) => `--- file: ${f.path} ---\n`);
  const headLengths = heads.reduce((n, h) => n + h.length + 1, 0);
  const overhead = sectionHead.length + headLengths + 32 * files.length + 32;
  const perFile = Math.max(0, Math.floor((budget - overhead) / files.length));
  if (perFile <= 0) return "";
  const parts = files.map((f, i) => {
    const body =
      f.content.length > perFile
        ? `${f.content.slice(0, perFile)}…[truncated ${f.content.length - perFile} chars]\n`
        : f.content.endsWith("\n")
          ? f.content
          : `${f.content}\n`;
    return heads[i] + body;
  });
  return `${sectionHead}${parts.join("")}\n`;
}

/** Whole-scenario chunking: greedy fill under the window; a boundary falls
 *  BETWEEN scenario blocks, never inside one; chunk order follows input order. */
function chunkScenarios(
  scenarios: ReviewScenario[],
  evidenceOf: (id: string) => string,
  prefixLength: number,
  window: number
): ReviewScenario[][] {
  const chunks: ReviewScenario[][] = [];
  let current: ReviewScenario[] = [];
  let currentLength = 0;
  for (const s of scenarios) {
    const blockLength = scenarioBlock(s, evidenceOf(s.id)).length;
    if (current.length > 0 && prefixLength + currentLength + blockLength > window) {
      chunks.push(current);
      current = [];
      currentLength = 0;
    }
    current.push(s);
    currentLength += blockLength;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/** The batch schema for one call: flat per-scenario verdict/confidence/
 *  evidence questions, nothing REQUIRED (a missing key degrades THAT scenario
 *  loudly instead of failing the whole call at the transport). */
export function batchVerdictSchema(scenarioIds: string[]): object {
  const properties: Record<string, unknown> = {};
  for (const id of scenarioIds) {
    properties[`${id}_verdict`] = {
      type: "string",
      enum: REVIEW_VERDICTS,
      description: `Verdict for scenario ${id}: pass/fail/uncertain. ${CALIBRATION_INSTRUCTION}`,
    };
    properties[`${id}_confidence`] = {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: `0-1 confidence for scenario ${id}'s verdict.`,
    };
    properties[`${id}_evidence`] = {
      type: "string",
      description: `One short quote that drove scenario ${id}'s verdict.`,
    };
  }
  return { type: "object", properties, required: [], additionalProperties: false };
}

/** Parse one call's flat response keys into per-scenario verdicts — same
 *  enum/floor/skip semantics as the Phase-2 runner, per scenario. */
function parseFlatVerdicts(ids: string[], value: Record<string, unknown>): {
  results: ScenarioVerdict[];
  anyUsable: boolean;
} {
  const results: ScenarioVerdict[] = [];
  let anyUsable = false;
  for (const id of ids) {
    const verdict = value[`${id}_verdict`];
    if (verdict === undefined || verdict === null) {
      results.push({
        scenario: id,
        verdict: "uncertain",
        confidence: 0,
        skipped: true,
        reason: `batch response missing verdict for ${id}`,
      });
      continue;
    }
    if (typeof verdict !== "string" || !REVIEW_VERDICTS.includes(verdict as ReviewVerdict)) {
      results.push({
        scenario: id,
        verdict: "uncertain",
        confidence: 0,
        skipped: true,
        reason: `schema-invalid response: verdict '${String(verdict)}' is outside the enum`,
      });
      continue;
    }
    const rawConfidence = value[`${id}_confidence`];
    const confidence = typeof rawConfidence === "number" && Number.isFinite(rawConfidence) ? rawConfidence : 0;
    const evidence = typeof value[`${id}_evidence`] === "string" ? (value[`${id}_evidence`] as string) : undefined;
    if (confidence < TRIAGE_CONFIDENCE_FLOOR) {
      results.push({
        scenario: id,
        verdict: "uncertain",
        confidence,
        ...(evidence !== undefined ? { evidence } : {}),
        reason: `below confidence floor (${confidence} < ${TRIAGE_CONFIDENCE_FLOOR}) — Tier 2 deep-read`,
      });
      continue;
    }
    anyUsable = true;
    results.push({
      scenario: id,
      verdict: verdict as ReviewVerdict,
      confidence,
      ...(evidence !== undefined ? { evidence } : {}),
    });
  }
  return { results, anyUsable };
}

/** Run Tier-1 review verdicts in BATCH mode: ALL scenarios (+ the diff's real
 *  file contents) ride ONE call while they fit the window; over-window sets
 *  chunk deterministically at whole-scenario boundaries. A failed chunk marks
 *  ITS scenarios uncertain-loud; the others proceed. The judge never closes a
 *  review alone — uncertain/skipped rows route to Tier 2 exactly as before. */
export async function reviewVerdictsBatched(
  backend: JudgeBackend,
  scenarios: ReviewScenario[],
  diffSummary: string,
  opts?: BatchedVerdictOptions
): Promise<BatchedReviewResult> {
  const window = opts?.window ?? REVIEW_CONTEXT_WINDOW;
  const evidenceOf = (id: string) => opts?.evidence?.[id] ?? diffSummary;
  const header = batchHeader();
  // Fit the files once against the tightest chunk (the largest one) so every
  // call body stays inside the window.
  const chunks0 = chunkScenarios(scenarios, evidenceOf, header.length, window);
  const largestBlocks = Math.max(
    0,
    ...chunks0.map((c) => c.reduce((n, s) => n + scenarioBlock(s, evidenceOf(s.id)).length, 0))
  );
  const filesBlock = fitFilesBlock(opts?.files ?? [], window - header.length - largestBlocks);
  const prefix = header + filesBlock;
  const prefixLength = prefix.length;
  const chunks = chunks0.length > 1 ? chunkScenarios(scenarios, evidenceOf, prefixLength, window) : chunks0;

  const byId = new Map<string, ScenarioVerdict>();
  let anyUsable = false;
  let firstSkipReason: string | undefined;
  for (const chunk of chunks) {
    const ids = chunk.map((s) => s.id);
    const input = prefix + chunk.map((s) => scenarioBlock(s, evidenceOf(s.id))).join("");
    const v = await backend.classify(batchVerdictSchema(ids), input);
    if (v.skipped) {
      const why = v.reason ?? "judge skipped (unspecified)";
      firstSkipReason ??= why;
      for (const id of ids)
        byId.set(id, { scenario: id, verdict: "uncertain", confidence: 0, skipped: true, reason: why });
      continue;
    }
    const parsed = parseFlatVerdicts(ids, v.value ?? {});
    for (const r of parsed.results) byId.set(r.scenario, r);
    anyUsable ||= parsed.anyUsable;
  }
  const results = scenarios.map((s) => byId.get(s.id)!).filter(Boolean);
  const skippedAll = !anyUsable && scenarios.length > 0;
  return {
    results,
    deepRead: results.filter((r) => r.verdict === "uncertain").map((r) => r.scenario),
    skippedAll,
    backend: backend.name,
    ...(skippedAll && firstSkipReason !== undefined ? { reason: firstSkipReason } : {}),
    calls: chunks.length,
    chunks: chunks.length,
  };
}

/* ── DAG decompose — dependency-ordered sub-judgments, position-bias controlled ── */

/** The decompose schema: ONE string question carrying the JSON decomposition
 *  (groups with depends_on edges) — expressible by the unchanged transport. */
export const REVIEW_DECOMPOSE_SCHEMA = {
  type: "object",
  properties: {
    decomposition: {
      type: "string",
      description:
        'JSON document: {"groups":[{"id":"J1","scenarios":["S1"],"depends_on":[]}]}' +
        " — dependency-ordered sub-judgments covering every scenario id exactly once; " +
        "a group's depends_on names group ids whose verdicts it needs first.",
    },
  },
  required: ["decomposition"],
  additionalProperties: false,
} as const;

/** Decompose presentation permutations (position-bias control — the solved
 *  majordome pattern): the first run presents the scenarios REVERSED, the
 *  second rotated by one. Neither run uses the input order as-given, so a
 *  decomposition can never silently inherit the presentation-order bias. */
function permutePresentation(scenarios: ReviewScenario[], run: number): ReviewScenario[] {
  if (scenarios.length <= 1) return scenarios;
  if (run === 0) return [...scenarios].reverse();
  const k = run % scenarios.length;
  return [...scenarios.slice(k), ...scenarios.slice(0, k)];
}

interface DecomposeGroup {
  id: string;
  scenarios: string[];
  depends_on: string[];
}

/** Validate a decomposition: every scenario exactly once, edges reference
 *  known groups, graph acyclic. Returns null on any defect (caller retries
 *  the next permutation, then falls back — loudly). */
function parseDecomposition(raw: unknown, scenarioIds: string[]): DecomposeGroup[] | null {
  if (typeof raw !== "string") return null;
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const groups: any[] = Array.isArray(parsed?.groups) ? parsed.groups : [];
  if (!groups.length) return null;
  const seen = new Map<string, DecomposeGroup>();
  for (const g of groups) {
    if (!g || typeof g.id !== "string" || !Array.isArray(g.scenarios)) return null;
    const deps = Array.isArray(g.depends_on)
      ? g.depends_on.filter((d: unknown): d is string => typeof d === "string")
      : [];
    for (const s of g.scenarios) if (typeof s !== "string") return null;
    seen.set(g.id, { id: g.id, scenarios: g.scenarios, depends_on: deps });
  }
  // every scenario exactly once
  const assigned: string[] = groups.flatMap((g: any) => g.scenarios);
  if (assigned.length !== scenarioIds.length) return null;
  for (const id of scenarioIds) if (!assigned.includes(id)) return null;
  // edges reference known groups
  for (const g of seen.values()) for (const d of g.depends_on) if (!seen.has(d)) return null;
  // acyclic (Kahn)
  const indegree = new Map<string, number>();
  for (const g of seen.values()) indegree.set(g.id, g.depends_on.length);
  const queue = [...seen.values()].filter((g) => (indegree.get(g.id) ?? 0) === 0).map((g) => g.id);
  let visited = 0;
  while (queue.length) {
    const id = queue.pop()!;
    visited++;
    for (const g of seen.values())
      if (g.depends_on.includes(id)) {
        indegree.set(g.id, (indegree.get(g.id) ?? 1) - 1);
        if (indegree.get(g.id) === 0) queue.push(g.id);
      }
  }
  if (visited !== seen.size) return null;
  return [...seen.values()];
}

/** Deterministic topological execution order: level-by-level Kahn, ready set
 *  sorted numerically by group id — the DAG's own order, not presentation order. */
function executionOrder(groups: DecomposeGroup[]): DecomposeGroup[] {
  const byId = new Map(groups.map((g) => [g.id, g]));
  const remaining = new Map(byId);
  const done = new Set<string>();
  const order: DecomposeGroup[] = [];
  while (remaining.size) {
    const ready = [...remaining.values()]
      .filter((g) => g.depends_on.every((d) => done.has(d) || !byId.has(d)))
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    if (!ready.length) break; // validated acyclic — defensive only
    for (const g of ready) {
      order.push(g);
      remaining.delete(g.id);
      done.add(g.id);
    }
  }
  for (const g of remaining.values()) order.push(g); // defensive: never drop a scenario
  return order;
}

/** Run Tier-1 review verdicts in BATCHED-DAG mode: the review decomposes into
 *  dependency-ordered sub-judgments (position-bias controlled decompose over
 *  permuted presentations); sub-judgments execute in the DAG's topological
 *  order and each receives the earlier verdicts as context — the precision
 *  upgrade on dependent concerns. Unusable decompose → LOUD deterministic
 *  fallback to independent sub-judgments; unusable calls keep the per-chunk
 *  loud-skip semantics. Verdict schema, floor and Tier-2 routing unchanged. */
export async function reviewVerdictsDag(
  backend: JudgeBackend,
  scenarios: ReviewScenario[],
  diffSummary: string,
  opts?: BatchedVerdictOptions & { decomposeRuns?: number }
): Promise<DagReviewResult> {
  const window = opts?.window ?? REVIEW_CONTEXT_WINDOW;
  const evidenceOf = (id: string) => opts?.evidence?.[id] ?? diffSummary;
  const runs = Math.max(1, opts?.decomposeRuns ?? 2);
  let calls = 0;
  let firstSkipReason: string | undefined;
  let degraded: string | undefined;

  // 1. Decompose over permuted presentations; the first VALID decomposition wins.
  let groups: DecomposeGroup[] | null = null;
  let decomposeCalls = 0;
  for (let run = 0; run < runs && !groups; run++) {
    const presented = permutePresentation(scenarios, run);
    const input =
      `${DECOMPOSE_INPUT_MARKER}: group the scenarios below into sub-judgments with depends_on edges.\n\n` +
      presented.map((s) => scenarioBlock(s, evidenceOf(s.id))).join("");
    decomposeCalls++;
    calls++;
    const v = await backend.classify(REVIEW_DECOMPOSE_SCHEMA, input);
    if (v.skipped) {
      firstSkipReason ??= v.reason ?? "decompose skipped (unspecified)";
      continue;
    }
    groups = parseDecomposition(v.value?.decomposition, scenarios.map((s) => s.id));
    if (!groups) firstSkipReason ??= "decompose response invalid (coverage/edges/cyclicity)";
  }
  if (!groups) {
    degraded =
      `decompose unusable (${firstSkipReason ?? "no valid decomposition"}) — fell back to independent sub-judgments`;
    groups = scenarios.map((s, i) => ({ id: `J${i + 1}`, scenarios: [s.id], depends_on: [] }));
  }

  // 2. Execute sub-judgments in the DAG's own order, each fed earlier verdicts.
  const header = batchHeader();
  const order = executionOrder(groups);
  const byId = new Map<string, ScenarioVerdict>();
  let anyUsable = false;
  for (const group of order) {
    const ids = group.scenarios;
    const executed = [...byId.values()];
    const contextSection = executed.length
      ? `Earlier verdicts (context — judge this group with them in view):\n` +
        executed.map((r) => `- ${r.scenario}: ${r.verdict} (confidence ${r.confidence})${r.evidence ? ` — ${r.evidence}` : ""}`).join("\n") +
        "\n\n"
      : "";
    const blocksLength = ids.reduce((n, id) => {
      const s = scenarios.find((x) => x.id === id)!;
      return n + scenarioBlock(s, evidenceOf(id)).length;
    }, 0);
    const filesBlock = fitFilesBlock(opts?.files ?? [], window - header.length - contextSection.length - blocksLength);
    const input =
      header + contextSection + filesBlock +
      ids
        .map((id) => scenarioBlock(scenarios.find((x) => x.id === id)!, evidenceOf(id)))
        .join("");
    calls++;
    const v = await backend.classify(batchVerdictSchema(ids), input);
    if (v.skipped) {
      const why = v.reason ?? "judge skipped (unspecified)";
      firstSkipReason ??= why;
      for (const id of ids)
        byId.set(id, { scenario: id, verdict: "uncertain", confidence: 0, skipped: true, reason: why });
      continue;
    }
    const parsed = parseFlatVerdicts(ids, v.value ?? {});
    for (const r of parsed.results) byId.set(r.scenario, r);
    anyUsable ||= parsed.anyUsable;
  }

  const results = scenarios.map((s) => byId.get(s.id)!).filter(Boolean);
  const skippedAll = !anyUsable && scenarios.length > 0;
  return {
    results,
    deepRead: results.filter((r) => r.verdict === "uncertain").map((r) => r.scenario),
    skippedAll,
    backend: backend.name,
    ...(skippedAll && firstSkipReason !== undefined ? { reason: firstSkipReason } : {}),
    calls,
    chunks: order.length,
    ...(degraded !== undefined ? { degraded } : {}),
  };
}

export default function register(pi: any): void {
  const agentsDir = path.join(__dirname, "..", "agents");
  const readFile = (name: string): string | null => {
    const p = path.join(agentsDir, `${name}.md`);
    try {
      return fs.readFileSync(p, "utf8");
    } catch {
      return null;
    }
  };

  // 1. @role: substitution at subagent dispatch time.
  pi.on("tool_call", async (event: any) => {
    if (event.toolName !== "subagent") return;
    const errors = resolveSubagentInput(event.input, readFile);
    if (errors.length) {
      return {
        block: true,
        reason: `pi-workflows: unresolved role reference(s): ${errors.join("; ")}. Fix the prompt or add agents/<role>.md.`,
      };
    }
    return undefined;
  });

  // 2. Hygiene watchdog — remind once per new drift state, never spam.
  //    Injection is via the RETURN value of before_agent_start
  //    ({ message: { customType, content, display } }) — verified against
  //    the pi extensions docs (event.injectMessage does NOT exist).
  let lastNotified: string = "";
  const supersedeRemindOnce = makeRemindOnce();
  pi.on("before_agent_start", async (event: any) => {
    try {
      const cwd = event?.cwd || process.cwd();
      const planPath = path.join(cwd, ".workflows", "plan.md");
      if (!fs.existsSync(planPath)) return undefined;
      const plan = fs.readFileSync(planPath, "utf8");

      // verdict/context-marker drift
      const reviewDir = path.join(cwd, ".workflows", "reviews");
      const reviewFiles: { name: string; content: string }[] = [];
      if (fs.existsSync(reviewDir)) {
        for (const name of fs.readdirSync(reviewDir)) {
          if (!name.endsWith(".md")) continue;
          reviewFiles.push({
            name,
            content: fs.readFileSync(path.join(reviewDir, name), "utf8"),
          });
        }
      }
      const hygiene = computeHygieneDrift(plan, reviewFiles);

      // docs-policy drift (git-based; degrades to changelogPending only
      // outside git)
      const exec = (cmd: string): string | null => {
        try {
          return execSync(cmd, {
            cwd,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 5000,
          }).trim();
        } catch {
          return null;
        }
      };
      /** Argument-array capture (no shell) — filenames are data, never
       *  interpolated shell syntax (quality review P2: backticks/$ in paths
       *  survived JSON.stringify's shell quoting). */
      const runCapture = (cmd: string, args: string[]): string | null => {
        try {
          const r = spawnSync(cmd, args, {
            cwd,
            encoding: "utf8",
            timeout: 5000,
            env: process.env, // live PATH/env — see runGate's Bun note
          });
          return r.status === 0 && typeof r.stdout === "string" ? r.stdout.trim() : null;
        } catch {
          return null;
        }
      };
      const listDocs = (): string[] => {
        const docsDir = path.join(cwd, "docs");
        if (!fs.existsSync(docsDir)) return [];
        return fs
          .readdirSync(docsDir)
          .filter((f) => f.endsWith(".md"))
          .map((f) => path.join("docs", f));
      };
      const docs = computeDocsDrift(plan, exec, listDocs);

      // Supersede watchdog — mechanical trigger only; the advisory line is
      // static text derived from contract metadata (owner: sign-off targets).
      const supersedeLine = ((): string | null => {
        try {
          const status = exec("git status --porcelain");
          if (!status) return null;
          const changedFiles = status
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0)
            .map((l) => l.replace(/^[A-Z?!]{1,2}\s+/, "").replace(/^.* -> /, ""))
            .filter((f) => f.length > 0)
            .slice(0, 15);
          const newAdrFiles = changedFiles.filter(
            (f) => /(^|\/)(adr|decisions)(\/|-)/i.test(f) || /(^|\/)adr[-_]/i.test(f)
          );
          const adrContractsByFile: Record<string, AdrContract[]> = {};
          for (const f of changedFiles) {
            const abs = path.join(cwd, f);
            if (!fs.existsSync(abs)) continue;
            const text = fs.readFileSync(abs, "utf8");
            if (!text.includes("@cc")) continue;
            // cc-check list is primary when available; textual scan is fallback.
            let contracts = parseCcCheckList(runCapture("cc-check", ["list", f]) || "");
            if (contracts.length === 0) contracts = parseAdrContracts(text);
            if (contracts.length > 0) adrContractsByFile[f] = contracts;
          }
          const changedSpecDecisions = changedFiles.filter((f) => {
            if (!f.endsWith(".spec")) return false;
            const abs = path.join(cwd, f);
            if (!fs.existsSync(abs)) return false;
            const head = runCapture("git", ["show", `HEAD:${f}`]);
            if (head === null) return false;
            return (
              extractDecisionsSection(head) !== extractDecisionsSection(fs.readFileSync(abs, "utf8"))
            );
          });
          const gaps = detectSupersedeGaps({
            changedFiles,
            adrContractsByFile,
            changedSpecDecisions,
            newAdrFiles,
          });
          return gaps.length > 0 ? supersedeAdvisoryLine(gaps[0]) : null;
        } catch {
          return null;
        }
      })();
      const supersedeFires = supersedeLine !== null && supersedeRemindOnce(supersedeLine);
      if (supersedeLine === null) supersedeRemindOnce("");

      const parts: string[] = [];
      if (hygiene.missingContextMarkers > 0)
        parts.push(`${hygiene.missingContextMarkers} ✅ task(s) missing a 'context:' marker`);
      if (hygiene.missingFinalVerdicts > 0)
        parts.push(`${hygiene.missingFinalVerdicts} ✅ task(s) without a final ok:true verdict on file`);
      if (docs.staleReadmeCount > 0)
        parts.push(
          `${docs.staleReadmeCount} code file(s) committed since README.md was last updated — check the DOCS-POLICY same-task rule`
        );
      if (docs.staleDocsCount > 0)
        parts.push(`${docs.staleDocsCount} docs/ file(s) older than recent code changes`);
      if (docs.changelogPending)
        parts.push(
          "plan complete — SHIP requires a CHANGELOG.md entry (orchestrator-written, /review Stage 3)"
        );

      // Dedupe on the boolean drift state — one reminder per episode,
      // not per count change.
      const key = JSON.stringify({
        m: hygiene.missingContextMarkers > 0,
        v: hygiene.missingFinalVerdicts > 0,
        r: docs.staleReadmeCount > 0,
        d: docs.staleDocsCount > 0,
        c: docs.changelogPending,
      });

      const hygieneFires = parts.length > 0 && key !== lastNotified;
      if (parts.length === 0) lastNotified = "";
      else if (hygieneFires) lastNotified = key;
      if (!hygieneFires && !supersedeFires) return undefined;
      const hygieneText = `[pi-workflows hygiene] ${parts.join("; ")} — run the sweep (see /review Layer 3/4).`;
      const content = hygieneFires
        ? supersedeFires
          ? `${hygieneText}\n${supersedeLine}`
          : hygieneText
        : supersedeLine!;
      return {
        message: {
          customType: hygieneFires ? "pi-workflows-hygiene" : "pi-workflows-supersede",
          content,
          display: true,
        },
      };
    } catch {
      // Watchdog must never break a turn.
      return undefined;
    }
  });

  // 5. Auto-gate hook (plan 20261025-015 D5) — write-time enforcement for
  //    code files under a live plan. Advisory channel: ctx.ui.notify (the
  //    example-sanctioned one-line warning), deduped per file via the
  //    watchdog remind-once pattern. Inert without .workflows/plan.md.
  const advisoryOnce = new Map<string, (key: string) => boolean>();
  pi.on("tool_call", async (event: any, ctx: any) => {
    try {
      if (event.toolName !== "write" && event.toolName !== "edit") return undefined;
      const filePath = event?.input?.path;
      if (typeof filePath !== "string" || filePath === "") return undefined;
      const cwd = ctx?.cwd || process.cwd();
      const planPath = path.join(cwd, ".workflows", "plan.md");
      if (!fs.existsSync(planPath)) return undefined; // hook inert without a live plan
      const plan = fs.readFileSync(planPath, "utf8");
      const file = toRepoRelative(cwd, filePath);
      if (file === null) return undefined;
      const decision = autoGate({
        // DEBUG-PW15

        file,
        plan,
        stageSpec: (contractPath: string): string | null => {
          try {
            const src = path.join(cwd, contractPath);
            if (!fs.existsSync(src)) return null;
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-workflows-gate-"));
            fs.copyFileSync(src, path.join(dir, path.basename(contractPath)));
            return dir;
          } catch {
            return null;
          }
        },
        run: (cmd: string, args: string[]) => runGate(cmd, args, cwd),
      });
      if (decision.action === "block") return { block: true, reason: decision.reason };
      if (decision.action === "allow" && decision.limitations?.length)
        return {
          block: false,
          reason: `auto-gate limitations: ${decision.limitations.join("; ")} (write proceeds)`,
        };
      if (decision.action === "advisory") {
        let once = advisoryOnce.get(decision.key);
        if (!once) {
          once = makeRemindOnce();
          advisoryOnce.set(decision.key, once);
        }
        if (once(decision.line) && typeof ctx?.ui?.notify === "function") {
          ctx.ui.notify(decision.line, "warning");
        }
        return { block: false }; // D5: toolchain absent ⇒ write proceeds
      }
      return undefined;
    } catch {
      // The gate must never break the write path itself.
      return undefined;
    }
  });

  // 6. Intent-guard suggestion hook (plan 20261026-030, 023 D5) —
  //    suggest-only routing for user prompts under a live plan. One judge
  //    call via the imported module (DEC-001: import for hooks); every
  //    failure path fails open to no message.
  pi.on("before_agent_start", async (event: any) => {
    try {
      if (!intentGuardApplies(event)) return undefined;
      const cwd = event?.cwd || process.cwd();
      const planPath = path.join(cwd, ".workflows", "plan.md");
      if (!fs.existsSync(planPath)) return undefined;
      const planText = fs.readFileSync(planPath, "utf8");
      const guard = await import("../scripts/intent-guard.mjs");
      if (guard.planTasks(planText).length === 0) return undefined; // no live tasks → inert
      const c = await guard.classify({ query: event.prompt, planText, threshold: 0.85 });
      appendIntentTrail(path.join(cwd, ".workflows", "intent", "trail.jsonl"), event.prompt, c);
      return intentGuardSuggest(c);
    } catch {
      // Fail-open: the guard suggests, never blocks.
      return undefined;
    }
  });

  // 7. dispatch_next tool (plan 20261026-036 D1) — the dispatcher as a
  //    model-callable tool: /next's dispatcher step collapses to one binding
  //    call. Zero arguments, read-only (annotations carry readOnlyHint),
  //    inert without a live plan — the payload is a structured ok:false, not
  //    a thrown error. The registry map is built internally from
  //    agents/registry.md; the model never hand-builds policy again.
  pi.registerTool({
    name: "dispatch_next",
    label: "Dispatch next task",
    description:
      "Deterministic /next dispatcher. Reads .workflows/plan.md, agents/registry.md and .workflows/reviews/*.md, then returns the BINDING next task. ok:true → { task, pack, gateCommands, eligible }: send pack verbatim as the worker's task text, run gateCommands before the verdict, and treat eligible (the earliest wave's members) as parallel-eligible when it has more than one entry. ok:false → { blocked, reason }: surface the reason to the human and stop (no-pending = plan complete). Read-only; without a live plan it returns ok:false with blocked 'no-plan'.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    async execute(
      _toolCallId: string,
      _params: Record<string, never>,
      _signal: AbortSignal | undefined,
      _onUpdate: unknown,
      ctx: any
    ) {
      const payload = dispatchNext({ cwd: ctx?.cwd || process.cwd() });
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        details: payload,
      };
    },
  });

  // 8. Verdict automation (plan 20261026-036 D2/D3) — records + wave-settle
  //    compaction on FINAL verdict writes. A separate registration branch on
  //    the same tool_call stream (the auto-gate is inert on review .md — no
  //    shared state): it matches only .workflows/reviews/<task-id>.md writes,
  //    never blocks, and skips silently when the record CLIs are absent.
  const recordedVerdicts = new Set<string>(); // <task-id>:<content hash> — once per task:round
  const settledWaves = new Set<string>(); // <plan-id>:<wave> — compaction once per wave
  let waveSettleInjection: string | null = null;

  /** Script resolution for the record CLIs: an explicit override dir (env,
   *  test seam) wins, then the live repo's scripts/, then the package's own
   *  (installed-package users record with the shipped CLIs). null = absent =
   *  documented degradation (skip silently). */
  const resolveScript = (cwd: string, name: string): string | null => {
    const override = process.env.PI_WORKFLOWS_SCRIPTS_DIR;
    const candidates = override
      ? [path.join(override, name)]
      : [path.join(cwd, "scripts", name), path.join(__dirname, "..", "scripts", name)];
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) return p;
      } catch {
        // unreadable candidate — keep looking
      }
    }
    return null;
  };

  /** Argument-array capture (runCapture/runGate's sibling — no shell, data
   *  never interpolated); null when the process could not run. `env` is
   *  pinned live — see runGate's Bun note (record CLIs read RECORD_SPY etc.
   *  from the spawn-time environment). */
  const runScript = (
    script: string,
    args: string[],
    cwd: string,
    timeoutMs: number
  ): { code: number; stdout: string; stderr: string } | null => {
    try {
      const r = spawnSync(process.execPath, [script, ...args], {
        cwd,
        encoding: "utf8",
        timeout: timeoutMs,
        env: process.env,
      });
      if (r.error) return null;
      return {
        code: r.status ?? 1,
        stdout: typeof r.stdout === "string" ? r.stdout : "",
        stderr: typeof r.stderr === "string" ? r.stderr : "",
      };
    } catch {
      return null;
    }
  };

  pi.on("tool_call", async (event: any, ctx: any) => {
    try {
      if (event.toolName !== "write" && event.toolName !== "edit") return undefined;
      const input = event?.input ?? {};
      // The material the write will land: content for write, the new text of
      // each hunk for edit (reviews are written wholesale; the edit path is
      // the safety net for appended verdict blocks).
      const material =
        typeof input.content === "string"
          ? input.content
          : Array.isArray(input.edits)
            ? input.edits
                .map((e: any) => (typeof e?.newText === "string" ? e.newText : ""))
                .join("\n")
            : "";
      if (!material) return undefined;
      const cwd = ctx?.cwd || process.cwd();
      const file = toRepoRelative(cwd, typeof input.path === "string" ? input.path : "");
      if (file === null) return undefined;
      const verdict = parseVerdictWrite(file, material);
      if (verdict === null) return undefined;
      const planPath = path.join(cwd, ".workflows", "plan.md");
      if (!fs.existsSync(planPath)) return undefined; // inert without a live plan
      const plan = fs.readFileSync(planPath, "utf8");
      // Dedupe FIRST (watchdog pattern): the content hash is the round — a
      // second identical FINAL write is a no-op; a changed verdict is a new
      // round and records again.
      const dedupeKey = `${verdict.taskId}:${createHash("sha256")
        .update(material)
        .digest("hex")}`;
      if (recordedVerdicts.has(dedupeKey)) return undefined;
      recordedVerdicts.add(dedupeKey);

      const planId = parseProvenance(plan).planId;
      const tasks = parsePlan(plan);
      const task = tasks.find((t) => t.id === verdict.taskId);

      // Records (D2). An orphan review (task not in the plan, or a plan
      // without a Plan ID) has no verify command to prove and skips silently.
      if (planId && task) {
        const argvs = recordArgvs({
          planId,
          taskId: verdict.taskId,
          verify: task.verify,
          contractPath: task.contractPath,
          ok: verdict.ok,
        });
        const proof = resolveScript(cwd, "proof-ledger.mjs");
        // proof-ledger re-runs the Verify suite to hash its output — long
        // timeout; journal is a plain append — short. Failures are swallowed:
        // records are post-write side effects, never a block.
        if (proof && task.verify) runScript(proof, argvs.proof, cwd, 120_000);
        const journal = resolveScript(cwd, "run-journal.mjs");
        if (journal) runScript(journal, argvs.journal, cwd, 30_000);
      }

      // Wave-settle compaction (D3) — exactly when the LAST pending task of
      // the wave gains its FINAL verdict (all wave tasks settled on file),
      // once per plan:wave. The current write is overlaid — the hook runs
      // before the write lands.
      if (planId && task) {
        const reviewsDir = path.join(cwd, ".workflows", "reviews");
        const reviewFiles: { name: string; content: string }[] = fs.existsSync(reviewsDir)
          ? fs
              .readdirSync(reviewsDir)
              .filter((f) => f.endsWith(".md"))
              .map((f) => ({
                name: f,
                content: fs.readFileSync(path.join(reviewsDir, f), "utf8"),
              }))
          : [];
        const withCurrent = [
          ...reviewFiles.filter((f) => f.name !== `${verdict.taskId}.md`),
          { name: `${verdict.taskId}.md`, content: material },
        ];
        const children = waveSettledChildren(tasks, task.wave, withCurrent);
        const waveKey = `${planId}:${task.wave}`;
        if (children !== null && !settledWaves.has(waveKey)) {
          settledWaves.add(waveKey);
          const judge = resolveScript(cwd, "judge.mjs");
          if (judge !== null) {
            const audit = path.join(cwd, ".workflows", "judge-audit.jsonl");
            const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pi-workflows-wave-"));
            const qfile = path.join(tmp, "questions.json");
            const rows: { id: string; verdict: string }[] = [];
            let skipped = false;
            for (const chunk of splitQuestions(buildWaveQuestions(children))) {
              fs.writeFileSync(qfile, JSON.stringify(chunk));
              const r = runScript(
                judge,
                ["ask", "--questions", qfile, "--audit", audit],
                cwd,
                60_000
              );
              const parsed =
                r !== null && !/JUDGE SKIPPED/.test(r.stderr)
                  ? parseJudgeRows(r.stdout)
                  : null;
              if (parsed === null) {
                skipped = true;
                break;
              }
              rows.push(...parsed);
            }
            try {
              fs.rmSync(tmp, { recursive: true, force: true });
            } catch {
              // tmp cleanup is best-effort
            }
            waveSettleInjection = skipped
              ? fallbackNote(task.wave, children)
              : verdictTable(task.wave, children, rows);
          }
        }
      }
      return undefined; // the verdict branch never blocks the write
    } catch {
      // Records/compaction must never break the write path.
      return undefined;
    }
  });

  // Wave-settle injection — the existing before_agent_start pattern: return
  // the queued compaction once, then clear (one message per settled wave).
  pi.on("before_agent_start", async () => {
    if (waveSettleInjection === null) return undefined;
    const content = waveSettleInjection;
    waveSettleInjection = null;
    return {
      message: {
        customType: "pi-workflows-wave-settle",
        content,
        display: true,
      },
    };
  });
}
