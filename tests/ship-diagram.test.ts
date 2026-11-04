import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { classifyStatus, buildReport, extractFeatures, parseVerdict, buildBarSpec, main } from "../scripts/ship-diagram.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "ship-"));

const diffLines = [
  "A\tsrc/new.ts",
  "M\tsrc/old.ts",
  "R100\told-name.ts\tnew-name.ts",
  "R084\tlib/a.ts\tlib/b.ts",
  "D\tsrc/gone.ts",
];

describe("ship-diagram (plan 20261104-057 T2)", () => {
  test("(a) classifies git diff --name-status lines: A, M, R, D", () => {
    expect(classifyStatus("A\tsrc/new.ts")).toEqual({ kind: "added", file: "src/new.ts" });
    expect(classifyStatus("M\tsrc/old.ts")).toEqual({ kind: "modified", file: "src/old.ts" });
    expect(classifyStatus("R100\told-name.ts\tnew-name.ts")).toEqual({ kind: "moved", file: "old-name.ts → new-name.ts" });
    expect(classifyStatus("R084\tlib/a.ts\tlib/b.ts")).toEqual({ kind: "moved", file: "lib/a.ts → lib/b.ts" });
    expect(classifyStatus("D\tsrc/gone.ts")).toEqual({ kind: "removed", file: "src/gone.ts" });
    expect(classifyStatus("X\tweird")).toBeNull();
    expect(classifyStatus("")).toBeNull();
  });

  test("(b) markdown report groups files by change kind with counts", () => {
    const md = buildReport("v0.14.10", "HEAD", diffLines);
    expect(md).toContain("# Ship report: v0.14.10..HEAD");
    expect(md).toContain("## Added (1)");
    expect(md).toContain("## Modified (1)");
    expect(md).toContain("## Moved (2)");
    expect(md).toContain("## Removed (1)");
    expect(md).toContain("src/new.ts");
    expect(md).toContain("old-name.ts → new-name.ts");
    expect(md).toContain("Total: 5 files changed");
  });

  test("(c) features extracted from a CHANGELOG version section", () => {
    const changelog = [
      "# Changelog",
      "## v9.9.9",
      "- added the zoom feature",
      "- fixed the crash on startup",
      "",
      "## v9.9.8",
      "- something older",
    ].join("\n");
    const feats = extractFeatures(changelog, "v9.9.9");
    expect(feats).toEqual(["added the zoom feature", "fixed the crash on startup"]);
  });

  test("(d) issues + criticality parsed from a verdict markdown", () => {
    const verdict = [
      "## Review",
      "- Verdict: **ok: true**",
      "- criticality: high",
      "- issue: the parser drops R084 scores",
    ].join("\n");
    const parsed = parseVerdict(verdict);
    expect(parsed.ok).toBe(true);
    expect(parsed.criticality).toBe("high");
    expect(parsed.issues).toEqual(["the parser drops R084 scores"]);
  });

  test("(e) SeeCode bar JSON emitted with nodes for A/M/R/D counts", () => {
    const spec = buildBarSpec("v0.14.10", "HEAD", diffLines);
    expect(spec.type).toBe("bar");
    const labels = Object.fromEntries(spec.data.map(([l, v]) => [l, v]));
    expect(labels).toEqual({ added: 1, modified: 1, moved: 2, removed: 1 });
    expect(spec.unit).toBe("files");
  });

  test("CLI --diff-file writes markdown + bar JSON into out dir", async () => {
    const dir = tmp();
    const diffFile = path.join(dir, "diff.txt");
    const outDir = path.join(dir, "diagrams");
    fs.writeFileSync(diffFile, diffLines.join("\n") + "\n");
    const code = await main(["--from", "v0.14.10", "--to", "HEAD", "--diff-file", diffFile, "--out-dir", outDir]);
    expect(code).toBe(0);
    const md = fs.readFileSync(path.join(outDir, "ship-v0.14.10..HEAD.md"), "utf8");
    expect(md).toContain("# Ship report");
    const json = JSON.parse(fs.readFileSync(path.join(outDir, "ship-v0.14.10..HEAD.json"), "utf8"));
    expect(json.type).toBe("bar");
  });

  test("CLI without --from is a usage error (exit 2)", async () => {
    expect(await main([])).toBe(2);
  });
});
