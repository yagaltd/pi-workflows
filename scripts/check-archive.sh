#!/usr/bin/env bash
# check-archive.sh — archive gate for shipped plans (backlog item 6b).
#
# Usage: bash scripts/check-archive.sh <archive-target-dir>
#
# Verifies a shipped plan honored its Docs impact declaration
# (templates/PROPOSAL-FORMAT.md) before the bundle moves into the
# archive:
#   * every backtick path declared under the plan's `## Docs impact`
#     heading exists in the repo (a backtick span counts as a declared
#     path when it contains `/` or ends in `.md`)
#   * CHANGELOG.md mentions the Plan ID (the `> Plan ID:` line) — the
#     plan dir's own copy when it carries one, else the repo's live
#     CHANGELOG.md
# A missing declared doc or a missing CHANGELOG mention is a finding
# (file:line) and fails the run — the SHIP step refuses the archive
# move on failure. No `## Docs impact` section at all fails with a
# format hint pointing at templates/PROPOSAL-FORMAT.md.
#
# Runs from anywhere; operates on the repo it lives in. bash + grep only.
#
# Exit 0 = gate clean · non-zero = findings (or unusable input)

set -uo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0
err() { echo "CHECK-ARCHIVE: $1" >&2; FAIL=1; }
ok()  { echo "ok:   $1"; }

if [ "$#" -ne 1 ]; then
  echo "usage: bash scripts/check-archive.sh <archive-target-dir>" >&2
  exit 2
fi

plan_dir=$1
case "$plan_dir" in /*) ;; *) plan_dir="$PWD/$plan_dir" ;; esac
plan="$plan_dir/plan.md"

if [ ! -f "$plan" ]; then
  echo "CHECK-ARCHIVE: $plan_dir: no plan.md — pass a plan directory containing plan.md" >&2
  exit 2
fi

# --- Plan ID (first token of the `> Plan ID:` line) --------------------------
plan_id=$(sed -n -E 's/^>[[:space:]]*Plan ID:[[:space:]]*([^[:space:]]+).*/\1/p' "$plan" | head -n1)
if [ -z "$plan_id" ]; then
  err "$plan:1: no \`> Plan ID:\` line — the plan format requires it (templates/PROPOSAL-FORMAT.md)"
fi

# --- Docs impact section (lines after the heading, until the next heading) ---
if ! grep -q '^## Docs impact' "$plan"; then
  err "$plan:1: no \`## Docs impact\` section — declare every updated doc as a backtick path per templates/PROPOSAL-FORMAT.md"
fi

section=$(awk '
  /^## Docs impact/ {insec = 1; next}
  insec && /^## /   {insec = 0}
  insec             {print NR ":" $0}
' "$plan")

# --- Declared paths: backtick spans that look like paths ---------------------
declared=0
while IFS= read -r entry; do
  [ -n "$entry" ] || continue
  ln=${entry%%:*}
  line=${entry#*:}
  while IFS= read -r span; do
    [ -n "$span" ] || continue
    path=$(printf '%s' "$span" | tr -d '`')
    case "$path" in
      */*|*.md) ;;                 # looks like a repo path
      *) continue ;;               # prose token (gate:, command name, …)
    esac
    declared=$((declared + 1))
    if [ -e "$root/$path" ]; then
      ok "$path exists (declared at $plan:$ln)"
    else
      err "$plan:$ln: declared doc path does not exist: $path — update it or fix the declaration (templates/PROPOSAL-FORMAT.md)"
    fi
  done < <(printf '%s\n' "$line" | grep -oE '`[^`]+`')
done < <(printf '%s\n' "$section")

if [ "$declared" -eq 0 ] && grep -q '^## Docs impact' "$plan"; then
  ok "## Docs impact declares no backtick paths — only the CHANGELOG check applies"
fi

# --- CHANGELOG mentions the Plan ID -------------------------------------------
changelog="$plan_dir/CHANGELOG.md"
[ -f "$changelog" ] || changelog="$root/CHANGELOG.md"
if [ -n "$plan_id" ]; then
  if [ ! -f "$changelog" ]; then
    err "$changelog:1: CHANGELOG.md missing — cannot verify Plan ID $plan_id"
  elif ! grep -qF "$plan_id" "$changelog"; then
    err "$changelog:1: no entry mentions Plan ID $plan_id — append the CHANGELOG entry before archiving"
  else
    ok "CHANGELOG.md mentions Plan ID $plan_id"
  fi
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "CLEAN — archive gate passed for $plan_id."
else
  echo "CHECK-ARCHIVE FAILED — archive move refused; fix the findings above (templates/PROPOSAL-FORMAT.md)." >&2
fi
exit "$FAIL"
