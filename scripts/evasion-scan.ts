#!/usr/bin/env bun
// evasion-scan — the Tier-0 evasion scanner (plan 20261119-079 Task 1).
// Deterministic, keyless, network-free: byte-facts close what a judge's
// reading cannot. "A zero-width separator is a byte fact — scripts close
// it, per the layered doctrine." Runs BEFORE the judge in the review gate;
// its findings ride the verdict batch as evidence.
//
//   evasion-scan --files <f...> [--pins <file>] [--case <a> <b>] [--json]
//
// Scans (per --files entry):
//   1. invisible characters — U+200B–200D, U+FEFF, U+2060, U+2061–2064,
//      variation selectors U+FE00–FE0F, tag/plane-14+ chars U+E0000+ —
//      byte-offset evidence per hit.
//   2. confusable homoglyphs — NFKC fold + a curated confusables map
//      (cyrillic а/е/о/р/с/у/х/і, fullwidth forms, math alphanumerics) —
//      source → lookalike pairs.
//   3. env-bypass reads — process.env.<NAME> / env[<NAME>] /
//      import.meta.env reads of names on the pins list (case-variant reads
//      included) — pin → read-site pairs. Without --pins every read site
//      is reported unbound.
//   4. case-normalization diff (--case <a> <b>) — exact vs NFKC+casefold
//      equivalence verdicts; a normalization-only-equivalent pair is a
//      finding (the exact-match oracle's blind spot).
//
// Output: human lines on stderr, JSON findings on stdout (--json prints
// JSON only). Exit 1 when any evasion finding, exit 0 clean — LOUD
// blocking, the house CLI convention.

import fs from "node:fs";

/* ── invisible characters ── */

const INVISIBLE_NAMES: Record<number, string> = {
  0x200b: "ZERO WIDTH SPACE",
  0x200c: "ZERO WIDTH NON-JOINER",
  0x200d: "ZERO WIDTH JOINER",
  0xfeff: "ZERO WIDTH NO-BREAK SPACE (BOM)",
  0x2060: "WORD JOINER",
  0x2061: "FUNCTION APPLICATION",
  0x2062: "INVISIBLE TIMES",
  0x2063: "INVISIBLE SEPARATOR",
  0x2064: "INVISIBLE PLUS",
};

function invisibleName(cp: number): string {
  if (cp >= 0xfe00 && cp <= 0xfe0f) return `VARIATION SELECTOR-${cp - 0xfe00 + 1}`;
  if (cp >= 0xe0000 && cp <= 0xe007f)
    return `TAG ${cp === 0xe0000 ? "CANCEL" : String.fromCodePoint(cp - 0xe0000)}`;
  if (cp >= 0xe0100 && cp <= 0xe01ef) return `VARIATION SELECTOR-${cp - 0xe0100 + 17}`;
  if (cp >= 0xe0000) return "UNASSIGNED/INVISIBLE PLANE-14+ CODEPOINT";
  return INVISIBLE_NAMES[cp] ?? "INVISIBLE CODEPOINT";
}

function isInvisible(cp: number): boolean {
  return (
    (cp >= 0x200b && cp <= 0x200d) ||
    cp === 0xfeff ||
    (cp >= 0x2060 && cp <= 0x2064) ||
    (cp >= 0xfe00 && cp <= 0xfe0f) ||
    cp >= 0xe0000
  );
}

export interface InvisibleFinding {
  kind: "invisible-char";
  char: string;
  codepoint: string;
  name: string;
  /** UTF-8 byte offset of the hit in the scanned text — the evidence. */
  byteOffset: number;
  line: number;
  context: string;
}

/* ── confusable homoglyphs ── */

/** Curated confusables map: lookalike codepoint → the ASCII base it mimics.
 *  Covers the cyrillic set NFKC cannot fold; fullwidth and math-alphanumeric
 *  forms are caught by the NFKC rule below, not this map. */
const CONFUSABLE_MAP: Record<string, string> = {
  "\u0430": "a", // CYRILLIC SMALL LETTER A
  "\u0435": "e", // CYRILLIC SMALL LETTER IE
  "\u043e": "o", // CYRILLIC SMALL LETTER O
  "\u0440": "p", // CYRILLIC SMALL LETTER ER
  "\u0441": "c", // CYRILLIC SMALL LETTER ES
  "\u0443": "y", // CYRILLIC SMALL LETTER U
  "\u0445": "x", // CYRILLIC SMALL LETTER HA
  "\u0456": "i", // CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I
};

