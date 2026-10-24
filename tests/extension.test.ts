import { describe, expect, test } from "bun:test";
import {
  roleBody,
  resolveRefs,
  resolveSubagentInput,
  computeHygieneDrift,
  isDocsExempt,
  computeDocsDrift,
  parseAdrContracts,
  parseCcCheckList,
  detectSupersedeGaps,
  extractDecisionsSection,
  makeRemindOnce,
} from "../extensions/index";

const WORKER = `# Role: worker

<!-- dispatch note -->
You are a worker. Follow the contract.`;

const WORKER_NOTE_FIRST = `<!-- note first -->
# Role: worker

You are a worker.`;

describe("roleBody", () => {
  test("strips the # Role: header line", () => {
    expect(roleBody(WORKER)).not.toContain("# Role:");
    expect(roleBody(WORKER)).toContain("You are a worker.");
  });
  test("strips the dispatch-note comment AFTER the heading (BH-002: note leaks into prompts)", () => {
    expect(roleBody(WORKER)).not.toContain("dispatch note");
    expect(roleBody(WORKER)).not.toContain("<!--");
  });
  test("strips a note placed before the heading too", () => {
    expect(roleBody(WORKER_NOTE_FIRST)).not.toContain("note first");
    expect(roleBody(WORKER_NOTE_FIRST)).toContain("You are a worker.");
  });
  test("real role file shapes stay clean (all four files)", () => {
    for (const f of ["worker", "scout", "reviewer", "quality-reviewer"]) {
      const fs = require("fs");
      const path = require("path");
      const content = fs.readFileSync(
        path.join(__dirname, "..", "agents", `${f}.md`),
        "utf8"
      );
      const body = roleBody(content);
      expect(body.startsWith("You are")).toBe(true);
      expect(body).not.toContain("<!--");
      expect(body).not.toContain("# Role:");
      expect(body).not.toContain("agents/registry.md"); // stale meta-note must not leak
    }
  });
});

describe("resolveRefs", () => {
  test("substitutes known roles", () => {
    const { text, errors } = resolveRefs("@role:worker", () => WORKER);
    expect(errors).toEqual([]);
    expect(text).toContain("You are a worker.");
    expect(text).not.toContain("@role:");
  });
  test("unknown role: keeps text and reports error", () => {
    const { text, errors } = resolveRefs("@role:ghost", () => null);
    expect(text).toBe("@role:ghost");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("agents/ghost.md");
  });
});

describe("resolveSubagentInput", () => {
  test("rewrites single-mode prompt in place", () => {
    const input: any = { agent: "w", prompt: "@role:worker", task: "do it" };
    const errors = resolveSubagentInput(input, () => WORKER);
    expect(errors).toEqual([]);
    expect(input.prompt).toContain("You are a worker.");
  });
  test("rewrites tasks[] prompts in place", () => {
    const input: any = {
      tasks: [
        { id: "t1", prompt: "@role:worker" },
        { id: "t2", prompt: "plain prompt stays" },
      ],
    };
    const errors = resolveSubagentInput(input, (n) => (n === "worker" ? WORKER : null));
    expect(errors).toEqual([]);
    expect(input.tasks[0].prompt).toContain("You are a worker.");
    expect(input.tasks[1].prompt).toBe("plain prompt stays");
  });
  test("blocks nothing when no refs present", () => {
    const input: any = { agent: "w", prompt: "plain", tasks: [{ prompt: "also plain" }] };
    const before = JSON.stringify(input);
    resolveSubagentInput(input, () => WORKER);
    expect(JSON.stringify(input)).toBe(before);
  });
  test("collects errors for missing role files", () => {
    const input: any = { prompt: "@role:missing" };
    const errors = resolveSubagentInput(input, () => null);
    expect(errors[0]).toContain("agents/missing.md");
  });
});

