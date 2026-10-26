import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../scripts/proof-ledger.mjs";

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
