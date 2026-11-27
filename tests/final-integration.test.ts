import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const gitShow = (revPath: string) => spawnSync("git", ["show", revPath], { cwd: ROOT, encoding: "utf8" }).stdout;
const SHIP_OWNED = new Set([
  "CHANGELOG.md",
  "package.json",
  "README.md",
  "docs/architecture.md",
  "docs/canon.md",
]);

function releaseState() {
  const version = (JSON.parse(read("package.json")) as { version: string }).version;
  const entries = read("CHANGELOG.md")
    .split(/(?=^## )/m)
    .filter((part) => part.startsWith("## "));
  const entry = entries[0] ?? "";
  // Pre-sweep releases put the plan id in the entry below the version bump;
  // the newest plan-tagged release is the current pin in either state.
  const planId = entries
    .slice(0, 2)
    .map((part) => part.match(/\bplan (\d{8}-\d{3})\b/)?.[1] ?? "")
    .find(Boolean) ?? "";
  return {
    version,
    entry,
    planId,
    valid: /^## \d{4}-\d{2}-\d{2} — v/.test(entry)
      && entry.includes(`v${version}:`)
      && /^\d{8}-\d{3}$/.test(planId),
  };
}

function changelogReleaseOnly(): boolean {
  const changelog = read("CHANGELOG.md");
  const head = gitShow("HEAD:CHANGELOG.md");
  if (changelog === head) return true;
  const release = releaseState();
  return release.valid && changelog === release.entry + head;
}

function packageReleaseOnly(): boolean {
  const current = JSON.parse(read("package.json"));
  const head = JSON.parse(gitShow("HEAD:package.json"));
  const { version: currentVersion, ...currentRest } = current;
  const { version: headVersion, ...headRest } = head;
  const release = releaseState();
  return JSON.stringify(currentRest) === JSON.stringify(headRest)
    && (currentVersion === headVersion
      || (release.valid && release.entry.includes(`v${currentVersion}:`)));
}

const pinned = (args: string[], input?: string) =>
  spawnSync(
    "mise",
    ["exec", "--", ...args],
    { cwd: ROOT, encoding: "utf8", input, maxBuffer: 20 * 1024 * 1024, timeout: 600_000 },
  );

function markdownFiles(dir: string): string[] {
  const base = path.join(ROOT, dir);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(base, entry.name);
    if (entry.isDirectory()) return markdownFiles(path.join(dir, entry.name));
    return entry.name.endsWith(".md") ? [path.join(dir, entry.name)] : [];
  });
}