export interface ConfusableFinding {
  kind: "confusable";
  char: string;
  codepoint: string;
  name: string;
  /** The ASCII base character this lookalike mimics. */
  foldsTo: string;
  byteOffset: number;
  line: number;
  context: string;
}

const CONFUSABLE_NAMES: Record<string, string> = {
  "\u0430": "CYRILLIC SMALL LETTER A",
  "\u0435": "CYRILLIC SMALL LETTER IE",
  "\u043e": "CYRILLIC SMALL LETTER O",
  "\u0440": "CYRILLIC SMALL LETTER ER",
  "\u0441": "CYRILLIC SMALL LETTER ES",
  "\u0443": "CYRILLIC SMALL LETTER U",
  "\u0445": "CYRILLIC SMALL LETTER HA",
  "\u0456": "CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I",
};

function confusableName(ch: string): string {
  const cp = ch.codePointAt(0)!;
  return (
    CONFUSABLE_NAMES[ch] ?? `CONFUSABLE LOOKALIKE (NFKC fold) U+${cp.toString(16).toUpperCase()}`
  );
}

function confusableFold(ch: string): string | null {
  const mapped = CONFUSABLE_MAP[ch];
  if (mapped) return mapped;
  // NFKC rule: a non-ASCII char whose NFKC+casefold is exactly one ASCII
  // base-36 alphanumeric is a confusable (fullwidth, math alphanumerics).
  if (ch.charCodeAt(0) < 128) return null;
  const folded = ch.normalize("NFKC").toLowerCase();
  if (folded.length !== 1) return null;
  const c = folded.charCodeAt(0);
  if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122)) return folded;
  return null;
}

/* ── env-bypass reads ── */

export interface CaseDiffFinding {
  kind: "case-diff";
  verdict: CaseVerdict;
  detail: string;
}

export interface ScanErrorFinding {
  kind: "scan-error";
  detail: string;
}

export interface EnvBypassFinding {
  kind: "env-bypass";
  /** The pin this read bypasses; null when the scan ran unbound. */
  pin: string | null;
  /** The read site as written — the evidence. */
  site: string;
  /** True when the read name matches a pin except for case. */
  caseVariant: boolean;
  byteOffset: number;
  line: number;
}

const ENV_PATTERNS: RegExp[] = [
  /process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
  /process\.env\[\s*["']([^"']+)["']\s*\]/g,
  /\benv\[\s*["']([^"']+)["']\s*\]/g,
  /\benv\[\s*([A-Za-z_][A-Za-z0-9_]*)\s*\]/g,
  /import\.meta\.env\.([A-Za-z_][A-Za-z0-9_]*)/g,
  /import\.meta\.env\[\s*["']([^"']+)["']\s*\]/g,
];

/* ── case normalization ── */

/** Casefold beyond toLowerCase: the residual full casefold mappings that
 *  matter here (NFKC already dissolves the ligature/breaking classes). */
const CASEFOLD_EXTRA: Record<string, string> = {
  "ß": "ss",
  "ı": "i",
  "İ": "i̇",
};

/** NFKC + casefold — the "normalized" oracle binding (plan 079 Task 4). */
export function foldNormalized(s: string): string {
  let out = s.normalize("NFKC");
  out = out.replace(/./gu, (ch) => CASEFOLD_EXTRA[ch] ?? ch.toLowerCase());
  return out.normalize("NFKC");
}

export type CaseVerdict =
  | "identical"
  | "equivalent-only-under-normalization"
  | "distinct";

export interface CaseDiff {
  exactEqual: boolean;
  normalizedEqual: boolean;
  verdict: CaseVerdict;
}

export function caseNormalizationDiff(a: string, b: string): CaseDiff {
  const exactEqual = a === b;
  const normalizedEqual = foldNormalized(a) === foldNormalized(b);
  const verdict: CaseVerdict = exactEqual
    ? "identical"
    : normalizedEqual
      ? "equivalent-only-under-normalization"
      : "distinct";
  return { exactEqual, normalizedEqual, verdict };
}

/* ── shared helpers ── */

function byteOffsetAt(text: string, index: number): number {
  return Buffer.byteLength(text.slice(0, index), "utf8");
}

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === "\n") line++;
  return line;
}

/** Visible context: the hit's neighbors with every invisible char escaped
 *  to its `\u{...}` form — the evidence a human can actually read. */
