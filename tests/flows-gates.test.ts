import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, spawnSync, writeFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// specGuardSupport() memoizes its probe per process (plan 20261031-048), so
// PATH-shimmed branches can't coexist in one process. Each probe-aware branch
// assertion runs gateCommands("contract") in a fresh subprocess with its own
// PATH shim (same pattern as tests/extension.test.ts auto-gate tests).
function contractCommandsVia(bin: string | null): { stdout: string; stderr: string } {
  const shim = mkdtempSync(join(tmpdir(), "flowgates-bin-"));
  if (bin) {
    writeFileSync(join(shim, "agent-spec"), bin, { mode: 0o755 });
  }
  try {
    const s = spawnSync("bun", [
      "-e",
      `import { gateCommands } from ${JSON.stringify(join(repoCwd, "scripts/flow-gates.mjs"))};\nconsole.log(JSON.stringify(gateCommands("contract")));`,
    ], {
      cwd: fixtureDir,
      env: { ...process.env, PATH: `${shim}:${process.env.PATH}` },
      encoding: "utf8",
    });
    return { stdout: s.stdout ?? "", stderr: s.stderr ?? "" };
  } finally {
    rmSync(shim, { recursive: true, force: true });
  }
}

// Fake agent-spec whose `guard --help` prints `--spec ` → probe says supported.
const AGENT_SPEC_WITH_SPEC_FLAG = `#!/bin/sh
case "$1 $2" in
  "guard --help") echo "Usage: agent-spec guard [--spec <SPEC>] [--spec-dir <DIR>]"; exit 0 ;;
esac
exit 0
`;

// Fake agent-spec whose help exits 0 WITHOUT `--spec ` (0.2.7 shape) → probe
// says unsupported → loud aggregate degradation.
const AGENT_SPEC_WITHOUT_SPEC_FLAG = `#!/bin/sh
case "$1 $2" in
  "guard --help") echo "Usage: agent-spec guard [--spec-dir <SPEC_DIR>]"; exit 0 ;;
esac
exit 0
`;
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
    expect(gateCommands("test-quality")).toEqual(["tdd-gate gaming --diff HEAD"]);
    expect(gateCommands("review")).toEqual(["bash scripts/check-drift.sh", "bash scripts/docs-lint.sh"]);
    expect(gateCommands("quantum")).toBeNull();
  });

  test("contract gate runs per-spec when agent-spec supports --spec (plan 20261031-047)", () => {
    const { stdout, stderr } = contractCommandsVia(AGENT_SPEC_WITH_SPEC_FLAG);
    const specCmds: string[] = JSON.parse(stdout);
    expect(specCmds.length).toBeGreaterThan(0);
    // One guard invocation per spec file (per-spec scoping).
    for (const cmd of specCmds) {
      expect(cmd).toMatch(/^agent-spec guard --spec \.workflows\/specs\/[\w.-]+\.spec --code \.$/);
    }
    // Aggregate form must NOT appear in the supported branch.
    expect(specCmds.some((c) => c.includes("--spec-dir"))).toBe(false);
    expect(stderr).not.toContain("--spec-dir form");
  });

  test("contract gate degrades LOUDLY to aggregate when --spec is unsupported (plan 20261031-048)", () => {
    const { stdout, stderr } = contractCommandsVia(AGENT_SPEC_WITHOUT_SPEC_FLAG);
    const specCmds: string[] = JSON.parse(stdout);
    // Exactly one aggregate guard over the whole specs dir.
    expect(specCmds).toEqual(["agent-spec guard --spec-dir .workflows/specs --code ."]);
    // The degradation is loud, never silent: a stderr warning names the cost.
    expect(stderr).toContain("agent-spec lacks --spec");
    expect(stderr).toContain("--spec-dir form");
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
