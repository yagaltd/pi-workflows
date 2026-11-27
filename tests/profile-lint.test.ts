import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/* ── plan 20261127-083 TASK 2: profile-lint formatter block ──
 * Contract source: .workflows/specs/task-2.spec. profile-lint.sh gains an
 * optional `formatter` block check (id, command, evidence, status). A missing
 * executable is a LOUD SKIP on stderr with exit 3 — never a PASS, never an
 * invented command. Markdown is not a formatter target; docs-lint stays
 * authoritative. All tools are PATH stubs so no real format process can run. */

const LINT = path.resolve(import.meta.dir, "..", "scripts", "profile-lint.sh");
const DRAFT = ".workflows/profile.json.draft";

type FormatterProfileLike = {
  id?: unknown;
  command?: unknown;
  checkCommand?: unknown;
  evidence?: unknown;
  targets?: unknown;
  status?: unknown;
};

function makeRepo(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "profile-lint-formatter-"));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  fs.mkdirSync(path.join(root, ".workflows"), { recursive: true });
  const r = spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf-8" });
  if (r.status !== 0) throw new Error(`git init failed: ${r.stderr}`);
  return root;
}

function day(offset: number): string {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}

function validProfile(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    commands: { test: "true", lint: "true" },
    pointers: { overview: "README.md" },
    tree: { src: "src" },
    gates: ["scripts/agents-lint.sh"],
    scaffolds: { kinds: {} },
    meta: { generated_by: "fixture", generated_at: day(0), stale_after: day(30) },
    ...extra,
  };
}

function formatterBlock(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "dprint-ts",
    command: "dprint check",
    evidence: ["dprint.json", "src/index.ts"],
    status: "offer",
    targets: ["src/index.ts"],
    ...overrides,
  };
}

function writeDraft(root: string, profile: Record<string, unknown>): string {
  const p = path.join(root, DRAFT);
  fs.writeFileSync(p, `${JSON.stringify(profile, null, 2)}\n`);
  return p;
}

function makeToolBin(withDprint: boolean): { log: string; pathEnv: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "formatter-bin-"));
  const log = path.join(dir, "invocations.log");
  for (const name of withDprint ? ["dprint", "ruff", "cargo", "shfmt"] : ["ruff", "cargo", "shfmt"]) {
    const p = path.join(dir, name);
    fs.writeFileSync(
      p,
      [
        "#!/usr/bin/env bash",
        `echo "$*" >> ${JSON.stringify(log)}`,
        "case \"$1\" in",
        "  --version|version|-V|--help) echo stub; exit 0 ;;",
        "esac",
        "exit 0",
        "",
      ].join("\n"),
      { mode: 0o755 },
    );
    fs.chmodSync(p, 0o755);
  }
  // Deliberately narrow: the missing case has no dprint anywhere on PATH.
  return { log, pathEnv: [dir, "/usr/bin", "/bin"].join(path.delimiter) };
}

function runLint(profilePath: string, pathEnv: string) {
  return spawnSync("bash", [LINT, profilePath], {
    encoding: "utf-8",
    timeout: 30_000,
    env: { ...process.env, PATH: pathEnv },
  });
}

async function detectWithPath(root: string, pathEnv: string): Promise<FormatterProfileLike[]> {
  const previous = process.env.PATH;
  process.env.PATH = pathEnv;
  try {
    const mod = (await import("../scripts/init-extract.ts")) as Record<string, unknown>;
    if (typeof mod.detectFormatterProfiles !== "function") {
      throw new Error(
        "scripts/init-extract.ts must export detectFormatterProfiles() for the formatter registry contract",
      );
    }
    const value = await (mod.detectFormatterProfiles as (r: string) => unknown)(root);
    if (Array.isArray(value)) return value as FormatterProfileLike[];
    if (value && typeof value === "object") return Object.values(value) as FormatterProfileLike[];
    return [];
  } finally {
    process.env.PATH = previous;
  }
}

async function offerText(profile: FormatterProfileLike): Promise<string> {
  const mod = (await import("../scripts/init-extract.ts")) as Record<string, unknown>;
  if (typeof mod.buildFormatterOffer !== "function") {
    throw new Error("scripts/init-extract.ts must export buildFormatterOffer() for the owner-gate contract");
  }
  const value = await (mod.buildFormatterOffer as (p: FormatterProfileLike) => unknown)(profile);
  return typeof value === "string"
    ? value
    : value && typeof (value as any).text === "string"
    ? (value as any).text
    : JSON.stringify(value ?? "");
}

const idOf = (p: FormatterProfileLike) => (typeof p.id === "string" ? p.id : "");
const cmdOf = (p: FormatterProfileLike) =>
  typeof p.command === "string" ? p.command : typeof p.checkCommand === "string" ? p.checkCommand : "";
const targetsOf = (p: FormatterProfileLike): string[] => {
  const walk = (v: unknown): string[] => {
    if (typeof v === "string") return [v];
    if (Array.isArray(v)) return v.flatMap(walk);
    if (v && typeof v === "object") return Object.values(v).flatMap(walk);
    return [];
  };
  return walk((p as any).targets ?? (p as any).files ?? (p as any).paths);
};

function checkInvocations(logPath: string): string[] {
  try {
    return fs.readFileSync(logPath, "utf8").split("\n").filter((l) => /\b(check|fmt|format)\b/.test(l));
  } catch {
    return [];
  }
}

const DPRINT_CONFIG = JSON.stringify(
  {
    plugins: ["https://plugins.dprint.dev/typescript-0.93.0.wasm"],
    includes: ["**/*.ts"],
  },
  null,
  2,
);

