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
  /** Token accounting surfaced from the endpoint's `usage` (plan 077 T1):
   *  per-review cost is data, not an assumption. Present only when the
   *  endpoint returned it. */
  usage?: { input_tokens?: number; thinking_tokens?: number };
}

/** Per-call options (plan 077 T1): `images` are Base64 data URIs passed
 *  through to the endpoint (≤8 per call, ≤10MB each — violations are a LOUD
 *  skip before any network call). Consumers arrive later; the transport
 *  carries them now. */
export interface BackendCall {
  images?: string[];
}

/** The judge-backend seam (plan 20261117-076 owner steering): classification
 *  goes through classify(schema, input) — no schema/endpoint/key specifics
 *  leak past this shape. TypeLLM is the first implementation; a Jev backend
 *  (Phase 2 candidate) slots in without touching the triage. */
export interface JudgeBackend {
  name: string;
  classify(schema: object, input: string, call?: BackendCall): Promise<TriageVerdict>;
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

/** Validate a response `output` against the schema subset the judge uses:
 *  type string|number|integer|boolean, nullable ("null" in the type array or
 *  `nullable: true`), enum membership, minimum/maximum, required, arrays of
 *  items with minItems/maxItems, nested objects. A null passes ONLY against
 *  a nullable field (native abstention); anything else is a loud skip. */
function validateSchemaValue(
  schema: any,
  value: unknown
): { ok: true; value: any } | { ok: false; why: string } {
  if (!schema || typeof schema !== "object") return { ok: false, why: "schema is not an object" };
  const nullable = Array.isArray(schema.type) ? schema.type.includes("null") : schema.nullable === true;
  if (value === null) {
    if (nullable) return { ok: true, value: null };
    return { ok: false, why: "schema: null is not an allowed answer (field is not nullable)" };
  }
  const type = Array.isArray(schema.type) ? schema.type.find((t: unknown) => t !== "null") : schema.type;
  if (type === "object") {
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
  if (type === "array") {
    if (!Array.isArray(value)) return { ok: false, why: "schema: expected an array" };
    if (typeof schema.minItems === "number" && value.length < schema.minItems)
      return { ok: false, why: `schema: array has ${value.length} items, below minItems ${schema.minItems}` };
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems)
      return { ok: false, why: `schema: array has ${value.length} items, above maxItems ${schema.maxItems}` };
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        const check = validateSchemaValue(schema.items, value[i]);
        if (!check.ok) return { ok: false, why: `schema: array item ${i}: ${check.why}` };
      }
    }
    return { ok: true, value };
  }
  if (type === "string") {
    if (typeof value !== "string") return { ok: false, why: `schema: expected string, got ${typeof value}` };
    if (Array.isArray(schema.enum) && !schema.enum.includes(value))
      return { ok: false, why: `schema: value '${value}' is outside the enum` };
    return { ok: true, value };
  }
  if (type === "number" || type === "integer") {
    if (typeof value !== "number" || !Number.isFinite(value))
      return { ok: false, why: `schema: expected finite number, got ${typeof value}` };
    if (type === "integer" && !Number.isInteger(value))
      return { ok: false, why: `schema: expected an integer, got ${value}` };
    if (typeof schema.minimum === "number" && value < schema.minimum)
      return { ok: false, why: `schema: number ${value} below minimum ${schema.minimum}` };
    if (typeof schema.maximum === "number" && value > schema.maximum)
      return { ok: false, why: `schema: number ${value} above maximum ${schema.maximum}` };
    return { ok: true, value };
  }
  if (type === "boolean") {
    if (typeof value !== "boolean") return { ok: false, why: `schema: expected boolean, got ${typeof value}` };
    return { ok: true, value };
  }
  return { ok: false, why: `schema: unsupported type '${String(type)}'` };
}

/** Map a JSON-schema object onto the TypeLLM NATIVE question shape (plan 077
 *  T1 surface): per field {type, enum?, instructions?, nullable?, items?,
 *  minItems?, maxItems?, return_probabilities?, permutations?, thinking?,
 *  thinking_budget?}. Nullable types (\["T","null"\] or `nullable: true`) map
 *  to the native no-answer abstention; probabilities and thinking are opt-in
 *  schema-field options. Returns null (caller skips loudly) on any property
 *  the transport cannot express. */
