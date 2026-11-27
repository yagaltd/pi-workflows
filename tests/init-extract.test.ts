import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import {
  INIT_EXTRACT_SCHEMA,
  buildAdoptContext,
  extractAdoptDraft,
  writeAdoptDrafts,
  verifyAdoptDrafts,
  recordedAdoptBackend,
  noKeyMaterialIn,
  buildInitMiseFragment,
  INIT_MISE_FRAGMENT_PATH,
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

/* ── plan 081 T2: brownfield adopt draft wiring (Rust-only, draft-only) ──
 * Contract source: .workflows/specs/task-2.spec. The Rust fixture exercises
 * the recorded backend's cargo detection; the TypeScript fixture is the
 * byte-identical regression guard for every non-Rust project. */

const RUST_GATE_SENTENCE =
  "Rust structural gate: run `deslop-please` before `/review`; fix findings from first principles — no allowlist churn; consult the Rust skill family (`rust-review`, `rust-best-practices`, `rust-port`, `rust-crate-architecture`).";
const RUST_REVIEW_SKILLS = [
  "rust-review",
  "rust-best-practices",
  "rust-port",
  "rust-crate-architecture",
];

const RUST_FIXTURE: Record<string, string> = {
  "README.md": "# fixture-rs\n\nA small Rust CLI maintained by one team.\n",
  "Cargo.toml": '[package]\nname = "fixture-rs"\nversion = "0.1.0"\n',
  "src/main.rs": "fn main() {}\n",
  "docs/architecture.md": "# Architecture\n\nSingle-crate CLI.\n",
  "CONTRIBUTING.md": "# Contributing\n\ncargo test before push.\n",
  "scripts/agents-lint.sh": "#!/usr/bin/env bash\n# charter gate stub\n",
};

type AdoptBackend = ReturnType<typeof recordedAdoptBackend>;

async function draftAdopt(
  root: string,
  backend: AdoptBackend = recordedAdoptBackend(root)
) {
  const ctx = buildAdoptContext(root);
  const er = await extractAdoptDraft(backend, ctx);
  if (er.skipped || !er.draft) throw new Error(`adopt draft skipped: ${er.reason}`);
  const written = writeAdoptDrafts(root, er.draft);
  return {
    draft: er.draft,
    profile: JSON.parse(fs.readFileSync(written.profile, "utf8")) as Record<string, any>,
    charter: fs.readFileSync(written.charter, "utf8"),
    suggestions: fs.readFileSync(written.suggestions, "utf8"),
  };
}

/** Override only the resolved stack in the recorded response: lets a test
 *  separate "Cargo.toml was detected" from "the stack resolved to Rust". */
function withStack(
  backend: AdoptBackend,
  stackDetection: { stack: string; reviewSkills: string[] }
): AdoptBackend {
  return {
    name: backend.name,
    classify: async (schema, input) => {
      const result = (await backend.classify(schema, input)) as any;
      if (result.skipped || !result.value) return result;
      return { ...result, value: { ...result.value, stackDetection } };
    },
  };
}

describe("init-extract (plan 081 T2) — Rust adopt draft wiring", () => {
  test("test_adopt_rust_profile_marker", async () => {
    const root = makeRepo(RUST_FIXTURE);
    const { profile } = await draftAdopt(root);

    // draft-only top-level marker, never a new commands/gates entry
    expect(Object.prototype.hasOwnProperty.call(profile, "architectureGate")).toBe(true);
    const marker = profile.architectureGate;
    expect(typeof marker).toBe("object");
    expect(marker).not.toBeNull();
    const markerText = JSON.stringify(marker);
    expect(markerText).toContain("deslop-please");
    expect(markerText).toContain("rust-analyzer");
    expect(profile.commands).toEqual({
      test: "cargo test",
      lint: "cargo clippy -- -D warnings",
      build: "cargo build",
    });
    expect(profile.gates).toEqual(["scripts/agents-lint.sh"]);
    expect(profile.commands).not.toHaveProperty("architectureGate");
    expect(profile.gates).not.toContain("deslop-please");
    expect(fs.existsSync(path.join(root, ".deslop-please.allow"))).toBe(false);

    // both conditions are required: cargo manifest AND resolved Rust stack
    const cargoNoRust = makeRepo(RUST_FIXTURE);
    const noRustStack = await draftAdopt(
      cargoNoRust,
      withStack(recordedAdoptBackend(cargoNoRust), {
        stack: "TypeScript (npm)",
        reviewSkills: ["security-audit"],
      })
    );
    expect(Object.prototype.hasOwnProperty.call(noRustStack.profile, "architectureGate")).toBe(false);

    const rustNoCargo = makeRepo(CLEAN_REPO);
    const noCargo = await draftAdopt(
      rustNoCargo,
      withStack(recordedAdoptBackend(rustNoCargo), {
        stack: "Rust (cargo)",
        reviewSkills: RUST_REVIEW_SKILLS,
      })
    );
    expect(Object.prototype.hasOwnProperty.call(noCargo.profile, "architectureGate")).toBe(false);
  });

  test("test_adopt_rust_review_skills", async () => {
    const root = makeRepo(RUST_FIXTURE);
    const { draft, suggestions } = await draftAdopt(root);

    expect(draft.stackDetection.reviewSkills).toEqual(RUST_REVIEW_SKILLS);
    const skillsLine = suggestions.split("\n").find((l) => l.startsWith("- reviewSkills:")) ?? "";
    const listed = skillsLine
      .replace(/^- reviewSkills:\s*/, "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    expect(listed).toEqual(RUST_REVIEW_SKILLS);
    // deslop-please is a CLI gate, not an installed Pi skill — invent none
    expect(listed).not.toContain("deslop-please");
    expect(draft.stackDetection.reviewSkills).not.toContain("deslop-please");
  });

  test("test_adopt_rust_charter_gate", async () => {
    const root = makeRepo(RUST_FIXTURE);
    const { charter } = await draftAdopt(root);
    const project = charter.split("## PROJECT")[1] ?? "";

    expect(project).toContain(RUST_GATE_SENTENCE);
    const pointerLine = project.split("\n").find((l) => l.includes("Review pointers cite")) ?? "";
    expect(pointerLine).toContain("Rust (cargo)");
    for (const skill of RUST_REVIEW_SKILLS) expect(pointerLine).toContain(skill);
  });

  test("test_adopt_non_rust_unchanged", async () => {
    const root = makeRepo(CLEAN_REPO); // TypeScript brownfield fixture
    const { draft, profile, charter, suggestions } = await draftAdopt(root);

    expect(Object.prototype.hasOwnProperty.call(profile, "architectureGate")).toBe(false);
    expect(JSON.stringify(profile)).not.toContain("deslop-please");
    expect(JSON.stringify(profile)).not.toContain("rust-analyzer");
    expect(draft.stackDetection.reviewSkills).toEqual(["security-audit"]);
    expect(charter).not.toContain(RUST_GATE_SENTENCE);
    expect(charter).not.toContain("rust-crate-architecture");
    expect(suggestions).toContain("- reviewSkills: security-audit");
    expect(suggestions).not.toContain("rust-crate-architecture");

    // byte-identical to the pre-change output (dates computed, not pinned)
    const day = (offset: number) =>
      new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    expect(profile).toEqual({
      commands: { test: "bun test", lint: "bunx eslint ." },
      pointers: {
        "project-overview": "README.md",
        conventions: "CONTRIBUTING.md",
        architecture: "docs/architecture.md",
        "build-manifest": "package.json",
        "charter-gate": "scripts/agents-lint.sh",
      },
      tree: { docs: "docs", scripts: "scripts", src: "src", tests: "tests" },
      gates: ["scripts/agents-lint.sh"],
      scaffolds: { kinds: {} },
      meta: {
        generated_by: "init-extract draft — judge-drafted, lint-verified; NOT final config",
        generated_at: day(0),
        stale_after: day(30),
      },
    });
    const project = charter.split("## PROJECT")[1] ?? "";
    expect(project).toContain("- Review pointers cite the TypeScript (npm) skill family: security-audit.");
    expect(project).not.toContain("Rust structural gate");
  });

  test("test_adopt_no_forbidden_changes", () => {
    const repoRoot = path.resolve(import.meta.dir, "..");
    // TASK 4 owns the live judge schema in extensions/index.ts and the shell
    // gate; profile-lint.sh is owned by plan 20261127-083 TASK 2, so its
    // formatter-block change is no longer a forbidden diff here.
    const diff = spawnSync(
      "git",
      [
        "diff",
        "--exit-code",
        "--",
        "scripts/flow-gates.mjs",
      ],
      { cwd: repoRoot, encoding: "utf-8" }
    );
    expect(`${diff.stdout}${diff.stderr}`).toBe("");
    expect(diff.status).toBe(0);
    expect(fs.existsSync(path.join(repoRoot, ".deslop-please.allow"))).toBe(false);
    expect(fs.readdirSync(repoRoot).filter((f) => f.endsWith(".allow"))).toEqual([]);
    expect(Object.keys((INIT_EXTRACT_SCHEMA as any).properties).sort()).toEqual([
      "charterPointers",
      "confidence",
      "evidence",
      "gates",
      "profileCommands",
      "stackDetection",
      "treeDomains",
    ]);
  });
});

/* ── plan 081 TASK 4: live judge schema parity with the recorded backend ── */
describe("init-extract (plan 081 T4) — live schema four-skill parity", () => {
  test("test_live_schema_review_skills", async () => {
    const reviewSkills = (INIT_EXTRACT_SCHEMA as any).properties.stackDetection
      .properties.reviewSkills;
    const description = String(reviewSkills?.description ?? "");
    const namedRustSkills = [...description.matchAll(/\brust-[a-z0-9-]+/g)].map(
      (m) => m[0]
    );
    expect(
      [...new Set(namedRustSkills)].sort(),
      "the live judge schema must name the same four-skill Rust family as the recorded backend"
    ).toEqual([...RUST_REVIEW_SKILLS].sort());

    // The recorded backend (and therefore the generated Rust charter) must
    // stay in lockstep with what the live schema tells the judge to draft.
    const root = makeRepo(RUST_FIXTURE);
    const { draft } = await draftAdopt(root);
    expect(draft.stackDetection.reviewSkills).toEqual(RUST_REVIEW_SKILLS);
  });
});

/* ── plan 20261125-082 TASK 2: generated mise wrapper ──
 * /init writes namespaced wrappers only. The lint stays package-owned behind
 * PI_WORKFLOWS_BIN; no executable script is copied into the consumer tree. */
describe("init-extract (plan 20261125-082 TASK 2) — generated mise wrapper", () => {
  test("test_init_mise_wrapper", () => {
    const fragment = buildInitMiseFragment();
    expect(fragment).toContain('[tasks."wf:judge-context"]');
    expect(fragment).toMatch(/^run = .*"\$PI_WORKFLOWS_BIN" judge-context "\$@".*$/m);

    // A fragment is TOML wrapper definitions, never a script body or a path
    // into the installed package's scripts directory.
    for (const line of fragment.split("\n").filter((l) => l.trim() !== "")) {
      const wrapperLine =
        /^\[tasks\."wf:[a-z0-9-]+"\]$/.test(line) ||
        line.startsWith("description = ") ||
        line.startsWith("run = ");
      expect(line.startsWith("#") || wrapperLine).toBe(true);
    }
    expect(fragment).not.toContain("exec ");
    expect(fragment).not.toContain("#!");
    expect(fragment).not.toContain("scripts/");

    const root = makeRepo(CLEAN_REPO);
    const target = path.join(root, INIT_MISE_FRAGMENT_PATH);
    fs.mkdirSync(path.dirname(target), { recursive: true });

    const listFiles = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        if (entry.name === ".git") return [];
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? listFiles(full) : [full];
      });
    const before = new Set(listFiles(root));
    fs.writeFileSync(target, fragment);

    const added = listFiles(root).filter((f) => !before.has(f));
    expect(added).toEqual([target]);
    expect(fs.statSync(target).mode & 0o111).toBe(0);
    expect(fs.existsSync(path.join(root, "scripts", "check-judge-context.mjs"))).toBe(false);
    expect(fs.existsSync(path.join(root, "scripts", "wf.sh"))).toBe(false);
  });
});

