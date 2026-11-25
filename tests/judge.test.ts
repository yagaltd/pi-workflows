import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ask, cmdAsk, loadQuestions, mapAnswers, translate } from "../scripts/judge.mjs";

const questions = [
  { id: "tested", question: "Did the tests pass?", schema: { type: "string", enum: ["yes", "no"] } },
  { id: "verdict", question: "Ship or hold?", schema: { type: "string", enum: ["ship", "hold"] } },
  { id: "boolean_q", question: "Is the tree clean?", schema: { type: "boolean" } },
];

describe("judge (plan 20261025-029)", () => {
  test("judge translates enum questions to typesafe noul and choice", async () => {
    const t = translate(questions);
    expect(t.tested.type).toBe("noul");
    expect(t.boolean_q.type).toBe("noul");
    expect(t.verdict.type).toBe("choice");
    expect(t.verdict.criteria).toEqual({ ship: "ship", hold: "hold" });

    let captured = null;
    const fetchImpl = async (url, init) => {
      captured = { url, body: JSON.parse(init.body), auth: init.headers.authorization };
      return { ok: true, status: 200, text: async () => JSON.stringify({ model: "jev-latest", answers: { tested: { type: "noul", noul: 0.98 }, verdict: { type: "choice", choice: "ship", confidence: 0.92, probabilities: { ship: 0.96, hold: 0.04 } }, boolean_q: { type: "noul", noul: 0.9 } }, usage: { input_tokens: 10, output_tokens: 2 } }) };
    };
    const af = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "j-")), "audit.jsonl");
    const r = await ask({ questions, auditFile: af, fetchImpl, key: "k", out: { write: () => {} }, err: { write: () => {} } });
    expect(r.status).toBe(0);
    expect(captured.url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(captured.auth).toBe("Bearer k");
    expect(captured.body.model).toBe("jev-latest");
    expect(Object.keys(captured.body.questions).sort()).toEqual(["boolean_q", "tested", "verdict"]);
    const audit = fs.readFileSync(af, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(audit[0].endpoint).toContain("/v1/systemone");
    expect(audit[0].usage.input_tokens).toBe(10);
  });

  test("judge maps systemone answers to verdict rows with confidence", () => {
    const rows = mapAnswers({ tested: { type: "noul", noul: 0.98 }, hold_q: { type: "noul", noul: 0.2 }, verdict: { type: "choice", choice: "ship", confidence: 0.92, probabilities: { ship: 0.96, hold: 0.04 } } });
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.tested.verdict).toBe("yes");
    expect(byId.tested.confidence).toBeCloseTo(0.98);
    expect(byId.hold_q.verdict).toBe("no");
    expect(byId.hold_q.confidence).toBeCloseTo(0.8);
    expect(byId.verdict.verdict).toBe("ship");
    expect(byId.verdict.probabilities.ship).toBeCloseTo(0.96);
  });

  test("judge skips loudly when no key resolves", async () => {
    const errs = [];
    let called = false;
    const fetchImpl = async () => { called = true; throw new Error("must not be called"); };
    const af = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "j-")), "audit.jsonl");
    const r = await ask({ questions, auditFile: af, fetchImpl, key: "", out: { write: () => {} }, err: { write: (s) => errs.push(s) } });
    expect(r.status).toBe(0);
    expect(r.skipped).toBe(true);
    expect(called).toBe(false);
    expect(errs.join("")).toContain("missing TYPESAFE_API_KEY");
    const audit = fs.readFileSync(af, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(audit[0].status).toBe("skipped");
    expect(audit[0].reason).toContain("auth.json");
  });

  test("unsupported schema shapes are rejected locally", () => {
    expect(() => translate([{ id: "x", question: "q?", schema: { type: "number" } }])).toThrow(/unsupported schema/);
    expect(() => translate([{ id: "x", question: "q?", schema: { type: "object" } }])).toThrow(/unsupported schema/);
  });

  test("loadquestions still validates the question file shape", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "j-"));
    const f = path.join(dir, "q.json");
    fs.writeFileSync(f, JSON.stringify(questions));
    expect(loadQuestions(f)).toHaveLength(3);
    fs.writeFileSync(f, "[]");
    expect(() => loadQuestions(f)).toThrow(/empty question set/);
  });
});

