import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildAdoptContext,
  buildInitMiseFragment,
  extractAdoptDraft,
  recordedAdoptBackend,
  writeAdoptDrafts,
} from "../scripts/init-extract.ts";

// Plan 20261102-050 T1 — role-file doctrine: the three DSH/Bise steals.
// Pins the exact doctrine lines in agents/worker.md and agents/reviewer.md.

const WORKER = fs.readFileSync("agents/worker.md", "utf8");
const REVIEWER = fs.readFileSync("agents/reviewer.md", "utf8");

const BUDGET =
  "Budget: at most 60 tool calls on standard tasks; judge/API-call caps are set per contract — when any budget is spent, report and stop, naming the spent line item.";
const DONE_WHEN =
  "Every pack carries a 'Done when:' acceptance checklist derived from the contract's verify command and completion criteria; the final report asserts each line individually.";
const CITE =
  "Doc- or claim-producing tasks: every factual claim cites file:line or a URL, or lands in an 'Open questions' section of the final report. An uncited, unflagged claim is a defect.";

describe("prompt doctrine: budget, done-when, cite-or-open-questions (plan 20261102-050 T1)", () => {
  test("budget line is pinned verbatim in worker and reviewer role files", () => {
    expect(WORKER).toContain(BUDGET);
    expect(REVIEWER).toContain(BUDGET);
  });

  test("done-when checklist line is pinned verbatim in the worker role file", () => {
    expect(WORKER).toContain(DONE_WHEN);
  });

  test("cite-or-open-questions line is pinned verbatim in worker and reviewer role files", () => {
    expect(WORKER).toContain(CITE);
    expect(REVIEWER).toContain(CITE);
  });

  test("doctrine lines sit in natural sections (worker: task-execution rules area; reviewer: verification rules area)", () => {
    const workerExec = WORKER.indexOf("## While You Build");
    const workerExecEnd = WORKER.indexOf("## Deterministic Verification");
    expect(workerExec).toBeGreaterThan(-1);
    expect(workerExecEnd).toBeGreaterThan(workerExec);
    const workerSlice = WORKER.slice(workerExec, workerExecEnd);
    expect(workerSlice).toContain(BUDGET);
    expect(workerSlice).toContain(DONE_WHEN);
    expect(workerSlice).toContain(CITE);

    const reviewerRules = REVIEWER.indexOf("## Rules");
    expect(reviewerRules).toBeGreaterThan(-1);
    const reviewerSlice = REVIEWER.slice(reviewerRules);
    expect(reviewerSlice).toContain(BUDGET);
    expect(reviewerSlice).toContain(CITE);
  });
});

const readT2 = (p: string) => fs.readFileSync(p, "utf8").replace(/\s+/g, " ");

// --- T2: dispatch-policy pins (plan 20261102-050) ---
describe("prompt doctrine — dispatch policy (T2, plan 20261102-050)", () => {
  test("registry dispatch policy assigns per-task budgets in the pack", () => {
    const registry = readT2("agents/registry.md");
    expect(registry).toContain(
      "The orchestrator assigns each task's budget in the pack (default 60 tool calls from role doctrine; judge/API-call caps explicit when the task touches judge/API surfaces).",
    );
  });

  test("execution doctrine report rules carry the Done-when assertion duty", () => {
    const doctrine = readT2("agents/execution-doctrine.md");
    expect(doctrine).toContain(
      "final report asserts each Done-when line individually",
    );
  });

  test("verify reviewer checklist gains the additive cite-check line", () => {
    const verify = readT2("prompts/verify.md");
    expect(verify).toContain(
      "Cite-check: spot-check that factual claims in doc-producing tasks carry file:line/URL citations; uncited claims are findings.",
    );
  });

  test("contract format documents the optional Budget section (prose, not a parser key)", () => {
    const format = readT2("templates/CONTRACT-FORMAT.md");
    expect(format).toContain("## Budget");
    expect(format).toContain("human-readable prose");
    expect(format).toContain("NOT an agent-spec parser key");
  });
});

// --- T3: /init model policy + catalog-first resolution (plan 20261102-051) ---
const readT3 = (p: string) => fs.readFileSync(p, "utf8");
const normT3 = (s: string) => s.replace(/\s+/g, " ");

describe("prompt doctrine — /init model policy + catalog-first resolution (T3, plan 20261102-051)", () => {
  test("init skill has a Model policy step 9 between the Dev environment step and the handoff (renumbered 10)", () => {
    const skill = readT3("skills/init/SKILL.md");
    const probe = skill.indexOf("**Charter probe**");
    const model = skill.indexOf("**Model policy**");
    const handoff = skill.indexOf("**Hand off**");
    expect(probe).toBeGreaterThan(-1);
    expect(model).toBeGreaterThan(probe);
    expect(handoff).toBeGreaterThan(model);
    expect(skill).toMatch(/9\. \*\*Model policy\*\*/);
    expect(skill).toMatch(/10\. \*\*Hand off\*\*/);
  });

  test("model policy step queries the live pi catalog, presents the tier shortlist at a human gate, and writes models/registry.json with pi-catalog provenance", () => {
    const step = normT3(readT3("skills/init/SKILL.md"));
    const m = step.indexOf("Model policy");
    const slice = step.slice(m, step.indexOf("Hand off", m));
    expect(slice).toContain("catalog");
    expect(slice).toContain("strong/standard/scout/vision");
    expect(slice).toContain("🛑");
    expect(slice).toContain("models/registry.json");
    expect(slice).toContain("pi-catalog");
    expect(slice).toContain("native");
  });

  test("catalog = capability, never key files: the never-read-keys rule is pinned in the model policy step", () => {
    const step = normT3(readT3("skills/init/SKILL.md"));
    const m = step.indexOf("Model policy");
    const slice = step.slice(m, step.indexOf("Hand off", m));
    expect(slice).toContain("capability");
    expect(slice).toContain("NEVER");
    expect(slice).toMatch(/key files|key contents|API keys/);
  });

  test("registry.md Model resolution order: live pi catalog (native-preferred) → models/registry.json → legacy constants with loud WARN", () => {
    const registry = normT3(readT3("agents/registry.md"));
    const m = registry.indexOf("## Model resolution");
    expect(m).toBeGreaterThan(-1);
    const slice = registry.slice(m, registry.indexOf("## Dispatch cwd policy")).toLowerCase();
    const cat = slice.indexOf("live pi catalog");
    const file = slice.indexOf("models/registry.json", cat + 1);
    const legacy = slice.indexOf("legacy", file + 1);
    expect(cat).toBeGreaterThan(-1);
    expect(file).toBeGreaterThan(cat);
    expect(legacy).toBeGreaterThan(file);
    expect(slice).toContain("native-preferred");
    expect(slice).toContain("never silent");
    expect(slice).toContain("never key files");
  });

  test("legacy deepseek constants remain marked fallbacks in registry.md", () => {
    const registry = normT3(readT3("agents/registry.md"));
    expect(registry).toContain("deepseek/deepseek-v4-pro");
    expect(registry).toContain("openrouter/~deepseek/deepseek-flash-latest");
    expect(registry).toContain("fallback");
  });
});

// T5 — plan 20261102-052: eval orchestration wiring + doctrine.
// Pins the mise eval file task, the .workflows/evals whitelist, and the
// Eval kaizen triggers section in agents/execution-doctrine.md.

const EVAL_TASK = fs.readFileSync(".mise/tasks/eval", "utf8");
const CI_TASK = fs.readFileSync(".mise/tasks/ci", "utf8");
const GITIGNORE = fs.readFileSync(".gitignore", "utf8");
const DOCTRINE = fs.readFileSync("agents/execution-doctrine.md", "utf8");

describe("eval wiring + doctrine (T5, plan 20261102-052)", () => {
  test("mise eval file task runs eval-orchestration.mjs", () => {
    expect(EVAL_TASK).toContain("node scripts/eval-orchestration.mjs");
  });

  test("eval is NOT part of the ci file task (judge costs stay out of CI)", () => {
    expect(CI_TASK).toContain("./scripts/check-drift.sh");
    expect(CI_TASK).not.toContain("eval-orchestration");
  });

  test(".gitignore whitelists .workflows/evals/ right after the .workflows/* block", () => {
    expect(GITIGNORE).toContain("!.workflows/evals/");
    const ignoreLine = GITIGNORE.indexOf(".workflows/*");
    const whitelist = GITIGNORE.indexOf("!.workflows/evals/");
    expect(whitelist).toBeGreaterThan(ignoreLine);
    expect(GITIGNORE.slice(ignoreLine, whitelist)).not.toContain(".workflows/evals/");
  });

  test("execution-doctrine.md pins Eval kaizen triggers: both modes + autonomy boundary", () => {
    const m = DOCTRINE.indexOf("Eval kaizen triggers");
    expect(m).toBeGreaterThan(-1);
    const slice = DOCTRINE.slice(m, m + 1500).toLowerCase();
    expect(slice).toContain("daily-kaizen");
    expect(slice).toContain("single-dimension");
    expect(slice).toContain("kaizen-event");
    expect(slice).toContain("consecutive");
    expect(slice).toContain("10%");
    expect(slice).toContain("measurement autonomous");
    expect(slice).toContain("human approval");
    expect(slice).toContain("committed data");
  });
});

// --- T6: /init step 7 "Dev environment (mise)" (plan 20261102-053) ---
// Pins the mise wiring: stack-marker + version-file detection, greenfield
// mise.toml generation vs brownfield native-report + opt-in consolidation,
// the 🛑 gate, install+verify, the three boundaries, the loud mise-absent
// skip, and the mechanical renumber (Model policy → 8, handoff → 9).

const readT6 = (p: string) => fs.readFileSync(p, "utf8");
const normT6 = (s: string) => s.replace(/\s+/g, " ");

describe("prompt doctrine — /init Dev environment (mise) step 7 (T6, plan 20261102-053)", () => {
  const devSlice = () => {
    const skill = normT6(readT6("skills/init/SKILL.md"));
    const m = skill.indexOf("Dev environment (mise)");
    return skill.slice(m, skill.indexOf("Model policy", m));
  };

  test("init skill has a Dev environment (mise) step 7 between the Charter probe and Model policy (Model policy renumbered 8, handoff 9)", () => {
    const skill = readT6("skills/init/SKILL.md");
    const probe = skill.indexOf("**Charter probe**");
    const dev = skill.indexOf("**Dev environment (mise)**");
    const model = skill.indexOf("**Model policy**");
    const handoff = skill.indexOf("**Hand off**");
    expect(probe).toBeGreaterThan(-1);
    expect(dev).toBeGreaterThan(probe);
    expect(model).toBeGreaterThan(dev);
    expect(handoff).toBeGreaterThan(model);
    expect(skill).toMatch(/7\. \*\*Dev environment \(mise\)\*\*/);
    expect(skill).toMatch(/9\. \*\*Model policy\*\*/);
    expect(skill).toMatch(/10\. \*\*Hand off\*\*/);
  });

  test("step 7 detects stack markers and the version files mise already reads natively as-is", () => {
    const slice = devSlice();
    expect(slice).toContain(
      "`package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `Gemfile`, `*.csproj`",
    );
    expect(slice).toContain("`.nvmrc`, `.python-version`, `.tool-versions`, `mise.toml`");
  });

  test("greenfield: generate mise.toml [tools] pinned from markers + mise current; brownfield: report native pinning, OFFER consolidation (never forced)", () => {
    const slice = devSlice();
    expect(slice).toContain("mise.toml");
    expect(slice).toContain("[tools]");
    expect(slice).toContain("mise current");
    expect(slice).toContain("natively as-is");
    expect(slice).toContain("OFFER");
    expect(slice).toContain("never forced");
  });

  test("the mise.toml write is gated behind a 🛑 human gate; verify = mise install + mise exec -- <runtime> --version", () => {
    const slice = devSlice();
    expect(slice).toContain("🛑");
    expect(slice).toContain("mise install");
    expect(slice).toContain("mise exec -- <runtime> --version");
  });

  test("three boundaries: never delete existing version files, never upgrade runtimes only to enable it, never silently replace another tool manager", () => {
    const slice = devSlice();
    expect(slice).toContain("NEVER delete existing version files");
    expect(slice).toContain("NEVER upgrade runtimes only to enable mise");
    expect(slice).toContain("NEVER silently replace another tool manager");
  });

  test("mise absent: suggest curl https://mise.run | sh, skip loudly, init never blocks on mise", () => {
    const slice = devSlice();
    expect(slice).toContain("curl https://mise.run | sh");
    expect(slice).toContain("SKIP LOUDLY");
    expect(slice).toContain("init never blocks on mise");
  });

  test("handoff step 10 reports BOTH outcomes: model-policy AND dev-environment", () => {
    const skill = normT6(readT6("skills/init/SKILL.md"));
    const m = skill.indexOf("10. **Hand off**");
    expect(m).toBeGreaterThan(-1);
    const slice = skill.slice(m);
    expect(slice).toContain("model-policy outcome");
    expect(slice).toContain("dev-environment outcome");
  });
});

// --- T8: idea ledger + TypeLLM triage (plan 20261104-056 T1) ---
const PLAN_SKILL = fs.readFileSync("skills/plan/SKILL.md", "utf8");
const IDEA_SKILL = fs.readFileSync("skills/idea/SKILL.md", "utf8");
const IDEAS_LEDGER = fs.existsSync(".workflows/ideas.md")
  ? fs.readFileSync(".workflows/ideas.md", "utf8")
  : "";

describe("prompt doctrine — idea ledger + TypeLLM triage (T8, plan 20261104-056)", () => {
  test("plan SKILL contains a triage step", () => {
    expect(PLAN_SKILL).toContain("Triage step");
  });

  test("idea SKILL contains the same triage step", () => {
    expect(IDEA_SKILL).toContain("Triage step");
  });

  test("triage step requires citing the verdict table in the plan and flagging Stuffed batches to the owner", () => {
    for (const skill of [PLAN_SKILL, IDEA_SKILL]) {
      expect(skill).toContain("verdict table");
      expect(skill).toContain("Stuffed");
      expect(skill).toContain("typellm_judge");
      expect(skill).toContain("stacking_risk");
    }
  });

  test("a NO-JUDGE skip note is present in both SKILLs", () => {
    for (const skill of [PLAN_SKILL, IDEA_SKILL]) {
      expect(skill).toContain("NO-JUDGE");
      expect(skill).toContain("JUDGE SKIPPED");
    }
  });

  test("the ideas ledger exists and documents its append-only format", () => {
    expect(/append-only/i.test(IDEAS_LEDGER)).toBe(true);
    expect(IDEAS_LEDGER).toContain("- [YYYYMMDD]");
  });
});