/* ── plan 20261127-083 TASK 2: formatter profile detection / owner gate ──
 * Contract source: .workflows/specs/task-2.spec. The registry is deterministic
 * marker→profile detection over on-disk evidence only. Every formatter tool is
 * a PATH stub that logs invocations: detection/offers may resolve a tool, but
 * no check/fmt/format process and no write may happen before owner approval.
 * The contract seam is scripts/init-extract.ts exporting
 * detectFormatterProfiles(root) and buildFormatterOffer(profile). */

const FORMATTER_SCRIPT = path.resolve(import.meta.dir, "..", "scripts", "init-extract.ts");

type FormatterProfileLike = {
  id?: unknown;
  command?: unknown;
  checkCommand?: unknown;
  evidence?: unknown;
  targets?: unknown;
  status?: unknown;
};

function makeFormatterStubs(): { dir: string; log: string; pathEnv: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "formatter-stub-"));
  const log = path.join(dir, "invocations.log");
  for (const name of ["dprint", "ruff", "cargo", "shfmt"]) {
    const p = path.join(dir, name);
    fs.writeFileSync(
      p,
      [
        "#!/usr/bin/env bash",
        `echo "$*" >> ${JSON.stringify(log)}`,
        'case "$1" in',
        "  --version|version|-V|--help) echo stub; exit 0 ;;",
        "esac",
        "exit 0",
        "",
      ].join("\n"),
      { mode: 0o755 }
    );
    fs.chmodSync(p, 0o755);
  }
  return { dir, log, pathEnv: `${dir}${path.delimiter}${process.env.PATH ?? ""}` };
}

