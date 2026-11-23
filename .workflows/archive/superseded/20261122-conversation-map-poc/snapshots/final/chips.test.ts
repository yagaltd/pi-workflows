/** Prove the pi-emphasis transformer turns the real tree's pills into colored chips. */
import { describe, expect, test } from "bun:test";
import { CORE_WORDS, decorateTree, escapeBytes, realTree } from "./chips.ts";

const tree = realTree();
const decorated = decorateTree(tree);

describe("pi-emphasis decoration of the live manager tree", () => {
  test("the input really is the live tree with the expected pills", () => {
    expect(tree).toContain("Plan 076");
    expect(tree).toContain("[[Done]]");
    expect(tree).toContain("[[Needs you]]");
    for (const [, label] of tree.matchAll(/\[\[([^\]]+)\]\]/g)) {
      expect(CORE_WORDS.has(label)).toBe(true);
    }
  });

  test("decorated output carries ANSI foreground and background/color sequences", () => {
    expect(decorated).toMatch(/\x1b\[38;/);
    expect(decorated).toMatch(/\x1b\[48;|\x1b\[7m/);
    // Failures print escaped bytes so ANSI never has to survive the chat transport.
    expect(escapeBytes(decorated)).toContain("\\x1b[");
  });

  test("round caps U+E0B6/U+E0B4 are emitted when roundCaps is on", () => {
    expect(decorated).toContain("\ue0b6");
    expect(decorated).toContain("\ue0b4");
  });

  test("tree connectors are colored", () => {
    expect(decorated).toMatch(/<dim>[├└]──<\/>/);
  });

  test("no literal [[Done]] or [[Needs you]] (nor any [[ token) survives", () => {
    expect(decorated).not.toContain("[[Done]]");
    expect(decorated).not.toContain("[[Needs you]]");
    expect(decorated).not.toContain("[[");
  });
});
