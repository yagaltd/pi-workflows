#!/usr/bin/env bun
// init-extract — the /init --adopt brownfield extraction draft (plan 078 T2).
// draft-by-judge, verify-by-gate: reads the brownfield tree + build manifests,
// makes ONE batched judge call drafting {profileCommands, treeDomains,
// stackDetection, charterPointers} + the boolean gate-questions, writes DRAFT
// files only (profile.json.draft + AGENTS.md.draft + tree.json.draft +
// charter-pointers.draft.md), then runs the deterministic lints on the drafts
// (profile-lint + agents-lint + check-tree) and reports pass/fail per path.
// THE JUDGE NEVER WRITES FINAL CONFIG — the /init flow presents the drafts,
// the owner corrects, and the flow's own lint gates (unchanged) block the
// handoff. A judge skip (no key / endpoint down / below floor) is LOUD: the
// agent derives the draft by hand — the existing brownfield path.
//
// Usage:
//   bun scripts/init-extract.ts --root <brownfield-repo-root> [--recorded] [--out-dir <dir>]
//
//   --recorded  deterministic replay: the draft is derived from the manifests
//               themselves (the extraction contract replayed against its own
//               input — the harness/fixture mode, keyless and network-free).
//               Default is the LIVE seam (makeTypellmBackend).
// Exit: 0 drafts written + every lint PASS · 1 loud block (judge skip or lint
// FAIL — the findings are printed per path) · 2 usage.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkTree } from "./check-tree.mjs";
import {
  extractAdoptDraft,
  makeTypellmBackend,
  type AdoptDraft,
  type JudgeBackend,
} from "../extensions/index.ts";

export { INIT_EXTRACT_SCHEMA, extractAdoptDraft } from "../extensions/index.ts";
export type { AdoptDraft } from "../extensions/index.ts";

/** Consumer-side destination for the generated pi-workflows task bridge. */
export const INIT_MISE_FRAGMENT_PATH = "mise/conf.d/pi-workflows.toml";

/** Markers make the injected persona replaceable without owning the file. */
export const INIT_PERSONA_BEGIN = "<!-- pi-workflows:begin main-agent persona -->";
export const INIT_PERSONA_END = "<!-- pi-workflows:end main-agent persona -->";

const PACKAGE_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const APPEND_SYSTEM_NEGATION = "!.pi/APPEND_SYSTEM.md";
const WIP_NEGATION = "!.workflows/wip/";
const WIP_CONTENTS_IGNORE = ".workflows/wip/**";
const WIP_CONTENTS_NEGATION = `!${WIP_CONTENTS_IGNORE}`;

/** Read the canonical persona verbatim from the installed package. */
export function readCanonicalPersona(root: string = PACKAGE_ROOT): string {
  return fs.readFileSync(path.join(root, "agents", "orchestrator.md"), "utf8");
}

