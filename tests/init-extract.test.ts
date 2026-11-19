import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  INIT_EXTRACT_SCHEMA,
  buildAdoptContext,
  extractAdoptDraft,
  writeAdoptDrafts,
  verifyAdoptDrafts,
  recordedAdoptBackend,
  noKeyMaterialIn,
  type AdoptDraft,
} from "../scripts/init-extract.ts";

/* ── plan 078 T2: /init --adopt brownfield extraction draft ──
 * draft-by-judge, verify-by-gate: ONE batched judge call drafts
 * {profileCommands, treeDomains, stackDetection, charterPointers} + boolean
 * gate-questions; the extractor writes DRAFT files only; the deterministic
 * lints (profile-lint + agents-lint + check-tree) verify and a lint failure
 * blocks loudly. The judge never writes final config. */

function makeRepo(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "init-adopt-"));
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

const CLEAN_REPO: Record<string, string> = {
  "README.md": "# fixture-app\n\nA small TypeScript CLI maintained by one team.\n",
  "package.json": JSON.stringify(
    {
      name: "fixture-app",
      scripts: { test: "bun test", lint: "bunx eslint ." },
    },
    null,
    2
  ),
  "src/index.ts": "export const main = () => 0;\n",
  "src/util.ts": "export const id = <T>(x: T): T => x;\n",
  "tests/app.test.ts": 'import { expect, test } from "bun:test";\ntest("app", () => expect(1).toBe(1));\n',
  "docs/architecture.md": "# Architecture\n\nSingle-entry CLI.\n",
  "CONTRIBUTING.md": "# Contributing\n\nbun test before push.\n",
  "scripts/agents-lint.sh": "#!/usr/bin/env bash\n# charter gate stub\n",
};

const MESSY_REPO: Record<string, string> = {
  // no CONTRIBUTING.md → conventions slot unfilled → agents-lint FAIL
  "README.md": "# messy-app\n",
  "package.json": JSON.stringify(
    {
      name: "messy-app",
      scripts: { test: "definitely-missing-cmd-078 test" }, // bogus command → profile-lint FAIL
    },
    null,
    2
  ),
  "src/index.ts": "export const x = 1;\n",
  "stray-notes.md": "loose root note\n",
};

describe("init-extract (plan 078 T2) — context building", () => {
  test("buildAdoptContext carries manifests + top-level tree, bounded", () => {
    const root = makeRepo(CLEAN_REPO);
    const ctx = buildAdoptContext(root);
    expect(ctx).toContain("package.json");
    expect(ctx).toContain("bun test");
    expect(ctx).toContain("src/");
    expect(ctx).toContain("docs/");
    expect(ctx).not.toContain("node_modules/");
  });

  test("buildAdoptContext surfaces existing gate scripts and pointer candidates", () => {
    const root = makeRepo(CLEAN_REPO);
    const ctx = buildAdoptContext(root);
    expect(ctx).toContain("scripts/agents-lint.sh");
    expect(ctx).toContain("docs/architecture.md");
    expect(ctx).toContain("CONTRIBUTING.md");
  });
});

describe("init-extract (plan 078 T2) — one batched judge call", () => {
  test("the drafted shape is schema-driven over the seam", () => {
    const props = (INIT_EXTRACT_SCHEMA as any).properties;
    expect(props.profileCommands.type).toBe("object");
    expect(props.treeDomains.type).toBe("array");
    expect(props.stackDetection.type).toBe("object");
    expect(props.charterPointers.type).toBe("array");
    expect(props.gates.properties.testCommandPresent.type).toBe("boolean");
    expect(props.gates.properties.noKeyMaterialInCharter.type).toBe("boolean");
    expect((INIT_EXTRACT_SCHEMA as any).required).toContain("profileCommands");
    expect((INIT_EXTRACT_SCHEMA as any).required).toContain("gates");
    expect((INIT_EXTRACT_SCHEMA as any).additionalProperties).toBe(false);
  });

  test("extractAdoptDraft makes ONE classify call and returns the draft + gate booleans", async () => {
    const root = makeRepo(CLEAN_REPO);
    const ctx = buildAdoptContext(root);
    let calls = 0;
    const backend = recordedAdoptBackend(root);
    const counting: typeof backend = {
      name: backend.name,
      classify: async (schema, input) => {
        calls++;
        expect(schema).toBe(INIT_EXTRACT_SCHEMA);
        expect(input).toContain("bun test");
        return backend.classify(schema, input);
      },
    };
    const r = await extractAdoptDraft(counting, ctx);
    expect(calls).toBe(1);
    expect(r.skipped).toBeUndefined();
    const draft = r.draft!;
    expect(draft.commands.test).toBe("bun test");
    expect(draft.commands.lint).toBe("bunx eslint .");
    expect(draft.treeDomains.map((t) => t.path)).toContain("src");
    expect(draft.stackDetection.stack.toLowerCase()).toContain("typescript");
    expect(draft.charterPointers.some((p) => p.path === "README.md")).toBe(true);
    expect(draft.gates.testCommandPresent).toBe(true);
    expect(draft.gates.noKeyMaterialInCharter).toBe(true);
    expect(draft.confidence).toBeGreaterThanOrEqual(0.6);
  });

  test("a judge skip is LOUD and no draft is returned", async () => {
    const root = makeRepo(CLEAN_REPO);
    const ctx = buildAdoptContext(root);
    const skipping = {
      name: "no-key",
      classify: async () => ({
        skipped: true,
        bucket: null,
        confidence: 0,
        reason: "missing TYPELLM_API_KEY (env or ~/.config/pi-majordome/typellm.key)",
      }),
    };
    const r = await extractAdoptDraft(skipping as any, ctx);
    expect(r.skipped).toBe(true);
    expect(r.reason).toContain("missing TYPELLM_API_KEY");
    expect(r.draft).toBeUndefined();
  });

  test("below-floor extraction routes to the default path loudly (hand derivation)", async () => {
    const root = makeRepo(CLEAN_REPO);
    const ctx = buildAdoptContext(root);
    const backend = recordedAdoptBackend(root);
    const lowConf = {
      name: backend.name,
      classify: async (schema: object, input: string) => {
        const v = await backend.classify(schema, input);
        return { ...v, confidence: 0.3 };
      },
    };
    const r = await extractAdoptDraft(lowConf as any, ctx);
    expect(r.skipped).toBe(true);
    expect(r.reason).toContain("below confidence floor");
  });
});

