import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  ORACLE_FIXTURES,
  ORACLE_MODES,
  evalOracleModes,
  oracleVariationReport,
  recordedOracleBackend,
  scannerOverFixtures,
  type OracleMode,
  type OracleVerdict,
} from "../scripts/bench-intake-triage.ts";

/* ── plan 20261119-079 Task 4: oracle variation between passes ──
 * The harness varies the ORACLE per pass — exact / normalized
 * (NFKC+casefold) / semantic (judge) — and reports per-mode agreement so
 * correlated blind spots become visible: converging agreement across
 * VARIED oracles is earned; across identical bindings it is not. The
 * fixtures include an evasion slice (zero-width separator, homoglyph,
 * case swap, env bypass): exact-mode PASSES the zero-width case, the
 * normalized/scanner modes CATCH it — the correlation trap demonstrated. */

const byId = (rows: OracleVerdict[], id: string, mode: OracleMode) =>
  rows.find((r) => r.id === id && r.mode === mode);

describe("oracle fixtures — the evasion slice", () => {
  test("the slice carries a clean pair plus one fixture per evasion class, with ground truth", () => {
    const classes = ORACLE_FIXTURES.map((f) => f.evasion ?? "clean");
    expect(classes).toContain("clean");
    expect(classes).toContain("zero-width");
    expect(classes).toContain("homoglyph");
    expect(classes).toContain("case-swap");
    expect(classes).toContain("env-read");
    for (const f of ORACLE_FIXTURES) {
      expect(typeof f.compliant).toBe("boolean");
      expect(f.pinned.length).toBeGreaterThan(0);
      expect(f.actual.length).toBeGreaterThan(0);
    }
  });

  test("the zero-width fixture actually carries U+200B in its actual binding", () => {
    const f = ORACLE_FIXTURES.find((x) => x.evasion === "zero-width")!;
    expect(f.actual.includes("\u200B")).toBe(true);
    expect(f.claimed.includes("\u200B")).toBe(false);
  });
});