describe("computeHygieneDrift", () => {
  const DONE = "- **Status**: ✅ DONE";
  test("no drift when markers and verdicts match done count", () => {
    const plan = `### TASK 1\n${DONE}\ncontext: updated\n### TASK 2\n${DONE}\ncontext: no changes`;
    const reviews = [
      { name: "a.md", content: "## Round 2\n**ok: true**" },
      { name: "b.md", content: "**ok: true**" },
    ];
    const d = computeHygieneDrift(plan, reviews);
    expect(d).toEqual({ missingContextMarkers: 0, missingFinalVerdicts: 0 });
  });
  test("detects missing context markers and verdicts", () => {
    const plan = `### TASK 1\n${DONE}\n### TASK 2\n${DONE}`; // 2 done, 0 markers
    const d = computeHygieneDrift(plan, []);
    expect(d.missingContextMarkers).toBe(2);
    expect(d.missingFinalVerdicts).toBe(2);
  });
  test("partial drift", () => {
    const plan = `### TASK 1\n${DONE}\ncontext: updated\n### TASK 2\n${DONE}`;
    const reviews = [{ name: "a.md", content: "**ok: true**" }];
    const d = computeHygieneDrift(plan, reviews);
    expect(d.missingContextMarkers).toBe(1);
    expect(d.missingFinalVerdicts).toBe(1);
  });
  test("no done tasks → no drift", () => {
    const d = computeHygieneDrift("⬜ pending", []);
    expect(d.missingContextMarkers).toBe(0);
  });
  test("emoji in prose (header/notes) does not inflate done count", () => {
    // The real 20260821-001 plan shape: 4 status-line ✅, 3 more ✅ in prose
    const plan = "> Status: IN PROGRESS (all tasks ✅)\n### TASK 1\n- **Status**: ✅ DONE\n### TASK 2\n- **Status**: ✅ DONE\ncontext: updated\ncontext: no changes\nlearnings ✅ here";
    const reviews = [
      { name: "a.md", content: "**ok: true**" },
      { name: "b.md", content: "**ok: true**" },
    ];
    const d = computeHygieneDrift(plan, reviews);
    expect(d.missingContextMarkers).toBe(0);
    expect(d.missingFinalVerdicts).toBe(0);
  });
  test("markers in inline-bullet format count too (real plan shape)", () => {
    // /next closeout appends markers as task bullets:
    // "- **Cost**: ... \n- **context: updated**"
    const plan = "### TASK 1\n- **Status**: ✅ DONE\n- **Cost**: ~$0.5\n- **context: updated**\n### TASK 2\n- **Status**: ✅ DONE\n- **Cost**: ~$0.1\n- **context: no changes**";
    const reviews = [
      { name: "a.md", content: "**ok: true**" },
      { name: "b.md", content: "**ok: true**" },
    ];
    const d = computeHygieneDrift(plan, reviews);
    expect(d.missingContextMarkers).toBe(0);
    expect(d.missingFinalVerdicts).toBe(0);
  });
});

describe("isDocsExempt", () => {
  test("exempts docs artifacts and non-user-facing files", () => {
    for (const f of [
      "README.md",
      "CHANGELOG.md",
      "docs/guide.md",
      ".workflows/plan.md",
      ".github/workflows/ci.yml",
      ".gitignore",
      "LICENSE",
      "package-lock.json",
      "Cargo.lock",
      "assets/logo.png",
      "",
    ]) {
      expect(isDocsExempt(f)).toBe(true);
    }
  });
  test("counts user-facing code", () => {
    for (const f of ["src/store.js", "prompts/next.md", "package.json", "agents/registry.md"]) {
      expect(isDocsExempt(f)).toBe(false);
    }
  });
});

// Fake git: scripted responses keyed by command substring.
function fakeGit(responses: Record<string, string | null>) {
  return (cmd: string): string | null => {
    for (const [needle, out] of Object.entries(responses)) {
      if (cmd.includes(needle)) return out;
    }
    return null;
  };
}

