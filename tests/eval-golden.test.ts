import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  checkDegradation,
  checkDocs,
  checkGate,
  classify,
  compareBaseline,
  docsExpired,
  main,
} from "../scripts/eval-golden.mjs";

describe("classify (run-twice rule)", () => {
  test("agreement is stable", () => {
    expect(classify([true, true])).toBe("pass");
    expect(classify([false, false])).toBe("fail");
  });
  test("disagreement is flaky, never a verdict", () => {
    expect(classify([true, false])).toBe("flaky");
    expect(classify([false, true])).toBe("flaky");
  });
});

describe("compareBaseline (flip semantics)", () => {
  const base = new Map([["a", "pass"], ["b", "pass"], ["c", "fail"]]);
  test("first sighting is new", () => {
    expect(compareBaseline(base, "z", "pass", []).status).toBe("new");
  });
  test("stable pass→fail is a flip; accepted flips pass", () => {
    expect(compareBaseline(base, "a", "fail", []).status).toBe("flip");
    expect(compareBaseline(base, "a", "fail", ["a"]).status).toBe("flip-accepted");
  });
  test("fail→pass is recorded as fixed, never blocks", () => {
    expect(compareBaseline(base, "c", "pass", []).status).toBe("fixed");
  });
  test("flaky is never a flip", () => {
    expect(compareBaseline(base, "a", "flaky", []).status).toBe("flaky");
  });
  test("stable pass stays stable", () => {
    expect(compareBaseline(base, "b", "pass", []).status).toBe("stable");
  });
});

describe("recorded replays (deterministic, no live calls)", () => {
  test("gate PASS requires exit 0", () => {
    expect(checkGate({ recorded: { tool: "lifecycle", exit: 0 }, expected: { verdict: "PASS" } }).ok).toBe(true);
    expect(checkGate({ recorded: { tool: "lifecycle", exit: 0 }, expected: { verdict: "FAIL" } }).ok).toBe(false);
  });
  test("gate FAIL requires non-zero exit AND findings", () => {
    expect(checkGate({ recorded: { tool: "lifecycle", exit: 1, findings: ["x"] }, expected: { verdict: "FAIL" } }).ok).toBe(true);
    expect(checkGate({ recorded: { tool: "lifecycle", exit: 1, findings: [] }, expected: { verdict: "FAIL" } }).ok).toBe(false);
  });
  test("degradation accepts the documented-gap marker or advisory mode", () => {
    expect(checkDegradation({ recorded: { marker: "JUDGE SKIPPED (missing TYPEDLLM_API_KEY)" }, expected: { proceed: true, documented_gap: true } }).ok).toBe(true);
    expect(checkDegradation({ recorded: { mode: "advisory" }, expected: { proceed: true, documented_gap: true } }).ok).toBe(true);
    expect(checkDegradation({ recorded: { marker: "silent skip" }, expected: { proceed: true, documented_gap: true } }).ok).toBe(false);
  });
  test("docs stamp expiry computes from recorded fields", () => {
    const rec = { generated_at: "2026-10-01T00:00:00Z", stale_after_days: 7, now: "2026-10-25T00:00:00Z" };
    expect(docsExpired(rec)).toBe(true);
    expect(checkDocs({ recorded: rec, expected: { finding: "stamp-expired" } }).ok).toBe(true);
    const fresh = { ...rec, generated_at: "2026-10-24T00:00:00Z" };
    expect(checkDocs({ recorded: fresh, expected: { finding: "stamp-expired" } }).ok).toBe(false);
  });
});

describe("dispatcher probe (the real resolveNext)", () => {
  test("dispatcher probe executes the real resolveNext", () => {
    const s = spawnSync("bun", ["scripts/eval-dispatch-probe.ts", "tests/fixtures/evals/dispatch-wave-order.json"], { encoding: "utf8" });
    expect(s.status).toBe(0);
    const out = JSON.parse(s.stdout.trim().split("\n").pop());
    expect(out.ok).toBe(true);
    expect(out.id).toBe("task-1");
    expect(out.wave).toBe(1);
  });
});

describe("scenario bindings (agent-spec lifecycle selectors)", () => {
  test("stable cases classify pass/fail, disagreement classifies flaky", () => {
    expect(classify([true, true])).toBe("pass");
    expect(classify([false, false])).toBe("fail");
    expect(classify([true, false])).toBe("flaky");
  });

  test("baseline diff flags a stable pass-to-fail as a flip", async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "eval-flip-"));
    const gate = { id: "g1", kind: "gate", recorded: { tool: "lifecycle", exit: 0 }, expected: { verdict: "PASS" } };
    fs.writeFileSync(path.join(tmp, "g1.json"), JSON.stringify(gate));
    const bl = path.join(tmp, "b.jsonl");
    expect(await main(["--cases-dir", tmp, "--baseline", bl])).toBe(0);
    fs.writeFileSync(path.join(tmp, "g1.json"), JSON.stringify({ ...gate, recorded: { tool: "lifecycle", exit: 1, findings: ["regressed"] } }));
    expect(await main(["--cases-dir", tmp, "--baseline", bl])).toBe(1);
    expect(await main(["--cases-dir", tmp, "--baseline", bl, "--accept-flip", "g1"])).toBe(0);
  });
});

describe("main end-to-end (temp cases + baseline lifecycle)", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "eval-golden-"));
  const gate = { id: "g1", kind: "gate", recorded: { tool: "lifecycle", exit: 0 }, expected: { verdict: "PASS" } };
  const docs = { id: "d1", kind: "docs", recorded: { generated_at: "2026-10-24T00:00:00Z", stale_after_days: 7, now: "2026-10-25T00:00:00Z" }, expected: { finding: "no-expiry" } };
  fs.writeFileSync(path.join(tmp, "g1.json"), JSON.stringify(gate));
  fs.writeFileSync(path.join(tmp, "d1.json"), JSON.stringify(docs));

  test("first run writes baseline and exits 0", async () => {
    const code = await main(["--cases-dir", tmp, "--baseline", path.join(tmp, "b.jsonl")]);
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(tmp, "b.jsonl"))).toBe(true);
  });
  test("second run reports zero flips", async () => {
    const code = await main(["--cases-dir", tmp, "--baseline", path.join(tmp, "b.jsonl")]);
    expect(code).toBe(0);
  });
  test("tampered baseline yields a blocking flip; acceptance unblocks", async () => {
    const bl = path.join(tmp, "b.jsonl");
    fs.writeFileSync(bl, JSON.stringify({ id: "g1", outcome: "pass" }) + "\n" + JSON.stringify({ id: "d1", outcome: "pass" }) + "\n");
    fs.writeFileSync(path.join(tmp, "d1.json"), JSON.stringify({ ...docs, recorded: { ...docs.recorded, generated_at: "2026-09-01T00:00:00Z" } }));
    const flipped = await main(["--cases-dir", tmp, "--baseline", bl]);
    expect(flipped).toBe(1);
    const accepted = await main(["--cases-dir", tmp, "--baseline", bl, "--accept-flip", "d1"]);
    expect(accepted).toBe(0);
  });
});