describe("oracle modes — exact passes the zero-width case, normalized/scanner catch it", () => {
  test("the three oracle modes exist and are reported per fixture", async () => {
    expect(ORACLE_MODES).toEqual(["exact", "normalized", "semantic"]);
    const rows = await evalOracleModes(recordedOracleBackend());
    for (const mode of ORACLE_MODES)
      expect(rows.some((r) => r.mode === mode)).toBe(true);
  });

  test("THE CORRELATION TRAP: exact accepts the zero-width pair; normalized and scanner reject it", async () => {
    const rows = await evalOracleModes(recordedOracleBackend());
    const zw = ORACLE_FIXTURES.find((x) => x.evasion === "zero-width")!;
    expect(byId(rows, zw.id, "exact")?.agreement).toBe(true);
    expect(byId(rows, zw.id, "normalized")?.agreement).toBe(false);
    // the scanner evidence is a byte fact: the zero-width separator is found
    const scans = scannerOverFixtures();
    const zwScan = scans.find((s) => s.id === zw.id)!;
    expect(zwScan.findings.some((f) => f.kind === "invisible-char")).toBe(true);
    // the semantic judge, on scanner evidence, rejects too (recorded replay)
    expect(byId(rows, zw.id, "semantic")?.agreement).toBe(false);
  });

  test("homoglyph: exact accepts, the NFKC fold does NOT fold cyrillic — normalized rejects", async () => {
    const rows = await evalOracleModes(recordedOracleBackend());
    const f = ORACLE_FIXTURES.find((x) => x.evasion === "homoglyph")!;
    expect(byId(rows, f.id, "exact")?.agreement).toBe(true);
    expect(byId(rows, f.id, "normalized")?.agreement).toBe(false);
    expect(byId(rows, f.id, "semantic")?.agreement).toBe(false);
  });

  test("env bypass: the scanner (with the fixture's pins) catches the pinned-name read", async () => {
    const scans = scannerOverFixtures();
    const f = ORACLE_FIXTURES.find((x) => x.evasion === "env-read")!;
    const scan = scans.find((s) => s.id === f.id)!;
    expect(scan.findings.some((x) => x.kind === "env-bypass")).toBe(true);
    const rows = await evalOracleModes(recordedOracleBackend());
    expect(byId(rows, f.id, "exact")?.agreement).toBe(true);
    expect(byId(rows, f.id, "semantic")?.agreement).toBe(false);
  });

  test("clean pair: converging agreement across VARIED oracles — earned", async () => {
    const rows = await evalOracleModes(recordedOracleBackend());
    const f = ORACLE_FIXTURES.find((x) => !x.evasion)!;
    for (const mode of ORACLE_MODES)
      expect(byId(rows, f.id, mode)?.agreement).toBe(true);
  });

  test("case swap: three varied bindings accept what the judge rejects — the blind spot is NAMED", async () => {
    const rows = await evalOracleModes(recordedOracleBackend());
    const f = ORACLE_FIXTURES.find((x) => x.evasion === "case-swap")!;
    expect(byId(rows, f.id, "exact")?.agreement).toBe(true);
    expect(byId(rows, f.id, "normalized")?.agreement).toBe(true);
    expect(byId(rows, f.id, "semantic")?.agreement).toBe(false);
  });

  test("the semantic mode rides the JudgeBackend seam; a skip is loud and never an agreement", async () => {
    let calls = 0;
    const skipping: import("../extensions/index.ts").JudgeBackend = {
      name: "skip-fake",
      async classify() {
        calls++;
        return { skipped: true, bucket: null, confidence: 0, reason: "no key" };
      },
    };
    const rows = await evalOracleModes(skipping);
    expect(calls).toBeGreaterThan(0);
    const semanticRows = rows.filter((r) => r.mode === "semantic");
    expect(semanticRows.length).toBe(ORACLE_FIXTURES.length);
    for (const r of semanticRows) {
      expect(r.agreement).toBe(false);
      expect(r.skipReason).toContain("no key");
    }
  });
});

describe("oracle variation report — correlated blind spots become visible", () => {
  test("the report prints per-fixture per-mode agreement + the variation doctrine", async () => {
    const rows = await evalOracleModes(recordedOracleBackend());
    const lines = oracleVariationReport(ORACLE_FIXTURES, rows);
    const text = lines.join("\n");
    expect(text).toContain("VARIED");
    expect(text).toContain("identical");
    for (const f of ORACLE_FIXTURES) expect(text).toContain(f.id);
  });

  test("the zero-width line reads as UNEARNED (exact-only acceptance on a non-compliant fixture)", async () => {
    const rows = await evalOracleModes(recordedOracleBackend());
    const zw = ORACLE_FIXTURES.find((x) => x.evasion === "zero-width")!;
    const text = oracleVariationReport(ORACLE_FIXTURES, rows)
      .filter((l) => l.includes(zw.id))
      .join("\n");
    expect(text).toContain("UNEARNED");
    expect(text).toContain("exact");
  });

  test("the clean line reads as EARNED (converging agreement across varied oracles)", async () => {
    const rows = await evalOracleModes(recordedOracleBackend());
    const f = ORACLE_FIXTURES.find((x) => !x.evasion)!;
    const text = oracleVariationReport(ORACLE_FIXTURES, rows)
      .filter((l) => l.includes(f.id))
      .join("\n");
    expect(text).toContain("EARNED");
  });
});

describe("the evasion bench mode (scanner over fixtures + variation report)", () => {
  test("CLI: `evasion` prints the scanner findings and the variation report, exit 0 (advisory bench)", () => {
    const r = spawnSync("bun", ["scripts/bench-intake-triage.ts", "evasion"], {
      encoding: "utf8",
      timeout: 120_000,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("oracle variation");
    expect(r.stdout).toContain("zero-width");
    expect(r.stdout).toContain("UNEARNED");
  });
});
