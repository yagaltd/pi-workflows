// flow-gates — resolve flow gate names to the repo's existing command sets
// (plan 20261025-022, D4). Gates are reused, never rebuilt:
//   contract     → agent-spec guard   (the agent-spec mechanical checks)
//   test-quality → tdd-gate gaming    (the test-quality checks over the diff)
//   review       → check-drift + docs-lint (the repo-wide guards /review runs)
// Absent toolchain ⇒ loud `skipped` with the binary named — never a silent pass.

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";

export function gateCommands(name) {
  switch (name) {
    // Per-spec scoping - plan 20261031-047: guard each spec file individually so
    // in-scope files are not failed by other tasks' skipped lifecycle verdicts.
    // Any failing spec fails the gate; outputs incl. skip verdicts are kept.
    case "contract": return listSpecs()
      .map((f) => `agent-spec guard --spec ${f} --code .`);
    case "test-quality": return ["tdd-gate gaming --diff HEAD"];
    case "review": return ["bash scripts/check-drift.sh", "bash scripts/docs-lint.sh"];
    default: return null;
  }
}

// Missing spec dir is loud, not silent: guard fails on the nonexistent --spec path.
function listSpecs() {
  try {
    return readdirSync(".workflows/specs")
      .filter((f) => f.endsWith(".spec"))
      .sort()
      .map((f) => join(".workflows/specs", f));
  } catch {
    return [".workflows/specs"];
  }
}

const firstToken = (cmd) => cmd.split(/\s+/)[0];

export function runGate(name, { exec = (cmd) => spawnSync("bash", ["-c", cmd], { encoding: "utf8" }), present } = {}) {
  const commands = gateCommands(name);
  if (!commands) return { status: "fail", reason: `unknown gate: ${name}`, results: [] };

  const bin = firstToken(commands[0]);
  const here = present ?? ((b) => b === "bash" || spawnSync("bash", ["-c", `command -v ${b}`]).status === 0);
  if (!here(bin)) {
    return { status: "skipped", reason: `toolchain absent: ${bin}`, results: [] };
  }

  const results = [];
  for (const command of commands) {
    const s = exec(command);
    results.push({ command, exit: s.status ?? 1, output: (s.stdout ?? "").slice(-400) });
    if ((s.status ?? 1) !== 0) {
      return { status: "fail", reason: `gate "${name}" failed at: ${command}`, results };
    }
  }
  return { status: "pass", results };
}
