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
  "wip",
  "output-policy",
  "open-diagram-render",
] as const;
const ARG_TASKS = ["judge", "lessons", "bench", "archive-check", "output-policy", "open-diagram-render"] as const;
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

// Plan 20261124-081 TASK 3: the generated Rust check is authored as a flat
// double-quoted [tasks] line in the init doctrine; read it from that source of
// truth rather than duplicating a second copy of the chain in this test.
function generatedRustCheck(): string {
  const source = read(path.join("skills", "init", "SKILL.md"));
  const match = source.match(/check = "([^"\n]*cargo metadata[^"\n]*)"/);
  if (!match) throw new Error("generated Rust check line is missing");
  return match[1];
}

function sectionText(relative: string, heading: string): string {
  const text = read(relative);
  const start = text.indexOf(heading);
  if (start < 0) throw new Error(`${relative} is missing ${heading}`);
  const rest = text.slice(start + heading.length);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
}

const RUST_CHAIN_TOKENS = [
  "cargo metadata --locked --no-deps --format-version 1",
  "cargo tree --locked --workspace -e normal,build --target all",
  "cargo clippy --locked --workspace --all-targets -- -D warnings",
  "cargo deny --config deny.toml --locked check",
  "deslop-please --allow .deslop-please.allow",
] as const;

const RUST_SKILLS = [
  "rust-review",
  "rust-best-practices",
  "rust-port",
  "rust-crate-architecture",
] as const;

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
    expect([...names].sort()).toEqual([
      "wf:archive-check",
      "wf:bench",
      "wf:judge",
      "wf:lessons",
      "wf:wip",
    ]);
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

describe("mise tasks — Rust structural gate docs (plan 20261124-081 TASK 3)", () => {
  test("test_generated_rust_check_chain", () => {
    const check = generatedRustCheck();
    const at = (token: string) => {
      const index = check.indexOf(token);
      expect(index, `check is missing ${token}`).toBeGreaterThanOrEqual(0);
      return index;
    };
    const positions = RUST_CHAIN_TOKENS.map(at);
    expect(positions[0]).toBe(0);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i], `${RUST_CHAIN_TOKENS[i]} must follow ${RUST_CHAIN_TOKENS[i - 1]}`).toBeGreaterThan(positions[i - 1]);
    }
    expect(check).toContain("command -v cargo-deny");
    expect(check).toContain("command -v deslop-please");
    expect(check).toMatch(/SKIP[^\n]*cargo-deny[^\n]*>&2/);
    expect(check).toMatch(/SKIP[^\n]*deslop-please[^\n]*>&2/);
    expect(check).not.toContain("--update-allow");
    // crate-boundary decisions belong to the four-skill Rust family in docs
    expect(read("README.md")).toContain("rust-crate-architecture");
  });

  test("test_rust_architecture_docs", () => {
    const readme = sectionText("README.md", "## Gates");
    const architecture = sectionText("docs/architecture.md", "## Gates —");
    const canon = read("docs/canon.md");

    for (const [label, slice] of [["README.md", readme], ["docs/architecture.md", architecture]] as const) {
      for (const token of RUST_CHAIN_TOKENS) {
        expect(slice.toLowerCase(), `${label} Rust gate section is missing ${token}`).toContain(token.toLowerCase());
      }
      expect(slice, `${label} must document the structural gate`).toMatch(/Rust structural gate/i);
      expect(slice, `${label} must document the loud skip`).toMatch(/SKIP/i);
      expect(slice, `${label} must name stderr`).toMatch(/stderr/i);
      expect(slice, `${label} must pin exit-1 on findings`).toMatch(/exit\s+(?:1|one)\b/i);
    }

    for (const skill of RUST_SKILLS) expect(readme).toContain(skill);
    expect(readme).toMatch(/crate[- ]boundary/i);
    expect(canon, "claim-to-gate mapping must name the Rust structural gate").toMatch(/Rust structural gate/i);
    expect(canon).toContain("rust-crate-architecture");
    expect(canon).toMatch(/crate[- ]boundary/i);

    // The claim-to-gate scan is a same-line rule: every new Rust claim that
    // obligates an agent must carry a gate reference on that very line.
    const rustClaims = [readme, architecture, canon]
      .flatMap((text) => text.split("\n"))
      .filter((line) => /deslop-please|rust-crate-architecture|cargo (?:metadata|tree|clippy|deny)/i.test(line))
      .filter((line) => /\b(?:must|must not|never|always)\b/i.test(line));
    expect(rustClaims.length).toBeGreaterThan(0);
    for (const line of rustClaims) expect(line).toMatch(/(?:gate:|`[^`]*\/[^`]*`)/);
  });

  test("test_rust_docs_baseline_ratchet", () => {
    const baseline = JSON.parse(read("scripts/docs-lint-baseline.json"));
    expect(baseline.generated_by).toBe("bash scripts/docs-lint.sh --write-baseline");
    expect(Object.keys(baseline.sections)).toEqual(["markdownlint-cli2", "lychee", "harper-cli"]);

    // Ceilings measured before the plan's doc edits. Regeneration may record
    // a lower debt; raising any per-file budget would hide new debt.
    const reference: Record<string, Record<string, number>> = {
      "markdownlint-cli2": { "README.md": 44, "docs/architecture.md": 28, "docs/canon.md": 0 },
      "lychee": { "README.md": 0, "docs/architecture.md": 0, "docs/canon.md": 0 },
      "harper-cli": { "README.md": 47, "docs/architecture.md": 0, "docs/canon.md": 0 },
    };
    for (const [name, ceilings] of Object.entries(reference)) {
      const section = baseline.sections[name];
      const keys = Object.keys(section.files);
      expect(keys, `${name} budgets must be sorted`).toEqual([...keys].sort());
      expect(section.total).toBe(Object.values(section.files).reduce((sum: number, n) => sum + Number(n), 0));
      for (const [file, ceiling] of Object.entries(ceilings)) {
        expect(section.files[file] ?? 0, `${name} budget for ${file} rose above the pre-change reference`).toBeLessThanOrEqual(ceiling);
      }
    }

    const docs = [read("README.md"), read("docs/architecture.md"), read("docs/canon.md")].join("\n");
    expect(docs).toContain("Rust structural gate");
    expect(docs).toContain("rust-crate-architecture");

    // CHANGELOG is SHIP-only: the docs worker never touches history.
    const changelogDiff = Bun.spawnSync(["git", "diff", "--quiet", "--", "CHANGELOG.md"], { cwd: ROOT });
    expect(changelogDiff.exitCode).toBe(0);
  });
});

