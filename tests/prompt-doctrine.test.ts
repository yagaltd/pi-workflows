import { describe, expect, test } from "bun:test";
import fs from "node:fs";

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
    expect(rules).toContain("unsafe-checker");
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
    expect(step1).toContain("unsafe-checker");
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