// --- T7: reviewer doctrine hardening (plan 20261103-055 T1) ---
describe("prompt doctrine — reviewer domain-skills + init hardening (T9, plan 20261104-059)", () => {
  const normT9 = (p: string) => fs.readFileSync(p, "utf8").replace(/\s+/g, " ");
  const INIT_T9 = normT9("skills/init/SKILL.md");

  test("reviewer.md names the Rust skill family in a domain-skills rule and requires the report to note which were consulted", () => {
    const rulesIdx = REVIEWER.indexOf("## Rules");
    expect(rulesIdx).toBeGreaterThan(-1);
    const rules = REVIEWER.slice(rulesIdx);
    expect(rules).toContain("Domain skills");
    expect(rules).toContain("rust-review");
    expect(rules).toContain("rust-best-practices");
    expect(rules).toContain("rust-port");
    expect(rules).toContain("notes which were consulted");
  });

  test("init step 6 charter probe is BLOCKING — init cannot proceed without AGENTS.md, remediation mandatory", () => {
    const step6 = INIT_T9.slice(INIT_T9.indexOf("6. **Charter probe**"), INIT_T9.indexOf("7. **Dev environment"));
    expect(step6).toContain("cannot proceed");
    expect(step6).toContain("BLOCKING");
    expect(step6).toContain("mandatory");
  });

  test("init step 7 degrades gracefully when mise is missing — report + offer install, Phase 5 never aborts", () => {
    const step7 = INIT_T9.slice(INIT_T9.indexOf("7. **Dev environment"), INIT_T9.indexOf("9. **Model policy**"));
    expect(step7).toContain("mise");
    expect(step7).toContain("OFFER");
    expect(step7).toContain("never abort");
  });

  test("init step 1 charter authoring cites the Rust skill family for Rust projects' review pointers", () => {
    const step1 = INIT_T9.slice(INIT_T9.indexOf("1. **Charter**"), INIT_T9.indexOf("2. **Profile**"));
    expect(step1).toContain("Rust");
    expect(step1).toContain("rust-review");
    expect(step1).toContain("rust-best-practices");
    expect(step1).toContain("rust-port");
  });
});

describe("prompt doctrine — reviewer Read-AGENTS.md mandate + charter lines (T7, plan 20261103-055)", () => {
  const REFACTOR_FIRST = "Refactor first: extend existing structure before adding new surface.";
  const SUBTRACT_FIRST = "Subtract first: prefer deleting or simplifying over adding.";

  test("reviewer.md carries a Read AGENTS.md mandate phrased as the review lens", () => {
    expect(REVIEWER).toContain("Read AGENTS.md");
    expect(REVIEWER).toContain("the charter");
    expect(REVIEWER).toContain("review lens");
  });

  test("reviewer.md carries both charter lines verbatim", () => {
    expect(REVIEWER).toContain(REFACTOR_FIRST);
    expect(REVIEWER).toContain(SUBTRACT_FIRST);
  });

  test("reviewer.md carries the subtract-first audit item", () => {
    expect(REVIEWER).toContain("could this diff be smaller");
    expect(REVIEWER).toContain("Subtract-first audit");
  });

  test("charter lines and audit item sit in the reviewer ## Rules section", () => {
    const rulesIdx = REVIEWER.indexOf("## Rules");
    expect(rulesIdx).toBeGreaterThan(-1);
    const rules = REVIEWER.slice(rulesIdx);
    expect(rules).toContain(REFACTOR_FIRST);
    expect(rules).toContain(SUBTRACT_FIRST);
    expect(rules).toContain("Subtract-first audit");
  });
});

// --- T10: executable charter (plan 20261104-060 T1) ---
const INIT_SKILL_T10 = fs.readFileSync("skills/init/SKILL.md", "utf8");
const REVIEW_SKILL_T10 = fs.readFileSync("skills/review/SKILL.md", "utf8");
const FLOW_GATES_T10 = fs.readFileSync("scripts/flow-gates.mjs", "utf8");

function step7SliceT10() {
  const m = INIT_SKILL_T10.indexOf("**Dev environment (mise)**");
  return INIT_SKILL_T10.slice(m, INIT_SKILL_T10.indexOf("**Model policy**", m));
}
function step1SliceT10() {
  const m = INIT_SKILL_T10.indexOf("1. **Charter**");
  return INIT_SKILL_T10.slice(m, INIT_SKILL_T10.indexOf("2. **Profile**"));
}

function stage1SliceT10() {
  const m = REVIEW_SKILL_T10.indexOf("## Stage 1: Mechanical Verification");
  return REVIEW_SKILL_T10.slice(m, REVIEW_SKILL_T10.indexOf("## Stage 2", m));
}

describe("prompt doctrine — executable charter, mise tasks (T10, plan 20261104-060)", () => {
  test("(a) init step 7: greenfield mise.toml gains a [tasks] section with stack-appropriate check + verify commands (real commands, no placeholders)", () => {
    const slice = step7SliceT10();
    expect(slice).toContain("[tasks]");
    expect(slice).toContain("check");
    expect(slice).toContain("verify");
    // real per-stack examples pinned, not placeholder filler
    expect(slice).toContain("bunx tsc --noEmit");
    expect(slice).toContain("bun test");
    // plan 20261124-081: the Rust example is the flat guarded chain, not the
    // former bare clippy command.
    expect(slice).toContain("cargo clippy --locked --workspace --all-targets -- -D warnings");
    expect(slice).toContain("cargo test");
  });

  test("(a) init step 7: persists the approved Phase 3 tree as .workflows/tree.json with an explicit minimal shape", () => {
    const slice = step7SliceT10();
    expect(slice).toContain(".workflows/tree.json");
    expect(slice).toContain("roots");
    expect(slice).toContain("files");
  });

  test("(b) init step 1: charter verification pointers cite mise run check / mise run verify", () => {
    const slice = step1SliceT10();
    expect(slice).toContain("mise run check");
    expect(slice).toContain("mise run verify");
  });

  test("(c) review Stage 1: run mise run check + mise run verify when mise.toml defines them; SKIP LOUDLY otherwise", () => {
    const slice = stage1SliceT10();
    expect(slice).toContain("mise run check");
    expect(slice).toContain("mise run verify");
    expect(slice).toContain("SKIP LOUDLY");
  });

  test("(d) scripts/flow-gates.mjs: test-quality gate executes the mise tasks when defined (code presence pin)", () => {
    expect(FLOW_GATES_T10).toContain("mise run check");
    expect(FLOW_GATES_T10).toContain("mise run verify");
    expect(FLOW_GATES_T10).toContain("[tasks]");
    expect(FLOW_GATES_T10).toContain("miseTasks");
  });
});

// --- T11: /init Phase 5 step 8 "Docs consolidation" (plan 20261104-061 T1) ---
const INIT_SKILL_T11 = fs.readFileSync("skills/init/SKILL.md", "utf8");

function step8SliceT11() {
  const m = INIT_SKILL_T11.indexOf("8. **Docs consolidation**");
  return INIT_SKILL_T11.slice(m, INIT_SKILL_T11.indexOf("9. **Model policy**", m));
}

describe("prompt doctrine — /init Docs consolidation step 8 (T11, plan 20261104-061)", () => {
  test("Phase 5 has a Docs-consolidation step 8 with the four-destination classification (decisions/ADR, archive, docs/, .workflows queue)", () => {
    const skill = INIT_SKILL_T11;
    const dev = skill.indexOf("7. **Dev environment");
    const docs = skill.indexOf("8. **Docs consolidation**");
    const model = skill.indexOf("9. **Model policy**");
    const handoff = skill.indexOf("10. **Hand off**");
    expect(dev).toBeGreaterThan(-1);
    expect(docs).toBeGreaterThan(dev);
    expect(model).toBeGreaterThan(docs);
    expect(handoff).toBeGreaterThan(model);
    const step = step8SliceT11();
    expect(step).toContain(".workflows/decisions/ADR-");
    expect(step).toMatch(/archive\/done\//);
    expect(step).toContain("docs/");
    expect(step).toMatch(/\.workflows\/.*(queue|proposals)/);
    expect(step).toMatch(/date.*status.*context.*decision.*consequences|context.*decision.*consequences/);
  });

  test("owner approval (🛑 GATE) is required before any file moves", () => {
    const step = step8SliceT11();
    expect(step).toContain("🛑 GATE");
    expect(step).toMatch(/owner approves/i);
    expect(step).toMatch(/before (anything|any file|any note) moves|before moving/i);
  });

  test("moves update references repo-wide and deletion is forbidden", () => {
    const step = step8SliceT11();
    expect(step).toMatch(/update references|references repo-wide|grep each moved/i);
    expect(step).toMatch(/never delete|NEVER delete/i);
  });

  test("leftover unclassified root notes produce a WARN self-probe recorded in LOG without blocking init", () => {
    const step = step8SliceT11();
    expect(step).toMatch(/WARN/i);
    expect(step).toMatch(/LOG/i);
    expect(step).toMatch(/init proceeds|not blocking|without blocking|continue/i);
    expect(step).toMatch(/brownfield/i);
  });
});

// Plan 20261104-062 T12 — TASK bullet grammar pins. The canonical form is
// `- **Label**: value` (colon outside bold); it is pinned in the docs the
// plan skill reads (CONTRACT-FORMAT) and referenced from the plan skill.

const CONTRACT_FORMAT = fs.readFileSync("templates/CONTRACT-FORMAT.md", "utf8");
const GRAMMAR_RULE = /`- \*\*Label\*\*: value`/;

describe("prompt doctrine: TASK bullet grammar (plan 20261104-062 T12)", () => {
  test("CONTRACT-FORMAT pins the bullet grammar naming `- **Label**: value`", () => {
    expect(CONTRACT_FORMAT).toMatch(GRAMMAR_RULE);
    expect(CONTRACT_FORMAT).toContain("Plan TASK bullet grammar");
    expect(CONTRACT_FORMAT).toMatch(/colon.*OUTSIDE the bold|colon sits OUTSIDE/i);
  });

  test("plan SKILL references the same grammar rule", () => {
    expect(PLAN_SKILL).toMatch(GRAMMAR_RULE);
    expect(PLAN_SKILL).toContain("Plan TASK\nbullet grammar");
  });
});

// Plan 20261104-063 T13 — domain-skill wiring: reviewer domain-skills rule is
// stack/area-general (not Rust-only); /init charter cites the DETECTED stack's
// installed family (greenfield pre-detection skips cleanly); /plan contracts
// carry an optional `Skills:` line; /idea considers installed domain skills,
// turns capability gaps into ledger research items, keeps find-skills
// owner-invoked, and prefers MCP servers for API services.

const INIT_SKILL_T13 = fs.readFileSync("skills/init/SKILL.md", "utf8");
const normT13 = (s: string) => s.replace(/\s+/g, " ");

describe("prompt doctrine — domain-skill wiring (T13, plan 20261104-063)", () => {
  test("reviewer.md Domain-skills rule is stack/area-general with consulted-note duty kept", () => {
    const rulesIdx = REVIEWER.indexOf("## Rules");
    const rules = REVIEWER.slice(rulesIdx);
    expect(rules).toContain("Domain skills");
    // Rust family still named (kept working)
    expect(rules).toContain("rust-review");
    expect(rules).toContain("rust-best-practices");
    // generalized to non-Rust stacks/areas
    expect(rules).toContain("modern-web-guidance");
    expect(rules).toContain("workers");
    expect(rules).toContain("security-audit");
    expect(rules).toContain("impeccable");
    expect(rules).toContain("audit");
    expect(rules).toContain("harden");
    // consulted-note duty kept
    expect(rules).toContain("notes which were consulted");
    // no Rust-only phrasing left
    expect(rules).not.toContain("for Rust diffs");
    expect(rules).not.toContain("For Rust diffs");
  });

  test("init step 1 charter cites the DETECTED stack's installed family and skips when stack unknown", () => {
    const step1 = normT13(
      INIT_SKILL_T13.slice(
        INIT_SKILL_T13.indexOf("1. **Charter**"),
        INIT_SKILL_T13.indexOf("2. **Profile**"),
      ),
    );
    expect(step1).toContain("detect");
    // per-stack examples
    expect(step1).toContain("rust-review");
    expect(step1).toContain("rust-best-practices");
    expect(step1).toContain("rust-port");
    expect(step1).toContain("modern-web-guidance");
    expect(step1).toContain("impeccable");
    expect(step1).toContain("security-audit");
    // greenfield pre-detection skips cleanly
    expect(step1).toMatch(/not.*known|unknown|greenfield/i);
  });

  test("plan SKILL: contracts carry an optional `Skills:` line citing relevant domain skills", () => {
    expect(PLAN_SKILL).toMatch(/- \*\*Skills\*\*:/);
    expect(PLAN_SKILL).toContain("domain skill");
  });

  test("idea SKILL: domain-skill consideration + capability gaps → ledger research items, find-skills owner-invoked, API services prefer MCP", () => {
    expect(IDEA_SKILL).toContain("domain skill");
    expect(IDEA_SKILL).toContain("find-skills");
    expect(IDEA_SKILL).toContain("owner");
    expect(IDEA_SKILL).toContain("MCP");
  });
});

// Prompt commands must never shadow a pi built-in slash command: pi resolves
// built-ins before project/user/package resources, so a same-named template is
// silently unreachable (the /resume incident — pi's session picker opened
// instead of prompts/resume.md). Built-in set of record: pi docs/slash-commands.md.
const PI_BUILTIN_COMMANDS = new Set([
  "settings",
  "model",
  "thinking",
  "scoped-models",
  "login",
  "logout",
  "llama",
  "new",
  "resume",
  "name",
  "session",
  "tree",
  "fork",
  "clone",
  "compact",
  "import",
  "copy",
  "export",
  "share",
  "bug",
  "trust",
  "mcp",
  "reload",
  "hotkeys",
  "changelog",
  "quit",
]);

describe("prompt doctrine: no prompt template shadows a pi built-in command", () => {
  const promptNames = fs
    .readdirSync("prompts")
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3));

  test("prompt filenames never collide with a pi built-in slash command", () => {
    expect(promptNames.filter((n) => PI_BUILTIN_COMMANDS.has(n))).toEqual([]);
  });

  test("the restart trigger exists under a non-shadowed name", () => {
    expect(promptNames).toContain("restart");
    expect(promptNames).not.toContain("resume");
  });

  test("restart trigger runs the digest and defers to the lifecycle", () => {
    const restart = fs.readFileSync("prompts/restart.md", "utf8");
    expect(restart).toContain("bash scripts/resume-digest.sh");
    expect(restart).toContain("execution-doctrine.md");
  });
});

// --- T1 (plan 20261117-066): JS/TS gates + the whole web skill family ---
// Pins the vanilla-JS gate branch in skills/init/SKILL.md, the web family in
// agents/reviewer.md, and a FIXED installed-skill allowlist. The skills live
// on the authoring machine, not in CI, so the set is hardcoded here and never
// read from disk — a name outside it is doctrine citing a skill no agent can
// consult.

const INIT_T1 = fs.readFileSync("skills/init/SKILL.md", "utf8");

const INSTALLED_SKILLS = new Set([
  "rust-review",
  "rust-best-practices",
  "rust-port",
  "rust-crate-architecture",
  "modern-web-guidance",
  "web-perf",
  "audit",
  "harden",
  "distill",
  "normalize",
  "polish",
  "critique",
  "typeset",
  "security-audit",
  "workers-best-practices",
  "bug-hunter",
  "find-skills",
]);

function initDevEnvironmentSliceT1(): string {
  const m = INIT_T1.indexOf("**Dev environment (mise)**");
  expect(m).toBeGreaterThan(-1);
  return INIT_T1.slice(m, INIT_T1.indexOf("**Model policy**", m));
}

function reviewerDomainSkillsRuleT1(): string {
  const m = REVIEWER.indexOf("- Domain skills:");
  expect(m).toBeGreaterThan(-1);
  const rest = REVIEWER.slice(m);
  const nextTopBullet = rest.indexOf("\n- ", 1);
  return nextTopBullet === -1 ? rest : rest.slice(0, nextTopBullet);
}

