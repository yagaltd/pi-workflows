import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { QUESTION_CAP } from "../scripts/judge.mjs";
import {
  appendHistory,
  buildQuestions,
  classifyTrigger,
  lastHistoryRow,
  loadPacks,
  loadRubric,
  loadThresholds,
  parseArgs,
  runOrchestration,
  scoreAnswers,
} from "../scripts/eval-orchestration.mjs";

const FIX_PACKS = "fixtures/evals/packs";
const FIX_RUBRIC = "fixtures/evals/rubric.json";
const FIX_THRESHOLDS = "fixtures/evals/thresholds.json";
const TH = { floor: 0.8, drift: 0.1, consecutive: 2 };

const tmpHistory = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "eo-")), "history.jsonl");
const silent = { out: { write: () => {} }, err: { write: () => {} } };

/** Fake askImpl: all-yes verdict rows for the given questions (judge.ask shape). */
const allYes = (exceptIds = new Set()) => async ({ questions }) => ({
  status: 0,
  verdict: questions.map((q) => ({ id: q.id, verdict: exceptIds.has(q.id) ? "no" : "yes", confidence: 0.9 })),
});

/** Fake askImpl: skips loudly, like judge.ask with no key. */
const skipped = async () => ({ status: 0, skipped: true });

describe("eval-orchestration fixtures (plan 20261102-052 T1)", () => {
  test("loads 5 packs sorted by id with scenario/packText/roleContext", () => {
    const { packs, error } = loadPacks(FIX_PACKS);
    expect(error).toBeUndefined();
    expect(packs.map((p) => p.id)).toEqual([
      "boundary-violation-attempt",
      "budget-blowout",
      "docs-task",
      "research-task",
      "tdd-task",
    ]);
    for (const p of packs) {
      expect(typeof p.scenario).toBe("string");
      expect(p.packText.length).toBeGreaterThan(200);
      expect(["worker", "scout"]).toContain(p.roleContext);
    }
    expect(packs.find((p) => p.id === "research-task").roleContext).toBe("scout");
  });

  test("boundary-violation-attempt deliberately misses its boundaries section — the judge must catch it", () => {
    const { packs } = loadPacks(FIX_PACKS);
    const bad = packs.find((p) => p.id === "boundary-violation-attempt");
    expect(/## Boundaries/.test(bad.packText)).toBe(false);
    expect(/Allowed:/.test(bad.packText)).toBe(false);
    for (const id of ["tdd-task", "docs-task", "budget-blowout"]) {
      const good = packs.find((p) => p.id === id);
      expect(/## Boundaries/.test(good.packText)).toBe(true);
      expect(/Allowed:/.test(good.packText)).toBe(true);
    }
  });

  test("budget-blowout deliberately misses its budget line", () => {
    const { packs } = loadPacks(FIX_PACKS);
    const bad = packs.find((p) => p.id === "budget-blowout");
    expect(/Budget/i.test(bad.packText)).toBe(false);
    for (const id of ["tdd-task", "docs-task", "research-task"]) {
      const good = packs.find((p) => p.id === id);
      expect(/\d+ tool calls/.test(good.packText)).toBe(true);
    }
  });

  test("rubric fixture: 8 dimensions, 14 questions, unique ids, all yes/no-able", () => {
    const { rubric, questionCount, error } = loadRubric(FIX_RUBRIC);
    expect(error).toBeUndefined();
    expect(Object.keys(rubric.dimensions).sort()).toEqual([
      "boundaries", "budget", "citations", "done-when", "guard", "report", "secrets", "tdd",
    ]);
    expect(questionCount).toBe(14);
    const ids = Object.entries(rubric.dimensions).flatMap(([d, qs]) => qs.map((q) => `${d}:${q.id}`));
    expect(new Set(ids).size).toBe(14);
  });

  test("thresholds fixture: floor 0.8, drift 0.1, consecutive 2", () => {
    const { thresholds, error } = loadThresholds(FIX_THRESHOLDS);
    expect(error).toBeUndefined();
    expect(thresholds).toEqual({ floor: 0.8, drift: 0.1, consecutive: 2 });
  });

  test("loadPacks rejects a pack missing packText", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eo-bad-"));
    fs.writeFileSync(path.join(dir, "x.json"), JSON.stringify({ scenario: "s", roleContext: "worker" }));
    const { error } = loadPacks(dir);
    expect(error).toMatch(/packText/);
  });

  test("loadRubric rejects a rubric exceeding the judge QUESTION_CAP", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "eo-bad-"));
    const big = { dimensions: { x: Array.from({ length: QUESTION_CAP + 1 }, (_, i) => ({ id: `q${i}`, question: "q?" })) } };
    fs.writeFileSync(path.join(dir, "rubric.json"), JSON.stringify(big));
    const { error } = loadRubric(path.join(dir, "rubric.json"));
    expect(error).toMatch(/cap/i);
  });
});

