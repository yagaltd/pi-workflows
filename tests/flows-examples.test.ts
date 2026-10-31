import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateFlow } from "../scripts/flow-validate.mjs";
import { requireLiveState } from "./state-helpers";

const EXAMPLES = ".workflows/flows";
const examplesLive = requireLiveState([path.join(EXAMPLES, "two-phase-tdd.json"), path.join(EXAMPLES, "docs-ship.json")], "example flows two-phase-tdd and docs-ship validate clean and dry-run through flow-run.mjs with exit 0");

describe("flows examples (plan 20261025-022)", () => {
  test.skipIf(!examplesLive)("example flows validate and dry-run clean", () => {
    for (const name of ["two-phase-tdd", "docs-ship"]) {
      const file = path.join(EXAMPLES, `${name}.json`);
      const flow = JSON.parse(fs.readFileSync(file, "utf8"));
      expect(validateFlow(flow).ok).toBe(true);
      const runs = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "flowex-")), "runs");
      const s = spawnSync("node", ["scripts/flow-run.mjs", file, "--dry-run", "--runs-dir", runs], { encoding: "utf8" });
      expect(s.status).toBe(0);
    }
  });

  test("flows skill and readme document the format", () => {
    const skill = fs.readFileSync("skills/flows/SKILL.md", "utf8");
    expect(skill).toContain("depends_on");
    expect(skill).toContain("flow-run.mjs");
    expect(skill).toContain("bad-dep-wave");
    const readme = fs.readFileSync("README.md", "utf8");
    expect(readme).toContain("## Flows");
    expect(readme).toContain("flow-validate");
  });
});
