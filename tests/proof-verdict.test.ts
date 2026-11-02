import { describe, expect, test } from "bun:test";
import { evidenceVerdict, exampleVerdict } from "../scripts/proof-ledger.mjs";

// Checks shape (plan 20261031-048): { runner?, owner?, status: "passed"|"failed"|"not_replayable", replayable: boolean }
describe("proof-verdict (plan 20261031-048)", () => {
  test("kwant port — unreplayable checks never count as passed", () => {
    // kwant foundry.rs:939 cases, verbatim mapping: not_replayable never counts.
    expect(exampleVerdict([{ status: "not_replayable", replayable: false }])).toBe("not_checked");
    expect(exampleVerdict([])).toBe("not_checked");
    expect(exampleVerdict([{ status: "passed", replayable: true }, { status: "not_replayable", replayable: false }])).toBe("passed");
    expect(exampleVerdict([{ status: "passed", replayable: true }, { status: "failed", replayable: true }])).toBe("failed");
    expect(exampleVerdict([{ status: "error", replayable: true }])).toBe("failed");
  });

  test("evidence verdict — independent replayable check passes", () => {
    expect(evidenceVerdict("worker", [{ runner: "reviewer", status: "passed", replayable: true }])).toBe("passed");
  });

  test("evidence verdict — owner-only evidence holds at not_independent", () => {
    expect(evidenceVerdict("worker", [
      { runner: "worker", status: "passed", replayable: true },
      { runner: "worker", status: "passed", replayable: true },
    ])).toBe("not_independent");
  });

  test("replayable-drifted evidence fails the verdict", () => {
    // A claimed pass whose replay drifted is not evidence — failure outranks independence.
    expect(evidenceVerdict("worker", [{ runner: "reviewer", status: "passed", replayable: false }])).toBe("failed");
  });

  test("historical rows default to worker runner and hold at not_independent", () => {
    // Pre-048 rows carry no runner field; a missing runner reads as owner-run.
    expect(evidenceVerdict("worker", [
      { status: "passed", replayable: true },
      { status: "passed", replayable: true },
    ])).toBe("not_independent");
  });
});
