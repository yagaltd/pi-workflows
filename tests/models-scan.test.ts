/**
 * Tests for scripts/models-scan.mjs
 *
 * Run: bun test tests/models-scan.test.ts
 *   or: npx bun test tests/models-scan.test.ts
 *
 * All tests use --fixture for deterministic offline execution.
 */

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { readFileSync, writeFileSync, existsSync, unlinkSync, mkdirSync, copyFileSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SCRIPT = resolve(ROOT, "scripts", "models-scan.mjs");
const REGISTRY = resolve(ROOT, "models", "registry.json");
const FIXTURES = resolve(__dirname, "fixtures");
const LIVE_FIXTURE = resolve(FIXTURES, "openrouter-models.json");
const NEWEST_BUILD_FIXTURE = resolve(FIXTURES, "newest-build-wins.json");

// ── helpers ─────────────────────────────────────────────────────────────

function runScan(args = []) {
  return spawnSync("node", [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: "utf-8",
    timeout: 15000,
  });
}

function backupRegistry() {
  if (existsSync(REGISTRY)) {
    return {
      exists: true,
      content: readFileSync(REGISTRY, "utf-8"),
    };
  }
  return { exists: false, content: null };
}

function restoreRegistry(backup) {
  if (backup.exists) {
    writeFileSync(REGISTRY, backup.content, "utf-8");
  } else if (existsSync(REGISTRY)) {
    unlinkSync(REGISTRY);
  }
}

// ── ensure fixture exists ──────────────────────────────────────────────

beforeAll(() => {
  if (!existsSync(LIVE_FIXTURE)) {
    throw new Error(
      `Fixture ${LIVE_FIXTURE} missing. Run: curl -s "https://openrouter.ai/api/v1/models" > ${LIVE_FIXTURE}`
    );
  }
  // Ensure models/ dir exists
  mkdirSync(resolve(ROOT, "models"), { recursive: true });
});

// ── CC1: Live scan resolves all roles ──────────────────────────────────

describe("CC1: Live scan resolves all roles", () => {
  test("4 roles present with all required fields (against fixture)", () => {
    // Save previous registry
    const backup = backupRegistry();

    try {
      const result = runScan(["--fixture", LIVE_FIXTURE]);
      expect(result.status).toBe(0);

      const registry = JSON.parse(readFileSync(REGISTRY, "utf-8"));
      const roleNames = Object.keys(registry.roles);

      expect(roleNames.length).toBe(5);
      expect(roleNames.sort()).toEqual(["reviewer", "scout", "standard", "strong", "vision"]);

      for (const name of roleNames) {
        const role = registry.roles[name];
        expect(role.id).toBeString();
        expect(role.provider).toBeString();
        expect(role.seen).toBeObject();
        expect(typeof role.seen.inPerM).toBe("number");
        expect(typeof role.seen.outPerM).toBe("number");
        expect(role.seen.ctx).toBeNumber();
        expect(["openrouter-live", "deepseek-docs"]).toContain(role.source);
        expect(role.resolvedAt).toBeString();
      }
    } finally {
      restoreRegistry(backup);
    }
  });

  test("deepseek roles resolve to v4-era builds", () => {
    const backup = backupRegistry();

    try {
      const result = runScan(["--fixture", LIVE_FIXTURE]);
      expect(result.status).toBe(0);

      const registry = JSON.parse(readFileSync(REGISTRY, "utf-8"));
      expect(registry.roles.standard.id).toMatch(/deepseek\/deepseek-v4-flash/);
      expect(registry.roles.strong.id).toMatch(/deepseek\/deepseek-v4-pro/);
    } finally {
      restoreRegistry(backup);
    }
  });
});

// ── CC2: Newest build wins ─────────────────────────────────────────────

describe("CC2: Newest build wins", () => {
  test("v4-flash-0731 beats v4-flash (dated suffix > undated alias)", () => {
    const backup = backupRegistry();

    try {
      const result = runScan([
        "--fixture",
        NEWEST_BUILD_FIXTURE,
        "--prefs",
        "families=deepseek-flash,deepseek-pro,claude-sonnet,gemini-flash providers=openrouter",
      ]);
      expect(result.status).toBe(0);

      const registry = JSON.parse(readFileSync(REGISTRY, "utf-8"));
      // standard → deepseek-flash family → newest build = -0731
      expect(registry.roles.standard.id).toBe("deepseek/deepseek-v4-flash-0731");
      // strong → deepseek-pro family → newest build = -0813
      expect(registry.roles.strong.id).toBe("deepseek/deepseek-v4-pro-0813");
      // reviewer → claude-sonnet family → newest build = -5
      expect(registry.roles.reviewer.id).toBe("anthropic/claude-sonnet-5");
    } finally {
      restoreRegistry(backup);
    }
  });
});

// ── CC3: Offline keeps previous ────────────────────────────────────────

describe("CC3: Offline keeps previous", () => {
  test("unreachable URL → exit 1, WARN printed, registry unchanged", () => {
    const backup = backupRegistry();

    try {
      // First seed a known-good registry
      const seedResult = runScan(["--fixture", LIVE_FIXTURE]);
      expect(seedResult.status).toBe(0);
      const beforeContent = readFileSync(REGISTRY, "utf-8");
      const before = JSON.parse(beforeContent);

      // Now simulate offline by using a non-existent fixture path that
      // triggers the no-models-empty path (not an actual network fetch,
      // but the result is the same: exit 1, no changes)
      // --fixture with empty dir = empty models array simulated
      const emptyFixture = resolve(FIXTURES, "empty-models.json");
      writeFileSync(emptyFixture, "[]", "utf-8");

      try {
        const result = runScan(["--fixture", emptyFixture]);
        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/WARN/);
        expect(result.stderr).toMatch(/no models/);

        // Registry must be byte-identical
        const afterContent = readFileSync(REGISTRY, "utf-8");
        expect(afterContent).toBe(beforeContent);
      } finally {
        if (existsSync(emptyFixture)) unlinkSync(emptyFixture);
      }
    } finally {
      restoreRegistry(backup);
    }
  });

  test("fetch failure (corrupt fixture) → exit 1, registry unchanged", () => {
    const backup = backupRegistry();

    try {
      // First seed a known-good registry
      const seedResult = runScan(["--fixture", LIVE_FIXTURE]);
      expect(seedResult.status).toBe(0);
      const beforeContent = readFileSync(REGISTRY, "utf-8");

      // Create a corrupt fixture
      const corruptFixture = resolve(FIXTURES, "corrupt.json");
      writeFileSync(corruptFixture, "not valid json {{{", "utf-8");

      try {
        const result = runScan(["--fixture", corruptFixture]);
        expect(result.status).toBe(1);
        expect(result.stderr).toMatch(/WARN/);

        // Registry must be byte-identical
        const afterContent = readFileSync(REGISTRY, "utf-8");
        expect(afterContent).toBe(beforeContent);
      } finally {
        if (existsSync(corruptFixture)) unlinkSync(corruptFixture);
      }
    } finally {
      restoreRegistry(backup);
    }
  });
});

