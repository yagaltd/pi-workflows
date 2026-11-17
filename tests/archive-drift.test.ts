/**
 * Tests for the archive-drift rules (plan 20261117-064 TASK 3):
 *
 *   R1 `scripts/check-drift.sh` section 11 — a shipped plan id (first 10
 *      CHANGELOG entries) must have a `.workflows/archive/{done,superseded}/<id>-*`
 *      bundle; absent `.workflows/archive/` skips loudly instead of failing.
 *   R2 `scripts/check-archive.sh` — a `## Docs impact` section whose paths are
 *      never backticked is a finding, not a silent pass.
 *   R3 `scripts/check-drift.sh` section 12 — every `.workflows/` path whitelisted
 *      in `.gitignore` needs at least one git-tracked file, and the ADR ledger
 *      must parse (`scripts/decisions.mjs check`).
 *   R4 `scripts/scaffold.sh adr` must emit what the ledger parses and land on
 *      the convention filename `DEC-<nnn>.md` — rendered in a throwaway repo,
 *      never in the real ledger.
 *
 * Fixtures: tests/fixtures/archive-drift/**. Every fixture is a standalone mini
 * repo; the sections are driven through `check-drift.sh --only <section>
 * --root <dir>`, the documented test seam.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const FIXTURES = join(import.meta.dir, "fixtures", "archive-drift");
const DRIFT = join(ROOT, "scripts", "check-drift.sh");
const ARCHIVE = join(ROOT, "scripts", "check-archive.sh");

const tmpDirs: string[] = [];

function tmp(): string {
  const dir = mkdtempSync(join(tmpdir(), "archive-drift-"));
  tmpDirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});

function run(script: string, args: string[], cwd = ROOT) {
  return spawnSync("bash", [script, ...args], { cwd, encoding: "utf-8", timeout: 30000 });
}

function drift(section: string, root?: string) {
  const args = ["--only", section];
  if (root) args.push("--root", root);
  return run(DRIFT, args);
}

function tempRepo(fixture: string): string {
  const dir = tmp();
  cpSync(fixture, dir, { recursive: true });
  return dir;
}

function git(dir: string, args: string[]) {
  return spawnSync("git", args, { cwd: dir, encoding: "utf-8", timeout: 30000 });
}

// ── R1: a shipped plan id must have an archive bundle ───────────────────

describe("R1 — shipped plan id ⇒ archive bundle", () => {
  test("fixture CHANGELOG id with no archive dir is reported", () => {
    const result = drift("archive", join(FIXTURES, "shipped-missing"));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("CHANGELOG.md:1:");
    expect(result.stderr).toContain("20260102-902");
    expect(result.stderr).toContain(".workflows/archive/done/20260102-902-");
    // the bundled id on line 5 is not a finding
    expect(result.stderr).not.toContain("20260101-901");
  });

  test("fixture CHANGELOG id with an archive dir is clean", () => {
    const result = drift("archive", join(FIXTURES, "shipped-present"));

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("== 11. Archive coverage");
    expect(result.stdout).toContain("(2 ids");
  });

  test("absent archive tree prints a skip line and does not fail", () => {
    const result = drift("archive", join(FIXTURES, "no-archive"));

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/skip:/);
    expect(result.stdout).toContain(".workflows/archive/");
  });

  test("only the first 10 CHANGELOG entries are audited", () => {
    const result = drift("archive", join(FIXTURES, "beyond-window"));

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("== 11. Archive coverage");
    // the bound is what this fixture exists to prove: 10 of its 11 entries are
    // audited, and the unbundled 11th (20251231-999) is never looked at.
    expect(result.stdout).toContain("(10 ids");
    expect(result.stdout + result.stderr).not.toContain("20251231-999");
  });
});

// ── R2: Docs impact paths must be backticked ────────────────────────────

describe("R2 — unbackticked Docs impact paths are a finding", () => {
  test("prose-only Docs impact section fails check-archive", () => {
    const result = run(ARCHIVE, [join(FIXTURES, "docs-impact-prose")]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("plan.md:5:");
    expect(result.stderr).toContain("Docs impact");
    expect(result.stderr).toContain("templates/PROPOSAL-FORMAT.md");
  });

  test("backticked Docs impact section passes", () => {
    const result = run(ARCHIVE, [join(FIXTURES, "docs-impact-backticked")]);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });
});

// ── R3: whitelisted durable paths must be git-tracked ───────────────────

describe("R3 — durable knowledge must be git-tracked", () => {
  test("a whitelisted path with no tracked file is a finding", () => {
    const dir = tempRepo(join(FIXTURES, "durable-untracked"));
    cpSync(join(dir, "gitignore.fixture"), join(dir, ".gitignore"));
    rmSync(join(dir, "gitignore.fixture"));
    git(dir, ["init", "-q"]);
    git(dir, ["add", ".gitignore", ".workflows/LOG.md"]);

    const result = drift("durable", dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(".workflows/decisions/");
    expect(result.stderr).toContain("no git-tracked file");
    expect(result.stderr).not.toContain(".workflows/LOG.md");
  });

  test("tracked whitelisted paths are clean", () => {
    const dir = tempRepo(join(FIXTURES, "durable-tracked"));
    cpSync(join(dir, "gitignore.fixture"), join(dir, ".gitignore"));
    rmSync(join(dir, "gitignore.fixture"));
    git(dir, ["init", "-q"]);
    git(dir, ["add", "-A"]);

    const result = drift("durable", dir);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("== 12. Durable knowledge");
    expect(result.stdout).toContain(".workflows/decisions/ is git-tracked");
  });

  test("outside a git checkout the audit skips loudly", () => {
    const dir = tempRepo(join(FIXTURES, "durable-untracked"));
    cpSync(join(dir, "gitignore.fixture"), join(dir, ".gitignore"));
    rmSync(join(dir, "gitignore.fixture"));

    const result = drift("durable", dir);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/skip:/);
    expect(result.stdout).toContain("git");
  });

  test("a ledger the parser rejects is a finding, never a silent success", () => {
    const dir = tempRepo(join(FIXTURES, "scaffold-adr"));
    mkdirSync(join(dir, "scripts"), { recursive: true });
    cpSync(join(ROOT, "scripts", "decisions.mjs"), join(dir, "scripts", "decisions.mjs"));
    writeFileSync(
      join(dir, ".workflows", "decisions", "DEC-003-legacy.md"),
      "# ADR-003: legacy long-form record\n\nDate: 2026-01-01\n\n## Status\n\nAccepted\n",
    );
    git(dir, ["init", "-q"]);
    git(dir, ["add", "-A"]);

    const result = drift("durable", dir);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("decisions");
    expect(result.stderr).toContain("DEC-003-legacy.md");
  });
});

// ── R4: the adr scaffold emits what the ledger parses ───────────────────

describe("R4 — scaffold.sh adr round-trips through decisions.mjs", () => {
  /** Throwaway repo: the real profile + its templates + the two scripts. */
  function scaffoldRepo(): string {
    const dir = tempRepo(join(FIXTURES, "scaffold-adr"));
    mkdirSync(join(dir, "scripts"), { recursive: true });
    mkdirSync(join(dir, ".workflows"), { recursive: true });
    cpSync(join(ROOT, "scripts", "scaffold.sh"), join(dir, "scripts", "scaffold.sh"));
    cpSync(join(ROOT, "scripts", "decisions.mjs"), join(dir, "scripts", "decisions.mjs"));
    cpSync(join(ROOT, ".workflows", "profile.json"), join(dir, ".workflows", "profile.json"));
    const profile = JSON.parse(readFileSync(join(dir, ".workflows", "profile.json"), "utf8"));
    for (const spec of Object.values(profile.scaffolds.kinds) as { template: string }[]) {
      mkdirSync(join(dir, spec.template, ".."), { recursive: true });
      cpSync(join(ROOT, spec.template), join(dir, spec.template));
    }
    git(dir, ["init", "-q"]);
    return dir;
  }

  test("scaffold.sh adr output round-trips through decisions.mjs", () => {
    const dir = scaffoldRepo();

    const scaffold = run(join(dir, "scripts", "scaffold.sh"), ["adr", "probe-name"], dir);
    expect(scaffold.status).toBe(0);

    const rel = scaffold.stdout.trim();
    expect(rel).toMatch(/^\.workflows\/decisions\/DEC-\d{3}\.md$/);

    const record = readFileSync(join(dir, rel), "utf8");
    expect(record.split("\n")[0]).toMatch(/^# DEC-\d{3}: probe-name$/);
    expect(record).toContain("> Status:");
    expect(record).toContain("> Decided-by:");
    expect(record).toContain("> Scope:");
    expect(record).toContain("> Revisit when:");
    expect(record).toMatch(/^Rule: /m);

    const check = spawnSync("node", [join(dir, "scripts", "decisions.mjs"), "check"], {
      cwd: dir,
      encoding: "utf-8",
      timeout: 30000,
    });
    expect(check.stderr).toBe("");
    expect(check.status).toBe(0);
  });

  test("the real ledger is untouched and still CLEAN", () => {
    const result = spawnSync("node", [join(ROOT, "scripts", "decisions.mjs"), "check"], {
      cwd: ROOT,
      encoding: "utf-8",
      timeout: 30000,
    });

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("decisions check: CLEAN");
  });
});