function questionsOf(schema: any): Record<string, unknown> | null {
  if (schema?.type !== "object" || !schema.properties) return null;
  const questions: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries<any>(schema.properties)) {
    const type = Array.isArray(prop.type) ? prop.type.find((t: unknown) => t !== "null") : prop.type;
    const nullable = Array.isArray(prop.type) ? prop.type.includes("null") : prop.nullable === true;
    if (type !== "string" && type !== "number" && type !== "integer" && type !== "boolean" && type !== "object" && type !== "array")
      return null;
    const q: Record<string, unknown> = {
      type,
      instructions:
        (typeof prop.description === "string" && prop.description.trim()) ||
        `Value of the '${key}' field.`,
    };
    if (nullable) q.nullable = true;
    if (Array.isArray(prop.enum)) q.enum = prop.enum;
    if (type === "array") {
      const items = prop.items;
      if (items && typeof items === "object") {
        if (items.type === "object" && items.properties) {
          const itemQuestions = questionsOf(items);
          if (itemQuestions)
            q.items = {
              type: "object",
              properties: itemQuestions,
              ...(Array.isArray(items.required) ? { required: items.required } : {}),
            };
        } else {
          const itemType = Array.isArray(items.type) ? items.type.find((t: unknown) => t !== "null") : items.type;
          if (itemType === "string" || itemType === "number" || itemType === "integer" || itemType === "boolean")
            q.items = {
              type: itemType,
              ...(Array.isArray(items.enum) ? { enum: items.enum } : {}),
            };
        }
      }
      if (typeof prop.minItems === "number") q.minItems = prop.minItems;
      if (typeof prop.maxItems === "number") q.maxItems = Math.min(prop.maxItems, 200);
    }
    if (type === "object" && prop.properties && typeof prop.properties === "object") {
      const nested = questionsOf(prop);
      if (nested) q.properties = nested;
    }
    const probs = prop.probabilities;
    if (probs && typeof probs === "object") {
      q.return_probabilities = true;
      if (typeof probs.permutations === "number") q.permutations = probs.permutations;
      if (Array.isArray(probs.levels)) q.levels = probs.levels;
    }
    const thinking = prop.thinking;
    if (thinking && typeof thinking === "object") {
      q.thinking = true;
      if (typeof thinking.budget === "number") q.thinking_budget = thinking.budget;
    }
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
    async classify(schema: object, input: string, call?: BackendCall): Promise<TriageVerdict> {
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
      // images (plan 077 T1 native surface): Base64 data URIs, ≤8 per call,
      // ≤10MB each — every violation is a LOUD skip BEFORE any network call.
      let images: string[] | undefined;
      if (call?.images !== undefined) {
        if (!Array.isArray(call.images) || call.images.length === 0)
          return { skipped: true, bucket: null, confidence: 0, reason: "images: must be a non-empty array of data URIs" };
        if (call.images.length > 8)
          return { skipped: true, bucket: null, confidence: 0, reason: `images: ${call.images.length} given, the endpoint accepts at most 8 per call` };
        for (const uri of call.images) {
          if (typeof uri !== "string" || !uri.startsWith("data:") || !uri.includes(";base64,"))
            return { skipped: true, bucket: null, confidence: 0, reason: "images: every image must be a Base64 data URI" };
          const payload = uri.slice(uri.indexOf(";base64,") + ";base64,".length);
          const bytes = Math.floor((payload.length * 3) / 4);
          if (bytes > 10 * 1024 * 1024)
            return { skipped: true, bucket: null, confidence: 0, reason: `images: an image exceeds the 10MB per-image cap` };
        }
        images = call.images;
      }
      const endpoint = `${baseUrl}/v1/generate`;
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), timeoutMs);
      let res: Response;
      let body: string;
      try {
        res = await (deps?.fetchImpl ?? fetch)(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
          body: JSON.stringify({ context: input, questions, ...(images !== undefined ? { images } : {}) }),
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
      const usage =
        parsed.usage && typeof parsed.usage === "object"
          ? {
              ...(Number.isFinite(parsed.usage.input_tokens) ? { input_tokens: parsed.usage.input_tokens } : {}),
              ...(Number.isFinite(parsed.usage.thinking_tokens) ? { thinking_tokens: parsed.usage.thinking_tokens } : {}),
            }
          : undefined;
      return {
        skipped: false,
        bucket: typeof out.bucket === "string" ? (out.bucket as TriageBucket) : null,
        value: out,
        confidence,
        ...(evidence !== undefined ? { evidence } : {}),
        ...(usage !== undefined && Object.keys(usage).length > 0 ? { usage } : {}),
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

/* ── 9a. The 073 sieve gate on the seam (plan 20261118-078 T1 — consolidation) ──
 *  The proposal-entry sieve (plan 20261117-073) predates the seam: its four
 *  forced choices were answered BY HAND from the doctrine gate pinned in the
 *  proposal-entry skills (idea/plan/add-feature/prototype — tests/prompt-
 *  doctrine.test.ts T1). This gives the sieve its code surface ON the seam:
 *  same vocabulary, same pure outcome rules, same confidence floor, same
 *  loud-skip — one backend everywhere. The judge classifies the forced cells;
 *  the outcome rules stay deterministic code, byte-identical to the doctrine
 *  gate. A skip or below-floor verdict routes to the hand-answered doctrine
 *  path LOUDLY — the gate never closes silently on the judge's word alone,
 *  and the doctrine blocks remain the primary gate. */

/** The 073 forced-choice vocabulary (byte-identical to the doctrine gate:
 *  tests/prompt-doctrine.test.ts pins the exact table these mirror). */
export const SIEVE_VALUE = ["nice-to-have", "useful", "valuable", "must-have"] as const;
export const SIEVE_RISK = ["trivial", "contained", "serious", "severe"] as const;
export const SIEVE_EFFORT = ["xs", "s", "m", "l"] as const;
export const SIEVE_PATH = ["research", "inspect", "grill", "none"] as const;
export const SIEVE_OUTCOMES = ["park", "build-direct", "propose"] as const;
export type SieveValue = (typeof SIEVE_VALUE)[number];
export type SieveRisk = (typeof SIEVE_RISK)[number];
export type SieveEffort = (typeof SIEVE_EFFORT)[number];
export type SievePath = (typeof SIEVE_PATH)[number];
export type SieveOutcome = (typeof SIEVE_OUTCOMES)[number];

/** The pure outcome rules, mirrored 1:1 from the doctrine gate (plan 073's
 *  normative grammar): nice-to-have/useful + standalone → park; severe → park
 *  plus a decompose flag; valuable/must-have + xs → build-direct; else
 *  propose. No weighting, one pass — the judge never invents outcomes. */
export function sieveOutcome(cells: {
  value: SieveValue;
  risk: SieveRisk;
  effort: SieveEffort;
  standalone: boolean;
}): { outcome: SieveOutcome; decomposeFlag: boolean } {
  if (cells.risk === "severe") return { outcome: "park", decomposeFlag: true };
  if ((cells.value === "nice-to-have" || cells.value === "useful") && cells.standalone)
    return { outcome: "park", decomposeFlag: false };
  if ((cells.value === "valuable" || cells.value === "must-have") && cells.effort === "xs")
    return { outcome: "build-direct", decomposeFlag: false };
  return { outcome: "propose", decomposeFlag: false };
}

/** The sieve classification schema: the four forced cells + the standalone
 *  bit the park rule reads + the seam's standard confidence/evidence pair. */
export const SIEVE_SCHEMA = {
  type: "object",
  properties: {
    value: {
      type: "string",
      enum: SIEVE_VALUE,
      description: "V value cell — how much the ask matters: nice-to-have, useful, valuable, or must-have.",
    },
    risk: {
      type: "string",
      enum: SIEVE_RISK,
      description: "R risk cell — the blast radius if it goes wrong or grows: trivial, contained, serious, or severe.",
    },
    effort: {
      type: "string",
      enum: SIEVE_EFFORT,
      description: "E effort cell — xs an afternoon, s 1-2 days, m days, l a project.",
    },
    path: {
      type: "string",
      enum: SIEVE_PATH,
      description: "path cell — what the ask needs before a verdict: research, inspect, grill, or none.",
    },
    standalone: {
      type: "boolean",
      description:
        "true when the ask is standalone work on its own; false when it is part of a larger in-flight effort.",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description:
        "0-1 confidence in the forced cells. 0.9+ only when the ask unambiguously fits one cell per column.",
    },
    evidence: {
      type: "string",
      description: "One short line citing the words in the ask that drove the cells.",
    },
  },
  required: ["value", "risk", "effort", "path", "standalone", "confidence"],
  additionalProperties: false,
} as const;

export interface SieveCells {
  value: SieveValue;
  risk: SieveRisk;
  effort: SieveEffort;
  path: SievePath;
  standalone: boolean;
}

/** One sieve verdict. skipped/defaultPath=true is LOUD (`reason` names why):
 *  the doctrine gate answered by hand applies — never a silent pass. */
export interface SieveVerdict {
  skipped: boolean;
  outcome: SieveOutcome | null;
  decomposeFlag: boolean;
  cells: SieveCells | null;
  confidence: number;
  evidence?: string;
  reason?: string;
  defaultPath: boolean;
  backend: string;
}

/** The judge's input: the forced-choice framing over the ask (the harness
 *  replays this exact construction). */
export function sieveInput(ask: string): string {
  return (
    "Answer the 073 sieve gate for the proposal ask below: four forced choices " +
    "(V value, R risk, E effort, path) plus whether the ask is standalone work. " +
    "One pass, no weighting.\n\nProposal ask:\n" +
    ask
  );
}

/** Cells validated against the vocabulary — anything outside it is a loud
 *  skip, never a guess. */
function sieveCellsOf(value: unknown): SieveCells | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const cell = (x: unknown, vocab: readonly string[]): string | null =>
    typeof x === "string" && (vocab as readonly string[]).includes(x) ? x : null;
  const valueCell = cell(v.value, SIEVE_VALUE);
  const riskCell = cell(v.risk, SIEVE_RISK);
  const effortCell = cell(v.effort, SIEVE_EFFORT);
  const pathCell = cell(v.path, SIEVE_PATH);
  if (!valueCell || !riskCell || !effortCell || !pathCell || typeof v.standalone !== "boolean") return null;
  return {
    value: valueCell as SieveValue,
    risk: riskCell as SieveRisk,
    effort: effortCell as SieveEffort,
    path: pathCell as SievePath,
    standalone: v.standalone,
  };
}

/** Classify one proposal ask through the seam (same key order, same
 *  loud-skip, same confidence floor as every other judge call): the judge
 *  answers the four forced cells; the outcome rules run deterministically.
 *  A backend skip or schema-invalid cells → defaultPath (the hand-answered
 *  doctrine gate applies, reason surfaced); below-floor keeps the cells for
 *  visibility but still routes to the default path, loudly. */
export async function sieveProposal(backend: JudgeBackend, ask: string): Promise<SieveVerdict> {
  const v = await backend.classify(SIEVE_SCHEMA, sieveInput(ask));
  const confidence = typeof v.confidence === "number" ? v.confidence : 0;
  if (v.skipped)
    return {
      skipped: true,
      outcome: null,
      decomposeFlag: false,
      cells: null,
      confidence: 0,
      reason: v.reason ?? "judge skipped (unspecified)",
      defaultPath: true,
      backend: backend.name,
    };
  const cells = sieveCellsOf(v.value);
  if (!cells)
    return {
      skipped: true,
      outcome: null,
      decomposeFlag: false,
      cells: null,
      confidence,
      reason: "schema-invalid response: forced cells missing or outside the vocabulary",
      defaultPath: true,
      backend: backend.name,
    };
  const rules = sieveOutcome(cells);
  if (confidence < TRIAGE_CONFIDENCE_FLOOR)
    return {
      skipped: false,
      outcome: rules.outcome,
      decomposeFlag: rules.decomposeFlag,
      cells,
      confidence,
      ...(v.evidence !== undefined ? { evidence: v.evidence } : {}),
      reason: `below confidence floor (${confidence} < ${TRIAGE_CONFIDENCE_FLOOR}) — the hand-answered gate applies`,
      defaultPath: true,
      backend: backend.name,
    };
  return {
    skipped: false,
    outcome: rules.outcome,
    decomposeFlag: rules.decomposeFlag,
    cells,
    confidence,
    ...(v.evidence !== undefined ? { evidence: v.evidence } : {}),
    defaultPath: false,
    backend: backend.name,
  };
}

/** The entry-gate rendering — the doctrine gate's table grammar with the
 *  judged cells and the pure outcome that fired. A skip prints LOUD with the
 *  hand-answered remediation named. */
export function renderSieveVerdict(ask: string, v: SieveVerdict): string {
  const lines: string[] = [
    `SIEVE GATE (073 forced-choice vocabulary, judged via the seam) — ask: ${ask}`,
  ];
  if (!v.cells) {
    lines.push(
      `JUDGE SKIPPED (${v.reason ?? "unspecified"}) — answer the four forced choices by hand (the doctrine gate applies)`
    );
    return lines.join("\n");
  }
  lines.push("| Cell | Verdict |", "|---|---|");
  lines.push(`| V value | ${v.cells.value} |`);
  lines.push(`| R risk | ${v.cells.risk} |`);
  lines.push(`| E effort | ${v.cells.effort} |`);
  lines.push(`| path | ${v.cells.path} |`);
  lines.push(`| standalone | ${v.cells.standalone} |`);
  lines.push(`Outcome: ${v.outcome}${v.decomposeFlag ? " + decompose flag" : ""}`);
  if (v.defaultPath && v.reason) lines.push(`DEFAULT PATH — ${v.reason}`);
  return lines.join("\n");
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
      // plan 077 T1: nullable (\["string","null"\]) — the NATIVE no-answer
      // abstention. A null verdict is the architectural no-answer (mapped to
      // uncertain + Tier 2 downstream), not prompt-instructed uncertainty —
      // the v08 confident-wrong residual's designed fix.
      type: ["string", "null"],
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
 *  uncertain verdict — judge's own, a native null abstention, below-floor,
 *  or skip — routes to Tier 2. `probabilities` (plan 077 T1) surfaces the
 *  native position-bias-averaged option distribution when the endpoint
 *  returned one. */
export interface ScenarioVerdict {
  scenario: string;
  verdict: ReviewVerdict;
  confidence: number;
  evidence?: string;
  probabilities?: Record<string, number>;
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
    const probabilities =
      v.value?.probabilities && typeof v.value.probabilities === "object"
        ? (Object.fromEntries(
            Object.entries(v.value.probabilities as Record<string, unknown>).filter(
              (entry): entry is [string, number] => typeof entry[1] === "number"
            )
          ) as Record<string, number>)
        : undefined;
    if (verdict === null) {
      // native no-answer abstention (plan 077 T1): an honest "I cannot
      // decide" — routes to Tier 2, never a guess, never a transport skip.
      deepRead.push(scenario.id);
      results.push({
        scenario: scenario.id,
        verdict: "uncertain",
        confidence: typeof v.confidence === "number" ? v.confidence : 0,
        ...(probabilities !== undefined ? { probabilities } : {}),
        ...(v.evidence !== undefined ? { evidence: v.evidence } : {}),
        reason: "nullable abstention (native no-answer) — Tier 2 deep-read",
      });
      continue;
    }
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
        ...(probabilities !== undefined ? { probabilities } : {}),
        ...(v.evidence !== undefined ? { evidence: v.evidence } : {}),
        reason: `below confidence floor (${confidence} < ${TRIAGE_CONFIDENCE_FLOOR}) — Tier 2 deep-read`,
      });
      continue;
    }
    results.push({
      scenario: scenario.id,
      verdict: verdict as ReviewVerdict,
      confidence,
      ...(probabilities !== undefined ? { probabilities } : {}),
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
 *  the loud-skip doctrine and renderVerdictTable are untouched.
 *
 *  Plan 077 Task 1 (native surface): the per-scenario verdicts ride ONE
 *  native array-of-objects question ({verdicts: [{id, verdict, confidence,
 *  evidence}]}, native minItems/maxItems ≤200) — the flat
 *  {scenarioId}_verdict/_confidence/_evidence key encoding is DELETED.
 *  Position-bias control is NATIVE: the verdicts question carries
 *  {return_probabilities, permutations} and the endpoint averages over
 *  balanced option orders — the hand-rolled 2-call decompose permutation
 *  loop is DELETED (decompose runs once). The context window is the native
 *  128K (chars — a conservative proxy; chunking only fires beyond it).
 *  Nullable verdicts (\["string","null"\]) give the architectural no-answer:
 *  a null row verdict maps to uncertain + Tier 2. `usage` token accounting
 *  is surfaced on results. */

/** Context-window cap for one batched call, in characters (plan 077 T1: the
 *  native 128K window — ~4 chars/token keeps a 128K-char call safely inside
 *  the endpoint's 128K-token context; chunking only fires beyond this). */
export const REVIEW_CONTEXT_WINDOW = 128_000;

/** Stable prefix of the batch input header — the harness's recorded replay
 *  keys batch inputs off it (the same seam the decompose marker rides). */
export const BATCH_HEADER_PREFIX = "Review judge:";

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
  /** Token accounting summed across the runner's calls (plan 077 T1);
   *  present only when at least one call returned usage. */
  usage?: { input_tokens?: number; thinking_tokens?: number };
}

export interface DagReviewResult extends BatchedReviewResult {
  /** Named when the decompose step was unusable and the runner fell back to
   *  independent sub-judgments — degraded context flow, never a silent pass. */
  degraded?: string;
}

function batchHeader(): string {
  return (
    `${BATCH_HEADER_PREFIX} judge every scenario below on the evidence (diff summary + files). ` +
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

/** The batch schema for one call (plan 077 T1 native surface): ONE
 *  array-of-objects question — per-scenario rows {id, verdict, confidence,
 *  evidence} with native minItems/maxItems (≤200, the endpoint cap) and
 *  NATIVE position-bias control {return_probabilities, permutations} on the
 *  question. Nothing REQUIRED at the object level: a missing/short array
 *  degrades the scenarios it does not cover, loudly, one per missing id —
 *  never the whole call. */
export function batchVerdictSchema(scenarioIds: string[]): object {
  return {
    type: "object",
    properties: {
      verdicts: {
        type: "array",
        description:
          `One verdict row per scenario id (${scenarioIds.join(", ")}) — exactly one row per id. ` +
          `${CALIBRATION_INSTRUCTION} A null verdict means you cannot decide (honest abstention).`,
        minItems: 1,
        maxItems: 200,
        probabilities: { permutations: 2 },
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "The scenario id this row answers." },
            verdict: {
              type: ["string", "null"],
              enum: REVIEW_VERDICTS,
              description: `Verdict for this scenario: pass/fail/uncertain, or null when you cannot decide. ${CALIBRATION_INSTRUCTION}`,
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "0-1 confidence in this row's verdict.",
            },
            evidence: {
              type: "string",
              description: "One short quote that drove this row's verdict.",
            },
          },
          required: ["id", "verdict"],
        },
      },
    },
    required: [],
    additionalProperties: false,
  };
}

/** Parse one call's native verdict ROWS into per-scenario verdicts — same
 *  enum/floor/skip semantics as before, per scenario: a missing row id →
 *  that scenario loud-skips; a null verdict → honest abstention (uncertain,
 *  Tier 2); an enum-invalid verdict → loud skip for that scenario; below-
 *  floor confidence → uncertain + Tier 2. Row `probabilities` (native,
 *  position-bias-averaged) are surfaced when present. */
function parseVerdictRows(ids: string[], value: Record<string, unknown>): {
  results: ScenarioVerdict[];
  anyUsable: boolean;
} {
  const rows = Array.isArray(value.verdicts) ? (value.verdicts as unknown[]) : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id === "string" && !byId.has(r.id)) byId.set(r.id, r);
  }
  const results: ScenarioVerdict[] = [];
  let anyUsable = false;
  for (const id of ids) {
    const row = byId.get(id);
    if (!row) {
      results.push({
        scenario: id,
        verdict: "uncertain",
        confidence: 0,
        skipped: true,
        reason: `batch response missing verdict row for ${id}`,
      });
      continue;
    }
    const verdict = row.verdict;
    const probabilities =
      row.probabilities && typeof row.probabilities === "object"
        ? (Object.fromEntries(
            Object.entries(row.probabilities as Record<string, unknown>).filter(
              (entry): entry is [string, number] => typeof entry[1] === "number"
            )
          ) as Record<string, number>)
        : undefined;
    if (verdict === null) {
      // native no-answer abstention — honest uncertain, routes to Tier 2
      const confidence = typeof row.confidence === "number" && Number.isFinite(row.confidence) ? row.confidence : 0;
      const evidence = typeof row.evidence === "string" ? (row.evidence as string) : undefined;
      results.push({
        scenario: id,
        verdict: "uncertain",
        confidence,
        ...(probabilities !== undefined ? { probabilities } : {}),
        ...(evidence !== undefined ? { evidence } : {}),
        reason: "nullable abstention (native no-answer) — Tier 2 deep-read",
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
    const rawConfidence = row.confidence;
    const confidence = typeof rawConfidence === "number" && Number.isFinite(rawConfidence) ? rawConfidence : 0;
    const evidence = typeof row.evidence === "string" ? (row.evidence as string) : undefined;
    if (confidence < TRIAGE_CONFIDENCE_FLOOR) {
      results.push({
        scenario: id,
        verdict: "uncertain",
        confidence,
        ...(probabilities !== undefined ? { probabilities } : {}),
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
      ...(probabilities !== undefined ? { probabilities } : {}),
      ...(evidence !== undefined ? { evidence } : {}),
    });
  }
  return { results, anyUsable };
}

/** Usage accumulator: sums input/thinking tokens across a runner's calls;
 *  surfaces on the result only when at least one call returned usage. */
function usageAccumulator() {
  let input = 0;
  let thinking = 0;
  let saw = false;
  return {
    add(u: { input_tokens?: number; thinking_tokens?: number } | undefined) {
      if (!u) return;
      saw = true;
      if (Number.isFinite(u.input_tokens)) input += u.input_tokens as number;
      if (Number.isFinite(u.thinking_tokens)) thinking += u.thinking_tokens as number;
    },
    value(): { input_tokens?: number; thinking_tokens?: number } | undefined {
      return saw ? { input_tokens: input, thinking_tokens: thinking } : undefined;
    },
  };
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
  const usage = usageAccumulator();
  for (const chunk of chunks) {
    const ids = chunk.map((s) => s.id);
    const input = prefix + chunk.map((s) => scenarioBlock(s, evidenceOf(s.id))).join("");
    const v = await backend.classify(batchVerdictSchema(ids), input);
    usage.add(v.usage);
    if (v.skipped) {
      const why = v.reason ?? "judge skipped (unspecified)";
      firstSkipReason ??= why;
      for (const id of ids)
        byId.set(id, { scenario: id, verdict: "uncertain", confidence: 0, skipped: true, reason: why });
      continue;
    }
    const parsed = parseVerdictRows(ids, v.value ?? {});
    for (const r of parsed.results) byId.set(r.scenario, r);
    anyUsable ||= parsed.anyUsable;
  }
  const results = scenarios.map((s) => byId.get(s.id)!).filter(Boolean);
  const skippedAll = !anyUsable && scenarios.length > 0;
  const usageOut = usage.value();
  return {
    results,
    deepRead: results.filter((r) => r.verdict === "uncertain").map((r) => r.scenario),
    skippedAll,
    backend: backend.name,
    ...(skippedAll && firstSkipReason !== undefined ? { reason: firstSkipReason } : {}),
    calls: chunks.length,
    chunks: chunks.length,
    ...(usageOut !== undefined ? { usage: usageOut } : {}),
  };
}

/* ── DAG decompose — dependency-ordered sub-judgments ──
 *  Plan 077 T1: the hand-rolled 2-call presentation-permutation loop
 *  (reverse + rotate-1, `permutePresentation`) is DELETED — position-bias
 *  control is NATIVE now ({return_probabilities, permutations} on the
 *  verdicts question, averaged endpoint-side over balanced option orders).
 *  Decompose runs ONCE; an unusable decomposition keeps the LOUD
 *  deterministic fallback to independent sub-judgments. */

/** The decompose schema: ONE string question carrying the JSON decomposition
 *  (groups with depends_on edges) — expressible by the native transport. */
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
 *  dependency-ordered sub-judgments (ONE decompose call — position bias is
 *  controlled natively on the verdicts question); sub-judgments execute in
 *  the DAG's topological order and each receives the earlier verdicts as
 *  context. Unusable decompose → LOUD deterministic fallback to independent
 *  sub-judgments; unusable calls keep the per-chunk loud-skip semantics.
 *  Verdict schema, floor and Tier-2 routing unchanged. */
export async function reviewVerdictsDag(
  backend: JudgeBackend,
  scenarios: ReviewScenario[],
  diffSummary: string,
  opts?: BatchedVerdictOptions
): Promise<DagReviewResult> {
  const window = opts?.window ?? REVIEW_CONTEXT_WINDOW;
  const evidenceOf = (id: string) => opts?.evidence?.[id] ?? diffSummary;
  let calls = 0;
  let firstSkipReason: string | undefined;
  let degraded: string | undefined;

  // 1. Decompose ONCE; the first (and only) presentation is the input order —
  //    order bias on the verdicts is averaged natively, not by re-presentation.
  let groups: DecomposeGroup[] | null = null;
  const input =
    `${DECOMPOSE_INPUT_MARKER}: group the scenarios below into sub-judgments with depends_on edges.\n\n` +
    scenarios.map((s) => scenarioBlock(s, evidenceOf(s.id))).join("");
  calls++;
  const v = await backend.classify(REVIEW_DECOMPOSE_SCHEMA, input);
  if (v.skipped) {
    firstSkipReason = v.reason ?? "decompose skipped (unspecified)";
  } else {
    groups = parseDecomposition(v.value?.decomposition, scenarios.map((s) => s.id));
    if (!groups) firstSkipReason = "decompose response invalid (coverage/edges/cyclicity)";
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
  const usage = usageAccumulator();
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
    usage.add(v.usage);
    if (v.skipped) {
      const why = v.reason ?? "judge skipped (unspecified)";
      firstSkipReason ??= why;
      for (const id of ids)
        byId.set(id, { scenario: id, verdict: "uncertain", confidence: 0, skipped: true, reason: why });
      continue;
    }
    const parsed = parseVerdictRows(ids, v.value ?? {});
    for (const r of parsed.results) byId.set(r.scenario, r);
    anyUsable ||= parsed.anyUsable;
  }

  const results = scenarios.map((s) => byId.get(s.id)!).filter(Boolean);
  const skippedAll = !anyUsable && scenarios.length > 0;
  const usageOut = usage.value();
  return {
    results,
    deepRead: results.filter((r) => r.verdict === "uncertain").map((r) => r.scenario),
    skippedAll,
    backend: backend.name,
    ...(skippedAll && firstSkipReason !== undefined ? { reason: firstSkipReason } : {}),
    calls,
    chunks: order.length,
    ...(usageOut !== undefined ? { usage: usageOut } : {}),
    ...(degraded !== undefined ? { degraded } : {}),
  };
}

/* ── 10. Claim-verified reporting (plan 077 Task 2) — the owner's refinement ──
 *
 *  Worker reports are for the orchestrator, not the owner, and are too
 *  verbose. verifyClaims checks each report claim against the worker's
 *  SESSION TURNS (the transcript is the ground truth): TRUE / FALSE /
 *  UNVERIFIABLE per claim. A wrong or missing turn pointer is FALSE —
 *  pointer accuracy is part of the claim. Verified-true claims form the
 *  compact digest that passes to the orchestrator; FALSE rows bounce to the
 *  worker (fix the report) and UNVERIFIABLE rows to the reviewer (re-review
 *  the work) — claiming-is-a-finding (the 068 discipline, extended). Claims
 *  ride ONE batched call (the Phase-3 batching pattern) as a native
 *  array-of-objects question with nullable abstention. WIRING GAP (reported
 *  per the plan): the in-extension session-transcript access is limited —
 *  verifyClaims is wired at the FLOW level: the caller (review/ship flow)
 *  supplies the turns from the worker's session file (JSONL entry order);
 *  the harness `claims` mode and the review skill step carry the contract. */

/** The claim-verdict vocabulary: TRUE = the pointed session turn (and the
 *  transcript around it) supports the claim · FALSE = the transcript visibly
 *  contradicts it (a lying report is a finding) · UNVERIFIABLE = the
 *  transcript cannot decide it (never guessed). */
export const CLAIM_VERDICTS = ["TRUE", "FALSE", "UNVERIFIABLE"] as const;
export type ClaimVerdict = (typeof CLAIM_VERDICTS)[number];

/** One factual claim pulled from a worker report: what was claimed, the
 *  claim type (test-result, file-change, scope, gate, …) and the session-turn
 *  pointer (entry index into the transcript — entry-index addressing, stable
 *  JSONL order). */
export interface ReportClaim {
  claim: string;
  type: string;
  sessionTurn: number;
}

/** One transcript entry (the worker's session turns), addressed by array
 *  index. */
export interface SessionTurn {
  role?: string;
  text: string;
}

/** A verified (TRUE) claim — the compact digest row the orchestrator gets. */
export interface VerifiedClaim extends ReportClaim {
  id: string;
  confidence: number;
  evidence?: string;
}

/** A bounced claim — FALSE routes to the worker (fix the report),
 *  UNVERIFIABLE to the reviewer (re-review the work); a judge skip is
 *  UNVERIFIABLE + reviewer, LOUDLY. */
export interface BouncedClaim extends ReportClaim {
  id: string;
  verdict: Exclude<ClaimVerdict, "TRUE">;
  route: "worker" | "reviewer";
  reason: string;
  evidence?: string;
}

export interface VerifyClaimsResult {
  verified: VerifiedClaim[];
  bounced: BouncedClaim[];
  skippedAll: boolean;
  calls: number;
  backend: string;
  reason?: string;
  usage?: { input_tokens?: number; thinking_tokens?: number };
}

/** The claim-verification schema for one batch: ONE native array-of-objects
 *  question — rows {id, verdict, confidence, evidence}, verdict nullable
 *  (native abstention = UNVERIFIABLE, never a guess). */
export function claimVerdictSchema(ids: string[]): object {
  return {
    type: "object",
    properties: {
      claimVerdicts: {
        type: "array",
        description:
          `One verdict row per claim id (${ids.join(", ")}). Verdict TRUE when the transcript ` +
          "supports the claim at its pointed turn; FALSE when it visibly contradicts it; " +
          "UNVERIFIABLE when it cannot decide. A null verdict is an honest abstention.",
        minItems: 1,
        maxItems: 200,
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "The claim id this row answers." },
            verdict: {
              type: ["string", "null"],
              enum: CLAIM_VERDICTS,
              description: "TRUE / FALSE / UNVERIFIABLE for this claim, or null to abstain.",
            },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "0-1 confidence in this row's verdict.",
            },
            evidence: {
              type: "string",
              description: "One short quote from the transcript that drove this row's verdict.",
            },
          },
          required: ["id", "verdict"],
        },
      },
    },
    required: [],
    additionalProperties: false,
  };
}