describe("prompt doctrine — JS/TS gates (T1, plan 20261117-066)", () => {
  test("test_init_names_js_linters_and_a_vanilla_example", () => {
    const slice = initDevEnvironmentSliceT1();
    // the project's OWN linter and runner, detected from stack markers
    expect(slice).toContain("eslint");
    expect(slice).toContain("biome");
    expect(slice).toContain("vitest");
    expect(slice).toContain("node --test");
    expect(slice).toContain("bun test");
    // one worked vanilla-JS example beside the bun/TS and rust ones
    expect(slice).toContain("check = \"bunx eslint .\"");
    expect(slice).toContain("verify = \"node --test\"");
    // the real-commands rule stays explicit
    expect(slice).toContain("never placeholder filler");
    // nothing detectable → `check` is left absent, never invented
    expect(slice).toContain("no linter is detectable");
    expect(slice).toContain("`check` stays ABSENT");
  });

  test("test_init_keeps_existing_stack_examples", () => {
    const slice = initDevEnvironmentSliceT1();
    expect(slice).toContain("check = \"bunx tsc --noEmit\"");
    expect(slice).toContain("verify = \"bun test\"");
    // plan 20261124-081: the Rust check is a flat chain starting at metadata.
    expect(slice).toContain(
      "check = \"cargo metadata --no-deps --format-version 1",
    );
    expect(slice).toContain("verify = \"cargo test\"");
  });

  test("test_reviewer_names_web_family", () => {
    const rule = reviewerDomainSkillsRuleT1();
    // named FIRST for any client-side diff
    expect(rule).toContain("`modern-web-guidance` first");
    // CWV-sensitive diffs
    expect(rule).toContain("`web-perf`");
    expect(rule).toMatch(/LCP\/INP\/CLS/);
    // the impeccable set, by intent
    for (const verb of ["audit", "harden", "distill", "normalize", "polish"]) {
      expect(rule).toContain(`\`${verb}\``);
    }
    expect(rule).toMatch(/UI audit/);
    expect(rule).toMatch(/resilience/);
    expect(rule).toMatch(/density/);
    expect(rule).toMatch(/consistency/);
    expect(rule).toMatch(/finish/);
  });

  test("test_reviewer_names_only_installed_skills", () => {
    const rule = reviewerDomainSkillsRuleT1();
    const cited = [...rule.matchAll(/`([a-z0-9][a-z0-9-]*)`/g)].map(
      (m) => m[1],
    );
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.filter((n) => !INSTALLED_SKILLS.has(n))).toEqual([]);
    // the installed Rust trio reads exactly
    expect(rule).toContain("`rust-review`");
    expect(rule).toContain("`rust-best-practices`");
    expect(rule).toContain("`rust-port`");
    // the phantom skill is gone from the doctrine at large
    expect(INSTALLED_SKILLS.has("unsafe-checker")).toBe(false);
    expect(REVIEWER).not.toContain("unsafe-checker");
    expect(INIT_T1).not.toContain("unsafe-checker");
  });

  test("test_gates_stay_green", () => {
    // Static pin of the gate wiring; the gates themselves run in the task
    // verify line (`bun test && bash scripts/check-drift.sh`).
    const ci = CI_TASK;
    expect(ci).toContain("./scripts/check-drift.sh");
    expect(ci).toContain("bun test");
    const rule = reviewerDomainSkillsRuleT1();
    expect(rule).toContain("notes which were consulted");
    expect(INIT_T1).toContain("**Dev environment (mise)**");
  });
});

// --- T2: ledger doctrine wiring (plan 20261117-067) ---
// Pins the follow-up table as the mandatory end of every ship report, the
// drain-before-grow `## Ledger Resolution` plan section, and the
// terminal-before-report rule for spawned runs.

const LEDGER_TABLE = fs.readFileSync("templates/FOLLOW-UP-TABLE.md", "utf8");
const REGISTRY_T2 = readT2("agents/registry.md");
const REVIEWER_T2 = fs.readFileSync("agents/reviewer.md", "utf8");
const PLAN_T2 = fs.readFileSync("skills/plan/SKILL.md", "utf8");
const REVIEW_T2 = readT2("skills/review/SKILL.md");

describe("prompt doctrine — ledger wiring (T2, plan 20261117-067)", () => {
  test("test_ship_report_ends_with_followup_table", () => {
    // registry doctrine (a): the ship report ENDS with the table —
    // mandatory, bounded; no dangling prose caveats outside it
    const m = REGISTRY_T2.indexOf("SHIP reports END with the follow-up table");
    expect(m).toBeGreaterThan(-1);
    const slice = REGISTRY_T2.slice(m, m + 700);
    expect(slice).toContain("templates/FOLLOW-UP-TABLE.md");
    expect(slice).toContain("Origin");
    expect(slice).toContain("mandatory, bounded");
    expect(slice).toContain(
      "no open item may be mentioned in prose outside the table",
    );
    // the review skill's ship step points at the template + Origin
    const ship = REVIEW_T2.indexOf("## Stage 3: SHIP");
    expect(ship).toBeGreaterThan(-1);
    const shipSlice = REVIEW_T2.slice(ship);
    expect(shipSlice).toContain("templates/FOLLOW-UP-TABLE.md");
    expect(shipSlice).toContain("Origin");
  });

  test("test_terminal_before_report_in_registry", () => {
    // registry doctrine (b): enumerate spawned runs, consume subagent_result
    // first-hand, wait when non-terminal
    const m = REGISTRY_T2.indexOf("Terminal-before-report");
    expect(m).toBeGreaterThan(-1);
    const slice = REGISTRY_T2.slice(m, m + 700);
    expect(slice).toContain("enumerate every spawned run");
    expect(slice).toContain("terminal");
    expect(slice).toContain("subagent_result");
    expect(slice).toContain("first-hand words, never second-hand citation");
    expect(slice).toContain("the report waits");
  });

  test("test_plan_skill_has_ledger_resolution", () => {
    // the plan template drains the ledger before growing
    expect(PLAN_T2).toContain("## Ledger Resolution");
    const m = PLAN_T2.indexOf("## Ledger Resolution");
    const slice = PLAN_T2.slice(m, m + 900);
    expect(slice).toContain("Item");
    expect(slice).toContain("Disposition");
    expect(slice).toContain("Note");
    expect(slice).toContain("done(<task-ref>)");
    expect(slice).toContain("closed(<reason>)");
    expect(slice).toContain("deferred(trigger: <condition>)");
  });

  test("test_followup_table_origin_column", () => {
    // Origin is a pinned column, between Risk and Effort or after Item
    const header = LEDGER_TABLE
      .split("\n")
      .find((l) => l.startsWith("| # |"));
    expect(header).toBeDefined();
    const h = header as string;
    expect(h).toContain("Origin");
    const item = h.indexOf("Item");
    const origin = h.indexOf("Origin");
    const risk = h.indexOf("Risk");
    const effort = h.indexOf("Effort");
    expect(origin).toBeGreaterThan(item);
    expect(origin).toBeLessThan(risk); // after Item
    expect(h.indexOf("Origin", origin + 1)).toBe(-1); // exactly once
    // grammar: planned | new (<why>)
    expect(LEDGER_TABLE).toContain("`planned`");
    expect(LEDGER_TABLE).toContain("new (<why>)");
    // amendment note dated 20261117 / plan 067
    expect(LEDGER_TABLE).toContain("20261117");
    expect(LEDGER_TABLE).toContain("20261117-067");
    // three-exit-state rule sits near the top (before the columns section)
    const cols = LEDGER_TABLE.indexOf("## Columns");
    const top = LEDGER_TABLE.slice(0, cols);
    expect(top).toContain("done");
    expect(top).toContain("closed(reason)");
    expect(top).toContain("deferred(trigger: ...)");
    expect(top).toContain("before a new plan opens");
    // anti-bloat: a row without Impact and Fix shape is deleted, not queued
    expect(LEDGER_TABLE).toContain("DELETED, not queued");
    // worked example gains one planned-origin row and one new-origin row
    const rows = LEDGER_TABLE.split("\n").filter((l) => /^\| [67] \|/.test(l));
    expect(rows.some((r) => r.includes(" planned "))).toBe(true);
    expect(rows.some((r) => r.includes("new ("))).toBe(true);
  });

  test("test_reviewer_checks_ledger_resolution", () => {
    // the reviewer holds the next plan to the last report's table
    const m = REVIEWER_T2.indexOf("Ledger Resolution");
    expect(m).toBeGreaterThan(-1);
    const slice = REVIEWER_T2.slice(m, m + 500);
    expect(slice).toContain("every row");
    expect(slice).toContain("ship report");
    expect(slice).toContain("finding");
    expect(REVIEWER_T2).toContain("closed(");
    expect(REVIEWER_T2).toContain("deferred(trigger");
  });

  test("test_gates_stay_green", () => {
    // Static pin of the gate wiring; the gates themselves run in the task
    // verify line (`bun test && bash scripts/check-drift.sh`).
    const ci = CI_TASK;
    expect(ci).toContain("./scripts/check-drift.sh");
    expect(ci).toContain("bun test");
    // the table template exists and is still the format of record
    expect(LEDGER_TABLE).toContain("# Follow-up table format");
  });
});

// --- TASK 1: intake doctrine + in-scope fixes (plan 20261117-068) ---
// Pins the four-way intake triage gate, in-scope-must-fix, the reviewer's
// queueing-is-a-finding + progress-gated extension rules, the plan-side
// authoring rules (boundary generosity, bindable scenario pins), and the
// in-scope cosmetics (stage-3 numbering, worked-example backticks).

const REVIEW_SKILL_T1 = REVIEW_SKILL_T10;
const normT1 = (s: string) => s.replace(/\s+/g, " ");

