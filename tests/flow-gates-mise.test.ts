import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { miseTasks, runGate, testQualityCommands } from "../scripts/flow-gates.mjs";

// T10 (plan 20261104-060): executable charter — the test-quality gate runs
// the target repo's mise [tasks] check/verify when defined, skips loudly
// otherwise.

const WITH_TASKS = `# fixture
[tools]
bun = "1.3.0"

[tasks]
check = "bunx tsc --noEmit"
verify = "bun test"
`;
const NO_TASKS = `[tools]
bun = "1.3.0"
`;

function tmpRepo(miseToml) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flow-gates-mise-"));
  fs.writeFileSync(path.join(dir, "mise.toml"), miseToml);
  return dir;
}

describe("flow-gates — mise [tasks] wiring (T10, plan 20261104-060)", () => {
  test("miseTasks parses [tasks] check/verify; returns null when absent or incomplete", () => {
    expect(miseTasks(WITH_TASKS)).toEqual({
      check: "bunx tsc --noEmit",
      verify: "bun test",
    });
    expect(miseTasks(NO_TASKS)).toBeNull();
    expect(miseTasks("[tasks]\ncheck = \"x\"\n")).toBeNull(); // verify missing
  });

  test("testQualityCommands appends mise run check + verify only when mise.toml defines them", () => {
    const withDir = tmpRepo(WITH_TASKS);
    const withoutDir = tmpRepo(NO_TASKS);
    const noFile = fs.mkdtempSync(path.join(os.tmpdir(), "flow-gates-mise-"));
    expect(testQualityCommands(withDir)).toEqual([
      "tdd-gate gaming --diff HEAD",
      "mise run check",
      "mise run verify",
    ]);
    expect(testQualityCommands(withoutDir)).toEqual(["tdd-gate gaming --diff HEAD"]);
    expect(testQualityCommands(noFile)).toEqual(["tdd-gate gaming --diff HEAD"]);
  });

  test("runGate executes the mise tasks; non-zero verify fails the gate with an output excerpt", () => {
    const dir = tmpRepo(WITH_TASKS);
    const ran = [];
    const exec = (cmd) => {
      ran.push(cmd);
      return cmd === "mise run verify"
        ? { status: 1, stdout: "FAIL  tests/x.test.ts" }
        : { status: 0, stdout: "ok" };
    };
    const res = runGate("test-quality", {
      exec,
      present: (b) => b === "tdd-gate" || b === "mise",
      dir,
    });
    expect(ran).toContain("mise run check");
    expect(ran).toContain("mise run verify");
    expect(res.status).toBe("fail");
    expect(res.reason).toContain("mise run verify");
    expect(res.results.at(-1).output).toContain("FAIL");
  });

  test("runGate passes when all commands (incl. mise tasks) exit 0", () => {
    const dir = tmpRepo(WITH_TASKS);
    const res = runGate("test-quality", {
      exec: () => ({ status: 0, stdout: "ok" }),
      present: (b) => b === "tdd-gate" || b === "mise",
      dir,
    });
    expect(res.status).toBe("pass");
  });

  test("mise binary absent but tasks defined → loud skip naming mise; no mise.toml tasks → legacy shape, no mise involvement", () => {
    const dir = tmpRepo(WITH_TASKS);
    const skipped = runGate("test-quality", {
      exec: () => ({ status: 0, stdout: "" }),
      present: (b) => b === "tdd-gate", // mise missing
      dir,
    });
    expect(skipped.status).toBe("skipped");
    expect(skipped.reason).toContain("mise");

    const plain = tmpRepo(NO_TASKS);
    const res = runGate("test-quality", {
      exec: () => ({ status: 0, stdout: "" }),
      present: (b) => b === "tdd-gate",
      dir: plain,
    });
    expect(res.status).toBe("pass");
  });
});