/** Render the transcript entry-index addressed — every turn is labeled with
 *  its entry index so the judge can check pointer accuracy. Turn text is
 *  truncated loudly (with a marker) when a single turn overflows its share
 *  of the budget. */
export function renderTurns(turns: SessionTurn[], budget: number): string {
  if (!turns.length) return "(empty transcript)\n";
  const label = (t: SessionTurn, i: number) => `[turn ${i}]${t.role ? ` (${t.role})` : ""}: `;
  const overhead = turns.reduce((n, t, i) => n + label(t, i).length + 1, 0) + 40;
  const perTurn = Math.max(80, Math.floor((budget - overhead) / turns.length));
  return (
    turns
      .map((t, i) => {
        const body =
          t.text.length > perTurn
            ? `${t.text.slice(0, perTurn)}…[truncated ${t.text.length - perTurn} chars]`
            : t.text;
        return `${label(t, i)}${body}\n`;
      })
      .join("") + "\n"
  );
}

/** Verify a report's factual claims against the worker's session turns.
 *  Deterministic pointer pre-check first (invalid/missing pointer → FALSE,
 *  bounced to the worker, NO judge call for it); the surviving claims ride
 *  ONE batched judge call over the entry-index-addressed transcript. Below-
 *  floor confidence, null abstentions and missing rows are UNVERIFIABLE
 *  bounces; a backend skip bounces ALL claims loudly (never a silent pass). */
