/**
 * Tests for scripts/pii-scan.mjs — JEV-batched PII advisory pass
 * (plan 20261102-049, task 1).
 *
 * Run: bun test tests/pii-scan.test.ts
 *
 * Self-contained fixtures (mkdtemp tmpdirs; no external fixture files).
 * The judge is exercised through an injected fake askImpl — no network,
 * no key needed (auth.json on this machine may hold a real key; we never
 * let the real ask run in tests).
 *
 * GUARDRAIL — values-never-extract: fixtures embed the sentinel values
 * jane.doe@example.com and SECRETVALUE42 in file VALUES only (CSV data
 * rows, JSON/YAML/TOML values, MD body text, gitleaks Secret/Match fields,
 * binary blob). No scenario places a sentinel in a header row, key,
 * heading, or file name. Every scenario re-asserts ZERO sentinel
 * occurrences in any built state, question set, scan output, or ruler row.
 */

import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  DATA_DOC_EXTENSIONS,
  SPECULATIVE_PII_SET,
  filterDataDocFiles,
  listChangedFiles,
  buildState,
  structureDigest,
  buildQuestions,
  chunkQuestions,
  parseGitleaksReport,
  runScan,
  main,
} from "../scripts/pii-scan.mjs";
import { QUESTION_CAP } from "../scripts/judge.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "pii-scan.mjs");

// ── sentinels + guardrail helper ─────────────────────────────────────────

const EMAIL = "jane.doe@example.com";
const SECRET = "SECRETVALUE42";
const SENTINELS = [EMAIL, SECRET];

function assertNoSentinels(...blobs: string[]) {
  const joined = blobs.join("\n---\n");
  for (const s of SENTINELS) {
    expect(joined.includes(s)).toBe(false);
  }
}

// ── helpers ──────────────────────────────────────────────────────────────

function sink() {
  return {
    text: "",
    write(s: string) {
      this.text += s;
    },
  };
}

/** Self-contained fixtures: sentinels live ONLY in values / body / data rows. */
function makeFixtures(dir: string): Record<string, string> {
  const f = (name: string, content: string | Buffer) => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, content);
    return p;
  };
  return {
    csv: f("contacts.csv", `name,email,api_token\nJane Doe,${EMAIL},${SECRET}\nSecond Person,other@example.invalid,notasecret\n`),
    json: f("user.json", JSON.stringify({ user: { email: EMAIL, auth: { token: SECRET }, roles: ["admin", "dev"] } }, null, 2)),
    yaml: f("config.yaml", `database:\n  host: db.invalid\n  admin_email: ${EMAIL}\nservice:\n  api_token: ${SECRET}\n`),
    toml: f("settings.toml", `[mail]\nsender = "${EMAIL}"\n\n[secrets]\ntoken = "${SECRET}"\n`),
    md: f("notes.md", `# Contacts\n\nReach Jane at ${EMAIL}; rotation ${SECRET}.\n`),
    bin: f("blob.bin", Buffer.from(`binary\x00blob ${EMAIL} ${SECRET}\x00\x01`)),
    badjson: f("broken.json", `{"user": {oops`),
    txt: f("readme.txt", `plain text ${EMAIL}\n`),
  };
}

type AskCall = { file: string | null; questions: any[] };

/**
 * Fake judge askImpl with judge.ask's real return contract:
 * { status: 0, verdict: [{id, verdict, confidence}] } or
 * { status: 0, skipped: true } (+ "JUDGE SKIPPED (...)" on err) for no-key.
 */
function fakeAsk(verdictFor: (file: string, id: string) => "yes" | "no" = () => "no") {
  const calls: AskCall[] = [];
  const askImpl = async ({ questions }: { questions: any[] }) => {
    const file = (String(questions[0]?.question).match(/File "([^"]+)"/) || [])[1] ?? null;
    calls.push({ file, questions });
    return {
      status: 0,
      verdict: questions.map((q: any) => ({ id: q.id, verdict: verdictFor(file ?? "", q.id), confidence: 0.9 })),
    };
  };
  return { askImpl, calls };
}