/* ── plan 20261125-082 TASK 1: judge context binding ──────────────────────
 * These tests drive the command surface (cmdAsk) with an injected global
 * fetch so the outgoing payload can be inspected without network access.
 * Context fixtures live under .workflows/specs/ — the only accepted context
 * location — and are removed after each test. */

describe("judge context binding (plan 20261125-082)", () => {
  const specDir = path.join(process.cwd(), ".workflows", "specs");
  const tracked: string[] = [];
  let seq = 0;

  afterEach(() => {
    for (const p of tracked.splice(0)) fs.rmSync(p, { recursive: true, force: true });
  });

  function track(p: string) {
    tracked.push(p);
    return p;
  }

  function specFixture(contents: string | Buffer, name: string) {
    fs.mkdirSync(specDir, { recursive: true });
    const abs = track(path.join(specDir, `judge-ctx-${process.pid}-${Date.now()}-${++seq}-${name}`));
    fs.writeFileSync(abs, contents);
    return { abs, rel: path.relative(process.cwd(), abs) };
  }

  function writeQuestions(rows: unknown[]) {
    const dir = track(fs.mkdtempSync(path.join(os.tmpdir(), "judge-ctx-q-")));
    const file = path.join(dir, "questions.json");
    fs.writeFileSync(file, JSON.stringify(rows));
    return file;
  }

  function freshAudit() {
    const dir = track(fs.mkdtempSync(path.join(os.tmpdir(), "judge-ctx-a-")));
    return path.join(dir, "audit.jsonl");
  }

  function auditRows(file: string) {
    return fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  }

  async function withTransport<T>(key: string, fetchImpl: any, fn: () => Promise<T>): Promise<T> {
    const prevKey = process.env.TYPESAFE_API_KEY;
    const prevBase = process.env.TYPESAFE_BASE_URL;
    const prevFetch = globalThis.fetch;
    process.env.TYPESAFE_API_KEY = key;
    process.env.TYPESAFE_BASE_URL = "https://judge.invalid";
    (globalThis as any).fetch = fetchImpl;
    try {
      return await fn();
    } finally {
      if (prevKey === undefined) delete process.env.TYPESAFE_API_KEY;
      else process.env.TYPESAFE_API_KEY = prevKey;
      if (prevBase === undefined) delete process.env.TYPESAFE_BASE_URL;
      else process.env.TYPESAFE_BASE_URL = prevBase;
      (globalThis as any).fetch = prevFetch;
    }
  }

  /** backend that records the request and answers every question with noul */
  function recordingFetch() {
    const calls: any[] = [];
    const impl = async (url: string, init: any) => {
      const body = JSON.parse(init.body);
      calls.push({ url, body, auth: init.headers.authorization });
      const answers = Object.fromEntries(
        Object.keys(body.questions).map((id) => [id, { type: "noul", noul: 0.92 }])
      );
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ model: "jev-latest", answers, usage: { input_tokens: 10, output_tokens: 2 } }),
      };
    };
    return { calls, impl };
  }

  function forbiddenFetch(calls: unknown[] = []) {
    return async () => {
      calls.push("called");
      throw new Error("network call must not happen");
    };
  }

  async function runCmd(opts: { rows: unknown[]; contexts?: string[]; key?: string; fetchImpl: any }) {
    const qf = writeQuestions(opts.rows);
    const audit = freshAudit();
    const out: string[] = [];
    const err: string[] = [];
    const argv = ["--questions", qf, "--audit", audit];
    for (const ctx of opts.contexts ?? []) argv.push("--context", ctx);
    const status = await withTransport(opts.key ?? "test-key", opts.fetchImpl, () =>
      cmdAsk(argv, { out: { write: (s: string) => out.push(s) }, err: { write: (s: string) => err.push(s) } })
    );
    return { status, audit, out, err };
  }

  test("test_context_binds_spec_text", async () => {
    const marker = "CONTEXT_BINDING_SENTINEL_082_BOUND";
    const contract = `spec: task
name: "judge context binding proof"

## Completion Criteria
  Test: test_context_binds_spec_text
  Then ${marker} appears verbatim in every instruction.
`;
    const spec = specFixture(contract, "bind.spec");
    const rows = [
      { id: "bound", question: `Contract ${spec.rel}: is every scenario mechanically testable?`, schema: { type: "string", enum: ["no", "yes"] } },
      { id: "choice", question: `Contract ${spec.rel}: ship or hold?`, schema: { type: "string", enum: ["ship", "hold"] } },
    ];

    const rec = recordingFetch();
    const run = await runCmd({ rows, contexts: [spec.rel], fetchImpl: rec.impl });
    expect(run.status).toBe(0);
    expect(run.err.join("")).toBe("");
    expect(rec.calls).toHaveLength(1);
    const body = rec.calls[0].body;
    expect(Object.keys(body.questions).sort()).toEqual(["bound", "choice"]);
    for (const q of rows) {
      const instruction = body.questions[q.id].instructions;
      expect(typeof instruction).toBe("string");
      expect(instruction).toContain(marker);
      expect(instruction).toContain("## Completion Criteria");
      expect(instruction.indexOf(marker)).toBeLessThan(instruction.indexOf(q.question));
      expect(instruction).not.toBe(q.question);
      expect(instruction.length).toBeGreaterThan(q.question.length);
    }
  });

  test("test_context_rejects_invalid_files", async () => {
    const target = specFixture("spec: task\n## Valid target\n", "target.spec");
    const linkAbs = track(path.join(specDir, `judge-ctx-${process.pid}-${++seq}-symlink.spec`));
    fs.symlinkSync(target.abs, linkAbs);
    const outsideDir = track(fs.mkdtempSync(path.join(os.tmpdir(), "judge-ctx-outside-")));
    const outside = path.join(outsideDir, "outside.spec");
    fs.writeFileSync(outside, "spec: task\n## Outside the spec directory\n");
    const binary = specFixture(Buffer.from([0xff, 0xfe, 0x00, 0x80, 0x7f]), "binary.spec");
    const keyShaped = specFixture("TYPESAFE_API_KEY=never-send\n", "auth-key.spec");

    const cases = [
      { name: "symlink context", path: path.relative(process.cwd(), linkAbs), token: /symlink|link/i },
      { name: "context outside the spec directory", path: outside, token: /spec director|\.workflows[/\\]specs|outside/i },
      { name: "non-UTF-8 context", path: binary.rel, token: /utf-?8|binary|encoding/i },
      { name: "key-shaped context", path: keyShaped.rel, token: /key|secret|redact|auth|allowed/i },
    ];
    const rows = [{ id: "q", question: "Is the contract complete?", schema: { type: "string", enum: ["no", "yes"] } }];

    for (const c of cases) {
      const calls: unknown[] = [];
      let thrown = "";
      let errText = "";
      try {
        const r = await runCmd({ rows, contexts: [c.path], fetchImpl: forbiddenFetch(calls) });
        errText = r.err.join("");
      } catch (e: any) {
        thrown = e?.message ?? String(e);
      }
      // Match ONLY the rejection text: case labels must not satisfy a token.
      expect(`${thrown}\n${errText}`).toMatch(c.token);
      expect(calls).toHaveLength(0);
    }
  });

  test("test_context_caps_fail_closed", async () => {
    const single = specFixture("x".repeat(70_000), "oversized-single.spec");
    const pairA = specFixture("y".repeat(40_000), "oversized-a.spec");
    const pairB = specFixture("z".repeat(40_000), "oversized-b.spec");
    const rows = [{ id: "q", question: "Is every scenario mechanically testable?", schema: { type: "string", enum: ["no", "yes"] } }];

    for (const contexts of [[single.rel], [pairA.rel, pairB.rel]]) {
      const calls: unknown[] = [];
      const run = await runCmd({ rows, contexts, fetchImpl: forbiddenFetch(calls) });
      expect(run.status).toBe(0);
      expect(calls).toHaveLength(0);
      expect(run.err.join("")).toMatch(/JUDGE SKIPPED[^\n]*cap/i);
      const audit = auditRows(run.audit);
      expect(audit.length).toBeGreaterThanOrEqual(1);
      const entry = audit[audit.length - 1];
      expect(entry.status).toBe("skipped");
      expect(entry.truncated).toBe(true);
      expect(String(entry.reason ?? "")).toMatch(/cap/i);
    }
  });

  test("test_context_preserves_judge_contract", async () => {
    // no-context translation stays byte-identical to the current contract
    expect(translate(questions)).toEqual({
      tested: { type: "noul", instructions: "Did the tests pass?" },
      boolean_q: { type: "noul", instructions: "Is the tree clean?" },
      verdict: { type: "choice", instructions: "Ship or hold?", criteria: { ship: "ship", hold: "hold" } },
    });
    expect(mapAnswers({
      tested: { type: "noul", noul: 0.98 },
      hold_q: { type: "noul", noul: 0.2 },
      verdict: { type: "choice", choice: "ship", confidence: 0.92, probabilities: { ship: 0.96, hold: 0.04 } },
    })).toEqual([
      { id: "tested", verdict: "yes", confidence: 0.98, pYes: 0.98 },
      { id: "hold_q", verdict: "no", confidence: 0.8, pYes: 0.2 },
      { id: "verdict", verdict: "ship", confidence: 0.92, probabilities: { ship: 0.96, hold: 0.04 } },
    ]);

    const spec = specFixture("spec: task\n## Preserved judge contract\n", "preserve.spec");
    const skipped: any[] = [];
    const errNo: string[] = [];
    const errWith: string[] = [];
    const calls: unknown[] = [];
    const fetchImpl = forbiddenFetch(calls);
    const skipNo = await ask({
      questions, auditFile: freshAudit(), fetchImpl, key: "", out: { write: () => {} }, err: { write: (s: string) => errNo.push(s) },
    });
    const skipWith = await ask({
      questions, contextPaths: [spec.rel], auditFile: freshAudit(), fetchImpl, key: "",
      out: { write: () => {} }, err: { write: (s: string) => errWith.push(s) },
    } as any);
    expect(skipWith).toEqual(skipNo);
    expect(skipNo).toEqual({ status: 0, skipped: true });
    expect(errNo.join("")).toBe("JUDGE SKIPPED (missing TYPESAFE_API_KEY (env or ~/.pi/agent/auth.json))\n");
    expect(errWith.join("")).toBe(errNo.join(""));
    expect(calls).toHaveLength(0);

    const baseRec = recordingFetch();
    const boundRec = recordingFetch();
    const base = await runCmd({ rows: questions, fetchImpl: baseRec.impl });
    const bound = await runCmd({ rows: questions, contexts: [spec.rel], fetchImpl: boundRec.impl });
    expect(base.status).toBe(0);
    expect(bound.status).toBe(0);
    expect(bound.err.join("")).toBe("");
    expect(baseRec.calls).toHaveLength(1);
    expect(boundRec.calls).toHaveLength(1);
    expect(bound.out.join("")).toBe(base.out.join(""));
  });

  test("test_context_mock_backend_payload", async () => {
    const markerA = "MOCK_BACKEND_CONTRACT_A_082";
    const markerB = "MOCK_BACKEND_CONTRACT_B_082";
    const a = specFixture(`spec: task\nname: "mock a"\n\n## Completion Criteria\n  Then ${markerA} is bound.\n`, "mock-a.spec");
    const b = specFixture(`spec: task\nname: "mock b"\n\n## Completion Criteria\n  Then ${markerB} is bound.\n`, "mock-b.spec");
    const secretKey = "JUDGE_TEST_KEY_DO_NOT_LEAK_082";
    const rows = [
      { id: "c1", question: `Contract ${a.rel} and ${b.rel}: are all boundaries specific?`, schema: { type: "string", enum: ["no", "yes"] } },
      { id: "c2", question: `Contract ${a.rel} and ${b.rel}: are negative cases present?`, schema: { type: "string", enum: ["no", "yes"] } },
    ];

    const rec = recordingFetch();
    const run = await runCmd({ key: secretKey, rows, contexts: [a.rel, b.rel], fetchImpl: rec.impl });
    expect(run.status).toBe(0);
    expect(rec.calls).toHaveLength(1);
    expect(rec.calls[0].auth).toBe(`Bearer ${secretKey}`);
    const body = rec.calls[0].body;
    for (const q of rows) {
      const instruction = body.questions[q.id].instructions;
      expect(instruction).toContain(markerA);
      expect(instruction).toContain(markerB);
      expect(instruction.indexOf(markerA)).toBeLessThan(instruction.indexOf(q.question));
      expect(instruction.indexOf(markerB)).toBeLessThan(instruction.indexOf(q.question));
    }
    const auditText = fs.readFileSync(run.audit, "utf8");
    expect(auditText).toContain(path.basename(a.abs));
    expect(auditText).toContain(path.basename(b.abs));
    expect(auditText).not.toContain(secretKey);
  });
});