export async function verifyClaims(
  backend: JudgeBackend,
  claims: ReportClaim[],
  turns: SessionTurn[],
  opts?: { window?: number }
): Promise<VerifyClaimsResult> {
  const window = opts?.window ?? REVIEW_CONTEXT_WINDOW;
  const verified: VerifiedClaim[] = [];
  const bounced: BouncedClaim[] = [];
  // 1. Deterministic pointer pre-check — pointer accuracy is part of the claim.
  const valid: { claim: ReportClaim; id: string }[] = [];
  claims.forEach((claim, i) => {
    const id = `C${i + 1}`;
    const pointer = claim.sessionTurn;
    const okPointer =
      typeof pointer === "number" && Number.isInteger(pointer) && pointer >= 0 && pointer < turns.length;
    if (!okPointer)
      bounced.push({
        ...claim,
        id,
        verdict: "FALSE",
        route: "worker",
        reason: `invalid turn pointer (${String(pointer)} — transcript has ${turns.length} entries); pointer accuracy is part of the claim`,
      });
    else valid.push({ claim, id });
  });
  if (!valid.length)
    return { verified, bounced, skippedAll: false, calls: 0, backend: backend.name };

  // 2. ONE batched judge call (Phase-3 batching pattern) over the transcript.
  const input =
    `Verify every claim below against the worker's session transcript (the ground truth, ` +
    `entry-index addressed). A wrong pointer means the claim is FALSE.\n\n` +
    `Session transcript:\n${renderTurns(turns, Math.max(2_000, window - 8_000))}\n` +
    valid.map(({ claim, id }) => `Claim ${id} [type ${claim.type}] (sessionTurn ${claim.sessionTurn}): ${claim.claim}\n`).join("");
  const v = await backend.classify(claimVerdictSchema(valid.map((x) => x.id)), input);
  if (v.skipped) {
    const why = v.reason ?? "judge skipped (unspecified)";
    for (const { claim, id } of valid)
      bounced.push({
        ...claim,
        id,
        verdict: "UNVERIFIABLE",
        route: "reviewer",
        reason: `JUDGE SKIPPED (${why}) — a skip is never a silent pass`,
      });
    return {
      verified,
      bounced,
      skippedAll: true,
      calls: 1,
      backend: backend.name,
      reason: why,
    };
  }
  const rows = Array.isArray((v.value as any)?.claimVerdicts) ? ((v.value as any).claimVerdicts as unknown[]) : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    if (typeof r.id === "string" && !byId.has(r.id)) byId.set(r.id, r);
  }
  for (const { claim, id } of valid) {
    const row = byId.get(id);
    if (!row) {
      bounced.push({
        ...claim,
        id,
        verdict: "UNVERIFIABLE",
        route: "reviewer",
        reason: `JUDGE SKIPPED (batch response missing verdict row for ${id})`,
      });
      continue;
    }
    const verdict = row.verdict;
    const confidence = typeof row.confidence === "number" && Number.isFinite(row.confidence) ? row.confidence : 0;
    const evidence = typeof row.evidence === "string" ? (row.evidence as string) : undefined;
    if (verdict === null) {
      bounced.push({
        ...claim,
        id,
        verdict: "UNVERIFIABLE",
        route: "reviewer",
        ...(evidence !== undefined ? { evidence } : {}),
        reason: "nullable abstention (native no-answer) — bounced to the reviewer",
      });
      continue;
    }
    if (typeof verdict !== "string" || !CLAIM_VERDICTS.includes(verdict as ClaimVerdict)) {
      bounced.push({
        ...claim,
        id,
        verdict: "UNVERIFIABLE",
        route: "reviewer",
        reason: `schema-invalid response: verdict '${String(verdict)}' is outside the enum`,
      });
      continue;
    }
    if (confidence < TRIAGE_CONFIDENCE_FLOOR) {
      bounced.push({
        ...claim,
        id,
        verdict: "UNVERIFIABLE",
        route: "reviewer",
        ...(evidence !== undefined ? { evidence } : {}),
        reason: `below confidence floor (${confidence} < ${TRIAGE_CONFIDENCE_FLOOR}) — bounced to the reviewer`,
      });
      continue;
    }
    if (verdict === "TRUE") {
      verified.push({
        ...claim,
        id,
        confidence,
        ...(evidence !== undefined ? { evidence } : {}),
      });
      continue;
    }
    bounced.push({
      ...claim,
      id,
      verdict: verdict as Exclude<ClaimVerdict, "TRUE">,
      route: verdict === "FALSE" ? "worker" : "reviewer",
      ...(evidence !== undefined ? { evidence } : {}),
      reason: verdict === "FALSE" ? "transcript contradicts the claim — the report must be fixed" : "transcript cannot decide the claim — re-review the work",
    });
  }
  return {
    verified,
    bounced,
    skippedAll: false,
    calls: 1,
    backend: backend.name,
    ...(v.usage !== undefined ? { usage: v.usage } : {}),
  };
}

/** The compact verified digest the orchestrator receives: one line per
 *  verified claim (evidence pointer) and one BOUNCED line per false/
 *  unverifiable claim with its route — the report becomes digest + pointers,
 *  not prose. */
export function renderClaimDigest(result: VerifyClaimsResult): string {
  const lines: string[] = [];
  if (result.skippedAll)
    lines.push(
      `CLAIM VERIFICATION SKIPPED (${result.reason ?? "unspecified"}) — all claims bounce loudly, none verified`
    );
  lines.push(
    `VERIFIED CLAIM DIGEST (backend ${result.backend}, ${result.calls} call(s))`
  );
  for (const c of result.verified)
    lines.push(`✓ [${c.id}] (${c.type}, turn ${c.sessionTurn}) ${c.claim}${c.evidence ? ` — evidence: ${c.evidence}` : ""}`);
  for (const b of result.bounced)
    lines.push(
      `✗ BOUNCED [${b.id}] ${b.verdict} → ${b.route} — (${b.type}, turn ${b.sessionTurn}) ${b.claim} — ${b.reason}`
    );
  return lines.join("\n");
}

/* ── 11. LOG → knowledge mining (plan 077 Task 3) — the machine-fed 073 rule ──
 *
 *  TypeLLM structured pull compiles the accreting .workflows/LOG.md into
 *  knowledge-promotion candidates in the 073 promotion vocabulary
 *  {candidate, trigger, gateBinding, logTurn}: periodic scan → candidate
 *  rows → the existing sieve judges → promoted or dropped. Kills the
 *  accretion disease at the root. Loud-skip; confidence-gated; candidates
 *  feed the SIEVE — nothing is auto-promoted here (never closes alone).
 *  The log rides each call LINE-ADDRESSED ([log line N]) so a candidate's
 *  logTurn cites real provenance; over-budget logs chunk deterministically
 *  on whole lines, one call per slice. */

/** One knowledge-promotion candidate mined from the LOG (073 vocabulary).
 *  logTurn is the 1-based LOG line the candidate came from — provenance is
 *  mandatory: a candidate without provenance is deferred, never promoted. */
export interface KnowledgeCandidate {
  candidate: string;
  trigger: string;
  gateBinding: string;
  logTurn: number;
  confidence: number;
}

/** A candidate the sieve will NOT see this round (below floor, missing
 *  promotion fields) — surfaced loudly, dropped silently never. */
export interface DeferredCandidate {
  row: Partial<KnowledgeCandidate>;
  reason: string;
}

export interface MineLogResult {
  candidates: KnowledgeCandidate[];
  deferred: DeferredCandidate[];
  skippedAll: boolean;
  /** Slices (calls) the log was mined over. */
  slices: number;
  /** Slices where the model's native abstention found nothing to mine. */
  abstainedSlices: number;
  calls: number;
  backend: string;
  reason?: string;
  usage?: { input_tokens?: number; thinking_tokens?: number };
}

/** The mining schema for one slice: ONE nullable array-of-objects question
 *  (native abstention = this slice yields no knowledge, loudly). Rows carry
 *  the full promotion vocabulary; per-row degradation in the parser keeps
 *  one bad row from failing the slice. */
export function logMiningSchema(): object {
  return {
    type: "object",
    properties: {
      knowledge: {
        type: ["array", "null"],
        description:
          "Knowledge-promotion candidates found in these LOG lines, or null when this slice " +
          "yields none. One row per durable lesson: what to do (candidate), when it applies " +
          "(trigger), which deterministic gate enforces it (gateBinding), and the " +
          "[log line N] it came from (logTurn).",
        minItems: 1,
        maxItems: 200,
        items: {
          type: "object",
          properties: {
            candidate: { type: "string", description: "The durable knowledge, one sentence, imperative." },
            trigger: { type: "string", description: "When this knowledge applies (the situation that fires it)." },
            gateBinding: { type: "string", description: "The deterministic gate/script that enforces it." },
            logTurn: { type: "integer", description: "The [log line N] provenance of this candidate." },
            confidence: { type: "number", minimum: 0, maximum: 1, description: "0-1 confidence in this row." },
          },
          required: ["candidate", "trigger", "gateBinding", "logTurn"],
        },
      },
    },
    required: [],
    additionalProperties: false,
  };
}

/** Split logText into deterministic whole-line slices of ≤ sliceBudget chars. */
function logSlices(logText: string, sliceBudget: number): { text: string; firstLine: number }[] {
  const lines = logText.split("\n");
  const slices: { text: string; firstLine: number }[] = [];
  let current: string[] = [];
  let length = 0;
  let firstLine = 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (current.length && length + line.length + 14 > sliceBudget) {
      slices.push({ text: current.join("\n"), firstLine });
      current = [];
      length = 0;
      firstLine = i + 1;
    }
    current.push(line);
    length += line.length + 14; // gutter + newline overhead
  }
  if (current.length) slices.push({ text: current.join("\n"), firstLine });
  return slices;
}

/** Render one slice line-addressed: every line gets a [log line N] gutter
 *  (1-based across the WHOLE log) the judge cites in logTurn. */
function renderLogSlice(slice: { text: string; firstLine: number }): string {
  return slice.text
    .split("\n")
    .map((line, i) => `[log line ${slice.firstLine + i}] ${line}`)
    .join("\n");
}

/** Mine knowledge-promotion candidates from LOG text (plan 077 T3). One
 *  batched call per slice; skipped slices are LOUD (first reason surfaced,
 *  the others proceed); below-floor and provenance-less rows are deferred —
 *  the sieve never sees them this round; candidates are never auto-promoted. */
export async function mineLog(
  backend: JudgeBackend,
  logText: string,
  opts?: { window?: number; sliceBudget?: number }
): Promise<MineLogResult> {
  const window = opts?.window ?? REVIEW_CONTEXT_WINDOW;
  const sliceBudget = Math.min(opts?.sliceBudget ?? Math.floor(window / 2), window - 2_000);
  const slices = logSlices(logText, sliceBudget);
  const candidates: KnowledgeCandidate[] = [];
  const deferred: DeferredCandidate[] = [];
  let skippedAll = true;
  let abstainedSlices = 0;
  let firstReason: string | undefined;
  const usage = usageAccumulator();
  for (const slice of slices) {
    const input =
      `Mine durable knowledge-promotion candidates from these .workflows/LOG.md lines ` +
      `(073 promotion vocabulary). Cite the [log line N] each candidate came from.\n\n` +
      `${renderLogSlice(slice)}\n`;
    const v = await backend.classify(logMiningSchema(), input);
    usage.add(v.usage);
    if (v.skipped) {
      firstReason ??= v.reason ?? "judge skipped (unspecified)";
      continue;
    }
    skippedAll = false;
    const knowledge = (v.value as any)?.knowledge;
    if (knowledge === null || knowledge === undefined) {
      abstainedSlices++;
      firstReason ??= "a slice abstained (native no-answer): no candidates found in it";
      continue;
    }
    if (!Array.isArray(knowledge)) {
      firstReason ??= "schema-invalid response: knowledge is not an array";
      continue;
    }
    for (const row of knowledge as unknown[]) {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        deferred.push({ row: {}, reason: "schema-invalid response: row is not an object" });
        continue;
      }
      const r = row as Record<string, unknown>;
      const confidence = typeof r.confidence === "number" && Number.isFinite(r.confidence) ? r.confidence : 0;
      const missing = ["candidate", "trigger", "gateBinding", "logTurn"].filter((k) => {
        const val = r[k];
        if (k === "logTurn") return !Number.isInteger(val) || (val as number) < 1;
        return typeof val !== "string" || !(val as string).trim();
      });
      if (missing.length) {
        deferred.push({
          row: r as Partial<KnowledgeCandidate>,
          reason: `row missing promotion field(s): ${missing.join(", ")} — provenance is mandatory`,
        });
        continue;
      }
      if (confidence < TRIAGE_CONFIDENCE_FLOOR) {
        deferred.push({
          row: r as Partial<KnowledgeCandidate>,
          reason: `below confidence floor (${confidence} < ${TRIAGE_CONFIDENCE_FLOOR}) — the deterministic path judges it`,
        });
        continue;
      }
      candidates.push({
        candidate: r.candidate as string,
        trigger: r.trigger as string,
        gateBinding: r.gateBinding as string,
        logTurn: r.logTurn as number,
        confidence,
      });
    }
  }
  const usageOut = usage.value();
  return {
    candidates,
    deferred,
    skippedAll: skippedAll && slices.length > 0,
    slices: slices.length,
    abstainedSlices,
    calls: slices.length,
    backend: backend.name,
    ...(firstReason !== undefined ? { reason: firstReason } : {}),
    ...(usageOut !== undefined ? { usage: usageOut } : {}),
  };
}

