import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validateFlow } from "../scripts/flow-validate.mjs";
import { requireLiveState } from "./state-helpers";

describe("decision docs (plan 20261025-023)", () => {
  test("flows skill and readme document decision steps and intent-guard", () => {
    const skill = fs.readFileSync("skills/flows/SKILL.md", "utf8");
    expect(skill.toLowerCase()).toContain("decision steps");
    expect(skill).toContain("min_confidence");
    expect(skill).toContain("intent-guard.mjs");
    const readme = fs.readFileSync("README.md", "utf8");
    expect(readme).toContain("Decision steps + intent guard");
    expect(readme).toContain("intent-guard.mjs");
  });

  const demoLive = requireLiveState(".workflows/flows/decision-demo.json", "the shipped decision-demo flow validates clean and dry-runs through flow-run.mjs with exit 0");
  test.skipIf(!demoLive)("examples ship a decision flow and validate clean", () => {
    const file = ".workflows/flows/decision-demo.json";
    const flow = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(validateFlow(flow).ok).toBe(true);
    const runs = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "decide-")), "runs");
    const s = spawnSync("node", ["scripts/flow-run.mjs", file, "--dry-run", "--runs-dir", runs], { encoding: "utf8" });
    expect(s.status).toBe(0);
  });
});
