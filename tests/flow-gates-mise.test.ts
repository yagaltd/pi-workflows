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

const ROOT = path.resolve(import.meta.dir, "..");

function tmpRepo(miseToml) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flow-gates-mise-"));
  fs.writeFileSync(path.join(dir, "mise.toml"), miseToml);
  return dir;
}

// Plan 20261124-081 TASK 3: the generated Rust check is the flat one-line
// double-quoted assignment in the init doctrine. The flow-gates parser is
// deliberately minimal; this test pins that no multiline/table syntax creeps
// into the generated task.
function generatedRustCheck() {
  const source = fs.readFileSync(path.join(ROOT, "skills", "init", "SKILL.md"), "utf8");
  const match = source.match(/check = "([^"\n]*cargo metadata[^"\n]*)"/);
  if (!match) throw new Error("generated Rust check line is missing");
  return match[1];
}

const CARGO_STUB = `#!/bin/bash
case "$1" in
  metadata|tree) exit 0 ;;
  clippy)
    if [ "\${FAIL_CLIPPY:-0}" = "1" ]; then
      echo "clippy: structural finding" >&2
      exit 1
    fi
    ;;
esac
exit 0
`;

const DESLOP_STUB = `#!/bin/bash
if [ "\${FAIL_DESLOP:-0}" = "1" ]; then
  echo "deslop-please: structural finding" >&2
  exit 1
fi
exit 0
`;

function runGeneratedCheck(check, env) {
  return Bun.spawnSync(["/bin/bash", "-c", check], {
    cwd: ROOT,
    env,
  });
}

function textOf(stream) {
  return stream ? String(stream) : "";
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
      "tdd-guard lint",
      "mise run check",
      "mise run verify",
    ]);
    expect(testQualityCommands(withoutDir)).toEqual(["tdd-guard lint"]);
    expect(testQualityCommands(noFile)).toEqual(["tdd-guard lint"]);
    // The dead binary never comes back through this emitter (DEC-003).
    expect(testQualityCommands(withDir).some((c) => c.startsWith("tdd-gate"))).toBe(false);
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
      present: (b) => b === "tdd-guard" || b === "mise",
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
      present: (b) => b === "tdd-guard" || b === "mise",
      dir,
    });
    expect(res.status).toBe("pass");
  });

  test(
    "mise binary absent but tasks defined → loud skip naming mise; no mise.toml tasks → legacy shape, no mise involvement",
    () => {
      const dir = tmpRepo(WITH_TASKS);
      const skipped = runGate("test-quality", {
        exec: () => ({ status: 0, stdout: "" }),
        present: (b) => b === "tdd-guard", // mise missing
        dir,
      });
      expect(skipped.status).toBe("skipped");
      expect(skipped.reason).toContain("mise");

      const plain = tmpRepo(NO_TASKS);
      const res = runGate("test-quality", {
        exec: () => ({ status: 0, stdout: "" }),
        present: (b) => b === "tdd-guard",
        dir: plain,
      });
      expect(res.status).toBe("pass");

      // Absent tdd-guard is a loud skip naming the binary, never a pass.
      const noTddGuard = runGate("test-quality", {
        exec: () => ({ status: 0, stdout: "" }),
        present: (b) => b === "mise",
        dir,
      });
      expect(noTddGuard.status).toBe("skipped");
      expect(noTddGuard.reason).toContain("toolchain absent: tdd-guard");
      expect(noTddGuard.reason).toContain("never a pass");
    },
    30_000,
  );
});

describe("flow-gates — generated Rust check (plan 20261124-081 TASK 3)", () => {
  test("test_generated_rust_check_parse", () => {
    const check = generatedRustCheck();
    const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
    const documented = readme.match(/check = "([^"\n]*cargo metadata[^"\n]*)"/)?.[1];
    expect(documented, "README must show the flat generated Rust check line").toBe(check);
    expect(check).not.toContain("\n");
    const rustToml = `[tasks]\ncheck = "${check}"\nverify = "cargo test"\n`;
    expect(miseTasks(rustToml)).toEqual({ check, verify: "cargo test" });
    // test-quality gate reaches both generated tasks through the same parser
    const dir = tmpRepo(rustToml);
    expect(testQualityCommands(dir)).toEqual([
      "tdd-guard lint",
      "mise run check",
      "mise run verify",
    ]);
  });

  test("test_generated_rust_check_loud_skip", () => {
    const check = generatedRustCheck();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rust-check-env-"));
    const bin = path.join(dir, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "cargo"), CARGO_STUB, { mode: 0o755 });
    // Isolated PATH: cargo-deny, deslop-please and rust-analyzer are absent,
    // while cargo (the mandatory tool) is present and succeeds.
    const env = { PATH: bin, HOME: dir };
    const analyzer = Bun.spawnSync(["/bin/bash", "-c", "command -v rust-analyzer"], { env });
    expect(analyzer.exitCode).not.toBe(0);

    const clean = runGeneratedCheck(check, env);
    const stderr = textOf(clean.stderr);
    expect(clean.exitCode, `check failed: ${stderr}`).toBe(0);
    expect(stderr).toMatch(/\bSKIP\b[^\n]*cargo-deny[^\n]*install/i);
    expect(stderr).toMatch(/\bSKIP\b[^\n]*deslop-please[^\n]*install/i);

    // An installed tool with findings still fails the chain with exit 1.
    const finding = runGeneratedCheck(check, { ...env, FAIL_CLIPPY: "1" });
    expect(finding.exitCode).toBe(1);
    expect(textOf(finding.stderr)).toContain("clippy: structural finding");

    fs.writeFileSync(path.join(bin, "deslop-please"), DESLOP_STUB, { mode: 0o755 });
    const deslopFinding = runGeneratedCheck(check, { ...env, FAIL_DESLOP: "1" });
    expect(deslopFinding.exitCode).toBe(1);
    expect(textOf(deslopFinding.stderr)).toContain("deslop-please: structural finding");
  });
});