async function formatterModule(names: string[]): Promise<Record<string, (...args: any[]) => any>> {
  const mod = (await import("../scripts/init-extract.ts")) as Record<string, unknown>;
  for (const name of names)
    if (typeof mod[name] !== "function")
      throw new Error(`scripts/init-extract.ts must export ${name}() for the formatter registry contract`);
  return mod as Record<string, (...args: any[]) => any>;
}

function asProfiles(value: unknown): FormatterProfileLike[] {
  if (Array.isArray(value)) return value as FormatterProfileLike[];
  if (value && typeof value === "object") return Object.values(value) as FormatterProfileLike[];
  return [];
}

function flattenPaths(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenPaths);
  if (value && typeof value === "object") return Object.values(value).flatMap(flattenPaths);
  return [];
}

const idOf = (p: FormatterProfileLike) => (typeof p.id === "string" ? p.id : "");
const cmdOf = (p: FormatterProfileLike) =>
  typeof p.command === "string" ? p.command : typeof p.checkCommand === "string" ? p.checkCommand : "";
const targetsOf = (p: FormatterProfileLike) =>
  flattenPaths((p as any).targets ?? (p as any).files ?? (p as any).paths);

async function detectFormatters(root: string): Promise<FormatterProfileLike[]> {
  const mod = await formatterModule(["detectFormatterProfiles"]);
  return asProfiles(await mod.detectFormatterProfiles(root));
}