describe("mise tasks — final review integration gates (TASK 4, plan 20261124-081)", () => {
  test("test_final_review_integration_gates", () => {
    // The Verify command runs the full suite; this test is inside that suite.
    // The marker prevents recursion without skipping any other test.
    const GUARD = "PI_WORKFLOWS_INTEGRATION_RECURSION_GUARD";
    if (process.env[GUARD] === "1") return;
    const env = { ...(process.env as Record<string, string>), [GUARD]: "1" };

    const suite = Bun.spawnSync(["bun", "test"], {
      cwd: ROOT,
      env,
      encoding: "utf8",
      timeout: 240_000,
    });
    const suiteOutput = `${textOf(suite.stdout)}${textOf(suite.stderr)}`;
    expect(
      suite.exitCode,
      `bun test failed:\n${suiteOutput.slice(-4000)}`
    ).toBe(0);
    expect(suiteOutput).toMatch(/\b0 fail\b/);
    expect(suiteOutput).toMatch(/\b\d+ pass\b/);

    const docs = Bun.spawnSync(["bash", "scripts/docs-lint.sh"], {
      cwd: ROOT,
      env,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(
      docs.exitCode,
      `docs-lint failed:\n${textOf(docs.stdout)}${textOf(docs.stderr)}`
    ).toBe(0);

    const drift = Bun.spawnSync(["bash", "scripts/check-drift.sh"], {
      cwd: ROOT,
      env,
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(
      drift.exitCode,
      `check-drift failed:\n${textOf(drift.stdout)}${textOf(drift.stderr)}`
    ).toBe(0);

    // No budget rise: every committed budget still bounds the live baseline.
    const committed = Bun.spawnSync(
      ["git", "show", "HEAD:scripts/docs-lint-baseline.json"],
      { cwd: ROOT, encoding: "utf8" }
    );
    expect(committed.exitCode).toBe(0);
    const before = JSON.parse(textOf(committed.stdout));
    const after = JSON.parse(read("scripts/docs-lint-baseline.json"));
    for (const [name, beforeSection] of Object.entries(before.sections) as [
      string,
      { total: number; files: Record<string, number> },
    ][]) {
      const afterSection: { total: number; files: Record<string, number> } =
        after.sections[name] ?? { total: 0, files: {} };
      expect(
        Number(afterSection.total),
        `${name} total budget rose`
      ).toBeLessThanOrEqual(Number(beforeSection.total));
      for (const [file, budget] of Object.entries(beforeSection.files)) {
        expect(
          Number(afterSection.files[file] ?? 0),
          `${name} budget for ${file} rose`
        ).toBeLessThanOrEqual(Number(budget));
      }
      for (const file of Object.keys(afterSection.files)) {
        expect(
          Object.prototype.hasOwnProperty.call(beforeSection.files, file),
          `${name} gained a new budget for ${file}`
        ).toBe(true);
      }
    }
  }, 300_000);
});

function textOf(stream: unknown): string {
  return stream == null ? "" : String(stream);
}