describe("eval-orchestration questions + scoring", () => {
  test("buildQuestions: 14 per pack, dimension-prefixed ids, packText embedded, yes/no schema, under the cap", () => {
    const { packs } = loadPacks(FIX_PACKS);
    const { rubric } = loadRubric(FIX_RUBRIC);
    const qs = buildQuestions(packs[0], rubric);
    expect(qs.length).toBe(14);
    expect(qs.length).toBeLessThanOrEqual(QUESTION_CAP);
    for (const q of qs) {
      expect(q.id).toMatch(/^[a-z-]+:[a-z-]+$/);
      expect(q.schema).toEqual({ type: "string", enum: ["yes", "no"] });
      expect(q.question).toContain(packs[0].packText);
    }
    expect(qs.map((q) => q.id).sort()).toEqual([
      "boundaries:allowed-changes", "boundaries:forbidden", "boundaries:scope-in-tree",
      "budget:budget-number", "budget:budget-stated",
      "citations:file-citations",
      "done-when:done-when-criteria", "done-when:done-when-verify",
      "guard:guard-step",
      "report:report-evidence", "report:report-sections",
      "secrets:no-key-instructions",
      "tdd:tdd-green-suite", "tdd:tdd-red-first",
    ]);
  });

  test("scoreAnswers maps verdict rows to per-dimension ratios; missing answer fails", () => {
    const { packs } = loadPacks(FIX_PACKS);
    const { rubric } = loadRubric(FIX_RUBRIC);
    const qs = buildQuestions(packs[0], rubric);
    const rows = qs.map((q) => ({ id: q.id, verdict: q.id.startsWith("boundaries:") && q.id !== "boundaries:allowed-changes" ? "no" : "yes" }));
    const { perDimension, overall } = scoreAnswers(qs, rows);
    expect(perDimension.boundaries).toBeCloseTo(1 / 3);
    expect(perDimension.budget).toBe(1);
    expect(perDimension.guard).toBe(1);
    expect(overall).toBeCloseTo((1 / 3 + 7) / 8); // 8 rubric dimensions

    const missing = scoreAnswers(qs, rows.filter((r) => r.id !== "guard:guard-step"));
    expect(missing.perDimension.guard).toBe(0);
  });

  test("scoreAnswers: all-no is 0 everywhere", () => {
    const { packs } = loadPacks(FIX_PACKS);
    const { rubric } = loadRubric(FIX_RUBRIC);
    const qs = buildQuestions(packs[0], rubric);
    const { overall } = scoreAnswers(qs, qs.map((q) => ({ id: q.id, verdict: "no" })));
    expect(overall).toBe(0);
  });
});

