spec: task
name: "D-THINKING-MAPS thinking capability maps in the model registry"
tags: [thinking, capabilities, registry, models-scan, dispatch, zero-dep]
max-rounds: 3
---

## Intent

Add `thinking: { supported: string[], source: string }` to every role entry in models/registry.json, capturing which thinking levels the resolved model ACTUALLY supports on its resolved route, so dispatchers never set unsupported levels. The trigger is the live 2026-08-22 failure — `Thinking level "medium" is not supported by openrouter/deepseek/deepseek-v4-pro-0813. Supported: high | xhigh` — pi validates against the resolved model's thinking level map. Resolution is computed at scan time inside the zero-dep scripts/models-scan.mjs with a strict three-tier priority: (1) AUTHORITATIVE — grep the installed pi package for the resolved model id's thinking-level map (`source: "pi-package:<relative-path>:<line>"`); (2) FALLBACK — in-script observed-only constants, never invented (`deepseek-v4-pro-0813 → ["high","xhigh"]`, `source: "observed"`); (3) UNKNOWN — empty array + `source: "unknown"`, meaning the dispatcher must rely on pi's loud validation. tests/models-scan.test.ts (bun:test, fixture-based, offline) covers shape + fallback path; the registry is re-seeded live after the change; agents/registry.md's Model-resolution section gains exactly ONE sentence telling dispatchers never to guess.

## Decisions

- **D-THINKING-MAPS (verbatim):** models/registry.json role entries gain `thinking: { supported: string[], source: string }` capturing which thinking levels the resolved model ACTUALLY supports on its resolved route, so dispatchers never set unsupported levels. Resolution at scan time, in priority order: (1) AUTHORITATIVE — grep the installed pi package (~/.npm-global/lib/node_modules/@earendil-works/pi-coding-agent) for the resolved model id's thinking-level map; record the levels + `source: "pi-package:<relative-path>:<line>"`. (2) FALLBACK constants (in-script, like DeepSeek pricing): deepseek-v4-pro-0813 → ["high","xhigh"] (observed live 2026-08-22: pi rejected thinking:medium with 'Supported: high | xhigh'); other models → observed-only subsets with `source: "observed"` — NEVER invent unverified levels; unknown → empty array + `source: "unknown"` (empty means dispatcher must rely on pi's loud validation). scripts/models-scan.mjs stays zero-dep; tests cover shape + fallback path via fixture; registry re-seeded live after the change. agents/registry.md Model-resolution section gains ONE sentence: 'Consult the role's thinking.supported before setting thinking — never guess; empty array means unverified, pi validates loudly.'

