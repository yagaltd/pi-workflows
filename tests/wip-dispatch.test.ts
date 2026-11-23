import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import register, { dispatchNext, readWipStatus } from "../extensions/index";

const ROOT = path.resolve(import.meta.dir, "..");
const tempDirs: string[] = [];
const CREATED_AT = "2026-11-22T00:00:00.000Z";

const PLAN = `# Plan: wip dispatch fixture (080)

> Plan ID: 20260101-080
> Status: APPROVED 2026-01-01 (owner)

## Tasks

### TASK 1 (Tier B, ⚪): eligible task — src/a.ts
- **Status**: ⬜ PENDING
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: src/a.ts
- **Verify**: bun test
`;

const REGISTRY = `# Role registry — fixture

| Bottleneck | Tier | model | thinking | extra |
|---|---|---|---|---|
| ⚪ STANDARD | A or B (per plan) | \`@model:standard\` | medium | default flow |

Tier refines routing:

- **B** → existing per-tag routing above, unchanged
`;

function wipState(id: string, status = "awaiting-review"): Record<string, unknown> {
  return {
    id,
    kind: "fix",
    scope: ["src/a.ts"],
    root_cause: "stale cache",
    verdict: null,
    status,
    created_at: CREATED_AT,
    task_ids: [id.slice(id.indexOf("/") + 1)],
    verified_files: [],
  };
}

function writeWip(dir: string, id: string, status = "awaiting-review"): void {
  const wipDir = path.join(dir, ".workflows", "wip");
  fs.mkdirSync(wipDir, { recursive: true });
  fs.writeFileSync(
    path.join(wipDir, `${encodeURIComponent(id)}.json`),
    `${JSON.stringify(wipState(id, status), null, 2)}\n`,
  );
}

function project(active = false): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wip-dispatch-"));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".workflows", "specs"), { recursive: true });
  fs.mkdirSync(path.join(dir, "agents"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".workflows", "plan.md"), PLAN);
  fs.writeFileSync(path.join(dir, ".workflows", "specs", "task-1.spec"), "spec: task\nname: fixture\n");
  fs.writeFileSync(path.join(dir, "agents", "registry.md"), REGISTRY);
  if (active) writeWip(dir, "20261122-080/task-9");
  return dir;
}

function snapshot(dir: string): string {
  const entries: string[] = [];
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else entries.push(`${path.relative(dir, full)}:${fs.statSync(full).mtimeMs}:${fs.statSync(full).size}`);
    }
  };
  walk(dir);
  return entries.join("\n");
}

function dispatchTool(): any {
  let tool: any = null;
  register({
    on: () => undefined,
    registerTool: (candidate: any) => {
      if (candidate.name === "dispatch_next") tool = candidate;
    },
  } as any);
  return tool;
}

afterEach(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("dispatch_next WIP batch block", () => {
  test("test_dispatch_blocks_when_wip_active", () => {
    const result = dispatchNext({ cwd: project(true) });
    expect(result.ok).toBe(false);
    expect(result.blocked).toBe("wip-active");
    expect(result.reason).toContain("task-9");
    expect(result.reason).toContain("/review");
    expect(result).not.toHaveProperty("task");
    expect(result.eligible).toEqual([]);
  });

  test("test_dispatch_clean_repo_unblocked", () => {
    const result = dispatchNext({ cwd: project(false) });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.task.id).toBe("task-1");
  });

  test("test_dispatch_wip_block_is_read_only", async () => {
    const tool = dispatchTool();
    expect(tool.annotations?.readOnlyHint).toBe(true);
    const dir = project(true);
    const before = snapshot(dir);
    const result = await tool.execute("t1", {}, undefined, undefined, { cwd: dir });
    expect(result.details.blocked).toBe("wip-active");
    expect(snapshot(dir)).toBe(before);
    expect(fs.readFileSync(path.join(ROOT, "extensions", "index.ts"), "utf8")).not.toMatch(
      /before_agent_start[\s\S]{0,200}wip/i,
    );
  });

  test("test_dispatch_unreadable_wip_path_does_not_throw", () => {
    const dir = project(false);
    const blocked = path.join(dir, ".workflows", "wip");
    fs.writeFileSync(blocked, "not a directory\n");
    let status: ReturnType<typeof readWipStatus> | null = null;
    expect(() => {
      status = readWipStatus(dir);
    }).not.toThrow();
    expect(status).toMatchObject({ ok: false });
    let result: ReturnType<typeof dispatchNext> | null = null;
    expect(() => {
      result = dispatchNext({ cwd: dir });
    }).not.toThrow();
    expect(result).toMatchObject({ ok: false, blocked: "wip-active" });
  });

  test("test_dispatch_multiple_active_batches_fail_closed", () => {
    const dir = project(false);
    writeWip(dir, "20261122-080/task-1");
    writeWip(dir, "20261122-080/task-2");
    const status = readWipStatus(dir);
    expect(status.ok).toBe(false);
    expect(status.reason).toMatch(/multiple active/i);
    expect(dispatchNext({ cwd: dir })).toMatchObject({ ok: false, blocked: "wip-active" });
  });
});