/** Throwaway git repo: a.json on main; b.csv + c.bin added on feature (=HEAD). */
function initTmpRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-repo-"));
  const g = (cmd: string) => {
    const r = spawnSync("bash", ["-c", `git ${cmd}`], { cwd: dir, encoding: "utf-8" });
    if (r.status !== 0) throw new Error(`git ${cmd} failed: ${r.stderr}`);
  };
  fs.writeFileSync(path.join(dir, "a.json"), "{}\n");
  g("init -b main");
  g("-c user.email=t@t.invalid -c user.name=t add .");
  g("-c user.email=t@t.invalid -c user.name=t commit -m one");
  g("checkout -b feature");
  fs.writeFileSync(path.join(dir, "b.csv"), "col\n");
  fs.writeFileSync(path.join(dir, "c.bin"), Buffer.from("x\x00y"));
  g("add .");
  g("-c user.email=t@t.invalid -c user.name=t commit -m two");
  return dir;
}

// ── scenario 1: changed-file discovery ───────────────────────────────────

describe("scenario 1: changed-file discovery", () => {
  test("git merge-base..HEAD filtered to json/csv/yaml/toml/md; --files overrides discovery", () => {
    // extension filter: data/doc only
    expect(DATA_DOC_EXTENSIONS).toEqual(expect.arrayContaining([".json", ".csv", ".yaml", ".toml", ".md"]));
    expect(filterDataDocFiles(["a.json", "b.csv", "c.yaml", "d.yml", "e.toml", "f.md", "g.txt", "h.bin", "sub/i.json"])).toEqual([
      "a.json", "b.csv", "c.yaml", "d.yml", "e.toml", "f.md", "sub/i.json",
    ]);

    // git discovery in a throwaway repo
    const dir = initTmpRepo();
    try {
      const disc = listChangedFiles({ cwd: dir, base: "main" });
      expect(disc.note).toBeUndefined();
      expect(filterDataDocFiles(disc.files)).toEqual(["b.csv"]); // binary dropped by the filter

      // unresolvable merge-base degrades loudly, never throws
      const miss = listChangedFiles({ cwd: dir, base: "no-such-ref" });
      expect(miss.files).toEqual([]);
      expect(String(miss.note).toLowerCase()).toContain("merge-base");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("--files override bypasses git and drives the scan", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-files-"));
    try {
      const fx = makeFixtures(dir);
      const { askImpl, calls } = fakeAsk();
      const res = await runScan({
        plan: "t1",
        files: [fx.csv, fx.txt],
        askImpl,
        cwd: dir, // no git repo here — proves git was never invoked
        out: sink(),
        err: sink(),
        rulerFile: path.join(dir, "ruler", "reviewed_v1.jsonl"),
      });
      expect(res.exitCode).toBe(0);
      expect(calls.length).toBe(1); // only the csv reaches the judge
      const skipped = res.summary.find((r: any) => String(r.file).endsWith("readme.txt"));
      expect(skipped?.skipped).toBe(true);
      expect(String(skipped?.reason)).toContain("unsupported extension");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── scenario 2: per-file state builder ───────────────────────────────────

describe("scenario 2: per-file state builder", () => {
  test("CSV→header row only; JSON/YAML/TOML→key paths; MD→headings+free-text flag; binary/unparseable→skipped with named reason", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-state-"));
    try {
      const fx = makeFixtures(dir);

      const csv = buildState(fx.csv);
      expect(csv.type).toBe("csv");
      expect(csv.headers).toEqual(["name", "email", "api_token"]); // header row only
      expect(csv.dataRows).toBe(2); // row COUNT only, never row content
      expect(JSON.stringify(csv)).not.toContain("Jane Doe");

      const json = buildState(fx.json);
      expect(json.type).toBe("json");
      expect(json.keyPaths).toEqual(expect.arrayContaining(["user.email", "user.auth", "user.auth.token", "user.roles"]));

      const yaml = buildState(fx.yaml);
      expect(yaml.type).toBe("yaml");
      expect(yaml.keyPaths).toEqual(expect.arrayContaining(["database.host", "database.admin_email", "service.api_token"]));

      const toml = buildState(fx.toml);
      expect(toml.type).toBe("toml");
      expect(toml.keyPaths).toEqual(expect.arrayContaining(["mail.sender", "secrets.token"]));

      const md = buildState(fx.md);
      expect(md.type).toBe("md");
      expect(md.headings).toEqual(["Contacts"]); // heading inventory
      expect(md.freeText).toBe(true); // flag only — body never carried

      const bin = buildState(fx.bin);
      expect(bin.skipped).toBe(true);
      expect(String(bin.reason)).toMatch(/binary/i);

      const bad = buildState(fx.badjson);
      expect(bad.skipped).toBe(true);
      expect(String(bad.reason)).toMatch(/unparseable json/i);

      const txt = buildState(fx.txt);
      expect(txt.skipped).toBe(true);
      expect(String(txt.reason)).toContain("unsupported extension");

      // GUARDRAIL: values never reach any built state
      const all = [csv, json, yaml, toml, md, bin, bad, txt].map((s: any) => JSON.stringify(s));
      assertNoSentinels(...all);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── scenario 3: question fan-out ─────────────────────────────────────────

describe("scenario 3: question fan-out", () => {
  test("≤ 64 questions per call, chunked per file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-q-"));
    try {
      const fx = makeFixtures(dir);

      // one question per speculative PII category, capped by judge's QUESTION_CAP
      const qs = buildQuestions("contacts.csv", buildState(fx.csv));
      expect(qs.length).toBe(SPECULATIVE_PII_SET.length);
      expect(qs.length).toBeLessThanOrEqual(QUESTION_CAP);
      for (const q of qs) {
        expect(String(q.id)).toMatch(/^q\d+-/);
        expect(q.schema).toEqual({ enum: ["yes", "no"] });
        expect(String(q.question)).toContain('File "contacts.csv"');
      }

      // chunker respects the cap
      const many = Array.from({ length: 70 }, (_, i) => ({ id: `q${i}`, question: "x", schema: { enum: ["yes", "no"] } }));
      expect(chunkQuestions(many, QUESTION_CAP).map((c: any[]) => c.length)).toEqual([QUESTION_CAP, 6]);

      // integration: per-file asks, every chunk ≤ 64, never mixed across files
      const { askImpl, calls } = fakeAsk(() => "yes");
      const res = await runScan({
        plan: "t3",
        files: [fx.csv, fx.json, fx.yaml, fx.toml, fx.md],
        askImpl,
        cwd: dir,
        out: sink(),
        err: sink(),
        rulerFile: path.join(dir, "ruler.jsonl"),
      });
      expect(res.exitCode).toBe(0);
      expect(calls.length).toBe(5); // one ask per (question-bearing) file
      for (const c of calls) {
        expect(c.questions.length).toBeLessThanOrEqual(QUESTION_CAP);
        const files = new Set(c.questions.map((q: any) => String(q.question).match(/File "([^"]+)"/)?.[1]));
        expect(files.size).toBe(1); // chunks are per-file
      }

      // GUARDRAIL: values never enter question sets
      assertNoSentinels(...calls.map((c) => JSON.stringify(c)));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── scenario 4: judge wiring ─────────────────────────────────────────────

describe("scenario 4: judge wiring", () => {
  test("imports ask from scripts/judge.mjs; one ask per file; no-key skip → loud JUDGE SKIPPED, exit 0, no ruler row", async () => {
    // contract wiring: ask comes from scripts/judge.mjs, cap is reused
    const src = fs.readFileSync(SCRIPT, "utf-8");
    expect(src).toMatch(/import\s*\{[^}]*\bask\b[^}]*\}\s*from\s*"\.\/judge\.mjs"/);
    expect(src).toContain("QUESTION_CAP");

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-judge-"));
    try {
      const fx = makeFixtures(dir);
      const { askImpl, calls } = fakeAsk(() => "yes");
      const rulerFile = path.join(dir, "pii", "reviewed_v1.jsonl");

      const res = await runScan({ plan: "P-1", files: [fx.csv, fx.json], askImpl, cwd: dir, out: sink(), err: sink(), rulerFile });
      expect(res.exitCode).toBe(0);
      expect(calls.length).toBe(2); // one ask per file
      expect(calls[0].file).not.toBe(calls[1].file);
      expect(fs.existsSync(rulerFile)).toBe(true); // verdicts land only when the judge answered
      const before = fs.readFileSync(rulerFile, "utf-8");

      // no-key degradation — exactly what judge.ask returns without a key
      const o = sink();
      const e = sink();
      const skipAsk = async () => {
        e.write("JUDGE SKIPPED (missing TYPESAFE_API_KEY)\n");
        return { status: 0, skipped: true };
      };
      const res2 = await runScan({ plan: "P-1", files: [fx.csv], askImpl: skipAsk, cwd: dir, out: o, err: e, rulerFile });
      expect(res2.exitCode).toBe(0); // never fails the task
      expect(e.text).toContain("JUDGE SKIPPED"); // judge's own signal surfaced
      expect(e.text + o.text).toMatch(/no ruler rows/i); // pii-scan says it loudly too

      const after = fs.readFileSync(rulerFile, "utf-8");
      expect(after).toBe(before); // zero ruler rows appended on judge skip
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── scenario 5: gitleaks triage ──────────────────────────────────────────

describe("scenario 5: gitleaks triage", () => {
  test("absent → judge-only report + loud gitleaks-absent note; --gitleaks → disagreement-first ordering", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-gl-"));
    try {
      const fx = makeFixtures(dir);
      const { askImpl } = fakeAsk((file) => (file.endsWith("user.json") ? "yes" : "no")); // csv clean, json flagged
      const rulerFile = path.join(dir, "ruler.jsonl");

      // (a) gitleaks absent (default on this machine): judge-only + loud note
      const oA = sink();
      const eA = sink();
      const resA = await runScan({ plan: "P", files: [fx.csv, fx.json], askImpl, cwd: dir, out: oA, err: eA, rulerFile });
      expect(resA.exitCode).toBe(0);
      expect(oA.text + eA.text).toContain("gitleaks absent");

      // (b) --gitleaks restores triage; disagreement-first ordering
      const report = path.join(dir, "gl.json");
      fs.writeFileSync(
        report,
        JSON.stringify([
          { RuleID: "generic-api-key", Description: "generic api key", File: "contacts.csv", StartLine: 2, Secret: SECRET, Match: SECRET },
          { RuleID: "email-address", Description: "email address", File: "user.json", StartLine: 1, Secret: EMAIL, Match: EMAIL },
        ]),
      );

      // parser drops Secret/Match — values never propagate
      const parsed = parseGitleaksReport(report);
      expect(parsed.note).toBeNull();
      expect(parsed.perFile.get("contacts.csv")?.length).toBe(1);
      assertNoSentinels(JSON.stringify([...parsed.perFile.entries()]));

      const oB = sink();
      const eB = sink();
      const resB = await runScan({ plan: "P", files: [fx.csv, fx.json], gitleaksReport: report, askImpl, cwd: dir, out: oB, err: eB, rulerFile });
      expect(resB.exitCode).toBe(0);
      // contacts.csv: gitleaks flags + judge says clean → DISAGREEMENT, sorts first
      expect(resB.summary[0].file).toBe(fx.csv);
      expect(resB.summary[0].order).toBe("disagreement");
      // user.json: both flag → agreement
      expect(resB.summary[1].file).toBe(fx.json);
      expect(resB.summary[1].order).toBe("agree-flagged");

      // GUARDRAIL: gitleaks Secret/Match values must not leak into output or ruler
      assertNoSentinels(oB.text, eB.text, fs.readFileSync(rulerFile, "utf-8"));

      // (c) malformed report degrades loudly, judge-only continues
      fs.writeFileSync(report, "not json{");
      const eC = sink();
      const resC = await runScan({ plan: "P", files: [fx.csv], gitleaksReport: report, askImpl, cwd: dir, out: sink(), err: eC, rulerFile: path.join(dir, "r2.jsonl") });
      expect(resC.exitCode).toBe(0);
      expect(eC.text).toMatch(/gitleaks report unparseable/i);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── scenario 6: ruler ────────────────────────────────────────────────────

describe("scenario 6: ruler (reviewed_v1.jsonl)", () => {
  test("idempotent append keyed by file+question id; dir created on demand", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-ruler-"));
    try {
      const fx = makeFixtures(dir);
      const rulerFile = path.join(dir, "never-existed", "pii", "reviewed_v1.jsonl");
      const { askImpl } = fakeAsk(() => "yes");

      const res1 = await runScan({ plan: "PLAN-9", files: [fx.csv, fx.md], askImpl, cwd: dir, out: sink(), err: sink(), rulerFile });
      expect(fs.existsSync(rulerFile)).toBe(true); // dir created on demand
      const lines1 = fs.readFileSync(rulerFile, "utf-8").trim().split("\n");
      const rows1 = lines1.map((l) => JSON.parse(l));
      expect(res1.appended).toBe(2 * SPECULATIVE_PII_SET.length);
      expect(rows1.length).toBe(2 * SPECULATIVE_PII_SET.length);

      const keys = rows1.map((r: any) => JSON.stringify([r.file, r.questionId]));
      expect(new Set(keys).size).toBe(rows1.length); // key = file + question id, unique
      for (const r of rows1) {
        expect(r.v).toBe(1);
        expect(r.plan).toBe("PLAN-9");
        expect(r.verdict).toBeDefined();
        expect(typeof r.questionId).toBe("string");
      }

      // second identical run appends nothing new (idempotent by key)
      const res2 = await runScan({ plan: "PLAN-9", files: [fx.csv, fx.md], askImpl, cwd: dir, out: sink(), err: sink(), rulerFile });
      const lines2 = fs.readFileSync(rulerFile, "utf-8").trim().split("\n");
      expect(res2.appended).toBe(0);
      expect(lines2.length).toBe(lines1.length);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── guardrail: values-never-extract ──────────────────────────────────────

describe("guardrail: values-never-extract", () => {
  test("sentinels never appear in any built state, digest, question set, or CLI output", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-guard-"));
    try {
      const fx = makeFixtures(dir);
      const blobs: string[] = [];
      for (const p of Object.values(fx)) {
        const st = buildState(p);
        blobs.push(JSON.stringify(st));
        blobs.push(structureDigest(st));
        if (!st.skipped) blobs.push(JSON.stringify(buildQuestions(path.basename(p), st)));
      }
      assertNoSentinels(...blobs);

      // CLI probe: non-data file → no judge call, exit 0, sentinels absent everywhere
      const r = spawnSync("node", [SCRIPT, "--plan", "smoke-guard", "--files", fx.txt], { cwd: ROOT, encoding: "utf-8", timeout: 20000 });
      expect(r.status).toBe(0);
      assertNoSentinels(r.stdout ?? "", r.stderr ?? "");
      expect(r.stdout + r.stderr).toContain("gitleaks absent");

      // usage error: --plan is required
      const r2 = spawnSync("node", [SCRIPT], { cwd: ROOT, encoding: "utf-8", timeout: 20000 });
      expect(r2.status).toBe(2);
      expect(r2.stderr).toContain("--plan");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