function contextAt(text: string, index: number, width = 24): string {
  const start = Math.max(0, index - width);
  const end = Math.min(text.length, index + width + 1);
  const slice = text.slice(start, end);
  const escaped = [...slice]
    .map((ch) => {
      const cp = ch.codePointAt(0)!;
      if (isInvisible(cp) || cp < 32) return `\\u{${cp.toString(16)}}`;
      return ch;
    })
    .join("");
  return `${start > 0 ? "…" : ""}${escaped}${end < text.length ? "…" : ""}`;
}

function codepointLabel(ch: string): string {
  const cp = ch.codePointAt(0)!;
  return `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

/* ── the scans ── */

export function scanInvisibleChars(text: string): InvisibleFinding[] {
  const findings: InvisibleFinding[] = [];
  let index = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (isInvisible(cp)) {
      findings.push({
        kind: "invisible-char",
        char: ch,
        codepoint: codepointLabel(ch),
        name: invisibleName(cp),
        byteOffset: byteOffsetAt(text, index),
        line: lineAt(text, index),
        context: contextAt(text, index),
      });
    }
    index += ch.length;
  }
  return findings;
}

export function scanConfusables(text: string): ConfusableFinding[] {
  const findings: ConfusableFinding[] = [];
  let index = 0;
  for (const ch of text) {
    const foldsTo = confusableFold(ch);
    if (foldsTo) {
      findings.push({
        kind: "confusable",
        char: ch,
        codepoint: codepointLabel(ch),
        name: confusableName(ch),
        foldsTo,
        byteOffset: byteOffsetAt(text, index),
        line: lineAt(text, index),
        context: contextAt(text, index),
      });
    }
    index += ch.length;
  }
  return findings;
}

export function scanEnvBypass(text: string, pins?: string[]): EnvBypassFinding[] {
  const scoped = pins && pins.length > 0;
  const byName = new Map<string, string>(); // lower → exact pin
  if (scoped) for (const p of pins) byName.set(p.toLowerCase(), p);
  // Gather every pattern match, then keep only NON-OVERLAPPING sites: a
  // `process.env["X"]` hit subsumes the bare `env["X"]` match inside it —
  // one read site, one finding.
  type Match = { start: number; end: number; site: string; name: string };
  const all: Match[] = [];
  for (const pattern of ENV_PATTERNS) {
    pattern.lastIndex = 0;
    for (const m of text.matchAll(pattern)) {
      const start = m.index ?? 0;
      all.push({ start, end: start + m[0].length, site: m[0], name: m[1] });
    }
  }
  all.sort((a, b) => a.start - b.start || b.end - a.end);
  const findings: EnvBypassFinding[] = [];
  let lastEnd = -1;
  for (const m of all) {
    if (m.start < lastEnd) continue; // contained in an already-kept site
    lastEnd = m.end;
    let pin: string | null = null;
    let caseVariant = false;
    if (scoped) {
      const exact = byName.get(m.name.toLowerCase());
      if (exact === undefined) continue; // not a pinned name — silent
      pin = exact;
      caseVariant = exact !== m.name;
    }
    findings.push({
      kind: "env-bypass",
      pin,
      site: m.site,
      caseVariant,
      byteOffset: byteOffsetAt(text, m.start),
      line: lineAt(text, m.start),
    });
  }
  return findings;
}

/* ── aggregation + report ── */

export type EvasionFinding =
  | InvisibleFinding
  | ConfusableFinding
  | EnvBypassFinding
  | CaseDiffFinding
  | ScanErrorFinding;

export interface ScanReport {
  findings: EvasionFinding[];
  filesScanned: number;
  clean: boolean;
  /** The --case verdict when that scan ran. */
  caseDiff?: CaseDiff;
}

export function scanText(text: string, pins?: string[]): EvasionFinding[] {
  return [...scanInvisibleChars(text), ...scanConfusables(text), ...scanEnvBypass(text, pins)];
}

export function scanFiles(paths: string[], pins?: string[]): ScanReport {
  const findings: EvasionFinding[] = [];
  let scanned = 0;
  for (const p of paths) {
    let text: string;
    try {
      text = fs.readFileSync(p, "utf8");
    } catch (e) {
      // a missing file is LOUD: it lands as a finding-shaped error line and
      // blocks the exit — a scan that silently skipped a file proves nothing.
      findings.push({
        kind: "scan-error",
        detail: `unreadable file: ${p}: ${(e as Error).message}`,
      });
      continue;
    }
    scanned++;
    findings.push(...scanText(text, pins));
  }
  return { findings, filesScanned: scanned, clean: findings.length === 0 };
}

export function humanLines(report: ScanReport): string[] {
  const lines: string[] = [];
  if (report.clean && !report.caseDiff)
    return [`evasion-scan: CLEAN — ${report.filesScanned} file(s) scanned, 0 findings`];
  for (const f of report.findings) {
    if (f.kind === "invisible-char")
      lines.push(
        `invisible-char ${f.codepoint} ${f.name} — byte ${f.byteOffset}, line ${f.line}: ${f.context}`
      );
    else if (f.kind === "confusable")
      lines.push(
        `confusable ${f.codepoint} → '${f.foldsTo}' — byte ${f.byteOffset}, line ${f.line}: ${f.context}`
      );
    else if (f.kind === "env-bypass")
      lines.push(
        `env-bypass ${f.pin ? `pin '${f.pin}'` : "unbound read"}${f.caseVariant ? " (CASE-VARIANT)" : ""} — ${f.site} (line ${f.line})`
      );
    else if (f.kind === "case-diff") lines.push(`case-diff: ${f.detail}`);
    else lines.push(`scan-error: ${f.detail}`);
  }
  if (report.caseDiff) {
    const d = report.caseDiff;
    lines.push(
      `case-diff: exact=${d.exactEqual} normalized(NFKC+casefold)=${d.normalizedEqual} → verdict ${d.verdict}` +
        (d.verdict === "equivalent-only-under-normalization"
          ? " (an exact-match oracle would miss this pair)"
          : "")
    );
  }
  return lines;
}

/* ── CLI ── */

function readPins(file: string): string[] {
  const raw = fs.readFileSync(file, "utf8");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((p): p is string => typeof p === "string");
    if (Array.isArray(parsed?.pins))
      return (parsed.pins as unknown[]).filter((p): p is string => typeof p === "string");
  } catch {
    // fall through: one pin per non-empty line
  }
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function argOrFile(value: string): string {
  // a --case argument is a file path when it exists, else the literal string
  try {
    if (fs.existsSync(value) && fs.statSync(value).isFile()) return fs.readFileSync(value, "utf8");
  } catch {
    // treat as literal
  }
  return value;
}

export async function main(argv: string[]): Promise<number> {
  const json = argv.includes("--json");
  const filesIdx = argv.indexOf("--files");
  const pinsIdx = argv.indexOf("--pins");
  const caseIdx = argv.indexOf("--case");
  const files = filesIdx >= 0 ? argv.slice(filesIdx + 1).filter((a) => !a.startsWith("--")) : [];
  const pins = pinsIdx >= 0 ? readPins(argv[pinsIdx + 1]) : undefined;
  const casePair = caseIdx >= 0 ? argv.slice(caseIdx + 1, caseIdx + 3) : null;

  if (!files.length && (!casePair || casePair.length !== 2)) {
    console.error(
      "usage: bun scripts/evasion-scan.ts --files <f...> [--pins <file>] [--case <a> <b>] [--json]"
    );
    return 2;
  }

  const findings: EvasionFinding[] = [];
  let filesScanned = 0;
  if (files.length) {
    const report = scanFiles(files, pins);
    findings.push(...report.findings);
    filesScanned = report.filesScanned;
  }
  let caseDiff: CaseDiff | undefined;
  if (casePair && casePair.length === 2) {
    caseDiff = caseNormalizationDiff(argOrFile(casePair[0]), argOrFile(casePair[1]));
    // a normalization-only-equivalent pair IS an evasion finding: the
    // exact-match oracle that accepted it was bound to nothing.
    if (caseDiff.verdict === "equivalent-only-under-normalization") {
      findings.push({
        kind: "case-diff",
        verdict: caseDiff.verdict,
        detail: `'${casePair[0]}' ≈ '${casePair[1]}' under NFKC+casefold — an exact-match oracle would miss this pair`,
      });
    }
  }

  const report: ScanReport = {
    findings,
    filesScanned,
    clean: findings.length === 0,
    ...(caseDiff !== undefined ? { caseDiff } : {}),
  };

  if (json) console.log(JSON.stringify(report, null, 2));
  for (const line of humanLines(report)) console.error(line);

  return report.clean ? 0 : 1;
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