const BASE_FILES: Record<string, string> = {
  "README.md": "# formatter fixture\n",
  "src/index.ts": "export const x = 1;\n",
  "scripts/agents-lint.sh": "#!/usr/bin/env bash\n# fixture gate stub\n",
};

describe("profile-lint (plan 20261127-083 T2) — formatter block", () => {
  test("test_missing_tool_loud_skip", async () => {
    const root = makeRepo({ ...BASE_FILES, "dprint.json": DPRINT_CONFIG });
    const draft = writeDraft(root, validProfile({ formatter: formatterBlock() }));

    const missing = makeToolBin(false);
    const missingProfiles = await detectWithPath(root, missing.pathEnv);
    const skipped = missingProfiles.find((p) => /dprint/i.test(idOf(p)));
    expect(skipped, "a missing dprint must be reported, not silently dropped").toBeDefined();
    expect(String(skipped!.status)).toBe("skip");
    expect(cmdOf(skipped!)).not.toMatch(/\bcheck\b/);

    const r = runLint(draft, missing.pathEnv);
    const stderr = r.stderr ?? "";
    const combined = `${r.stdout ?? ""}${stderr}`;
    expect(stderr).toMatch(/SKIP:\s*formatter\s+dprint[^\n]*\(tool not found\)/i);
    expect(stderr).toContain("dprint");
    expect(combined).not.toMatch(/PASS:\s*formatter/i);
    expect(r.status, "missing formatter tool exits 3, never 0 or 1").toBe(3);

    const restored = makeToolBin(true);
    const restoredProfiles = await detectWithPath(root, restored.pathEnv);
    const offered = restoredProfiles.find((p) => /dprint/i.test(idOf(p)));
    expect(offered, "restoring the tool must restore the OFFER").toBeDefined();
    expect(String(offered!.status)).toBe("offer");
    expect(cmdOf(offered!)).toContain("dprint check");
    const ok = runLint(draft, restored.pathEnv);
    expect(`${ok.stdout ?? ""}${ok.stderr ?? ""}`).toContain("dprint check");
    expect(`${ok.stdout ?? ""}${ok.stderr ?? ""}`).toMatch(/OFFER/i);
    expect(checkInvocations(restored.log), "no format/check command may be executed").toEqual([]);
  }, 30000);

  test("test_markdown_excluded", async () => {
    const markdownConfig = JSON.stringify(
      {
        plugins: [
          "https://plugins.dprint.dev/typescript-0.93.0.wasm",
          "https://plugins.dprint.dev/markdown-0.17.8.wasm",
        ],
        includes: ["**/*.ts", "**/*.md", "**/*.mdx"],
      },
      null,
      2,
    );
    const root = makeRepo({
      ...BASE_FILES,
      "dprint.json": markdownConfig,
      "README.mdx": "# mdx fixture\n",
      "docs/guide.md": "# guide\n",
    });
    const stub = makeToolBin(true);
    const profiles = await detectWithPath(root, stub.pathEnv);
    expect(profiles.length, "dprint config must still produce a profile").toBeGreaterThan(0);
    expect(JSON.stringify(profiles)).not.toMatch(/\.mdx?\b/);
    const dprint = profiles.find((p) => /dprint/i.test(idOf(p)));
    expect(dprint, "dprint profile must be present").toBeDefined();
    for (const target of targetsOf(dprint!)) expect(target).not.toMatch(/\.mdx?$/i);

    const offer = await offerText(dprint!);
    expect(offer).toMatch(/markdown/i);
    expect(offer).toMatch(/excluded/i);
    expect(offer, "docs-lint stays authoritative for Markdown").toMatch(/docs-lint/i);

    const cleanDraft = writeDraft(root, validProfile({ formatter: formatterBlock() }));
    const clean = runLint(cleanDraft, stub.pathEnv);
    const cleanOut = `${clean.stdout ?? ""}${clean.stderr ?? ""}`;
    expect(cleanOut).toMatch(/PASS:\s*formatter/i);
    expect(cleanOut).not.toMatch(/\.mdx?\b/);

    const markdownOnly = writeDraft(
      root,
      validProfile({
        formatter: formatterBlock({ targets: ["docs/guide.md"], evidence: ["docs/guide.md"] }),
      }),
    );
    const md = runLint(markdownOnly, stub.pathEnv);
    const mdOut = `${md.stdout ?? ""}${md.stderr ?? ""}`;
    expect(mdOut).not.toMatch(/(PASS|SKIP):\s*formatter[^\n]*\.mdx?/i);
    expect(mdOut, "a Markdown-only draft earns no formatter verdict at all").not.toMatch(
      /(PASS|SKIP):\s*formatter/i,
    );
    expect(checkInvocations(stub.log), "Markdown validation must not run a formatter").toEqual([]);
  }, 30000);

  test("test_fail_takes_precedence_over_formatter_skip", async () => {
    const root = makeRepo({ ...BASE_FILES, "dprint.json": DPRINT_CONFIG });
    const draft = writeDraft(
      root,
      validProfile({
        pointers: { overview: "does-not-exist.md" },
        formatter: formatterBlock(),
      }),
    );
    const missing = makeToolBin(false);

    const r = runLint(draft, missing.pathEnv);
    const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    expect(out).toMatch(/FAIL:\s*pointers\.overview/);
    expect(out).toMatch(/SKIP:\s*formatter\s+dprint[^\n]*\(tool not found\)/i);
    expect(out, "a real FAIL forbids a formatter PASS").not.toMatch(/PASS:\s*formatter/i);
    expect(r.status, "an existing FAIL outranks a formatter SKIP (exit 1, not 3)").toBe(1);
    expect(checkInvocations(missing.log), "no format/check command may be executed").toEqual([]);
  }, 30000);
});
