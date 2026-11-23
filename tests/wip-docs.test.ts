import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { buildInitMiseFragment } from "../scripts/init-extract.ts";

const ROOT = path.resolve(import.meta.dir, "..");
const read = (relative: string): string => fs.readFileSync(path.join(ROOT, relative), "utf8");

describe("WIP docs and init pins", () => {
  test("test_docs_architecture_wip_lifecycle", () => {
    const doc = read("docs/architecture.md");
    const heading = /^## WIP Batch Lifecycle$/m.exec(doc);
    expect(heading).not.toBeNull();
    const sectionStart = heading!.index;
    const section = doc.slice(sectionStart, doc.indexOf("\n## ", sectionStart + 1));
    for (const term of ["emit", "active", "consume", "shipped"]) {
      expect(section.toLowerCase()).toContain(term);
    }
    expect(section).toContain(".workflows/wip/<batch>.json");
    expect(section).toContain("scripts/wip.mjs");
    expect(section).toContain("check-drift.sh");
    expect(section).toContain("dispatch_next");
  });

  test("test_docs_wip_lifecycle_binds_batch_proof", () => {
    const doc = read("docs/architecture.md");
    expect(doc).toContain("task_ids");
    expect(doc).toContain("verified_files");
    expect(doc).toContain("wip ready --verdict");
    expect(doc).toContain("wip verify --scope-file");
    expect(doc).toMatch(/after\s+the\s+commit/i);
  });

  test("test_docs_canon_wip_state", () => {
    const canon = read("docs/canon.md");
    expect(canon).toContain(".workflows/wip/**");
    expect(canon).toMatch(/not\s+a\s+new\s+doc\s+type/i);
    expect(canon).toContain("runtime batch state");
  });

  test("test_init_fragment_includes_wf_wip", () => {
    const fragment = buildInitMiseFragment();
    expect(fragment.match(/^\[tasks\."wf:wip"\]$/gm)?.length ?? 0).toBe(1);
    expect(fragment).toContain(`run = '"$PI_WORKFLOWS_BIN" wip "$@"'`);
    const names = [...fragment.matchAll(/^\[tasks\."([^"]+)"\]$/gm)].map((match) => match[1]);
    expect(names.filter((name) => name === "wf:wip")).toEqual(["wf:wip"]);
  });

  test("test_init_fragment_never_edits_root_mise", () => {
    const fragment = buildInitMiseFragment();
    const skill = read("skills/init/SKILL.md");
    expect(fragment).not.toMatch(/^\[tasks\.(?:check|verify)\]$/m);
    expect(fragment).not.toMatch(/^\s*(?:check|verify)\s*=/m);
    expect(fragment).toContain("The consumer root mise.toml is not edited");
    expect(skill).toContain("do not edit the root `mise.toml`");
    expect(skill).toContain("wf:wip");
  });
});
