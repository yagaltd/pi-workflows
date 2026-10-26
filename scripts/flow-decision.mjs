// flow-decision — typed decision steps for flows (plan 20261025-023).
// One calibrated call per step through the repository's single judge client
// (scripts/judge.mjs `ask` — injected, never re-implemented). Unavailable
// judge ⇒ loud `skipped` (documented gap); unmet assertion ⇒ `fail`.

import { QUESTION_CAP } from "./judge.mjs";

const schemaFor = (q) => {
  switch (q.kind) {
    case "choose": return { type: "string", enum: q.options };
    case "rate": return { type: "string", enum: q.levels };
    case "verify": return { type: "string", enum: ["yes", "no"] };
    case "probability": return { type: "number", minimum: 0, maximum: 1 };
    default: return { type: "string" };
  }
};

/** Flow decision-step questions → judge `{id, question, schema}` set. */
export function judgeQuestions(step) {
  const questions = (step.questions ?? []).map((q) => ({
    id: q.id,
    question: q.prompt,
    schema: schemaFor(q),
  }));
  if (questions.length === 0 || questions.length > QUESTION_CAP) {
    throw new Error(`decision step "${step.id}" needs 1..${QUESTION_CAP} questions`);
  }
  return questions;
}

/**
 * Run one decision step. Returns
 *   {status:"pass", answers} — every assertion met (or none declared)
 *   {status:"fail", reason, answers?} — unmet assertion
 *   {status:"skipped", reason} — judge unavailable (documented gap)
 * Answers: { [questionId]: {value, confidence} } — confidence defaults 1.
 */
export async function runDecisionStep(step, { ask }) {
  let result;
  try {
    result = await ask({ questions: judgeQuestions(step) });
  } catch (e) {
    return { status: "skipped", reason: `judge client error (${e.message})` };
  }
  if (!result || result.skipped) {
    return { status: "skipped", reason: "judge unavailable (NO-JUDGE degradation)" };
  }
  const rows = Array.isArray(result.verdict) ? result.verdict : [];
  const answers = {};
  for (const row of rows) {
    answers[row.id] = { value: row.verdict, confidence: typeof row.confidence === "number" ? row.confidence : 1 };
  }

  const a = step.assert;
  if (a) {
    const ans = answers[a.question];
    if (!ans) return { status: "fail", reason: `assert references unanswered question "${a.question}"`, answers };
    if (a.equals !== undefined && ans.value !== a.equals)
      return { status: "fail", reason: `${a.question} = ${JSON.stringify(ans.value)}, expected ${JSON.stringify(a.equals)}`, answers };
    if (Array.isArray(a.in) && !a.in.includes(ans.value))
      return { status: "fail", reason: `${a.question} = ${JSON.stringify(ans.value)}, expected one of [${a.in.join(", ")}]`, answers };
    if (typeof a.min_confidence === "number" && ans.confidence < a.min_confidence)
      return { status: "fail", reason: `${a.question} confidence ${ans.confidence} < ${a.min_confidence}`, answers };
  }
  return { status: "pass", answers };
}
