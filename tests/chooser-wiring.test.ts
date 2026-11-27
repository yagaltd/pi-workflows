import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import { requireLiveState } from "./state-helpers";

const read = (p: string) => fs.readFileSync(p, "utf8");
const releaseVersion = () => (JSON.parse(read("package.json")) as { version: string }).version;
const releaseParts = () => read("CHANGELOG.md").split(/(?=^## )/m).filter((part) => part.startsWith("## "));
const releaseEntry = () => releaseParts()[0] ?? "";
// Pre-sweep entries carry the plan id in the preceding release, so the pin
// follows the newest plan-tagged release rather than a fixed historical id.
const releasePlanId = () =>
  releaseParts()
    .slice(0, 2)
    .map((part) => part.match(/\bplan (\d{8}-\d{3})\b/)?.[1] ?? "")
    .find(Boolean) ?? "";

describe("chooser wiring (plan 20261026-032)", () => {
  test("boundaries carry the chooser step and the view rules", () => {
    expect(read("skills/review/SKILL.md")).toContain("format-chooser.mjs choose --for closeout"); // plan 038: the SKILL is the sole flow authority
    expect(read("skills/plan/SKILL.md")).toContain("format-chooser.mjs choose --for plan-approval");
    expect(read("skills/challenge/SKILL.md")).toContain("format-chooser.mjs choose --for challenge");
    const bs = read("skills/brainstorm/SKILL.md");
    expect(bs).toContain("format-chooser.mjs choose --for brainstorm-graduation");
    expect(bs).toContain("never a gate");
    expect(read("skills/review/SKILL.md")).toContain("Overrule needs a stated reason");
    expect(read("README.md")).toContain("## Format chooser");
    expect(read("README.md")).toContain("the correct default");
  });

  test("markmap is retired from brainstorm surfaces", () => {
    const surfaces = [
      "skills/brainstorm/SKILL.md",
      "skills/brainstorm/references/ledger-format.md",
      "prompts/brainstorm.md",
    ]
      .map(read)
      .join("\n");
    expect(surfaces).not.toContain("npx markmap-cli");
    expect(surfaces).not.toContain("initialExpandLevel");
    expect(surfaces).toContain("ledger");
  });

  const queueLive = requireLiveState(
    ".workflows/queue.json",
    "live queue: no E-option row remains, every row carries option what effort risk unblocks recommend as strings, and an empty queue is valid",
  );
  test.skipIf(!queueLive)("queue drops the cancelled e row and may be empty", () => {
    const rows = JSON.parse(read(".workflows/queue.json"));
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.some((r) => r.option.startsWith("E "))).toBe(false);
    for (const r of rows) {
      for (const c of ["option", "what", "effort", "risk", "unblocks", "recommend"]) expect(typeof r[c]).toBe("string");
    }
  });

  test("test_release_changelog_plan_id", () => {
    const entry = releaseEntry();
    const version = releaseVersion();
    const planId = releasePlanId();
    expect(entry).toMatch(/^## \d{4}-\d{2}-\d{2} — v/);
    expect(entry).toContain(`v${version}:`);
    expect(planId).toMatch(/^\d{8}-\d{3}$/);
    expect(releaseParts().slice(0, 2).join("\n")).toContain(`plan ${planId}`);
  });

  test("test_release_pin_current", () => {
    const entry = releaseEntry();
    const version = releaseVersion();
    expect(entry.split("\n")[0]).toContain(`v${version}:`);
    expect(releasePlanId()).toMatch(/^\d{8}-\d{3}$/);
    const changelog = read("CHANGELOG.md");
    expect(changelog.startsWith(entry)).toBe(true);
    expect(changelog.slice(entry.length)).toMatch(/^## /m);
  });
});