describe("prompt doctrine — intake doctrine + in-scope fixes (TASK 1, plan 20261117-068)", () => {
  test("test_intake_triage_rule_in_template", () => {
    const t = normT1(LEDGER_TABLE);
    // the four-way disposition, stated as the ONLY routes into the queue
    expect(t).toContain(
      "**Intake triage.** A row reaches the durable queue only via ONE of:",
    );
    expect(t).toContain("`queued` (Risk `P0–P2`)");
    expect(t).toContain(
      "`batched` (`P3` items bundle into one row per repo/theme, members named)",
    );
    expect(t).toContain(
      "`closed` (deleted, one line why, kept in the fix-round trail)",
    );
    expect(t).toContain("`done`. `P3/S` never queues individually.");
    // the gate sits with the intake rules (top slice), after delete-not-queue
    const cols = LEDGER_TABLE.indexOf("## Columns");
    const top = LEDGER_TABLE.slice(0, cols);
    const del = top.indexOf("DELETED, not queued");
    const triage = top.indexOf("durable queue only via ONE of");
    expect(del).toBeGreaterThan(-1);
    expect(triage).toBeGreaterThan(del);
  });

  test("test_in_scope_findings_fixed_in_loop", () => {
    const w = normT1(WORKER);
    expect(w).toContain("in-scope-must-fix");
    expect(w).toContain(
      "a defect found INSIDE your own Allowed Changes is fixed in the loop (TDD when code)",
    );
    expect(w).toContain(
      "the follow-up table is for what your boundaries forbid, nothing else",
    );
    // stated in both homes: the boundaries walkthrough and the Rules scope-lock
    expect(WORKER.split("in-scope-must-fix").length - 1).toBe(2);
    // the out-of-scope rules stay intact (they are correct and unchanged)
    expect(w).toContain("**note it and keep moving.** Do not fix it.");
    expect(w).toContain(
      "If you see something broken outside your task, report it. Don't fix it.",
    );
  });

  test("test_queueing_in_scope_is_a_finding", () => {
    const r = normT1(REVIEWER);
    expect(r).toContain(
      "Queueing an in-scope item is itself a reviewer finding",
    );
    expect(r).toContain("the task's Allowed list is the test");
    // the finding routes back to the worker, not into the durable queue
    expect(r).toContain("Route it back to the worker");
  });

  test("test_progress_gated_extension", () => {
    const r = normT1(REVIEWER);
    expect(r).toContain("Progress-gated extension");
    expect(r).toContain("exactly ONE extra fix round");
    expect(r).toContain("findings demonstrably shrink");
    expect(r).toContain("state the grant in the verdict block");
    expect(r).toContain("orchestrator adjudication");
    expect(r).toContain("never silently into the ledger");
    // the cap doctrine is untouched: max-rounds default stays 2 everywhere
    expect(fs.readFileSync("agents/execution-doctrine.md", "utf8")).toContain(
      "(N capped at max-rounds, default 2)",
    );
    expect(fs.readFileSync("templates/CONTRACT-FORMAT.md", "utf8")).toContain(
      "`max-rounds: N` (default 2)",
    );
  });

  test("test_boundary_generosity_guidance", () => {
    const m = PLAN_SKILL.indexOf("## Phase 5: GENERATE CONTRACTS");
    const end = PLAN_SKILL.indexOf("## Phase 6: HAND OFF");
    expect(m).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(m);
    const p = normT1(PLAN_SKILL.slice(m, end));
    expect(p).toContain("Boundary generosity");
    expect(p).toContain(
      "pre-authorize in Allowed the adjacent fixes the worker will inevitably see",
    );
  });

  test("test_doc_scenario_grep_pins", () => {
    const m = PLAN_SKILL.indexOf("## Phase 5: GENERATE CONTRACTS");
    const end = PLAN_SKILL.indexOf("## Phase 6: HAND OFF");
    const p = normT1(PLAN_SKILL.slice(m, end));
    expect(p).toContain("grep-able pins in existing test files");
    expect(p).toContain("authoring defect");
    expect(p).toContain("verify exits 1 by design");
  });

  test("test_in_scope_cosmetics_fixed", () => {
    // review skill: the stage-3 list has no duplicate numbering (1..8)
    const s3 = REVIEW_SKILL_T1.indexOf("## Stage 3");
    const co = REVIEW_SKILL_T1.indexOf("## Combined Output");
    expect(s3).toBeGreaterThan(-1);
    expect(co).toBeGreaterThan(s3);
    const stage3 = REVIEW_SKILL_T1.slice(s3, co);
    const nums = [...stage3.matchAll(/^(\d+)\./gm)].map((x) => parseInt(x[1], 10));
    expect(nums.length).toBe(8);
    expect(new Set(nums).size).toBe(nums.length);
    expect(stage3).toMatch(/7\. Append one line/);
    expect(stage3).toMatch(/8\. `\.workflows\/CONTEXT\.md`/);
    // follow-up table: every worked-example Risk/Effort cell is backticked
    const weStart = LEDGER_TABLE.indexOf("## Worked example");
    expect(weStart).toBeGreaterThan(-1);
    const worked = LEDGER_TABLE.slice(weStart);
    const rows = worked.split("\n").filter((l) => /^\| \d+ \|/.test(l));
    expect(rows.length).toBe(7);
    for (const row of rows) {
      const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
      expect(cells[5]).toMatch(/^`P[0-3]`$/);
      expect(cells[6]).toMatch(/^`[SML]`$/);
    }
    // no bare (unbackticked) plan ids in the worked example
    expect(worked.match(/[^`]plan (2026\d{4}-\d{3}|0\d{2})/)).toBeNull();
  });
});

// --- T1: status vocabulary + scoreboard + clean-files (plan 20261117-071),
// baseline ratchet generalized to the monotone invariant (plan 20261117-072):
// the vocabulary is the single-source pill mapping, ship reports open with a
// scoreboard, repo files stay clean markdown, a docs-lint budget holds or
// falls against HEAD and never rises, regenerations are byte-deterministic,
// the tree checker stays satisfied, and the gates stay green.

const norm071 = (s: string) => s.replace(/\s+/g, " ");
const readVocab = () => fs.readFileSync("templates/STATUS-VOCABULARY.md", "utf8");

// BASE_REF is the pre-regen reference for the truth-leg below: the
// "lowered > 0" proof is measured against the snapshot BEFORE plan
// 20261117-072 regenerated the budgets, so the leg stays stable after the
// regen is committed (comparing against HEAD would compare the commit
// against itself and structurally read 0).
const BASE_REF = "5acf35e";
// Plan 20261127-083 began at 64ad30c (its TASK 1/2 are landed): the pre-task
// budget snapshot for the no-new-debt leg. BASE_REF stays the older
// corrected-budget reference; using it alone would charge this plan for the
// budget churn that was already committed before TASK 3 started.
const PRE_TASK_REF = "64ad30c";
const readBaseline = (rev: string) =>
  JSON.parse(
    spawnSync("git", ["show", `${rev}:scripts/docs-lint-baseline.json`], {
      encoding: "utf8",
    }).stdout,
  ) as { sections: Record<string, { files?: Record<string, number> }> };

describe("prompt doctrine — status vocabulary + scoreboard + clean files (TASK 1, plan 20261117-071)", () => {
  test("test_status_vocabulary_mapping_complete", () => {
    const raw = readVocab();
    const v = norm071(raw);
    // every Decision-1 mapping row is present, token → pill paired
    const rows = [
      "`done(<ref>)` | [[Done]]",
      "gate pass / `ok:true` | [[Passed]]",
      "release | [[Shipped]]",
      "merged branch | [[Merged]]",
      "queued P0–P2 (owner call) | [[Decision]]",
      "`deferred(trigger:)` | [[Pending]]",
      "`closed(<why>)` | [[Keep]]",
      "gate skip | [[Skipped]]",
      "P2 risk | [[At risk]]",
      "broken gate | [[Failed]]",
      "unverified claim | [[Unverified]]",
    ];
    for (const row of rows) expect(v, `missing mapping row: ${row}`).toContain(row);
    // the required action lead-ins are pinned too
    for (const lead of ["**Do:**", "**Run:**", "**Guard:**", "**Next:**", "**Check:**"]) {
      expect(v).toContain(lead);
    }
    // work-kind opener maps to its five pills
    expect(v).toContain("Work-kind opener");
    for (const pill of ["[[Implement]]", "[[Investigate]]", "[[Preview]]", "[[Brainstorm]]", "[[Qualify]]"]) {
      expect(v).toContain(pill);
    }
    // single-source claim: the extension owns pill writing, not this file
    expect(v).toContain("mapping of record");
    expect(v).toContain("pi-emphasis");
    expect(v).toContain("never re-teaches pill writing");
    // hard shape constraints: ≤60 lines, every line ≤80 cols
    const lines = raw.replace(/\n$/, "").split("\n");
    expect(lines.length, `file is ${lines.length} lines (max 60)`).toBeLessThanOrEqual(60);
    for (const [i, line] of lines.entries()) {
      expect(line.length, `line ${i + 1} is ${line.length} cols (max 80)`).toBeLessThanOrEqual(80);
    }
  });

  test("test_ship_report_scoreboard_rule", () => {
    const r = fs.readFileSync("agents/registry.md", "utf8");
    expect(r).toContain("one-line scoreboard");
    expect(r).toContain("`templates/STATUS-VOCABULARY.md`");
    // the scoreboard rule sits beside the existing ship-report doctrine
    // (the follow-up-table mandate), not somewhere unrelated
    const end = r.indexOf("SHIP reports END with the follow-up table");
    const board = r.indexOf("one-line scoreboard");
    expect(end).toBeGreaterThan(-1);
    expect(board).toBeGreaterThan(end);
    expect(board - end, "scoreboard rule not beside the ship-report doctrine").toBeLessThan(400);
  });

  test("test_files_stay_clean_rule", () => {
    const v = norm071(readVocab());
    expect(v).toContain("FILES-STAY-CLEAN");
    // pills and glyphs are chat-reply decoration only
    expect(v).toContain("chat-reply");
    expect(v).toContain("Nerd Font glyphs");
    // tracked repo files stay clean markdown, the tracked homes named
    expect(v).toContain("clean markdown");
    expect(v).toContain("LOG.md");
    expect(v).toContain("CHANGELOG.md");
    expect(v).toContain("archive");
  });

  test("test_readme_names_emphasis_companion", () => {
    const r = norm071(fs.readFileSync("README.md", "utf8"));
    expect(r).toContain("pi-emphasis");
    expect(r).toContain("pi install git:github.com/johnlindquist/pi-emphasis");
    // display-only + optional framing — never a package dependency
    expect(r).toContain("display-only");
    expect(r).toContain("optional and not a package dependency");
    // the mapping of record is cited
    expect(r).toContain("templates/STATUS-VOCABULARY.md");
    // FILES-STAY-CLEAN: the README describes pills in plain words, no tokens
    expect(r).not.toContain("[[");
  });

  test("test_readme_currency_current", () => {
    const r = norm071(fs.readFileSync("README.md", "utf8"));
    // reply-style scoreboard + intake triage + the ledger, as concept pins —
    // not version numbers, not a changelog dump
    expect(r).toContain("one-line scoreboard");
    expect(r).toContain("follow-up table");
    expect(r).toContain("queued, batched, closed, or done");
    expect(r).toContain("drain before the next plan opens");
    // boundaries-path lint is named
    expect(r).toContain("boundaries-path");
  });

  test("test_docs_policy_crossref_lands", () => {
    const p = norm071(fs.readFileSync("templates/DOCS-POLICY.md", "utf8"));
    expect(p).toContain("No chat-reply decoration in tracked files");
    expect(p).toContain("templates/STATUS-VOCABULARY.md");
    // the budgets-track-truth rule: lowered budgets are committed, a raise
    // needs the plan's explicit justification
    expect(p).toContain("--write-baseline");
    expect(p).toContain("explicit justification");
  });

  test("test_baseline_monotone", () => {
    // The standing invariant, generalized from 071's additions-only pin
    // (plan 20261117-072 T1): a per-file budget holds or FALLS against
    // HEAD, never rises — docs-lint CLEAN (the gates pin below) is the
    // ratchet that keeps the measurement honest. A regen task that LOWERS
    // budgets is legitimate when its plan authorizes the rewrites (plan
    // 20261117-072 does); a rise means new doc debt was banked unjustified.
    // Truth-leg reference: PRE_TASK_REF (the plan-083 pre-task snapshot),
    // never HEAD — head self-comparison would always read 0 once committed.
    const head = readBaseline(PRE_TASK_REF);
    const cur = JSON.parse(
      fs.readFileSync("scripts/docs-lint-baseline.json", "utf8"),
    ) as { sections: Record<string, { files?: Record<string, number> }> };
    for (const section of Object.keys(head.sections)) {
      const before = head.sections[section]?.files ?? {};
      const after = cur.sections[section]?.files ?? {};
      for (const [file, n] of Object.entries(after)) {
        const was = before[file];
        if (was === undefined) continue; // new tracked file: addition, not a rise
        expect(
          n,
          `${section} budget for ${file} rose ${was} -> ${n} — new doc debt`,
        ).toBeLessThanOrEqual(was);
      }
    }
  });

  test("test_baseline_regenerated_deterministic", () => {
    // run1 and run2 are two consecutive fresh --write-baseline regens over
    // the same tree; the pin compares them byte-for-byte via a temp copy
    // (sections in fixed order, files sorted) — a budget that cannot be
    // reproduced twice in a row is not a measurement. The committed budget
    // is snapshotted first and restored either way: this pin never
    // rewrites it as a side effect. Truth leg: the committed budget prices
    // the current tree — at least one pre-existing number sits LOWER than
    // HEAD (the stale 068/069-era budgets priced down) and none sits
    // higher (the monotone pin above).
    const committed = "scripts/docs-lint-baseline.json";
    const snapshot = path.join(os.tmpdir(), `docs-baseline-commit-${process.pid}.json`);
    const run1 = path.join(os.tmpdir(), `docs-baseline-run1-${process.pid}.json`);
    fs.cpSync(committed, snapshot);
    try {
      const regen = () =>
        spawnSync("bash", ["scripts/docs-lint.sh", "--write-baseline"], {
          encoding: "utf8",
          timeout: 600000,
        });
      const first = regen();
      expect(
        first.status,
        `--write-baseline exited ${first.status}:\n${first.stdout}\n${first.stderr}`,
      ).toBe(0);
      fs.cpSync(committed, run1); // run1 = first fresh regen
      const second = regen();
      expect(
        second.status,
        `--write-baseline exited ${second.status}:\n${second.stdout}\n${second.stderr}`,
      ).toBe(0);
      const a = fs.readFileSync(run1);
      const b = fs.readFileSync(committed); // run2 = second fresh regen
      expect(
        a.equals(b),
        "two consecutive --write-baseline runs differ — non-deterministic",
      ).toBe(true);
    } finally {
      fs.copyFileSync(snapshot, committed);
      fs.unlinkSync(snapshot);
      fs.unlinkSync(run1);
    }
    // Two truth legs: stale budgets corrected at least once (BASE_REF), and
    // no budget raised since this plan's pre-task snapshot (PRE_TASK_REF).
    const stale = readBaseline(BASE_REF);
    const preTask = readBaseline(PRE_TASK_REF);
    const cur = JSON.parse(
      fs.readFileSync("scripts/docs-lint-baseline.json", "utf8"),
    ) as { sections: Record<string, { files?: Record<string, number> }> };
    let lowered = 0;
    let raised = 0;
    for (const section of Object.keys(stale.sections)) {
      const before = stale.sections[section]?.files ?? {};
      const after = cur.sections[section]?.files ?? {};
      for (const [file, was] of Object.entries(before)) {
        const now = after[file];
        if (now === undefined) continue;
        if (now < was) lowered += 1;
      }
    }
    for (const section of Object.keys(preTask.sections)) {
      const before = preTask.sections[section]?.files ?? {};
      const after = cur.sections[section]?.files ?? {};
      for (const [file, was] of Object.entries(before)) {
        const now = after[file];
        if (now === undefined) continue;
        if (now > was) raised += 1;
      }
    }
    expect(
      lowered,
      "no pre-existing budget lower than the pre-regen reference — stale budgets not corrected",
    ).toBeGreaterThan(0);
    expect(raised, `${raised} budget(s) rose above the pre-regen reference — new doc debt`).toBe(0);
  }, 600000);

  test("test_baseline_pin_monotone", () => {
    // The generalization proof: no additions-only-vs-HEAD assertion
    // remains in this file; the monotone rule is what the pin enforces.
    // Strings are built by concatenation so this pin cannot match itself.
    const src = fs.readFileSync("tests/prompt-doctrine.test.ts", "utf8");
    expect(src).not.toContain("additions_" + "only");
    expect(src).toContain("test(\"test_baseline_mono" + "tone\"");
    expect(src).toContain("test(\"test_baseline_regen" + "erated_deterministic\"");
  });

  test("test_tree_checker_satisfied", () => {
    const r = spawnSync("bun", ["scripts/check-tree.mjs"], { encoding: "utf8", timeout: 60000 });
    expect(r.status, `check-tree exited ${r.status}: ${r.stdout} ${r.stderr}`).toBe(0);
    expect(r.stdout).toContain("check-tree: CLEAN");
  }, 60000);

  test("test_gates_stay_green", () => {
    // the bun-test leg is the enclosing suite; the two script gates run here
    for (const script of ["scripts/check-drift.sh", "scripts/docs-lint.sh"]) {
      const r = spawnSync("bash", [script], { encoding: "utf8", timeout: 300000 });
      expect(r.status, `${script} exited ${r.status}:\n${r.stdout}\n${r.stderr}`).toBe(0);
    }
  }, 600000);
});

// --- T1: sieve gate + decision fields + knowledge promotion (plan 20261117-073) ---

// The gate block, verbatim — written once in the skill/prompt files, pinned
// here byte-for-byte so the four entries cannot drift apart.
const SIEVE_GATE = [
  "## Sieve Gate",
  "",
  "Before evidence, decisions, or planning, answer four forced questions from",
  "the ask alone, then apply the pure outcome rules. One pass, no weighting:",
  "",
  "| Cell | Forced choice |",
  "| --- | --- |",
  "| V value | `nice-to-have` / `useful` / `valuable` / `must-have` |",
  "| R risk | `trivial` / `contained` / `serious` / `severe` — blast radius |",
  "| E effort | `xs` afternoon / `s` 1–2 days / `m` days / `l` project |",
  "| path | `research` / `inspect` / `grill` / `none` |",
  "",
  "Pure outcome rules:",
  "",
  "- `nice-to-have` or `useful` plus standalone → **park** — a ledger row,",
  "  no plan",
  "- `severe` → **park** plus a decompose flag",
  "- `valuable` or `must-have` with `xs` → **build-direct** — the lightweight",
  "  tier, no spec ceremony",
  "- any other verdict → **propose**",
  "",
  "Obligation flows (`/fix`, `/debug`, `/docs`, `/verify`, `/review`) are",
  "exempt — they answer to broken things, not value verdicts.",
].join("\n");

const IDEA_T1 = fs.readFileSync("skills/idea/SKILL.md", "utf8");
const PLAN_T1 = fs.readFileSync("skills/plan/SKILL.md", "utf8");
const ADD_T1 = fs.readFileSync("skills/add-feature/SKILL.md", "utf8");
const PROTO_T1 = fs.readFileSync("prompts/prototype.md", "utf8");

describe("prompt doctrine — sieve gate + decision fields + promotion (T1, plan 20261117-073)", () => {
  test("test_sieve_gate_in_all_proposal_entries", () => {
    for (
      const [name, content] of [
        ["skills/idea/SKILL.md", IDEA_T1],
        ["skills/plan/SKILL.md", PLAN_T1],
        ["skills/add-feature/SKILL.md", ADD_T1],
        ["prompts/prototype.md", PROTO_T1],
      ] as const
    ) {
      expect(content, `${name} lacks the identical sieve gate block`).toContain(
        SIEVE_GATE,
      );
    }
  });

  test("test_obligation_flows_exempt", () => {
    // The exemption lives inside the gate block itself; the obligation
    // flows answer to broken things, not value verdicts — no gate lands
    // in their files.
    for (const p of [
      "skills/fix/SKILL.md",
      "prompts/debug.md",
      "skills/docs/SKILL.md",
      "prompts/verify.md",
      "skills/review/SKILL.md",
    ]) {
      const content = fs.readFileSync(p, "utf8");
      expect(content, `${p} must not carry the sieve gate`).not.toContain(
        "## Sieve Gate",
      );
      expect(content, `${p} must not carry the forced-choice table`).not.toContain(
        "| Cell | Forced choice |",
      );
    }
  });

  test("test_plan_template_sieve_section", () => {
    // The plan template carries the Sieve section per the plan's normative
    // grammar; park never appears as a valid Outcome in a plan file.
    for (const line of [
      "## Sieve",
      "| Cell | Verdict |",
      "| V value | `nice-to-have` / `useful` / `valuable` / `must-have` |",
      "| R risk | `trivial` / `contained` / `serious` / `severe` |",
      "| E effort | `xs` / `s` / `m` / `l` |",
      "| path | `research` / `inspect` / `grill` / `none` |",
      "Outcome: propose | build-direct",
    ]) {
      expect(PLAN_T1, `plan template lacks sieve grammar: ${line}`).toContain(line);
    }
    expect(PLAN_T1).toContain("`park` never appears as an Outcome");
    expect(PLAN_T1).not.toContain("Outcome: park");
  });

  test("test_decision_rows_cost_and_blast_radius", () => {
    expect(PLAN_T1).toContain("both fields REQUIRED");
    expect(PLAN_T1).toContain("`Cost of inaction:`");
    expect(PLAN_T1).toContain("`Blast radius:`");
    expect(PLAN_T1).toContain("each +, −, or neutral");
  });

  test("test_knowledge_promotion_rule", () => {
    const registry = fs.readFileSync("agents/registry.md", "utf8");
    expect(registry).toContain("## Knowledge Promotion");
    expect(registry).toContain("after confirmation in 3 independent sessions");
    expect(registry).toContain("reverts it to the ledger");
    // The TokenEconomizer extension was removed (owner decision, 20261117):
    // the promotion rule stands on its own; doctrine must not reference it.
    expect(registry).not.toContain("TokenEconomizer");
  });

  test("test_vocabulary_covers_outcomes", () => {
    const vocab = fs.readFileSync("templates/STATUS-VOCABULARY.md", "utf8");
    expect(vocab).toContain("| park | [[Decision]] |");
    expect(vocab).toContain("| build-direct | [[Implement]] |");
  });
});

describe("prompt doctrine — Resources pre-check in generated charters (T14, owner doctrine 2026-11-16)", () => {
  const flat = (s: string) => s.replace(/\s+/g, " ");
  const TEMPLATE = flat(
    fs.readFileSync(path.join(import.meta.dir, "..", "templates", "AGENTS.md"), "utf8"),
  );
  // Matched without the trailing period: the home charter carries a longer
  // tail ("— resource exhaustion crashes the host.") — the shared prefix is
  // the contract; the tail is each charter's own emphasis.
  const SENTENCE =
    "- Resources: before any test suite or build, verify free CPU and RAM (`free -h` + load average); constrained or many parallel runs → defer or serialize";

  test("template CORE carries the resource pre-check line (host crashed under parallel suite load)", () => {
    expect(TEMPLATE).toContain(SENTENCE);
  });

  test("the home AGENTS.md carries the same line (the two must not drift)", () => {
    const home = flat(fs.readFileSync(path.join(import.meta.dir, "..", "AGENTS.md"), "utf8"));
    expect(home).toContain(SENTENCE);
  });
});

// --- plan 20261117-076 Phase 2 — the reviewer 73-check accretion cure ---
// The serial pipeline (Layer 1 → 1b → 2 → 3, per-layer re-execution) is
// DELETED from agents/reviewer.md and replaced by the tier map: Tier 0 =
// script-covered gates (one-line citations, never re-derived), Tier 1 = the
// judge verdict table the reviewer RECEIVES, Tier 2 = deep-read (intent,
// contradictions, uncertain verdicts). Pinned charter lines (T7) survive
// verbatim; the parse contract (## Verdict + **ok:** marker) stays
// byte-compatible. The prompt must SHRINK — the budget below is the cure's
// acceptance test and blocks silent re-accretion.
describe("prompt doctrine — reviewer tier-map restructure (plan 20261117-076 Phase 2)", () => {
  const reviewerLines = REVIEWER.split("\n");

  test("the prompt SHRANK — accretion budget holds (was 214 lines pre-cure)", () => {
    expect(reviewerLines.length).toBeLessThanOrEqual(170);
  });

  test("the serial pipeline is deleted — no verification commands are re-derived", () => {
    // Exactly ONE bash fence remains: the Step-0 landing check (pwd && git
    // rev-parse) — a self-landing VOID check no repo gate can perform.
    const fences = REVIEWER.match(/```bash/g) ?? [];
    expect(fences.length).toBe(1);
    // The deleted per-layer command lines never return.
    expect(REVIEWER).not.toContain("agent-spec lifecycle <spec>");
    expect(REVIEWER).not.toContain("npm test && npm run lint");
    expect(REVIEWER).not.toContain("tdd-guard lint\n");
    expect(REVIEWER).not.toContain("cc-check format\n");
  });

  test("the deleted check families survive as Tier-0 gate citations (one line each)", () => {
    expect(REVIEWER).toContain("Tier 0");
    // each retired mechanical layer is cited as a gate, not re-executed
    expect(REVIEWER).toContain("agent-spec lifecycle");
    expect(REVIEWER).toContain("agent-spec guard");
    expect(REVIEWER).toContain("tdd-guard");
    expect(REVIEWER).toContain("cc-check");
    expect(REVIEWER).toContain("bombadil");
    expect(REVIEWER).toContain("verify line");
    // the loud-skip discipline survives the deletion: a skipped gate is loud
    expect(REVIEWER).toContain("never a silent pass");
  });

  test("Tier 1: the reviewer RECEIVES the judge verdict table (contract columns)", () => {
    expect(REVIEWER).toContain("Tier 1");
    expect(REVIEWER).toContain("scenario");
    expect(REVIEWER).toContain("verdict");
    expect(REVIEWER).toContain("confidence");
    expect(REVIEWER).toContain("evidence");
    // routing: uncertain rows (skips + below-floor) are the reviewer's input
    expect(REVIEWER).toContain("uncertain");
    expect(REVIEWER).toContain("the judge never closes a review alone");
  });

  test("Tier 2: deep-read duty names intent, contradictions, and the subtract-first lens", () => {
    const tier2 = REVIEWER.slice(REVIEWER.indexOf("Tier 2"));
    expect(tier2).toContain("intent");
    expect(tier2).toContain("contradiction");
    expect(tier2).toContain("uncertain");
  });

  test("the parse contract stays byte-compatible: ## Verdict + **ok:** marker survive", () => {
    expect(REVIEWER).toContain("## Verdict");
    expect(REVIEWER).toContain("**ok: true** | **ok: false**");
    expect(REVIEWER).toContain("### Findings");
  });

  test("review flow wiring: Tier-1 verdicts run BEFORE the judgment pass, uncertain-only deep-read", () => {
    const s = fs.readFileSync("skills/review/SKILL.md", "utf8");
    const stage2 = s.indexOf("## Stage 2");
    const stage3 = s.indexOf("## Stage 3");
    const slice = s.slice(stage2, stage3);
    expect(slice).toContain("bench-intake-triage.ts verdicts");
    expect(slice).toContain("before");
    expect(slice).toContain("uncertain");
    expect(slice).toContain("the judge never closes a review alone");
    expect(slice).toContain("JUDGE SKIPPED");
  });
});

// --- plan 20261119-079 T3 — the oracle-binding disclosure rule ---
// Five MorphNSH review passes reported unearned agreements (a zero-width
// separator, an env bypass, a case swap) — all one disease: oracle binding
// too weak, blind spots correlated across passes. The cure in reviewer.md is
// FOLDED into the existing Tier-2 verification section (subtract-first, no
// new section; the ≤170-line accretion budget holds), and the doctrine line
// is pinned verbatim so it cannot drift.
describe("prompt doctrine — oracle-binding disclosure (plan 20261119-079 T3)", () => {
  test("the doctrine line is pinned verbatim: an oracle is only worth its binding", () => {
    expect(REVIEWER).toContain("An oracle is only worth what its binding.");
  });

  test("oracle strength is a standing Tier-2 audit question (zero-width / env bypass / case swap)", () => {
    const tier2 = REVIEWER.slice(REVIEWER.indexOf("## Tier 2"));
    expect(tier2).toContain("oracle");
    expect(tier2).toContain("zero-width");
    expect(tier2).toContain("env bypass");
    expect(tier2).toContain("case swap");
    expect(tier2).toContain("unaudited agreement is a finding");
  });

  test("every accepted agreement states what the oracle bound to (matcher + normalization)", () => {
    const tier2 = REVIEWER.slice(REVIEWER.indexOf("## Tier 2"));
    expect(tier2).toContain("what the oracle bound to");
    expect(tier2).toContain("normalization");
  });

  test("the rule is FOLDED into the existing Tier-2 section — no new section appended", () => {
    const headings = REVIEWER.match(/^## .*/gm) ?? [];
    // the tier-map structure is unchanged: Step 0, 0b, Tier 0/1/2,
    // Output, Rules — the fold adds zero headings. The two fenced report
    // template lines (## Verdict / ## Verification) are counted apart.
    const templates = headings.filter(
      (h) => h.startsWith("## Verdict") || h.startsWith("## Verification"),
    );
    expect(templates).toHaveLength(2);
    expect(headings.length - templates.length).toBe(7);
    expect(REVIEWER.indexOf("An oracle is only worth what its binding.")).toBeGreaterThan(
      REVIEWER.indexOf("## Tier 2"),
    );
    expect(REVIEWER.indexOf("An oracle is only worth what its binding.")).toBeLessThan(
      REVIEWER.indexOf("## Output"),
    );
  });

  test("the accretion budget holds with the fold (≤170 lines, was 160)", () => {
    expect(REVIEWER.split("\n").length).toBeLessThanOrEqual(170);
  });
});

// --- plan 20261124-081 TASK 1 — Rust structural gate doctrine wiring ---
// The canonical mandate is pinned verbatim in the three Rust-only doctrine
// placements; the universal template carries no Rust pointer so non-Rust
// charters stay unchanged. deslop-please is a CLI, never a
// Pi skill: the installed-skill allowlist gains rust-crate-architecture only.
const RUST_GATE_SENTENCE =
  "Rust structural gate: run `deslop-please` before `/review`; fix findings from first principles — no allowlist churn; consult the Rust skill family (`rust-review`, `rust-best-practices`, `rust-port`, `rust-crate-architecture`).";
const PHASE5_SKIP_RULE =
  "When the stack is not yet known (greenfield, pre-detection), skip the Rust gate sentence and the review-pointer family citation — do not guess.";
const RUST_GATE_PLACEMENTS = [
  "agents/reviewer.md",
  "skills/init/SKILL.md",
  "templates/AGENTS.md",
  "templates/DOCS-POLICY.md",
];
const RUST_SKILL_FAMILY = [
  "rust-review",
  "rust-best-practices",
  "rust-port",
  "rust-crate-architecture",
];
const norm081 = (s: string) => s.replace(/\s+/g, " ");
const read081 = (p: string) => fs.readFileSync(p, "utf8");
const TEST_FILE_081 = "tests/prompt-doctrine.test.ts";

function step1Slice081(): string {
  const m = INIT_T1.indexOf("1. **Charter**");
  expect(m).toBeGreaterThan(-1);
  const end = INIT_T1.indexOf("2. **Profile**", m);
  expect(end).toBeGreaterThan(m);
  return INIT_T1.slice(m, end);
}

function step7Slice081(): string {
  const m = INIT_T1.indexOf("**Dev environment (mise)**");
  expect(m).toBeGreaterThan(-1);
  const end = INIT_T1.indexOf("**Model policy**", m);
  expect(end).toBeGreaterThan(m);
  return INIT_T1.slice(m, end);
}

// The nested domain-skills slice is the Domain skills bullet plus its
// indented bullets; a gate sentence folded into that slice is a violation.
function domainSkillsNestedSlice081(): string {
  const start = REVIEWER.indexOf("- Domain skills:");
  expect(start).toBeGreaterThan(-1);
  const lines = REVIEWER.slice(start).split("\n");
  let endLine = 1;
  while (
    endLine < lines.length
    && (lines[endLine].startsWith("  ") || lines[endLine].trim() === "")
  ) {
    endLine++;
  }
  return REVIEWER.slice(
    start,
    start + lines.slice(0, endLine).join("\n").length,
  );
}

function rustCheckLine081(): string {
  const candidates = step7Slice081()
    .split("\n")
    .filter((line) => line.includes("check = \"") && line.includes("cargo"));
  expect(candidates.length, "expected ONE flat Rust check line").toBe(1);
  const match = candidates[0].match(/check = "([^"\n]+)"/);
  expect(match).not.toBeNull();
  return match![1];
}

function topHeadingCount081(): number {
  const headings = REVIEWER.match(/^## .*/gm) ?? [];
  // Verdict / Verification are inside the fenced report template, not headings
  // of the prompt itself (same accounting as the tier-map accretion pin).
  const templates = headings.filter(
    (h) => h.startsWith("## Verdict") || h.startsWith("## Verification"),
  );
  return headings.length - templates.length;
}

function gitOutput081(args: string[]): string {
  const run = spawnSync("git", args, { encoding: "utf8" });
  expect(run.status, run.stderr).toBe(0);
  return run.stdout;
}

function gitPaths081(args: string[]): string[] {
  return gitOutput081(args).split("\n").filter(Boolean);
}

// Plan 20261127-083 TASK 4 owns the one contracted whole-tree dprint fmt run.
// A formatter-owned path is exempt from this older boundary pin only while the
// live bytes equal dprint's rendering of the plan-base bytes; a hand edit to
// the same path still appears as forbidden drift.
const FORMAT_BASE_081 = "2a938e0";
const FORMAT_OWNED_081 = new Set(["scripts/flow-gates.mjs"]);
function formatterOnlyDelta081(rel: string): boolean {
  if (!FORMAT_OWNED_081.has(rel)) return false;
  const base = spawnSync("git", ["show", `${FORMAT_BASE_081}:${rel}`], { encoding: "utf8" });
  if (base.status !== 0) return false;
  const formatted = spawnSync(
    "mise",
    ["exec", "--", "dprint", "fmt", "--stdin", rel],
    { encoding: "utf8", input: base.stdout },
  );
  return formatted.status === 0 && fs.readFileSync(rel, "utf8") === formatted.stdout;
}

function changedPaths081(): string[] {
  // Plan 20261127-083 TASK 5 owns this lint surface; an uncommitted fix to it
  // is contracted churn, not plan 081 boundary drift.
  const task5Owned = new Set(["scripts/profile-lint.sh"]);
  const dirty = gitPaths081(["diff", "--name-only", "HEAD", "--"])
    .filter((p) => !formatterOnlyDelta081(p) && !task5Owned.has(p));
  const untracked = gitPaths081([
    "ls-files",
    "--others",
    "--exclude-standard",
  ]);
  // The extension commits worker diffs before the reviewer runs, so the
  // contracted wiring lives in HEAD, not in the dirty tree. Collect every
  // path touched across the whole plan delta from its known base: a commit
  // window misses late task wiring, and a tree diff alone misses files whose
  // net change is zero (e.g. the universal template round-trip).
  // SHIP's plan-complete commit (07defa4) versions the package and writes
  // CHANGELOG.md; that churn is SHIP-owned, not worker-boundary drift. Filter
  // it from the committed slice only: a live edit to either path still shows
  // up in dirty/untracked and is checked against the forbidden list.
  const shipOwned = new Set(["CHANGELOG.md", "package.json"]);
  // Plan 20261127-083 TASK 1/2 legitimately own the formatter gate and the
  // profile lint; their committed churn is not plan 081 boundary drift. Only
  // the committed slice is filtered: live edits to those paths still land in
  // `dirty`/`untracked` and are checked against the forbidden list below.
  const plan083Owned = new Set([
    "scripts/profile-lint.sh",
    ".mise/tasks/ci",
    ".mise/tasks/ci-lite",
    ".mise/tasks/format",
    ".mise/tasks/format-check",
  ]);
  const committed = gitPaths081([
    "log",
    "--format=",
    "--name-only",
    "2a938e0..HEAD",
    "--",
  ]).filter(
    (p) => !shipOwned.has(p) && !plan083Owned.has(p) && !formatterOnlyDelta081(p),
  );
  return [...new Set([...committed, ...dirty, ...untracked])];
}

describe("prompt doctrine — Rust structural gate (TASK 1, plan 20261124-081)", () => {
  test("test_rust_gate_doctrine_strings", () => {
    const source = read081(TEST_FILE_081);
    expect(source).toContain(RUST_GATE_SENTENCE);
    expect(source).toContain(PHASE5_SKIP_RULE);
    // rust-crate-architecture is installed; deslop-please is a CLI, not a skill
    expect(INSTALLED_SKILLS.has("rust-crate-architecture")).toBe(true);
    expect(INSTALLED_SKILLS.has("deslop-please")).toBe(false);
  });

  test("test_rust_gate_reviewer_slice", () => {
    const sentenceIdx = REVIEWER.indexOf(RUST_GATE_SENTENCE);
    const rulesIdx = REVIEWER.indexOf("## Rules");
    const domainIdx = REVIEWER.indexOf("- Domain skills:");
    const nested = domainSkillsNestedSlice081();
    expect(rulesIdx).toBeGreaterThan(-1);
    expect(sentenceIdx, "canonical gate sentence missing from reviewer.md").toBeGreaterThan(-1);
    expect(sentenceIdx).toBeGreaterThan(rulesIdx);
    expect(sentenceIdx).toBeGreaterThan(domainIdx);
    expect(sentenceIdx).toBeGreaterThanOrEqual(domainIdx + nested.length);
    expect(nested).not.toContain(RUST_GATE_SENTENCE);

    const rustLine = REVIEWER.split("\n").find((line) => /^\s*-\s*Rust:/.test(line)) ?? "";
    let cursor = -1;
    for (const skill of RUST_SKILL_FAMILY) {
      const next = rustLine.indexOf(`\`${skill}\``, cursor + 1);
      expect(next, `Rust domain-skills line is missing \`${skill}\``).toBeGreaterThan(cursor);
      cursor = next;
    }

    // accretion: fold into Rules, never add a heading or blow the budget
    expect(topHeadingCount081()).toBe(7);
    expect(REVIEWER.split("\n").length).toBeLessThanOrEqual(170);
  });

  test("test_rust_gate_init_charter", () => {
    const step1 = norm081(step1Slice081());
    expect(step1).toContain(RUST_GATE_SENTENCE);
    for (const skill of RUST_SKILL_FAMILY) expect(step1).toContain(skill);
    expect(step1).toContain(PHASE5_SKIP_RULE);
    // generated Rust check is referenced from the charter and stays flat
    expect(rustCheckLine081()).toContain("deslop-please");
  });

  test("test_rust_gate_template_policy", () => {
    const template = read081("templates/AGENTS.md");
    const project = norm081(template.slice(template.indexOf("## PROJECT")));
    expect(project).not.toMatch(/Rust|cargo\/Rust|structural gate|init doctrine/i);
    expect(project).toContain("`<placeholder>`");
    expect(project).not.toContain(RUST_GATE_SENTENCE);
    expect(project).not.toContain("deslop-please");

    const policy = read081("templates/DOCS-POLICY.md");
    const start = policy.indexOf("## AGENTS.md (project)");
    const end = policy.indexOf("## CHANGELOG entry shape", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const section = norm081(policy.slice(start, end));
    expect(section).toMatch(/conditional domain gate/i);
    expect(section).toContain("PROJECT");
    expect(section).toContain("never CORE");
  });

  test("test_rust_gate_generated_check_shape", () => {
    const check = rustCheckLine081();
    const metadata = check.indexOf(
      "cargo metadata --no-deps --format-version 1",
    );
    const tree = check.indexOf(
      "cargo tree --locked --workspace -e normal,build --target all",
    );
    const clippy = check.indexOf(
      "cargo clippy --locked --workspace --all-targets -- -D warnings",
    );
    const deny = check.indexOf("cargo deny --config deny.toml --locked check");
    const deslop = check.indexOf("then deslop-please;");
    expect(metadata, "check must start with cargo metadata").toBe(0);
    expect(tree).toBeGreaterThan(metadata);
    expect(clippy).toBeGreaterThan(tree);
    expect(deny).toBeGreaterThan(clippy);
    expect(deslop, "guarded deslop-please must end the chain").toBeGreaterThan(deny);
    expect(check, "no --allow dependency on an owner-managed file").not.toContain(
      "--allow",
    );
    // optional tools are guarded and their absence is loud, never silent
    expect(check).toContain("command -v cargo-deny");
    expect(check).toContain("command -v deslop-please");
    expect(check).toMatch(/SKIP/);
    expect(check).toContain(">&2");
    expect(check).not.toContain("--update-allow");
    const step7 = norm081(step7Slice081());
    expect(step7).toMatch(/SKIP/i);
    expect(step7).toContain("stderr");
  });

  test("test_rust_gate_non_rust_unchanged", () => {
    // CORE stays stack-neutral and the universal template carries no Rust
    // pointer; the literal mandate is Rust-only doctrine.
    const template081 = read081("templates/AGENTS.md");
    const core081 = norm081(
      template081.slice(
        template081.indexOf("## CORE"),
        template081.indexOf("## POINTERS"),
      ),
    );
    expect(core081).not.toContain(RUST_GATE_SENTENCE);
    const project081 = norm081(
      template081.slice(template081.indexOf("## PROJECT")),
    );
    expect(project081).not.toMatch(/Rust|cargo\/Rust|structural gate|init doctrine/i);
    expect(project081).toContain("`<placeholder>`");
    expect(project081).not.toContain(RUST_GATE_SENTENCE);
    const nested = domainSkillsNestedSlice081();
    expect(nested).not.toContain(RUST_GATE_SENTENCE);
    expect(nested).not.toContain("deslop-please");
    const cited = [...nested.matchAll(/`([a-z0-9][a-z0-9-]*)`/g)].map(
      (m) => m[1],
    );
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.filter((name) => !INSTALLED_SKILLS.has(name))).toEqual([]);
    // pre-existing installed-skill pins survive the Rust-family extension
    expect(INSTALLED_SKILLS.has("rust-crate-architecture")).toBe(true);
    expect(INSTALLED_SKILLS.has("deslop-please")).toBe(false);
    expect(REVIEWER).not.toContain("unsafe-checker");
    expect(INIT_T1).not.toContain("unsafe-checker");
    const step1 = norm081(step1Slice081());
    expect(step1).toContain("modern-web-guidance");
    expect(step1).toContain("security-audit");
  });

  test("test_rust_gate_accretion_guard", () => {
    const lint = spawnSync(
      "bash",
      ["scripts/agents-lint.sh", "templates/AGENTS.md"],
      { encoding: "utf8" },
    );
    expect(lint.status, lint.stdout + lint.stderr).toBe(0);
    // existing accretion pins still hold after the fold
    expect(REVIEWER.split("\n").length).toBeLessThanOrEqual(170);
    expect(topHeadingCount081()).toBe(7);
    expect(REVIEWER).toContain(BUDGET);
    expect(REVIEWER).toContain(CITE);
    expect(WORKER).toContain(BUDGET);
    // the wired suite is the one that must stay green: the mandate landed in
    // the three Rust-only doctrine placements without growing the prompt
    // surface; the universal template stays Rust-free
    for (const p of RUST_GATE_PLACEMENTS.filter(
      (p) => p !== "templates/AGENTS.md",
    )) {
      expect(norm081(read081(p)), `mandate missing from ${p}`).toContain(
        RUST_GATE_SENTENCE,
      );
    }
    const template081 = read081("templates/AGENTS.md");
    const templateProject081 = norm081(
      template081.slice(template081.indexOf("## PROJECT")),
    );
    expect(templateProject081).not.toMatch(/Rust|structural gate|init doctrine/i);
    expect(templateProject081).not.toContain(RUST_GATE_SENTENCE);
  });

  test("test_rust_gate_no_forbidden_changes", () => {
    const changed = changedPaths081();
    // Plan 20261124-081 TASK 3 owns the docs surface; its README, architecture,
    // canon, and regenerated budget are legitimate churn, not TASK 1 drift.
    // TASK 4 owns the live judge schema, extractor, init doctrine, universal
    // template, docs and budgets; those are legitimate churn as well.
    const forbidden = [
      "CHANGELOG.md",
      "scripts/profile-lint.sh",
      "scripts/flow-gates.mjs",
      "scripts/check-tree.mjs",
      "scripts/agents-lint.sh",
      "scripts/docs-lint.sh",
      ".deslop-please.allow",
    ];
    expect(
      changed.filter(
        (p) =>
          forbidden.includes(p)
          || /\.allow$/.test(p)
          || p.startsWith(".mise/tasks/"),
      ),
    ).toEqual([]);
    // the boundary check is non-vacuous: the contracted wiring landed
    expect(changed).toContain(TEST_FILE_081);
    expect(changed).toContain("extensions/index.ts");
    for (const p of RUST_GATE_PLACEMENTS) expect(changed).toContain(p);
    expect(fs.existsSync(".deslop-please.allow")).toBe(false);
  });
});

// --- plan 20261124-081 TASK 4 — universal template must stay Rust-free ---
const NON_RUST_FIXTURE_081: Record<string, string> = {
  "README.md": "# fixture-app\n\nA small TypeScript CLI maintained by one team.\n",
  "package.json": JSON.stringify({
    name: "fixture-app",
    scripts: { test: "bun test", lint: "bunx eslint ." },
  }),
  "src/index.ts": "export const main = () => 0;\n",
  "tests/app.test.ts": "test(\"app\", () => {});\n",
  "docs/architecture.md": "# Architecture\n\nSingle-entry CLI.\n",
  "CONTRIBUTING.md": "# Contributing\n\nbun test before push.\n",
  "scripts/agents-lint.sh": "#!/usr/bin/env bash\n",
};

const RUST_FIXTURE_081: Record<string, string> = {
  "README.md": "# fixture-rs\n\nA small Rust CLI.\n",
  "Cargo.toml": "[package]\nname = \"fixture-rs\"\nversion = \"0.1.0\"\n",
  "src/main.rs": "fn main() {}\n",
  "docs/architecture.md": "# Architecture\n\nSingle-crate CLI.\n",
  "CONTRIBUTING.md": "# Contributing\n\ncargo test before push.\n",
  "scripts/agents-lint.sh": "#!/usr/bin/env bash\n",
};

function stagedRepo081(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "non-rust-charter-"));
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(root, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return root;
}

async function charterFor081(root: string): Promise<string> {
  const ctx = buildAdoptContext(root);
  const result = await extractAdoptDraft(recordedAdoptBackend(root), ctx);
  if (!result.draft) throw new Error(`adopt draft skipped: ${result.reason}`);
  const written = writeAdoptDrafts(root, result.draft);
  return fs.readFileSync(written.charter, "utf8");
}

/** Byte-for-byte output of the universal template for a non-Rust adopt
 *  before plan 081: no Rust pointer, no Rust gate sentence, only slot fills. */
const PRE_PLAN_NON_RUST_CHARTER_081 = [
  "## CORE (binding)",
  "",
  "- Command entrypoint: repo-root `.mise/tasks` file tasks;",
  "  use `mise run <task>` for gates.",
  "- Containment: work only within your task's Allowed Changes; anything else is reported, never fixed.",
  "- Commits: workers never commit, merge, or push; a gate commits after review passes.",
  "- Refactor first: extend existing structure before adding new surface.",
  "- TDD: write the failing test with the change, not after; keep the suite green.",
  "- Resources: before any test suite or build, verify free CPU and RAM",
  "  (`free -h` + load average); constrained or many parallel runs → defer",
  "  or serialize.",
  "- Subtract first: prefer deleting or simplifying over adding.",
  "- Root causes: fix causes, not symptoms; never patch around a defect.",
  "- Docs discipline: docs describe current state; history lands only in",
  "  CHANGELOG.md.",
  "",
  "## POINTERS",
  "",
  "- Project overview (what this is, who it serves): `README.md`",
  "- Build and test (commands, fixtures): `package.json`",
  "  (prefer `mise run <task>` file tasks when present)",
  "- Architecture and docs index (map, ADRs): `docs/architecture.md`",
  "- Conventions (style, docs policy): `CONTRIBUTING.md`",
  "",
  "## PROJECT",
  "",
  "- Adopted <DATE> by /init --adopt — project rules pending the owner's review; the judge",
  "  DRAFTED this charter and the deterministic lints verified the paths",
  "  (see .workflows/charter-pointers.draft.md).",
  "- Review pointers cite the TypeScript (npm) skill family: security-audit.",
  "",
].join("\n");

const dateAgnostic081 = (text: string) => text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "<DATE>");

describe("prompt doctrine — universal template parity (TASK 4, plan 20261124-081)", () => {
  test("test_non_rust_template_no_pointer", async () => {
    const template = read081("templates/AGENTS.md");
    expect(template, "the universal template must not carry a Rust-specific pointer").not.toMatch(
      /\bRust\b|deslop-please|structural gate|cargo\/Rust/i,
    );

    const nonRust = await charterFor081(stagedRepo081(NON_RUST_FIXTURE_081));
    const expected = PRE_PLAN_NON_RUST_CHARTER_081.replace(
      "<DATE>",
      new Date().toISOString().slice(0, 10),
    );
    expect(
      dateAgnostic081(nonRust),
      "non-Rust charter must stay byte-identical to the pre-plan output",
    ).toBe(dateAgnostic081(expected));

    // The conditional gate still lands where Rust is actually detected.
    const rustCharter = await charterFor081(stagedRepo081(RUST_FIXTURE_081));
    expect(rustCharter).toContain(RUST_GATE_SENTENCE);
    for (const p of [
      "agents/reviewer.md",
      "skills/init/SKILL.md",
      "templates/DOCS-POLICY.md",
    ]) {
      expect(norm081(read081(p)), `Rust doctrine missing from ${p}`).toContain(
        RUST_GATE_SENTENCE,
      );
    }
  });
});

// --- TASK 3 (plan 20261125-082): content-bound judge pre-flight doctrine ---
// Wave 2 owns skills/plan/SKILL.md + docs/canon.md + the regenerated docs
// baseline. These pins read doctrine only; the docs gates run read-only.
const PLAN_082 = fs.readFileSync("skills/plan/SKILL.md", "utf8");
const CANON_082 = fs.readFileSync("docs/canon.md", "utf8");
const REVIEW_082 = fs.readFileSync("skills/review/SKILL.md", "utf8");
const flat082 = (s: string) => s.replace(/\s+/g, " ");
const PREFLIGHT_IDS_082 = [
  "criterion_testable",
  "boundary_complete",
  "ambiguity",
  "missing_scenarios",
  "second_path_violation",
];

function phase5Slice082(): string {
  const m = PLAN_082.indexOf("## Phase 5: GENERATE CONTRACTS");
  expect(m).toBeGreaterThan(-1);
  const end = PLAN_082.indexOf("## Phase 6: HAND OFF", m);
  expect(end).toBeGreaterThan(m);
  return PLAN_082.slice(m, end);
}

function codeBlocks082(s: string): string[] {
  return [...s.matchAll(/```(?:[a-z]+)?\r?\n([\s\S]*?)```/g)].map((m) => flat082(m[1]));
}

function questionTemplate082(): Array<Record<string, any>> {
  const candidates = [...phase5Slice082().matchAll(/```json\s*\n([\s\S]*?)```/g)]
    .map((m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    })
    .filter(
      (v): v is Array<Record<string, any>> =>
        Array.isArray(v)
        && v.length > 0
        && v.every((q) => q && typeof q === "object" && "id" in q),
    );
  expect(
    candidates.length,
    "Phase 5 must carry a parseable ready-to-write question template",
  ).toBeGreaterThan(0);
  return candidates[0];
}

describe("prompt doctrine — judge pre-flight content binding (TASK 3, plan 20261125-082)", () => {
  test("test_plan_template_content_bound", () => {
    const p = phase5Slice082();
    const flat = flat082(p);

    // The judge command binds the contract text at call time: both the
    // question file and the spec must ride on the same command line.
    const ask = codeBlocks082(p).find((b) => /\bjudge ask\b/.test(b));
    expect(ask, "Phase 5 must pin the judge ask command").toBeDefined();
    const cmd = ask ?? "";
    expect(cmd).toMatch(/--questions\s+\S+/);
    expect(cmd).toMatch(/--context\s+\S+/);
    expect(cmd).toMatch(/\.workflows\/reviews\/preflight-[^\s]+\.json/);
    expect(cmd).toMatch(/\.workflows\/specs\/[^\s]+\.spec/);

    // No bare contract placeholder in the questions: the lint rejects a
    // path with no supplied context, so the template cannot teach one.
    const questions = questionTemplate082();
    expect(questions.map((q) => q.id).sort()).toEqual(
      [...PREFLIGHT_IDS_082].sort(),
    );
    expect(JSON.stringify(questions)).not.toContain("<spec path>");
    for (const q of questions) {
      expect(q.schema?.enum?.map((v: unknown) => String(v).toLowerCase()).sort()).toEqual(
        ["no", "yes"],
      );
      // The object schemas were rejected by the client (judge.mjs:167).
      expect(q.schema?.type).not.toBe("object");
      expect(q.schema?.properties).toBeUndefined();
      // A yes/no answer cannot carry quoted or named detail: the questions
      // must stay decidable without asking for text the schema cannot return.
      expect(
        String(q.question),
        `question ${q.id} asks for detail the yes/no schema cannot return`,
      ).not.toMatch(/\b(?:quote|name|cite|copy|paste|transcribe|spell)\b/i);
      expect(String(q.question).trim().endsWith("?")).toBe(true);
    }

    // Review round 2: fix routing goes by finding ID plus manual inspection
    // of the content-bound spec, never by detail extracted from the verdict.
    const step3Start = p.indexOf("### Step 3");
    const step3End = p.indexOf("### Step 4", step3Start);
    expect(step3Start).toBeGreaterThan(-1);
    expect(step3End).toBeGreaterThan(step3Start);
    const step3 = flat082(p.slice(step3Start, step3End));
    expect(step3).toMatch(/finding IDs?/i);
    for (const id of PREFLIGHT_IDS_082) {
      expect(step3, `Step 3 must route ${id} by ID`).toContain(id);
    }
    expect(step3).toMatch(/manual inspection/i);
    expect(step3).toMatch(/content-bound spec/i);
    expect(step3).not.toMatch(/\b(?:quote|named|name)\b/i);
    expect(flat).toMatch(
      /yes[^.]{0,30}(?:means|=|:)[^.]{0,80}(?:finding|defect)[^.]{0,40}present/i,
    );
    expect(flat).toMatch(
      /(?:confidence[^.]{0,80}numeric|numeric[^.]{0,80}confidence)/i,
    );
  });

  test("test_preflight_content_bound_only", () => {
    const p = phase5Slice082();
    const flat = flat082(p);

    expect(flat).toMatch(/pre-flight[^.]{0,120}content-bound/i);
    expect(flat).toMatch(/path-only[^.]{0,100}(?:invalid|never|forbidden|rejected)/i);
    // The diff route is named as a Stage 2 hand-off, never as pre-flight
    // input and never as a flag on the judge ask command.
    expect(flat).toMatch(/diff-bound/i);
    expect(flat).toMatch(/bench verdicts/);
    expect(flat).toMatch(/Stage 2/i);
    const ask = codeBlocks082(p).find((b) => /\bjudge ask\b/.test(b)) ?? "";
    expect(ask).not.toContain("bench verdicts");
    expect(ask).not.toContain("--diff");

    // Stage 2 itself is untouched: bench verdicts still takes a diff summary.
    const start = REVIEW_082.indexOf(
      "## Stage 2: Adversarial + Quality Review",
    );
    expect(start).toBeGreaterThan(-1);
    const end = REVIEW_082.indexOf("### Stage 2: Reviews", start);
    expect(end).toBeGreaterThan(start);
    const stage2 = REVIEW_082.slice(start, end);
    expect(stage2).toContain("bench verdicts");
    expect(stage2).toContain("--diff");
  });

  test("test_canon_paths_not_evidence", () => {
    const rule = CANON_082.split("\n").find((line) => /\bpaths?\b.*\bpointers?\b.*\bnot\s+evidence\b/i.test(line));
    expect(rule, "canon lacks the paths-are-not-evidence rule").toBeDefined();
    const line = rule ?? "";
    const gate = line.indexOf("gate:");
    const lint = line.indexOf("check-judge-context.mjs");
    expect(gate).toBeGreaterThan(-1);
    expect(lint).toBeGreaterThan(gate);
    expect(line.slice(0, gate)).toMatch(/not evidence/i);

    // The baseline is regenerated only through docs-lint's --write-baseline;
    // after that, both gates read clean. Checks are read-only here: the test
    // never rewrites the baseline as a side effect.
    for (const script of ["scripts/docs-lint.sh", "scripts/check-drift.sh"]) {
      const r = spawnSync("bash", [script], {
        encoding: "utf8",
        timeout: 300000,
      });
      expect(
        r.status,
        `${script} exited ${r.status}:\n${r.stdout}\n${r.stderr}`,
      ).toBe(0);
    }
  }, 600000);
});

/* ── TASK 4 (plan 20261125-082): whole-plan review fixes ──────────────────
 * Four source findings plus their integrated gates. All pins are reads (or
 * child gate runs); no production or docs file is rewritten by these tests. */
const INIT_082_T4 = fs.readFileSync("skills/init/SKILL.md", "utf8");

describe("prompt doctrine — whole-plan review fixes (TASK 4, plan 20261125-082)", () => {
  test("test_confidence_floor_preserved", () => {
    const p = phase5Slice082();
    const start = p.indexOf("### Step 4");
    const end = p.indexOf("### Step 5", start);
    expect(start, "Phase 5 must carry a Step 4 escalation rule").toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const step4 = flat082(p.slice(start, end));

    expect(step4).toMatch(/confidence/i);
    expect(step4).toMatch(/escalat/i);
    expect(step4).toContain("0.6");
    expect(step4).toMatch(
      /0\.6\s*(?:floor|threshold|or below)|(?:floor|below|under|less than|at or below|[<≤])[^\n]{0,24}0\.6/i,
    );

    // The review finding was the vague replacement text; it must be gone
    // from Step 4 and from the plan skill as a whole.
    const vague = /\b(?:near|around|about|close to|roughly|approximately)\s+0?\.5\b/i;
    expect(step4).not.toMatch(vague);
    expect(PLAN_082).not.toMatch(vague);
  });

  test("test_init_wrapper_inventory_current", () => {
    const start = INIT_082_T4.indexOf("**Task bridge: pi-workflows wrappers");
    expect(start, "init skill must document its generated wrapper inventory").toBeGreaterThan(-1);
    const end = INIT_082_T4.indexOf("**Persona bridge", start);
    expect(end).toBeGreaterThan(start);
    const inventory = INIT_082_T4.slice(start, end);

    // Derive the expected names from the actual deterministic builder so the
    // doc cannot silently lag behind a newly generated wrapper.
    const generated = buildInitMiseFragment();
    const wrappers = [...generated.matchAll(/^\[tasks\."(wf:[^"]+)"\]$/gm)].map((m) => m[1]);
    expect(wrappers).toContain("wf:judge-context");
    for (const name of wrappers) {
      expect(inventory, `init wrapper inventory omits ${name}`).toContain(`[tasks."${name}"]`);
    }
    for (const name of [
      "wf:judge",
      "wf:lessons",
      "wf:bench",
      "wf:archive-check",
      "wf:wip",
      "wf:judge-context",
    ]) {
      expect(inventory, `init wrapper inventory omits ${name}`).toContain(`[tasks."${name}"]`);
    }
  });

  test("test_stage2_fixes_green", () => {
    // The outer `mise exec -- bun test` run is the full suite; a child run
    // with this sentinel skips this gate test, so there is no recursion.
    if (process.env.PI_WORKFLOWS_STAGE2_INNER === "1") return;

    const expected: Record<string, string[]> = {
      "tests/judge.test.ts": ["test_context_resolves_from_consumer_cwd"],
      "tests/judge-context.test.ts": ["test_lint_requires_context_for_preflight"],
      "tests/prompt-doctrine.test.ts": [
        "test_confidence_floor_preserved",
        "test_init_wrapper_inventory_current",
        "test_stage2_fixes_green",
      ],
    };
    for (const [file, names] of Object.entries(expected)) {
      const source = fs.readFileSync(file, "utf8");
      for (const name of names) {
        expect(source, `${file} must pin the exact selector ${name}`).toMatch(
          new RegExp(`test\\(\\s*["']${name}["']`),
        );
      }
    }

    // The contract stays at the planned two fix rounds and keeps the full
    // Verify chain; no extra budget or weaker gate is allowed to close TASK 4.
    // Plan 20261125-082's contract is archived; the live spec path now
    // belongs to plan 20261127-083.
    const specFile = ".workflows/archive/done/20261125-082-judge-content-binding/specs/task-4.spec";
    if (fs.existsSync(specFile)) {
      const spec = fs.readFileSync(specFile, "utf8");
      expect(spec).toMatch(/^max-rounds:\s*2\s*$/m);
      expect(spec).toContain("mise exec -- bun test");
      expect(spec).toContain("mise exec -- bash scripts/docs-lint.sh");
      expect(spec).toContain("bash scripts/check-drift.sh");
    }

    // Bun matches the full "describe > test" display name, so the names
    // are matched unanchored (stage2 itself is deliberately not listed).
    const pattern =
      "(test_context_resolves_from_consumer_cwd|test_lint_requires_context_for_preflight|test_confidence_floor_preserved|test_init_wrapper_inventory_current)";
    const targeted = spawnSync(
      "mise",
      ["exec", "--", "bun", "test", ...Object.keys(expected), "-t", pattern],
      {
        encoding: "utf8",
        timeout: 600000,
        env: { ...process.env, PI_WORKFLOWS_STAGE2_INNER: "1" },
      },
    );
    expect(
      targeted.status,
      `pinned fix selectors failed:\n${targeted.stdout}\n${targeted.stderr}`,
    ).toBe(0);

    const docs = spawnSync("mise", ["exec", "--", "bash", "scripts/docs-lint.sh"], {
      encoding: "utf8",
      timeout: 600000,
    });
    expect(docs.status, `docs-lint failed:\n${docs.stdout}\n${docs.stderr}`).toBe(0);
    const drift = spawnSync("bash", ["scripts/check-drift.sh"], {
      encoding: "utf8",
      timeout: 600000,
    });
    expect(drift.status, `check-drift failed:\n${drift.stdout}\n${drift.stderr}`).toBe(0);
  }, 600000);
});

/* ── TASK 3 (plan 20261127-083): gate-timing doctrine + docs ─────────────
 * The five selectors below come verbatim from .workflows/specs/task-3.spec.
 * Every assertion is a read or a read-only child gate; no `--write-baseline`
 * appears in the verification leg, and no production/doc file is edited.
 */
const read083 = (p: string) => fs.readFileSync(p, "utf8");
const flat083 = (s: string) => s.replace(/\s+/g, " ");
const slice083 = (s: string, start: string, end?: string): string => {
  const a = s.indexOf(start);
  if (a < 0) return "";
  const b = end ? s.indexOf(end, a + start.length) : -1;
  return b < 0 ? s.slice(a) : s.slice(a, b);
};

// Co-location check: one alternative from each group must appear in the same
// window. It proves a sentence-level doctrine instead of a whole-file grep.
const near083 = (
  s: string,
  groups: string[][],
  size = 360,
): boolean => {
  const lower = s.toLowerCase();
  const anchors = groups[0] ?? [];
  for (const anchor of anchors) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(anchor.toLowerCase(), from);
      if (at < 0) break;
      const window = lower.slice(
        Math.max(0, at - size),
        at + anchor.length + size,
      );
      if (
        groups.every((group) => group.some((alt) => window.includes(alt.toLowerCase())))
      ) {
        return true;
      }
      from = at + anchor.length;
    }
  }
  return false;
};