describe("init-extract (plan 078 T2) — draft files, judge never writes final config", () => {
  test("writeAdoptDrafts writes *.draft files ONLY", async () => {
    const root = makeRepo(CLEAN_REPO);
    const ctx = buildAdoptContext(root);
    const er = await extractAdoptDraft(recordedAdoptBackend(root), ctx);
    expect(er.skipped).toBeUndefined();
    const written = writeAdoptDrafts(root, er.draft!);
    for (const p of Object.values(written)) expect(p.endsWith(".draft") || p.includes(".draft.")).toBe(true);
    for (const p of Object.values(written)) expect(fs.existsSync(p)).toBe(true);
    expect(fs.existsSync(path.join(root, ".workflows", "profile.json"))).toBe(false);
    expect(fs.existsSync(path.join(root, "AGENTS.md"))).toBe(false);
    expect(fs.existsSync(path.join(root, ".workflows", "tree.json"))).toBe(false);
  });

  test("the draft charter follows the template shape (CORE + POINTERS + PROJECT, no unfilled slots on a clean repo)", async () => {
    const root = makeRepo(CLEAN_REPO);
    const ctx = buildAdoptContext(root);
    const er = await extractAdoptDraft(recordedAdoptBackend(root), ctx);
    expect(er.skipped).toBeUndefined();
    const written = writeAdoptDrafts(root, er.draft!);
    const charter = fs.readFileSync(written.charter, "utf8");
    expect(charter).toContain("## CORE");
    expect(charter).toContain("## POINTERS");
    expect(charter).toContain("- Project overview");
    expect(charter).toContain("`README.md`");
    expect(charter).not.toContain("<placeholder>");
    expect(charter.split("\n").length).toBeLessThanOrEqual(60);
  });

  test("the pointer-suggestions file carries the stack's review-skill family + gate booleans", async () => {
    const root = makeRepo(CLEAN_REPO);
    const ctx = buildAdoptContext(root);
    const er = await extractAdoptDraft(recordedAdoptBackend(root), ctx);
    expect(er.skipped).toBeUndefined();
    const written = writeAdoptDrafts(root, er.draft!);
    const suggestions = fs.readFileSync(written.suggestions, "utf8");
    expect(suggestions).toContain("DRAFT");
    expect(suggestions).toContain("reviewSkills");
    expect(suggestions).toContain("testCommandPresent: true");
    expect(suggestions).toContain("noKeyMaterialInCharter: true");
  });
});

