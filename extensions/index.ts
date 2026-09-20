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
 * 3. Supersede watchdog (before_agent_start): mechanical trigger — a
 *    changed file carries an `adr:`-attributed `@cc` contract, or a
 *    spec's `## Decisions` section changed while no new ADR file exists —
 *    injects ONE advisory line naming the seam. Advisory only: it never
 *    edits, gates, or emits a verdict. The exported `supersedeAdvisoryLine`
 *    hook is the Jev routing seam the orchestrator calls with the choice
 *    probability (≥0.90 names the human gate); the extension itself never
 *    calls typesafe. Reminds once per new gap (no spam).
 *
 * Deliberately small: role substitution + drift watchdogs. The
 * watchdogs encode the docs/verdict policy checks (see
 * templates/DOCS-POLICY.md — the exemption list there and isDocsExempt
 * here must stay aligned); everything else stays out.
 */

import * as fs from "fs";
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

/* ------------------- supersede watchdog (advisory only) ------------------- */

export interface AdrContract {
  id: string;
  label: string;
  adr: string;
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
    out.push({ id, label, adr });
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
    out.push({ id, label, adr });
  }
  return out;
}

export interface SupersedeGap {
  seam: string;
  trigger: "adr-contract-file" | "decisions-changed";
  adr?: string;
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
      gaps.push({ seam: `${file} (${c.id})`, trigger: "adr-contract-file", adr: c.adr });
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
 * Jev choice/supersedes probability at or above this line names the human
 *  gate; below it the advisory stays static. Routing only — never a verdict. */
export const SUPERSEDE_PROBABILITY_THRESHOLD = 0.90;

/** Build the single advisory line for a gap. `choiceProbability` comes from
 *  the orchestrator's Jev call; `null`/`undefined` (typesafe unavailable)
 *  yields a static line, never a crash. */
export function supersedeAdvisoryLine(
  gap: SupersedeGap,
  choiceProbability?: number | null
): string {
  const base = `[pi-workflows supersede] ${gap.seam} (${gap.trigger}${
    gap.adr ? `, adr:${gap.adr}` : ""
  })`;
  if (choiceProbability == null) {
    return `${base} — static advisory (typesafe unavailable): possible ADR supersession — raise it at the human gate (advisory only).`;
  }
  if (Number.isFinite(choiceProbability) && choiceProbability >= SUPERSEDE_PROBABILITY_THRESHOLD) {
    return `${base} — Jev choice/supersedes probability ${choiceProbability.toFixed(
      2
    )} ≥ 0.90: HUMAN GATE required — confirm the supersede/contradiction with the human before proceeding (advisory only).`;
  }
  return `${base} — static advisory (probability ${choiceProbability.toFixed(
    2
  )} < 0.90): possible ADR supersession — raise it at the human gate (advisory only).`;
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

      // Supersede watchdog — mechanical trigger only; the extension never
      // calls typesafe. The orchestrator may re-render the line through
      // `supersedeAdvisoryLine(gap, choiceProbability)` when Jev is reachable.
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
}
