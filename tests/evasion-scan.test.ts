import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  caseNormalizationDiff,
  scanConfusables,
  scanEnvBypass,
  scanInvisibleChars,
  scanText,
  humanLines,
  type EvasionFinding,
} from "../scripts/evasion-scan.ts";

/* ── plan 20261119-079 Task 1: the Tier-0 evasion scanner ──
 * Deterministic, keyless, network-free byte-facts: invisible characters,
 * confusable homoglyphs, env reads of pinned names, case-normalization
 * divergence. Each evasion class gets a fixture that is DETECTED; clean
 * inputs pass silent. The CLI is loud-blocking: exit 1 on any finding,
 * exit 0 clean (house CLI convention). A zero-width separator is a byte
 * fact — scripts close it before any judge is asked (layered doctrine). */

const expectInvisible = (findings: EvasionFinding[], cp: string) =>
  findings.filter((f) => f.kind === "invisible-char" && (f as any).codepoint === cp);

describe("evasion scanner — invisible characters (byte facts)", () => {
  test("zero-width space detected with byte-offset evidence", () => {
    const hits = scanInvisibleChars("alpha\u200B-beta");
    expect(hits).toHaveLength(1);
    expect(hits[0].codepoint).toBe("U+200B");
    expect(hits[0].byteOffset).toBe(5);
    expect(hits[0].line).toBe(1);
  });

  test("the whole invisible family is scanned: ZWSP/ZWNJ/ZWJ, FEFF, 2060, 2061-2064, VS, tag chars", () => {
    const text = "\u200B\u200C\u200D\uFEFF\u2060\u2061\u2062\u2063\u2064\uFE0F";
    const hits = scanInvisibleChars(text);
    const seen = new Set(hits.map((h) => h.codepoint));
    for (const cp of [
      "U+200B", "U+200C", "U+200D", "U+FEFF", "U+2060",
      "U+2061", "U+2062", "U+2063", "U+2064", "U+FE0F",
    ])
      expect(seen.has(cp)).toBe(true);
  });

  test("tag characters (U+E0000+) and multibyte-aware byte offsets", () => {
    // é is 2 bytes in UTF-8 and precedes the tag char at string index 1,
    // so the tag char's byte offset is 2 — the evidence is byte-true.
    const hits = scanInvisibleChars("é\u{E0001}");
    expect(hits).toHaveLength(1);
    expect(hits[0].codepoint).toBe("U+E0001");
    expect(hits[0].byteOffset).toBe(2);
    // astral variation selectors (supplement) are invisible too
    const vs = scanInvisibleChars("a\u{E0100}");
    expect(vs).toHaveLength(1);
  });

  test("clean text passes silent", () => {
    expect(scanInvisibleChars("plain ASCII rule line: alpha-beta, cache.\n")).toHaveLength(0);
    expect(scanInvisibleChars("")).toHaveLength(0);
  });
});

describe("evasion scanner — confusable homoglyphs", () => {
  test("cyrillic lookalike detected: source → base pair with codepoint evidence", () => {
    const hits = scanConfusables("c\u0430che");
    expect(hits).toHaveLength(1);
    expect(hits[0].codepoint).toBe("U+0430");
    expect(hits[0].foldsTo).toBe("a");
  });

  test("the curated cyrillic set (а е о р с у х і) all fold to latin bases", () => {
    const pairs: [string, string][] = [
      ["\u0430", "a"], ["\u0435", "e"], ["\u043E", "o"], ["\u0440", "p"],
      ["\u0441", "c"], ["\u0443", "y"], ["\u0445", "x"], ["\u0456", "i"],
    ];
    for (const [lookalike, base] of pairs) {
      const hits = scanConfusables(lookalike);
      expect(hits).toHaveLength(1);
      expect(hits[0].foldsTo).toBe(base);
    }
  });

  test("fullwidth and math-alphanumeric forms are caught by the NFKC fold", () => {
    expect(scanConfusables("ＡPI")).toHaveLength(1); // U+FF21 fullwidth A
    expect(scanConfusables("𝐀bstract")).toHaveLength(1); // U+1D400 mathematical bold A
  });

  test("clean text passes silent", () => {
    expect(scanConfusables("cache API abstract 123")).toHaveLength(0);
  });
});

describe("evasion scanner — env-bypass reads of pinned names", () => {
  test("exact pin match reported as a pin → read-site pair", () => {
    const hits = scanEnvBypass("const k = process.env.TYPELLM_API_KEY;", ["TYPELLM_API_KEY"]);
    expect(hits).toHaveLength(1);
    expect(hits[0].pin).toBe("TYPELLM_API_KEY");
    expect(hits[0].site).toContain("process.env.TYPELLM_API_KEY");
    expect(hits[0].caseVariant).toBe(false);
  });

  test("case-variant read of a pinned name is caught (the case-swap bypass)", () => {
    const hits = scanEnvBypass("export const soft = process.env.typellm_api_key;", ["TYPELLM_API_KEY"]);
    expect(hits).toHaveLength(1);
    expect(hits[0].caseVariant).toBe(true);
  });

  test("bracket forms: env['NAME'], env[NAME], process.env['NAME']", () => {
    for (const src of [
      `const k = env["TYPELLM_API_KEY"];`,
      `const k = env[TYPELLM_API_KEY];`,
      `const k = process.env["TYPELLM_API_KEY"];`,
      `const k = import.meta.env.TYPELLM_API_KEY;`,
    ]) {
      const hits = scanEnvBypass(src, ["TYPELLM_API_KEY"]);
      expect(hits.length).toBe(1);
      expect(hits[0].pin).toBe("TYPELLM_API_KEY");
    }
  });

  test("unpinned reads stay silent when a pins list scopes the scan; unbound mode reports them", () => {
    expect(scanEnvBypass("const x = process.env.OTHER_KEY;", ["TYPELLM_API_KEY"])).toHaveLength(0);
    const unbound = scanEnvBypass("const x = process.env.OTHER_KEY;");
    expect(unbound).toHaveLength(1);
    expect(unbound[0].pin).toBeNull();
  });
});