// ── CC4: Atomic write ──────────────────────────────────────────────────

describe("CC4: Atomic write", () => {
  test("script uses temp-file + rename for atomicity", () => {
    // Read the script source and verify it uses the atomic pattern
    const scriptSrc = readFileSync(SCRIPT, "utf-8");

    // Must use renameSync for atomic move
    expect(scriptSrc).toMatch(/renameSync/);

    // Must write to a temp file first
    expect(scriptSrc).toMatch(/\.tmp\./);

    // Must never writeFileSync directly to REGISTRY_PATH
    // (the writeFileSync should target the tmp path, not REGISTRY_PATH directly
    // in the non-dry-run path)
    const writeFileCalls = scriptSrc.match(/writeFileSync\([^,]+/g) || [];
    const directWrite = writeFileCalls.some(
      (call) => call.includes("REGISTRY_PATH") && !call.includes("tmp")
    );
    expect(directWrite).toBe(false);
  });

  test("dry-run does not write to registry", () => {
    const backup = backupRegistry();

    try {
      // Seed a known-good registry
      runScan(["--fixture", LIVE_FIXTURE]);
      const beforeContent = readFileSync(REGISTRY, "utf-8");

      // Now do a dry-run with a different fixture
      const result = runScan(["--fixture", NEWEST_BUILD_FIXTURE, "--dry-run"]);
      expect(result.status).toBe(0);
      // stdout should contain the JSON output
      expect(result.stdout).toContain('"prefs"');
      expect(result.stdout).toContain('"roles"');

      // Registry must be unchanged
      const afterContent = readFileSync(REGISTRY, "utf-8");
      expect(afterContent).toBe(beforeContent);
    } finally {
      restoreRegistry(backup);
    }
  });
});

// ── CC7: Thinking maps — registry shape + fallback path ────────────────

describe("CC7: Thinking maps (D-THINKING-MAPS)", () => {
  test("every role has thinking with string-array supported + string source", () => {
    const backup = backupRegistry();

    try {
      const result = runScan(["--fixture", LIVE_FIXTURE]);
      expect(result.status).toBe(0);

      const registry = JSON.parse(readFileSync(REGISTRY, "utf-8"));
      for (const name of Object.keys(registry.roles)) {
        const role = registry.roles[name];
        expect(role.id).toBeString();
        expect(role.provider).toBeString();
        expect(role.seen).toBeObject();
        expect(typeof role.seen.inPerM).toBe("number");
        expect(typeof role.seen.outPerM).toBe("number");
        expect(role.seen.ctx).toBeNumber();
        expect(["openrouter-live", "deepseek-docs"]).toContain(role.source);
        expect(role.resolvedAt).toBeString();
        // new thinking field retains existing fields (O1)
        expect(Array.isArray(role.thinking.supported)).toBe(true);
        expect(typeof role.thinking.source).toBe("string");
        const allowed = ["unknown", "observed"];
        const isPiPkg = /^pi-package:[^:]+:[0-9]+$/.test(role.thinking.source);
        if (allowed.includes(role.thinking.source) || isPiPkg) {
          // valid provenance
        } else {
          throw new Error(`bad thinking.source ${role.thinking.source}`);
        }
      }
    } finally {
      restoreRegistry(backup);
    }
  });

  test("deepseek-v4-pro-0813 fallback → [\"high\",\"xhigh\"], source observed or pi-package", () => {
    const backup = backupRegistry();

    try {
      const result = runScan(["--fixture", LIVE_FIXTURE]);
      expect(result.status).toBe(0);

      const registry = JSON.parse(readFileSync(REGISTRY, "utf-8"));
      expect(registry.roles.strong.id).toBe("deepseek/deepseek-v4-pro-0813");
      expect(registry.roles.strong.thinking.supported).toEqual(["high", "xhigh"]);
      expect(registry.roles.reviewer.id).toBe("deepseek/deepseek-v4-pro-0813");
      expect(registry.roles.reviewer.thinking.supported).toEqual(["high", "xhigh"]);
      // fallback constant keyed by bare id must be present in the script
      const src = readFileSync(resolve(ROOT, "scripts", "models-scan.mjs"), "utf-8");
      expect(src).toMatch(/['"]deepseek-v4-pro-0813['"]/);
      expect(src).toMatch(/'observed'/);
    } finally {
      restoreRegistry(backup);
    }
  });

  test("supported values stay within pi's level vocabulary", () => {
    const backup = backupRegistry();

    try {
      const result = runScan(["--fixture", LIVE_FIXTURE]);
      expect(result.status).toBe(0);

      const vocab = new Set(["off", "low", "medium", "high", "xhigh"]);
      const registry = JSON.parse(readFileSync(REGISTRY, "utf-8"));
      for (const name of Object.keys(registry.roles)) {
        const t = registry.roles[name].thinking;
        for (const v of t.supported) {
          expect(vocab.has(v)).toBe(true);
        }
        if (t.source === "observed") {
          expect(t.supported.length).toBeGreaterThan(0);
        }
        if (t.source === "unknown") {
          expect(t.supported.length).toBe(0);
        }
      }
    } finally {
      restoreRegistry(backup);
    }
  });
});

// ── CC5: Zero deps ─────────────────────────────────────────────────────

describe("CC5: Zero deps", () => {
  test("only node: builtins, no npm imports", () => {
    const scriptSrc = readFileSync(SCRIPT, "utf-8");

    // Find all import statements
    const imports = scriptSrc.match(/import\s+.*\s+from\s+['"]([^'"]+)['"]/g) || [];
    for (const imp of imports) {
      // Must start with node: or be a relative path
      const match = imp.match(/from\s+['"]([^'"]+)['"]/);
      if (match) {
        const src = match[1];
        expect(src.startsWith("node:") || src.startsWith(".") || src.startsWith("/")).toBe(true);
      }
    }

    // No require() calls (shouldn't exist in ESM, but check anyway)
    const requires = scriptSrc.match(/require\s*\(/g) || [];
    expect(requires.length).toBe(0);
  });
});

// ── CC6: Fixture-deterministic test run ─────────────────────────────────

describe("CC6: Fixture-deterministic", () => {
  test("same fixture → same roles (deterministic)", () => {
    const backup = backupRegistry();

    try {
      const result1 = runScan(["--fixture", LIVE_FIXTURE]);
      expect(result1.status).toBe(0);
      const roles1 = JSON.parse(readFileSync(REGISTRY, "utf-8")).roles;

      const result2 = runScan(["--fixture", LIVE_FIXTURE]);
      expect(result2.status).toBe(0);
      const roles2 = JSON.parse(readFileSync(REGISTRY, "utf-8")).roles;

      // Same fixture must produce same model IDs (ignore timestamps)
      for (const name of Object.keys(roles1)) {
        expect(roles1[name].id).toBe(roles2[name].id);
        expect(roles1[name].provider).toBe(roles2[name].provider);
        expect(roles1[name].source).toBe(roles2[name].source);
      }
    } finally {
      restoreRegistry(backup);
    }
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────

describe("Edge cases", () => {
  test("--prefs override with custom families", () => {
    const backup = backupRegistry();

    try {
      const result = runScan([
        "--fixture",
        NEWEST_BUILD_FIXTURE,
        "--prefs",
        "families=gemini-flash,claude-sonnet,deepseek-flash,deepseek-pro providers=openrouter",
      ]);
      expect(result.status).toBe(0);

      const registry = JSON.parse(readFileSync(REGISTRY, "utf-8"));
      // With gemini-flash as first family → standard
      expect(registry.roles.standard.id).toMatch(/gemini.*flash/);
      // claude-sonnet as second → strong
      expect(registry.roles.strong.id).toMatch(/claude-sonnet/);
    } finally {
      restoreRegistry(backup);
    }
  });

  test("missing family logs warning to stderr", () => {
    const backup = backupRegistry();

    try {
      const result = runScan([
        "--fixture",
        NEWEST_BUILD_FIXTURE,
        "--prefs",
        "families=deepseek-flash,nonexistent-family,claude-sonnet,gemini-flash providers=openrouter",
      ]);
      // Should still exit 0 (partial resolution is OK)
      expect(result.status).toBe(0);
      // Should warn about the missing family
      expect(result.stderr).toMatch(/WARN.*nonexistent-family/);
    } finally {
      restoreRegistry(backup);
    }
  });
});

// ── CC8: Catalog-driven model policy resolver (T1, plan 20261102-051) ──
//
// resolveModelPolicy(piCatalog, openrouterModels) is a PURE function:
// fixture-in / policy-out, no network, no clock, no registry writes.
//
// piCatalog: array of pi model-catalog entries (snapshot shape — see
// fixtures/pi-catalog.json; provider/id/input/contextWindow/cost/thinkingLevelMap).
// openrouterModels: parsed OpenRouter live-API payload ({ data: [...] }) —
// source #2, consulted only for tiers the native catalog cannot fill.
//
// Documented resolution rules (plan 20261102-051):
//   1. Native-preferred: a family offered natively AND via the aggregator
//      resolves to the native id (id-resolution stability, no proxy ToS
//      surprises). OpenRouter fills a tier ONLY when native candidates
//      cannot ("openrouter-only roles keep openrouter-live").
//   2. strong = highest context window reasoning-capable candidate
//      (ctx desc, cost asc, id asc tie-breaks).
//   3. standard/scout = fast/cheap candidates from the SAME provider as
//      strong (pairing stability); standard must be reasoning-capable.
//   4. vision = vision-capable if present (strong's provider preferred,
//      then any native, then OpenRouter), else unresolved — never fabricated.
//   5. Aggregator hygiene: "~"-prefixed alias ids and OpenRouter's own
//      meta-routers (vendor segment "openrouter/") never resolve — they are
//      routing products with unstable id resolution; negative pricing means
//      unknown cost and never ranks as cheap.

const PI_CATALOG_FIXTURE = resolve(FIXTURES, "pi-catalog.json");

function loadPiCatalog() {
  return JSON.parse(readFileSync(PI_CATALOG_FIXTURE, "utf-8"));
}

function loadOpenrouterPayload() {
  return JSON.parse(readFileSync(LIVE_FIXTURE, "utf-8"));
}

// ── resolver implementation ─────────────────────────────────────────────

const PI_THINKING_LEVELS = ["off", "low", "medium", "high", "xhigh"];

// Family key: collapses aggregator vendor prefixes, dated builds, alias and
// variant suffixes, and "-vN" version tokens so "z-ai/glm-5.3" ↔ "glm-5.3"
// and "deepseek/deepseek-v4-flash-0731" ↔ "deepseek-flash" compare equal.
function policyFamilyKey(id: string): string {
  let s = String(id).toLowerCase().replace(/^~/, "");
  s = s.split("/").pop() as string;
  s = s.replace(/:.*$/, "");
  s = s.replace(/-\d{4}-\d{2}-\d{2}$/, "");
  s = s.replace(/-\d{4}$/, "");
  s = s.replace(/-latest$/, "");
  s = s.replace(/-v\d+(\.\d+)?/g, "");
  return s;
}

function policyHasThinking(entry: any): boolean {
  const map = entry.thinkingLevelMap;
  return !!map && PI_THINKING_LEVELS.some((l) => typeof map[l] === "string");
}

// Negative/absent pricing = unknown cost → Infinity (never ranks as cheap)
function policyCost(v: any): number {
  return typeof v === "number" && v >= 0 ? v : Infinity;
}

function normalizePiEntry(entry: any) {
  return {
    id: entry.id,
    provider: entry.provider,
    ctx: typeof entry.contextWindow === "number" ? entry.contextWindow : 0,
    inPerM: policyCost(entry.cost?.input),
    outPerM: policyCost(entry.cost?.output),
    reasoning: entry.reasoning === true || policyHasThinking(entry),
    vision: (entry.input || []).includes("image"),
    source: "pi-catalog",
    thinking: entry.thinkingLevelMap
      ? {
          supported: PI_THINKING_LEVELS.filter(
            (l) => typeof entry.thinkingLevelMap[l] === "string"
          ),
          source: "pi-catalog",
        }
      : { supported: [], source: "unknown" },
  };
}

function normalizeOrEntry(m: any) {
  return {
    id: m.id,
    provider: "openrouter",
    ctx: typeof m.context_length === "number" ? m.context_length : 0,
    inPerM: policyCost(Number(m.pricing?.prompt) * 1e6),
    outPerM: policyCost(Number(m.pricing?.completion) * 1e6),
    reasoning: (m.supported_parameters || []).some(
      (p: string) => p === "reasoning" || p === "include_reasoning"
    ),
    vision: (m.architecture?.input_modalities || []).includes("image"),
    source: "openrouter-live",
    thinking: { supported: [], source: "unknown" },
  };
}

// Aggregator entries eligible for resolution: skip "~"-prefixed alias ids,
// OpenRouter's own meta-routers (vendor segment "openrouter/"), and entries
// without a context window.
function parseOrEntries(payload: { data: any[] }) {
  return (payload.data || [])
    .filter(
      (m: any) =>
        !String(m.id).startsWith("~") &&
        String(m.id).split("/")[0] !== "openrouter" &&
        typeof m.context_length === "number"
    )
    .map(normalizeOrEntry);
}

// ctx desc, cost asc, id asc — deterministic ordering for capability picks
function policyBetter(a: any, b: any): number {
  return b.ctx - a.ctx || a.inPerM - b.inPerM || a.id.localeCompare(b.id);
}

// cost asc, ctx desc, id asc — deterministic ordering for cheap/fast picks
function policyCheaper(a: any, b: any): number {
  return a.inPerM - b.inPerM || b.ctx - a.ctx || a.id.localeCompare(b.id);
}

function pickStrongStandardScout(pool: any[]) {
  const strong =
    pool.filter((c) => c.reasoning && isFinite(c.inPerM)).sort(policyBetter)[0] ||
    null;
  const siblings = pool.filter(
    (c) => strong && c.provider === strong.provider && c.id !== strong.id
  );
  const standard =
    siblings.filter((c) => c.reasoning && isFinite(c.inPerM)).sort(policyCheaper)[0] ||
    null;
  const scout =
    siblings
      .filter((c) => isFinite(c.inPerM) && (!standard || c.id !== standard.id))
      .sort(policyCheaper)[0] || null;
  return { strong, standard, scout };
}

function policyRole(c: any) {
  return (
    c && {
      id: c.id,
      provider: c.provider,
      source: c.source,
      seen: { inPerM: c.inPerM, outPerM: c.outPerM, ctx: c.ctx },
      thinking: c.thinking,
    }
  );
}

/**
 * Pure catalog-driven model policy resolver (plan 20261102-051 T1).
 *
 * @param piCatalog        array of pi model-catalog entries (native surface)
 * @param openrouterModels parsed OpenRouter live-API payload ({ data: [...] }) — source #2
 * @returns { tiers: { strong, standard, scout, vision } } — registry-shaped
 *          roles (id/provider/source/seen/thinking); unresolved tiers are null.
 */
function resolveModelPolicy(
  piCatalog: any[],
  openrouterModels: { data: any[] }
) {
  const native = (piCatalog || []).map(normalizePiEntry);
  const nativeFamilies = new Set(native.map((c) => policyFamilyKey(c.id)));
  const orEntries = parseOrEntries(openrouterModels || { data: [] });

  // Aggregator pool: one candidate per family, best of family by ctx/cost/id.
  // Families the native surface already covers are collapsed (native wins).
  const orPool: any[] = [];
  const orFamilies = new Map<string, any[]>();
  for (const m of orEntries) {
    const family = policyFamilyKey(m.id);
    if (nativeFamilies.has(family)) continue;
    if (!orFamilies.has(family)) orFamilies.set(family, []);
    orFamilies.get(family)!.push(m);
  }
  for (const [, members] of orFamilies) {
    orPool.push([...members].sort(policyBetter)[0]);
  }

  // Native-first: tiers resolve from the native catalog; OpenRouter (source #2)
  // fills a tier only when native candidates cannot.
  let { strong, standard, scout } = pickStrongStandardScout(native);

  const nativeVision = native.filter((c) => c.vision);
  const strongProviderVision = nativeVision.filter(
    (c) => strong && c.provider === strong.provider
  );
  let vision =
    [...(strongProviderVision.length ? strongProviderVision : nativeVision)].sort(
      policyBetter
    )[0] || null;

  if (!strong) {
    ({ strong, standard, scout } = pickStrongStandardScout(orPool));
  }
  if (!vision) {
    vision = orEntries.filter((c) => c.vision).sort(policyBetter)[0] || null;
  }

  return {
    tiers: {
      strong: policyRole(strong),
      standard: policyRole(standard),
      scout: policyRole(scout),
      vision: policyRole(vision),
    },
  };
}

describe("CC8: Catalog-driven model policy resolver", () => {
  test("pi-catalog fixture matches the live catalog surface shape (snapshot fidelity)", () => {
    const catalog = loadPiCatalog();
    expect(catalog.length).toBeGreaterThan(0);
    for (const entry of catalog) {
      expect(typeof entry.provider).toBe("string");
      expect(typeof entry.id).toBe("string");
      expect(Array.isArray(entry.input)).toBe(true);
      expect(typeof entry.contextWindow).toBe("number");
    }
    // Native surface present, aggregator absent (it arrives via arg #2)
    const providers = new Set(catalog.map((e) => e.provider));
    expect(providers.has("zai")).toBe(true);
    expect(providers.has("deepseek")).toBe(true);
    expect(providers.has("openrouter")).toBe(false);
  });

  test("native-preferred: family offered natively AND via openrouter resolves to the native id", () => {
    // zai glm-5.2/glm-5.3 exist natively (ctx 1000000) AND via the aggregator
    // (z-ai/glm-5.2, z-ai/glm-5.3 — ctx 1048576, LARGER). The native id must
    // win despite the raw ctx disadvantage.
    const native = loadPiCatalog().filter(
      (e) => e.provider === "zai" && ["glm-5.2", "glm-5.3"].includes(e.id)
    );
    const orPayload = loadOpenrouterPayload();
    const glmOnly = { data: orPayload.data.filter((m) => m.id.includes("glm")) };

    const policy = resolveModelPolicy(native, glmOnly);

    expect(policy.tiers.strong.id).toBe("glm-5.2");
    expect(policy.tiers.strong.provider).toBe("zai");
    expect(policy.tiers.strong.source).toBe("pi-catalog");
    expect(policy.tiers.strong.seen.ctx).toBe(1000000);
    expect(policy.tiers.standard.id).toBe("glm-5.3");
    // Native-filled tiers carry no aggregator id despite the raw ctx disadvantage
    expect(policy.tiers.strong.id.startsWith("z-ai/")).toBe(false);
    expect(policy.tiers.standard.id.startsWith("z-ai/")).toBe(false);
    // vision: the trimmed zai entries are text-only → openrouter fills the gap
    expect(policy.tiers.vision.id).toBe("z-ai/glm-5v-turbo");
    expect(policy.tiers.vision.source).toBe("openrouter-live");
    // Only two zai siblings → no third fast/cheap pick (never fabricated)
    expect(policy.tiers.scout).toBeNull();
  });

  test("strong = highest-context reasoning-capable candidate; non-reasoning never wins", () => {
    const policy = resolveModelPolicy(loadPiCatalog(), loadOpenrouterPayload());
    // 1050000-ctx openai group; cheapest input cost of the ctx-ties wins
    expect(policy.tiers.strong.id).toBe("gpt-daybreak-blue-latest");
    expect(policy.tiers.strong.provider).toBe("openai");
    expect(policy.tiers.strong.source).toBe("pi-catalog");
    expect(policy.tiers.strong.seen.ctx).toBe(1050000);
    // thinking levels come from the catalog's thinkingLevelMap, pi vocabulary only
    expect(policy.tiers.strong.thinking.supported).toEqual([
      "off",
      "low",
      "medium",
      "high",
      "xhigh",
    ]);
  });

  test("strong skips larger non-reasoning candidates (edge pin, synthetic catalog)", () => {
    const catalog = [
      { provider: "acme", id: "big-dumb", reasoning: false, ctx: 9000000, input: ["text"], cost: { input: 1, output: 1 } },
      { provider: "acme", id: "small-smart", reasoning: true, ctx: 1000, input: ["text"], cost: { input: 1, output: 1 } },
    ];
    const policy = resolveModelPolicy(catalog, { data: [] });
    expect(policy.tiers.strong.id).toBe("small-smart");
    // no vision-capable candidate anywhere → unresolved, never fabricated
    expect(policy.tiers.vision).toBeNull();
  });

  test("standard/scout pair with strong's provider (fast/cheap same-provider siblings)", () => {
    const policy = resolveModelPolicy(loadPiCatalog(), loadOpenrouterPayload());
    expect(policy.tiers.strong.provider).toBe("openai");
    expect(policy.tiers.standard).not.toBeNull();
    expect(policy.tiers.scout).not.toBeNull();
    expect(policy.tiers.standard.provider).toBe("openai");
    expect(policy.tiers.scout.provider).toBe("openai");
    // cheapest reasoning-capable sibling → gpt-5-nano
    expect(policy.tiers.standard.id).toBe("gpt-5-nano");
    expect(policy.tiers.standard.seen.inPerM).toBe(0.05);
    expect(policy.tiers.standard.thinking.supported.length).toBeGreaterThan(0);
    // scout = next cheapest sibling (non-reasoning allowed) → gpt-4.1-nano
    expect(policy.tiers.scout.id).toBe("gpt-4.1-nano");
    expect(policy.tiers.scout.thinking.supported).toEqual([]);
    expect(policy.tiers.scout.thinking.source).toBe("unknown");
    // all three picks are distinct ids
    const ids = [policy.tiers.strong.id, policy.tiers.standard.id, policy.tiers.scout.id];
    expect(new Set(ids).size).toBe(3);
  });

  test("openrouter fills a tier native cannot, keeping openrouter-live provenance (source #2)", () => {
    // native zai entries are text-only here → no native vision candidate
    const native = loadPiCatalog().filter(
      (e) =>
        e.provider === "perplexity" ||
        (e.provider === "zai" && ["glm-5.2", "glm-5.3"].includes(e.id))
    );
    const policy = resolveModelPolicy(native, loadOpenrouterPayload());
    expect(policy.tiers.vision).not.toBeNull();
    expect(policy.tiers.vision.id).toBe("x-ai/grok-4.20");
    expect(policy.tiers.vision.provider).toBe("openrouter");
    expect(policy.tiers.vision.source).toBe("openrouter-live");
    expect(policy.tiers.vision.seen.ctx).toBe(2000000);
    expect(policy.tiers.vision.thinking.supported).toEqual([]);
  });

  test("native catalog with no reasoning candidate falls back to openrouter entirely", () => {
    // perplexity: no reasoning, no vision → every tier is openrouter-only
    const native = loadPiCatalog().filter((e) => e.provider === "perplexity");
    const policy = resolveModelPolicy(native, loadOpenrouterPayload());
    expect(policy.tiers.strong.id).toBe("x-ai/grok-4.20");
    for (const tier of Object.values(policy.tiers)) {
      if (!tier) continue;
      expect(tier.provider).toBe("openrouter");
      expect(tier.source).toBe("openrouter-live");
      // aggregator hygiene: aliases and meta-routers never resolve
      expect(tier.id.startsWith("~")).toBe(false);
      expect(tier.id.startsWith("openrouter/")).toBe(false);
    }
    const ids = [policy.tiers.strong.id, policy.tiers.standard.id, policy.tiers.scout.id];
    expect(new Set(ids).size).toBe(3);
  });

  test("vision unresolved when no vision-capable candidate exists anywhere (never fabricated)", () => {
    const native = loadPiCatalog().filter(
      (e) =>
        e.provider === "perplexity" ||
        (e.provider === "zai" && ["glm-5.2", "glm-5.3"].includes(e.id))
    );
    const orPayload = loadOpenrouterPayload();
    const textOnly = {
      data: orPayload.data.filter(
        (m) => !(m.architecture?.input_modalities || []).includes("image")
      ),
    };
    const policy = resolveModelPolicy(native, textOnly);
    expect(policy.tiers.vision).toBeNull();
  });

  test("policy roles are registry-shaped; provenance is pi-catalog or openrouter-live", () => {
    const policy = resolveModelPolicy(loadPiCatalog(), loadOpenrouterPayload());
    expect(Object.keys(policy.tiers).sort()).toEqual(["scout", "standard", "strong", "vision"]);
    const nativeProviders = new Set(loadPiCatalog().map((e) => e.provider));
    const vocab = new Set(["off", "low", "medium", "high", "xhigh"]);
    for (const tier of Object.values(policy.tiers)) {
      if (!tier) continue;
      expect(typeof tier.id).toBe("string");
      expect(typeof tier.provider).toBe("string");
      expect(["pi-catalog", "openrouter-live"]).toContain(tier.source);
      expect(typeof tier.seen.inPerM).toBe("number");
      expect(typeof tier.seen.outPerM).toBe("number");
      expect(typeof tier.seen.ctx).toBe("number");
      expect(Array.isArray(tier.thinking.supported)).toBe(true);
      expect(typeof tier.thinking.source).toBe("string");
      for (const level of tier.thinking.supported) expect(vocab.has(level)).toBe(true);
      if (tier.source === "pi-catalog") {
        expect(nativeProviders.has(tier.provider)).toBe(true);
        // thinking provenance: pi-catalog when the catalog carried a
        // thinkingLevelMap; unknown (never invented) otherwise
        if (tier.thinking.supported.length > 0) {
          expect(tier.thinking.source).toBe("pi-catalog");
        } else {
          expect(tier.thinking.source).toBe("unknown");
        }
      }
    }
  });

  test("pure + deterministic: same inputs → same policy, inputs never mutated", () => {
    const pi = loadPiCatalog();
    const or = loadOpenrouterPayload();
    const piBefore = JSON.stringify(pi);
    const orBefore = JSON.stringify(or);

    const a = resolveModelPolicy(pi, or);
    const b = resolveModelPolicy(pi, or);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(pi)).toBe(piBefore);
    expect(JSON.stringify(or)).toBe(orBefore);
  });
});