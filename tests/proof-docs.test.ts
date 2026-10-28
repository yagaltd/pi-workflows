import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main } from "../scripts/proof-ledger.mjs";

describe("proof docs (plan 20261025-025)", () => {
  test("readme documents the proof ledger; the prompt stays thin (plan 036)", () => {
    const readme = fs.readFileSync("README.md", "utf8");
    expect(readme).toContain("## Proof ledger");
    expect(readme).toContain("proof-ledger.mjs record");
    // plan 20261026-036: record steps moved into the extension — the prompt
    // stays a thin trigger and must NOT carry the record invocation.
    const next = fs.readFileSync("prompts/next.md", "utf8");
    expect(next).not.toContain("proof-ledger.mjs record");
  });

  test("example proof round-trips through record and verify", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proofdoc-"));
    const ledger = path.join(dir, "proofs.jsonl");
    expect(await main(["record", "--plan", "demo", "--task", "task-1", "--verify", "echo proof-demo", "--ledger", ledger])).toBe(0);
    expect(await main(["verify", "--plan", "demo", "--task", "task-1", "--ledger", ledger])).toBe(0);
  });
});