Operational details (each traceable to the decision's text or a scout fact):

- **O1 — Schema addition, fields retained**: every role entry in models/registry.json keeps its existing `{ id, provider, seen, source, resolvedAt }` shape (v0.5.2 scout fact) and gains `thinking: { supported: string[], source: string }`; `supported` lists the levels the resolved model ACTUALLY supports on its resolved route (decision verbatim).
- **O2 — Priority 1 AUTHORITATIVE**: at scan time the script greps `~/.npm-global/lib/node_modules/@earendil-works/pi-coding-agent` (~-expanded via env HOME — verifiable substring `@earendil-works/pi-coding-agent`) for the resolved model id's thinking-level map; on a hit it records the levels with exactly `source: "pi-package:<relative-path>:<line>"` (decision verbatim).
- **O3 — Priority 2 FALLBACK constants**: in-script constants structured like the existing `DEEPSEEK_PRICING` map; `deepseek-v4-pro-0813 → ["high","xhigh"]` with `source: "observed"` (live 2026-08-22: pi rejected thinking:medium — `Supported: high | xhigh`); other models → observed-only subsets with `source: "observed"`; NEVER invent unverified levels (decision verbatim).
- **O4 — Priority 3 UNKNOWN**: no authoritative hit and no fallback constant → `supported: []` and `source: "unknown"`; an empty array means the dispatcher must rely on pi's loud validation — the same loud rejection that triggered this change (decision verbatim; scout log 2026-08-22).
- **O5 — Zero-dep invariant**: scripts/models-scan.mjs stays zero-dep — node: builtins only (existing CC5 rule: every import resolves to `node:` or a relative path).
- **O6 — Test coverage**: tests/models-scan.test.ts (bun:test, fixture-based, offline — existing harness) adds (a) registry shape — `thinking` present on all roles with a string-array `supported` and string `source` — and (b) the fallback path via fixture — `deepseek-v4-pro-0813 → ["high","xhigh"]`, `source: "observed"` (decision verbatim); new fixtures under tests/fixtures/ are allowed if the fallback path needs one.
- **O7 — Live re-seed**: after the script change, the registry is re-seeded by running the live scan (decision verbatim) — models/registry.json carries the new shape as live scan output, not a fixture artifact.
- **O8 — Doc: ONE sentence**: agents/registry.md Model-resolution section gains exactly — 'Consult the role's thinking.supported before setting thinking — never guess; empty array means unverified, pi validates loudly.' — and nothing else (decision verbatim).
- **O9 — Dispatch consequence**: the dispatch-facing contract is the registry data (O1) plus the doc sentence (O8); no dispatcher code file is in scope — none is Allowed (decision verbatim: "so dispatchers never set unsupported levels").

## Boundaries

### Allowed Changes
- `scripts/models-scan.mjs` — add thinking resolution (authoritative grep + in-script fallback constants + unknown branch) while keeping zero-dep
- `models/registry.json` — re-seed via live scan (prefs unchanged; roles gain `thinking`, existing fields retained)
- `tests/models-scan.test.ts` — add shape + fallback-path tests
- `tests/fixtures/*` — new fixtures only if needed for the fallback path
- `agents/registry.md` — exactly ONE sentence in the Model-resolution section (O8 text), nothing else

### Forbidden
- `~/.npm-global/lib/node_modules/@earendil-works/pi-coding-agent` — read-only grep source; never modified, ever
- `skills/**`, `.workflows/**`, `README.md`, `extensions/**`, `prompts/**`, `templates/**`, `package.json`
- Any change to `agents/*` other than the ONE sentence in `agents/registry.md` (no other agents sections or files)
- Any other file not explicitly listed under Allowed — dispatcher code included (no dispatcher file is Allowed)
- Any fallback constant or supported value carrying a thinking level that was not observed (no invented levels), and any `source: "observed"` entry with an empty `supported` array (emptiness is reserved for `source: "unknown"`)

## Completion Criteria

Scenario: Registry schema — thinking added, existing fields retained
  Test: `node -e 'const r=require("./models/registry.json").roles;for(const k of ["standard","strong","reviewer","scout"]){const g=r[k];if(!g||!g.id||!g.provider||!g.seen||typeof g.resolvedAt!=="string"||!g.thinking||!Array.isArray(g.thinking.supported)||typeof g.thinking.source!=="string"){console.error("role broken:",k);process.exit(1)}}console.log("shape OK: 4 roles")'`
  Given registry roles today are `{ id, provider, seen, source, resolvedAt }` (v0.5.2 scout fact)
  When the registry is re-seeded via the live scan after the change (O7)
  Then all 4 role entries retain their existing fields AND gain `thinking: { supported: string[], source: string }` (O1)

Scenario: thinking.source is always a declared provenance
  Test: `node -e 'const r=require("./models/registry.json");const vals=Object.values(r.roles).map(x=>(x.thinking||{}).source);const bad=vals.filter(v=>v!=="unknown"&&v!=="observed"&&!/^pi-package:[^:]+:[0-9]+$/.test(v));if(bad.length){console.error("bad sources:",bad);process.exit(1)}console.log("sources OK:",JSON.stringify(vals))'`
  Given the priority order AUTHORITATIVE → FALLBACK → UNKNOWN (D-THINKING-MAPS)
  When inspecting each role's `thinking.source` in the re-seeded registry
  Then every value is exactly `unknown`, `observed`, or matches `pi-package:<relative-path>:<line>` (O2/O3/O4)

Scenario: AUTHORITATIVE path — script targets the installed pi package and emits pi-package: sources
  Test: `grep -q '@earendil-works/pi-coding-agent' scripts/models-scan.mjs && grep -q 'pi-package:' scripts/models-scan.mjs`
  Given priority (1): grep `~/.npm-global/lib/node_modules/@earendil-works/pi-coding-agent` for the resolved model id's thinking-level map (O2)
  When a scan resolves a role's thinking
  Then the script references the installed pi package (verified via the `@earendil-works/pi-coding-agent` substring) and emits `source: "pi-package:<relative-path>:<line>"` on a hit (O2)

Scenario: FALLBACK constants — deepseek-v4-pro-0813 → ["high","xhigh"] observed in script and in registry
  Test: `grep -q 'deepseek-v4-pro-0813' scripts/models-scan.mjs && node -e 'const r=require("./models/registry.json").roles;let found=0;for(const k in r){if(r[k].id!=="deepseek/deepseek-v4-pro-0813")continue;found++;const s=(r[k].thinking||{}).supported;if(JSON.stringify(s)!==JSON.stringify(["high","xhigh"])){console.error("BAD",k,s);process.exit(1)}}if(found===0){console.error("no deepseek-v4-pro-0813 role in registry");process.exit(1)}console.log("fallback OK")'`
  Given in-script fallback constants structured like `DEEPSEEK_PRICING`, observed live 2026-08-22: pi rejected thinking:medium with `Supported: high | xhigh` (O3)
  When the authoritative grep yields no map for the resolved model id
  Then the script's constant records `deepseek-v4-pro-0813 → ["high","xhigh"]` and every re-seeded registry role whose id is `deepseek/deepseek-v4-pro-0813` carries exactly `["high","xhigh"]` (O3)

Scenario: UNKNOWN — empty array + source "unknown", never paired with levels
  Test: `grep -q '"unknown"' scripts/models-scan.mjs && node -e 'const r=require("./models/registry.json").roles;for(const k in r){const t=r[k].thinking;if(t.source==="unknown"&&t.supported.length!==0){console.error("unknown with levels:",k);process.exit(1)}}console.log("unknown semantics OK")'`
  Given priority (3): no hit and no constant → empty array + `source: "unknown"`; empty means the dispatcher must rely on pi's loud validation (O4)
  When a model id has neither an authoritative hit nor a fallback constant
  Then the script emits `supported: []` with `source: "unknown"`, and no registry entry pairs `source: "unknown"` with a non-empty `supported` array (O4)

Scenario: No invented thinking levels, observed entries never empty
  Test: `node -e 'const S=new Set(["off","low","medium","high","xhigh"]);const r=require("./models/registry.json").roles;for(const k in r){const t=r[k].thinking;if(!t||!Array.isArray(t.supported)||typeof t.source!=="string"){console.error("no thinking:",k);process.exit(1)}for(const v of t.supported){if(!S.has(v)){console.error("invented level:",k,v);process.exit(1)}}if(t.source==="observed"&&t.supported.length===0){console.error("observed but empty:",k);process.exit(1)}}console.log("no invented levels; observed non-empty")'`
  Given other models → observed-only subsets; NEVER invent unverified levels (O3)
  When checking every supported value in the re-seeded registry
  Then each value lies within pi's thinking-level vocabulary and is backed by an authoritative package hit or an observed fallback constant — never invented; `source: "observed"` never accompanies an empty `supported` array (O3/O4)

Scenario: Scan script stays zero-dep
  Test: `test "$(grep -E '^import ' scripts/models-scan.mjs | grep -vcE "from ['\"]node:|from ['\"]\.")" = 0`
  Given scripts/models-scan.mjs stays zero-dep — node: builtins only (O5)
  When the thinking-resolution code is added
  Then every import statement still resolves to a `node:` builtin or a relative path — count of violations is 0 (existing CC5 rule)

Scenario: Tests cover shape + fallback path via fixture
  Test: `grep -q 'thinking' tests/models-scan.test.ts && grep -q 'deepseek-v4-pro-0813' tests/models-scan.test.ts && grep -q '"observed"' tests/models-scan.test.ts`
  Given tests are bun:test, fixture-based, offline (existing harness, scout fact)
  When coverage is added
  Then tests/models-scan.test.ts asserts (a) the registry shape — `thinking` with a string-array `supported` and string `source` on all roles — and (b) the fallback path via fixture — `deepseek-v4-pro-0813 → ["high","xhigh"]` with `source: "observed"` (O6)

Scenario: Registry re-seeded live — task-scoped diff, no fixture artifacts
  Test: `test -z "$(git diff --name-only | grep -vE '^(agents/registry.md|scripts/models-scan.mjs|models/registry.json|tests/models-scan.test.ts|tests/fixtures/)')"`
  Given the registry is re-seeded live after the change (O7)
  When inspecting the working-tree diff — git-diff criterion task-scoped to the Allowed files only
  Then no tracked file outside the Allowed set has been modified (this also blocks any other `agents/*` change, per Forbidden), and `models/registry.json` is live scan output, not a fixture copy

Scenario: agents/registry.md gains exactly the ONE sentence in Model-resolution
  Test: `grep -q "Consult the role's thinking.supported" agents/registry.md && grep -q 'never guess' agents/registry.md && grep -q 'pi validates loudly' agents/registry.md && awk '{s+=$1} END {exit !(s<=3)}' <(git diff --numstat -- agents/registry.md)`
  Given the Model-resolution section gains ONE sentence — exact text: 'Consult the role's thinking.supported before setting thinking — never guess; empty array means unverified, pi validates loudly.' (O8)
  When the worker edits agents/registry.md (Allowed: ONE sentence only)
  Then the exact sentence is present in agents/registry.md, and the diff against that file adds at most 3 lines (the sentence, possibly text-wrapped, plus at most one blank separator) — no other added content

Scenario: Dispatchers never set unsupported levels — data contract consumable
  Test: `node -e 'const t=require("./models/registry.json").roles.strong.thinking;if(!t||!t.supported.includes("high")){console.error("strong must expose high");process.exit(1)}console.log("strong exposes high")' && grep -q "before setting thinking" agents/registry.md`
  Given the change exists so dispatchers never set unsupported levels (O9)
  When a dispatcher resolves `@model:strong` (deepseek/deepseek-v4-pro-0813) before setting thinking
  Then the role's `thinking.supported` exposes `"high"`, and the Model-resolution section instructs consulting `thinking.supported` first — never guess (O8/O9)

Verify: `node -e 'const r=require("./models/registry.json").roles;for(const k of ["standard","strong","reviewer","scout"]){const g=r[k];if(!g||!g.thinking||!Array.isArray(g.thinking.supported)||typeof g.thinking.source!=="string"){console.error("missing thinking",k);process.exit(1)}}if(JSON.stringify(r.strong.thinking.supported)==="[\"high\",\"xhigh\"]"&&JSON.stringify(r.reviewer.thinking.supported)==="[\"high\",\"xhigh\"]"){console.log("shape+fallback OK")}else{console.error("fallback mismatch");process.exit(1)}' && grep -q "Consult the role's thinking.supported" agents/registry.md && grep -q 'pi-package:' scripts/models-scan.mjs && test "$(grep -E '^import ' scripts/models-scan.mjs | grep -vcE "from ['\"]node:|from ['\"]\.")" = 0 && bun test tests/models-scan.test.ts 2>&1 | grep -oE '[0-9]+ (pass|fail)' | grep -qE '[1-9][0-9]* pass'`