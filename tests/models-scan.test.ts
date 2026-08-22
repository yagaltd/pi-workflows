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

      expect(roleNames.length).toBe(4);
      expect(roleNames.sort()).toEqual(["reviewer", "scout", "standard", "strong"]);

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