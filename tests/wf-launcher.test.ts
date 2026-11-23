import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const LAUNCHER = path.join(ROOT, "scripts", "wf.sh");
const EXTENSION = path.join(ROOT, "extensions", "index.ts");

// Legacy regression pins live in tests/resume-digest.test.ts:176 and
// tests/prompt-doctrine.test.ts:605. Those test files are outside this task's
// Allowed Changes, so the one quoted negative example in prompts/restart.md
// ("a bare ... exits 127") must stay byte-identical. It is NOT a call.
const PINNED_QUOTED_EXAMPLE = "bash scripts/resume-digest.sh";

const RAW_CALL = /(?:^|[\s`"'|(])(?:node|bun|bash)\s+(?:\.\/)?scripts\//;

function markdownFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith(".md") ? [full] : [];
  });
}

function rawCalls(): string[] {
  const found: string[] = [];
  for (const dir of ["skills", "prompts"]) {
    for (const file of markdownFiles(path.join(ROOT, dir))) {
      fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        if (!RAW_CALL.test(line)) return;
        if (line.includes(PINNED_QUOTED_EXAMPLE) && line.includes("exits 127")) return;
        found.push(`${path.relative(ROOT, file)}:${i + 1}: ${line.trim()}`);
      });
    }
  }
  return found;
}

function run(args: string[], cwd = ROOT) {
  return spawnSync("bash", [LAUNCHER, ...args], { cwd, encoding: "utf8" });
}

const COMMANDS = [
  "judge",
  "lessons",
  "bench",
  "archive-check",
  "proof-ledger",
  "eval-golden",
  "pii-scan",
  "evasion-scan",
  "closeout",
  "format-chooser",
  "decisions",
  "spec-selectors",
  "intent-guard",
  "flow-run",
  "agents-lint",
  "init-extract",
  "profile-lint",
  "resume-digest",
];

describe("wf launcher contract", () => {
  test("zero actionable raw invocations in skills/prompts (one pinned quoted negative example)", () => {
    expect(rawCalls()).toEqual([]);
  });

  test("the pinned legacy literal is a negative prose example, never a command block", () => {
    for (const file of markdownFiles(path.join(ROOT, "prompts"))) {
      let fenced = false;
      for (const line of fs.readFileSync(file, "utf8").split("\n")) {
        if (line.trimStart().startsWith("```")) fenced = !fenced;
        if (!line.includes(PINNED_QUOTED_EXAMPLE)) continue;
        expect(fenced).toBe(false);
        expect(line).toContain("exits 127");
        expect(line).toContain("bare");
      }
    }
  });

  test("launcher dispatches every raw-call subcommand to the existing script", () => {
    const source = fs.readFileSync(LAUNCHER, "utf8");
    for (const cmd of COMMANDS) expect(source).toMatch(new RegExp(`\\b${cmd}\\)`));
    expect(source).not.toMatch(/(^|\n)\s*(node|bun|bash)[^\n]*scripts\/[a-z-]+\.mjs\s*\([^)]*\)\s*\{/);
  });

  test("launcher resolves the package root from its own path, not the cwd", () => {
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "wf-launcher-"));
    const judge = run(["judge"], elsewhere);
    const out = `${judge.stdout}${judge.stderr}`;
    expect(out).toContain("usage: judge.mjs ask");
    expect(out).not.toMatch(/ENOENT|No such file|not found/);

    const lessons = run(["lessons", "list"], elsewhere);
    expect(lessons.status).toBe(0);
    expect(lessons.stdout).toContain("list:");

    const filtered = run(["lessons", "list", "--text", "wf-launcher-no-such-lesson"], elsewhere);
    expect(filtered.status).toBe(0);
    expect(filtered.stdout).toContain("list: 0 lesson(s)");
    fs.rmSync(elsewhere, { recursive: true, force: true });
  });

  test("unknown subcommand prints usage and exits 2", () => {
    const r = run(["no-such-subcommand"]);
    expect(r.status).toBe(2);
    expect(r.stdout + r.stderr).toContain("usage");
    expect(r.stdout + r.stderr).toContain("judge");
    expect(r.stdout + r.stderr).toContain("lessons");
    expect(r.stdout + r.stderr).toContain("bench");
    expect(r.stdout + r.stderr).toContain("archive-check");
  });

  test("mise file tasks expose judge/lessons/bench/archive-check through the launcher", () => {
    for (const cmd of ["judge", "lessons", "bench", "archive-check"]) {
      const task = fs.readFileSync(path.join(ROOT, ".mise", "tasks", cmd), "utf8");
      expect(task).toContain(`./scripts/wf.sh ${cmd} "$@"`);
    }
  });

  test("mise tasks ls includes the launcher-backed file tasks when mise is installed", () => {
    const probe = spawnSync("mise", ["--version"], { encoding: "utf8" });
    if (probe.error || probe.status !== 0) return;
    const listed = spawnSync("mise", ["tasks", "ls", "--json"], { cwd: ROOT, encoding: "utf8" });
    expect(listed.status).toBe(0);
    const names = JSON.parse(listed.stdout).map((task: { name: string }) => task.name);
    for (const cmd of ["judge", "lessons", "bench", "archive-check"]) {
      expect(names).toContain(cmd);
    }
  });

  test("extension exports the launcher path without changing a caller override", () => {
    const script = `import ${JSON.stringify(EXTENSION)}; console.log(process.env.PI_WORKFLOWS_BIN ?? "")`;
    const probe = spawnSync("bun", ["--version"], { encoding: "utf8" });
    if (probe.error || probe.status !== 0) return;

    const fresh = spawnSync("bun", ["-e", script], { cwd: os.tmpdir(), encoding: "utf8" });
    expect(fresh.status).toBe(0);
    expect(fresh.stdout.trim()).toBe(LAUNCHER);

    const override = spawnSync("bun", ["-e", script], {
      cwd: os.tmpdir(),
      encoding: "utf8",
      env: { ...process.env, PI_WORKFLOWS_BIN: "/custom/wf.sh" },
    });
    expect(override.status).toBe(0);
    expect(override.stdout.trim()).toBe("/custom/wf.sh");
  });

  test("mise.toml remains the tool pin only — no tasks added", () => {
    const mise = fs.readFileSync(path.join(ROOT, "mise.toml"), "utf8");
    expect(createHash("sha256").update(mise).digest("hex")).toBe(
      "36a657c4fa4076e44c44e972bd687e2c7fd32e00689ce29a423b81257947044a",
    );
    expect(mise).not.toMatch(/^\[tasks\]/m);
  });
});
