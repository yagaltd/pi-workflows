import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildSection, buildTable, main, parseFrontmatter, readCommands, readPrompts } from "../scripts/gen-docs.mjs";

const ROOT = path.resolve(import.meta.dir, "..");
const MARK_START = "<!-- generated:commands:start -->";
const MARK_END = "<!-- generated:commands:end -->";

function tmpRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gen-docs-"));
  fs.mkdirSync(path.join(root, "prompts"));
  const prompt = (name, desc, extra = "") =>
    fs.writeFileSync(path.join(root, "prompts", name), `---\ndescription: "${desc}"\n${extra}---\n\nbody\n`);
  prompt("alpha.md", "Alpha — first command");
  prompt("beta.md", "Beta — second command");
  prompt("hidden.md", "Hidden — should not appear", "hidden: true\n");
  fs.writeFileSync(
    path.join(root, "README.md"),
    `# README\n\n## Commands\n\n${MARK_START}\nold table\n${MARK_END}\n\nTail text.\n`,
  );
  return root;
}

describe("gen-docs (plan 20261104-060 T2)", () => {
  test("parseFrontmatter extracts description and hidden", () => {
    const fm = parseFrontmatter('---\ndescription: "Hi there"\nhidden: true\n---\nbody');
    expect(fm.description).toBe("Hi there");
    expect(fm.hidden).toBe(true);
    expect(parseFrontmatter("no frontmatter").description).toBeUndefined();
  });

  test("buildTable renders sorted command rows, skipping hidden prompts", () => {
    const rows = buildTable([
      { name: "beta", description: "Beta — second" },
      { name: "alpha", description: "Alpha — first" },
      { name: "hidden", description: "nope", hidden: true },
    ]);
    expect(rows).toEqual([
      "| Command | What it does |",
      "|---|---|",
      "| `/alpha` | Alpha — first |",
      "| `/beta` | Beta — second |",
    ]);
  });

  test("regeneration is idempotent and preserves text outside markers", () => {
    const root = tmpRepo();
    expect(main(["--root", root])).toBe(0);
    const once = fs.readFileSync(path.join(root, "README.md"), "utf8");
    expect(once).toContain("## Commands");
    expect(once).toContain("| `/alpha` | Alpha — first command |");
    expect(once).not.toContain("old table");
    expect(once.trim().endsWith("Tail text.")).toBe(true);
    expect(main(["--root", root])).toBe(0);
    expect(fs.readFileSync(path.join(root, "README.md"), "utf8")).toBe(once);
  });

  test("--check exits 1 when the section drifts, 0 when in sync", () => {
    const root = tmpRepo();
    main(["--root", root]);
    expect(main(["--root", root, "--check"])).toBe(0);
    const readme = path.join(root, "README.md");
    fs.writeFileSync(readme, fs.readFileSync(readme, "utf8").replace("Alpha", "ALPHA-DRIFT"));
    expect(main(["--root", root, "--check"])).toBe(1);
  });

  test("markers survive regeneration (start and end both present)", () => {
    const root = tmpRepo();
    main(["--root", root]);
    const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
    expect(readme).toContain(MARK_START);
    expect(readme).toContain(MARK_END);
    expect(readme.indexOf(MARK_START)).toBeLessThan(readme.indexOf(MARK_END));
    // readCommands finds the marker-delimited block
    expect(readCommands(readme)).toContain("/alpha");
  });

  test("test_release_generated_docs_clean", () => {
    const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
    const generated = readCommands(readme);
    expect(generated).toBe(buildSection(readPrompts(path.join(ROOT, "prompts"))));

    const rows = [...(generated ?? "").matchAll(/^\| `\/([a-z-]+)` \|/gm)].map((m) => m[1]);
    expect(rows.length).toBeGreaterThan(10);
    for (const name of rows) {
      expect(fs.existsSync(path.join(ROOT, "prompts", `${name}.md`))).toBe(true);
    }

    const prose = readme.replace(generated ?? "", "");
    for (const token of ["Done", "Decision", "Pending", "Failed", "Unverified"]) {
      expect(prose).toContain(token);
    }
    expect(prose).toContain("templates/STATUS-VOCABULARY.md");
    for (const fragment of [
      "decideOutputPolicy",
      "canonical prose",
      ">=3",
      ">=4",
      ">=2",
      "fix loop",
      "state machine",
      "alt text",
      "generated view",
      "mise run output-policy",
      "mise run open-diagram-render",
      "bash scripts/wf.sh output-policy",
      "bash scripts/wf.sh open-diagram-render",
    ]) {
      expect(prose.toLowerCase(), `README prose missing: ${fragment}`).toContain(fragment.toLowerCase());
    }

    const architecture = fs.readFileSync(path.join(ROOT, "docs", "architecture.md"), "utf8").replace(/\s+/g, " ");
    const flow = ["decideOutputPolicy", "format-chooser.mjs", "/status", "closeout.mjs", "TUI renderer"];
    let cursor = -1;
    for (const fragment of flow) {
      const at = architecture.indexOf(fragment, cursor + 1);
      expect(at, `architecture flow missing or out of order: ${fragment}`).toBeGreaterThan(cursor);
      cursor = at;
    }
    for (const statement of [
      "no new judge call",
      "no new TypeLLM path",
      "no change to dispatched-verdict semantics",
      "fix loop",
      "state machine",
      "alt text",
    ]) {
      expect(architecture, `architecture missing: ${statement}`).toContain(statement);
    }
  });
});
