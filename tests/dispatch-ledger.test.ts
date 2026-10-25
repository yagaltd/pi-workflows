import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let dir: string;

function childSessionJsonl(opts: { model: string; usage: Record<string, unknown> }) {
  return [
    JSON.stringify({ type: "session", id: "child-1", parentSession: "parent-1", cwd: "/tmp/repo" }),
    JSON.stringify({ type: "model_change", modelId: opts.model }),
    JSON.stringify({ type: "message", message: { role: "assistant", model: opts.model, usage: opts.usage, stopReason: "end_turn" } }),
  ].join("\n") + "\n";
}

function ledgerRow(opts: { sessionId: string; model: string; thinking?: string; inputTokens: number; cacheReadTokens?: number | null }) {
  return JSON.stringify({
    v: 1,
    sessionId: opts.sessionId,
    name: opts.sessionId,
    cwd: "/tmp/repo",
    parentSession: "p",
    startedAt: "2026-10-25T00:00:00Z",
    durationSec: 60,
    model: opts.model,
    thinking: opts.thinking ?? null,
    turns: 1,
    inputTokens: opts.inputTokens,
    outputTokens: 10,
    reasoningTokens: 0,
    cacheReadTokens: opts.cacheReadTokens ?? null,
    cacheCreationTokens: null,
    cost: 0.01,
    repo: "/tmp/repo",
    runId: null,
    taskId: null,
    outcome: "ok",
  });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "dispatch-ledger-"));
  mkdirSync(join(dir, "sessions/child"), { recursive: true });
  process.env.DISPATCH_SESSIONS_DIR = join(dir, "sessions");
  process.env.DISPATCH_LEDGER = join(dir, "ledger.jsonl");
  process.env.DISPATCH_OUTCOMES = join(dir, "outcomes.json");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.DISPATCH_SESSIONS_DIR;
  delete process.env.DISPATCH_LEDGER;
  delete process.env.DISPATCH_OUTCOMES;
});

describe("dispatch-ledger cache fields", () => {
  test("records cache tokens when present", () => {
    const file = join(dir, "sessions/child/s1.jsonl");
    writeFileSync(file, childSessionJsonl({
      model: "claude-x",
      usage: { input: 100, output: 20, reasoning: 5, cacheReadTokens: 80, cacheCreationTokens: 30 },
    }));
    const { summarizeSession } = ledger();
    const s = summarizeSession(file);
    expect(s.cacheReadTokens).toBe(80);
    expect(s.cacheCreationTokens).toBe(30);
  });

  test("records cache tokens from snake_case usage", () => {
    const file = join(dir, "sessions/child/s2.jsonl");
    writeFileSync(file, childSessionJsonl({
      model: "claude-x",
      usage: { input: 100, output: 20, reasoning: 0, cache_read_tokens: 55, cache_creation_tokens: 7 },
    }));
    const { summarizeSession } = ledger();
    const s = summarizeSession(file);
    expect(s.cacheReadTokens).toBe(55);
    expect(s.cacheCreationTokens).toBe(7);
  });

  test("cache tokens are null when usage omits them", () => {
    const file = join(dir, "sessions/child/s3.jsonl");
    writeFileSync(file, childSessionJsonl({ model: "gpt-y", usage: { input: 100, output: 20, reasoning: 0 } }));
    const { summarizeSession } = ledger();
    const s = summarizeSession(file);
    expect(s.cacheReadTokens).toBeNull();
    expect(s.cacheCreationTokens).toBeNull();
  });
});

function ledger() {
  return require("../scripts/dispatch-ledger.mjs") as any;
}

function captureReport(): string {
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => { lines.push(args.join(" ")); };
  try {
    ledger().cmdReport();
  } finally {
    console.log = orig;
  }
  return lines.join("\n");
}

describe("dispatch-ledger report cache column", () => {
  test("report gains cache read over input column", () => {
    writeFileSync(process.env.DISPATCH_LEDGER!, [
      ledgerRow({ sessionId: "a", model: "anthropic/claude-x", thinking: "high", inputTokens: 200, cacheReadTokens: 100 }),
      ledgerRow({ sessionId: "b", model: "openai/gpt-y", thinking: "high", inputTokens: 300, cacheReadTokens: 150 }),
    ].join("\n") + "\n");
    const out = captureReport();
    expect(out).toContain("cache%");
    // 100/200 = 50%, 150/300 = 50%
    expect(out).toContain("50%");
  });

  test("prints n a when provider omits cache fields", () => {
    writeFileSync(process.env.DISPATCH_LEDGER!, [
      ledgerRow({ sessionId: "a", model: "anthropic/claude-x", thinking: "high", inputTokens: 200 }),
      ledgerRow({ sessionId: "b", model: "anthropic/claude-x", thinking: "low", inputTokens: 100, cacheReadTokens: 0 }),
    ].join("\n") + "\n");
    const out = captureReport();
    expect(out).toContain("n/a");
    // group with cacheReadTokens: 0 and input 100 must not print n/a (it has cache data)
    const highLine = out.split("\n").find((l) => l.includes("claude-x / high"));
    expect(highLine).toContain("n/a");
    const lowLine = out.split("\n").find((l) => l.includes("claude-x / low"));
    expect(lowLine).toContain("0%");
  });

  test("n a when denominator group has cacheReadTokens but zero input", () => {
    writeFileSync(process.env.DISPATCH_LEDGER!, [
      ledgerRow({ sessionId: "a", model: "m1", inputTokens: 0, cacheReadTokens: 50 }),
    ].join("\n") + "\n");
    const out = captureReport();
    expect(out).toContain("n/a");
  });
});
