#!/usr/bin/env bash
# check-spec-selectors.sh — parse-only syntax lint for `.spec` `Test:` selectors.
#
# Selectors describe the post-work end state, so this lint NEVER executes them.
# Each extracted selector is checked with `bash -n` (syntax only) plus a small
# grep-family flag sanity pass:
#   * -A / -B / -C context counts must be numeric (grep's -c is its count flag
#     and takes no value, so lowercase -c is deliberately not in this numeric set)
#   * an empty quoted argument ('' / "") is rejected — patterns must be non-empty
#   * a `-f` reference must name a non-empty pattern-file path
# Findings print one per defect to stdout as `file:line: <finding>`; any finding
# exits 1. Clean input is silent and exits 0.
#
# Usage:
#   bash scripts/check-spec-selectors.sh [spec ...]
# With no args, lints .workflows/specs/*.spec relative to the current dir; an
# absent directory is clean (exit 0, silence).

set -uo pipefail

FAIL=0
finding() {
  printf '%s\n' "$1"
  FAIL=1
}

# check_selector <file> <lineno> <selector-text>
check_selector() {
  local file=$1 lineno=$2 sel=$3

  if [ -z "$sel" ]; then
    finding "$file:$lineno: empty selector"
    return
  fi

  # Parse-only syntax gate — `bash -n` reads the selector from stdin and never
  # executes a single command from it.
  if ! printf '%s\n' "$sel" | bash -n 2>/dev/null; then
    finding "$file:$lineno: shell syntax error in selector: $sel"
  fi

  # ── grep-family flag sanity (all checks are on the selector string) ────
  # Attached non-numeric context value, e.g. `grep -Ax pattern file`.
  if printf '%s\n' "$sel" | grep -Eq '(^|[[:space:]])-[ABC][^0-9[:space:]]'; then
    finding "$file:$lineno: non-numeric context flag value: $sel"
  fi
  # Separated value that is non-numeric or missing, e.g. `grep -A x ...`, `grep -A`.
  if printf '%s\n' "$sel" | grep -Eq '(^|[[:space:]])-[ABC][[:space:]]+([^0-9]|$)'; then
    finding "$file:$lineno: non-numeric or missing context flag value: $sel"
  fi
  # Attached flag with nothing after it, e.g. trailing `-C`.
  if printf '%s\n' "$sel" | grep -Eq '(^|[[:space:]])-[ABC]$'; then
    finding "$file:$lineno: missing context flag value: $sel"
  fi
  # Empty quoted argument: `grep -q '' file`.
  if printf '%s\n' "$sel" | grep -Eq "(^|[[:space:]])(''|\"\")($|[[:space:]])"; then
    finding "$file:$lineno: empty quoted argument (pattern must be non-empty): $sel"
  fi
  # `-f` pattern file: empty or entirely absent path.
  if printf '%s\n' "$sel" | grep -Eq "(^|[[:space:]])-f(''|\"\"|\$)"; then
    finding "$file:$lineno: grep -f pattern-file path missing: $sel"
  fi
  if printf '%s\n' "$sel" | grep -Eq "(^|[[:space:]])-f[[:space:]]+(''|\"\")($|[[:space:]])"; then
    finding "$file:$lineno: grep -f pattern-file path missing: $sel"
  fi
}

# ── target selection ─────────────────────────────────────────────────────
if [ "$#" -gt 0 ]; then
  specs=("$@")
else
  shopt -s nullglob
  specs=(.workflows/specs/*.spec)
  shopt -u nullglob
fi

if [ "${#specs[@]}" -eq 0 ]; then
  exit 0
fi

for spec in "${specs[@]}"; do
  if [ ! -f "$spec" ]; then
    finding "$spec:1: spec file not found"
    continue
  fi

  while IFS=$'\t' read -r lineno sel; do
    [ -n "$lineno" ] || continue
    check_selector "$spec" "$lineno" "$sel"
  done < <(awk '
    /^[[:space:]]*Test:/ {
      line = NR
      sub(/^[[:space:]]*Test:[[:space:]]*/, "")
      printf "%d\t%s\n", line, $0
    }
  ' "$spec")
done

if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
exit 0