async function offerText(profile: FormatterProfileLike): Promise<string> {
  const mod = await formatterModule(["buildFormatterOffer"]);
  const value = await mod.buildFormatterOffer(profile);
  if (typeof value === "string") return value;
  if (value && typeof value.text === "string") return value.text;
  return JSON.stringify(value ?? "");
}

function checkInvocations(logPath: string): string[] {
  try {
    return fs
      .readFileSync(logPath, "utf8")
      .split("\n")
      .filter((line) => /\b(check|fmt|format)\b/.test(line));
  } catch {
    return [];
  }
}

const GATE_STUB = "#!/usr/bin/env bash\n# fixture gate stub\n";

const DPRINT_TS_FILES: Record<string, string> = {
  "README.md": "# dprint fixture\n",
  "package.json": JSON.stringify(
    {
      name: "dprint-fixture",
      scripts: { test: "bun test", lint: "bun x tsc --noEmit" },
      devDependencies: { dprint: "0.50.0" },
    },
    null,
    2
  ),
  "dprint.json": JSON.stringify(
    {
      plugins: [
        "https://plugins.dprint.dev/typescript-0.93.0.wasm",
        "https://plugins.dprint.dev/json-0.20.0.wasm",
      ],
      includes: ["**/*.ts", "**/*.js", "**/*.json"],
      typescript: { lineWidth: 100 },
    },
    null,
    2
  ),
  "src/index.ts": "export const x = 1;\n",
  "src/util.js": "module.exports = 1;\n",
  "data/config.json": '{"a":1}\n',
  "scripts/agents-lint.sh": GATE_STUB,
};