/* ── 12. incident → doctrine candidate (plan 077 Task 4) — rules as DATA ──
 *
 *  When an incident adds a rule, the incident itself extracts that rule as a
 *  STRUCTURED sieve candidate {rule, trigger, gateBinding} — schema-
 *  validated, feeding the same promotion path as mineLog. Rules enter as
 *  DATA, never as prose accretion (the meta-cure for the 73-checks disease).
 *  The rule question is NULLABLE: an incident with no extractable rule is a
 *  native abstention, surfaced loudly — the agent writes the doctrine by
 *  hand, the extractor never guesses one. */

/** A doctrine candidate extracted from an incident — same sieve vocabulary
 *  family as KnowledgeCandidate (trigger + gateBinding), rule instead of a
 *  free candidate row. */
export interface DoctrineCandidate {
  rule: string;
  trigger: string;
  gateBinding: string;
  confidence: number;
}

export interface DoctrineCandidateResult {
  /** null = no candidate this round (abstention, skip, or below floor) —
   *  always with the reason surfaced. */
  candidate: DoctrineCandidate | null;
  skipped: boolean;
  belowFloor: boolean;
  backend: string;
  reason?: string;
  usage?: { input_tokens?: number; thinking_tokens?: number };
}

/** The doctrine-extraction schema: rule is NULLABLE (native abstention for
 *  incidents that carry no rule); trigger + gateBinding make the rule a
 *  structured sieve candidate, not prose. */
export const DOCTRINE_SCHEMA = {
  type: "object",
  properties: {
    rule: {
      type: ["string", "null"],
      description:
        "The durable rule this incident adds, one imperative sentence — or null when the " +
        "incident adds no rule (honest abstention; never invent one).",
      thinking: { budget: 512 },
    },
    trigger: {
      type: "string",
      description: "When this rule applies (the situation that fires it). Empty when rule is null.",
    },
    gateBinding: {
      type: "string",
      description:
        "The deterministic gate/script that enforces this rule (empty or 'none' when no gate binds yet).",
    },
    confidence: { type: "number", minimum: 0, maximum: 1, description: "0-1 confidence in the extraction." },
  },
  required: ["rule", "confidence"],
  additionalProperties: false,
} as const;

/** Extract a doctrine candidate from incident text (plan 077 T4).
 *  Schema-validated; below-floor → the deterministic path (no candidate);
 *  skip → LOUD skip; native null → no candidate, loudly. Feeds the same
 *  promotion path as mineLog — the sieve judges it, nothing auto-promotes. */
export async function doctrineCandidate(
  backend: JudgeBackend,
  incidentText: string
): Promise<DoctrineCandidateResult> {
  const v = await backend.classify(DOCTRINE_SCHEMA, incidentText);
  if (v.skipped)
    return {
      candidate: null,
      skipped: true,
      belowFloor: false,
      backend: backend.name,
      reason: `JUDGE SKIPPED (${v.reason ?? "unspecified"}) — the agent extracts the doctrine by hand`,
    };
  const rule = (v.value as any)?.rule;
  const confidence = typeof (v.value as any)?.confidence === "number" ? (v.value as any).confidence : 0;
  if (rule === null)
    return {
      candidate: null,
      skipped: false,
      belowFloor: false,
      backend: backend.name,
      reason: "nullable abstention (native no-answer): this incident adds no extractable rule — write doctrine by hand if needed",
      ...(v.usage !== undefined ? { usage: v.usage } : {}),
    };
  if (typeof rule !== "string" || !rule.trim())
    return {
      candidate: null,
      skipped: false,
      belowFloor: false,
      backend: backend.name,
      reason: "schema-invalid response: rule is neither a string nor null",
      ...(v.usage !== undefined ? { usage: v.usage } : {}),
    };
  if (confidence < TRIAGE_CONFIDENCE_FLOOR)
    return {
      candidate: null,
      skipped: false,
      belowFloor: true,
      backend: backend.name,
      reason: `below confidence floor (${confidence} < ${TRIAGE_CONFIDENCE_FLOOR}) — the deterministic path (hand extraction) applies`,
      ...(v.usage !== undefined ? { usage: v.usage } : {}),
    };
  const trigger = typeof (v.value as any)?.trigger === "string" ? (v.value as any).trigger : "";
  const gateBinding = typeof (v.value as any)?.gateBinding === "string" ? (v.value as any).gateBinding : "";
  return {
    candidate: { rule, trigger, gateBinding, confidence },
    skipped: false,
    belowFloor: false,
    backend: backend.name,
    ...(v.usage !== undefined ? { usage: v.usage } : {}),
  };
}

/* ── 13. worker-pack context extraction (plan 077 Task 5) — augment-only ──
 *
 *  TypeLLM pulls the MINIMAL per-task brief from long brownfield plans/docs
 *  (32k slice budget, chunked search over the doc) — dispatch packs carry
 *  the extracted slice instead of full documents. Direct worker-token
 *  savings on every dispatch. AUGMENT-ONLY: contracts stay the primary
 *  context mechanism — the harness `brief` mode proves worker-success
 *  parity (brief vs full doc) on fixtures; extraction never replaces a
 *  contract. Loud-skip when the task id is absent (the worker gets the full
 *  doc, never a silent gap); native abstention → loud no-brief. */

/** One slice of a long document: the text plus its 1-based line range in
 *  the original. */
export interface TaskSlice {
  text: string;
  startLine: number;
  endLine: number;
}

/** Deterministically slice a long plan/doc around one task's section (the
 *  32k budget): the slice starts at the task's heading (≤10 lines of lead-in
 *  context) and runs to the next heading or the budget cut, whole lines
 *  only, with an explicit truncation marker when cut. Returns null when the
 *  task id does not appear (caller loud-skips). */
export function findTaskSlice(planText: string, taskId: string, budget = 32_000): TaskSlice | null {
  const lines = planText.split("\n");
  const idWord = taskId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headingRe = new RegExp(`^\\s*#{0,4}\\s*.*\\bTask\\s+${idWord}\\b`);
  const anyRe = new RegExp(`\\bTask\\s+${idWord}\\b`);
  let headingLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headingRe.test(lines[i]) || anyRe.test(lines[i])) {
      headingLine = i;
      break;
    }
  }
  if (headingLine < 0) return null;
  const startLine = Math.max(0, headingLine - 10);
  const nextHeading = lines.findIndex(
    (l, i) => i > headingLine && /^\s*#{1,4}\s+/.test(l)
  );
  const endByHeading = nextHeading > 0 ? nextHeading - 1 : lines.length - 1;
  // reserve room for the explicit truncation marker so the slice never
  // exceeds the budget
  const bodyBudget = Math.max(200, budget - 80);
  let endLine = startLine;
  let length = 0;
  while (endLine <= endByHeading && length + lines[endLine].length + 1 <= bodyBudget) {
    length += lines[endLine].length + 1;
    endLine++;
  }
  endLine--; // last included line
  let text = lines.slice(startLine, endLine + 1).join("\n");
  if (endLine < endByHeading)
    text += `\n…[truncated to the ${budget}-char slice budget]`;
  return { text, startLine: startLine + 1, endLine: endLine + 1 };
}

/** The minimal per-task brief a dispatch pack carries alongside (never
 *  instead of) the task's contract. */
export interface TaskBrief {
  taskId: string;
  objective: string;
  deliverables: string[];
  constraints: string[];
}

export interface ExtractBriefResult {
  brief: TaskBrief | null;
  skipped: boolean;
  backend: string;
  reason?: string;
  calls: number;
  usage?: { input_tokens?: number; thinking_tokens?: number };
}

/** The brief schema: objective is NULLABLE (native abstention — no brief is
 *  extracted rather than a guessed one); deliverables/constraints are native
 *  string arrays (≤200 items). */
export const TASK_BRIEF_SCHEMA = {
  type: "object",
  properties: {
    taskId: { type: "string", description: "The task id this brief answers." },
    objective: {
      type: ["string", "null"],
      description:
        "The task's objective in one imperative sentence — or null when the section does not " +
        "yield an objective (honest abstention; never invent one).",
    },
    deliverables: {
      type: "array",
      description: "The concrete deliverables the task names (files, commands, artifacts).",
      minItems: 0,
      maxItems: 200,
      items: { type: "string" },
    },
    constraints: {
      type: "array",
      description: "The boundaries/constraints the task names (Allowed Changes, forbidden paths, gates).",
      minItems: 0,
      maxItems: 200,
      items: { type: "string" },
    },
    confidence: { type: "number", minimum: 0, maximum: 1, description: "0-1 confidence in the brief." },
  },
  required: ["taskId", "objective", "confidence"],
  additionalProperties: false,
} as const;

/** Extract the minimal per-task brief from a long plan (plan 077 T5). One
 *  call over the task's 32k slice. Augment-only: the brief rides the
 *  dispatch pack ALONGSIDE the contract — the harness proves parity. */
export async function extractTaskBrief(
  backend: JudgeBackend,
  planText: string,
  taskId: string,
  opts?: { sliceBudget?: number }
): Promise<ExtractBriefResult> {
  const slice = findTaskSlice(planText, taskId, opts?.sliceBudget ?? 32_000);
  if (!slice)
    return {
      brief: null,
      skipped: true,
      backend: backend.name,
      calls: 0,
      reason: `task ${taskId} not found in the plan — the dispatch pack carries the full document`,
    };
  const input =
    `Extract the minimal brief for Task ${taskId} from this plan slice (objective, ` +
    `deliverables, constraints). Augment-only: keep what the section names, invent nothing.\n\n` +
    `${slice.text}\n`;
  const v = await backend.classify(TASK_BRIEF_SCHEMA, input);
  if (v.skipped)
    return {
      brief: null,
      skipped: true,
      backend: backend.name,
      calls: 1,
      reason: `JUDGE SKIPPED (${v.reason ?? "unspecified"}) — the worker gets the full document`,
      ...(v.usage !== undefined ? { usage: v.usage } : {}),
    };
  const out = (v.value ?? {}) as Record<string, unknown>;
  const confidence = typeof out.confidence === "number" && Number.isFinite(out.confidence) ? out.confidence : 0;
  if (out.objective === null)
    return {
      brief: null,
      skipped: false,
      backend: backend.name,
      calls: 1,
      reason: "nullable abstention (native no-answer): the section yields no brief — the worker gets the full document",
      ...(v.usage !== undefined ? { usage: v.usage } : {}),
    };
  if (typeof out.objective !== "string" || !out.objective.trim())
    return {
      brief: null,
      skipped: false,
      backend: backend.name,
      calls: 1,
      reason: "schema-invalid response: objective is neither a string nor null",
      ...(v.usage !== undefined ? { usage: v.usage } : {}),
    };
  if (confidence < TRIAGE_CONFIDENCE_FLOOR)
    return {
      brief: null,
      skipped: false,
      backend: backend.name,
      calls: 1,
      reason: `below confidence floor (${confidence} < ${TRIAGE_CONFIDENCE_FLOOR}) — the deterministic path (full document) applies`,
      ...(v.usage !== undefined ? { usage: v.usage } : {}),
    };
  const strings = (arr: unknown) =>
    Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];
  return {
    brief: {
      taskId: typeof out.taskId === "string" ? out.taskId : taskId,
      objective: out.objective,
      deliverables: strings(out.deliverables),
      constraints: strings(out.constraints),
    },
    skipped: false,
    backend: backend.name,
    calls: 1,
    ...(v.usage !== undefined ? { usage: v.usage } : {}),
  };
}

/* ── 14. spec-draft extraction (plan 077 Task 6) — draft ONLY ──
 *
 *  Plan text → draft .spec scenarios/steps/selectors skeleton for OWNER
 *  REVIEW before agent-spec init. The extraction produces the contract
 *  skeleton; the spec language stays unchanged. Output is a DRAFT (status:
 *  "draft") — it is returned to the caller for owner review and is NEVER
 *  written to specs/ automatically (no filesystem writes here, ever).
 *  Loud-skip; native abstention (no extractable scenarios) is surfaced. */

/** One drafted scenario in the repo's .spec language (Scenario / Test /
 *  Given / When / Then). */
export interface DraftScenario {
  name: string;
  test: string;
  given: string;
  when: string;
  then: string;
}

/** The draft skeleton (frontmatter + Intent + scenarios) — owner review
 *  material, not a contract. */
