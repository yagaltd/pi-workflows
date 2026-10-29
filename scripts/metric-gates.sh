#!/usr/bin/env bash
# metric-gates — code-quality gates from the profile metrics block (plan
# 20261026-044): complexity (crapper) and duplication (dryer) always; mutation
# (mutator) only with --with-mutation. The tools are operator-side installs;
# an absent tool prints one "skip: <gate> — <tool> not installed" line and is
# never a failure (docs-lint graceful-skip pattern — skips never count as
# violations). A present tool runs once per metrics path from the repo root;
# every threshold breach or surviving mutant prints a "FAIL:" line and the
# script exits 1. Exit 0 otherwise (skips and notes are not violations).
#
# Usage: bash scripts/metric-gates.sh [--with-mutation] [--profile <file>]
#
# Profile: .workflows/profile.json (override with --profile <file>). Consumed
# fields — metrics.crap_max (default 10), metrics.duplication_max (default
# 0.8), metrics.paths (default: the profile's tree paths, repo-root-relative);
# no readable profile ⇒ defaults + one note line. Read via python3 JSON (no
# deps — the resume-digest pattern).
#
# Expected tool output, parsed tolerantly — only the token matters:
#   crapper: any line carrying "crap <int>"     e.g. "function foo crap 42"
#   dryer:   any line carrying "similarity <f>" e.g. "similarity 0.93"
#   mutator: any line carrying "survived"       = surviving mutant ⇒ FAIL
# A crap value strictly above crap_max, a similarity strictly above
# duplication_max, or any surviving mutant is a violation.
set -u

WITH_MUTATION=0
PROFILE=""
prev=""
for arg in "$@"; do
  if [ "$prev" = "--profile" ]; then PROFILE="$arg"; prev=""; continue; fi
  case "$arg" in
  --with-mutation) WITH_MUTATION=1 ;;
  --profile) prev="--profile" ;;
  *)
    echo "FAIL: unknown argument: $arg (usage: metric-gates.sh [--with-mutation] [--profile <file>])"
    exit 1
    ;;
  esac
done
if [ "$prev" = "--profile" ]; then
  echo "FAIL: --profile needs a file argument"
  exit 1
fi

# Repo root: .git walk-up from this script's dir (profile-lint pattern);
# git rev-parse fallback for relocated copies.
dir="$(cd "$(dirname "$0")" && pwd)" || dir="$PWD"
root=""
scan="$dir"
while [ "$scan" != "/" ]; do
  [ -e "$scan/.git" ] && {
    root="$scan"
    break
  }
  scan="$(dirname "$scan")"
done
[ -z "$root" ] && root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$root" ] || [ ! -e "$root/.git" ]; then
  echo "FAIL: no .git found above $dir — metric gates need a repo root"
  exit 1
fi

# Relative --profile resolves against the invoking cwd first, then the root.
if [ -n "$PROFILE" ] && [ ! -f "$PROFILE" ] && [ -f "$root/$PROFILE" ]; then
  PROFILE="$root/$PROFILE"
fi
[ -z "$PROFILE" ] && PROFILE="$root/.workflows/profile.json"

# Profile read (python3 JSON — no deps): metrics block or defaults; paths
# default to the profile's tree paths.
crap_max=10
duplication_max=0.8
paths=""
if [ -f "$PROFILE" ]; then
  data="$(python3 - "$PROFILE" <<'PY'
import json
import sys

try:
    with open(sys.argv[1], encoding="utf-8") as f:
        p = json.load(f)
    assert isinstance(p, dict)
except Exception:
    p = {}
m = p.get("metrics")
m = m if isinstance(m, dict) else {}
tree = p.get("tree")
tree = tree if isinstance(tree, dict) else {}
crap = m.get("crap_max", 10)
dup = m.get("duplication_max", 0.8)
paths = m.get("paths")
if not isinstance(paths, list) or not paths or not all(
    isinstance(x, str) and x.strip() for x in paths
):
    paths = [v for v in tree.values() if isinstance(v, str) and v.strip()]
print(f"crap={crap}")
print(f"dup={dup}")
for x in paths:
    print(f"path={x}")
PY
)" || data=""
  while IFS= read -r line; do
    case "$line" in
    crap=*) crap_max="${line#crap=}" ;;
    dup=*) duplication_max="${line#dup=}" ;;
    path=*) paths="$paths ${line#path=}" ;;
    esac
  done <<EOF
$data
EOF
else
  echo "note: no profile at $PROFILE — defaults apply (crap_max=$crap_max, duplication_max=$duplication_max)"
fi
[ -z "$paths" ] && echo "note: no metrics paths resolved — gates have nothing to scan"

violations=0

# complexity — crapper: every "crap <int>" token above crap_max fails.
if command -v crapper >/dev/null 2>&1; then
  for p in $paths; do
    if [ ! -e "$p" ]; then echo "note: path missing: $p"; continue; fi
    while IFS= read -r val; do
      [ -n "$val" ] || continue
      if awk -v v="$val" -v t="$crap_max" 'BEGIN { exit !(v > t) }'; then
        echo "FAIL: complexity — crap $val exceeds crap_max $crap_max ($p)"
        violations=$((violations + 1))
      fi
    done < <(crapper "$p" 2>&1 | grep -Eo 'crap [0-9]+' | awk '{print $2}')
  done
else
  echo "skip: complexity — crapper not installed"
fi

# duplication — dryer: every "similarity <float>" token above duplication_max.
if command -v dryer >/dev/null 2>&1; then
  for p in $paths; do
    if [ ! -e "$p" ]; then echo "note: path missing: $p"; continue; fi
    while IFS= read -r val; do
      [ -n "$val" ] || continue
      if awk -v v="$val" -v t="$duplication_max" 'BEGIN { exit !(v > t) }'; then
        echo "FAIL: duplication — similarity $val exceeds duplication_max $duplication_max ($p)"
        violations=$((violations + 1))
      fi
    done < <(dryer "$p" 2>&1 | grep -Eo 'similarity [0-9]+[.][0-9]+' | awk '{print $2}')
  done
else
  echo "skip: duplication — dryer not installed"
fi

# mutation — mutator: only with --with-mutation (cost tier); survivors FAIL.
if [ "$WITH_MUTATION" -eq 1 ]; then
  if command -v mutator >/dev/null 2>&1; then
    for p in $paths; do
      if [ ! -e "$p" ]; then echo "note: path missing: $p"; continue; fi
      while IFS= read -r line; do
        echo "FAIL: mutation — surviving mutant ($p): $line"
        violations=$((violations + 1))
      done < <(mutator "$p" 2>&1 | grep -i 'survived')
    done
  else
    echo "skip: mutation — mutator not installed"
  fi
fi

if [ "$violations" -gt 0 ]; then
  echo "metric-gates: $violations violation(s)"
  exit 1
fi
exit 0