describe("final integration cleanup (plan 20261127-083 TASK 4)", () => {
  test("test_dprint_includes_clean", () => {
    const config = JSON.parse(read("dprint.json"));
    expect(config.includes).toEqual(["**/*.ts", "**/*.js", "**/*.mjs", "**/*.json"]);
    expect(config.plugins).toEqual([
      "npm:@dprint/typescript@0.101.0",
      "npm:@dprint/json@0.26.0",
    ]);
    expect(Object.keys(config).some((key) => /markdown/i.test(key))).toBe(false);
    expect(JSON.stringify(config)).not.toMatch(/exec|process|dprint-plugin-exec/i);

    const check = pinned(["dprint", "check", "--list-different"]);
    expect(check.status, `${check.stdout}\n${check.stderr}`).toBe(0);
    expect(check.stdout.trim()).toBe("");
  });

  test("test_stale_pins_current", () => {
    const mise = read("mise.toml");
    const hash = createHash("sha256").update(mise).digest("hex");
    const launcher = read("tests/wf-launcher.test.ts");
    expect(launcher).toContain(`"${hash}"`);
    expect(mise).not.toMatch(/^\[tasks\]/m);

    const release = releaseState();
    expect(release.valid, "top release entry must pin the current version and plan id").toBe(true);
    expect(release.entry.split("\n")[0]).toContain(`v${release.version}:`);
    const chooser = read("tests/chooser-wiring.test.ts");
    expect(chooser).toContain("v${version}:");
    expect(chooser).toContain("JSON.parse(read(\"package.json\"))");

    const rawCall = /(?:^|[\s`"'|(])(?:node|bun|bash)\s+(?:\.\/)?scripts\//;
    const raw = markdownFiles("skills").concat(markdownFiles("prompts")).flatMap((rel) =>
      read(rel).split("\n").flatMap((line, i) => {
        if (!rawCall.test(line)) return [];
        if (line.includes("bash scripts/resume-digest.sh") && line.includes("exits 127")) return [];
        return [`${rel}:${i + 1}`];
      })
    );
    expect(raw).toEqual([]);
  });

  test("test_docs_budgets_hold", () => {
    const baseline = JSON.parse(read("scripts/docs-lint-baseline.json"));
    expect(baseline.generated_by).toBe("bash scripts/docs-lint.sh --write-baseline");
    const ceilings: Record<string, { total: number; files: Record<string, number> }> = {
      "markdownlint-cli2": {
        total: 338,
        files: { "README.md": 44, "skills/init/SKILL.md": 1 },
      },
      lychee: { total: 0, files: { "README.md": 0 } },
      "harper-cli": {
        total: 1107,
        files: { "README.md": 47, "SKILL.md": 381 },
      },
    };
    expect(Object.keys(baseline.sections).sort()).toEqual(Object.keys(ceilings).sort());
    for (const [section, ceiling] of Object.entries(ceilings)) {
      const actual = baseline.sections[section];
      expect(actual.total).toBeLessThanOrEqual(ceiling.total);
      for (const [file, budget] of Object.entries(ceiling.files)) {
        expect(actual.files[file] ?? 0, `${section}:${file}`).toBeLessThanOrEqual(budget);
      }
    }
  });

  test("test_no_behavior_or_history_rewrite", () => {
    const touched = new Set([
      ...spawnSync("git", ["diff", "--name-only", "HEAD", "--"], {
        cwd: ROOT,
        encoding: "utf8",
      }).stdout.split("\n").filter(Boolean),
      ...spawnSync("git", ["ls-files", "--others", "--exclude-standard"], {
        cwd: ROOT,
        encoding: "utf8",
      }).stdout.split("\n").filter(Boolean),
    ]);
    const allowed = new Set([
      "README.md",
      "extensions/index.ts",
      "skills/init/SKILL.md",
      "package.json",
      "mise.toml",
      "dprint.json",
      "scripts/docs-lint-baseline.json",
      ".workflows/tree.json",
      ".workflows/specs/task-4.spec",
      ".githooks/pre-commit",
      "agents/worker.md",
      "tests/final-integration.test.ts",
    ]);
    // Plan 20261127-083 TASK 5 owns the staged hook and the worker role rule;
    // live .workflows/ state is orchestrator bookkeeping. SHIP owns the
    // release entry, version bump, and docs sweep. Only a current release pin
    // makes those paths orchestrator-owned; every other live edit still fails.
    expect(releaseState().valid).toBe(true);
    expect(changelogReleaseOnly(), "CHANGELOG may only prepend the current release entry").toBe(true);
    expect(packageReleaseOnly(), "package.json may only carry the current release version").toBe(true);
    expect(
      [...touched].filter(
        (p) =>
          !allowed.has(p)
          && !SHIP_OWNED.has(p)
          && !p.startsWith("scripts/")
          && !p.startsWith("tests/")
          && !p.startsWith(".workflows/"),
      ),
    ).toEqual([]);
    expect(JSON.parse(read("dprint.json")).plugins).toHaveLength(2);
    expect(fs.existsSync(path.join(ROOT, "CHANGELOG.md"))).toBe(true);
  });

  test("test_ship_owned_changes_allowed", () => {
    const release = releaseState();
    expect(release.valid).toBe(true);
    for (const path of ["README.md", "docs/architecture.md", "docs/canon.md"]) {
      expect(SHIP_OWNED.has(path), `${path} is SHIP-owned`).toBe(true);
    }
    for (const path of ["scripts/docs-lint.sh", "scripts/init-extract.ts", "dprint.json"]) {
      expect(SHIP_OWNED.has(path), `${path} is never SHIP-owned`).toBe(false);
    }
    expect(changelogReleaseOnly()).toBe(true);
    expect(packageReleaseOnly()).toBe(true);
  });

  test("test_formatter_pins_remain_green", () => {
    const config = JSON.parse(read("dprint.json"));
    expect(config.includes).toEqual(["**/*.ts", "**/*.js", "**/*.mjs", "**/*.json"]);
    expect(config.plugins).toEqual([
      "npm:@dprint/typescript@0.101.0",
      "npm:@dprint/json@0.26.0",
    ]);
    expect(read(".mise/tasks/format-check")).toContain("dprint check --list-different");
    const baseline = JSON.parse(read("scripts/docs-lint-baseline.json"));
    expect(baseline.generated_by).toBe("bash scripts/docs-lint.sh --write-baseline");
    const check = pinned(["dprint", "check", "--list-different"]);
    expect(check.status, `${check.stdout}\n${check.stderr}`).toBe(0);
  });

  test("test_ship_pin_gates_green", () => {
    expect(releaseState().valid).toBe(true);
    for (const args of [
      ["dprint", "check", "--list-different"],
      ["bash", "scripts/docs-lint.sh"],
      ["bash", "scripts/check-drift.sh"],
    ]) {
      const result = pinned(args);
      expect(result.status, `${args.join(" ")}: ${result.stdout}\n${result.stderr}`).toBe(0);
    }
  }, 600_000);

  test("test_final_gates_green", () => {
    for (const args of [
      ["dprint", "check", "--list-different"],
      ["bash", "scripts/docs-lint.sh"],
      ["bash", "scripts/check-drift.sh"],
    ]) {
      const result = pinned(args);
      expect(result.status, `${args.join(" ")}: ${result.stdout}\n${result.stderr}`).toBe(0);
    }
  }, 600_000);
});

/* ── TASK 5 (plan 20261127-083): whole-plan review fixes ────────────────
 * Selector: test_final_review_fixes_green (verbatim from task-5.spec).
 * The re-entry env guard keeps the nested `bun test` from recursing into
 * this gate while still checking the full suite. */
const GATE_REENTRY_083 = "PI_WORKFLOWS_TASK5_GATE_REENTRY";
const TASK4_BASE_083 = "005a799";

function changedPaths083(): string[] {
  const git = (args: string[]): string[] =>
    spawnSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 30_000,
    }).stdout
      .split("\n")
      .filter(Boolean);
  const baseExists = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", TASK4_BASE_083, "HEAD"],
    { cwd: ROOT, encoding: "utf8" },
  ).status === 0;
  return [
    ...new Set([
      ...(baseExists
        ? git(["diff", "--name-only", `${TASK4_BASE_083}..HEAD`])
        : []),
      ...git(["diff", "--cached", "--name-only"]),
      ...git(["diff", "--name-only"]),
      ...git(["ls-files", "--others", "--exclude-standard"]),
    ]),
  ].sort();
}

describe("final review fixes (TASK 5, plan 20261127-083)", () => {
  test("test_final_review_fixes_green", () => {
    if (process.env[GATE_REENTRY_083] === "1") return;

    const dprint = pinned(["dprint", "check", "--list-different"]);
    expect(
      dprint.status,
      `dprint check: ${dprint.stdout}\n${dprint.stderr}`,
    ).toBe(0);

    const suite = spawnSync("bun", ["test"], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 600_000,
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env, [GATE_REENTRY_083]: "1" },
    });
    expect(
      suite.status,
      `bun test: ${suite.stdout}\n${suite.stderr}`,
    ).toBe(0);

    const docs = pinned(["bash", "scripts/docs-lint.sh"]);
    expect(
      docs.status,
      `docs-lint: ${docs.stdout}\n${docs.stderr}`,
    ).toBe(0);
    const drift = spawnSync("bash", ["scripts/check-drift.sh"], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 600_000,
    });
    expect(
      drift.status,
      `check-drift: ${drift.stdout}\n${drift.stderr}`,
    ).toBe(0);

    const allowed = new Set([
      ".workflows/specs/task-5.spec",
      ".githooks/pre-commit",
      "scripts/init-extract.ts",
      "scripts/profile-lint.sh",
      "skills/init/SKILL.md",
      "agents/worker.md",
      "tests/init-extract.test.ts",
      "tests/profile-lint.test.ts",
      "tests/prompt-doctrine.test.ts",
      "tests/final-integration.test.ts",
      "tests/chooser-wiring.test.ts",
      "tests/mise-tasks.test.ts",
      "tests/archive-drift.test.ts",
      "tests/extension.test.ts",
      "tests/flow-gates-mise.test.ts",
      "tests/format-chooser.test.ts",
      "tests/wip.test.ts",
      // Orchestrator SHIP sweep: release entry, version, and refreshed docs.
      "CHANGELOG.md",
      "README.md",
      "docs/architecture.md",
      "docs/canon.md",
      "package.json",
    ]);
    // Orchestrator bookkeeping (.workflows/ LOG, reviews, live plan) is not
    // shipped behavior; the content pins above still bind release surfaces.
    const outside = changedPaths083().filter(
      (p) => !allowed.has(p) && !p.startsWith(".workflows/"),
    );
    expect(outside, "no task-5 forbidden path may change").toEqual([]);
  }, 900_000);
});
