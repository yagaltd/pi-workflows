import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildInitPersonaFragment,
  INIT_PERSONA_BEGIN,
  INIT_PERSONA_END,
  mergeAppendSystem,
  mergeInitGitignore,
  readCanonicalPersona,
} from "../scripts/init-extract.ts";

const ROOT = path.resolve(import.meta.dir, "..");
const tempDirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-workflows-init-persona-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length) fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
});

describe("/init --adopt persona installation", () => {
  test("fragment wraps the canonical persona in explicit markers", () => {
    const persona = readCanonicalPersona();
    const fragment = buildInitPersonaFragment(persona);

    expect(INIT_PERSONA_BEGIN).toBe("<!-- pi-workflows:begin main-agent persona -->");
    expect(INIT_PERSONA_END).toBe("<!-- pi-workflows:end main-agent persona -->");
    expect(fragment.startsWith(`${INIT_PERSONA_BEGIN}\n`)).toBe(true);
    expect(fragment).toContain(persona);
    expect(fragment.trimEnd().endsWith(INIT_PERSONA_END)).toBe(true);
  });

  test("canonical persona reads verbatim with an override for tests", () => {
    expect(readCanonicalPersona()).toBe(
      fs.readFileSync(path.join(ROOT, "agents", "orchestrator.md"), "utf8"),
    );

    const overrideRoot = tempDir();
    const override = "# Local persona\n\nKeep this text exactly.\n";
    fs.mkdirSync(path.join(overrideRoot, "agents"));
    fs.writeFileSync(path.join(overrideRoot, "agents", "orchestrator.md"), override);
    expect(readCanonicalPersona(overrideRoot)).toBe(override);
  });

  test("append-system merge creates content from null", () => {
    const fragment = buildInitPersonaFragment("persona text");
    expect(mergeAppendSystem(null, fragment)).toBe(fragment);
  });

  test("append-system merge preserves user content and replaces only the marked block", () => {
    const first = buildInitPersonaFragment("first persona");
    const existing = "# My instructions\n\nKeep this line.\n";
    const created = mergeAppendSystem(existing, first);

    expect(created.startsWith(`${existing}\n${INIT_PERSONA_BEGIN}`)).toBe(true);
    expect(created).toContain("Keep this line.");

    const second = buildInitPersonaFragment("second persona");
    const updated = [
      "before block",
      "",
      INIT_PERSONA_BEGIN,
      "first persona",
      INIT_PERSONA_END,
      "after block",
      "",
    ].join("\n");
    const replaced = mergeAppendSystem(updated, second);

    expect(replaced).toContain("before block");
    expect(replaced).toContain("after block");
    expect(replaced).toContain("second persona");
    expect(replaced).not.toContain("first persona");
    expect(mergeAppendSystem(replaced, second)).toBe(replaced);
  });

  test("gitignore merge adds the persona and WIP negations", () => {
    const merged = mergeInitGitignore("node_modules/\n");

    expect(merged).toContain("node_modules/");
    expect(merged).toContain("!.pi/APPEND_SYSTEM.md");
    expect(merged).toContain("!.workflows/wip/");
  });

  test("gitignore merge converts .pi/ so the negation can take effect", () => {
    const merged = mergeInitGitignore(".pi/\nnode_modules/\n");

    expect(merged).not.toMatch(/^\.pi\/$/m);
    expect(merged).toMatch(/^\.pi\/\*$/m);
    expect(merged.indexOf(".pi/*")).toBeLessThan(merged.indexOf("!.pi/APPEND_SYSTEM.md"));
  });

  test("gitignore merge places the WIP negation after .workflows/*", () => {
    const merged = mergeInitGitignore(".workflows/*\nnode_modules/\n");

    expect(merged).toContain(".workflows/*");
    expect(merged.indexOf(".workflows/*")).toBeLessThan(merged.indexOf("!.workflows/wip/"));
  });

  test("gitignore merge is idempotent", () => {
    const once = mergeInitGitignore(".pi/\n.workflows/*\nnode_modules/\n");
    expect(mergeInitGitignore(once)).toBe(once);
  });

  test("generated append-system content has no relative persona pointer", () => {
    const output = mergeAppendSystem(null, buildInitPersonaFragment(readCanonicalPersona()));
    expect(output).not.toContain("agents/orchestrator.md");
  });
});
