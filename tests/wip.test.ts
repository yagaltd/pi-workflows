import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const WIP = path.join(ROOT, "scripts", "wip.mjs");
const BATCH = "20261122-080/task-1";
const MULTI_BATCH = "20261122-080/task-1+task-2";
const CREATED_AT = "2026-11-22T00:00:00.000Z";
const COARSE_CREATED_AT = "2026-01-01T00:00:00.500Z";
const COARSE_MTIME = "2026-01-01T00:00:00.000Z";
const STALE_CREATED_AT = "2026-01-01T00:01:00.000Z";
const tempDirs: string[] = [];

function fixtureRepo(files: Record<string, string> = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wip-test-"));
  tempDirs.push(dir);
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(dir, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return dir;
}

function wip(args: string[], stdin?: string) {
  return spawnSync(process.execPath, [WIP, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    input: stdin,
  });
}

function json(result: ReturnType<typeof wip>): Record<string, any> {
  return JSON.parse(result.stdout) as Record<string, any>;
}

function statePath(repo: string, id: string): string {
  return path.join(repo, ".workflows", "wip", `${encodeURIComponent(id)}.json`);
}

function baseState(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const suffix = id.slice(id.indexOf("/") + 1);
  return {
    id,
    kind: "fix",
    scope: ["src/a.ts", "tests/a.test.ts"],
    root_cause: "stale cache",
    verdict: null,
    status: "awaiting-review",
    created_at: CREATED_AT,
    task_ids: suffix.split(/[+,]/),
    verified_files: [],
    ...overrides,
  };
}

function writeState(repo: string, id: string, overrides: Record<string, unknown> = {}): void {
  const target = statePath(repo, id);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(baseState(id, overrides), null, 2)}\n`);
}

function readState(repo: string, id: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(statePath(repo, id), "utf8"));
}

function writeVerdict(repo: string, body: string, name = "task-1.md"): string {
  const target = path.join(repo, ".workflows", "reviews", name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body);
  return path.relative(repo, target);
}

function setVerdictMtime(repo: string, verdict: string, iso: string): void {
  const ms = Date.parse(iso);
  const target = path.join(repo, verdict);
  fs.utimesSync(target, ms / 1000, ms / 1000);
  expect(fs.statSync(target).mtimeMs).toBe(ms);
}

function start(repo: string, id: string, extra: string[] = []) {
  return wip([
    "start",
    "--repo",
    repo,
    "--id",
    id,
    "--kind",
    "fix",
    "--scope",
    "src/a.ts,tests/a.test.ts",
    "--root-cause",
    "stale cache",
    ...extra,
  ]);
}

function ready(repo: string, id: string, verdict: string) {
  return wip(["ready", "--repo", repo, "--id", id, "--verdict", verdict]);
}

function verify(repo: string, scopeFile: string, id?: string) {
  const args = ["verify", "--repo", repo, "--scope-file", scopeFile];
  if (id) args.push("--id", id);
  return wip(args);
}

afterEach(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("wip state CLI", () => {
  test("test_wip_start_writes_state_file", () => {
    const repo = fixtureRepo({ ".gitignore": ".workflows/*\n" });
    const result = start(repo, BATCH);
    expect(result.status).toBe(0);
    expect(fs.existsSync(statePath(repo, BATCH))).toBe(true);
    const state = readState(repo, BATCH);
    expect(Object.keys(state).sort()).toEqual(
      [
        "created_at",
        "id",
        "kind",
        "root_cause",
        "scope",
        "status",
        "task_ids",
        "verdict",
        "verified_files",
      ].sort(),
    );
    expect(state.id).toBe(BATCH);
    expect(state.task_ids).toEqual(["task-1"]);
    expect(state.scope).toEqual(["src/a.ts", "tests/a.test.ts"]);
    expect(state.status).toBe("awaiting-review");
    expect(state.verdict).toBeNull();
    expect(state.verified_files).toEqual([]);
  });

  test("test_wip_status_reports_active_batch", () => {
    const repo = fixtureRepo();
    writeState(repo, BATCH);
    const result = wip(["status", "--repo", repo]);
    expect(result.status).toBe(0);
    expect(json(result)).toMatchObject({ ok: true, active: true, batch: BATCH, id: BATCH });
  });

  test("test_wip_verify_blocks_missing_verdict", () => {
    const repo = fixtureRepo({ "changed.txt": "src/a.ts\n" });
    writeState(repo, BATCH, { status: "ready-to-ship", verdict: ".workflows/reviews/missing.md" });
    const result = verify(repo, path.join(repo, "changed.txt"));
    expect(result.status).toBe(1);
    expect(json(result)).toMatchObject({ ok: false });
    expect(String(json(result).reason)).toContain("verdict");
  });

  test("test_wip_verify_blocks_out_of_scope", () => {
    const repo = fixtureRepo({ "changed.txt": "src/a.ts\nsecrets/keys.ts\n" });
    const verdict = writeVerdict(repo, "- Verdict: **ok: true** — final\n");
    writeState(repo, BATCH, { status: "ready-to-ship", verdict });
    const result = verify(repo, path.join(repo, "changed.txt"));
    expect(result.status).toBe(1);
    expect(json(result)).toMatchObject({ ok: false });
    expect(String(json(result).reason)).toContain("secrets/keys.ts");
  });

  test("test_wip_message_validates_trailers", () => {
    const repo = fixtureRepo();
    writeState(repo, BATCH);
    const valid = wip(
      ["message", "--repo", repo],
      `fix: cache\n\nWIP-Batch: ${BATCH}\nWIP-Scope: src/a.ts, tests/a.test.ts\n`,
    );
    expect(valid.status).toBe(0);
    expect(json(valid)).toMatchObject({
      ok: true,
      batch: BATCH,
      scope: ["src/a.ts", "tests/a.test.ts"],
    });

    const malformed = wip(
      ["message", "--repo", repo],
      "fix: cache\n\nWIP-Batch: ../escape\nWIP-Scope: \n",
    );
    expect(malformed.status).toBe(1);
    expect(json(malformed)).toMatchObject({ ok: false });
    expect(String(json(malformed).reason)).toContain("WIP-Batch");
  });

  test("test_wip_launcher_and_mise_task", () => {
    const launcher = fs.readFileSync(path.join(ROOT, "scripts", "wf.sh"), "utf8");
    expect(launcher).toMatch(/\bwip\)\s+exec\s+node\s+"\$root\/scripts\/wip\.mjs"/);
    const taskPath = path.join(ROOT, ".mise", "tasks", "wip");
    expect(fs.existsSync(taskPath)).toBe(true);
    expect(fs.statSync(taskPath).mode & 0o111).not.toBe(0);
    const task = fs.readFileSync(taskPath, "utf8");
    expect(task).toContain("scripts/wf.sh wip \"$@\"");
    expect(fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8")).toContain("!.workflows/wip/");
  });

  test("test_wip_start_parses_multi_task_ids", () => {
    const repo = fixtureRepo();
    const result = start(repo, MULTI_BATCH);
    expect(result.status).toBe(0);
    expect(readState(repo, MULTI_BATCH).task_ids).toEqual(["task-1", "task-2"]);
  });

  test("test_wip_start_refuses_second_active_batch", () => {
    const repo = fixtureRepo();
    expect(start(repo, BATCH).status).toBe(0);
    const second = start(repo, "20261122-080/task-2");
    expect(second.status).toBe(1);
    expect(String(json(second).reason)).toMatch(/active/i);
    expect(fs.existsSync(statePath(repo, "20261122-080/task-2"))).toBe(false);
  });

  test("test_wip_ready_accepts_bullet_verdict", () => {
    const repo = fixtureRepo();
    expect(start(repo, BATCH).status).toBe(0);
    const verdict = writeVerdict(repo, "- Verdict: **ok: true** — final\n");
    const result = ready(repo, BATCH, verdict);
    expect(result.status).toBe(0);
    expect(readState(repo, BATCH)).toMatchObject({ status: "ready-to-ship", verdict });
  });

  test("test_wip_ready_accepts_standalone_verdict", () => {
    const repo = fixtureRepo();
    expect(start(repo, BATCH).status).toBe(0);
    const verdict = writeVerdict(repo, "## Verdict\n\n**ok: true**\n");
    expect(ready(repo, BATCH, verdict).status).toBe(0);
  });

  test("test_wip_ready_accepts_coarse_mtime_in_same_second_as_created_at", () => {
    const repo = fixtureRepo();
    expect(start(repo, BATCH, ["--created-at", COARSE_CREATED_AT]).status).toBe(0);
    const verdict = writeVerdict(repo, "- Verdict: **ok: true** — final\n");
    setVerdictMtime(repo, verdict, COARSE_MTIME);
    const result = ready(repo, BATCH, verdict);
    expect(result.status).toBe(0);
    expect(readState(repo, BATCH)).toMatchObject({ status: "ready-to-ship", verdict });
  });

  test("test_wip_ready_requires_every_task_id_in_one_file", () => {
    const repo = fixtureRepo();
    expect(start(repo, MULTI_BATCH).status).toBe(0);
    const verdict = writeVerdict(
      repo,
      "### task-1\n- Verdict: **ok: true** — final\n### task-2\n- Verdict: **ok: true** — final\n",
      "plan-080.md",
    );
    expect(ready(repo, MULTI_BATCH, verdict).status).toBe(0);

    const partial = fixtureRepo();
    expect(start(partial, MULTI_BATCH).status).toBe(0);
    const partialVerdict = writeVerdict(partial, "- Verdict: **ok: true** — task-1\n", "plan-080.md");
    const result = ready(partial, MULTI_BATCH, partialVerdict);
    expect(result.status).toBe(1);
    expect(String(json(result).reason)).toContain("task-2");
  });

  test("test_wip_rejects_stale_verdict", () => {
    const repo = fixtureRepo();
    const verdict = writeVerdict(repo, "- Verdict: **ok: true** — final\n");
    setVerdictMtime(repo, verdict, COARSE_MTIME);
    expect(start(repo, BATCH, ["--created-at", STALE_CREATED_AT]).status).toBe(0);
    const result = ready(repo, BATCH, verdict);
    expect(result.status).toBe(1);
    expect(String(json(result).reason)).toMatch(/stale|older/i);
  });

  test("test_wip_verify_requires_ready_to_ship", () => {
    const repo = fixtureRepo({ "changed.txt": "src/a.ts\n" });
    const verdict = writeVerdict(repo, "- Verdict: **ok: true** — final\n");
    writeState(repo, BATCH, { verdict });
    const verifyResult = verify(repo, path.join(repo, "changed.txt"));
    expect(verifyResult.status).toBe(1);
    expect(String(json(verifyResult).reason)).toMatch(/ready-to-ship/i);

    const shipResult = wip(["ship", "--repo", repo, "--id", BATCH]);
    expect(shipResult.status).toBe(1);
    expect(String(json(shipResult).reason)).toMatch(/ready-to-ship/i);
  });

  test("test_wip_verify_records_verified_files", () => {
    const repo = fixtureRepo({ "changed.txt": "tests/a.test.ts\nsrc/a.ts\n" });
    const verdict = writeVerdict(repo, "- Verdict: **ok: true** — final\n");
    writeState(repo, BATCH, { status: "ready-to-ship", verdict });
    const result = verify(repo, path.join(repo, "changed.txt"));
    expect(result.status).toBe(0);
    expect(json(result).verified_files).toEqual(["tests/a.test.ts", "src/a.ts"]);
    expect(readState(repo, BATCH).verified_files).toEqual(["tests/a.test.ts", "src/a.ts"]);
    expect(wip(["ship", "--repo", repo, "--id", BATCH]).status).toBe(0);
  });

  test("test_wip_ship_requires_verified_files", () => {
    const repo = fixtureRepo();
    const verdict = writeVerdict(repo, "- Verdict: **ok: true** — final\n");
    writeState(repo, BATCH, { status: "ready-to-ship", verdict });
    const result = wip(["ship", "--repo", repo, "--id", BATCH]);
    expect(result.status).toBe(1);
    expect(String(json(result).reason)).toMatch(/verified_files/i);
    expect(readState(repo, BATCH).status).toBe("ready-to-ship");
  });

  test("test_wip_verify_uses_only_bound_verdict", () => {
    const repo = fixtureRepo({ "changed.txt": "src/a.ts\n" });
    writeVerdict(repo, "- Verdict: **ok: true** — final\n", "task-1.md");
    const bound = writeVerdict(repo, "- Verdict: **ok: false** — final\n", "bound.md");
    writeState(repo, BATCH, { status: "ready-to-ship", verdict: bound });
    const result = verify(repo, path.join(repo, "changed.txt"));
    expect(result.status).toBe(1);
    expect(String(json(result).reason)).toContain("task-1");
  });

  test("test_wip_message_requires_matching_active_batch", () => {
    const repo = fixtureRepo();
    writeState(repo, BATCH);
    const wrongBatch = wip(["message", "--repo", repo], `fix: cache\n\nWIP-Batch: ${MULTI_BATCH}\n`);
    expect(wrongBatch.status).toBe(1);
    expect(String(json(wrongBatch).reason)).toMatch(/active|match/i);

    writeState(repo, BATCH, { status: "shipped" });
    const shipped = wip(["message", "--repo", repo], `fix: cache\n\nWIP-Batch: ${BATCH}\n`);
    expect(shipped.status).toBe(1);
    expect(String(json(shipped).reason)).toMatch(/active|shipped/i);
  });
});