export interface SpecDraft {
  name: string;
  tags: string[];
  intent: string;
  scenarios: DraftScenario[];
}

export interface SpecDraftResult {
  /** Always "draft": the skeleton is owner-review material and is never
   *  written to specs/ automatically. */
  status: "draft";
  draft: SpecDraft;
  skipped: boolean;
  backend: string;
  reason?: string;
  calls: number;
  usage?: { input_tokens?: number; thinking_tokens?: number };
}

/** The spec-draft schema: scenarios is a NULLABLE array (native abstention
 *  when the plan yields no verifiable scenarios); every scenario carries its
 *  mechanical Test selector plus the Given/When/Then steps. */
export const SPEC_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "A short spec name." },
    tags: {
      type: "array",
      description: "Spec tags.",
      minItems: 0,
      maxItems: 20,
      items: { type: "string" },
    },
    intent: { type: "string", description: "The spec's intent paragraph (what must hold when done)." },
    scenarios: {
      type: ["array", "null"],
      description:
        "Draft completion-criteria scenarios, or null when the plan yields none (honest " +
        "abstention). Each scenario: a mechanical Test selector (a parseable command that " +
        "checks the end state, never a prose claim) and Given/When/Then steps.",
      minItems: 1,
      maxItems: 200,
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Scenario name." },
          test: { type: "string", description: "Mechanical end-state check command (single parseable command line)." },
          given: { type: "string", description: "Given step." },
          when: { type: "string", description: "When step." },
          then: { type: "string", description: "Then step." },
        },
        required: ["name", "test"],
      },
    },
    confidence: { type: "number", minimum: 0, maximum: 1, description: "0-1 confidence in the draft." },
  },
  required: ["name", "scenarios", "confidence"],
  additionalProperties: false,
} as const;

/** Render the draft skeleton into .spec-shaped text for owner review — the
 *  same language `agent-spec init` consumes (frontmatter, Intent,
 *  Boundaries placeholders, Completion Criteria scenarios). */
export function renderSpecDraft(draft: SpecDraft): string {
  const lines: string[] = [];
  lines.push("spec: task");
  lines.push(`name: "${draft.name.replace(/"/g, "'")}"`);
  lines.push(`tags: [${draft.tags.join(", ")}]`);
  lines.push("---");
  lines.push("");
  lines.push("## Intent");
  lines.push("");
  lines.push(draft.intent || "(draft — owner fills)");
  lines.push("");
  lines.push("## Boundaries");
  lines.push("");
  lines.push("### Allowed Changes");
  lines.push("- (draft — owner fills from the plan's Allowed Changes)");
  lines.push("");
  lines.push("### Forbidden");
  lines.push("- everything else");
  lines.push("");
  lines.push("## Completion Criteria");
  for (const s of draft.scenarios) {
    lines.push("");
    lines.push(`Scenario: ${s.name}`);
    lines.push(`  Test: ${s.test}`);
    if (s.given) lines.push(`  Given ${s.given}`);
    if (s.when) lines.push(`  When ${s.when}`);
    if (s.then) lines.push(`  Then ${s.then}`);
  }
  if (!draft.scenarios.length) {
    lines.push("");
    lines.push("(no scenarios drafted — owner writes them)");
  }
  return lines.join("\n");
}

/** Draft .spec scenarios from plan text (plan 077 T6). DRAFT ONLY: the
 *  result carries status "draft" and nothing is ever written to specs/ —
 *  the owner reviews before agent-spec init. Loud-skip; native abstention
 *  surfaced; below-floor confidence keeps the skeleton empty and loud. */
export async function draftSpecScenarios(
  backend: JudgeBackend,
  planText: string,
  opts?: { window?: number }
): Promise<SpecDraftResult> {
  const window = opts?.window ?? REVIEW_CONTEXT_WINDOW;
  // the plan rides one call, truncated loudly beyond the window (a draft aid,
  // never a completeness claim)
  const body =
    planText.length > window - 2_000
      ? `${planText.slice(0, window - 2_000)}…[truncated ${planText.length - (window - 2_000)} chars]`
      : planText;
  const input =
    `Draft completion-criteria scenarios for a .spec contract from this plan text. Each ` +
    `scenario's Test selector is a mechanical, parseable end-state check command.\n\n${body}\n`;
  const v = await backend.classify(SPEC_DRAFT_SCHEMA, input);
  const emptyDraft: SpecDraft = { name: "", tags: [], intent: "", scenarios: [] };
  if (v.skipped)
    return {
      status: "draft",
      draft: emptyDraft,
      skipped: true,
      backend: backend.name,
      calls: 1,
      reason: `JUDGE SKIPPED (${v.reason ?? "unspecified"}) — the owner authors the spec by hand`,
      ...(v.usage !== undefined ? { usage: v.usage } : {}),
    };
  const out = (v.value ?? {}) as Record<string, unknown>;
  const confidence = typeof out.confidence === "number" && Number.isFinite(out.confidence) ? out.confidence : 0;
  const scenariosRaw = out.scenarios;
  if (scenariosRaw === null || scenariosRaw === undefined)
    return {
      status: "draft",
      draft: emptyDraft,
      skipped: false,
      backend: backend.name,
      calls: 1,
      reason: "nullable abstention (native no-answer): the plan yields no draftable scenarios",
      ...(v.usage !== undefined ? { usage: v.usage } : {}),
    };
  if (confidence < TRIAGE_CONFIDENCE_FLOOR)
    return {
      status: "draft",
      draft: emptyDraft,
      skipped: false,
      backend: backend.name,
      calls: 1,
      reason: `below confidence floor (${confidence} < ${TRIAGE_CONFIDENCE_FLOOR}) — the deterministic path (hand authoring) applies`,
      ...(v.usage !== undefined ? { usage: v.usage } : {}),
    };
  const scenarios: DraftScenario[] = Array.isArray(scenariosRaw)
    ? (scenariosRaw as unknown[])
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object" && !Array.isArray(s))
        .filter((s) => typeof s.name === "string" && typeof s.test === "string" && !!s.name.trim() && !!s.test.trim())
        .map((s) => ({
          name: s.name as string,
          test: (s.test as string).split("\n")[0].trim(), // a selector is ONE parseable command line
          given: typeof s.given === "string" ? s.given : "",
          when: typeof s.when === "string" ? s.when : "",
          then: typeof s.then === "string" ? s.then : "",
        }))
    : [];
  if (!Array.isArray(scenariosRaw)) {
    return {
      status: "draft",
      draft: emptyDraft,
      skipped: false,
      backend: backend.name,
      calls: 1,
      reason: "schema-invalid response: scenarios is neither an array nor null",
      ...(v.usage !== undefined ? { usage: v.usage } : {}),
    };
  }
  return {
    status: "draft",
    draft: {
      name: typeof out.name === "string" && out.name.trim() ? out.name : "Draft spec",
      tags: Array.isArray(out.tags) ? (out.tags as unknown[]).filter((t): t is string => typeof t === "string") : [],
      intent: typeof out.intent === "string" ? out.intent : "",
      scenarios,
    },
    skipped: false,
    backend: backend.name,
    calls: 1,
    ...(!scenarios.length ? { reason: "no scenario rows survived schema validation — owner authors them" } : {}),
    ...(v.usage !== undefined ? { usage: v.usage } : {}),
  };
}

/* ── 15. /init --adopt extraction (plan 078 Task 2) — draft-by-judge, verify-by-gate ──
 *
 *  Brownfield /init is analysis-heavy: ONE batched judge call drafts the
 *  profile/stack/pointer FIRST DRAFT from the repo's tree + build manifests
 *  (the context the caller assembles). The judge NEVER writes final config:
 *  the caller writes *.draft files only, then the deterministic lints
 *  (profile-lint + agents-lint + check-tree) verify every path — a lint
 *  failure blocks loudly, exactly as the /init brownfield path already
 *  blocks. Boolean gate-questions ride the same call ("test command
 *  present", "no key material in charter"). Loud-skip → the existing
 *  hand-derivation path applies (nothing auto-proceeds on a skip). */

/** The adopt-extraction schema. Commands are nullable — null is the native
 *  "not detectable", never an invented command (a fictional command is a
 *  bug the profile-lint bites). Pointer/tree paths must come from the given
 *  tree listing — the lints verify existence. */
export const INIT_EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    profileCommands: {
      type: "object",
      description:
        "The project's own commands drafted from its build manifests. null when not detectable — never invent one.",
      properties: {
        test: {
          type: ["string", "null"],
          description: "the test command (from package.json scripts.test, Cargo.toml, pyproject.toml…), or null when none is detectable",
        },
        lint: {
          type: ["string", "null"],
          description: "the lint/check command, or null when none is detectable",
        },
        build: {
          type: ["string", "null"],
          description: "the build command, or null when none is detectable",
        },
      },
      required: ["test", "lint", "build"],
      additionalProperties: false,
    },
    treeDomains: {
      type: "array",
      description:
        "Top-level directory domains as name → repo-relative path. Real directories from the given listing only.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "short domain name (e.g. src, docs)" },
          path: { type: "string", description: "repo-relative path exactly as listed (e.g. src)" },
        },
        required: ["name", "path"],
        additionalProperties: false,
      },
    },
    stackDetection: {
      type: "object",
      description:
        "The detected stack, and the installed domain-skill family the charter's review pointers should cite (skip the citation when the stack is not detectable).",
      properties: {
        stack: { type: "string", description: "the detected stack (language + runtime), e.g. 'TypeScript (bun)'" },
        reviewSkills: {
          type: "array",
          items: { type: "string" },
          description:
            "skill names for the charter's review pointers: Rust → rust-review, rust-best-practices, rust-port; web frontend → modern-web-guidance, impeccable; Cloudflare Workers → the workers family, security-audit; not detectable → empty",
        },
      },
      required: ["stack", "reviewSkills"],
      additionalProperties: false,
    },
    charterPointers: {
      type: "array",
      description:
        "Charter pointer candidates: name → an EXISTING repo path from the given listing (a fictional path is a bug).",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "pointer name (e.g. 'Project overview')" },
          path: { type: "string", description: "repo-relative path that exists in the given listing" },
        },
        required: ["name", "path"],
        additionalProperties: false,
      },
    },
    gates: {
      type: "object",
      description: "Boolean gate-questions sanity-checking the draft itself.",
      properties: {
        testCommandPresent: {
          type: "boolean",
          description: "true only when profileCommands.test is a real detectable command",
        },
        noKeyMaterialInCharter: {
          type: "boolean",
          description: "true only when no API-key/secret material appears in the drafted pointers or commands",
        },
      },
      required: ["testCommandPresent", "noKeyMaterialInCharter"],
      additionalProperties: false,
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description:
        "0-1 confidence in the draft. 0.9+ only when the manifests decide the fields unambiguously.",
    },
    evidence: {
      type: "string",
      description: "Which manifests drove the draft.",
    },
  },
  required: ["profileCommands", "treeDomains", "stackDetection", "charterPointers", "gates", "confidence"],
  additionalProperties: false,
} as const;

/** The judge-drafted adopt data (before any file is written). */
export interface AdoptDraft {
  commands: { test?: string; lint?: string; build?: string };
  treeDomains: { name: string; path: string }[];
  stackDetection: { stack: string; reviewSkills: string[] };
  charterPointers: { name: string; path: string }[];
  gates: { testCommandPresent: boolean; noKeyMaterialInCharter: boolean };
  confidence: number;
  evidence?: string;
}

export type AdoptExtraction =
  | { skipped: true; reason: string }
  | { skipped?: false; draft: AdoptDraft };

/** Fields validated defensively — the recorded replay bypasses the live
 *  transport's schema validation, so nothing is trusted by shape alone. */
