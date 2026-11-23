/**
 * Deterministic proof of the pi-emphasis render path for the LIVE manager tree.
 * The extension is imported read-only from its installed path; no extension or
 * .workflows file is written. Run `bun prototype/poc/chips.ts | cat -v`.
 */
import {
  createPalette, decorate, VOCABULARY, type ThemeLike,
} from "/home/aurel/.pi/agent/git/github.com/johnlindquist/pi-emphasis/index.ts";

export const REAL_SOURCES = "/home/aurel/Documents/github/pi-workflows/.workflows";

/** The exact ThemeLike fixture shape used by pi-emphasis/test/emphasis.test.ts. */
export const fakeTheme = {
  fg: (color: string, text: string) => `<${color}>${text}</>`,
  getFgAnsi: (color: string) => `\x1b[38;fg-${color}m`,
  getBgAnsi: (color: string) => `\x1b[48;bg-${color}m`,
} as unknown as ThemeLike;

/** Run the real CLI, so the decorated string is the user-facing default tree. */
export function realTree(): string {
  const proc = Bun.spawnSync({
    cmd: ["bun", "prototype/poc/cli.ts", "--sources", REAL_SOURCES],
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  });
  if (proc.exitCode !== 0) throw new Error(new TextDecoder().decode(proc.stderr));
  return new TextDecoder().decode(proc.stdout).trimEnd();
}

export function decorateTree(tree = realTree()): string {
  const palette = createPalette(fakeTheme);
  palette.roundCaps = true; // pinned: Nerd Font caps are on in the proof
  return decorate(tree, palette);
}

/** Show escape bytes instead of relying on chat/terminal ANSI passthrough. */
export const escapeBytes = (s: string): string => s
  .replace(/\u00a0/g, "\\u00a0")
  .replace(/\u001b/g, "\\x1b")
  .replace(/\ue0b6/g, "\\ue0b6")
  .replace(/\ue0b4/g, "\\ue0b4");

/** Only the core VOCABULARY words are legal pill labels in the PoC renderer. */
export const CORE_WORDS = new Set(Object.values(VOCABULARY).flatMap((v) => v.core));

if (import.meta.main) {
  const tree = realTree();
  const decorated = decorateTree(tree);
  console.log("RAW TREE (verbatim):");
  console.log(tree);
  console.log("\nDECORATED TREE (escaped bytes):");
  console.log(escapeBytes(decorated));
  const labels = [...tree.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
  console.log("\nASSERTION INPUTS:");
  console.log(`pills in raw tree: ${JSON.stringify(labels)}`);
  console.log(`all pill words in VOCABULARY core: ${labels.every((l) => CORE_WORDS.has(l))}`);
  console.log(`ANSI fg present: ${/\x1b\[38;/.test(decorated)}; ANSI bg present: ${/\x1b\[48;|^\x1b\[\d+m\x1b\[7m/m.test(decorated)}`);
  console.log(`caps U+E0B6: ${decorated.includes("\ue0b6")}; U+E0B4: ${decorated.includes("\ue0b4")}`);
  console.log(`tree connectors colored: ${/<dim>[├└]──<\/>/.test(decorated)}`);
  console.log(`literal [[ absent: ${!decorated.includes("[[")}`);
}