describe("computeDocsDrift", () => {
  const PLAN_ACTIVE = "### TASK 1\n- **Status**: ✅ DONE\n### TASK 2\n- **Status**: ⬜ PENDING";
  const PLAN_COMPLETE = "### TASK 1\n- **Status**: ✅ DONE\n### TASK 2\n- **Status**: ✅ DONE";
  const NO_PLAN = "no statuses here";

  test("README stale when code committed after README's last commit", () => {
    const exec = fakeGit({
      "-- README.md": "abc123",
      "abc123..HEAD": "src/a.js\nsrc/b.js\nREADME.md\ndocs/x.md",
    });
    const d = computeDocsDrift(PLAN_ACTIVE, exec, () => []);
    expect(d.staleReadmeCount).toBe(2); // only src files count
    expect(d.changelogPending).toBe(false);
  });

  test("README fresh when no code changes since its last commit", () => {
    const exec = fakeGit({
      "-- README.md": "abc123",
      "abc123..HEAD": "docs/x.md\nCHANGELOG.md",
    });
    const d = computeDocsDrift(PLAN_ACTIVE, exec, () => []);
    expect(d.staleReadmeCount).toBe(0);
  });

  test("README check inert without done tasks", () => {
    const exec = fakeGit({
      "-- README.md": "abc123",
      "abc123..HEAD": "src/a.js",
    });
    const d = computeDocsDrift(NO_PLAN, exec, () => []);
    expect(d.staleReadmeCount).toBe(0);
  });

  test("no git → zeros, changelogPending still pure", () => {
    const d = computeDocsDrift(PLAN_ACTIVE, () => null, () => []);
    expect(d).toEqual({ staleReadmeCount: 0, staleDocsCount: 0, changelogPending: false });
    const c = computeDocsDrift(PLAN_COMPLETE, () => null, () => []);
    expect(c.changelogPending).toBe(true);
  });

  test("plan complete → changelogPending", () => {
    const exec = fakeGit({ "-- README.md": "abc123", "abc123..HEAD": "" });
    const d = computeDocsDrift(PLAN_COMPLETE, exec, () => []);
    expect(d.changelogPending).toBe(true);
    expect(d.staleReadmeCount).toBe(0);
  });

  test("emoji in prose does not inflate done count (header/notes ✅)", () => {
    const plan = "> Status: IN PROGRESS (all tasks ✅)\n### TASK 1\n- **Status**: ✅ DONE\n### TASK 2\n- **Status**: ⬜ PENDING\nlearnings ✅ somewhere";
    const d = computeDocsDrift(plan, () => null, () => []);
    expect(d.changelogPending).toBe(false); // 1 done ≠ 2 total
  });

  test("docs/ folder stale when code changed since docs' last commit", () => {
    const exec = fakeGit({
      "-- README.md": "abc123",
      "abc123..HEAD": "src/a.js",
      "-- docs": "def456",
      "def456..HEAD": "src/a.js\nsrc/b.js",
    });
    const d = computeDocsDrift(PLAN_ACTIVE, exec, () => ["docs/a.md", "docs/b.md"]);
    expect(d.staleDocsCount).toBe(2);
  });

  test("historical ref override works", () => {
    const exec = fakeGit({
      "ca77c7c -- README.md": "oldreadme",
      "oldreadme..ca77c7c": "prompts/next.md\nagents/registry.md\nREADME.md",
    });
    const d = computeDocsDrift(PLAN_ACTIVE, exec, () => [], "ca77c7c");
    expect(d.staleReadmeCount).toBe(2);
  });
});