describe("evasion scanner — case-normalization diff", () => {
  test("a case-swapped pair is exact-distinct but normalization-equivalent", () => {
    const d = caseNormalizationDiff("ROOT-RULE", "root-rule");
    expect(d.exactEqual).toBe(false);
    expect(d.normalizedEqual).toBe(true);
    expect(d.verdict).toBe("equivalent-only-under-normalization");
  });

  test("identical strings are identical; unrelated strings are distinct", () => {
    expect(caseNormalizationDiff("alpha-beta", "alpha-beta").verdict).toBe("identical");
    const d = caseNormalizationDiff("alpha-beta", "alpha-beta.");
    expect(d.exactEqual).toBe(false);
    expect(d.normalizedEqual).toBe(false);
    expect(d.verdict).toBe("distinct");
  });

  test("a homoglyph pair stays distinct under NFKC+casefold — the scanner closes what the fold cannot", () => {
    const d = caseNormalizationDiff("c\u0430che", "cache");
    expect(d.exactEqual).toBe(false);
    expect(d.normalizedEqual).toBe(false);
    expect(d.verdict).toBe("distinct");
  });
});

describe("evasion scanner — aggregation + CLI (loud blocking)", () => {
  test("scanText aggregates all classes; clean input yields an empty, clean report", () => {
    const dirty = scanText(
      "alpha\u200B-beta and c\u0430che with process.env.TYPELLM_API_KEY",
      ["TYPELLM_API_KEY"]
    );
    const kinds = new Set(dirty.map((f) => f.kind));
    expect(kinds.has("invisible-char")).toBe(true);
    expect(kinds.has("confusable")).toBe(true);
    expect(kinds.has("env-bypass")).toBe(true);
    const clean = scanText("nothing to see here", ["TYPELLM_API_KEY"]);
    expect(clean).toHaveLength(0);
  });

  test("humanLines renders evidence lines for every finding (never an empty report on findings)", () => {
    const dirty = scanText("alpha\u200B-beta", []);
    const lines = humanLines({
      findings: dirty,
      filesScanned: 1,
      clean: false,
    });
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join("\n")).toContain("U+200B");
  });

  test("CLI: a fixture carrying a zero-width char exits 1 with findings on stdout", () => {
    const r = spawnSync(
      "bun",
      ["scripts/evasion-scan.ts", "--json", "--files", "tests/fixtures/evasion/zero-width.txt"],
      { encoding: "utf8", timeout: 60_000 }
    );
    expect(r.status).toBe(1);
    const parsed = JSON.parse(r.stdout);
    expect(parsed.clean).toBe(false);
    expect(parsed.findings.some((f: any) => f.codepoint === "U+200B")).toBe(true);
  });

  test("CLI: the homoglyph, env-bypass fixtures exit 1 (one per class); the clean fixture exits 0", () => {
    for (const [fixture, kind] of [
      ["tests/fixtures/evasion/homoglyph.txt", "confusable"],
      ["tests/fixtures/evasion/env-bypass.ts", "env-bypass"],
    ] as const) {
      const r = spawnSync(
        "bun",
        ["scripts/evasion-scan.ts", "--json", "--pins", "tests/fixtures/evasion/pins.json", "--files", fixture],
        { encoding: "utf8", timeout: 60_000 }
      );
      expect(r.status).toBe(1);
      const parsed = JSON.parse(r.stdout);
      expect(parsed.findings.some((f: any) => f.kind === kind)).toBe(true);
    }
    const clean = spawnSync(
      "bun",
      ["scripts/evasion-scan.ts", "--json", "--pins", "tests/fixtures/evasion/pins.json", "--files", "tests/fixtures/evasion/clean.txt"],
      { encoding: "utf8", timeout: 60_000 }
    );
    expect(clean.status).toBe(0);
    expect(JSON.parse(clean.stdout).clean).toBe(true);
  });

  test("CLI: --case compares a case-swapped pair and reports the divergence verdict", () => {
    const r = spawnSync(
      "bun",
      ["scripts/evasion-scan.ts", "--json", "--case", "ROOT-RULE", "root-rule"],
      { encoding: "utf8", timeout: 60_000 }
    );
    expect(r.status).toBe(1); // an evasion finding (normalization-only equivalence) blocks
    const parsed = JSON.parse(r.stdout);
    expect(parsed.caseDiff.verdict).toBe("equivalent-only-under-normalization");
  });
});
