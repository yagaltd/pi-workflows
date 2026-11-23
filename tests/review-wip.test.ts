import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const SKILL = path.join(ROOT, "skills", "review", "SKILL.md");
const WIP = path.join(ROOT, "scripts", "wip.mjs");
const BATCH = "20261122-080/task-1";
const CREATED_AT = "2026-11-22T00:00:00.000Z";
const tempDirs: string[] = [];

function stage3(): string {
  const text = fs.readFileSync(SKILL, "utf8");
  const start = text.indexOf("## Stage 3: SHIP");
  expect(start).toBeGreaterThan(-1);
  return text.slice(start);
}

function statePath(repo: string): string {
  return path.join(repo, ".workflows", "wip", `${encodeURIComponent(BATCH)}.json`);
}

function fixtureRepo(state: Record<string, unknown>, files: Record<string, string> = {}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "review-wip-"));
  tempDirs.push(dir);
  const target = statePath(dir);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(state, null, 2));
  for (const [relative, content] of Object.entries(files)) {
    const destination = path.join(dir, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
  }
  return dir;
}

function wip(args: string[]) {
  return spawnSync(process.execPath, [WIP, ...args], { cwd: ROOT, encoding: "utf8" });
}

function state(
  id: string,
  verdict: string | null,
  status = "awaiting-review",
  verifiedFiles: string[] = [],
): Record<string, unknown> {
  const taskIds = id.slice(id.indexOf("/") + 1).split(/[+,]/);
  return {
    id,
    kind: "fix",
    scope: ["src/a.ts"],
    root_cause: "stale cache",
    verdict,
    status,
    created_at: CREATED_AT,
    task_ids: taskIds,
    verified_files: verifiedFiles,
  };
}

function writeVerdict(repo: string, body: string): string {
  const target = path.join(repo, ".workflows", "reviews", "task-1.md");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body);
  return path.relative(repo, target);
}

afterEach(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("review skill consumes WIP proof", () => {
  test("test_review_stage3_runs_wip_verify", () => {
    const stage = stage3();
    expect(stage).toContain("PI_WORKFLOWS_BIN:-./scripts/wf.sh");
    const verifyAt = stage.indexOf("wip verify");
    const readyAt = stage.indexOf("wip ready");
    const changedAt = stage.indexOf("git diff --name-only HEAD >");
    const commitAt = stage.indexOf("git commit");
    expect(changedAt).toBeGreaterThan(-1);
    expect(readyAt).toBeGreaterThan(-1);
    expect(verifyAt).toBeGreaterThan(readyAt);
    expect(commitAt).toBeGreaterThan(verifyAt);
    expect(stage).not.toContain("git add -A");
    expect(stage).toContain("verified_files");
    expect(stage.indexOf("CHANGELOG.md first")).toBeGreaterThan(verifyAt);
    expect(stage).toMatch(/CHANGELOG\.md first[\s\S]*?BEFORE the\s+commit/i);
  });

  test("test_review_requires_final_ok_verdict", () => {
    const stage = stage3();
    expect(stage).toMatch(/final\s+`?ok:true`?/i);
    expect(stage).toMatch(/every\s+task\s+id/i);
    expect(stage).toMatch(/missing\s+proof/i);

    const repo = fixtureRepo(state(BATCH, null), {
      "verdict.md": "- Verdict: **ok: false** — final\n",
    });
    const result = wip([
      "ready",
      "--repo",
      repo,
      "--id",
      BATCH,
      "--verdict",
      path.join(repo, "verdict.md"),
    ]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).reason).toContain("task-1");
  });

  test("test_review_requires_scope_containment", () => {
    const stage = stage3();
    expect(stage).toContain("WIP-Scope");
    expect(stage).toMatch(/out[- ]of[- ]scope/i);

    const verdict = "- Verdict: **ok: true** — final\n";
    const repo = fixtureRepo(state(BATCH, ".workflows/reviews/task-1.md", "ready-to-ship"), {
      ".workflows/reviews/task-1.md": verdict,
      "changed.txt": "secrets/keys.ts\n",
    });
    const result = wip([
      "verify",
      "--repo",
      repo,
      "--id",
      BATCH,
      "--scope-file",
      path.join(repo, "changed.txt"),
    ]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stdout).reason).toContain("secrets/keys.ts");
  });

  test("test_review_wip_ship_marks_shipped", () => {
    const stage = stage3();
    expect(stage).toContain("wip ship");
    const commitAt = stage.indexOf("git commit");
    expect(stage.indexOf("wip ship")).toBeGreaterThan(commitAt);
    expect(stage).toMatch(/after\s+the\s+commit\s+succeeds/i);
    expect(stage).toMatch(/marks?\s+the\s+batch\s+(?:as\s+)?`?shipped`?|status\s+`?shipped`?/i);
  });

  test("test_review_explicit_staging_and_post_commit_ship", () => {
    const stage = stage3();
    expect(stage).not.toMatch(/git\s+add\s+-A/);
    expect(stage).toMatch(/git\s+add\s+--\s+<each\s+verified\s+file>/i);
    expect(stage.indexOf("git add --")).toBeLessThan(stage.indexOf("git commit"));
    expect(stage.indexOf("wip ship")).toBeGreaterThan(stage.indexOf("git commit"));

    const repo = fixtureRepo(state(BATCH, null));
    const verdict = writeVerdict(repo, "- Verdict: **ok: true** — final\n");
    fs.writeFileSync(path.join(repo, "changed.txt"), "src/a.ts\n");
    expect(
      wip(["ready", "--repo", repo, "--id", BATCH, "--verdict", verdict]).status,
    ).toBe(0);
    const verified = wip([
      "verify",
      "--repo",
      repo,
      "--id",
      BATCH,
      "--scope-file",
      path.join(repo, "changed.txt"),
    ]);
    expect(verified.status).toBe(0);
    expect(JSON.parse(verified.stdout).verified_files).toEqual(["src/a.ts"]);
    expect(wip(["ship", "--repo", repo, "--id", BATCH]).status).toBe(0);
  });
});
