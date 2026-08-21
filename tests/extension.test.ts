import { describe, expect, test } from "bun:test";
import {
  roleBody,
  roleRefs,
  resolveRefs,
  resolveSubagentInput,
  computeHygieneDrift,
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
  test("no drift when markers and verdicts match done count", () => {
    const plan = "✅ task1\n✅ task2\ncontext: updated\ncontext: no changes";
    const reviews = [
      { name: "a.md", content: "## Round 2\n**ok: true**" },
      { name: "b.md", content: "**ok: true**" },
    ];
    const d = computeHygieneDrift(plan, reviews);
    expect(d).toEqual({ missingContextMarkers: 0, missingFinalVerdicts: 0 });
  });
  test("detects missing context markers and verdicts", () => {
    const plan = "✅ task1\n✅ task2"; // 2 done, 0 markers
    const d = computeHygieneDrift(plan, []);
    expect(d.missingContextMarkers).toBe(2);
    expect(d.missingFinalVerdicts).toBe(2);
  });
  test("partial drift", () => {
    const plan = "✅ a\n✅ b\ncontext: updated";
    const reviews = [{ name: "a.md", content: "**ok: true**" }];
    const d = computeHygieneDrift(plan, reviews);
    expect(d.missingContextMarkers).toBe(1);
    expect(d.missingFinalVerdicts).toBe(1);
  });
  test("no done tasks → no drift", () => {
    const d = computeHygieneDrift("⬜ pending", []);
    expect(d.missingContextMarkers).toBe(0);
  });
});