// ── profile-lint: the scaffold target placeholder rule ───────────────────

describe("profile-lint — a target needs a filename placeholder", () => {
  const realProfile = JSON.parse(readFileSync(join(ROOT, ".workflows", "profile.json"), "utf8"));

  /** Real profile with only the adr target replaced, in a dir under the repo
   *  so profile-lint's root walk-up resolves the repo's pointers and gates. */
  function profileWith(target: string): string {
    const dir = tmp();
    const profile = JSON.parse(JSON.stringify(realProfile));
    profile.scaffolds.kinds.adr.target = target;
    const file = join(dir, "profile.json");
    writeFileSync(file, JSON.stringify(profile, null, 2));
    return file;
  }

  test("a {{next:<N>}}-only target is accepted (the DEC-<nnn>.md ledger convention)", () => {
    const result = run(join(ROOT, "scripts", "profile-lint.sh"), [profileWith(".workflows/decisions/DEC-{{next:3}}.md")]);

    expect(result.stdout).toBe("");
    expect(result.status).toBe(0);
  });

  test("a {{name}}-only target stays accepted (backward compatible)", () => {
    const result = run(join(ROOT, "scripts", "profile-lint.sh"), [profileWith("docs/adr-{{name}}.md")]);

    expect(result.status).toBe(0);
  });

  test("a target with neither placeholder is still a finding", () => {
    const result = run(join(ROOT, "scripts", "profile-lint.sh"), [profileWith(".workflows/decisions/DEC-NEXT.md")]);

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("scaffolds.kinds.adr.target");
    expect(result.stdout).toContain("{{next:<N>}}");
  });

  test("the real profile is accepted", () => {
    const result = run(join(ROOT, "scripts", "profile-lint.sh"), [join(ROOT, ".workflows", "profile.json")]);

    expect(result.stdout).toBe("");
    expect(result.status).toBe(0);
  });
});

// ── the repo itself is clean ────────────────────────────────────────────

describe("the real repo passes the new sections", () => {
  test("archive coverage and durable-knowledge audits are clean", () => {
    const archive = drift("archive");
    expect(archive.stderr).toBe("");
    expect(archive.status).toBe(0);

    const durable = drift("durable");
    expect(durable.stderr).toBe("");
    expect(durable.status).toBe(0);
  });

  test("check-drift.sh --only rejects an unknown section", () => {
    const result = drift("nonsense");

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("archive");
  });
});
