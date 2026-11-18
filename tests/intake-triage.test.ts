import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  TRIAGE_BUCKETS,
  TRIAGE_CONFIDENCE_FLOOR,
  TRIAGE_SCHEMA,
  makeTypellmBackend,
  renderTriageTable,
  resolveTypellmKey,
  triageFinding,
  triageFindings,
  type JudgeBackend,
} from "../extensions/index.ts";
import {
  FIXTURES,
  evalBackend,
  evalBackends,
  liveBackend,
  recordedBackend,
} from "../scripts/bench-intake-triage.ts";

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "triage-"));
const writeKeyFile = (content: string): string => {
  const p = path.join(tmpDir(), "typellm.key");
  fs.writeFileSync(p, content);
  return p;
};

/** A transport capture: records the request, returns a canned body. */
function captureTransport(body: unknown, opts?: { status?: number; throw?: Error }) {
  const captured: { url: string; init: any } | null = { url: "", init: null as any };
  const fetchImpl = async (url: string, init: any) => {
    captured.url = url;
    captured.init = init;
    if (opts?.throw) throw opts.throw;
    return {
      ok: (opts?.status ?? 200) >= 200 && (opts?.status ?? 200) < 300,
      status: opts?.status ?? 200,
      text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    };
  };
  return { captured, fetchImpl };
}

