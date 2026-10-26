import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ask, loadQuestions, mapAnswers, translate } from "../scripts/judge.mjs";

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
