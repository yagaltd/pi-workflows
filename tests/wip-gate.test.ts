import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const CHECK_DRIFT = path.join(ROOT, "scripts", "check-drift.sh");
const PRECOMMIT = path.join(ROOT, ".githooks", "pre-commit");
const BATCH = "20261122-080/task-1";
const tempDirs: string[] = [];

function fixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wip-gate-"));
  tempDirs.push(dir);
  return dir;
}

function statePath(root: string): string {
  return path.join(root, ".workflows", "wip", `${encodeURIComponent(BATCH)}.json`);
}

function writeState(root: string, state: Record<string, unknown> | string): void {
  const target = statePath(root);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof state === "string" ? state : JSON.stringify(state, null, 2));
}

function validState(status = "ready-to-ship", overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: BATCH,
    kind: "fix",
    scope: ["src/a.ts"],
    root_cause: "stale cache",
    verdict: ".workflows/reviews/task-1.md",
    status,
    created_at: "2026-11-22T00:00:00.000Z",
    task_ids: ["task-1"],
    verified_files: status === "ready-to-ship" ? ["src/a.ts"] : [],
    ...overrides,
  };
}

function drift(root: string) {
  return spawnSync("bash", [CHECK_DRIFT, "--only", "wip", "--root", root], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

function output(result: ReturnType<typeof drift>): string {
  return `${result.stdout}${result.stderr}`;
}

function stage(root: string, relative: string): void {
  expect(spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf8" }).status).toBe(0);
  expect(spawnSync("git", ["add", relative], { cwd: root, encoding: "utf8" }).status).toBe(0);
}

afterEach(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("check-drift WIP section and pre-commit linkage", () => {
  test("test_check_drift_wip_fails_malformed_state", () => {
    const root = fixture();
    writeState(root, "{\"id\": \"batch-1\",");
    const result = drift(root);
    expect(result.status).toBe(1);
    expect(output(result)).toContain("DRIFT");
    expect(output(result)).not.toContain("bad.json");
    expect(output(result)).toContain("%2Ftask-1");
  });

  test("test_check_drift_wip_loud_skip", () => {
    const root = fixture();
    const result = drift(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("skip:");
    expect(result.stdout).toMatch(/WIP/i);
    expect(result.stdout).toMatch(/fresh clone/i);
  });

  test("test_check_drift_wip_fails_out_of_scope_staged_file", () => {
    const root = fixture();
    writeState(root, validState());
    fs.mkdirSync(path.join(root, "secrets"), { recursive: true });
    fs.writeFileSync(path.join(root, "secrets", "keys.ts"), "secret\n");
    stage(root, "secrets/keys.ts");
    const result = drift(root);
    expect(result.status).toBe(1);
    expect(output(result)).toContain("secrets/keys.ts");
  });

  test("test_check_drift_wip_fails_unconsumed_ship_batch", () => {
    const root = fixture();
    writeState(root, validState("ready-to-ship", { verified_files: [] }));
    const result = drift(root);
    expect(result.status).toBe(1);
    expect(output(result)).toMatch(/unconsumed SHIP batch/i);
    expect(output(result)).toMatch(/verified_files/i);
  });

  test("test_precommit_validates_wip_message", () => {
    const hook = fs.readFileSync(PRECOMMIT, "utf8");
    expect(hook).toContain("wip message");
    expect(hook).toContain("--file \"$1\"");
    const messageAt = hook.indexOf("wip message");
    const driftAt = hook.indexOf("exec \"$REPO_ROOT/scripts/check-drift.sh\"");
    expect(messageAt).toBeGreaterThan(-1);
    expect(driftAt).toBeGreaterThan(messageAt);
  });

  test("test_mise_ci_inherits_wip_gate", () => {
    const ci = fs.readFileSync(path.join(ROOT, ".mise", "tasks", "ci"), "utf8");
    expect(ci).toContain("./scripts/check-drift.sh");
    expect(ci).not.toMatch(/\bwip\b/);
    const checker = fs.readFileSync(CHECK_DRIFT, "utf8");
    expect(checker).toContain("wip_gate()");
    expect(checker).toMatch(/wip\) wip_gate; exit "\$FAIL"/);
  });

  test("test_check_drift_wip_fails_awaiting_review", () => {
    const root = fixture();
    writeState(root, validState("awaiting-review"));
    const result = drift(root);
    expect(result.status).toBe(1);
    expect(output(result)).toMatch(/unreviewed|awaiting-review/i);
  });

  test("test_check_drift_wip_ready_clean_tree_passes", () => {
    const root = fixture();
    writeState(root, validState());
    const result = drift(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/clean|verified/i);
  });

  test("test_check_drift_wip_staged_subset_of_verified_files_passes", () => {
    const root = fixture();
    writeState(root, validState());
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export {};\n");
    stage(root, "src/a.ts");
    const result = drift(root);
    expect(result.status).toBe(0);
  });

  test("test_check_drift_wip_shipped_passes", () => {
    const root = fixture();
    writeState(root, validState("shipped"));
    const result = drift(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/shipped/i);
  });
});
