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
 *    shows ✅ tasks lacking the `context:` marker or a final `ok: true`
 *    verdict on file, inject a one-line reminder — drift surfaces at the
 *    moment it happens, not at /review time. Reminds once per new gap
 *    count (no spam).
 *
 * Deliberately dumb: substitution + watchdog only. No workflow logic here.
 */

import * as fs from "fs";
import * as path from "path";

/** Strip the leading "# Role:" header comment block from a role file. */
export function roleBody(content: string): string {
  // Drop leading HTML comment (the dispatch note) and the "# Role:" line.
  return content
    .replace(/^<!--[\s\S]*?-->\s*/, "")
    .replace(/^#\s*Role:[^\n]*\n+/, "")
    .trim();
}

/** All `@role:<name>` references found in a prompt/task string. */
export function roleRefs(text: string): string[] {
  if (typeof text !== "string") return [];
  const out: string[] = [];
  const re = /@role:([a-z][a-z0-9-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push(m[1]);
  return out;
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

/** Rewrite every prompt-ish field of a subagent tool input in place. */
export function resolveSubagentInput(
  input: any,
  readFile: (name: string) => string | null
): string[] {
  const errors: string[] = [];
  const fields: (string | undefined)[] = [];
  if (input && typeof input === "object") {
    if (typeof input.prompt === "string") fields.push(input.prompt);
    if (Array.isArray(input.tasks)) {
      for (const t of input.tasks) if (t && typeof t.prompt === "string") fields.push(t.prompt);
    }
  }
  // Only rewrite when a ref is present; leave everything else untouched.
  for (const f of fields) {
    if (!f || !f.includes("@role:")) continue;
    const r = resolveRefs(f, readFile);
    if (r.errors.length) errors.push(...r.errors);
    if (input.prompt === f) input.prompt = r.text;
    else if (Array.isArray(input.tasks)) {
      for (const t of input.tasks) if (t && t.prompt === f) t.prompt = r.text;
    }
  }
  return errors;
}

/** Hygiene drift between plan.md statuses and the audit trails. */
export function computeHygieneDrift(
  planContent: string,
  reviewFiles: { name: string; content: string }[]
): { missingContextMarkers: number; missingFinalVerdicts: number } {
  const doneTasks = (planContent.match(/✅/g) || []).length;
  const contextMarkers = (planContent.match(/^context: /gm) || []).length;
  const finalOkTrue = reviewFiles.filter((f) => /\*\*ok: true\*\*/.test(f.content)).length;
  return {
    missingContextMarkers: Math.max(0, doneTasks - contextMarkers),
    missingFinalVerdicts: Math.max(0, doneTasks - finalOkTrue),
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

  // 2. Hygiene watchdog — remind once per new gap count, never spam.
  let lastNotified: string = "";
  pi.on("before_agent_start", async (event: any, ctx: any) => {
    try {
      const cwd = event?.cwd || ctx?.cwd || process.cwd();
      const planPath = path.join(cwd, ".workflows", "plan.md");
      if (!fs.existsSync(planPath)) return;
      const plan = fs.readFileSync(planPath, "utf8");
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
      const drift = computeHygieneDrift(plan, reviewFiles);
      const key = JSON.stringify(drift);
      if (
        (drift.missingContextMarkers > 0 || drift.missingFinalVerdicts > 0) &&
        key !== lastNotified
      ) {
        lastNotified = key;
        const parts: string[] = [];
        if (drift.missingContextMarkers > 0)
          parts.push(`${drift.missingContextMarkers} ✅ task(s) missing a 'context:' marker`);
        if (drift.missingFinalVerdicts > 0)
          parts.push(`${drift.missingFinalVerdicts} ✅ task(s) without a final ok:true verdict on file`);
        const reminder = `[pi-workflows hygiene] ${parts.join("; ")} — run the CONTEXT.md/verdict sweep (see /review Layer 3).`;
        if (typeof event.injectMessage === "function") event.injectMessage(reminder);
      } else if (drift.missingContextMarkers === 0 && drift.missingFinalVerdicts === 0) {
        lastNotified = "";
      }
    } catch {
      // Watchdog must never break a turn.
    }
  });
}
