#!/usr/bin/env node
/**
 * Model registry scanner — fetches OpenRouter models, resolves prefs families
 * to concrete provider/model IDs, writes models/registry.json atomically.
 *
 * Zero dependencies (node: builtins only), ESM, Node ≥ 18.
 *
 * Usage:
 *   node scripts/models-scan.mjs                 # live scan
 *   node scripts/models-scan.mjs --fixture <path> # offline / test
 *   node scripts/models-scan.mjs --dry-run        # print, don't write
 *   node scripts/models-scan.mjs --prefs families=deepseek-flash,claude-sonnet providers=deepseek-api,openrouter
 */

import { readFileSync, writeFileSync, existsSync, renameSync, mkdirSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// ── paths ────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REGISTRY_PATH = resolve(ROOT, 'models', 'registry.json');
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/models';

// ── DeepSeek thinking-level fallback constants (observed-only, never invented) ──
// Mirrors the DEEPSEEK_PRICING structure below. Priorities: (1) AUTHORITATIVE —
// grep the installed pi package for the resolved model id's thinkingLevelMap;
// (2) FALLBACK — these observed-only constants, `source: "observed"`;
// (3) UNKNOWN — empty array + `source: "unknown"` (dispatcher must rely on pi's
// loud validation). Never invent levels that were not actually observed.
//
// Observed live 2026-08-22: pi rejected DeepSeek-v4-pro-0813 with
//   `Thinking level "medium" is not supported ... Supported: high | xhigh`
const THINKING_FALLBACK = new Map([
  ['deepseek-v4-pro-0813', ['high', 'xhigh']],
]);

// Installed pi package root (read-only grep source; ~-expanded via env HOME).
const PI_AGENT_NODE = '@earendil-works/pi-coding-agent';
const PI_PACKAGE_ROOT = resolve(process.env.HOME || '~', '.npm-global', 'lib', 'node_modules', PI_AGENT_NODE);
const PI_PROVIDER_DATA = resolve(PI_PACKAGE_ROOT, 'node_modules', '@earendil-works', 'pi-ai', 'dist', 'providers', 'data');

// pi's thinking level vocabulary
const KNOWN_LEVELS = ['off', 'low', 'medium', 'high', 'xhigh'];

// ── authoritative thinkingLevelMap discovery ─────────────────────────────
let PI_THINKING_INDEX = null;
function piDataFiles(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const p = resolve(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      piDataFiles(p, out);
    } else if (name.endsWith('.json')) {
      out.push(p);
    }
  }
  return out;
}

function collectPiMapsFromFile(filePath, acc) {
  let data;
  try { data = JSON.parse(readFileSync(filePath, 'utf-8')); } catch { return; }
  const rel = filePath.startsWith(PI_PACKAGE_ROOT)
    ? filePath.slice(PI_PACKAGE_ROOT.length + 1)
    : filePath;
  // pi provider-data files nest model objects deep inside; walk for model maps.
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.id === 'string' && node.thinkingLevelMap && typeof node.thinkingLevelMap === 'object') {
      const supported = KNOWN_LEVELS.filter(l => typeof node.thinkingLevelMap[l] === 'string');
      if (supported.length > 0) {
        acc.set(node.id, { supported, source: `pi-package:${rel}:1` });
      }
    }
    for (const v of Object.values(node)) walk(v);
  };
  walk(data);
}

function getPiThinkingIndex() {
  if (PI_THINKING_INDEX) return PI_THINKING_INDEX;
  const idx = new Map();
  for (const p of piDataFiles(PI_PROVIDER_DATA)) collectPiMapsFromFile(p, idx);
  PI_THINKING_INDEX = idx;
  return idx;
}

