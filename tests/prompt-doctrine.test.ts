import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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

const readT2 = (p: string) =>
  fs.readFileSync(p, "utf8").replace(/\s+/g, " ");

// --- T2: dispatch-policy pins (plan 20261102-050) ---
describe("prompt doctrine — dispatch policy (T2, plan 20261102-050)", () => {
  test("registry dispatch policy assigns per-task budgets in the pack", () => {
    const registry = readT2("agents/registry.md");
    expect(registry).toContain(
      "The orchestrator assigns each task's budget in the pack (default 60 tool calls from role doctrine; judge/API-call caps explicit when the task touches judge/API surfaces)."
    );
  });

  test("execution doctrine report rules carry the Done-when assertion duty", () => {
    const doctrine = readT2("agents/execution-doctrine.md");
    expect(doctrine).toContain(
      "final report asserts each Done-when line individually"
    );
  });

  test("verify reviewer checklist gains the additive cite-check line", () => {
    const verify = readT2("prompts/verify.md");
    expect(verify).toContain(
      "Cite-check: spot-check that factual claims in doc-producing tasks carry file:line/URL citations; uncited claims are findings."
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
// Pins the justfile eval recipe, the .workflows/evals whitelist, and the
// Eval kaizen triggers section in agents/execution-doctrine.md.

const JUSTFILE = fs.readFileSync("justfile", "utf8");
const GITIGNORE = fs.readFileSync(".gitignore", "utf8");
const DOCTRINE = fs.readFileSync("agents/execution-doctrine.md", "utf8");

describe("eval wiring + doctrine (T5, plan 20261102-052)", () => {
  test("justfile has a standalone eval recipe running eval-orchestration.mjs", () => {
    const m = JUSTFILE.indexOf("eval:");
    expect(m).toBeGreaterThan(-1);
    const slice = JUSTFILE.slice(m, m + 200);
    expect(slice).toContain("node scripts/eval-orchestration.mjs");
  });

  test("eval recipe is NOT part of the ci recipe (judge costs stay out of CI)", () => {
    const ci = JUSTFILE.slice(JUSTFILE.indexOf("ci:"), JUSTFILE.indexOf("ci-lite:"));
    expect(ci).toContain("./scripts/check-drift.sh");
    expect(ci).not.toContain("eval-orchestration");
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
      "`package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `Gemfile`, `*.csproj`"
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

  test("three boundaries: never delete existing version files, never upgrade runtimes just to enable it, never silently replace another tool manager", () => {
    const slice = devSlice();
    expect(slice).toContain("NEVER delete existing version files");
    expect(slice).toContain("NEVER upgrade runtimes just to enable mise");
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
  const normT9 = (p: string) =>
    fs.readFileSync(p, "utf8").replace(/\s+/g, " ");
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
  const REFACTOR_FIRST =
    "Refactor first: extend existing structure before adding new surface.";
  const SUBTRACT_FIRST =
    "Subtract first: prefer deleting or simplifying over adding.";

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
    expect(slice).toContain("cargo clippy -- -D warnings");
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
  "settings", "model", "thinking", "scoped-models", "login", "logout", "llama",
  "new", "resume", "name", "session", "tree", "fork", "clone", "compact",
  "import", "copy", "export", "share", "bug", "trust", "mcp", "reload",
  "hotkeys", "changelog", "quit",
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
    expect(slice).toContain('check = "bunx eslint ."');
    expect(slice).toContain('verify = "node --test"');
    // the real-commands rule stays explicit
    expect(slice).toContain("never placeholder filler");
    // nothing detectable → `check` is left absent, never invented
    expect(slice).toContain("no linter is detectable");
    expect(slice).toContain("`check` stays ABSENT");
  });

  test("test_init_keeps_existing_stack_examples", () => {
    const slice = initDevEnvironmentSliceT1();
    expect(slice).toContain('check = "bunx tsc --noEmit"');
    expect(slice).toContain('verify = "bun test"');
    expect(slice).toContain('check = "cargo clippy -- -D warnings"');
    expect(slice).toContain('verify = "cargo test"');
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
    const justfile = fs.readFileSync("justfile", "utf8");
    const ci = justfile.slice(
      justfile.indexOf("ci:"),
      justfile.indexOf("ci-lite:"),
    );
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
    const justfile = fs.readFileSync("justfile", "utf8");
    const ci = justfile.slice(
      justfile.indexOf("ci:"),
      justfile.indexOf("ci-lite:"),
    );
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
const readBaseline = (rev: string) =>
  JSON.parse(
    spawnSync("git", ["show", `${rev}:scripts/docs-lint-baseline.json`], {
      encoding: "utf8",
    }).stdout
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
    for (const lead of ["**Do:**", "**Run:**", "**Guard:**", "**Next:**", "**Check:**"])
      expect(v).toContain(lead);
    // work-kind opener maps to its five pills
    expect(v).toContain("Work-kind opener");
    for (const pill of ["[[Implement]]", "[[Investigate]]", "[[Preview]]", "[[Brainstorm]]", "[[Qualify]]"])
      expect(v).toContain(pill);
    // single-source claim: the extension owns pill writing, not this file
    expect(v).toContain("mapping of record");
    expect(v).toContain("pi-emphasis");
    expect(v).toContain("never re-teaches pill writing");
    // hard shape constraints: ≤60 lines, every line ≤80 cols
    const lines = raw.replace(/\n$/, "").split("\n");
    expect(lines.length, `file is ${lines.length} lines (max 60)`).toBeLessThanOrEqual(60);
    for (const [i, line] of lines.entries())
      expect(line.length, `line ${i + 1} is ${line.length} cols (max 80)`).toBeLessThanOrEqual(80);
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
    // Truth-leg reference: BASE_REF (the pre-regen snapshot), never HEAD —
    // see the comment above. Head self-comparison would always read 0 once
    // committed.
    const head = readBaseline(BASE_REF);
    const cur = JSON.parse(
      fs.readFileSync("scripts/docs-lint-baseline.json", "utf8")
    ) as { sections: Record<string, { files?: Record<string, number> }> };
    for (const section of Object.keys(head.sections)) {
      const before = head.sections[section]?.files ?? {};
      const after = cur.sections[section]?.files ?? {};
      for (const [file, n] of Object.entries(after)) {
        const was = before[file];
        if (was === undefined) continue; // new tracked file: addition, not a rise
        expect(
          n,
          `${section} budget for ${file} rose ${was} -> ${n} — new doc debt`
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
        `--write-baseline exited ${first.status}:\n${first.stdout}\n${first.stderr}`
      ).toBe(0);
      fs.cpSync(committed, run1); // run1 = first fresh regen
      const second = regen();
      expect(
        second.status,
        `--write-baseline exited ${second.status}:\n${second.stdout}\n${second.stderr}`
      ).toBe(0);
      const a = fs.readFileSync(run1);
      const b = fs.readFileSync(committed); // run2 = second fresh regen
      expect(
        a.equals(b),
        "two consecutive --write-baseline runs differ — non-deterministic"
      ).toBe(true);
    } finally {
      fs.copyFileSync(snapshot, committed);
      fs.unlinkSync(snapshot);
      fs.unlinkSync(run1);
    }
    // Truth-leg reference: BASE_REF (the pre-regen snapshot), never HEAD —
    // see the comment above. Head self-comparison would always read 0 once
    // committed.
    const head = readBaseline(BASE_REF);
    const cur = JSON.parse(
      fs.readFileSync("scripts/docs-lint-baseline.json", "utf8")
    ) as { sections: Record<string, { files?: Record<string, number> }> };
    let lowered = 0;
    let raised = 0;
    for (const section of Object.keys(head.sections)) {
      const before = head.sections[section]?.files ?? {};
      const after = cur.sections[section]?.files ?? {};
      for (const [file, was] of Object.entries(before)) {
        const now = after[file];
        if (now === undefined) continue;
        if (now < was) lowered += 1;
        if (now > was) raised += 1;
      }
    }
    expect(
      lowered,
      "no pre-existing budget lower than the pre-regen reference — stale budgets not corrected"
    ).toBeGreaterThan(0);
    expect(raised, `${raised} budget(s) rose above the pre-regen reference — new doc debt`).toBe(0);
  }, 600000);

  test("test_baseline_pin_monotone", () => {
    // The generalization proof: no additions-only-vs-HEAD assertion
    // remains in this file; the monotone rule is what the pin enforces.
    // Strings are built by concatenation so this pin cannot match itself.
    const src = fs.readFileSync("tests/prompt-doctrine.test.ts", "utf8");
    expect(src).not.toContain("additions_" + "only");
    expect(src).toContain('test("test_baseline_mono' + 'tone"');
    expect(src).toContain('test("test_baseline_regen' + 'erated_deterministic"');
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
    for (const [name, content] of [
      ["skills/idea/SKILL.md", IDEA_T1],
      ["skills/plan/SKILL.md", PLAN_T1],
      ["skills/add-feature/SKILL.md", ADD_T1],
      ["prompts/prototype.md", PROTO_T1],
    ] as const) {
      expect(content, `${name} lacks the identical sieve gate block`).toContain(
        SIEVE_GATE
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
        "## Sieve Gate"
      );
      expect(content, `${p} must not carry the forced-choice table`).not.toContain(
        "| Cell | Forced choice |"
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