const INIT_083 = read083("skills/init/SKILL.md");
const README_083 = read083("README.md");
const CANON_083 = read083("docs/canon.md");
const ARCH_083 = read083("docs/architecture.md");
const REVIEWER_083 = read083("agents/reviewer.md");
const REVIEW_SKILL_083 = read083("skills/review/SKILL.md");

describe(
  "prompt doctrine — gate timing + docs authority (TASK 3, plan 20261127-083)",
  () => {
    test("test_worker_verify_scoped_check", () => {
      const init = flat083(INIT_083);
      const gates = flat083(slice083(README_083, "## Gates", "## Flows"));

      expect(gates, "README ## Gates slice is missing").not.toBe("");
      // Worker Verify: read-only format check, scoped to the task's explicit
      // paths, never `fmt` in that leg.
      expect(
        near083(init, [
          ["verify"],
          ["format-check", "format check"],
          ["read-only", "non-mutating"],
          ["scoped"],
          ["explicit paths"],
        ]),
        "init must pin Verify as a scoped read-only format check",
      ).toBe(true);
      expect(
        near083(init, [["verify"], ["never", "not"], ["fmt"]]),
        "init must forbid fmt in the Verify leg",
      ).toBe(true);
      // `fmt` is licensed only by an explicit formatting task on explicit
      // paths — never by a dispatch pack's ordinary Verify command.
      expect(
        near083(init, [
          ["fmt"],
          ["explicitly contracted"],
          ["formatting task"],
          ["explicit paths"],
        ]),
        "init must reserve fmt for an explicit formatting task",
      ).toBe(true);
      expect(
        near083(gates, [
          ["verify"],
          ["format-check", "format check"],
          ["read-only", "non-mutating"],
          ["scoped"],
          ["explicit paths"],
        ]),
        "README Gates must pin the scoped read-only Verify check",
      ).toBe(true);
      expect(
        near083(gates, [
          ["fmt"],
          ["explicitly contracted"],
          ["formatting task"],
          ["explicit paths"],
        ]),
        "README Gates must pin fmt's explicit-task boundary",
      ).toBe(true);
      expect(
        near083(gates, [
          ["pre-commit"],
          ["staged"],
          ["read-only", "non-mutating"],
        ]),
        "README Gates must pin the staged read-only pre-commit check",
      ).toBe(true);
      expect(
        near083(gates, [["pre-commit"], ["never rewrite"]]),
        "README Gates must say pre-commit never rewrites files",
      ).toBe(true);
    });

    test("test_reviewer_consumes_output", () => {
      const slice = flat083(slice083(REVIEWER_083, "## Tier 0"));
      expect(slice, "reviewer Tier 0 / Rules slice is missing").toContain(
        "## Rules",
      );
      expect(
        near083(slice, [
          ["recorded"],
          ["format-check", "format check"],
          ["output"],
          ["evidence"],
        ]),
        "reviewer must treat recorded format-check output as evidence",
      ).toBe(true);
      expect(
        near083(slice, [["re-derive"], ["widen"], ["repair"]]),
        "reviewer must not re-derive, widen, or repair the check",
      ).toBe(true);
      expect(slice, "the read-only verdict rule must survive").toMatch(
        /\bread-only\b/i,
      );
      expect(
        near083(slice, [["never", "not"], ["fmt"]], 240),
        "reviewer must never run fmt",
      ).toBe(true);
      expect(slice, "the read-only verdict rule must survive").toContain(
        "Reviewers verify, never fix.",
      );
      // The existing tiers absorb the rule: no extra verification prompt,
      // role, or reviewer section is introduced for format checks.
      expect(
        fs
          .readdirSync("prompts")
          .filter((f) => f !== "verify.md" && /(?:format|verify)/i.test(f)),
      ).toEqual([]);
      expect(REVIEWER_083).not.toMatch(
        /^##\s+(?:Format|Formatting|Verification task)/im,
      );
    });

    test("test_stage1_whole_tree_check", () => {
      const stage1 = flat083(
        slice083(
          REVIEW_SKILL_083,
          "## Stage 1: Mechanical Verification",
          "## Stage 2:",
        ),
      );
      expect(stage1, "review Stage 1 slice is missing").not.toBe("");
      expect(stage1, "Stage 1 must name the read-only mise task").toContain(
        "mise run format-check",
      );
      expect(
        near083(stage1, [
          ["mise run format-check"],
          ["read-only", "non-mutating"],
          ["whole-tree", "whole tree"],
        ]),
        "Stage 1 must run the whole-tree read-only check",
      ).toBe(true);
      expect(
        near083(stage1, [
          ["full verification suite"],
          ["format-check", "format check"],
        ]),
        "the format check belongs to the full verification suite",
      ).toBe(true);
      expect(
        /scoped[^.]{0,200}(?:not|never|no)[^.]{0,160}(?:substitute|replace)/i.test(
          stage1,
        )
          || /(?:not|never)\s+[^.]{0,80}(?:substitute|replace)[^.]{0,160}scoped/i.test(
            stage1,
          ),
        "a scoped task result cannot replace the whole-tree check",
      ).toBe(true);
      expect(stage1, "Stage 1 must name fmt explicitly").toMatch(/\bfmt\b/i);
      expect(
        /(?:never|not)\s+(?:run|runs|invoke|invokes)[^.]{0,80}(?:fmt|`?format`?)[^.]{0,100}(?:repair|rewrite|fix)/i
          .test(
            stage1,
          ),
        "Stage 1 never runs format/fmt to repair files",
      ).toBe(true);
    });

    test("test_markdown_docs_lint_authority", () => {
      for (
        const [label, doc] of [
          ["README.md", README_083],
          ["docs/canon.md", CANON_083],
          ["skills/init/SKILL.md", INIT_083],
        ] as const
      ) {
        const flat = flat083(doc);
        expect(
          near083(flat, [
            ["Markdown"],
            ["excluded", "excludes"],
            ["format-check", "format check"],
          ]),
          `${label} must exclude Markdown from the format check`,
        ).toBe(true);
        expect(
          near083(flat, [
            ["Markdown"],
            ["docs-lint.sh"],
            ["sole", "only"],
            ["authority"],
          ]),
          `${label} must name docs-lint as the sole Markdown authority`,
        ).toBe(true);
      }

      // No allowed surface grants a Markdown formatter, a second checker,
      // or a fmt rewrite of fences the docs-lint gate already validated.
      for (const p of [
        "README.md",
        "docs/architecture.md",
        "docs/canon.md",
        "skills/init/SKILL.md",
        "agents/reviewer.md",
        "skills/review/SKILL.md",
      ]) {
        const grants = read083(p)
          .split("\n")
          .filter((line) => {
            const l = line.toLowerCase();
            if (!/\bmarkdown\b/.test(l)) return false;
            if (
              !/\b(?:dprint|formatter|format-check|fmt|second checker|markdownlint-cli2|plugin)\b/.test(
                l,
              )
            ) {
              return false;
            }
            if (
              !/\b(?:enable[sd]?|add(?:s|ed)?|use[sd]?|run(?:s)?|support(?:s)?|format(?:s|ted)?|rewrite[sd]?|checker)\b/
                .test(
                  l,
                )
            ) {
              return false;
            }
            return !/\b(?:never|not|no|exclude[sd]?|sole|only|authority|skip(?:ped)?|forbidden|disabl(?:e|ed)|without)\b/
              .test(
                l,
              );
          });
        expect(grants, `${p} grants a second Markdown authority`).toEqual([]);
      }

      const baseline = JSON.parse(read083("scripts/docs-lint-baseline.json"));
      expect(baseline.generated_by).toBe(
        "bash scripts/docs-lint.sh --write-baseline",
      );
      expect(baseline.note).toContain(
        "bash scripts/docs-lint.sh --write-baseline",
      );
      expect(baseline.note, "baseline is hand-editable").toContain(
        "never hand-edit",
      );
    });

    test("test_generated_docs_clean", async () => {
      // Pre-task snapshot: scripts/docs-lint-baseline.json at the end of
      // TASK 1/2 (commit 64ad30c). A fix may lower a budget; a rise banks
      // new doc debt and fails even if the regenerated file is self-clean.
      const preTask: Record<
        string,
        { total: number; files: Record<string, number> }
      > = {
        "markdownlint-cli2": {
          total: 338,
          files: {
            "AGENTS.md": 11,
            "README.md": 45,
            "agents/dispatch-shapes.md": 18,
            "agents/execution-doctrine.md": 16,
            "agents/orchestrator.md": 8,
            "agents/quality-reviewer.md": 3,
            "agents/registry.md": 13,
            "agents/reviewer.md": 7,
            "agents/scout.md": 2,
            "agents/spec-drafter.md": 6,
            "agents/tester.md": 3,
            "agents/worker.md": 15,
            "docs/architecture.md": 28,
            "prompts/abort.md": 5,
            "prompts/add.md": 2,
            "prompts/audit.md": 2,
            "prompts/brainstorm.md": 1,
            "prompts/explore.md": 2,
            "prompts/fix.md": 1,
            "prompts/idea.md": 1,
            "prompts/optimize.md": 5,
            "prompts/prototype.md": 2,
            "prompts/restart.md": 2,
            "prompts/status.md": 1,
            "prompts/verify.md": 8,
            "skills/add-feature/SKILL.md": 13,
            "skills/brainstorm/SKILL.md": 1,
            "skills/brainstorm/references/resume-protocol.md": 1,
            "skills/challenge/SKILL.md": 1,
            "skills/docs-check/SKILL.md": 3,
            "skills/docs/SKILL.md": 4,
            "skills/explore/SKILL.md": 5,
            "skills/fix/SKILL.md": 12,
            "skills/flows/SKILL.md": 4,
            "skills/idea/SKILL.md": 5,
            "skills/init/SKILL.md": 1,
            "skills/optimize/SKILL.md": 7,
            "skills/plan/SKILL.md": 31,
            "skills/refactor/SKILL.md": 5,
            "skills/review/SKILL.md": 14,
            "templates/ADR-FORMAT.md": 3,
            "templates/AGENTS.md": 3,
            "templates/CONTEXT-FORMAT.md": 1,
            "templates/CONTRACT-FORMAT.md": 2,
            "templates/DOCS-POLICY.md": 4,
            "templates/FOLLOW-UP-TABLE.md": 7,
            "templates/THINKING-TOOLS.md": 4,
          },
        },
        lychee: { total: 0, files: {} },
        "harper-cli": {
          total: 1107,
          files: {
            "ADR-FORMAT.md": 9,
            "ADR.md": 1,
            "AGENTS.md": 13,
            "CONTEXT-FORMAT.md": 4,
            "CONTRACT-FORMAT.md": 19,
            "DECISION.md": 1,
            "DOCS-POLICY.md": 34,
            "FOLLOW-UP-TABLE.md": 24,
            "PROPOSAL-FORMAT.md": 3,
            "README.md": 49,
            "REVIEW_GUIDELINES.md": 1,
            "SKILL.md": 381,
            "STATUS-VOCABULARY.md": 7,
            "THINKING-TOOLS.md": 9,
            "abort.md": 9,
            "add.md": 7,
            "amend.md": 1,
            "architecture.md": 62,
            "audit.md": 8,
            "auto-next.md": 6,
            "brainstorm.md": 5,
            "canon.md": 13,
            "challenge.md": 1,
            "contract.md": 8,
            "debug.md": 3,
            "dispatch-shapes.md": 44,
            "docs.md": 1,
            "execution-doctrine.md": 129,
            "explore.md": 6,
            "fix.md": 4,
            "idea.md": 1,
            "init.md": 1,
            "ledger-format.md": 9,
            "next.md": 6,
            "optimize.md": 18,
            "orchestrator.md": 2,
            "prototype.md": 7,
            "quality-reviewer.md": 22,
            "refactor.md": 1,
            "registry.md": 42,
            "restart.md": 1,
            "resume-protocol.md": 2,
            "reviewer.md": 17,
            "scout.md": 6,
            "spec-drafter.md": 13,
            "status.md": 15,
            "tester.md": 19,
            "verify.md": 4,
            "worker.md": 59,
          },
        },
      };
      const baseline = JSON.parse(
        read083("scripts/docs-lint-baseline.json"),
      ) as { sections: typeof preTask };
      const budgets = baseline.sections;
      for (const section of Object.keys(budgets)) {
        expect(
          preTask[section],
          `new budget section ${section} is not in the pre-task snapshot`,
        ).toBeDefined();
      }
      for (const [section, snap] of Object.entries(preTask)) {
        const actual = budgets[section] ?? { total: 0, files: {} };
        expect(
          actual.total,
          `${section} total budget rose above the pre-task snapshot`,
        ).toBeLessThanOrEqual(snap.total);
        const files = actual.files;
        for (const [file, n] of Object.entries(files)) {
          expect(
            snap.files[file],
            `${section} gained a new budget entry for ${file}`,
          ).toBeDefined();
          expect(
            n,
            `${section} budget for ${file} rose above the pre-task snapshot`,
          ).toBeLessThanOrEqual(snap.files[file] ?? 0);
        }
      }

      // Read-only gates: no --write-baseline in either verification leg.
      const docs = spawnSync(
        "mise",
        ["exec", "--", "bash", "scripts/docs-lint.sh"],
        { encoding: "utf8", timeout: 600000 },
      );
      expect(
        docs.status,
        `docs-lint failed:\n${docs.stdout}\n${docs.stderr}`,
      ).toBe(0);
      const drift = spawnSync("bash", ["scripts/check-drift.sh"], {
        encoding: "utf8",
        timeout: 600000,
      });
      expect(
        drift.status,
        `check-drift failed:\n${drift.stdout}\n${drift.stderr}`,
      ).toBe(0);

      // The format gate sits beside the existing gates; neither is replaced.
      const chain = flat083(
        slice083(ARCH_083, "**Repo gate chain**", "## Bottleneck tags"),
      );
      expect(chain, "architecture repo gate chain is missing").not.toBe("");
      expect(chain).toContain("check-drift.sh");
      expect(chain).toContain("docs-lint.sh");
      expect(
        near083(
          chain,
          [
            ["format-check", "format check"],
            ["read-only", "non-mutating"],
          ],
          480,
        ),
        "format gate must be read-only in the repo gate chain",
      ).toBe(true);

      // Claims must match the landed TASK 1/2 surfaces, not a guessed tool.
      expect(
        near083(flat083(README_083), [
          ["format-check"],
          ["--list-different"],
          ["read-only"],
        ]),
        "README must describe the landed read-only --list-different gate",
      ).toBe(true);
      expect(
        near083(flat083(README_083), [["optional"], ["`format`", "mise run format"]]),
        "README must mark the mutating format task optional",
      ).toBe(true);
      expect(
        near083(flat083(INIT_083), [
          ["detect", "detected"],
          ["profile"],
          ["owner gate", "owner approval", "owner-gated"],
        ]),
        "init must describe detected owner-gated formatter profiles",
      ).toBe(true);
      expect(
        near083(flat083(INIT_083), [
          ["SKIP"],
          ["missing", "absent"],
          ["formatter", "format-check"],
        ]),
        "init must pin the loud SKIP for a missing formatter",
      ).toBe(true);
      expect(CANON_083, "canon rule 4 must survive").toContain(
        "Every behavioral claim names its gate",
      );
    }, 600000);
  },
);

