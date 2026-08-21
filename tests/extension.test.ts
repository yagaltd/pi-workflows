import { describe, expect, test } from "bun:test";
import {
  roleBody,
  roleRefs,
  resolveRefs,
  resolveSubagentInput,
  computeHygieneDrift,
  isDocsExempt,
  computeDocsDrift,
} from "../extensions/index";

const WORKER = `# Role: worker (implements within contract boundaries)

<!-- note -->
You are a worker. Follow the contract.`;

describe("roleBody", () => {
  test("strips the # Role: header line", () => {
    expect(roleBody(WORKER)).not.toContain("# Role:");
    expect(roleBody(WORKER)).toContain("You are a worker.");
  });
});

describe("roleRefs", () => {
  test("finds refs in a string", () => {
    expect(roleRefs("@role:worker")).toEqual(["worker"]);
    expect(roleRefs("no refs here")).toEqual([]);
    expect(roleRefs("@role:quality-reviewer then @role:scout")).toEqual([
      "quality-reviewer",
      "scout",
    ]);
  });
  test("ignores non-strings", () => {
    expect(roleRefs(undefined as any)).toEqual([]);
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