describe("typellm client + judge seam (plan 20261117-076 Phase 1)", () => {
  test("triage buckets pin the 071 vocabulary, floor is the majordome 0.6", () => {
    expect(TRIAGE_BUCKETS).toEqual(["queued", "batched", "closed", "done"]);
    expect(TRIAGE_CONFIDENCE_FLOOR).toBe(0.6);
  });

  test("triage schema is schema-driven: enum buckets, confidence 0..1 required", () => {
    const props = (TRIAGE_SCHEMA as any).properties;
    expect(props.bucket.enum).toEqual(TRIAGE_BUCKETS);
    expect(props.confidence.minimum).toBe(0);
    expect(props.confidence.maximum).toBe(1);
    expect((TRIAGE_SCHEMA as any).required).toContain("bucket");
    expect((TRIAGE_SCHEMA as any).required).toContain("confidence");
  });

  test("key resolution: TYPELLM_API_KEY env wins over the key file", () => {
    const keyPath = writeKeyFile("file-key");
    const key = resolveTypellmKey({ env: { TYPELLM_API_KEY: "env-key" }, keyPath });
    expect(key).toBe("env-key");
  });

  test("key resolution: falls back to the majordome key file (trimmed)", () => {
    const keyPath = writeKeyFile("  file-key\n");
    const key = resolveTypellmKey({ env: {}, keyPath });
    expect(key).toBe("file-key");
  });

  test("key resolution: no env key and no file → null, never a throw", () => {
    const key = resolveTypellmKey({ env: {}, keyPath: path.join(tmpDir(), "absent.key") });
    expect(key).toBeNull();
  });

  test("transport posts schema-driven requests to /v1/generate (majordome contract)", async () => {
    const { captured, fetchImpl } = captureTransport({
      result: { bucket: "queued", confidence: 0.9, evidence: "P0" },
    });
    const backend = makeTypellmBackend({ key: "k", fetchImpl } as any);
    const v = await backend.classify(TRIAGE_SCHEMA, "a finding");
    expect(v.skipped).toBe(false);
    expect(captured.url).toBe("https://api.typellm.ai/v1/generate");
    expect(captured.init.method).toBe("POST");
    expect(captured.init.headers.authorization).toBe("Bearer k");
    const body = JSON.parse(captured.init.body);
    expect(body.model).toBeUndefined();
    expect(body.context).toBe("a finding");
    expect(body.questions.bucket.type).toBe("string");
    expect(body.questions.bucket.enum).toEqual(TRIAGE_BUCKETS);
    expect(body.questions.bucket.instructions).toBeTruthy();
    expect(body.questions.confidence.type).toBe("number");
    expect(body.questions.evidence.type).toBe("string");
    expect((v as any).bucket).toBe("queued");
    expect((v as any).confidence).toBe(0.9);
    expect((v as any).evidence).toBe("P0");
  });

  test("TYPELLM_BASE_URL overrides the endpoint base", async () => {
    const { captured, fetchImpl } = captureTransport({
      result: { bucket: "done", confidence: 0.9 },
    });
    const backend = makeTypellmBackend({
      key: "k",
      fetchImpl,
      baseUrl: "https://relay.example/v2",
    } as any);
    await backend.classify(TRIAGE_SCHEMA, "x");
    expect(captured.url).toBe("https://relay.example/v2/v1/generate");
  });

  test("no key → LOUD skip before any network call (never a silent pass)", async () => {
    let called = false;
    const fetchImpl = async () => {
      called = true;
      throw new Error("network must not be touched without a key");
    };
    const backend = makeTypellmBackend({ key: "", fetchImpl } as any);
    const v = await backend.classify(TRIAGE_SCHEMA, "x");
    expect(v.skipped).toBe(true);
    expect(v.bucket).toBeNull();
    expect(v.reason).toContain("TYPELLM_API_KEY");
    expect(v.reason).toContain("pi-majordome");
    expect(called).toBe(false);
  });

  test("schema-invalid response (bucket outside enum) → loud skip", async () => {
    const { fetchImpl } = captureTransport({
      result: { bucket: "ship-it", confidence: 0.9 },
    });
    const backend = makeTypellmBackend({ key: "k", fetchImpl } as any);
    const v = await backend.classify(TRIAGE_SCHEMA, "x");
    expect(v.skipped).toBe(true);
    expect(v.reason).toContain("schema");
    expect(v.bucket).toBeNull();
  });

  test("schema-invalid response (confidence out of range) → loud skip", async () => {
    const { fetchImpl } = captureTransport({
      result: { bucket: "done", confidence: 1.5 },
    });
    const backend = makeTypellmBackend({ key: "k", fetchImpl } as any);
    const v = await backend.classify(TRIAGE_SCHEMA, "x");
    expect(v.skipped).toBe(true);
    expect(v.reason).toContain("schema");
  });

  test("missing required field (no confidence) → loud skip", async () => {
    const { fetchImpl } = captureTransport({ result: { bucket: "done" } });
    const backend = makeTypellmBackend({ key: "k", fetchImpl } as any);
    const v = await backend.classify(TRIAGE_SCHEMA, "x");
    expect(v.skipped).toBe(true);
    expect(v.reason).toContain("schema");
  });

  test("response missing result → loud skip", async () => {
    const { fetchImpl } = captureTransport({ answers: {} });
    const backend = makeTypellmBackend({ key: "k", fetchImpl } as any);
    const v = await backend.classify(TRIAGE_SCHEMA, "x");
    expect(v.skipped).toBe(true);
    expect(v.reason).toContain("result");
  });

  test("schema not expressible as TypeLLM questions → loud skip, no call", async () => {
    let called = false;
    const fetchImpl = async () => {
      called = true;
      return { ok: true, status: 200, text: async () => "{}" };
    };
    const backend = makeTypellmBackend({ key: "k", fetchImpl } as any);
    const v = await backend.classify({ type: "array" }, "x");
    expect(v.skipped).toBe(true);
    expect(v.reason).toContain("questions");
    expect(called).toBe(false);
  });

  test("non-JSON response → loud skip", async () => {
    const { fetchImpl } = captureTransport("<html>502</html>");
    const backend = makeTypellmBackend({ key: "k", fetchImpl } as any);
    const v = await backend.classify(TRIAGE_SCHEMA, "x");
    expect(v.skipped).toBe(true);
    expect(v.reason).toContain("non-JSON");
  });

  test("HTTP error → loud skip naming the status", async () => {
    const { fetchImpl } = captureTransport("nope", { status: 503 });
    const backend = makeTypellmBackend({ key: "k", fetchImpl } as any);
    const v = await backend.classify(TRIAGE_SCHEMA, "x");
    expect(v.skipped).toBe(true);
    expect(v.reason).toContain("503");
  });

  test("network failure → loud skip naming the cause", async () => {
    const { fetchImpl } = captureTransport(null, { throw: new Error("ECONNREFUSED") });
    const backend = makeTypellmBackend({ key: "k", fetchImpl } as any);
    const v = await backend.classify(TRIAGE_SCHEMA, "x");
    expect(v.skipped).toBe(true);
    expect(v.reason).toContain("ECONNREFUSED");
  });

  test("seam is backend-pluggable: a non-typellm backend drives the same classify", async () => {
    const fake: JudgeBackend = {
      name: "jev-fake",
      classify: async () => ({ skipped: false, bucket: "batched", confidence: 0.7, evidence: "P3" }),
    };
    const r = await triageFinding(fake, "spacing nits across scripts/*");
    expect(r.bucket).toBe("batched");
    expect(r.confidence).toBe(0.7);
    expect(r.defaultPath).toBe(false);
  });
});

