/**
 * Tests for `/restart`'s digest root resolution (plan 20261117-065 TASK 1).
 *
 * The defect: `scripts/resume-digest.sh` used to resolve its root by walking
 * up from `$0`'s directory, with `git rev-parse --show-toplevel` only as a
 * fallback — so the installed package copy, run from a foreign project, digested
 * the pi-workflows clone instead of the caller's repo. The rule now is
 * cwd-first: the cwd's git root wins when it holds `.workflows/`, the
 * script-dir walk-up is the fallback for the digest's own checkout, `--root
 * <dir>` overrides both, and no resolvable root is a loud FAIL.
 *
 * Every case invokes the script BY ABSOLUTE PATH with a temp dir as cwd — the
 * exact shape that used to break. Sections are untouched by this fix, so a
 * foreign plan id reaches the output through the git section (a commit message
 * naming the plan), the way it does in a real project.
 */

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const DIGEST = join(ROOT, "scripts", "resume-digest.sh");
const SECTIONS = [
  "== resume: plan status ==",
  "== resume: dispatcher ==",
  "== resume: log ==",
  "== resume: budget ==",
  "== resume: dirty ==",
  "== resume: gates ==",
  "== resume: git ==",
];

const tmpDirs: string[] = [];

function tmp(): string {
  const dir = mkdtempSync(join(tmpdir(), "resume-digest-"));
  tmpDirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});

function git(dir: string, args: string[]) {
  return spawnSync("git", ["-c", "user.email=t@example.com", "-c", "user.name=t", ...args], {
    cwd: dir,
    encoding: "utf-8",
    timeout: 20000,
  });
}

function digest(script: string, args: string[], cwd: string) {
  return spawnSync("bash", [script, ...args], { cwd, encoding: "utf-8", timeout: 60000 });
}

/**
 * A throwaway git repo carrying a live plan — the foreign caller's repo. The
 * plan id lands in the git section via the commit subject, as in real projects.
 */
function foreignRepo(planId: string): string {
  const dir = tmp();
  expect(git(dir, ["init", "-q"]).status).toBe(0);
  mkdirSync(join(dir, ".workflows"), { recursive: true });
  writeFileSync(
    join(dir, ".workflows", "plan.md"),
    `# Plan ${planId} — foreign\n\n> Plan ID: ${planId}\n> Status: IN PROGRESS\n\n`
      + "- [ ] TASK 1 · wave 1 — foreign work\n",
  );
  expect(git(dir, ["add", "-A"]).status).toBe(0);
  expect(git(dir, ["commit", "-q", "-m", `plan ${planId}: foreign task`]).status).toBe(0);
  return dir;
}

describe("resume-digest resolves the caller's repo (plan 20261117-065 T1)", () => {
  test("test_foreign_repo_plan_is_reported_from_foreign_cwd", () => {
    const dir = foreignRepo("20990101-999");
    const r = digest(DIGEST, [], dir);

    expect(r.status).toBe(0);
    // The foreign repo's own plan and git history — not the digest's checkout.
    expect(r.stdout).toContain("Status: IN PROGRESS");
    expect(r.stdout).not.toContain("note: no live plan");
    expect(r.stdout).toContain("plan 20990101-999: foreign task");
    // Its own gates are absent, so the section degrades to notes — a shape the
    // pi-workflows checkout never prints.
    expect(r.stdout).toContain("note: profile missing — defaults used");
    expect(r.stdout).toContain("note: gate not found: scripts/check-drift.sh");

    // The digest repo's own live plan (if this checkout has one) is not named.
    const ownPlan = join(ROOT, ".workflows", "plan.md");
    if (existsSync(ownPlan)) {
      const own = readFileSync(ownPlan, "utf-8").match(/Plan ID: (\S+)/);
      if (own) expect(r.stdout).not.toContain(own[1]);
    }
  });

  test("test_package_repo_behaviour_unchanged", () => {
    // The digest's own checkout after a SHIP: `.workflows/` (or a git root
    // without one), no live plan, built-in default gates. Reproduced in a temp
    // repo rather than executed against the real one — the real profile runs
    // `bun test`, which would re-enter this file forever, and the real docs
    // gate hits the network. Both resolution branches are covered: cwd-first
    // (with `.workflows/`) and the script-dir fallback (without it).
    for (const withWorkflows of [true, false]) {
      const dir = tmp();
      expect(git(dir, ["init", "-q"]).status).toBe(0);
      mkdirSync(join(dir, "scripts"), { recursive: true });
      const script = join(dir, "scripts", "resume-digest.sh");
      copyFileSync(DIGEST, script);
      if (withWorkflows) mkdirSync(join(dir, ".workflows"));

      // BY ABSOLUTE PATH, cwd = the script's own repo, as `/restart` does.
      const r = digest(script, [], dir);

      expect(r.status).toBe(0);
      for (const header of SECTIONS) expect(r.stdout).toContain(header);
      // Seven fixed sections, in order, once the root is resolved.
      const positions = SECTIONS.map((s) => r.stdout.indexOf(s));
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
      expect(r.stdout).toContain("note: no live plan");
    }
  });

  test("test_non_git_cwd_fails_loudly", () => {
    const dir = tmp();
    // Premise: the cwd is outside any git repo.
    expect(spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: dir }).status).not.toBe(0);

    const r = digest(DIGEST, [], dir);
    const out = `${r.stdout}${r.stderr}`;
    expect(r.status).not.toBe(0);
    expect(out).toContain("FAIL");
    expect(out).toContain(dir);
    // No repo's state is printed before the failure.
    for (const header of SECTIONS) expect(out).not.toContain(header);
  });

  test("test_root_flag_overrides_cwd", () => {
    const foreign = foreignRepo("20990101-777");
    const elsewhere = tmp();

    // cwd is not even a git repo: --root alone decides.
    const r = digest(DIGEST, ["--root", foreign], elsewhere);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Status: IN PROGRESS");
    expect(r.stdout).toContain("plan 20990101-777: foreign task");

    // A --root that is not a git repo with `.workflows/` is a loud failure.
    const bare = tmp();
    expect(git(bare, ["init", "-q"]).status).toBe(0);
    for (const bad of [elsewhere, bare]) {
      const r2 = digest(DIGEST, ["--root", bad], ROOT);
      const out = `${r2.stdout}${r2.stderr}`;
      expect(r2.status).not.toBe(0);
      expect(out).toContain("FAIL");
      for (const header of SECTIONS) expect(out).not.toContain(header);
    }
  });

  test("test_restart_prompt_states_the_resolution_rule", () => {
    const restart = readFileSync(join(ROOT, "prompts", "restart.md"), "utf8");

    // Repo-local script first, package copy second.
    const local = restart.indexOf("bash scripts/resume-digest.sh");
    const pkg = restart.indexOf("installed package copy");
    expect(local).toBeGreaterThan(-1);
    expect(pkg).toBeGreaterThan(local);

    // And it says which repo the digest targets.
    expect(restart).toContain("the repo you are standing in");
  });
});