/** Wrap the full persona text; never emit a relative pointer to its source. */
export function buildInitPersonaFragment(personaText: string): string {
  const text = personaText.endsWith("\n") ? personaText : `${personaText}\n`;
  return `${INIT_PERSONA_BEGIN}\n${text}${INIT_PERSONA_END}\n`;
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Append the fragment or replace only its marked block, preserving user text. */
export function mergeAppendSystem(existing: string | null, fragment: string): string {
  const normalized = fragment.endsWith("\n") ? fragment : `${fragment}\n`;
  if (existing == null || existing.trim() === "") return normalized;

  const marked = new RegExp(
    `${escapeRegExp(INIT_PERSONA_BEGIN)}[\\s\\S]*?${escapeRegExp(INIT_PERSONA_END)}\\r?\\n?`,
  );
  if (marked.test(existing)) return existing.replace(marked, normalized);

  const separator = existing.endsWith("\n\n") ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
  return `${existing}${separator}${normalized}`;
}

/** Keep unrelated ignore rules, make the negations effective, stay idempotent. */
export function mergeInitGitignore(existing: string | null): string {
  const source = existing ?? "";
  const lines = source.length ? source.replace(/\r\n/g, "\n").split("\n") : [];
  if (lines.at(-1) === "") lines.pop();

  for (let i = 0; i < lines.length; i++) if (lines[i] === ".pi/") lines[i] = ".pi/*";
  const needsContentsNegation = lines.includes(WIP_CONTENTS_IGNORE);
  const merged = lines.filter(
    (line) =>
      line !== APPEND_SYSTEM_NEGATION &&
      line !== WIP_NEGATION &&
      line !== WIP_CONTENTS_NEGATION,
  );

  const piIndex = merged.lastIndexOf(".pi/*");
  if (piIndex >= 0) merged.splice(piIndex + 1, 0, APPEND_SYSTEM_NEGATION);
  else merged.push(APPEND_SYSTEM_NEGATION);

  const workflowsIndex = merged.lastIndexOf(".workflows/*");
  if (workflowsIndex >= 0) merged.splice(workflowsIndex + 1, 0, WIP_NEGATION);
  else merged.push(WIP_NEGATION);

  // A consumer's later `.workflows/wip/**` ignore outranks the directory
  // negation, so re-include the files after it as well.
  if (needsContentsNegation) merged.push(WIP_CONTENTS_NEGATION);
  return merged.join("\n") + "\n";
}

/** Deterministic fragment content: only namespaced wrappers over the launcher. */
const INIT_WF_TASKS = [
  { verb: "judge", description: "Run the pi-workflows judge through the shared launcher" },
  { verb: "lessons", description: "Run the pi-workflows lessons ledger through the shared launcher" },
  { verb: "bench", description: "Run the pi-workflows intake-triage benchmark through the shared launcher" },
  { verb: "archive-check", description: "Check pi-workflows archive bundles through the shared launcher" },
  { verb: "wip", description: "Manage WIP batches through the shared launcher" },
] as const;

export function buildInitMiseFragment(): string {
  const lines = [
    "# Generated by pi-workflows /init — loaded by mise from mise/conf.d/.",
    "# The consumer root mise.toml is not edited; repo check/verify tasks are untouched.",
    "",
  ];
  for (const { verb, description } of INIT_WF_TASKS)
    lines.push(
      `[tasks."wf:${verb}"]`,
      `description = "${description}"`,
      `run = '"$PI_WORKFLOWS_BIN" ${verb} "$@"'`,
      "",
    );
  return lines.join("\n").trimEnd() + "\n";
}

/** Directories never drafted as tree domains (junk / state / deps). */
const JUNK_DIRS = new Set([
  ".git",
  "node_modules",
  ".workflows",
  "dist",
  "build",
  "target",
  ".venv",
  "__pycache__",
  ".cache",
  "coverage",
  ".idea",
  ".vscode",
]);

/** Key-shaped material in draft text — the deterministic backstop for the
 *  judge's noKeyMaterialInCharter gate-question (belt and braces: the judge
 *  answers it; this regex enforces it on the emitted drafts). */
const KEY_SHAPE =
  /["']?(api[_-]?key|secret|token|passwd|password)["']?\s*[:=]\s*["']?[A-Za-z0-9_\-]{8,}|ghp_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{10,}/i;

/** true when the text carries NO key-shaped material. */
export function noKeyMaterialIn(text: string): boolean {
  return !KEY_SHAPE.test(text);
}

function isRepoRoot(root: string): boolean {
  return fs.existsSync(path.join(root, ".git")) || fs.existsSync(path.join(root, ".gitignore"));
}

/** Top-level entries (dirs + files), junk excluded, sorted. */
function topLevel(root: string): { dirs: string[]; files: string[] } {
  const entries = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => !JUNK_DIRS.has(e.name) && !e.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    dirs: entries.filter((e) => e.isDirectory()).map((e) => e.name),
    files: entries.filter((e) => e.isFile()).map((e) => e.name),
  };
}

function readIf(path_: string, cap = 1800): string {
  try {
    return fs.readFileSync(path_, "utf8").slice(0, cap);
  } catch {
    return "";
  }
}

