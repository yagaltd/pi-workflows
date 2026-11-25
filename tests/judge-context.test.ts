import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/* ── plan 20261125-082 TASK 2: judge-context lint ──
 * Source: .workflows/specs/task-2.spec. The lint is a mechanical pre-flight
 * gate: it parses the question set, never calls the judge and never executes
 * selectors. A path-only contract reference is a finding; the same question
 * with the contract supplied as --context passes. */

const ROOT = path.resolve(import.meta.dir, "..");
const LINT = path.join(ROOT, "scripts", "check-judge-context.mjs");
const FINDING = "path-only judge question; embed the contract or supply it with --context";
const SPEC_REL = path.join(".workflows", "specs", "task-2.spec");
const QUESTIONS_REL = "questions.json";

interface Fixture {
  root: string;
  questions: string;
  context: string;
  audit: string;
}

function makeFixture(question: string): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "judge-context-"));
  const questions = path.join(root, QUESTIONS_REL);
  const context = path.join(root, SPEC_REL);
  fs.mkdirSync(path.dirname(context), { recursive: true });
  fs.writeFileSync(
    questions,
    JSON.stringify([
      {
        id: "contract-binding",
        question,
        schema: { type: "string", enum: ["yes", "no"] },
      },
    ]),
  );
  fs.writeFileSync(context, "spec: task\nname: fixture contract\n---\n\n## Completion Criteria\n");
  return { root, questions, context, audit: path.join(root, "judge-audit.jsonl") };
}

/** Run the lint with judge credentials that would fail fast if used. */
function runLint(fixture: Fixture, args: string[]) {
  return spawnSync("node", [LINT, ...args], {
    cwd: fixture.root,
    encoding: "utf8",
    env: {
      ...process.env,
      JUDGE_AUDIT: fixture.audit,
      TYPESAFE_API_KEY: "test-only-key-never-sent",
      TYPESAFE_BASE_URL: "http://127.0.0.1:1",
      TYPESAFE_TIMEOUT_MS: "100",
    },
  });
}

function cleanup(fixture: Fixture) {
  fs.rmSync(fixture.root, { recursive: true, force: true });
}

describe("judge-context lint (plan 20261125-082 TASK 2)", () => {
  test("test_path_only_question_rejected", () => {
    const fixture = makeFixture(
      `Does ${SPEC_REL.split(path.sep).join("/")} satisfy the contract? Answer yes/no.`,
    );
    try {
      const r = runLint(fixture, ["--questions", QUESTIONS_REL]);
      const out = `${r.stdout}${r.stderr}`;
      expect(r.status).toBe(1);
      expect(out).toContain(FINDING);
      // Parse-only: no judge call, no audit line, no loud-skip marker.
      expect(fs.existsSync(fixture.audit)).toBe(false);
      expect(out).not.toContain("JUDGE SKIPPED");
      expect(out).not.toContain("Bearer ");
    } finally {
      cleanup(fixture);
    }
  });

  test("test_context_supplied_question_passes", () => {
    const fixture = makeFixture(
      `Does ${SPEC_REL.split(path.sep).join("/")} satisfy the contract? Answer yes/no.`,
    );
    try {
      const r = runLint(fixture, [
        "--questions",
        QUESTIONS_REL,
        "--context",
        SPEC_REL.split(path.sep).join("/"),
      ]);
      const out = `${r.stdout}${r.stderr}`;
      expect(r.status).toBe(0);
      expect(out).not.toContain(FINDING);
      expect(out).not.toMatch(/path-only judge question/);
      expect(fs.existsSync(fixture.audit)).toBe(false);
    } finally {
      cleanup(fixture);
    }
  });
});

/* ── plan 20261125-082 TASK 4: a path-free pre-flight set still needs context ──
 * The accepted five-question template names no path at all. Without supplied
 * context the lint must still fail: a path-free question is no more evidence
 * than a path-only one when the contract text was never bound. */
describe("judge-context pre-flight context gate (plan 20261125-082 TASK 4)", () => {
  test("test_lint_requires_context_for_preflight", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "judge-context-preflight-"));
    const relContext = path.join(".workflows", "specs", "task-4.spec").split(path.sep).join("/");
    const questions = path.join(root, "questions.json");
    const audit = path.join(root, "judge-audit.jsonl");
    const ids = [
      "criterion_testable",
      "boundary_complete",
      "ambiguity",
      "missing_scenarios",
      "second_path_violation",
    ];
    const rows = ids.map((id) => ({
      id,
      question: `Is the ${id} finding present in the contract?`,
      schema: { enum: ["yes", "no"] },
    }));
    try {
      fs.mkdirSync(path.dirname(path.join(root, relContext)), { recursive: true });
      fs.writeFileSync(path.join(root, relContext), "spec: task\nname: path-free pre-flight fixture\n---\n\n## Completion Criteria\n");
      fs.writeFileSync(questions, JSON.stringify(rows));

      const env = {
        ...process.env,
        JUDGE_AUDIT: audit,
        TYPESAFE_API_KEY: "test-only-key-never-sent",
        TYPESAFE_BASE_URL: "http://127.0.0.1:1",
        TYPESAFE_TIMEOUT_MS: "100",
      };
      const bare = spawnSync("node", [LINT, "--questions", questions], {
        cwd: root,
        encoding: "utf8",
        env,
        timeout: 30_000,
      });
      const bareOut = `${bare.stdout}${bare.stderr}`;
      expect(bare.status, bareOut).toBe(1);
      expect(bareOut).toContain(FINDING);
      expect(bareOut).not.toContain("JUDGE SKIPPED");
      expect(bareOut).not.toContain("Bearer ");
      expect(fs.existsSync(audit)).toBe(false);

      const bound = spawnSync("node", [LINT, "--questions", questions, "--context", relContext], {
        cwd: root,
        encoding: "utf8",
        env,
        timeout: 30_000,
      });
      const boundOut = `${bound.stdout}${bound.stderr}`;
      expect(bound.status, boundOut).toBe(0);
      expect(boundOut).not.toContain(FINDING);
      expect(fs.existsSync(audit)).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