describe("eval-orchestration trigger rules (pure)", () => {
  const entry = (perDimension) => ({ perDimension, overall: Object.values(perDimension).reduce((a, b) => a + b, 0) / Object.values(perDimension).length });

  test("stable: healthy pair", () => {
    const good = entry({ boundaries: 1, budget: 1 });
    expect(classifyTrigger([good, good], TH)).toBe("stable");
  });

  test("daily-kaizen: exactly one dimension newly below floor, overall drop <= drift", () => {
    const good = entry({ boundaries: 1, budget: 1 });
    const dipped = { perDimension: { boundaries: 0.5, budget: 1 }, overall: 0.9 }; // drop 0.1
    expect(classifyTrigger([good, dipped], TH)).toBe("daily-kaizen");
  });

  test("not daily-kaizen when overall drop exceeds drift → kaizen-event", () => {
    const good = entry({ boundaries: 1, budget: 1 });
    const crater = { perDimension: { boundaries: 0.5, budget: 1 }, overall: 0.85 }; // drop 0.15
    expect(classifyTrigger([good, crater], TH)).toBe("kaizen-event");
  });

  test("kaizen-event: same dimension below floor in 2 consecutive entries", () => {
    const dipped = { perDimension: { boundaries: 0.5, budget: 1 }, overall: 0.95 };
    const dipped2 = { perDimension: { boundaries: 0.4, budget: 1 }, overall: 0.95 };
    expect(classifyTrigger([dipped, dipped2], TH)).toBe("kaizen-event");
  });

  test("kaizen-event: >=2 dimensions below floor in one run", () => {
    const good = entry({ boundaries: 1, budget: 1 });
    const both = { perDimension: { boundaries: 0.5, budget: 0.5 }, overall: 0.5 };
    expect(classifyTrigger([good, both], TH)).toBe("kaizen-event");
  });

  test("first entry alone: one dim below floor → stable (no previous to compare); two dims → kaizen-event", () => {
    const one = { perDimension: { boundaries: 0.5, budget: 1 }, overall: 0.75 };
    expect(classifyTrigger([one], TH)).toBe("stable");
    const two = { perDimension: { boundaries: 0.5, budget: 0.5 }, overall: 0.5 };
    expect(classifyTrigger([two], TH)).toBe("kaizen-event");
  });

  test("daily-kaizen fires for a different newly-dipped dimension", () => {
    const good = entry({ boundaries: 1, budget: 1 });
    const prevDip = { perDimension: { boundaries: 0.5, budget: 1 }, overall: 0.95 };
    const moved = { perDimension: { boundaries: 1, budget: 0.5 }, overall: 0.95 };
    expect(classifyTrigger([good, prevDip, moved], TH)).toBe("daily-kaizen");
  });
});

describe("eval-orchestration history", () => {
  test("appendHistory creates parent dirs; lastHistoryRow reads the last line; malformed → null", () => {
    const f = tmpHistory();
    appendHistory(f, { sha: "a", timestamp: "t1", perDimension: { x: 1 }, overall: 1 });
    appendHistory(f, { sha: "b", timestamp: "t2", perDimension: { x: 0.5 }, overall: 0.5 });
    expect(lastHistoryRow(f)).toEqual({ sha: "b", timestamp: "t2", perDimension: { x: 0.5 }, overall: 0.5 });
    fs.writeFileSync(f, "not json\n");
    expect(lastHistoryRow(f)).toBeNull();
    expect(lastHistoryRow(path.join(f, "missing", "file.jsonl"))).toBeNull();
  });
});