const PYTHON_RUFF_FILES: Record<string, string> = {
  "README.md": "# python fixture\n",
  "pyproject.toml": '[tool.ruff]\nline-length = 100\n',
  "src/app.py": "x=1\n",
  "scripts/agents-lint.sh": GATE_STUB,
};

const RUST_FILES: Record<string, string> = {
  "README.md": "# rust fixture\n",
  "Cargo.toml": '[package]\nname = "fixture-rs"\nversion = "0.1.0"\n',
  "src/main.rs": "fn main() {}\n",
  "scripts/agents-lint.sh": GATE_STUB,
};

const SHELL_FILES: Record<string, string> = {
  "README.md": "# shell fixture\n",
  ".shfmt": "-i 2 -ci -sr\n",
  "scripts/run.sh": "#!/usr/bin/env bash\necho ok\n",
  "scripts/agents-lint.sh": GATE_STUB,
};

const PLUGIN_FILES: Record<string, string> = {
  ...DPRINT_TS_FILES,
  "dprint.json": JSON.stringify(
    {
      plugins: [
        "https://plugins.dprint.dev/typescript-0.93.0.wasm",
        "https://plugins.dprint.dev/toml-0.6.3.wasm",
        "https://plugins.dprint.dev/sql-0.4.0.wasm",
        "https://plugins.dprint.dev/jupyter-0.2.0.wasm",
        "https://plugins.dprint.dev/dockerfile-0.3.2.wasm",
      ],
      includes: ["**/*.ts", "**/*.toml", "**/*.sql", "**/*.ipynb", "**/Dockerfile"],
    },
    null,
    2
  ),
  "conf.toml": "key = 1\n",
  "query.sql": "SELECT 1;\n",
  "notebook.ipynb": "{}\n",
  Dockerfile: "FROM scratch\n",
};

const CONTROL_FILES: Record<string, string> = {
  "README.md": "# unmarked fixture\n",
  "src/index.ts": "export const x = 1;\n",
  "docs/guide.md": "# guide\n",
};

type FileSnapshot = Map<string, { sha: string; mode: number }>;

function snapshot(root: string): FileSnapshot {
  const out: FileSnapshot = new Map();
  const walk = (dir: string, rel: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.name === ".git") continue;
      const full = path.join(dir, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(full, r);
      else if (e.isFile())
        out.set(r, {
          sha: crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex"),
          mode: fs.statSync(full).mode & 0o777,
        });
    }
  };
  walk(root, "");
  return out;
}

function expectOnlyDraftChanges(before: FileSnapshot, after: FileSnapshot, label: string): void {
  const added = [...after.keys()].filter((p) => !before.has(p));
  const removed = [...before.keys()].filter((p) => !after.has(p));
  const mutated = [...after.keys()].filter((p) => {
    const b = before.get(p);
    return b && (!/\.draft(?:\.|$)/.test(p)) && (b.sha !== after.get(p)!.sha || b.mode !== after.get(p)!.mode);
  });
  expect({ label, added, removed, mutated }).toEqual({ label, added: [], removed: [], mutated: [] });
}