describe("init-extract (plan 078 T2) — verify-by-gate (lints on the drafts)", () => {
  test("clean repo: profile-lint + agents-lint + check-tree all PASS per path", async () => {
    const root = makeRepo(CLEAN_REPO);
    const ctx = buildAdoptContext(root);
    const er = await extractAdoptDraft(recordedAdoptBackend(root), ctx);
    expect(er.skipped).toBeUndefined();
    const written = writeAdoptDrafts(root, er.draft!);
    const v = await verifyAdoptDrafts(root, written);
    expect(v.ok).toBe(true);
    const byName = Object.fromEntries(v.checks.map((c) => [c.name, c]));
    expect(byName["profile-lint"].ok).toBe(true);
    expect(byName["agents-lint"].ok).toBe(true);
    expect(byName["check-tree"].ok).toBe(true);
  }, 30000);

  test("messy repo: lint failures are named per path and block loudly", async () => {
    const root = makeRepo(MESSY_REPO);
    const ctx = buildAdoptContext(root);
    const er = await extractAdoptDraft(recordedAdoptBackend(root), ctx);
    expect(er.skipped).toBeUndefined();
    const written = writeAdoptDrafts(root, er.draft!);
    const v = await verifyAdoptDrafts(root, written);
    expect(v.ok).toBe(false);
    const failed = v.checks.filter((c) => !c.ok);
    expect(failed.length).toBeGreaterThanOrEqual(1);
    const all = failed.flatMap((c) => c.findings).join("\n");
    expect(all).toContain("FAIL");
    // the bogus command is named
    expect(all).toContain("definitely-missing-cmd-078");
    // the unfilled conventions slot is named
    expect(all.includes("placeholder") || all.includes("pointers")).toBe(true);
  }, 30000);

  test("a draft that misses a top-level domain is a check-tree finding (never silent)", async () => {
    const root = makeRepo(CLEAN_REPO);
    const ctx = buildAdoptContext(root);
    const er = await extractAdoptDraft(recordedAdoptBackend(root), ctx);
    expect(er.skipped).toBeUndefined();
    const draft = er.draft!;
    const missingDocs: AdoptDraft = {
      ...draft,
      treeDomains: draft.treeDomains.filter((t) => t.path !== "docs"),
    };
    const written = writeAdoptDrafts(root, missingDocs);
    const v = await verifyAdoptDrafts(root, written);
    expect(v.ok).toBe(false);
    const tree = v.checks.find((c) => c.name === "check-tree")!;
    expect(tree.ok).toBe(false);
    expect(tree.findings.join("\n")).toContain("docs");
  });
});

describe("init-extract (plan 078 T2) — key-material gate question", () => {
  test("noKeyMaterialIn flags key-shaped assignments in draft text", () => {
    expect(noKeyMaterialIn("- Build: `package.json`\n- Test: bun test")).toBe(true);
    expect(noKeyMaterialIn('TOKEN=ghp_abcdefghij1234567890\n')).toBe(false);
    expect(noKeyMaterialIn('api_key = "sk-abc123def456"\n')).toBe(false);
  });

  test("the recorded gate question answers false when the manifest carries key material", async () => {
    const root = makeRepo({
      ...CLEAN_REPO,
      "package.json": JSON.stringify({
        name: "leaky-app",
        scripts: { test: "bun test", lint: "bunx eslint ." },
        apiKey: "sk-abcdef1234567890",
      }),
    });
    const backend = recordedAdoptBackend(root);
    const r = await extractAdoptDraft(backend, buildAdoptContext(root));
    expect(r.draft!.gates.noKeyMaterialInCharter).toBe(false);
  });
});

describe("init-extract (plan 078 T2) — CLI", () => {
  test("usage error exits 2", () => {
    const r = spawnSync("bun", ["scripts/init-extract.ts"], { encoding: "utf-8" });
    expect(r.status).toBe(2);
  });

  test("clean fixture repo: exit 0, drafts written, PASS per path", () => {
    const root = makeRepo(CLEAN_REPO);
    const r = spawnSync("bun", ["scripts/init-extract.ts", "--root", root, "--recorded"], {
      encoding: "utf-8",
      timeout: 120000,
    });
    expect(r.stdout).toContain("profile.json.draft");
    expect(r.stdout).toContain("PASS");
    expect(r.status).toBe(0);
  }, 60000);

  test("messy fixture repo: exit 1 with FAIL per path (blocks loudly)", () => {
    const root = makeRepo(MESSY_REPO);
    const r = spawnSync("bun", ["scripts/init-extract.ts", "--root", root, "--recorded"], {
      encoding: "utf-8",
      timeout: 120000,
    });
    expect(r.stdout).toContain("FAIL");
    expect(r.status).toBe(1);
  }, 60000);

  test("judge-skip path: exit 1 with the loud reason", () => {
    const root = makeRepo(CLEAN_REPO);
    const r = spawnSync(
      "bun",
      ["scripts/init-extract.ts", "--root", root],
      {
        encoding: "utf-8",
        timeout: 120000,
        env: {
          ...process.env,
          TYPELLM_API_KEY: "",
          TYPELLM_BASE_URL: "http://127.0.0.1:1", // dead port — fast loud skip even when a key file exists
        },
      }
    );
    expect(`${r.stdout}${r.stderr}`).toContain("JUDGE SKIPPED");
    expect(r.status).toBe(1);
  }, 60000);
});

