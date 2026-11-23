import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { buildInitMiseFragment } from "../scripts/init-extract.ts";

const ROOT = path.resolve(import.meta.dir, "..");
const TASKS_DIR = path.join(ROOT, ".mise", "tasks");
const REQUIRED_TASKS = [
  "ci",
  "ci-lite",
  "docs",
  "test",
  "agents",
  "eval",
  "drift",
  "docs-if-touched",
  "judge",
  "lessons",
  "bench",
  "archive-check",
] as const;
const ARG_TASKS = ["judge", "lessons", "bench", "archive-check"] as const;
const LEGACY = "j" + "ust";
const LEGACY_MANIFEST = LEGACY + "file";

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function markdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(full);
    return entry.name.endsWith(".md") ? [full] : [];
  });
}

function typescriptFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return typescriptFiles(full);
    return entry.name.endsWith(".ts") ? [full] : [];
  });
}

describe("mise file-task command surface", () => {
  test("legacy manifest and tool pin are gone", () => {
    expect(fs.existsSync(path.join(ROOT, LEGACY_MANIFEST))).toBe(false);
    const mise = read("mise.toml");
    expect(mise).not.toMatch(new RegExp(`^\\s*${LEGACY}\\s*=`, "m"));
    expect(mise).not.toMatch(/^\[tasks\]/m);
  });

  test("every required task is an executable file task with metadata", () => {
    for (const name of REQUIRED_TASKS) {
      const file = path.join(TASKS_DIR, name);
      expect(fs.existsSync(file)).toBe(true);
      expect(fs.statSync(file).mode & 0o111).not.toBe(0);
      const source = fs.readFileSync(file, "utf8");
      expect(source.startsWith("#!/usr/bin/env bash\n")).toBe(true);
      expect(source).toContain("set -euo pipefail");
      expect(source).toMatch(/^#MISE description="[^"]+"$/m);
      expect(source).toMatch(/^# Usage: mise run [a-z-]+/m);
    }
  });

  test("argument-bearing tasks forward all arguments to the single launcher", () => {
    for (const name of ARG_TASKS) {
      const source = fs.readFileSync(path.join(TASKS_DIR, name), "utf8");
      expect(source).toMatch(new RegExp(`scripts/wf\\.sh ${name} "\\$@"`));
    }
  });

  test("docs-if-touched calls the mise docs task, not the legacy command", () => {
    const source = read(path.join(".mise", "tasks", "docs-if-touched"));
    expect(source).toContain("mise run docs");
  });

  test("command-surface docs and tests carry no legacy tool vocabulary", () => {
    const legacyCommand = new RegExp(
      `\\b${LEGACY}(?:\\s+(?:--[a-z-]+|${REQUIRED_TASKS.join("|")}|flow|default))\\b|\\b${LEGACY_MANIFEST}\\b`,
      "i",
    );
    const files = [
      path.join(ROOT, "AGENTS.md"),
      path.join(ROOT, "templates", "AGENTS.md"),
      ...markdownFiles(path.join(ROOT, "skills")),
      ...markdownFiles(path.join(ROOT, "prompts")),
      ...typescriptFiles(path.join(ROOT, "tests")),
    ];
    const hits = files.flatMap((file) =>
      fs
        .readFileSync(file, "utf8")
        .split("\n")
        .map((line, i) => ({ file: path.relative(ROOT, file), line: i + 1, text: line }))
        .filter(({ text }) => legacyCommand.test(text)),
    );
    expect(hits).toEqual([]);
  });

  test("init fragment defines only namespaced wf:* tasks and no root mutation", () => {
    const before = read("mise.toml");
    const fragment = buildInitMiseFragment();
    expect(read("mise.toml")).toBe(before);

    const names = [...fragment.matchAll(/^\[tasks\."([^"]+)"\]$/gm)].map((m) => m[1]);
    expect([...names].sort()).toEqual(["wf:archive-check", "wf:bench", "wf:judge", "wf:lessons"]);
    for (const name of names) expect(name.startsWith("wf:")).toBe(true);
    expect(fragment).not.toMatch(/^\[tools\]/m);
    expect(fragment).not.toMatch(/^\[tasks\.(?:check|verify)\]$/m);
    expect(fragment).not.toMatch(/^\s*(?:check|verify)\s*=/m);
    for (const name of ARG_TASKS.slice(0, 4)) {
      expect(fragment).toContain(`[tasks."wf:${name}"]`);
      expect(fragment).toContain(`"$PI_WORKFLOWS_BIN" ${name} "$@"`);
    }
  });
});