function seedDrafts(root: string): void {
  const dir = path.join(root, ".workflows");
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ["profile.json.draft", "AGENTS.md.draft", "tree.json.draft", "charter-pointers.draft.md"])
    fs.writeFileSync(path.join(dir, f), `seeded ${f}\n`);
}

describe("init-extract (plan 20261127-083 T2) — formatter detection + owner gate", () => {
  test("test_formatter_registry_detects_stacks", async () => {
    const stubs = makeFormatterStubs();
    const previousPath = process.env.PATH;
    process.env.PATH = stubs.pathEnv;
    try {
      const twice = async (files: Record<string, string>) => {
        const root = makeRepo(files);
        const first = await detectFormatters(root);
        const second = await detectFormatters(root);
        expect(JSON.stringify(first), "detection must be byte-identical across two runs").toBe(
          JSON.stringify(second)
        );
        return first;
      };

      const ts = await twice(DPRINT_TS_FILES);
      const py = await twice(PYTHON_RUFF_FILES);
      const wrapped = await twice({
        ...PYTHON_RUFF_FILES,
        "dprint.json": JSON.stringify({
          exec: [{ command: "ruff format --check", ext: "py" }],
          includes: ["**/*.py"],
        }),
      });
      const rust = await twice(RUST_FILES);
      const shell = await twice(SHELL_FILES);
      const plugins = await twice(PLUGIN_FILES);
      const control = await twice(CONTROL_FILES);

      for (const [label, profiles] of Object.entries({ ts, py, wrapped, rust, shell, plugins })) {
        expect(profiles.length, `${label}: expected a detected profile`).toBeGreaterThan(0);
        for (const p of profiles) {
          expect(idOf(p).length, `${label}: profile id`).toBeGreaterThan(0);
          expect(cmdOf(p).length, `${label}: exact read-only check command`).toBeGreaterThan(0);
          expect(flattenPaths(p.evidence).length, `${label}: evidence paths`).toBeGreaterThan(0);
          expect(["offer", "skip"]).toContain(p.status);
        }
      }

      expect(
        ts.some((p) => /\bdprint\b/.test(cmdOf(p)) && /\bcheck\b/.test(cmdOf(p))),
        "TS/JS/JSON must resolve to a dprint check command"
      ).toBe(true);
      expect(py.some((p) => cmdOf(p).includes("ruff format --check")), "Python must resolve to Ruff").toBe(true);
      expect(py.every((p) => !cmdOf(p).includes("dprint")), "no dprint Ruff wrapper without config").toBe(true);
      expect(
        wrapped.some((p) => /dprint/.test(cmdOf(p)) && /ruff/.test(cmdOf(p))),
        "dprint Ruff wrapper only when existing config names it"
      ).toBe(true);
      expect(rust.some((p) => cmdOf(p).includes("cargo fmt --check")), "Rust must prefer cargo fmt --check").toBe(true);
      expect(rust.every((p) => !/\bdprint\b/.test(cmdOf(p))), "no dprint exec as a Rust default").toBe(true);
      expect(
        shell.some((p) => /\bshfmt\b/.test(cmdOf(p)) && !/(^|\s)-w(\s|$)/.test(cmdOf(p))),
        "shell must use a read-only shfmt check"
      ).toBe(true);
      const pluginProfile = plugins.find((p) => /\bdprint\b/.test(cmdOf(p)));
      expect(pluginProfile, "pinned dprint plugins must produce a dprint profile").toBeDefined();
      const pluginTargets = targetsOf(pluginProfile!).join("\n");
      for (const rel of ["conf.toml", "query.sql", "notebook.ipynb", "Dockerfile"])
        expect(pluginTargets, `dprint plugin target ${rel}`).toContain(rel);

      expect(control, "source files without markers/config must yield no profile").toHaveLength(0);
      for (const p of [...ts, ...py, ...wrapped, ...rust, ...shell, ...plugins, ...control])
        expect(targetsOf(p).join("\n")).not.toMatch(/\.mdx?(?:\s|$)/);
      expect(checkInvocations(stubs.log), "detection must not run a check").toEqual([]);
    } finally {
      process.env.PATH = previousPath;
    }
  }, 30000);

  test("test_owner_gate_offer", async () => {
    const stubs = makeFormatterStubs();
    const previousPath = process.env.PATH;
    process.env.PATH = stubs.pathEnv;
    try {
      const root = makeRepo({ ...PYTHON_RUFF_FILES, ...RUST_FILES });
      const before = snapshot(root);
      const profiles = await detectFormatters(root);
      const ruff = profiles.find((p) => /ruff/i.test(idOf(p)));
      const rust = profiles.find((p) => /cargo|rust/i.test(idOf(p)));
      expect(ruff, "Ruff profile must be detected").toBeDefined();
      expect(rust, "Rust profile must be detected").toBeDefined();

      for (const p of [ruff!, rust!]) {
        const text = await offerText(p);
        expect(text).toContain(idOf(p));
        expect(text).toContain(cmdOf(p));
        expect(flattenPaths(p.evidence).some((e) => text.includes(e))).toBe(true);
        expect(text).toMatch(/requires explicit owner approval/i);
      }
      const rustOffer = await offerText(rust!);
      expect(rustOffer).toContain("cargo fmt --check");
      expect(rustOffer, "dprint exec is an opt-in alternate only").toMatch(
        /opt[- ]?in|optional|alternate|only on (?:explicit )?request/i
      );
      expect(rustOffer).not.toMatch(/default[^\n]*dprint/i);

      // Declining means silence: no approval call, no writes, no formatter run.
      await offerText(rust!);
      expectOnlyDraftChanges(before, snapshot(root), "owner-gate offer without approval");
      expect(checkInvocations(stubs.log), "offer must not spawn a format/check process").toEqual([]);
    } finally {
      process.env.PATH = previousPath;
    }
  }, 30000);

  test("test_no_unapproved_writes", async () => {
    const stubs = makeFormatterStubs();
    const previousPath = process.env.PATH;
    process.env.PATH = stubs.pathEnv;
    try {
      const roots = [
        makeRepo(DPRINT_TS_FILES),
        makeRepo(PYTHON_RUFF_FILES),
        makeRepo(RUST_FILES),
      ];
      for (const root of roots) seedDrafts(root);

      for (const root of roots) {
        const before = snapshot(root);
        const profiles = await detectFormatters(root);
        expect(profiles.length, "fixture must expose a formatter profile").toBeGreaterThan(0);
        const offers = await Promise.all(profiles.map((p) => offerText(p)));
        expect(offers.join("\n")).toMatch(/requires explicit owner approval/i);
        expectOnlyDraftChanges(before, snapshot(root), "module API detection + offer");

        const cli = spawnSync(
          "bun",
          [FORMATTER_SCRIPT, "--root", root, "--recorded", "--formatter-offer"],
          { encoding: "utf-8", timeout: 60000, env: { ...process.env, PATH: stubs.pathEnv } }
        );
        const cliOut = `${cli.stdout ?? ""}${cli.stderr ?? ""}`;
        expect(cliOut, "CLI must present the formatter OFFER").toMatch(/\bOFFER\b/i);
        for (const p of profiles) expect(cliOut).toContain(idOf(p));
        expectOnlyDraftChanges(before, snapshot(root), "CLI detection + offer");

        const denied = spawnSync(
          "bun",
          [FORMATTER_SCRIPT, "--root", root, "--recorded", "--apply-formatter"],
          { encoding: "utf-8", timeout: 60000, env: { ...process.env, PATH: stubs.pathEnv } }
        );
        expect(denied.status, "apply without the approval flag must be rejected").not.toBe(0);
        expect(`${denied.stdout ?? ""}${denied.stderr ?? ""}`.toLowerCase()).toContain("approval");
        expectOnlyDraftChanges(before, snapshot(root), "apply without approval");
      }
      expect(checkInvocations(stubs.log), "no format/check process before approval").toEqual([]);
    } finally {
      process.env.PATH = previousPath;
    }
  }, 60000);
});

