import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkTree, main, walk } from "../scripts/check-tree.mjs";

function tmpRepo(manifest) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tree-check-"));
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(path.join(root, ".workflows"), { recursive: true });
  fs.writeFileSync(path.join(root, "README.md"), "readme\n");
  fs.writeFileSync(path.join(root, "src", "a.ts"), "a\n");
  fs.writeFileSync(path.join(root, "docs", "b.md"), "b\n");
  fs.writeFileSync(path.join(root, ".workflows", "x.json"), "{}");
  fs.writeFileSync(path.join(root, "tree.json"), JSON.stringify(manifest));
  return root;
}

describe("check-tree (plan 20261104-060 T2)", () => {
  const fullManifest = {
    roots: ["src", "docs"],
    files: ["README.md", "tree.json"],
    ignore: [".workflows", "node_modules"],
  };

  test("walk lists files relative to root, skipping ignored dirs", () => {
    const root = tmpRepo(fullManifest);
    const files = walk(root, fullManifest.ignore ?? []);
    expect(files).toContain("README.md");
    expect(files).toContain(path.join("src", "a.ts"));
    expect(files).toContain(path.join("docs", "b.md"));
    expect(files).not.toContain(path.join(".workflows", "x.json"));
  });

  test("checkTree passes when every walked file is covered by the manifest", () => {
    const root = tmpRepo(fullManifest);
    expect(checkTree(root, fullManifest)).toEqual({ untracked: [], ok: true });
  });

  test("checkTree flags files outside the manifest", () => {
    const root = tmpRepo(fullManifest);
    fs.writeFileSync(path.join(root, "stray.txt"), "s\n");
    const res = checkTree(root, fullManifest);
    expect(res.ok).toBe(false);
    expect(res.untracked).toEqual(["stray.txt"]);
  });

  test("missing file entries in manifest are flagged", () => {
    const root = tmpRepo({ roots: ["src"], files: ["README.md"], ignore: [".workflows"] });
    const res = checkTree(root, { roots: ["src"], files: ["README.md"], ignore: [".workflows"] });
    expect(res.ok).toBe(false);
    expect(res.untracked).toContain(path.join("docs", "b.md"));
    expect(res.untracked).toContain("tree.json");
  });

  test("main exits 0 (WARN) without --strict, 1 with --strict on findings", () => {
    const root = tmpRepo(fullManifest);
    fs.writeFileSync(path.join(root, "stray.txt"), "s\n");
    expect(main(["--root", root, "--manifest", path.join(root, "tree.json")])).toBe(0);
    expect(main(["--root", root, "--manifest", path.join(root, "tree.json"), "--strict"])).toBe(1);
    // clean repo passes even under --strict
    const clean = tmpRepo(fullManifest);
    expect(main(["--root", clean, "--manifest", path.join(clean, "tree.json"), "--strict"])).toBe(0);
  });
});