/* ── plan 081 TASK 4: no impossible allow file; bootstrap Cargo.lock ──
 * The stubs below model the real tool contract instead of hiding it: a
 * --locked command fails when Cargo.lock is absent, and the deslop-please
 * stub records its argv without creating any allow file. */
describe("flow-gates — generated Rust check integration (plan 20261124-081 TASK 4)", () => {
  const CARGO_LOCK_AWARE_STUB = `#!/bin/bash
printf '%s\n' "$*" >> "$CARGO_LOG"
case "$1" in
  metadata|tree|clippy)
    if [[ "$*" == *--locked* && ! -f Cargo.lock ]]; then
      echo "error: --locked needs Cargo.lock (missing)" >&2
      exit 101
    fi
    if [[ "$1" == metadata && "$*" != *--locked* ]]; then
      [ -f Cargo.lock ] || printf '# bootstrapped by cargo metadata\n' > Cargo.lock
    fi
    ;;
esac
exit 0
`;

  const DESLOP_ARGV_STUB = `#!/bin/bash
# Log the executable with its arguments: a zero-argument call is still a call.
printf 'deslop-please %s\n' "$*" >> "$DESLOP_LOG"
exit 0
`;

  function freshRustWorkspace(withLock: boolean) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rust-integration-"));
    const bin = path.join(dir, "bin");
    fs.mkdirSync(bin);
    fs.writeFileSync(path.join(bin, "cargo"), CARGO_LOCK_AWARE_STUB, { mode: 0o755 });
    fs.writeFileSync(
      path.join(dir, "Cargo.toml"),
      "[package]\nname = \"fresh-workspace\"\nversion = \"0.1.0\"\n",
    );
    if (withLock) {
      fs.writeFileSync(path.join(dir, "Cargo.lock"), "# owner-managed lock\n");
    }
    return { dir, bin, cargoLog: path.join(dir, "cargo.log") };
  }

  function runIn(check: string, dir: string, bin: string, extras: Record<string, string> = {}) {
    return Bun.spawnSync(["/bin/bash", "-c", check], {
      cwd: dir,
      env: {
        PATH: `${bin}:/usr/bin:/bin`,
        HOME: dir,
        CARGO_LOG: path.join(dir, "cargo.log"),
        ...extras,
      },
    });
  }

  test("test_deslop_no_missing_allow", () => {
    const check = generatedRustCheck();
    const { dir, bin } = freshRustWorkspace(true); // lockfile exists; allow file does not
    const deslopLog = path.join(dir, "deslop.argv");
    fs.writeFileSync(path.join(bin, "deslop-please"), DESLOP_ARGV_STUB, { mode: 0o755 });
    expect(fs.existsSync(path.join(dir, ".deslop-please.allow"))).toBe(false);

    const run = runIn(check, dir, bin, { DESLOP_LOG: deslopLog });
    expect(run.exitCode, `check failed: ${textOf(run.stderr)}`).toBe(0);

    const argv = fs.existsSync(deslopLog)
      ? fs.readFileSync(deslopLog, "utf8").trim()
      : "";
    expect(argv, "an installed deslop-please must actually run").not.toBe("");
    expect(argv, "the real CLI takes no arguments when no allow list is declared").toBe(
      "deslop-please",
    );
    // No owner-managed allow file exists here: the check must not point a
    // --allow flag at a file that is not there (and must not invent one).
    expect(argv).not.toMatch(/--allow(?:[=\s]|$)/);
    expect(argv).not.toContain(".deslop-please.allow");
    expect(fs.existsSync(path.join(dir, ".deslop-please.allow"))).toBe(false);
  });

  test("test_cargo_lock_bootstrap", () => {
    const check = generatedRustCheck();
    const { dir, bin, cargoLog } = freshRustWorkspace(false);
    expect(fs.existsSync(path.join(dir, "Cargo.lock"))).toBe(false);

    const run = runIn(check, dir, bin);
    const stderr = textOf(run.stderr);
    expect(run.exitCode, `fresh workspace check failed: ${stderr}`).toBe(0);
    expect(fs.existsSync(path.join(dir, "Cargo.lock"))).toBe(true);

    const commands = fs.readFileSync(cargoLog, "utf8").trim().split("\n");
    expect(commands.length).toBeGreaterThan(1);
    expect(commands[0], "a non-locked cargo metadata must bootstrap the lock first").toMatch(
      /^metadata\b/,
    );
    expect(commands[0]).not.toContain("--locked");
    const firstLocked = commands.findIndex((line) => line.includes("--locked"));
    expect(firstLocked, "a --locked command must follow the bootstrap").toBeGreaterThan(0);
  });
});