describe("supersede watchdog", () => {
  test("parseAdrContracts: keeps only adr:-attributed @cc directives", () => {
    const text = `// @cc [label:watchdog,id:hygiene] no adr here
// @cc [label:watchdog,id:supersede-once,adr:7] adr attributed`;
    expect(parseAdrContracts(text)).toEqual([
      { id: "supersede-once", label: "watchdog", adr: "7", owners: [] },
    ]);
  });

  test("parseCcCheckList: reads adr: from cc-check list blocks", () => {
    const out = `=> CONTRACTS <=\n\n◆ watchdog-once:1\n  scope:directory · label:watchdog · id:watchdog-once · adr:7\n\n◆ plain:9\n  scope:file · label:x · id:plain`;
    expect(parseCcCheckList(out)).toEqual([
      { id: "watchdog-once", label: "watchdog", adr: "7", owners: [] },
    ]);
  });

  test("trigger fires when a changed file carries an adr contract", () => {
    const gaps = detectSupersedeGaps({
      changedFiles: ["extensions/index.ts", "src/other.ts"],
      adrContractsByFile: {
        "extensions/index.ts": [
          { id: "supersede-once", label: "watchdog", adr: "7", owners: [] },
        ],
      },
      changedSpecDecisions: [],
      newAdrFiles: [],
    });
    expect(gaps).toHaveLength(1);
    expect(gaps[0].trigger).toBe("adr-contract-file");
    expect(gaps[0].seam).toContain("extensions/index.ts");
    expect(gaps[0].adr).toBe("7");
  });

  test("no fire without an adr contract or a decisions change", () => {
    const gaps = detectSupersedeGaps({
      changedFiles: ["src/other.ts"],
      adrContractsByFile: {},
      changedSpecDecisions: [],
      newAdrFiles: [],
    });
    expect(gaps).toEqual([]);
  });

  test("trigger fires when a spec's Decisions changed with no new ADR file", () => {
    const gaps = detectSupersedeGaps({
      changedFiles: [],
      adrContractsByFile: {},
      changedSpecDecisions: [".workflows/specs/task-x.spec"],
      newAdrFiles: [],
    });
    expect(gaps).toHaveLength(1);
    expect(gaps[0].trigger).toBe("decisions-changed");
  });

  test("no fire when a new ADR file accompanies the Decisions change", () => {
    const gaps = detectSupersedeGaps({
      changedFiles: ["docs/adr/0007-supersede.md"],
      adrContractsByFile: {},
      changedSpecDecisions: [".workflows/specs/task-x.spec"],
      newAdrFiles: ["docs/adr/0007-supersede.md"],
    });
    expect(gaps).toEqual([]);
  });

  test("extractDecisionsSection reads only the Decisions body", () => {
    const spec = "## Intent\nstuff\n## Decisions\n- A\n- B\n## Boundaries\nnope";
    expect(extractDecisionsSection(spec)).toBe("- A\n- B");
  });

  test("owner parsing: textual fallback extracts owner attributes", () => {
    const contracts = parseAdrContracts(
      "/** @cc [label:watchdog,id:x,owner:alice,adr:7] x\n */"
    );
    expect(contracts).toHaveLength(1);
    expect(contracts[0].owners).toEqual(["alice"]);
  });

  test("owner parsing: multiple owners kept in contract order", () => {
    const contracts = parseAdrContracts(
      "/** @cc [adr:7,id:x,owner:alice,owner:bob,label:y] x\n */"
    );
    expect(contracts[0].owners).toEqual(["alice", "bob"]);
  });

  test("owner parsing: cc-check list path extracts owner attributes", () => {
    const contracts = parseCcCheckList(
      "◆ x:1\n  scope:file · label:y · id:x · owner:carol · adr:7"
    );
    expect(contracts[0].owners).toEqual(["carol"]);
  });

  test("owner parsing: absent owner yields empty list", () => {
    const contracts = parseAdrContracts("/** @cc [adr:7,id:x] x */");
    expect(contracts[0].owners).toEqual([]);
  });

  test("no-spam: makeRemindOnce emits once per new gap, resets on clear", () => {
    const remember = makeRemindOnce();
    expect(remember("gap-a")).toBe(true);
    expect(remember("gap-a")).toBe(false);
    expect(remember("")).toBe(false);
    expect(remember("gap-a")).toBe(true); // new episode after reset
    expect(remember("gap-b")).toBe(true);
    expect(remember("gap-b")).toBe(false);
  });

  test("advisory names owner sign-off target", () => {
    // The line builder is internal (no replacement export, per contract) —
    // assert the built-line template names owners and carries no probability.
    const src = require("fs").readFileSync("extensions/index.ts", "utf8");
    expect(src).toMatch(/sign-off required from \$\{gap\.owners\.join\(/);
    expect(src).not.toMatch(/choiceProbability|toFixed\(2\)|≥ 0\.90/);
  });

  test("generic human gate line when owner absent", () => {
    const src = require("fs").readFileSync("extensions/index.ts", "utf8");
    expect(src).toContain(
      "— static advisory: possible ADR supersession — raise it at the human gate (advisory only)."
    );
  });

  test("supersedeAdvisoryLine export is gone (Jev probability seam removed)", async () => {
    const mod = await import("../extensions/index");
    expect("supersedeAdvisoryLine" in mod).toBe(false);
    expect("SUPERSEDE_PROBABILITY_THRESHOLD" in mod).toBe(false);
  });

  test("advisory line through the watchdog path contains no probability or threshold text", () => {
    // The extension module itself must carry no threshold text.
    const src = require("fs").readFileSync("extensions/index.ts", "utf8");
    expect(src).not.toMatch(/0\.90|choiceProbability/);
  });

  test("threshold constant removed", () => {
    const src = require("fs").readFileSync("extensions/index.ts", "utf8");
    expect(src).not.toContain("SUPERSEDE_PROBABILITY_THRESHOLD");
  });

  test("never a verdict: gaps carry owners so the advisory names sign-off targets", () => {
    const gaps = detectSupersedeGaps({
      changedFiles: ["src/x.ts"],
      adrContractsByFile: {
        "src/x.ts": [{ id: "x", label: "", adr: "7", owners: ["alice", "bob"] }],
      },
      changedSpecDecisions: [],
      newAdrFiles: [],
    });
    expect(gaps[0].owners).toEqual(["alice", "bob"]);
    const serialized = JSON.stringify(gaps);
    expect(serialized).toContain("alice");
    expect(serialized).not.toMatch(/probability|threshold|0\.90/i);
    expect(serialized).not.toMatch(/ok:\s*true/);
  });
});