/** Conventional pointer candidates — only the ones that exist on disk. */
function pointerCandidates(root: string): { name: string; path: string }[] {
  const candidates: [string, string][] = [
    ["Project overview", "README.md"],
    ["Conventions", "CONTRIBUTING.md"],
    ["Architecture", "docs/architecture.md"],
    ["Docs index", "docs/index.md"],
    ["History", "CHANGELOG.md"],
    ["Build manifest", "package.json"],
    ["Build manifest", "Cargo.toml"],
    ["Build manifest", "pyproject.toml"],
    ["Charter gate", "scripts/agents-lint.sh"],
  ];
  return candidates
    .filter(([, p]) => fs.existsSync(path.join(root, p)))
    .map(([name, p]) => ({ name, path: p }));
}

/** The judge's context: the brownfield tree + build manifests, bounded. The
 *  ONE classify call receives exactly this. */
export function buildAdoptContext(root: string): string {
  const { dirs, files } = topLevel(root);
  const manifest = (name: string, cap?: number) => readIf(path.join(root, name), cap);
  const scriptsDir = path.join(root, "scripts");
  const gateScripts = fs.existsSync(scriptsDir)
    ? fs
        .readdirSync(scriptsDir)
        .filter((f) => f.endsWith(".sh") || f.endsWith(".mjs"))
        .map((f) => `scripts/${f}`)
        .slice(0, 20)
    : [];
  return [
    "Draft the /init --adopt profile for this brownfield repo from the tree and build manifests below. " +
      "ONE draft: profileCommands (from the manifests — null when not detectable, never invented), " +
      "treeDomains (existing top-level directories), stackDetection (the stack + the review-skill family to cite), " +
      "charterPointers (existing paths from the listing only), and the boolean gate-questions.",
    "",
    `Top-level directories: ${dirs.map((d) => `${d}/`).join(" ")}`,
    `Top-level files: ${files.join(" ")}`,
    gateScripts.length ? `Gate scripts: ${gateScripts.join(" ")}` : "",
    "",
    "--- package.json ---",
    manifest("package.json"),
    "--- Cargo.toml ---",
    manifest("Cargo.toml", 1200),
    "--- pyproject.toml ---",
    manifest("pyproject.toml", 1200),
    "--- mise.toml ---",
    manifest("mise.toml", 600),
    "--- README.md (head) ---",
    manifest("README.md", 800),
    "--- pointer candidates that exist on disk ---",
    pointerCandidates(root)
      .map((p) => `${p.name}: ${p.path}`)
      .join("\n"),
  ]
    .filter((s) => s !== "")
    .join("\n");
}

/** Command/stack derivation lives in the recorded backend's context parse —
 *  one source of truth over the same manifests the live judge reads. */

/** The recorded adopt backend: the extraction contract replayed against its
 *  own input — the draft is derived deterministically from the SAME context
 *  text the live judge reads (manifest sections + tree lines parsed back out
 *  of the context). Keyless, network-free; works per-staged-fixture in the
 *  harness and per-repo in CLI --recorded mode. An empty tree is a LOUD skip. */