function adoptDraftOf(value: unknown): AdoptDraft | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const cmd = (x: unknown): string | undefined =>
    typeof x === "string" && !!x.trim() ? x.trim() : undefined;
  const pc = v.profileCommands;
  if (!pc || typeof pc !== "object" || Array.isArray(pc)) return null;
  const commands: AdoptDraft["commands"] = {};
  const test = cmd((pc as Record<string, unknown>).test);
  const lint = cmd((pc as Record<string, unknown>).lint);
  const build = cmd((pc as Record<string, unknown>).build);
  if (test) commands.test = test;
  if (lint) commands.lint = lint;
  if (build) commands.build = build;
  const pair = (x: unknown): { name: string; path: string } | null => {
    if (!x || typeof x !== "object") return null;
    const p = x as Record<string, unknown>;
    return typeof p.name === "string" && !!p.name.trim() && typeof p.path === "string" && !!p.path.trim()
      ? { name: p.name.trim(), path: p.path.trim() }
      : null;
  };
  const treeDomains = Array.isArray(v.treeDomains) ? v.treeDomains.map(pair) : null;
  const charterPointers = Array.isArray(v.charterPointers) ? v.charterPointers.map(pair) : null;
  if (!treeDomains || treeDomains.some((x) => x === null)) return null;
  if (!charterPointers || charterPointers.some((x) => x === null)) return null;
  const sd = v.stackDetection;
  if (!sd || typeof sd !== "object") return null;
  const stack = (sd as Record<string, unknown>).stack;
  const reviewSkills = (sd as Record<string, unknown>).reviewSkills;
  if (typeof stack !== "string" || !stack.trim()) return null;
  if (!Array.isArray(reviewSkills) || reviewSkills.some((s) => typeof s !== "string")) return null;
  const gates = v.gates;
  if (!gates || typeof gates !== "object") return null;
  const tcp = (gates as Record<string, unknown>).testCommandPresent;
  const nkm = (gates as Record<string, unknown>).noKeyMaterialInCharter;
  if (typeof tcp !== "boolean" || typeof nkm !== "boolean") return null;
  return {
    commands,
    treeDomains: treeDomains as { name: string; path: string }[],
    charterPointers: charterPointers as { name: string; path: string }[],
    stackDetection: {
      stack: stack.trim(),
      reviewSkills: (reviewSkills as string[]).map((s) => s.trim()),
    },
    gates: { testCommandPresent: tcp, noKeyMaterialInCharter: nkm },
    confidence: 0,
  };
}

/** ONE batched judge call drafts the adopt data. Loud-skip semantics:
 *  backend skip, schema-invalid fields, or below-floor confidence all return
 *  skipped with the reason named — the caller's hand-derivation path applies,
 *  and no draft is written. */
export async function extractAdoptDraft(
  backend: JudgeBackend,
  context: string
): Promise<AdoptExtraction> {
  const v = await backend.classify(INIT_EXTRACT_SCHEMA, context);
  if (v.skipped) return { skipped: true, reason: v.reason ?? "judge skipped (unspecified)" };
  const confidence = typeof v.confidence === "number" && Number.isFinite(v.confidence) ? v.confidence : 0;
  if (confidence < TRIAGE_CONFIDENCE_FLOOR)
    return {
      skipped: true,
      reason: `below confidence floor (${confidence} < ${TRIAGE_CONFIDENCE_FLOOR}) — derive the draft by hand (the /init brownfield path)`,
    };
  const draft = adoptDraftOf(v.value);
  if (!draft) return { skipped: true, reason: "schema-invalid response: draft fields missing or malformed" };
  return {
    draft: {
      ...draft,
      confidence,
      ...(v.evidence !== undefined && typeof v.evidence === "string" ? { evidence: v.evidence } : {}),
    },
  };
}

/* ── 16. /plan-time DAG extraction (plan 078 Task 3) — extraction before, validation after ──
 *
 *  The landed decompose machinery (§9c's REVIEW_DECOMPOSE_SCHEMA) generalized
 *  into a plan-edge extractor: plan text → task `Depends On` edges, BEFORE
 *  spec drafting; plan-check validates the confirmed edges AFTER. Position
 *  bias is controlled NATIVELY (probabilities + permutations on the edges
 *  question — endpoint-side averaging over balanced orders; the hand-rolled
 *  permutation loop stays deleted). The /plan flow renders the edges for the
 *  OWNER to CONFIRM — a wrong edge is a FINDING, never silent acceptance.
 *  Loud-skip and the shared confidence floor: a skip or below-floor verdict
 *  routes to the hand-derived edges (the existing /plan path). */

export const PLAN_DAG_SCHEMA = {
  type: "object",
  properties: {
    edges: {
      type: "array",
      description:
        "One row per task: the task's id and the ids it DEPENDS ON. Every task in the plan appears exactly once; dependsOn is empty when the task has no dependencies.",
      items: {
        type: "object",
        properties: {
          task: {
            type: "string",
            description: "the task id exactly as the plan writes it (e.g. TASK_2 or TASK 2)",
          },
          dependsOn: {
            type: "array",
            items: { type: "string" },
            description: "the task ids this task depends on; empty when none",
          },
        },
        required: ["task", "dependsOn"],
        additionalProperties: false,
      },
      // Position-bias control is NATIVE (plan 077 T1, the majordome crib):
      // probabilities + permutations on the edges question — the endpoint
      // averages over balanced option orders.
      probabilities: { permutations: 4 },
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description:
        "0-1 confidence in the edges. 0.9+ only when the plan text states the dependencies unambiguously.",
    },
    evidence: {
      type: "string",
      description: "Which task blocks or table cells drove the edges.",
    },
  },
  required: ["edges", "confidence"],
  additionalProperties: false,
} as const;

export interface PlanDagEdge {
  task: string;
  dependsOn: string[];
}

export interface PlanDagFinding {
  kind: "unknown-task" | "duplicate-task" | "cycle" | "schema-invalid";
  detail: string;
}

export interface PlanDagResult {
  edges: PlanDagEdge[];
  findings: PlanDagFinding[];
  skipped: boolean;
  defaultPath: boolean;
  reason?: string;
  backend: string;
  calls: number;
  confidence: number;
}

const normTaskId = (id: string): string => id.replace(/[^a-z0-9]/gi, "").toLowerCase();

/** The plan's own stated edges: TASK blocks (`- **Depends on**:` bullets)
 *  win; the Spec Map table's `Depends On` column fills tasks without a block
 *  (the draft phase). Ids normalized ("TASK 1" ≡ "TASK_1"). The recorded
 *  harness replay uses this same parser — the extraction contract replayed
 *  against its own input. */
export function parsePlanDeps(planText: string): PlanDagEdge[] {
  const byTask = new Map<string, PlanDagEdge>();
  const labelOf = new Map<string, string>();
  // TASK blocks: `### TASK 1: ...` + `- **Depends on**: ...`
  const blockRe = /^#{2,4}\s*(TASK[\w\s-]*?)(?=\s*(?::|$))/gm;
  const depRe = /^\s*-\s*\*\*Depends [Oo]n\*\*:\s*(.+)$/gm;
  const matches = [...planText.matchAll(blockRe)];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index ?? 0;
    const end = i + 1 < matches.length ? matches[i + 1].index ?? planText.length : planText.length;
    const slice = planText.slice(start, end);
    const depLine = [...slice.matchAll(depRe)][0]?.[1];
    const deps = parseDepCell(depLine ?? "none");
    const id = matches[i][1].replace(/\s+/g, " ").trim();
    const key = normTaskId(id);
    if (!byTask.has(key)) {
      byTask.set(key, { task: id, dependsOn: deps });
      labelOf.set(key, id);
    }
  }
  // Spec Map table rows: `| TASK_X | ... | deps |` — fills tasks with no block
  for (const row of planText.matchAll(/^\|\s*(TASK[\w-]*)\s*\|.+\|\s*([^|]*?)\s*\|\s*$/gm)) {
    const id = row[1];
    const key = normTaskId(id);
    if (byTask.has(key)) continue;
    byTask.set(key, { task: id, dependsOn: parseDepCell(row[2]) });
    labelOf.set(key, id);
  }
  return [...byTask.values()];
}

/** One `Depends On` cell: "none" / "—" → []; anything else yields the
 *  TASK ids it names (comma, space, and N-M range separated; ids canonicalized
 *  to the underscore form — "TASK 1" and "TASK_1" normalize identically). */
function parseDepCell(cell: string): string[] {
  const trimmed = cell.trim();
  if (!trimmed || trimmed === "none" || trimmed === "—") return [];
  const ids = trimmed.match(/TASK(?:[\w-]+|\s*\d+(?:\s*-\s*\d+)?)?/g) ?? [];
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.replace(/\s+/g, " ").trim();
    const range = id.match(/^TASK\s*(\d+)\s*-\s*(\d+)$/i);
    if (range) {
      const lo = Number(range[1]);
      const hi = Number(range[2]);
      for (let n = lo; n <= hi; n++) out.push(`TASK_${n}`);
    } else out.push(id.replace(/\s+/g, "_"));
  }
  return out;
}

/** The judge's input: the edge-extraction framing over the plan text. */
export function planDagInput(planText: string, opts?: { window?: number }): string {
  const window = opts?.window ?? REVIEW_CONTEXT_WINDOW;
  const body =
    planText.length > window - 2_000
      ? `${planText.slice(0, window - 2_000)}…[truncated ${planText.length - (window - 2_000)} chars]`
      : planText;
  return (
    "Extract the task `Depends On` edges from this plan text: one row per " +
    "task, its id exactly as the plan writes it, and the ids it depends on " +
    "(empty when none). Every task appears exactly once; do not invent tasks " +
    "or dependencies that the plan does not state.\n\n" +
    body
  );
}

/** Kahn cycle check over the extracted edges. Returns the tasks stuck in a
 *  cycle (empty when acyclic). */
function planDagCycle(edges: PlanDagEdge[]): string[] {
  const indegree = new Map<string, number>();
  const byId = new Map<string, PlanDagEdge>();
  for (const e of edges) {
    const key = normTaskId(e.task);
    byId.set(key, e);
    indegree.set(key, e.dependsOn.filter((d) => byId.has(normTaskId(d)) || true).length);
  }
  // only deps that name a task in the extraction count as graph edges
  for (const e of edges) {
    const key = normTaskId(e.task);
    indegree.set(
      key,
      e.dependsOn.filter((d) => byId.has(normTaskId(d))).length
    );
  }
  const queue = [...byId.keys()].filter((k) => (indegree.get(k) ?? 0) === 0);
  const done = new Set<string>();
  while (queue.length) {
    const id = queue.pop()!;
    done.add(id);
    for (const e of byId.values())
      if (e.dependsOn.some((d) => normTaskId(d) === id)) {
        const k = normTaskId(e.task);
        const n = (indegree.get(k) ?? 1) - 1;
        indegree.set(k, n);
        if (n === 0 && !done.has(k)) queue.push(k);
      }
  }
  return [...byId.keys()].filter((k) => !done.has(k)).map((k) => byId.get(k)!.task);
}

/** Extract the plan's `Depends On` edges through the seam. Unknown ids,
 *  duplicate rows, cycles, and schema-invalid rows are FINDINGS — the edges
 *  stay visible for the owner to confirm or correct, never silently
 *  accepted or dropped. A backend skip or below-floor confidence is LOUD:
 *  defaultPath=true (the hand-derived edges apply). */
export async function extractPlanDag(
  backend: JudgeBackend,
  planText: string,
  taskIds?: string[],
  opts?: { window?: number }
): Promise<PlanDagResult> {
  const v = await backend.classify(PLAN_DAG_SCHEMA, planDagInput(planText, opts));
  const base = { backend: backend.name, calls: 1, findings: [] as PlanDagFinding[] };
  if (v.skipped)
    return {
      ...base,
      edges: [],
      skipped: true,
      defaultPath: true,
      reason: `JUDGE SKIPPED (${v.reason ?? "unspecified"}) — derive the Depends On edges by hand`,
      confidence: 0,
    };
  const confidence = typeof v.confidence === "number" && Number.isFinite(v.confidence) ? v.confidence : 0;
  if (confidence < TRIAGE_CONFIDENCE_FLOOR)
    return {
      ...base,
      edges: [],
      skipped: true,
      defaultPath: true,
      reason: `below confidence floor (${confidence} < ${TRIAGE_CONFIDENCE_FLOOR}) — derive the Depends On edges by hand`,
      confidence,
    };
  const raw = (v.value ?? {}) as Record<string, unknown>;
  if (raw.edges === null || raw.edges === undefined)
    return {
      ...base,
      edges: [],
      skipped: false,
      defaultPath: false,
      reason: "no extractable edges (native abstention) — confirm the edges by hand",
      confidence,
    };
  if (!Array.isArray(raw.edges))
    return {
      ...base,
      edges: [],
      skipped: true,
      defaultPath: true,
      reason: "schema-invalid response: edges is neither an array nor null",
      confidence,
    };
  const edges: PlanDagEdge[] = [];
  const findings: PlanDagFinding[] = [];
  const counts = new Map<string, number>();
  for (const e of raw.edges as unknown[]) {
    if (!e || typeof e !== "object" || Array.isArray(e)) {
      findings.push({ kind: "schema-invalid", detail: "edge row is not an object" });
      continue;
    }
    const row = e as Record<string, unknown>;
    if (typeof row.task !== "string" || !row.task.trim() || !Array.isArray(row.dependsOn) || row.dependsOn.some((d) => typeof d !== "string")) {
      findings.push({ kind: "schema-invalid", detail: `edge row malformed for '${String(row.task)}'` });
      continue;
    }
    const edge: PlanDagEdge = { task: row.task.trim(), dependsOn: (row.dependsOn as string[]).map((d) => d.trim()) };
    edges.push(edge);
    const key = normTaskId(edge.task);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (taskIds) {
      const known = new Set(taskIds.map(normTaskId));
      for (const d of edge.dependsOn)
        if (!known.has(normTaskId(d)))
          findings.push({
            kind: "unknown-task",
            detail: `${edge.task} depends on '${d}' — no such task id in the plan`,
          });
    }
  }
  for (const [key, n] of counts)
    if (n > 1)
      findings.push({
        kind: "duplicate-task",
        detail: `${key} appears ${n} times — every task exactly once`,
      });
  const cycle = planDagCycle(edges);
  if (cycle.length)
    findings.push({ kind: "cycle", detail: `cyclic Depends On edges through: ${cycle.join(", ")}` });
  return {
    edges,
    findings,
    skipped: false,
    defaultPath: false,
    backend: backend.name,
    calls: 1,
    confidence,
  };
}

