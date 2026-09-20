/**
 * Tests for scripts/check-spec-selectors.sh
 *
 * Run: bun test tests/spec-selectors.test.ts
 *
 * The lint is parse-only: it never executes `Test:` selector text, so fixtures
 * can safely describe post-work state that does not exist yet.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SCRIPT = resolve(ROOT, "scripts", "check-spec-selectors.sh");
const FIXTURES = resolve(__dirname, "fixtures");
const GOOD = resolve(FIXTURES, "good-selectors.spec");
const BAD = resolve(FIXTURES, "bad-selectors.spec");

// ── helpers ─────────────────────────────────────────────────────────────

function runLint(args: string[] = [], cwd = ROOT) {
  return spawnSync("bash", [SCRIPT, ...args], {
    cwd,
    encoding: "utf-8",
    timeout: 15000,
  });
}

function findingLines(stdout: string): string[] {
  return stdout
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
}

// ── CC1: good fixture passes clean ──────────────────────────────────────

describe("CC1: good fixture passes clean", () => {
  test("valid selectors (grep -A6 + compound + -f path) exit 0 silently", () => {
    const result = runLint([GOOD]);

    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });
});

// ── CC2: bad fixture caught with file:line findings ─────────────────────

describe("CC2: bad fixture caught with file:line findings", () => {
  test("exit 1, >=3 file:line-prefixed findings covering the defect classes", () => {
    const result = runLint([BAD]);

    expect(result.status).toBe(1);

    const lines = findingLines(result.stdout);
    expect(lines.length).toBeGreaterThanOrEqual(3);

    // Every finding line is `file:line: <finding>` prefixed.
    for (const line of lines) {
      expect(line).toMatch(/^\S.*:\d+: /);
    }

    // The >=3 distinct defect classes from the spec are all represented.
    expect(result.stdout).toContain("syntax error");
    expect(result.stdout).toContain("context flag");
    expect(result.stdout).toContain("empty quoted argument");
  });

  test("findings admit more than one defect per file and never leak to stderr", () => {
    const result = runLint([BAD]);
    const lines = findingLines(result.stdout);

    // More than one line from the same fixture file means per-defect reporting.
    expect(new Set(lines.map((l) => l.split(":")[0])).size).toBe(1);
    expect(result.stderr).toBe("");
  });
});

// ── CC3: no-args discovery behavior ─────────────────────────────────────

describe("CC3: no-args discovery", () => {
  test("absent .workflows/specs dir is clean exit 0", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "selector-lint-empty-"));

    try {
      const result = runLint([], dir);

      expect(result.status).toBe(0);
      expect(result.stdout).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("present .workflows/specs/*.spec are linted", () => {
    const dir = mkdtempSync(resolve(tmpdir(), "selector-lint-specs-"));

    try {
      mkdirSync(resolve(dir, ".workflows", "specs"), { recursive: true });
      copyFileSync(BAD, resolve(dir, ".workflows", "specs", "task-bad.spec"));

      const result = runLint([], dir);

      expect(result.status).toBe(1);
      expect(result.stdout).toContain("task-bad.spec:");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── CC4: negative — parse-only, never executes selectors ────────────────

describe("CC4: parse-only, never executes selectors", () => {
  test("no eval / sh -c / sh -e / bash \"...\" constructs; bash -n is the parser", () => {
    const src = readFileSync(SCRIPT, "utf-8");

    expect(src).not.toMatch(/eval /);
    expect(src).not.toMatch(/sh +-[ce] /);
    expect(src).not.toMatch(/bash +"/);
    expect(src).toContain("bash -n");
  });
});