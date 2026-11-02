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
 * GUARDRAIL — values-never-extract: data VALUES (CSV data rows, JSON/YAML/
 * TOML value strings, MD body text, gitleaks Secret/Match fields, binary
 * blob) are never extracted. NAME positions (CSV header cells, MD heading
 * text, JSON/YAML/TOML key names) pass through sanitizeName() — bounded +
 * high-entropy-redacted — and the name-position fixtures in
 * "guardrail: name-position sentinels" prove literals die there too. Every
 * scenario re-asserts ZERO sentinel occurrences in any built state,
 * question set, scan output, or ruler row.
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
  sanitizeName,
  NAME_BOUND,
} from "../scripts/pii-scan.mjs";
import { QUESTION_CAP } from "../scripts/judge.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "pii-scan.mjs");

// ── sentinels + guardrail helper ─────────────────────────────────────────

const EMAIL = "jane.doe@example.com";
const SECRET = "SECRETVALUE42";
const SENTINELS = [EMAIL, SECRET];

// backlog #7 contract: every file's question set = SPECULATIVE_PII_SET + 12
// secret-hunting judgments (10 credential field-name shapes + the PEM
// private-key indicator + a per-file likely-credentials rollup). Distinct
// `c`-prefixed ids never collide with historical `q` ruler keys.
const CRED_IDS = [
  "c01-cred-api-key", "c02-cred-token", "c03-cred-secret", "c04-cred-password",
  "c05-cred-private-key", "c06-cred-credential", "c07-cred-auth", "c08-cred-oauth",
  "c09-cred-session", "c10-cred-cookie", "c11-pem-private-key", "c12-likely-credentials",
];
const TOTAL_QUESTIONS = SPECULATIVE_PII_SET.length + CRED_IDS.length;

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
      expect(qs.length).toBe(TOTAL_QUESTIONS); // PII categories + secret-hunting judgments (backlog #7)
      expect(qs.length).toBeLessThanOrEqual(QUESTION_CAP);
      for (const q of qs) {
        expect(String(q.id)).toMatch(/^[qc]\d+-/); // q = PII category, c = credential judgment (backlog #7)
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
      expect(oA.text + eA.text).toContain("judge-based"); // secrets verdict source (backlog #7)
      expect(oA.text + eA.text).toContain("gitleaks retired");
      expect(oA.text + eA.text).toContain("20261102");

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
      expect(res1.appended).toBe(2 * TOTAL_QUESTIONS);
      expect(rows1.length).toBe(2 * TOTAL_QUESTIONS);

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
      expect(r.stdout + r.stderr).toContain("gitleaks retired"); // judge-based gate note (backlog #7)

      // usage error: --plan is required
      const r2 = spawnSync("node", [SCRIPT], { cwd: ROOT, encoding: "utf-8", timeout: 20000 });
      expect(r2.status).toBe(2);
      expect(r2.stderr).toContain("--plan");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── guardrail: name-position sentinels (BUG-1 regression) ─────────────────

/**
 * Sentinels in NAME positions: CSV header cells, MD heading text, and
 * JSON/YAML/TOML key names flow into state verbatim unless the state
 * builder sanitizes them. Values in the same fixtures stay innocuous-free
 * (EMAIL lives only in a CSV data row) so every leak below is a NAME leak.
 */
function makeNameFixtures(dir: string): Record<string, string> {
  const f = (name: string, content: string) => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, content);
    return p;
  };
  return {
    // HEADER-CELL position: sentinel as a CSV header cell (data row present)
    csvHeader: f("header-secret.csv", `${SECRET},email\nJane Doe,${EMAIL}\n`),
    // HEADING-TEXT position: sentinel as MD heading text
    mdHeading: f("heading-secret.md", `# ${SECRET} rotation notes\n\nplain body\n`),
    // KEY-NAME positions: sentinel as key / table name (values innocuous)
    jsonKey: f("key-secret.json", JSON.stringify({ [SECRET]: { email: "ok@ok.invalid" } }, null, 2)),
    yamlKey: f("key-secret.yaml", `${SECRET}:\n  sub_key: ok\n`),
    tomlKey: f("key-secret.toml", `[${SECRET}]\nplain_key = "ok"\n`),
  };
}

