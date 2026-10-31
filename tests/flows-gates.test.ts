import { describe, expect, test } from "bun:test";
import { gateCommands, runGate } from "../scripts/flow-gates.mjs";

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
