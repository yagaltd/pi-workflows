#!/usr/bin/env bash
# check-drift.sh — fail loud when prompts/skills/agents/registry drift apart.
# Views of the system (prompts, skills) must agree with their sources
# (agents/registry.md, agents/*.md, package.json). Drift is a bug, not a
# preference. Run from anywhere; operates on the repo it lives in.
#
# Usage: ./scripts/check-drift.sh   (or bash scripts/check-drift.sh)
# Exit 0 = clean · non-zero = drift found (each violation printed)

set -uo pipefail
cd "$(dirname "$0")/.."
FAIL=0

err() { echo "DRIFT: $1" >&2; FAIL=1; }
ok()  { echo "ok:   $1"; }

echo "== 1. Prompt frontmatter: only supported keys (description, argument-hint, hidden) =="
BAD=$(grep -rn -E '^(model|thinking|skill|restore|tools|agent):' prompts/ 2>/dev/null || true)
if [ -n "$BAD" ]; then echo "$BAD" | sed 's/^/DRIFT: dead frontmatter key: /' >&2; FAIL=1
else ok "no dead frontmatter keys in prompts/"; fi

echo "== 2. Removed-extension API remnants + dead integrations =="
BAD=$(grep -rn -E 'worktree: true|progress: true|reads: *\(|agentOverrides|inheritProjectContext|inheritSkills|pi-subagents|pi-prompt-template-model|pi-intercom' \
  prompts/ skills/ agents/ templates/ package.json 2>/dev/null | grep -v 'registry.md.*there is no' || true)
# Dead integrations (removed 2026-08-21): pi-annotate, pi-boomerang, pi-interview, bombadil
BAD2=$(grep -rn -E 'pi-annotate|pi-boomerang|pi-interview|bombadil' \
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

echo "== 3. Every role file referenced by prompts exists and is registered =="
for role in worker scout reviewer quality-reviewer; do
  [ -f "agents/$role.md" ] || err "agents/$role.md missing but referenced by prompts"
  grep -q "| $role |" agents/registry.md || err "agents/$role.md exists but not in agents/registry.md Roles table"
done
grep -rhoE 'agents/[a-z-]+\.md' prompts/ skills/ 2>/dev/null | sort -u | while read -r f; do
  [ -f "$f" ] || err "prompt/skill references $f which does not exist"
done
ok "role files present and registered (worker/scout/reviewer/quality-reviewer)"

echo "== 4. Skills referenced by prompts exist =="
# prompts say: Follow the '<skill>' skill workflow
grep -rh "Follow the '" prompts/ 2>/dev/null | sed -E "s/.*Follow the '([a-z-]+)'.*/\1/" | sort -u | while read -r s; do
  [ -f "skills/$s/SKILL.md" ] || err "prompt references skill '$s' but skills/$s/SKILL.md is missing"
done
ok "skill references resolve"

echo "== 5. Templates referenced by skills exist =="
for t in THINKING-TOOLS.md AGENTS.md CONTEXT.md ADR.md REVIEW_GUIDELINES.md; do
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
grep -oE '^\| `\/[a-z-]+`' README.md 2>/dev/null | sed -E 's/\| `//; s/`//' | sort -u | while read -r c; do
  [ -f "prompts/$c.md" ] || err "README lists /$c but prompts/$c.md is missing"
done
ok "README commands resolve to prompt files"

echo
if [ "$FAIL" -eq 0 ]; then
  echo "CLEAN — no drift."
else
  echo "DRIFT FOUND — fix the views or the source; do not silence this check." >&2
fi
exit "$FAIL"