describe("guardrail: name-position sentinels (header cells / heading text / key names)", () => {
  test("sanitizeName: semantics survive, high-entropy literals die, bounded length, idempotent", () => {
    expect(sanitizeName("email")).toBe("email"); // short name keeps semantics
    expect(sanitizeName("user_email_2024")).toBe("user_email_2024"); // short runs keep words
    expect(sanitizeName("SECRETVALUE42")).toBe("[redacted:13]"); // mixed literal dies, length preserved
    expect(sanitizeName(`${SECRET} rotation`)).toBe("[redacted:13] rotation"); // topic word survives
    expect(sanitizeName("api_KEY_Xk29fQa7")).toBe("api_KEY_[redacted:8]"); // only the literal run dies
    expect(sanitizeName("a".repeat(100))).toHaveLength(NAME_BOUND); // bounded
    expect(sanitizeName(sanitizeName("SECRETVALUE42"))).toBe("[redacted:13]"); // idempotent
  });

  test("sentinels in HEADER-CELL / HEADING-TEXT / KEY-NAME positions never reach state, digest, questions, judge calls, or ruler", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-guard2-"));
    try {
      const fx = makeNameFixtures(dir);

      // structure survives, literal dies — per position
      const csv = buildState(fx.csvHeader);
      expect(csv.headers).toEqual(expect.arrayContaining(["email"])); // semantics survive
      expect(JSON.stringify(csv)).not.toContain(SECRET); // header-cell literal dies
      expect(JSON.stringify(csv)).not.toContain(EMAIL); // data-row values still never extracted

      const md = buildState(fx.mdHeading);
      expect(md.headings.length).toBe(1); // heading structure survives
      expect(JSON.stringify(md)).not.toContain(SECRET); // heading-text literal dies

      for (const p of [fx.jsonKey, fx.yamlKey, fx.tomlKey]) {
        const st = buildState(p);
        expect(st.keyPaths.length).toBeGreaterThan(0); // key structure survives
        expect(JSON.stringify(st)).not.toContain(SECRET); // key-name literal dies
      }

      // digest + question set + judge calls + CLI summary + ruler: zero sentinels anywhere
      const { askImpl, calls } = fakeAsk();
      const rulerFile = path.join(dir, "r", "reviewed_v1.jsonl");
      const res = await runScan({
        plan: "guard2",
        files: Object.values(fx),
        askImpl,
        cwd: dir,
        out: sink(),
        err: sink(),
        rulerFile,
      });
      expect(res.exitCode).toBe(0);
      const blobs: string[] = [];
      for (const p of Object.values(fx)) {
        const st = buildState(p);
        blobs.push(JSON.stringify(st), structureDigest(st));
        if (!st.skipped) blobs.push(JSON.stringify(buildQuestions(path.basename(p), st)));
      }
      blobs.push(JSON.stringify(calls), JSON.stringify(res.summary), fs.readFileSync(rulerFile, "utf-8"));
      assertNoSentinels(...blobs);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── backlog #7: judge-based secrets gate ─────────────────────────────────

/**
 * Owner decision 20261102 (LOG): gitleaks RETIRED — the judge is the
 * secrets gate. Three additions, all values-never-extract safe:
 *  1. secret-hunting question categories (credential field-name shapes,
 *     PEM private-key indicator, per-file likely-credentials rollup) in
 *     EVERY file's question set;
 *  2. `suspicious-redacted-name` findings — names sanitizeName rewrote to
 *     `[redacted:N]` surface in the report AND as ruler rows on the same
 *     idempotent (file + questionId) key scheme;
 *  3. the report names the secrets verdict source judge-based.
 */
describe("backlog #7: judge-based secrets gate", () => {
  test("credential/secret question categories present in every file's question set; cap + per-file chunking intact", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-cred-"));
    try {
      const fx = makeFixtures(dir);
      for (const p of [fx.csv, fx.json, fx.md]) {
        const st = buildState(p);
        const qs = buildQuestions(path.basename(p), st);
        expect(qs.length).toBe(TOTAL_QUESTIONS); // PII categories + secret-hunting judgments
        expect(qs.length).toBeLessThanOrEqual(QUESTION_CAP); // cap intact
        const ids = qs.map((q: any) => q.id);
        for (const id of CRED_IDS) expect(ids).toContain(id); // every credential judgment present

        // per-file likely-credentials rollup is an enum question
        const rollup = qs.find((q: any) => q.id === "c12-likely-credentials");
        expect(rollup?.schema).toEqual({ enum: ["yes", "no"] });
        expect(String(rollup?.question)).toMatch(/likely to contain credentials/i);

        // PEM private-key indicator question names the indicator shape
        const pem = qs.find((q: any) => q.id === "c11-pem-private-key");
        expect(String(pem?.question)).toContain("-----BEGIN");

        // shape questions name their credential pattern (+ plural/suffixed variants)
        const shape = qs.find((q: any) => q.id === "c01-cred-api-key");
        expect(String(shape?.question)).toContain("api_key");

        // GUARDRAIL: the new categories carry no fixture values
        assertNoSentinels(JSON.stringify(qs), structureDigest(st));
      }

      // per-file chunking intact: one ask per file, each ≤ cap, never mixed
      const { askImpl, calls } = fakeAsk();
      const res = await runScan({
        plan: "cred7",
        files: [fx.csv, fx.json],
        askImpl,
        cwd: dir,
        out: sink(),
        err: sink(),
        rulerFile: path.join(dir, "ruler.jsonl"),
      });
      expect(res.exitCode).toBe(0);
      expect(calls.length).toBe(2);
      for (const c of calls) {
        expect(c.questions.length).toBeLessThanOrEqual(QUESTION_CAP);
        expect(new Set(c.questions.map((q: any) => String(q.question).match(/File "([^"]+)"/)?.[1])).size).toBe(1);
      }
      assertNoSentinels(JSON.stringify(calls));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("redaction-signal findings: [redacted:N] names surface per position (header/heading/key) with original length; original names never carried", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-redact-"));
    try {
      const fx = makeNameFixtures(dir);
      expect(buildState(fx.csvHeader).redactions).toEqual([{ position: "header", name: "[redacted:13]", originalLength: 13 }]);
      expect(buildState(fx.mdHeading).redactions).toEqual([{ position: "heading", name: "[redacted:13] rotation n", originalLength: 28 }]);
      expect(buildState(fx.jsonKey).redactions).toEqual([{ position: "key", name: "[redacted:13]", originalLength: 13 }]);
      expect(buildState(fx.yamlKey).redactions).toEqual([{ position: "key", name: "[redacted:13]", originalLength: 13 }]);
      expect(buildState(fx.tomlKey).redactions).toEqual([{ position: "key", name: "[redacted:13]", originalLength: 13 }]);

      // innocuous names produce zero signals (skipped states have none either)
      const plain = makeFixtures(dir);
      for (const p of Object.values(plain)) expect(buildState(p).redactions ?? []).toEqual([]);

      // values guardrail: findings carry only the redacted marker + length
      const allFindings = [fx.csvHeader, fx.mdHeading, fx.jsonKey, fx.yamlKey, fx.tomlKey].map((p) => buildState(p).redactions);
      assertNoSentinels(JSON.stringify(allFindings));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("runScan: findings land in report + ruler rows (same idempotent key scheme); second run appends nothing", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-redact2-"));
    try {
      const fx = makeNameFixtures(dir);
      const rulerFile = path.join(dir, "r", "reviewed_v1.jsonl");
      const { askImpl } = fakeAsk();

      const res = await runScan({
        plan: "R7",
        files: [fx.csvHeader, fx.mdHeading, fx.yamlKey],
        askImpl,
        cwd: dir,
        out: sink(),
        err: sink(),
        rulerFile,
      });
      expect(res.exitCode).toBe(0);

      // report: summary carries the finding class per file
      const csvRow = res.summary.find((r: any) => String(r.file).endsWith("header-secret.csv"));
      expect(csvRow.redactionFindings).toEqual([{ position: "header", name: "[redacted:13]", originalLength: 13 }]);

      // ruler: finding rows share the verdict-row key scheme (file + questionId)
      const rows = fs.readFileSync(rulerFile, "utf-8").trim().split("\n").map((l) => JSON.parse(l));
      const findingRows = rows.filter((r: any) => r.verdict === "suspicious-redacted-name");
      expect(findingRows.length).toBe(3); // header + heading + key
      for (const r of findingRows) {
        expect(String(r.questionId)).toMatch(/^suspicious-redacted-name:(header|heading|key):/); // class:position:redacted-name
        expect(String(r.questionId)).toContain("[redacted:");
        expect(r.v).toBe(1);
        expect(r.plan).toBe("R7");
      }
      expect(new Set(rows.map((r: any) => JSON.stringify([r.file, r.questionId]))).size).toBe(rows.length);

      // idempotency: identical re-run appends nothing
      const before = rows.length;
      const res2 = await runScan({
        plan: "R7",
        files: [fx.csvHeader, fx.mdHeading, fx.yamlKey],
        askImpl,
        cwd: dir,
        out: sink(),
        err: sink(),
        rulerFile,
      });
      expect(res2.appended).toBe(0);
      expect(fs.readFileSync(rulerFile, "utf-8").trim().split("\n").length).toBe(before);

      // guardrail: zero sentinels in summary + ruler
      assertNoSentinels(JSON.stringify(res.summary), fs.readFileSync(rulerFile, "utf-8"));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("report marks the secrets verdict source judge-based (gitleaks retired — owner call 20261102); advisory exit 0", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-word-"));
    try {
      const fx = makeFixtures(dir);
      const { askImpl } = fakeAsk();
      const o = sink();
      const e = sink();
      const res = await runScan({ plan: "W", files: [fx.csv], askImpl, cwd: dir, out: o, err: e, rulerFile: path.join(dir, "ruler.jsonl") });
      expect(res.exitCode).toBe(0);
      const both = o.text + e.text;
      expect(both).toContain("judge-based");
      expect(both).toContain("gitleaks retired");
      expect(both).toContain("20261102");
      expect(both).toMatch(/ADVISORY ONLY/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("probe: header-cell sentinel SECRETVALUE42,email → suspicious-redacted-name finding for the header position; sentinel ZERO in state/questions/digest/output", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pii-probe7-"));
    try {
      const p = path.join(dir, "probe.csv");
      fs.writeFileSync(p, `${SECRET},email\nJane,jane@x.invalid\n`);
      const { askImpl } = fakeAsk();
      const rulerFile = path.join(dir, "r", "reviewed_v1.jsonl");
      const o = sink();
      const e = sink();
      const res = await runScan({ plan: "PROBE7", files: [p], askImpl, cwd: dir, out: o, err: e, rulerFile });
      expect(res.exitCode).toBe(0);
      const row = res.summary.find((r: any) => String(r.file).endsWith("probe.csv"));
      expect(row.redactionFindings).toEqual([{ position: "header", name: "[redacted:13]", originalLength: 13 }]);
      expect(o.text).toContain("suspicious-redacted-name");

      // sentinel never reaches state, questions, digest, output, or ruler
      const st = buildState(p);
      assertNoSentinels(
        JSON.stringify(st),
        structureDigest(st),
        JSON.stringify(buildQuestions("probe.csv", st)),
        o.text,
        e.text,
        fs.readFileSync(rulerFile, "utf-8"),
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
