#!/usr/bin/env node
// gen-docs.mjs — generate the README commands table from prompts/*.md frontmatter.
//
// The table between `<!-- generated:commands:start -->` and
// `<!-- generated:commands:end -->` in README.md is generated output:
// one row per prompt file (`/<name>` from the filename, description from
// the `description:` frontmatter key, sorted by name). Files declaring
// `hidden: true` are skipped. Everything outside the markers is
// hand-written and byte-preserved.
//
// Usage:
//   node scripts/gen-docs.mjs            regenerate README.md in place
//   node scripts/gen-docs.mjs --check    exit 1 if the section drifted
//   --root <dir>                         operate on a different repo root
//
// Node builtins only, ESM.

import fs from "node:fs";
import path from "node:path";

export const MARK_START = "<!-- generated:commands:start -->";
export const MARK_END = "<!-- generated:commands:end -->";

// Minimal frontmatter parse: the first `---` … `---` block, top-level
// `key: value` lines only (values may be double-quoted). Reuses the same
// frontmatter shape docs-lint.sh gate #1 parses.
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1);
    fm[kv[1]] = v === "true" ? true : v === "false" ? false : v;
  }
  return fm;
}

// prompts/*.md → [{name, description, hidden}]
export function readPrompts(promptsDir) {
  const out = [];
  for (const f of fs.readdirSync(promptsDir).sort()) {
    if (!f.endsWith(".md")) continue;
    const fm = parseFrontmatter(fs.readFileSync(path.join(promptsDir, f), "utf8"));
    out.push({ name: f.replace(/\.md$/, ""), description: fm.description ?? "", hidden: fm.hidden === true });
  }
  return out;
}

export function buildTable(prompts) {
  const rows = ["| Command | What it does |", "|---|---|"];
  for (const p of [...prompts].sort((a, b) => a.name.localeCompare(b.name))) {
    if (p.hidden) continue;
    rows.push(`| \`/${p.name}\` | ${p.description} |`);
  }
  return rows;
}

// The generated section as it should appear between the markers.
export function buildSection(prompts) {
  return [MARK_START, ...buildTable(prompts), MARK_END].join("\n");
}

// Extract the marker-delimited block from README text, or null.
export function readCommands(readmeText) {
  const s = readmeText.indexOf(MARK_START);
  const e = readmeText.indexOf(MARK_END);
  if (s === -1 || e === -1 || e < s) return null;
  return readmeText.slice(s, e + MARK_END.length);
}

export function main(argv = process.argv.slice(2)) {
  const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : process.cwd();
  const check = argv.includes("--check");
  const readmePath = path.join(root, "README.md");
  const promptsDir = path.join(root, "prompts");

  if (!fs.existsSync(readmePath)) {
    console.error(`gen-docs: ${readmePath} not found`);
    return 1;
  }
  if (!fs.existsSync(promptsDir)) {
    console.error(`gen-docs: ${promptsDir} not found`);
    return 1;
  }
  const readme = fs.readFileSync(readmePath, "utf8");
  if (readCommands(readme) === null) {
    console.error(`gen-docs: README.md lacks ${MARK_START} / ${MARK_END} markers`);
    return 1;
  }

  const section = buildSection(readPrompts(promptsDir));
  const start = readme.indexOf(MARK_START);
  const end = readme.indexOf(MARK_END) + MARK_END.length;
  const next = readme.slice(0, start) + section + readme.slice(end);

  if (check) {
    if (next !== readme) {
      console.error("gen-docs: --check failed — README commands section drifted from regeneration.");
      console.error("Run `node scripts/gen-docs.mjs` to regenerate.");
      return 1;
    }
    return 0;
  }
  if (next !== readme) fs.writeFileSync(readmePath, next);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main());
}
