import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { main, OPEN_DIAGRAM_CLI, parseArgs, renderDiagram } from "../scripts/open-diagram-render.mjs";

const tempDirs: string[] = [];
const TITLE = "Delivery loop: dispatch to ship";

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "odr-"));
  tempDirs.push(dir);
  const spec = path.join(dir, "plan.json");
  fs.writeFileSync(spec, JSON.stringify({ title: TITLE }));
  const out = path.join(dir, "picture");
  return { dir, spec, out };
}

function stubRunner(overrides: { width?: number; height?: number; text?: number; problems?: string[] } = {}) {
  const calls: string[][] = [];
  const { width = 2020, height = 711, text = 10.5, problems = [] } = overrides;
  const run = async (args: string[]) => {
    calls.push(args);
    const out = args[args.indexOf("-o") + 1];
    fs.writeFileSync(`${out}.svg`, "<svg />");
    fs.writeFileSync(`${out}.png`, "PNG");
    const summary =
      `wrote ${out}.svg, ${out}.png: ${width} x ${height} px; smallest text ${text} px; ${problems.length} layout problem(s)`;
    return {
      status: problems.length ? 1 : 0,
      stdout: [summary, ...problems.map((p) => `  - ${p}`), ""].join("\n"),
      stderr: "",
    };
  };
  return { calls, run };
}

afterEach(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("open-diagram renderer seam (plan 20261123-075)", () => {
  test("test_render_writes_artifacts", async () => {
    const { spec, out } = fixture();
    const { calls, run } = stubRunner();
    const result = await renderDiagram({ spec: { path: spec, title: TITLE }, out, run });
    expect(calls).toEqual([[OPEN_DIAGRAM_CLI, "draw", spec, "-o", out]]);
    expect(calls[0][0]).toContain("/home/aurel/.local/share/open-diagram/venv/bin/open-diagram");
    expect(result.svgPath).toBe(`${out}.svg`);
    expect(result.pngPath).toBe(`${out}.png`);
    expect(fs.existsSync(result.svgPath)).toBe(true);
    expect(fs.existsSync(result.pngPath)).toBe(true);
  });

  test("test_render_reports_metrics", async () => {
    const { spec, out } = fixture();
    const { calls, run } = stubRunner();
    const result = await renderDiagram({ spec: { path: spec, title: TITLE }, out, run });
    expect(result.widthPx).toBe(2020);
    expect(result.heightPx).toBe(711);
    expect(result.smallestTextPx).toBe(10.5);
    expect(result.layoutProblems).toBe(0);
    expect(Object.keys(result).sort()).toEqual(
      ["altText", "heightPx", "layoutProblems", "pngPath", "smallestTextPx", "svgPath", "widthPx"].sort(),
    );
    expect(calls.length).toBe(1); // no judge, chooser or policy call on this seam
  });

  test("test_render_returns_alt_text", async () => {
    const { spec, out } = fixture();
    const { run } = stubRunner();
    const result = await renderDiagram({
      spec: { path: spec, title: TITLE, subtitle: "Work flows through gates" },
      out,
      run,
    });
    expect(typeof result.altText).toBe("string");
    expect(result.altText.length).toBeGreaterThan(0);
    expect(result.altText).toContain(TITLE);
    expect(result.altText).toContain("Work flows through gates");
    expect(result.svgPath).toBe(`${out}.svg`);
    expect(result.pngPath).toBe(`${out}.png`);
  });

  test("test_render_fails_on_layout_problem", async () => {
    const { spec, out } = fixture();
    const overlap = stubRunner({ problems: ["'Plan' and 'Ship' overlap; move one"] });
    await expect(renderDiagram({ spec: { path: spec, title: TITLE }, out, run: overlap.run })).rejects.toThrow(
      /overlap/,
    );

    const tiny = stubRunner({ text: 9.5 });
    await expect(renderDiagram({ spec: { path: spec, title: TITLE }, out, run: tiny.run })).rejects.toThrow(
      /9\.5 px.*10 px/,
    );
  });

  test("test_renderer_cli_path_override", async () => {
    const { spec, out } = fixture();
    const stub = path.join(fixture().dir, "open-diagram-stub");
    fs.writeFileSync(
      stub,
      [
        "#!/usr/bin/env bash",
        "target=''",
        "while [ $# -gt 0 ]; do",
        "  if [ \"$1\" = '-o' ]; then target=\"$2\"; shift 2; else shift; fi",
        "done",
        "printf '<svg />\\n' > \"$target.svg\"",
        "printf 'PNG' > \"$target.png\"",
        "printf 'wrote %s.svg, %s.png: 640 x 240 px; smallest text 12 px; 0 layout problem(s)\\n' \"$target\" \"$target\"",
        "",
      ].join("\n"),
      { mode: 0o755 },
    );
    const previous = process.env.OPEN_DIAGRAM_CLI;
    process.env.OPEN_DIAGRAM_CLI = stub;
    try {
      const result = await renderDiagram({ spec: { path: spec, title: TITLE }, out });
      expect(fs.existsSync(result.svgPath)).toBe(true);
      expect(fs.existsSync(result.pngPath)).toBe(true);
      expect(result.widthPx).toBe(640);
      expect(result.heightPx).toBe(240);
      expect(result.smallestTextPx).toBe(12);
      expect(result.layoutProblems).toBe(0);
      expect(result.altText).toContain(TITLE);
    } finally {
      if (previous === undefined) delete process.env.OPEN_DIAGRAM_CLI;
      else process.env.OPEN_DIAGRAM_CLI = previous;
    }
  });

  test("test_render_cli_prints_json_and_rejects_bad_args", async () => {
    const { spec, out } = fixture();
    const { run } = stubRunner();
    const output: string[] = [];
    const errors: string[] = [];
    const code = await main(["--spec", spec, "--title", TITLE, "--out", out], {
      run,
      stdout: { write: (s: string) => output.push(s) },
      stderr: { write: (s: string) => errors.push(s) },
    });
    expect(code).toBe(0);
    expect(JSON.parse(output.join(""))).toMatchObject({
      svgPath: `${out}.svg`,
      pngPath: `${out}.png`,
      layoutProblems: 0,
    });
    expect(errors.join("")).toBe("");
    expect(parseArgs(["--spec", spec, "--out", out]).error).toContain("--title is required");
    const bad = await main(["--spec", spec, "--title", TITLE, "--out", out], {
      run: async () => ({ status: 1, stdout: "", stderr: "boom" }),
      stdout: { write: () => {} },
      stderr: { write: (s: string) => errors.push(s) },
    });
    expect(bad).toBe(1);
    expect(errors.join("")).toContain("boom");
  });
});
