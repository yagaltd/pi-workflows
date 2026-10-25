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
 *    tdd-gate (gaming/drift on the touched spec) — blocking the write on
 *    violation with the failing layer + command + first findings line.
 *    Toolchain absent ⇒ one-line advisory per file (deduped, watchdog
 *    pattern), write allowed. `*.md` writes outside the spec dirs skip
 *    silently (docs enforcement is the doc-drift gate's scope).
 *
 * Deliberately small: role substitution + drift watchdogs + write-time
 * gate. The watchdogs encode the docs/verdict policy checks (see
 * templates/DOCS-POLICY.md — the exemption list there and isDocsExempt
 * here must stay aligned); everything else stays out.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
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
  /** plan `tdd:` flag — routes the tdd-gate lines into gateCommands */
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

    const bullet = (name: string): string | null => {
      const b = new RegExp(`^[-*]\\s*\\*\\*${name}\\*\\*:?\\s*(.+)$`, "m").exec(body);
      return b ? b[1].trim() : null;
    };
    const statusMark = /^[-*]\s*\*\*Status\*\*:?\s*(.)/m.exec(body)?.[1];
    const depsRaw = bullet("Depends On");
    const waveRaw = bullet("Wave");
    const allowedRaw = bullet("Allowed");
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
      tdd: /^true$/i.test(bullet("tdd") ?? ""),
      parallelGroup: group,
      allowed: allowedRaw
        ? allowedRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      verify: bullet("Verify") ?? "",
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
    `Repo: ${repo} (GUARD: verify pwd + git toplevel — toplevel = repo root OR a <repo>/.git/subagents/** worktree).`,
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

/** Ordered gate list for a task: contract lifecycle, then the tdd-gate
 *  test-quality layer when the plan flags it, then the plan's Verify line. */
export function gateCommandsFor(task: DispatchTask): string[] {
  const cmds = [`agent-spec lifecycle ${task.contractPath} --code .`];
  if (task.tdd) {
    cmds.push(
      `tdd-gate gaming --diff`,
      `tdd-gate drift --spec ${task.contractPath}`
    );
  }
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
 *  is the D5 advisory path, never a block. */
export function runGate(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs = 10000
): GateRunResult | null {
  try {
    const r = spawnSync(cmd, args, { cwd, encoding: "utf8", timeout: timeoutMs });
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
 * lifecycle --format json (scenarios) → tdd-gate gaming/drift (test quality).
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
      // Layer 2 — test quality (tdd-gate); a missing binary advises the
      // sub-step only — Layer 1 still gated this write (D5).
      const gamingCommand = "tdd-gate gaming --diff";
      const gaming = input.run("tdd-gate", ["gaming", "--diff"]);
      if (gaming === null) return advisoryTddGate(file);
      if (gaming.code !== 0)
        return gateBlock(
          "Layer 2 test-quality (tdd-gate gaming)",
          gamingCommand,
          firstFindingsLine(`${gaming.stdout}\n${gaming.stderr}`),
          file
        );
      const driftCommand = `tdd-gate drift --spec ${task.contractPath}`;
      const drift = input.run("tdd-gate", ["drift", "--spec", task.contractPath]);
      if (drift === null) return advisoryTddGate(file);
      if (drift.code !== 0)
        return gateBlock(
          "Layer 2 test-quality (tdd-gate drift)",
          driftCommand,
          firstFindingsLine(`${drift.stdout}\n${drift.stderr}`),
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

function advisoryTddGate(file: string): AutoGateDecision {
  return gateAdvisory(
    file,
    `[pi-workflows auto-gate] tdd-gate not found on PATH — Layer 2 (test-quality) skipped for ${file} (advisory only); Layer 1 still gated this write.`
  );
}

/* ---------------------------------- wiring ---------------------------------- */

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
}