/* ── TASK 5 (plan 20261127-083): whole-plan review fixes ────────────────
 * Selector: test_worker_rule_in_role (verbatim from task-5.spec). The worker
 * role file, not only init doctrine, must carry the scoped read-only Verify
 * rule and the explicit-path fmt exception. No new role/task may appear. */
const WORKER_083 = read083("agents/worker.md");
const REGISTRY_083 = read083("agents/registry.md");

describe("prompt doctrine — worker role Verify rule (TASK 5, plan 20261127-083)", () => {
  test("test_worker_rule_in_role", () => {
    const worker = flat083(WORKER_083);
    const init = flat083(INIT_083);
    const scopedRead = [
      ["verify"],
      ["format-check", "format check"],
      ["read-only", "non-mutating"],
      ["scoped"],
      ["explicit paths", "named paths"],
    ];
    const fmtException = [
      ["fmt"],
      [
        "explicitly contracted",
        "contracted formatting task",
        "explicit formatting task",
        "explicitly requested formatting task",
      ],
      ["explicit paths", "named paths"],
    ];
    expect(
      near083(worker, scopedRead),
      "worker role must carry the scoped read-only format-check Verify rule",
    ).toBe(true);
    expect(
      near083(worker, fmtException),
      "worker role must carry the explicit-path fmt exception",
    ).toBe(true);
    expect(
      near083(init, scopedRead),
      "init doctrine must keep the scoped read-only Verify rule",
    ).toBe(true);
    expect(
      near083(init, fmtException),
      "init doctrine must keep the explicit-path fmt exception",
    ).toBe(true);

    const roleFiles = fs
      .readdirSync("agents")
      .filter((name) => /format|verif(?:y|ier)/i.test(name));
    expect(roleFiles, "no new verification role file may be introduced").toEqual(
      [],
    );
    expect(REGISTRY_083).not.toMatch(/format-check(?:er)?\b|formatter\s+role/i);
    expect(worker).not.toMatch(
      /^#{1,6}\s+.*\bformat(?:-check|ter)?\b.*\b(?:role|task)\b/im,
    );
  });
});
