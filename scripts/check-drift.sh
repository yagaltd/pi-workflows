#!/usr/bin/env bash
# check-drift.sh — fail loud when prompts/skills/agents/registry drift apart.
# Views of the system (prompts, skills) must agree with their sources
# (agents/registry.md, agents/*.md, package.json). Drift is a bug, not a
# preference. Run from anywhere; operates on the repo it lives in.
#
# Usage: ./scripts/check-drift.sh   (or bash scripts/check-drift.sh)
#        bash scripts/check-drift.sh --only <archive|durable|wip> [--root <dir>]
# Exit 0 = clean · non-zero = drift found (each violation printed)
#
# `--only` + `--root` are the test seam for sections 11-13 (plan 20261117-064
# TASK 3): they run one section against a fixture tree instead of the whole
# gate. The full run takes no arguments and audits this repo.

set -uo pipefail

SELF_DIR="$(cd -P -- "$(dirname "$0")" && pwd)" || exit 2
ONLY=""
ROOT_DIR=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --only) ONLY="${2:-}"; shift 2 || shift ;;
    --root) ROOT_DIR="$(cd "${2:-.}" && pwd)"; shift 2 || shift ;;
    *) echo "usage: bash scripts/check-drift.sh [--only archive|durable|wip] [--root <dir>]" >&2; exit 2 ;;
  esac
done

cd "${ROOT_DIR:-$(dirname "$0")/..}" || exit 2
FAIL=0

err() { echo "DRIFT: $1" >&2; FAIL=1; }
ok()  { echo "ok:   $1"; }

# ── 11. Archive coverage — a shipped plan id must have an archive bundle ──────
# DEC-006: eight plans shipped without a bundle because no gate looked. Bounded
# work: only the first 10 CHANGELOG entries are read. Absent
# .workflows/archive/ is gitignored state (fresh clone) → LOUD SKIP, never a fail.
archive_coverage() {
  local changelog="CHANGELOG.md" dirs=() dirs_candidate entry ids id line found count=0 missing=0
  echo "== 11. Archive coverage: every shipped plan id has a bundle =="
  if [ ! -f "$changelog" ]; then
    echo "skip: no $changelog in $PWD — archive-coverage check skipped (loud)"
    return 0
  fi
  for dirs_candidate in .workflows/archive/done .workflows/archive/superseded; do
    [ -d "$dirs_candidate" ] && dirs+=("$dirs_candidate")
  done
  if [ "${#dirs[@]}" -eq 0 ]; then
    echo "skip: .workflows/archive/{done,superseded}/ absent (fresh clone — gitignored state); archive-coverage check skipped (loud)"
    return 0
  fi
  ids=$(awk '
    /^## / { entry++; if (entry > 10) exit }
    entry >= 1 {
      rest = $0
      while (match(rest, /\(plan [^)]*\)/)) {
        tok = substr(rest, RSTART + 6, RLENGTH - 7)
        split(tok, w, /[[:space:]]+/)
        # only a real plan id (YYYYMMDD-NNN) counts: prose may legitimately contain
        # literal "(plan <id>)" or "(plan text ...)" and must not become a phantom id
        if (w[1] ~ /^[0-9]{8}-[0-9]{3}$/) print w[1] "\t" NR
        rest = substr(rest, RSTART + RLENGTH)
      }
    }
  ' "$changelog" | awk -F'\t' '!seen[$1]++')
  if [ -z "$ids" ]; then
    ok "no (plan <id>) id in the first 10 CHANGELOG entries — nothing to audit"
    return 0
  fi
  while IFS=$'\t' read -r id line; do
    [ -n "$id" ] || continue
    count=$((count + 1))
    found=0
    for dirs_candidate in "${dirs[@]}"; do
      for entry in "$dirs_candidate/$id" "$dirs_candidate/$id"-*; do
        if [ -e "$entry" ]; then found=1; break 2; fi
      done
    done
    if [ "$found" -eq 0 ]; then
      err "$changelog:$line: shipped plan $id has no archive bundle — expected ${dirs[0]}/$id-<slug>/ (a shipped plan id without an archive dir is drift, DEC-006)"
      missing=$((missing + 1))
    fi
  done <<< "$ids"
  [ "$missing" -eq 0 ] && ok "every shipped plan id has an archive bundle ($count ids, first 10 CHANGELOG entries)"
  return 0
}

