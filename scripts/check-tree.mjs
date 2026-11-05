#!/usr/bin/env node
// check-tree.mjs — placement manifest checker (.workflows/tree.json).
//
// Manifest shape (mirrored by tests/tree-check.test.ts fixtures):
//   {
//     "roots":  ["scripts", "prompts", …],   // directories allowed at repo root
//     "files":  ["README.md", "justfile", …],// top-level files allowed at repo root
//     "ignore": [".workflows", …]            // gitignore-style excludes (by name
//   }                                         // or relative path; "name" excludes
//                                              // that dir anywhere in the tree)
//
// Semantics: every file found under the repo root must live inside one of
// the manifest roots, equal one of the manifest files, or be excluded by
// `ignore`. Directories and files not listed are placement findings.
// Default tier is WARN: findings are printed, exit 0. `--strict` exits 1.
//
// Usage:
//   node scripts/check-tree.mjs                    # live repo, WARN tier
//   node scripts/check-tree.mjs --strict           # findings fail
//   --root <dir> --manifest <tree.json>            # test/fixture overrides
//
// Node builtins only, ESM.

import fs from "node:fs";
import path from "node:path";

const ALWAYS_IGNORE = [".git", "node_modules"];

function isIgnored(rel, ignore) {
  const parts = rel.split(path.sep);
  for (const pat of [...ignore, ...ALWAYS_IGNORE]) {
    if (rel === pat || rel.startsWith(pat + path.sep)) return true;
    // bare name excludes that directory anywhere in the tree
    if (!pat.includes("/") && !pat.includes(path.sep) && parts.includes(pat)) return true;
  }
  return false;
}

export function walk(root, ignore = []) {
  const out = [];
  const visit = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = path.join(dir, entry.name);
      const relChild = rel ? path.join(rel, entry.name) : entry.name;
      if (isIgnored(relChild, ignore)) continue;
      if (entry.isDirectory()) visit(child, relChild);
      else if (entry.isFile()) out.push(relChild);
    }
  };
  visit(root, "");
  return out;
}

// → {untracked: string[], ok: boolean}. A walked file is compliant when it
// sits inside a manifest root (or is a manifest file) and is not ignored.
export function checkTree(root, manifest) {
  const roots = manifest.roots ?? [];
  const files = manifest.files ?? [];
  const ignore = manifest.ignore ?? [];
  const untracked = [];
  for (const rel of walk(root, ignore)) {
    const top = rel.split(path.sep)[0];
    if (files.includes(rel)) continue;
    if (roots.includes(top)) continue;
    untracked.push(rel);
  }
  return { untracked, ok: untracked.length === 0 };
}

export function main(argv = process.argv.slice(2)) {
  const root = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : process.cwd();
  const strict = argv.includes("--strict");
  const manifestPath = argv.includes("--manifest")
    ? argv[argv.indexOf("--manifest") + 1]
    : path.join(root, ".workflows", "tree.json");

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (e) {
    console.error(`check-tree: cannot read manifest ${manifestPath}: ${e.message}`);
    return 1;
  }
  const res = checkTree(root, manifest);
  if (res.ok) {
    console.log("check-tree: CLEAN — all files are inside the placement manifest.");
    return 0;
  }
  console.warn(`check-tree: ${res.untracked.length} file(s) outside the manifest (WARN${strict ? ", strict" : ""}):`);
  for (const f of res.untracked) console.warn(`  ${f}`);
  if (strict) {
    console.error("check-tree: FAILED (strict) — add the files to .workflows/tree.json or move them.");
    return 1;
  }
  console.warn("check-tree: WARN tier — findings reported, exit 0 (use --strict to fail).");
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main());
}