describe("intake triage at ship (071 discipline, machine-consistent)", () => {
  const ok = (bucket: string, confidence: number): JudgeBackend => ({
    name: "fake",
    classify: async () => ({ skipped: false, bucket: bucket as any, confidence }),
  });
  const skip = (reason: string): JudgeBackend => ({
    name: "fake",
    classify: async () => ({ skipped: true, bucket: null, confidence: 0, reason }),
  });

  test("confident verdict → triaged, not default path", async () => {
    const r = await triageFinding(ok("closed", 0.8), "dead helper from an old refactor");
    expect(r.defaultPath).toBe(false);
    expect(r.bucket).toBe("closed");
    expect(r.backend).toBe("fake");
  });

  test("below-floor confidence → stays in the default path, loud reason", async () => {
    const r = await triageFinding(ok("queued", 0.4), "maybe a docs nit");
    expect(r.defaultPath).toBe(true);
    expect(r.reason).toContain("confidence");
    expect(r.reason).toContain("0.4");
  });

  test("backend skip → stays in the default path, skip reason carried loudly", async () => {
    const r = await triageFinding(skip("endpoint unreachable (HTTP 503)"), "anything");
    expect(r.defaultPath).toBe(true);
    expect(r.skipped).toBe(true);
    expect(r.reason).toContain("503");
    expect(r.bucket).toBeNull();
  });

  test("triageFindings summarizes buckets + default-path count", async () => {
    const backend = ok("queued", 0.9);
    const { results, summary } = await triageFindings(backend, ["a", "b"]);
    expect(results).toHaveLength(2);
    expect(summary.queued).toBe(2);
    expect(summary.defaultPath).toBe(0);
  });

  test("renderTriageTable shows bucket + confidence, and LOUD default-path rows", async () => {
    const results = [
      await triageFinding(ok("queued", 0.92), "README install line references a dead tag"),
      await triageFinding(skip("missing TYPELLM_API_KEY"), "another finding"),
    ];
    const out = renderTriageTable(results);
    expect(out).toContain("queued");
    expect(out).toContain("0.92");
    expect(out).toContain("JUDGE SKIPPED");
    expect(out).toContain("default path");
  });
});

describe("bench harness — EVAL-SLICE (the Phase-2 gate instrument)", () => {
  test("12 fixtures, unique ids, expected buckets in the 071 vocabulary", () => {
    expect(FIXTURES).toHaveLength(12);
    const ids = new Set(FIXTURES.map((f) => f.id));
    expect(ids.size).toBe(12);
    for (const f of FIXTURES) expect(TRIAGE_BUCKETS).toContain(f.expected);
  });

  test("recorded backend replays fixture ground truth (no-key mode)", async () => {
    const b = recordedBackend();
    expect(b.name).toBe("typellm-recorded");
    for (const f of FIXTURES) {
      const v = await b.classify(TRIAGE_SCHEMA, f.finding);
      expect(v.skipped).toBe(false);
      expect((v as any).bucket).toBe(f.expected);
    }
  });

  test("recorded backend never invents an answer for unknown input (loud skip)", async () => {
    const v = await recordedBackend().classify(TRIAGE_SCHEMA, "not a fixture finding");
    expect(v.skipped).toBe(true);
    expect(v.reason).toBeTruthy();
  });

  test("evalBackend scores accuracy against expected buckets", async () => {
    const score = await evalBackend(recordedBackend());
    expect(score.name).toBe("typellm-recorded");
    expect(score.total).toBe(12);
    expect(score.correct).toBe(12);
    expect(score.accuracy).toBe(1);
    expect(score.skipped).toBe(0);
  });

  test("a wrong backend scores 0 — skips are never passes", async () => {
    const wrong: JudgeBackend = {
      name: "always-queued",
      classify: async () => ({ skipped: false, bucket: "queued", confidence: 0.9 }),
    };
    const score = await evalBackend(wrong);
    expect(score.accuracy).toBeLessThan(1);
  });

  test("a skipping backend scores 0 with the skip count surfaced", async () => {
    const skipping: JudgeBackend = {
      name: "no-key",
      classify: async () => ({ skipped: true, bucket: null, confidence: 0, reason: "missing key" }),
    };
    const score = await evalBackend(skipping);
    expect(score.correct).toBe(0);
    expect(score.skipped).toBe(12);
    expect(score.accuracy).toBe(0);
  });

  test("evalBackends reports one row per backend (Phase-2 comparison shape)", async () => {
    const rows = await evalBackends([recordedBackend()]);
    expect(rows).toHaveLength(1);
    expect(rows[0].accuracy).toBe(1);
  });

  test("live backend resolves through the seam and is named typellm", () => {
    expect(liveBackend().name).toBe("typellm");
  });
});