describe("eval-orchestration run (fake askImpl — zero network)", () => {
  const opts = (historyFile, askImpl, extra = {}) => ({
    packsDir: FIX_PACKS, rubricFile: FIX_RUBRIC, thresholdsFile: FIX_THRESHOLDS,
    historyFile, askImpl, shaImpl: () => "deadbeef", nowImpl: () => "2026-11-02T00:00:00.000Z",
    ...silent, ...extra,
  });

  test("one ask per pack (14 questions, under the cap), history row appended, first run prints stable", async () => {
    const f = tmpHistory();
    const calls = [];
    const askImpl = async (args) => { calls.push(args); return allYes()(args); };
    const outLines = [];
    const code = await runOrchestration(opts(f, askImpl, { out: { write: (s) => outLines.push(s) } }));
    expect(code).toBe(0);
    expect(calls.length).toBe(5);
    for (const c of calls) {
      expect(c.questions.length).toBe(14);
      expect(c.questions.length).toBeLessThanOrEqual(QUESTION_CAP);
    }
    const embedded = calls.map((c) => c.questions[0].question.split("\n\nDispatch pack to judge:\n")[1]);
    expect(new Set(embedded).size).toBe(5); // one distinct pack per ask
    const row = lastHistoryRow(f);
    expect(row.sha).toBe("deadbeef");
    expect(row.timestamp).toBe("2026-11-02T00:00:00.000Z");
    expect(Object.values(row.perDimension).every((v) => v === 1)).toBe(true);
    expect(row.overall).toBe(1);
    expect(Object.keys(row).sort()).toEqual(["overall", "perDimension", "sha", "timestamp"]);
    expect(outLines.join("")).toContain("trigger: stable");
  });

  test("second run compares vs previous → daily-kaizen; third → kaizen-event; every measurement exits 0", async () => {
    const f = tmpHistory();
    const out1 = [];
    expect(await runOrchestration(opts(f, allYes(), { out: { write: (s) => out1.push(s) } }))).toBe(0);
    const boundariesNo = allYes(new Set(["boundaries:allowed-changes", "boundaries:forbidden"]));
    const out2 = [];
    expect(await runOrchestration(opts(f, boundariesNo, { out: { write: (s) => out2.push(s) } }))).toBe(0);
    expect(out2.join("")).toContain("trigger: daily-kaizen");
    const out3 = [];
    expect(await runOrchestration(opts(f, boundariesNo, { out: { write: (s) => out3.push(s) } }))).toBe(0);
    expect(out3.join("")).toContain("trigger: kaizen-event");
    expect(fs.readFileSync(f, "utf8").trim().split("\n").length).toBe(3);
    const last = lastHistoryRow(f);
    expect(last.perDimension.boundaries).toBe(1 / 3);
    expect(last.overall).toBeCloseTo((1 / 3 + 7) / 8);
  });

  test("skip path: judge skipped → exit 0, loud JUDGE SKIPPED, NO history row", async () => {
    const f = tmpHistory();
    const errs = [];
    const code = await runOrchestration(opts(f, skipped, { err: { write: (s) => errs.push(s) } }));
    expect(code).toBe(0);
    expect(errs.join("")).toContain("JUDGE SKIPPED");
    expect(errs.join("")).toContain("no history row");
    expect(fs.existsSync(f)).toBe(false);
  });

  test("usage error: missing packs dir → exit 2, no history write", async () => {
    const f = tmpHistory();
    const errs = [];
    const code = await runOrchestration(opts(f, allYes(), { packsDir: "/nonexistent/packs", err: { write: (s) => errs.push(s) } }));
    expect(code).toBe(2);
    expect(errs.join("")).toMatch(/not found|EVAL ORCHESTRATION ERROR/i);
    expect(fs.existsSync(f)).toBe(false);
  });
});

describe("eval-orchestration CLI args", () => {
  test("defaults to fixtures/evals/* and the orchestration history file", () => {
    expect(parseArgs([]).opts).toEqual({
      packs: FIX_PACKS,
      rubric: FIX_RUBRIC,
      thresholds: FIX_THRESHOLDS,
      history: ".workflows/evals/orchestration/history.jsonl",
    });
  });

  test("accepts --packs/--rubric/--thresholds/--history; unknown flag is a usage error", () => {
    expect(parseArgs(["--packs", "p", "--rubric", "r", "--thresholds", "t", "--history", "h"]).opts)
      .toEqual({ packs: "p", rubric: "r", thresholds: "t", history: "h" });
    expect(parseArgs(["--wat"]).error).toMatch(/unknown argument/i);
    expect(parseArgs(["--packs"]).error).toMatch(/requires a value/i);
  });
});
