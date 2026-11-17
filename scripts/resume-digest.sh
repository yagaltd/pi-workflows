#!/usr/bin/env bash
# resume-digest — read-only restart digest (plan 20261026-042 T1): fixed-shape
# state snapshot so an orchestrator resumes from evidence, not memory.
# Sections (fixed literal headers, in order): 1 plan status (.workflows/plan.md
# Status line + ✅ count) · 2 dispatcher (queue.json rows + FINAL verdicts in
# reviews/) · 3 log (LOG.md tail 10) · 4 budget (budget.json) · 5 dirty
# (git status --short) · 6 gates (profile gates[] tail -5 each + commands.test
# tail -2) · 7 git (log --oneline -10). The profile is CONSUMED, never
# modified (python3 JSON — no deps, the profile-lint pattern); missing profile
# ⇒ built-in default set + one note line. Every absent source degrades to a
# note: line; exit stays 0. Exit 1 ONLY when no repo can be digested (no
# git repo with .workflows/ at cwd and no valid --root).
# Usage: bash scripts/resume-digest.sh [--root <dir>]   (writes nothing)
# The root is the cwd's repo, never the repo this script lives in.
set -u

# Repo root resolution — cwd-first, because the digest describes the repo the
# caller stands in, not the repo the script lives in:
#   1. --root <dir> — explicit override for a caller that knows where to look;
#      must be a git repo holding .workflows/, else loud FAIL.
#   2. cwd's git root, when it holds .workflows/ (the normal /restart case).
#   3. .git walk-up from this script's dir (profile-lint pattern) — only for
#      the script's own checkout, i.e. when cwd resolves to that same repo.
#   4. no root → loud FAIL, exit 1, before any section prints.
dir="$(cd "$(dirname "$0")" && pwd)" || dir="$PWD"
root=""
case "${1:-}" in
--root)
  want="${2:-}"
  if [ -z "$want" ] || [ ! -d "$want" ]; then
    echo "FAIL: --root needs an existing directory (got '${want}')"
    exit 1
  fi
  want="$(cd "$want" && pwd)"
  if [ ! -e "$want/.git" ] || [ ! -d "$want/.workflows" ]; then
    echo "FAIL: --root $want is not a git repo with .workflows/ — nothing to resume"
    exit 1
  fi
  root="$want"
  ;;
esac
cwd_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$root" ] && [ -n "$cwd_root" ] && [ -d "$cwd_root/.workflows" ]; then
  root="$cwd_root"
fi
script_root=""
scan="$dir"
while [ "$scan" != "/" ]; do
  [ -e "$scan/.git" ] && {
    script_root="$scan"
    break
  }
  scan="$(dirname "$scan")"
done
if [ -z "$root" ] && [ -n "$script_root" ] && [ "$script_root" = "$cwd_root" ]; then
  root="$script_root"
fi
if [ -z "$root" ] || [ ! -e "$root/.git" ]; then
  echo "FAIL: no .git repo with .workflows/ to digest from cwd $PWD"
  echo "      (run inside a plan repo, or pass --root <dir>)"
  exit 1
fi
cd "$root" || exit 1

echo "== resume: plan status =="
if [ -f .workflows/plan.md ]; then
  st="$(grep -m1 '^> Status:' .workflows/plan.md || true)"
  [ -n "$st" ] && printf '%s\n' "$st" || echo "note: plan has no Status line"
  echo "✅ done markers: $(grep -c '✅' .workflows/plan.md)"
else
  echo "note: no live plan"
fi

echo "== resume: dispatcher =="
if [ -f .workflows/queue.json ]; then
  rows="$(python3 -c 'import json,sys
try: d=json.load(open(sys.argv[1]))
except Exception: d=None
print(len(d) if isinstance(d,(list,dict)) else "?")' .workflows/queue.json)"
  echo "queue rows: $rows"
else
  echo "note: no queue file"
fi
if [ -d .workflows/reviews ]; then
  echo "FINAL verdicts: $(grep -l 'FINAL' .workflows/reviews/*.md 2>/dev/null | wc -l)"
else
  echo "note: no reviews dir"
fi

echo "== resume: log =="
if [ -f .workflows/LOG.md ]; then tail -n 10 .workflows/LOG.md; else echo "note: no log"; fi

echo "== resume: budget =="
if [ -f .workflows/budget.json ]; then cat .workflows/budget.json; else echo "note: no budget file"; fi

echo "== resume: dirty =="
dirty="$(git status --short 2>/dev/null || true)"
[ -n "$dirty" ] && printf '%s\n' "$dirty" || echo "note: clean"

echo "== resume: gates =="
gates=""
test_cmd=""
defaults=""
if [ ! -f .workflows/profile.json ]; then
  defaults=missing
else
  prof="$(python3 -c 'import json,sys
try:
    p=json.load(open(sys.argv[1]))
    assert isinstance(p,dict)
    for g in (p.get("gates") or []):
        if isinstance(g,str) and g.strip(): print("GATE "+g.strip())
    t=(p.get("commands") or {}).get("test")
    if isinstance(t,str) and t.strip(): print("TEST "+t.strip())
except Exception: sys.exit(3)' .workflows/profile.json)" || defaults=broken
  if [ -z "$defaults" ]; then
    while IFS= read -r line; do
      case "$line" in
      GATE\ *) gates="${gates}${line#GATE }"$'\n' ;;
      TEST\ *) test_cmd="${line#TEST }" ;;
      esac
    done <<<"$prof"
  fi
fi
if [ -n "$defaults" ]; then
  [ "$defaults" = missing ] && echo "note: profile missing — defaults used"
  [ "$defaults" = broken ] && echo "note: profile unreadable — defaults used"
  gates="scripts/check-drift.sh
scripts/docs-lint.sh
scripts/agents-lint.sh"
  test_cmd="bun test"
fi
[ -z "$gates" ] && [ -z "$test_cmd" ] && echo "note: profile defines no gates/test"
while IFS= read -r g; do
  [ -z "$g" ] && continue
  if [ ! -f "$g" ]; then echo "note: gate not found: $g"; continue; fi
  out="$(bash "$g" 2>&1)"
  echo "-- $g (exit $?)"
  [ -n "$out" ] && printf '%s\n' "$out" | tail -n 5 || echo "(no output)"
done <<<"$gates"
if [ -n "$test_cmd" ]; then
  out="$(bash -c "$test_cmd" 2>&1)"
  echo "-- $test_cmd (exit $?)"
  printf '%s\n' "$out" | tail -n 2
fi

echo "== resume: git =="
git log --oneline -10 2>/dev/null || echo "note: no commits yet"
