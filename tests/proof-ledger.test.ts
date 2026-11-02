import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main, verifyLast } from "../scripts/proof-ledger.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "proof-"));
const run = (argv) => main(argv);

describe("proof-ledger (plan 20261025-025)", () => {
  test("proof record runs the verifier and records exit with output hash", async () => {
    const dir = tmp();
    const ledger = path.join(dir, "proofs.jsonl");
    expect(await run(["record", "--plan", "p1", "--task", "task-1", "--verify", "echo ok", "--ledger", ledger])).toBe(0);
    expect(await run(["record", "--plan", "p1", "--task", "task-2", "--verify", "exit 3", "--ledger", ledger])).toBe(3);
    const rows = fs.readFileSync(ledger, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(rows).toHaveLength(2);
    expect(rows[0].exit).toBe(0);
    expect(rows[1].exit).toBe(3);
    expect(rows[0].outputHash).toMatch(/^[a-f0-9]{64}$/);
    expect(rows[0].outputHash).not.toBe(rows[1].outputHash);
  });

  test("proof verify re-runs the recorded command and flags drift on hash change", async () => {
    const dir = tmp();
    const ledger = path.join(dir, "proofs.jsonl");
    const marker = path.join(dir, "marker.txt");
    fs.writeFileSync(marker, "v1");
    expect(await run(["record", "--plan", "p1", "--task", "task-1", "--verify", `cat ${marker}`, "--ledger", ledger])).toBe(0);
    fs.writeFileSync(marker, "v2"); // same command, different output → drift
    const code = await run(["verify", "--plan", "p1", "--task", "task-1", "--ledger", ledger]);
    expect(code).toBe(1);
    fs.writeFileSync(marker, "v1");
    expect(await run(["verify", "--plan", "p1", "--task", "task-1", "--ledger", ledger])).toBe(0);
    expect(await run(["verify", "--plan", "p1", "--task", "task-9", "--ledger", ledger])).toBe(1); // no record
  });

  test("record accepts --runner and --kind and stores them", async () => {
    const dir = tmp();
    const ledger = path.join(dir, "proofs.jsonl");
    expect(await run(["record", "--plan", "p1", "--task", "task-1", "--verify", "echo ok", "--runner", "reviewer", "--kind", "not_replayable", "--ledger", ledger])).toBe(0);
    const rows = fs.readFileSync(ledger, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(rows[0].runner).toBe("reviewer");
    expect(rows[0].replayable).toBe(false);
  });

  test("verify classifies replayable-confirmed, replayable-drifted, and not_replayable", async () => {
    const dir = tmp();
    const ledger = path.join(dir, "proofs.jsonl");
    const marker = path.join(dir, "marker.txt");
    fs.writeFileSync(marker, "v1");
    await run(["record", "--plan", "p1", "--task", "replay", "--verify", `cat ${marker}`, "--ledger", ledger]); // no --kind → row lacks replayable → reads true
    await run(["record", "--plan", "p1", "--task", "recorded-nr", "--verify", `cat ${marker}`, "--kind", "not_replayable", "--ledger", ledger]);
    await run(["record", "--plan", "p1", "--task", "fails", "--verify", "exit 5", "--ledger", ledger]);
    const statuses = async (task: string) => {
      const out: string[] = [];
      const orig = console.log;
      console.log = (...a) => out.push(a.join(" "));
      const code = await run(["verify", "--plan", "p1", "--task", task, "--ledger", ledger]);
      console.log = orig;
      return { code, status: JSON.parse(out.join("\n")).status };
    };
    fs.writeFileSync(marker, "v2"); // hash differs on re-run
    expect(await statuses("replay")).toEqual({ code: 1, status: "replayable-drifted" });
    fs.writeFileSync(marker, "v1");
    expect(await statuses("replay")).toEqual({ code: 0, status: "replayable-confirmed" });
    expect(await statuses("recorded-nr")).toEqual({ code: 1, status: "not_replayable" }); // recorded not_replayable → no confirmed replay
    expect(await statuses("fails")).toEqual({ code: 1, status: "not_replayable" }); // re-run exit ≠ 0 is not a confirmed replay
    expect(await statuses("task-9")).toEqual({ code: 1, status: "missing" });
  });

  test("replay with exit mismatch is not replayable-confirmed even when output is byte-identical (plan 20261031-048 BUG-3)", () => {
    const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
    const out = "grep-style output\n";
    // probe 1:1 — a recorded-FAILING proof (exit 1) re-run to exit 0 with identical output
    const recordedFail = [{ planId: "p1", taskId: "t1", command: "grep -q needle file", exit: 1, outputHash: sha256(out) }];
    const drifted = verifyLast(recordedFail, { plan: "p1", task: "t1" }, () => ({ status: 0, stdout: out, stderr: "" }));
    expect(drifted.status).toBe("replayable-drifted");
    expect(drifted.exit).toBe(1);
    // reversed mismatch drifts too: recorded pass re-runs to failure
    const recordedPass = [{ planId: "p1", taskId: "t2", command: "c", exit: 0, outputHash: sha256(out) }];
    expect(verifyLast(recordedPass, { plan: "p1", task: "t2" }, () => ({ status: 1, stdout: out, stderr: "" })).status).toBe("replayable-drifted");
    // a consistent replay of a recorded failure is still no confirmed replay
    expect(verifyLast(recordedFail, { plan: "p1", task: "t1" }, () => ({ status: 1, stdout: out, stderr: "" })).status).toBe("not_replayable");
  });

  test("record --kind rejects unknown kinds fail-closed — usage exit 2, no row written (plan 20261031-048 BUG-4)", async () => {
    const dir = tmp();
    const ledger = path.join(dir, "proofs.jsonl");
    // probe 1:1 — the typo silently recorded replayable:true before the fix
    expect(await run(["record", "--plan", "p1", "--task", "t1", "--verify", "true", "--kind", "not-replayable", "--ledger", ledger])).toBe(2);
    expect(await run(["record", "--plan", "p1", "--task", "t1", "--verify", "true", "--kind", "bogus", "--ledger", ledger])).toBe(2);
    expect(fs.existsSync(ledger)).toBe(false);
    // valid kinds still work
    expect(await run(["record", "--plan", "p1", "--task", "t1", "--verify", "true", "--kind", "replayable", "--ledger", ledger])).toBe(0);
    expect(await run(["record", "--plan", "p1", "--task", "t2", "--verify", "true", "--kind", "not_replayable", "--ledger", ledger])).toBe(0);
    const rows = fs.readFileSync(ledger, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(rows).toHaveLength(2);
    expect(rows[0].replayable).toBe(true);
    expect(rows[1].replayable).toBe(false);
  });

  test("proof show reads the ledger by plan and task", async () => {
    const dir = tmp();
    const ledger = path.join(dir, "proofs.jsonl");
    await run(["record", "--plan", "p1", "--task", "task-1", "--verify", "true", "--ledger", ledger]);
    await run(["record", "--plan", "p2", "--task", "task-1", "--verify", "true", "--ledger", ledger]);
    const out = [];
    const orig = console.log;
    console.log = (...a) => out.push(a.join(" "));
    await run(["show", "--plan", "p1", "--ledger", ledger]);
    console.log = orig;
    const rows = JSON.parse(out.join("\n"));
    expect(rows).toHaveLength(1);
    expect(rows[0].planId).toBe("p1");
  });
});
