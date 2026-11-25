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
