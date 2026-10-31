import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gateCommands, runGate } from "../scripts/flow-gates.mjs";

// gateCommands("contract") enumerates .workflows/specs/*.spec relative to cwd,
// but .workflows/* is gitignored — fresh worktrees carry no spec files. The
// suite must hold in ANY checkout state, so assertions run from a temp fixture
// holding one minimal well-formed spec (plan 20261031-047 fix round).
const repoCwd = process.cwd();
let fixtureDir: string;

beforeAll(() => {
  fixtureDir = mkdtempSync(join(tmpdir(), "flowgates-"));
  mkdirSync(join(fixtureDir, ".workflows/specs"), { recursive: true });
  writeFileSync(
    join(fixtureDir, ".workflows/specs/fixture.spec"),
    [
      'spec: task',
      'name: "Flow gates fixture"',
      "tags: [fixture, flow-gates]",
      "---",
      "",
      "## Intent",
      "",
      "Minimal well-formed spec so the contract gate resolves exactly one",
      "per-spec command. Content is never executed by these assertions.",
      "",
      "## Boundaries",
      "",
      "### Allowed Changes",
      "- .workflows/specs/fixture.spec",
      "",
      "## Completion Criteria",
      "",
      "Scenario: per-spec command shape",
      '  Test: gateCommands("contract") returns one guard per spec',
      "  Given the fixture specs dir",
      "  When the contract gate resolves",
      "  Then every command matches the per-spec guard shape",
      "",
    ].join("\n"),
  );
  process.chdir(fixtureDir);
});

afterAll(() => {
  process.chdir(repoCwd);
  rmSync(fixtureDir, { recursive: true, force: true });
});

describe("flow-gates (plan 20261025-022)", () => {
  test("gate names resolve to the existing layer command sets", () => {
    // Per-spec scoping (plan 20261031-047): one guard invocation per spec file.
    const specCmds = gateCommands("contract");
    expect(specCmds.length).toBeGreaterThan(0);
    for (const cmd of specCmds) {
      expect(cmd).toMatch(/^agent-spec guard --spec \.workflows\/specs\/[\w.-]+\.spec --code \.$/);
    }
    expect(specCmds.some((c) => c.includes("--spec-dir"))).toBe(false);
    expect(gateCommands("test-quality")).toEqual(["tdd-gate gaming --diff HEAD"]);
    expect(gateCommands("review")).toEqual(["bash scripts/check-drift.sh", "bash scripts/docs-lint.sh"]);
    expect(gateCommands("quantum")).toBeNull();
  });

  test("gate findings block wave settle", () => {
    const failing = runGate("review", {
      exec: (cmd) => (cmd.includes("check-drift") ? { status: 0, stdout: "CLEAN" } : { status: 1, stdout: "finding: stale stamp" }),
    });
    expect(failing.status).toBe("fail");
    expect(failing.reason).toContain("docs-lint");
    expect(failing.results).toHaveLength(2);
  });

  test("absent toolchains skip loudly", () => {
    const skipped = runGate("test-quality", { present: () => false, exec: () => { throw new Error("must not run"); } });
    expect(skipped.status).toBe("skipped");
    expect(skipped.reason).toContain("toolchain absent: tdd-gate");
    expect(skipped.results).toEqual([]);

    const unknown = runGate("quantum", { exec: () => { throw new Error("must not run"); } });
    expect(unknown.status).toBe("fail");
  });
});