// ── DeepSeek official pricing (source: https://api-docs.deepseek.com/quick_start/pricing) ──
// Verified against docs as of 2026-08-22. DeepSeek has NO pricing API.
const DEEPSEEK_PRICING = new Map([
  // deepseek-chat (V3 era) — cache-miss pricing
  ['deepseek-chat', { inPerM: 0.27, outPerM: 1.10, ctx: 163840 }],
  // deepseek-reasoner (R1)
  ['deepseek-reasoner', { inPerM: 0.55, outPerM: 2.19, ctx: 65536 }],
  // V4 pricing from official docs (peak prices; off-peak = 50%):
  // https://api-docs.deepseek.com/quick_start/pricing
  ['deepseek-v4-flash', { inPerM: 0.14, outPerM: 0.28, ctx: 1310720 }],
  ['deepseek-v4-pro', { inPerM: 0.55, outPerM: 2.19, ctx: 1048576 }],
]);

// ── Family → regex table (matches against OpenRouter model ids) ─────────
const FAMILY_REGEX = {
  // negative lookahead keeps vision variants out of the plain flash family
  'deepseek-flash': /^deepseek\/deepseek-v4-flash(?!-vision)(?:-\d{4})?$/,
  'deepseek-flash-vision': /^deepseek\/deepseek-v4-flash-vision(?:-exp|-\d{4})?$/,
  'deepseek-pro': /^deepseek\/deepseek-v4-pro(?:-\d{4})?$/,
  'deepseek-r1': /^deepseek\/deepseek-r1(?:-\d{4})?$/,
  'claude-sonnet': /^anthropic\/claude-sonnet(?:-[\d.]+)?$/,
  'claude-haiku': /^anthropic\/claude-haiku(?:-[\d.]+)?$/,
  'claude-opus': /^anthropic\/claude-opus(?:-[\d.]+)?$/,
  'gpt-4o': /^openai\/gpt-4o(?!-mini)/,
  'gpt-4o-mini': /^openai\/gpt-4o-mini/,
  'gemini-flash': /^google\/gemini[\d.-]*flash(?!-lite)/,
  'gemini-pro': /^google\/gemini[\d.-]*pro/,
};

// :batch alias models should be excluded — they can't be used for real-time inference
const EXCLUDE_SUFFIX = /:batch$/;

// ── Role slots (fixed) ───────────────────────────────────────────────────
// vision: image-input model for visual verification (screenshot smoke,
// design gates) — read-only children that read screenshots via the read tool.
const ROLES = ['standard', 'strong', 'reviewer', 'scout', 'vision'];

// ── Default prefs (used when no registry exists) ─────────────────────────
const DEFAULT_PREFS = {
  families: ['deepseek-flash', 'deepseek-pro', 'claude-sonnet', 'gemini-flash', 'deepseek-flash-vision'],
  providers: ['deepseek-api', 'openrouter'],
};

// ── CLI ───────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { fixture: null, dryRun: false, prefs: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--fixture' && i + 1 < argv.length) {
      args.fixture = argv[++i];
    } else if (argv[i] === '--dry-run') {
      args.dryRun = true;
    } else if (argv[i] === '--prefs' && i + 1 < argv.length) {
      const parts = argv[++i].split(/\s+/);
      args.prefs = {};
      for (const p of parts) {
        const eq = p.indexOf('=');
        if (eq > 0) {
          args.prefs[p.slice(0, eq)] = p.slice(eq + 1).split(',');
        }
      }
    }
  }
  return args;
}

// ── fetch models ─────────────────────────────────────────────────────────
async function fetchModels(fixturePath) {
  if (fixturePath) {
    const raw = readFileSync(resolve(fixturePath), 'utf-8');
    const parsed = JSON.parse(raw);
    // Support both OpenRouter-style { data: [...] } and plain array
    return Array.isArray(parsed) ? parsed : (parsed.data || []);
  }

  const resp = await fetch(OPENROUTER_URL);
  if (!resp.ok) {
    throw new Error(`OpenRouter fetch failed: ${resp.status} ${resp.statusText}`);
  }
  const body = await resp.json();
  return body.data || [];
}