# ── 12. Durable knowledge — whitelisted .workflows paths must be tracked ─────
# .gitignore never whitelisted .workflows/decisions/ until commit 4c13428, so
# the ADR ledger (DEC-001..005 + INDEX) was untracked and a fresh clone would
# have lost it. The whitelist is the audit list: every `!.workflows/<path>`
# entry needs >= 1 git-tracked file, and the ledger itself must parse.
durable_knowledge() {
  local ln entry path tracked count=0 missing=0 out
  echo "== 12. Durable knowledge: whitelisted .workflows paths are git-tracked =="
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    echo "skip: not a git checkout — durable-knowledge audit needs git; skipped (loud)"
    return 0
  fi
  if [ ! -f .gitignore ]; then
    echo "skip: no .gitignore in $PWD — no .workflows whitelist to audit; skipped (loud)"
  fi
  while IFS=: read -r ln entry; do
    [ -n "$entry" ] || continue
    path="${entry#!}"
    # .workflows/wip/** is runtime batch state, not durable knowledge; section 13 audits it.
    # plan.md and specs/ are live-plan state: valid only while a plan is open.
    # After SHIP they are archived, so absence is not drift. Archive coverage
    # (section 11) guards the durable copies.
    case "$path" in .workflows/wip*|.workflows/plan.md|.workflows/specs/*) continue ;; esac
    count=$((count + 1))
    tracked=$(git ls-files -- "$path" | head -n1)
    if [ -n "$tracked" ]; then
      ok "$path is git-tracked ($tracked)"
    else
      err ".gitignore:$ln: $path is whitelisted as durable but has no git-tracked file — a fresh clone loses it (git add $path)"
      missing=$((missing + 1))
    fi
  done < <([ -f .gitignore ] && grep -nE '^!\.workflows/' .gitignore || true)
  if [ "$count" -eq 0 ]; then
    echo "skip: .gitignore whitelists no .workflows path — nothing to audit (loud)"
  fi
  if [ -f scripts/decisions.mjs ]; then
    if out=$(node scripts/decisions.mjs check 2>&1); then
      ok "the ADR ledger parses (scripts/decisions.mjs check CLEAN)"
    else
      echo "$out" | sed 's/^/DRIFT: decisions ledger: /' >&2
      err "scripts/decisions.mjs check found ledger drift — a scaffold output the ledger rejects is a finding, never a silent success"
      missing=$((missing + 1))
    fi
  else
    echo "skip: scripts/decisions.mjs absent — ledger parse check skipped (loud)"
  fi
  return 0
}

# ── 13. WIP batch — verdict + scope proof before the final commit ─────────────
# WIP state is runtime (.workflows/wip/**), never durable knowledge. A malformed
# state always fails. An awaiting-review batch is unreviewed; a ready-to-ship
# batch must carry verified_files and every staged file must be one of them.
# A clean tree with ready-to-ship state passes (mise run ci), and shipped or
# absent batches pass loudly as skips.
wip_gate() {
  local wip_dir=".workflows/wip" out status batch active state_file verified_file scope_file staged
  echo "== 13. WIP batch: verdict + scope proof before SHIP =="
  if [ ! -d "$wip_dir" ]; then
    echo "skip: $wip_dir absent (fresh clone — no active WIP batch); WIP gate skipped (loud)"
    return 0
  fi
  if ! out=$(node "$SELF_DIR/wip.mjs" status --repo "$PWD" 2>&1); then
    echo "$out" | sed 's/^/DRIFT: WIP gate: /' >&2
    err "malformed or ambiguous WIP state — section 13 refuses an unreadable batch"
    return 0
  fi
  active=$(node -e 'const s=JSON.parse(process.argv[1]); process.stdout.write(s.active ? s.status : "")' "$out" 2>/dev/null) || active=""
  batch=$(node -e 'const s=JSON.parse(process.argv[1]); process.stdout.write(s.id || "")' "$out" 2>/dev/null) || batch=""
  if [ -z "$active" ]; then
    echo "skip: no active WIP batch (shipped or fresh clone); WIP gate skipped (loud)"
    return 0
  fi
  if [ "$active" = "shipped" ]; then
    ok "WIP batch $batch is shipped — nothing to verify"
    return 0
  fi
  if [ "$active" = "awaiting-review" ]; then
    err "WIP batch $batch is unreviewed (awaiting-review) — run wip ready with the current verdict before SHIP"
    return 0
  fi
  if [ "$active" != "ready-to-ship" ]; then
    err "WIP batch $batch has unknown active status $active — expected ready-to-ship"
    return 0
  fi
  state_file=$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]) + ".json")' "$batch" 2>/dev/null) || state_file=""
  verified_file="$(mktemp)" || { err "cannot create temp verified-file list for the WIP gate"; return 0; }
  scope_file="$(mktemp)" || { rm -f "$verified_file"; err "cannot create temp scope file for the WIP gate"; return 0; }
  if ! out=$(node -e '
const fs = require("fs");
const s = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
if (!Array.isArray(s.verified_files)) process.exit(2);
process.stdout.write(s.verified_files.join("\n") + "\n");
' "$wip_dir/$state_file" 2>&1); then
    echo "$out" | sed 's/^/DRIFT: WIP gate: /' >&2
    err "cannot read verified_files for WIP batch $batch"
    rm -f "$verified_file" "$scope_file"
    return 0
  fi
  printf '%s\n' "$out" > "$verified_file"
  if ! grep -q . "$verified_file"; then
    err "unconsumed SHIP batch $batch has no verified_files — run wip verify before commit"
    rm -f "$verified_file" "$scope_file"
    return 0
  fi
  if ! out=$(node -e '
const fs = require("fs");
const s = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
const norm = (p) => String(p).replace(/^\.\//, "");
const bad = s.verified_files.filter((p) => !s.scope.some((a) => p === norm(a) || p.startsWith(norm(a) + "/")));
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
' "$wip_dir/$state_file" 2>&1); then
    echo "$out" | sed 's/^/DRIFT: WIP gate: /' >&2
    err "verified_files for WIP batch $batch are outside WIP-Scope"
    rm -f "$verified_file" "$scope_file"
    return 0
  fi
  if git rev-parse --git-dir >/dev/null 2>&1; then
    git diff --cached --name-only > "$scope_file"
  else
    : > "$scope_file"
  fi
  while IFS= read -r staged; do
    [ -n "$staged" ] || continue
    if ! grep -Fxq -- "$staged" "$verified_file"; then
      err "staged file $staged is not in verified_files for WIP batch $batch — out-of-scope staged file"
      rm -f "$verified_file" "$scope_file"
      return 0
    fi
  done < "$scope_file"
  ok "WIP batch proof is clean (verified_files present; staged files contained)"
  rm -f "$verified_file" "$scope_file"
  return 0
}

if [ -n "$ONLY" ]; then
  case "$ONLY" in
    archive) archive_coverage; exit "$FAIL" ;;
    durable) durable_knowledge; exit "$FAIL" ;;
    wip) wip_gate; exit "$FAIL" ;;
    *) echo "unknown section: $ONLY (known: archive, durable, wip)" >&2; exit 2 ;;
  esac
fi

echo "== 1. Prompt frontmatter: only supported keys (description, argument-hint, hidden) =="
BAD=$(grep -rn -E '^(model|thinking|skill|restore|tools|agent):' prompts/ 2>/dev/null || true)
if [ -n "$BAD" ]; then echo "$BAD" | sed 's/^/DRIFT: dead frontmatter key: /' >&2; FAIL=1
else ok "no dead frontmatter keys in prompts/"; fi

echo "== 2. Removed-extension API remnants + dead integrations =="
BAD=$(grep -rn -E 'worktree: true|progress: true|reads: *\(|agentOverrides|inheritProjectContext|inheritSkills|pi-subagents|pi-prompt-template-model|pi-intercom' \
  prompts/ skills/ agents/ templates/ package.json 2>/dev/null | grep -v 'registry.md.*there is no' || true)
# Dead integrations (removed 2026-08-21): pi-annotate, pi-boomerang, pi-interview
# (bombadil is a supported optional dep — do NOT ban it)
BAD2=$(grep -rn -E 'pi-annotate|pi-boomerang|pi-interview' \
  prompts/ skills/ agents/ templates/ README.md package.json 2>/dev/null || true)
# Stale fork pointer: agent-spec is upstream ZhangHanDong, not the old yagaltd fork
BAD3=$(grep -rn 'yagaltd/agent-spec' prompts/ skills/ agents/ templates/ README.md package.json 2>/dev/null || true)
# Legacy agent-file dir must not come back (roles live in agents/, pasted into prompts)
if [ -d ".pi/agents" ]; then BAD3="$BAD3\nDRIFT: .pi/agents/ exists (legacy agent files — roles live in agents/)"; fi
if [ -n "$BAD" ] || [ -n "$BAD2" ] || [ -n "$BAD3" ]; then
  { [ -n "$BAD" ] && echo "$BAD" | sed 's/^/DRIFT: old API: /'
    [ -n "$BAD2" ] && echo "$BAD2" | sed 's/^/DRIFT: dead integration: /'
    [ -n "$BAD3" ] && echo -e "$BAD3" | sed 's/^/DRIFT: stale pointer: /'; } >&2; FAIL=1
else ok "no old-API remnants, no dead integrations, no stale fork pointers"; fi



echo "== 3. Roles: files exist, registered, and every @role: ref resolves =="
SECTION3_FAIL=0
for role in worker scout reviewer quality-reviewer; do
  [ -f "agents/$role.md" ] || { err "agents/$role.md missing but referenced by prompts"; SECTION3_FAIL=1; }
  grep -q "| $role |" agents/registry.md || { err "agents/$role.md exists but not in agents/registry.md Roles table"; SECTION3_FAIL=1; }
done
while read -r r; do
  [ -f "agents/$r.md" ] || { err "@role:$r referenced but agents/$r.md missing"; SECTION3_FAIL=1; }
  grep -q "| $r |" agents/registry.md || { err "@role:$r referenced but not in registry Roles table"; SECTION3_FAIL=1; }
done < <(grep -rhoE '@role:[a-z][a-z0-9-]*' prompts/ skills/ agents/ 2>/dev/null | sort -u | sed 's/@role://')
while read -r f; do
  [ -f "$f" ] || { err "prompt/skill references $f which does not exist"; SECTION3_FAIL=1; }
done < <(grep -rhoE 'agents/[a-z-]+\.md' prompts/ skills/ 2>/dev/null | sort -u)
[ "$SECTION3_FAIL" -eq 0 ] && ok "role files present, registered, @role refs resolve"

echo "== 3b. Skill references/ modules resolve =="
while read -r ref; do
  found=0
  for d in skills/*/; do [ -f "${d}${ref}" ] && found=1 && break; done
  [ "$found" = "1" ] || err "referenced module $ref not found under any skill"
done < <(grep -rhoE 'references/[a-z-]+\.md' skills/ 2>/dev/null | sort -u)
ok "skill reference modules resolve"

echo "== 3c. Extension ships and is registered =="
[ -f "extensions/index.ts" ] || err "extensions/index.ts missing (pi manifest registers ./extensions)"
node -e 'const p=JSON.parse(require("fs").readFileSync("package.json"));((p.pi&&p.pi.extensions)||[]).some(e=>e.includes("extensions"))||process.exit(1)' || err "package.json pi.extensions does not register ./extensions"
ok "extension present and registered"

echo "== 4. Skills referenced by prompts exist =="
# prompts say: Follow the '<skill>' skill workflow
while read -r s; do
  [ -f "skills/$s/SKILL.md" ] || err "prompt references skill '$s' but skills/$s/SKILL.md is missing"
done < <(grep -rh "Follow the '" prompts/ 2>/dev/null | sed -E "s/.*Follow the '([a-z-]+)'.*/\1/" | sort -u)
ok "skill references resolve"

echo "== 5. Templates referenced by skills exist =="
for t in THINKING-TOOLS.md AGENTS.md CONTEXT.md ADR.md REVIEW_GUIDELINES.md CONTRACT-FORMAT.md DOCS-POLICY.md; do
  [ -f "templates/$t" ] || err "templates/$t missing (referenced by skills/prompts)"
done
ok "template files present"

echo "== 6. peerDependencies pin the current engine =="
node -e '
  const p = JSON.parse(require("fs").readFileSync("package.json"));
  const d = p.peerDependencies || {};
  if (!Object.keys(d).some(k => k.includes("pi-core-subagent"))) {
    console.error("DRIFT: peerDependencies missing @arhen/pi-core-subagent"); process.exit(1);
  }
' || FAIL=1
[ "$FAIL" -eq 0 ] && ok "peerDependencies include pi-core-subagent"

echo "== 7. Commands in README command table exist as prompts =="
while read -r c; do
  [ -f "prompts/$c.md" ] || err "README lists /$c but prompts/$c.md is missing"
done < <(grep -oE '^\| `\/[a-z-]+`' README.md 2>/dev/null | sed -E 's/\| `//; s/`//' | sort -u)
ok "README commands resolve to prompt files"

echo
# 8. agents-lint — AGENTS.md core + pointers + budget (plan 20261026-040)
echo "== 8. agents-lint — AGENTS.md doctrine (core + pointers + budget) =="
if bash "$(dirname "$0")/agents-lint.sh" AGENTS.md; then
  echo "ok:   AGENTS.md passes the doctrine lint"
else
  echo "FAIL: AGENTS.md violates the doctrine lint (scripts/agents-lint.sh)" >&2
  FAIL=$((FAIL + 1))
fi
echo

# 9. profile-lint — project profile schema + repo facts (plan 20261026-041)
echo "== 9. profile-lint — project profile (.workflows/profile.json) =="
if bash "$(dirname "$0")/profile-lint.sh" .workflows/profile.json; then
  echo "ok:   .workflows/profile.json passes the profile lint"
else
  echo "FAIL: .workflows/profile.json violates the profile lint (scripts/profile-lint.sh)" >&2
  FAIL=$((FAIL + 1))
fi
echo

# 10. metric-gates — cheap quality tier (plan 20261026-044). Complexity +
# duplication only: the drift gate never passes --with-mutation (cost).
echo "== 10. metric-gates — complexity + duplication (no mutation) =="
if bash "$(dirname "$0")/metric-gates.sh"; then
  echo "ok:   metric-gates clean (violations absent or tools skipped)"
else
  echo "FAIL: metric-gates reported violations (scripts/metric-gates.sh)" >&2
  FAIL=$((FAIL + 1))
fi
echo

# 11. archive coverage — every shipped plan id names an archive bundle (plan 20261117-064)
archive_coverage
echo

# 12. durable knowledge — whitelisted .workflows paths are git-tracked (plan 20261117-064)
durable_knowledge
echo

# 13. WIP batch — verdict + scope proof before the final commit (plan 20261122-080)
wip_gate
echo

if [ "$FAIL" -eq 0 ]; then
  echo "CLEAN — no drift."
else
  echo "DRIFT FOUND — fix the views or the source; do not silence this check." >&2
fi
exit "$FAIL"
