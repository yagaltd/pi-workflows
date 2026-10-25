import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createServer, type Server, type IncomingMessage } from "node:http";

const SCRIPT = resolve(import.meta.dir, "../scripts/judge.mjs");

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "judge-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// ── fixtures ─────────────────────────────────────────────────────────────────

interface CapturedRequest {
  method: string;
  url: string;
  authorization: string | undefined;
  body: unknown;
}

async function stubServer(handler: (req: IncomingMessage, body: string) => { status: number; body: unknown }) {
  const requests: CapturedRequest[] = [];
  const server: Server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c: Buffer) => (raw += c.toString()));
    req.on("end", () => {
      requests.push({
        method: req.method ?? "",
        url: req.url ?? "",
        authorization: req.headers.authorization,
        body: raw ? JSON.parse(raw) : null,
      });
      const out = handler(req, raw);
      res.writeHead(out.status, { "content-type": "application/json" });
      res.end(JSON.stringify(out.body));
    });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  return {
    requests,
    url: `http://127.0.0.1:${addr.port}`,
    close: () => new Promise<void>((ok) => server.close(() => ok())),
  };
}

function questionsFile(questions: Array<Record<string, unknown>>): string {
  const f = join(dir, "questions.json");
  writeFileSync(f, JSON.stringify(questions));
  return f;
}

function twoQuestions() {
  return [
    { id: "q1", question: "Does the contract hold?", schema: { type: "object" } },
    { id: "q2", question: "Any blockers?", schema: { type: "object" } },
  ];
}

// Run the CLI in a subprocess with a hermetic env (TYPEDLLM_* and JUDGE_AUDIT stripped first).
// Async spawn: the stub server lives in THIS process, and a sync spawn would block its event loop.
async function runJudge(opts: { questionsFile: string; auditFile: string; env?: Record<string, string> }) {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  for (const k of ["TYPEDLLM_API_KEY", "TYPEDLLM_BASE_URL", "TYPEDLLM_TIMEOUT_MS", "JUDGE_AUDIT"]) delete env[k];
  Object.assign(env, opts.env);
  const proc = Bun.spawn(["node", SCRIPT, "ask", "--questions", opts.questionsFile, "--audit", opts.auditFile], {
    env,
    cwd: resolve(import.meta.dir, ".."),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { code: await proc.exited, stdout, stderr };
}

function auditLines(auditFile: string): Array<Record<string, unknown>> {
  return readFileSync(auditFile, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

// ── contract scenarios ───────────────────────────────────────────────────────

describe("judge ask", () => {
  test("sends typed questions to the generate endpoint", async () => {
    const verdict = [
      { id: "q1", verdict: "FLAG", confidence: 0.8 },
      { id: "q2", verdict: "FLAG", confidence: 0.6 },
    ];
    const server = await stubServer(() => ({ status: 200, body: verdict }));
    try {
      const r = await runJudge({
        questionsFile: questionsFile(twoQuestions()),
        auditFile: join(dir, "audit.jsonl"),
        env: { TYPEDLLM_API_KEY: "test-key-123", TYPEDLLM_BASE_URL: server.url },
      });
      expect(r.code).toBe(0);
      expect(server.requests).toHaveLength(1);
      const req = server.requests[0]!;
      expect(req.method).toBe("POST");
      expect(req.url).toBe("/v1/generate");
      expect(req.authorization).toBe("Bearer test-key-123");
      expect(req.body).toEqual(twoQuestions());
      expect(JSON.parse(r.stdout)).toEqual(verdict);
    } finally {
      await server.close();
    }
  });

  test("rejects question sets over the 64 cap", async () => {
    const server = await stubServer(() => ({ status: 200, body: {} }));
    try {
      const r = await runJudge({
        questionsFile: questionsFile(Array.from({ length: 65 }, (_, i) => ({ id: `q${i + 1}`, question: `Q${i + 1}?` }))),
        auditFile: join(dir, "audit.jsonl"),
        env: { TYPEDLLM_API_KEY: "test-key-123", TYPEDLLM_BASE_URL: server.url },
      });
      expect(r.code).not.toBe(0);
      expect(r.stderr).toContain("65");
      expect(r.stderr).toContain("64");
      expect(server.requests).toHaveLength(0); // never sent
    } finally {
      await server.close();
    }
  });

  test("skips loudly when the key is missing", async () => {
    const server = await stubServer(() => ({ status: 200, body: {} }));
    try {
      const auditFile = join(dir, "audit.jsonl");
      const r = await runJudge({
        questionsFile: questionsFile(twoQuestions()),
        auditFile,
        env: { TYPEDLLM_BASE_URL: server.url }, // no TYPEDLLM_API_KEY
      });
      expect(r.code).toBe(0);
      expect(r.stderr).toContain("JUDGE SKIPPED");
      expect(server.requests).toHaveLength(0);
      const lines = auditLines(auditFile);
      expect(lines).toHaveLength(1);
      expect(lines[0]!.status).toBe("skipped");
    } finally {
      await server.close();
    }
  });

  test("skips loudly when the endpoint is unreachable", async () => {
    // Grab an ephemeral port, then close the server so the port is closed.
    const dead = await stubServer(() => ({ status: 200, body: {} }));
    const deadUrl = dead.url;
    await dead.close();
    const auditFile = join(dir, "audit.jsonl");
    const r = await runJudge({
      questionsFile: questionsFile(twoQuestions()),
      auditFile,
      env: { TYPEDLLM_API_KEY: "test-key-123", TYPEDLLM_BASE_URL: deadUrl },
    });
    expect(r.code).toBe(0);
    expect(r.stderr).toContain("JUDGE SKIPPED");
    expect(auditLines(auditFile)[0]!.status).toBe("skipped");
  });

  test("appends the question set and verdict to the audit file", async () => {
    const verdict = [{ id: "q1", verdict: "FLAG" }, { id: "q2", verdict: "CLEAR" }];
    const server = await stubServer(() => ({ status: 200, body: verdict }));
    try {
      const auditFile = join(dir, "audit.jsonl");
      const r = await runJudge({
        questionsFile: questionsFile(twoQuestions()),
        auditFile,
        env: { TYPEDLLM_API_KEY: "test-key-123", TYPEDLLM_BASE_URL: server.url },
      });
      expect(r.code).toBe(0);
      const lines = auditLines(auditFile);
      expect(lines).toHaveLength(1);
      const entry = lines[0]!;
      expect(typeof entry.ts).toBe("string");
      expect(Number.isNaN(Date.parse(entry.ts as string))).toBe(false); // timestamp
      expect(entry.questionCount).toBe(2); // question count
      expect(entry.questions).toEqual(twoQuestions()); // question set
      expect(entry.verdict).toEqual(verdict); // verdict
      expect(typeof entry.summary).toBe("string");
      expect((entry.summary as string).length).toBeGreaterThan(0); // verdict summary
    } finally {
      await server.close();
    }
  });
});