// ── version extraction for newest-build-wins ─────────────────────────────
function extractBuildScore(id) {
  // Extract version/build suffix.
  // Higher score = newer. Undated alias scores 0.
  // Handles: -0731 (MMDD), -0813 (MMDD), -2024-11-20 (date), -5 (major),
  // -4.6 (dotted), -v3.2 (v-prefixed dotted), -4 (simple).

  // Strip :batch suffix and ~latest alias prefix for scoring purposes
  const clean = id.replace(/:batch$/, '').replace(/^~/, '').replace(/-latest$/, '');

  // Try date format: -YYYY-MM-DD
  let m = clean.match(/-(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return parseInt(m[1]) * 10000 + parseInt(m[2]) * 100 + parseInt(m[3]);
  }

  // Try dotted version: -4.6, -v3.2 (must try before 4-digit to avoid false match)
  m = clean.match(/-(?:v)?(\d+)\.(\d+)$/);
  if (m) {
    return parseInt(m[1]) * 1000 + parseInt(m[2]);
  }

  // Try 4-digit suffix like -0731 (MMDD, year-less build).
  m = clean.match(/-(\d{4})$/);
  if (m) {
    const n = parseInt(m[1], 10);
    // If > 2000, treat as year (but without mo/day, unusual).
    // Most 4-digit suffixes are MMDD build dates: higher = newer.
    return n;
  }

  // Try simple numeric: -5, -4 → treat as major version * 1000
  m = clean.match(/-(\d+)$/);
  if (m) {
    return parseInt(m[1], 10) * 1000;
  }

  return 0; // undated alias
}

function sortNewestFirst(models) {
  return models.sort((a, b) => extractBuildScore(b.id) - extractBuildScore(a.id));
}

// ── find best match for a family ─────────────────────────────────────────
function resolveFamily(models, family) {
  const regex = FAMILY_REGEX[family];
  if (!regex) {
    // Unknown family — try case-insensitive substring match as fallback
    const lower = family.toLowerCase();
    const candidates = models.filter(m =>
      m.id.toLowerCase().includes(lower) ||
      (m.name && m.name.toLowerCase().includes(lower))
    );
    if (candidates.length === 0) return null;
    return sortNewestFirst(candidates)[0];
  }

  const candidates = models.filter(m => regex.test(m.id) && !EXCLUDE_SUFFIX.test(m.id));
  if (candidates.length === 0) return null;
  return sortNewestFirst(candidates)[0];
}

// ── resolve thinking for a resolved model id ─────────────────────────────
// Priority: (1) AUTHORITATIVE pi-package grep; (2) FALLBACK constants;
// (3) UNKNOWN → empty + "unknown".
function resolveThinkingFor(modelId) {
  const pkg = getPiThinkingIndex().get(modelId);
  if (pkg) return pkg;
  const bare = modelId.includes('/') ? modelId.slice(modelId.indexOf('/') + 1) : modelId;
  if (THINKING_FALLBACK.has(bare)) {
    return { supported: THINKING_FALLBACK.get(bare), source: 'observed' };
  }
  return { supported: [], source: 'unknown' };
}

// ── resolve provider and pricing ─────────────────────────────────────────
function resolveProvider(model, providers) {
  const modelId = model.id;
  const isDeepSeek = modelId.startsWith('deepseek/');

  if (isDeepSeek && providers.includes('deepseek-api')) {
    // Try to match against DeepSeek official pricing constants.
    // Strip version suffix to get base model name for lookup.
    const dsFull = modelId.replace('deepseek/', '');
    // Try exact match, then base-name match (strip -DDDD or -v suffix)
    const dsBase = dsFull.replace(/-\d{4}$/, '').replace(/-v\d+\.\d+$/, '');
    const pricing = DEEPSEEK_PRICING.get(dsFull) || DEEPSEEK_PRICING.get(dsBase);
    if (pricing) {
      return {
        provider: 'deepseek-api',
        source: 'deepseek-docs',
        inPerM: pricing.inPerM,
        outPerM: pricing.outPerM,
        ctx: pricing.ctx || model.context_length || 0,
      };
    }
    // Fall through to OpenRouter for unknown DeepSeek models
  }

  // OpenRouter pricing
  const pr = model.pricing || {};
  const inPerM = parseFloat(pr.prompt || '0') * 1_000_000;
  const outPerM = parseFloat(pr.completion || '0') * 1_000_000;
  return {
    provider: 'openrouter',
    source: 'openrouter-live',
    inPerM: Math.round(inPerM * 10000) / 10000,
    outPerM: Math.round(outPerM * 10000) / 10000,
    ctx: model.context_length || 0,
  };
}

// ── resolve all roles ────────────────────────────────────────────────────
function resolveRoles(models, families, providers) {
  const roles = {};
  for (let i = 0; i < ROLES.length; i++) {
    const roleName = ROLES[i];
    const family = families[i] || families[families.length - 1] || DEFAULT_PREFS.families[i];
    const model = resolveFamily(models, family);

    if (!model) {
      console.warn(`WARN: could not resolve ${roleName} (family: ${family}) — no matching model found`);
      continue;
    }

    const pricing = resolveProvider(model, providers);

    roles[roleName] = {
      id: model.id,
      provider: pricing.provider,
      seen: {
        inPerM: pricing.inPerM,
        outPerM: pricing.outPerM,
        ctx: pricing.ctx,
      },
      source: pricing.source,
      thinking: resolveThinkingFor(model.id),
      resolvedAt: new Date().toISOString(),
    };
  }
  return roles;
}

// ── main ─────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv);

  // Read existing registry (if any) for prefs
  let existing = null;
  if (existsSync(REGISTRY_PATH)) {
    try {
      existing = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
    } catch (e) {
      console.warn('WARN: existing registry is not valid JSON, will overwrite');
    }
  }

  // --prefs flag overrides everything; then existing registry; then defaults
  const prefs = args.prefs || existing?.prefs || DEFAULT_PREFS;
  const families = prefs.families || DEFAULT_PREFS.families;
  const providers = prefs.providers || DEFAULT_PREFS.providers;

  // Fetch models (live or fixture)
  let models;
  try {
    models = await fetchModels(args.fixture);
  } catch (err) {
    // Offline/fetch-failure: keep previous role resolutions
    console.warn(`WARN: fetch failed (${err.message}) — keeping previous role resolutions`);
    if (existing?.roles) {
      // Keep existing registry as-is
      if (!args.dryRun) {
        // Registry unchanged — no write needed
      }
    }
    process.exit(1);
  }

  if (!models || models.length === 0) {
    console.warn('WARN: fetch returned no models — keeping previous role resolutions');
    process.exit(1);
  }

  // Resolve roles
  const roles = resolveRoles(models, families, providers);

  // Build registry
  const registry = {
    $schema: existing?.$schema,
    prefs: { families, providers },
    roles,
  };

  if (args.dryRun) {
    console.log(JSON.stringify(registry, null, 2));
    return;
  }

  // Atomic write: temp file + rename
  mkdirSync(dirname(REGISTRY_PATH), { recursive: true });
  const tmpPath = REGISTRY_PATH + '.tmp.' + createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 8);

  writeFileSync(tmpPath, JSON.stringify(registry, null, 2) + '\n', 'utf-8');
  renameSync(tmpPath, REGISTRY_PATH);

  console.error(`Wrote ${REGISTRY_PATH} (${ROLES.length} roles resolved)`);
  const resolvedCount = Object.keys(roles).length;
  for (const [name, r] of Object.entries(roles)) {
    console.error(`  ${name}: ${r.id} → ${r.provider} (${r.source}) $${r.seen.inPerM}/$${r.seen.outPerM} per M`);
  }
  if (resolvedCount === 0) {
    console.error('WARN: no roles resolved');
  }
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});