export function recordedAdoptBackend(_root?: string): JudgeBackend {
  return {
    name: "typellm-recorded-adopt",
    async classify(schema, input) {
      void schema;
      const dirsLine = input.match(/^Top-level directories: (.*)$/m)?.[1] ?? "";
      const dirs = dirsLine
        .split(" ")
        .filter(Boolean)
        .map((d) => d.replace(/\/$/, ""));
      const filesLine = input.match(/^Top-level files: (.*)$/m)?.[1] ?? "";
      const files = filesLine.split(" ").filter(Boolean);
      const sections = new Map<string, string>();
      {
        const parts = input.split(/^--- (.+?) ---$/m);
        for (let i = 1; i < parts.length - 1; i += 2)
          sections.set(parts[i].trim(), (parts[i + 1] ?? "").trim());
      }
      const manifest = (name: string): string => sections.get(name) ?? "";
      const commands: AdoptDraft["commands"] = {};
      const pkg = manifest("package.json");
      if (pkg) {
        try {
          const scripts = JSON.parse(pkg).scripts;
          if (scripts && typeof scripts === "object") {
            if (typeof scripts.test === "string") commands.test = scripts.test;
            if (typeof scripts.lint === "string") commands.lint = scripts.lint;
            if (typeof scripts.build === "string") commands.build = scripts.build;
          }
        } catch {
          // unparseable manifest → no commands from it (the lint reports the gap)
        }
      }
      const cargo = manifest("Cargo.toml");
      if (cargo && !commands.test) {
        commands.test = "cargo test";
        if (!commands.lint) commands.lint = "cargo clippy -- -D warnings";
        if (!commands.build) commands.build = "cargo build";
      }
      if (manifest("pyproject.toml") && !commands.test) commands.test = "python -m pytest";
      const treeDomains = dirs.map((d) => ({ name: d, path: d }));
      if (!Object.keys(commands).length && !treeDomains.length)
        return { skipped: true, bucket: null, confidence: 0, reason: "recorded replay: no manifests or directories in the context" };
      const stackDetection = cargo
        ? { stack: "Rust (cargo)", reviewSkills: ["rust-review", "rust-best-practices", "rust-port"] }
        : pkg
          ? {
              stack: files.includes("bun.lockb") || files.includes("bunfig.toml")
                ? "TypeScript (bun)"
                : "TypeScript (npm)",
              reviewSkills: ["security-audit"],
            }
          : manifest("pyproject.toml")
            ? { stack: "Python", reviewSkills: ["security-audit"] }
            : { stack: "undetectable", reviewSkills: [] };
      const pointersSection = input.split("--- pointer candidates that exist on disk ---")[1] ?? "";
      const charterPointers = pointersSection
        .split("\n")
        .map((l) => l.match(/^(.+?): (.+)$/))
        .filter((m): m is RegExpMatchArray => !!m)
        .map((m) => ({ name: m[1].trim(), path: m[2].trim() }));
      const draftText = [
        Object.values(commands).join("\n"),
        charterPointers.map((p) => `${p.name}: ${p.path}`).join("\n"),
        pkg,
      ].join("\n");
      return {
        skipped: false,
        bucket: null,
        value: {
          profileCommands: { test: commands.test ?? null, lint: commands.lint ?? null, build: commands.build ?? null },
          treeDomains,
          stackDetection,
          charterPointers,
          gates: {
            testCommandPresent: !!commands.test,
            noKeyMaterialInCharter: noKeyMaterialIn(draftText),
          },
          confidence: 0.9,
          evidence: "recorded replay from the build manifests",
        },
        confidence: 0.9,
        evidence: "recorded replay from the build manifests",
      };
    },
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function todayPlus(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "pointer";

/** Gates drafted deterministically: scripts/ pointer targets + the charter's
 *  minimum gate (scripts/agents-lint.sh) when it exists. An empty list is
 *  kept as-is — profile-lint FAILS loudly (the floor), which is the designed
 *  behavior for a repo with no gate scripts yet. */
function draftGates(root: string, draft: AdoptDraft): string[] {
  const gates = new Set<string>();
  for (const p of draft.charterPointers) if (p.path.startsWith("scripts/")) gates.add(p.path);
  if (fs.existsSync(path.join(root, "scripts", "agents-lint.sh"))) gates.add("scripts/agents-lint.sh");
  return [...gates].sort();
}

/** Fill ONE template pointer slot with the first existing candidate, else
 *  leave the <placeholder> (agents-lint FAILS — the loud floor). */
function fillSlot(template: string, label: string, candidates: string[], root: string): string {
  const line = candidates.find((c) => fs.existsSync(path.join(root, c)));
  if (!line) return template;
  const re = new RegExp(`(- ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: )\`<placeholder>\``);
  return template.replace(re, `$1\`${line}\``);
}

/** Assemble the draft charter from templates/AGENTS.md — the template is
 *  doctrine and UNCHANGED; the judge's data fills the pointer slots. */
function buildCharterDraft(root: string, draft: AdoptDraft): string {
  const templatePath = path.join(import.meta.dir, "..", "templates", "AGENTS.md");
  let charter = fs.readFileSync(templatePath, "utf8");
  // drop the template instruction comment (first HTML block)
  charter = charter.replace(/^<!--[\s\S]*?-->\s*/, "");
  charter = fillSlot(charter, "Project overview (what this is, who it serves)", ["README.md"], root);
  charter = fillSlot(charter, "Build and test (commands, fixtures)", [
    "package.json",
    "Cargo.toml",
    "pyproject.toml",
    "mise.toml",
    "Makefile",
  ], root);
  charter = fillSlot(charter, "Architecture and docs index (map, ADRs)", [
    "docs/architecture.md",
    "docs/index.md",
    "docs/",
  ], root);
  charter = fillSlot(charter, "Conventions (style, docs policy)", [
    "CONTRIBUTING.md",
    "docs/conventions.md",
    "docs/style.md",
    "docs/canon.md",
    ".editorconfig",
  ], root);
  // PROJECT: replace the template's placeholder rule line with the adopt facts
  charter = charter.replace(
    /- `<placeholder>`: project-specific binding rules[\s\S]*?pointer targets\./,
    [
      `- Adopted ${today()} by /init --adopt — project rules pending the owner's review; the judge`,
      "  DRAFTED this charter and the deterministic lints verified the paths",
      "  (see .workflows/charter-pointers.draft.md).",
      `- Review pointers cite the ${draft.stackDetection.stack} skill family: ${
        draft.stackDetection.reviewSkills.join(", ") || "none — stack not detectable, skip the citation"
      }.`,
    ].join("\n")
  );
  return charter.trimEnd() + "\n";
}

export interface AdoptDraftFiles {
  profile: string;
  charter: string;
  tree: string;
  suggestions: string;
}

/** Write the DRAFT files (every path ends in .draft — the judge never writes
 *  final config). Returns the paths for the verify step + the report. */
export function writeAdoptDrafts(root: string, draft: AdoptDraft, outDir?: string): AdoptDraftFiles {
  const dir = outDir ?? path.join(root, ".workflows");
  fs.mkdirSync(dir, { recursive: true });
  const profile = path.join(dir, "profile.json.draft");
  const charter = path.join(dir, "AGENTS.md.draft");
  const tree = path.join(dir, "tree.json.draft");
  const suggestions = path.join(dir, "charter-pointers.draft.md");
  const profileJson = {
    commands: draft.commands,
    pointers: Object.fromEntries(draft.charterPointers.map((p) => [slug(p.name), p.path])),
    tree: Object.fromEntries(draft.treeDomains.map((t) => [t.name, t.path])),
    gates: draftGates(root, draft),
    scaffolds: { kinds: {} },
    meta: {
      generated_by: "init-extract draft — judge-drafted, lint-verified; NOT final config",
      generated_at: today(),
      stale_after: todayPlus(30),
    },
  };
  fs.writeFileSync(profile, `${JSON.stringify(profileJson, null, 2)}\n`);
  fs.writeFileSync(charter, buildCharterDraft(root, draft));
  const { files: topFiles } = topLevel(root);
  const treeManifest = {
    roots: draft.treeDomains.map((t) => t.path),
    files: topFiles,
    ignore: [".workflows", "node_modules"],
  };
  fs.writeFileSync(tree, `${JSON.stringify(treeManifest, null, 2)}\n`);
  const lines = [
    "# /init --adopt DRAFT — charter pointer suggestions (plan 078 T2)",
    "",
    "Judge-drafted, NOT final config. The owner corrects, then the /init flow",
    "presents and lints again — the flow's own gates stay in charge.",
    "",
    "## Pointers",
    "",
    ...draft.charterPointers.map((p) => `- ${p.name}: \`${p.path}\``),
    "",
    "## Stack detection",
    "",
    `- stack: ${draft.stackDetection.stack}`,
    `- reviewSkills: ${draft.stackDetection.reviewSkills.join(", ") || "(none — skip the citation)"}`,
    "",
    "## Gate questions",
    "",
    `- testCommandPresent: ${draft.gates.testCommandPresent}`,
    `- noKeyMaterialInCharter: ${draft.gates.noKeyMaterialInCharter}`,
    draft.gates.testCommandPresent
      ? ""
      : "- no test command detected — the profile draft FAILS profile-lint by design (never invent one)",
    "",
  ];
  fs.writeFileSync(suggestions, lines.filter((l) => l !== "").join("\n") + "\n");
  return { profile, charter, tree, suggestions };
}

export interface AdoptCheck {
  name: string;
  path: string;
  ok: boolean;
  findings: string[];
}

export interface AdoptVerification {
  ok: boolean;
  checks: AdoptCheck[];
}

/** Verify-by-gate: the deterministic lints over the DRAFT files — profile-lint
 *  (schema + every pointer/tree path exists + commands resolve), agents-lint
 *  (charter doctrine: pointer paths, CORE, 60-line budget, no unfilled slot),
 *  check-tree (placement manifest coverage). Every finding is named per path. */
export async function verifyAdoptDrafts(root: string, files: AdoptDraftFiles): Promise<AdoptVerification> {
  void root;
  const runLint = (script: string, target: string) => {
    const r = spawnSync("bash", [path.join(import.meta.dir, script), target], {
      cwd: root2Of(target),
      encoding: "utf-8",
      timeout: 60_000,
    });
    const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    return {
      ok: r.status === 0,
      findings: out.split("\n").filter((l) => l.startsWith("FAIL")).map((l) => l.trim()),
    };
  };
  const profile = runLint("profile-lint.sh", files.profile);
  const agents = runLint("agents-lint.sh", files.charter);
  let treeManifest: { roots: string[]; files: string[]; ignore?: string[] };
  try {
    treeManifest = JSON.parse(fs.readFileSync(files.tree, "utf8"));
  } catch (e) {
    treeManifest = { roots: [], files: [], ignore: [] };
    void e;
  }
  const treeRoot = path.dirname(path.dirname(files.tree));
  const treeResult = checkTree(treeRoot, treeManifest);
  const checks: AdoptCheck[] = [
    { name: "profile-lint", path: files.profile, ...profile },
    { name: "agents-lint", path: files.charter, ...agents },
    {
      name: "check-tree",
      path: files.tree,
      ok: treeResult.ok,
      findings: treeResult.untracked.map((u: string) => `placement finding: ${u}`),
    },
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

/** The repo root the lints resolve paths against — the draft's repo (the
 *  .workflows dir's parent), NOT the pi-workflows package. */
function root2Of(target: string): string {
  return path.dirname(path.dirname(target));
}

export async function initExtractMain(argv: string[]): Promise<number> {
  let root: string | null = null;
  let outDir: string | null = null;
  const recorded = argv.includes("--recorded");
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--root") root = argv[++i] ?? null;
    else if (argv[i] === "--out-dir") outDir = argv[++i] ?? null;
    else if (argv[i] === "--recorded") continue;
    else {
      console.error(`usage error: unknown argument ${argv[i]}`);
      return 2;
    }
  }
  if (!root || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error("usage: bun scripts/init-extract.ts --root <brownfield-repo-root> [--recorded] [--out-dir <dir>]");
    return 2;
  }
  if (!isRepoRoot(root))
    console.error("note: --root has no .git / .gitignore — the lints still run against this directory");
  const backend: JudgeBackend = recorded ? recordedAdoptBackend(root) : makeTypellmBackend();
  const context = buildAdoptContext(root);
  const r = await extractAdoptDraft(backend, context);
  if (r.skipped || !r.draft) {
    console.error(`JUDGE SKIPPED (${r.reason}) — derive the draft by hand (the /init brownfield path)`);
    return 1;
  }
  const draft = r.draft;
  const files = writeAdoptDrafts(root, draft, outDir ?? undefined);
  const v = await verifyAdoptDrafts(root, files);
  console.log(`init-extract (plan 078 T2) — DRAFTS written (judge never writes final config):`);
  for (const p of [files.profile, files.charter, files.tree, files.suggestions]) console.log(`  draft: ${p}`);
  console.log(
    `gate questions: testCommandPresent=${draft.gates.testCommandPresent} noKeyMaterialInCharter=${draft.gates.noKeyMaterialInCharter}`
  );
  for (const c of v.checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"}: ${c.name} — ${c.path}`);
    for (const f of c.findings) console.log(`  ${f}`);
  }
  if (!v.ok) console.error("lint failure blocks loudly — correct the drafts before presenting (the judge never writes final config)");
  return v.ok ? 0 : 1;
}

if (import.meta.main) {
  process.exitCode = await initExtractMain(process.argv.slice(2));
}
