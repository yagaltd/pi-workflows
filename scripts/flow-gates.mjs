// flow-gates — resolve flow gate names to the repo's existing command sets
// (plan 20261025-022, D4). Gates are reused, never rebuilt:
//   contract     → agent-spec guard   (the agent-spec mechanical checks)
//   test-quality → tdd-gate gaming    (the test-quality checks over the diff)
//   review       → check-drift + docs-lint (the repo-wide guards /review runs)
//   evidence     → proof-ledger verdict (independence + replayable-kind rules
//                  ported from kwant: src/server/missions/mod.rs:359, foundry.rs:636 —
//                  the verdict functions themselves live in T1's proof-ledger.mjs,
//                  imported here, never re-implemented)
// Absent toolchain ⇒ loud `skipped` with the binary named — never a silent pass.
// No matching proofs for the evidence gate ⇒ loud fail ("not_checked").

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readProofs, evidenceVerdict } from "./proof-ledger.mjs";

const PROOF_LEDGER = ".workflows/proofs/proofs.jsonl";

// evidence gate (plan 20261031-048): reads the task's recorded proof rows and
// computes the verdict via proof-ledger's pure evidenceVerdict("worker", ...).
// Owner is "worker" — the dispatcher-recorded author. Rows are scoped to the
// task's plan AND id (BUG-2 fix): a plan-NEW task never borrows plan-OLD rows
// from the shared ledger. Empty/missing rows fail loudly with "not_checked":
// never a silent pass.
export function evidenceGate(taskId, { ledger = PROOF_LEDGER, planId } = {}) {
  if (!taskId) {
    return { status: "fail", reason: "evidence: not_checked — no taskId given for the evidence gate", results: [] };
  }
  const rows = readProofs(ledger).filter((r) => r.taskId === taskId && r.planId === planId);
  if (rows.length === 0) {
    return { status: "fail", reason: `evidence: not_checked — no proofs recorded for task ${taskId}${planId ? ` under plan ${planId}` : ""}`, results: [] };
  }
  const checks = rows.map((row) => ({
    runner: row.runner ?? "worker",
    status: row.exit === 0 ? "passed" : "failed",
    replayable: row.replayable !== false,
  }));
  const verdict = evidenceVerdict("worker", checks);
  if (verdict === "passed") return { status: "pass", reason: null, results: checks };
  if (verdict === "not_independent") {
    return { status: "fail", reason: `evidence: not_independent — task ${taskId} has no independent replayable proof (owner-run only)`, results: checks };
  }
  if (verdict === "not_checked") {
    return { status: "fail", reason: `evidence: not_checked — task ${taskId} has no counted proofs`, results: checks };
  }
  const bad = rows.find((row, i) => checks[i].status !== "passed" || checks[i].replayable === false);
  return { status: "fail", reason: `evidence: failed — task ${taskId} failing proof: ${bad?.command ?? "(unknown)"}`, results: checks };
}

export function gateCommands(name) {
  switch (name) {
    // Per-spec scoping - plan 20261031-047: guard each spec file individually so
    // in-scope files are not failed by other tasks' skipped lifecycle verdicts.
    // Any failing spec fails the gate; outputs incl. skip verdicts are kept.
    case "contract": return listSpecs()
      .map((f) => `agent-spec guard --spec ${f} --code .`);
    case "test-quality": return ["tdd-gate gaming --diff HEAD"];
    case "review": return ["bash scripts/check-drift.sh", "bash scripts/docs-lint.sh"];
    case "evidence": return []; // handled by evidenceGate in runGate — no shell commands
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

export function runGate(name, { exec = (cmd) => spawnSync("bash", ["-c", cmd], { encoding: "utf8" }), present, taskId, task, ledger, planId } = {}) {
  if (name === "evidence") return evidenceGate(taskId ?? task, { ledger, planId });
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