/** The confirmation rendering for the /plan flow: proposed edges + FINDING
 *  rows (a wrong edge is a finding, never silent acceptance) + the loud
 *  skip line when the judge is out (the hand-derived path applies). */
export function renderPlanDagTable(r: PlanDagResult): string {
  const lines: string[] = [];
  if (r.skipped) {
    lines.push(`JUDGE SKIPPED (${r.reason ?? "unspecified"}) — derive the Depends On edges by hand`);
    return lines.join("\n");
  }
  lines.push(
    "PLAN DAG — proposed `Depends On` edges. The OWNER must CONFIRM or correct " +
      "every edge; a wrong edge is a finding, never silent acceptance."
  );
  lines.push("| task | depends on |");
  lines.push("|---|---|");
  for (const e of r.edges) lines.push(`| ${e.task} | ${e.dependsOn.join(", ") || "—"} |`);
  for (const f of r.findings) lines.push(`FINDING (${f.kind}): ${f.detail}`);
  if (r.reason) lines.push(r.reason);
  return lines.join("\n");
}

/** plan-check's AFTER step: validate the owner-confirmed edges against the
 *  WRITTEN plan (TASK `Depends on` bullets, Spec Map fallback). A mismatch
 *  is named per task — wrong edges are a finding. */
export function validatePlanDag(
  planText: string,
  edges: PlanDagEdge[]
): { ok: boolean; mismatches: string[] } {
  const plan = parsePlanDeps(planText);
  const planById = new Map(plan.map((e) => [normTaskId(e.task), e]));
  const mismatches: string[] = [];
  for (const e of edges) {
    const key = normTaskId(e.task);
    const stated = planById.get(key);
    if (!stated) {
      mismatches.push(`${e.task}: not defined in the plan`);
      continue;
    }
    const a = new Set(stated.dependsOn.map(normTaskId));
    const b = new Set(e.dependsOn.map(normTaskId));
    const missing = [...a].filter((d) => !b.has(d));
    const extra = [...b].filter((d) => !a.has(d));
    if (missing.length || extra.length) {
      const parts: string[] = [];
      if (missing.length) parts.push(`plan states ${stated.dependsOn.join(", ") || "none"}`);
      if (extra.length) parts.push(`edges state ${e.dependsOn.join(", ") || "none"}`);
      mismatches.push(`${e.task}: Depends On mismatch — ${parts.join("; ")}`);
    }
  }
  return { ok: mismatches.length === 0, mismatches };
}

/* ── 17. /audit batch verdicts (plan 078 Task 4) — the checklist as typed questions ──
 *
 *  The audit checklist becomes many typed questions over ONE codebase batch:
 *  boolean gate-questions (confirmed), enum severities (P0-P3 — the /audit
 *  output schema is UNCHANGED), and number evidence counts. Findings are
 *  pre-verified by the judge; the owner receives the verified digest; the
 *  uncertain rows stay for the agent (the manual-review queue). /audit
 *  exists as a pi-workflows command (prompts/audit.md) — this capability
 *  rides the same seam for it; one classify call per window (128K native;
 *  a smaller window chunks), calls counted at the seam. Skips and
 *  below-floor verdicts route the WHOLE batch to the agent, loudly. */

export const AUDIT_SEVERITIES = ["P0", "P1", "P2", "P3"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_BATCH_SCHEMA = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      description:
        "One verified row per candidate finding, in the candidate order. A row you cannot verify from the batch stays confirmed=false — never guess, never drop a candidate.",
      items: {
        type: "object",
        properties: {
          finding: {
            type: "string",
            description: "the finding text, verbatim from the candidate",
          },
          severity: {
            type: "string",
            enum: AUDIT_SEVERITIES,
            description:
              "P0 blocking-critical · P1 major · P2 moderate · P3 minor — the /audit severity vocabulary, unchanged",
          },
          confirmed: {
            type: "boolean",
            description:
              "true only when the evidence in the batch visibly supports the finding; ambiguous or missing evidence stays false",
          },
          evidenceCount: {
            type: "integer",
            minimum: 1,
            description: "how many distinct pieces of evidence back the row (at least one, even when unconfirmed)",
          },
          evidence: {
            type: "string",
            description: "one short quote or description of the driving evidence",
          },
          fileRefs: {
            type: "array",
            items: { type: "string" },
            description: "file:line references for the evidence, when resolvable",
          },
        },
        required: ["finding", "severity", "confirmed", "evidenceCount"],
        additionalProperties: false,
      },
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description:
        "0-1 confidence in the batch verdicts. 0.9+ only when the evidence decides the rows unambiguously.",
    },
  },
  required: ["findings", "confidence"],
  additionalProperties: false,
} as const;

export interface AuditCandidate {
  id?: string;
  finding: string;
  claimedSeverity?: string;
  evidence?: string;
}

export interface AuditBatchRow {
  finding: string;
  severity: AuditSeverity;
  confirmed: boolean;
  evidenceCount: number;
  evidence?: string;
  fileRefs?: string[];
}

export interface AuditBatchResult {
  rows: AuditBatchRow[];
  /** Uncertain / schema-invalid rows — the agent verifies these by hand. */
  forAgent: string[];
  skippedAll: boolean;
  reason?: string;
  backend: string;
  calls: number;
  confidence: number;
}

function auditBatchInput(candidates: AuditCandidate[]): string {
  return (
    "Verify these audit candidate findings against the evidence carried in " +
    "each row. One verified row per candidate, in order: a typed severity " +
    "(P0-P3), the boolean confirmed gate, and the number of distinct pieces " +
    "of evidence backing it. Ambiguous evidence stays unconfirmed — a guess " +
    "scores as a miss.\n\n" +
    candidates
      .map((c, i) => {
        const id = c.id ?? `c${i + 1}`;
        const claimed = c.claimedSeverity ? ` (claimed severity ${c.claimedSeverity})` : "";
        const ev = c.evidence ? `\nEvidence: ${c.evidence}` : "";
        return `- [${id}]${claimed} ${c.finding}${ev}`;
      })
      .join("\n")
  );
}

/** Verify a batch of audit candidates through the seam: ONE classify call
 *  per window (the native 128K; a smaller window chunks — calls counted).
 *  Pre-verified rows are the owner's digest; uncertain and schema-invalid
 *  rows route to the agent, loudly. A backend skip or below-floor confidence
 *  routes the WHOLE batch to the agent (skippedAll) — never a silent pass. */
export async function auditBatchVerdicts(
  backend: JudgeBackend,
  candidates: AuditCandidate[],
  opts?: { window?: number }
): Promise<AuditBatchResult> {
  const window = opts?.window ?? REVIEW_CONTEXT_WINDOW;
  const rows: AuditBatchRow[] = [];
  const forAgent: string[] = [];
  let calls = 0;
  let confidence = 0;
  let firstSkipReason: string | undefined;
  // chunk the candidates so each input fits the window (bounds: the input is
  // candidates + framing; chunk when the serialized batch would exceed it)
  const serialize = (list: AuditCandidate[]) => auditBatchInput(list).length;
  const chunks: AuditCandidate[][] = [];
  if (candidates.length) {
    let current: AuditCandidate[] = [];
    for (const c of candidates) {
      current.push(c);
      if (serialize(current) > window - 2_000 && current.length > 1) {
        chunks.push(current.slice(0, -1));
        current = [c];
      }
    }
    chunks.push(current);
  }
  for (const chunk of chunks) {
    calls++;
    const v = await backend.classify(AUDIT_BATCH_SCHEMA, auditBatchInput(chunk));
    if (v.skipped) {
      firstSkipReason ??= v.reason ?? "judge skipped (unspecified)";
      forAgent.push(...chunk.map((c) => c.finding));
      continue;
    }
    const raw = (v.value ?? {}) as Record<string, unknown>;
    confidence = typeof v.confidence === "number" && Number.isFinite(v.confidence) ? v.confidence : 0;
    if (confidence < TRIAGE_CONFIDENCE_FLOOR) {
      firstSkipReason ??= `below confidence floor (${confidence} < ${TRIAGE_CONFIDENCE_FLOOR}) — the agent verifies the batch by hand`;
      forAgent.push(...chunk.map((c) => c.finding));
      continue;
    }
    const list = Array.isArray(raw.findings) ? (raw.findings as unknown[]) : null;
    if (!list) {
      firstSkipReason ??= "schema-invalid response: findings is not an array — the agent verifies the batch by hand";
      forAgent.push(...chunk.map((c) => c.finding));
      continue;
    }
    const claimedByFinding = new Map(chunk.map((c) => [c.finding, c]));
    for (const item of list) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const row = item as Record<string, unknown>;
      const finding = typeof row.finding === "string" ? row.finding : null;
      if (!finding) continue;
      const severity = AUDIT_SEVERITIES.includes(row.severity as AuditSeverity)
        ? (row.severity as AuditSeverity)
        : null;
      const confirmed = typeof row.confirmed === "boolean" ? row.confirmed : null;
      const evidenceCount =
        typeof row.evidenceCount === "number" && Number.isInteger(row.evidenceCount) && row.evidenceCount >= 1
          ? row.evidenceCount
          : null;
      const claimed = claimedByFinding.get(finding);
      if (!severity || !claimed || confirmed === null || evidenceCount === null) {
        // schema-invalid row (or an invented finding) — the agent takes it, loudly
        forAgent.push(finding);
        continue;
      }
      if (!confirmed) forAgent.push(finding);
      rows.push({
        finding,
        severity,
        confirmed,
        evidenceCount,
        ...(typeof row.evidence === "string" && row.evidence ? { evidence: row.evidence } : {}),
        ...(Array.isArray(row.fileRefs)
          ? { fileRefs: (row.fileRefs as unknown[]).filter((f): f is string => typeof f === "string") }
          : {}),
      });
    }
  }
  const skippedAll = forAgent.length === candidates.length && candidates.length > 0;
  return {
    rows,
    forAgent,
    skippedAll,
    ...(skippedAll && firstSkipReason !== undefined ? { reason: firstSkipReason } : {}),
    backend: backend.name,
    calls,
    confidence,
  };
}

/** The owner's digest — the /audit Phase-3 DISTILL shape, schema unchanged:
 *  numbered confirmed findings with [Pn] + file:line evidence, then the
 *  manual-review queue (the agent verifies those by hand). A skip prints
 *  JUDGE SKIPPED with the remediation named. */
export function renderAuditDigest(r: AuditBatchResult): string {
  const lines: string[] = [];
  if (r.skippedAll)
    lines.push(`JUDGE SKIPPED (${r.reason ?? "unspecified"}) — the agent verifies the batch by hand`);
  lines.push(`# Audit batch verdicts (backend ${r.backend}, ${r.calls} call(s))`);
  const confirmed = r.rows.filter((row) => row.confirmed);
  lines.push("");
  lines.push("## Confirmed findings");
  if (!confirmed.length) lines.push("- (none pre-verified — everything routed to the agent)");
  confirmed.forEach((row, i) => {
    const refs = row.fileRefs?.length ? ` — ${row.fileRefs.join(", ")}` : "";
    const ev = row.evidence ? ` — ${row.evidence}` : "";
    lines.push(`${i + 1}. [${row.severity}] ${row.finding}${refs}${ev} (${row.evidenceCount} evidence)`);
  });
  lines.push("");
  lines.push("## Manual review queue (the agent verifies by hand)");
  if (!r.forAgent.length) lines.push("- (empty — every candidate was pre-verified)");
  for (const f of r.forAgent) lines.push(`- ${f}`);
  return lines.join("\n");
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
