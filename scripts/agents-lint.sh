#!/usr/bin/env bash
# agents-lint — validate an AGENTS.md instance against the agents doctrine
# (templates/DOCS-POLICY.md: binding rules + one-liner facts + pointers, nothing else).
#
# Usage: bash scripts/agents-lint.sh <path/to/AGENTS.md>
#
# Checks — one "FAIL: <reason>" line per violation, exit 0 clean / 1 on any FAIL:
#   a) every backtick-quoted path in a pointer line (`- Name: `path``) exists,
#      resolved against the repo root (nearest ancestor of the target file
#      containing .git; else the invoking cwd's toplevel; else the file's dir)
#   b) a CORE section is present
#   c) line budget <= 60
#   d) no plan-ID history refs (2026NNNN-NNN)
#   e) no pointer targets an AGENTS.md (nested AGENTS.md files are dead weight —
#      sessions load ancestors of cwd only)
#   f) no unfilled <placeholder> — legal only under templates/* (auto-detected
#      by path); always a violation in an instance
set -u

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "FAIL: usage: agents-lint.sh <agents-md-file>"
  exit 1
fi
if [ ! -f "$FILE" ]; then
  echo "FAIL: file not found: $FILE"
  exit 1
fi

FAILS=0
fail_() {
  printf 'FAIL: %s\n' "$1"
  FAILS=$((FAILS + 1))
}

# Repo root for pointer resolution (see header comment).
dir="$(cd "$(dirname "$FILE")" && pwd)" || dir=.
root=""
scan="$dir"
while [ "$scan" != "/" ]; do
  if [ -e "$scan/.git" ]; then
    root="$scan"
    break
  fi
  scan="$(dirname "$scan")"
done
if [ -z "$root" ]; then
  root="$(git rev-parse --show-toplevel 2>/dev/null || echo "$dir")"
fi

# (c) line budget
lines="$(wc -l < "$FILE" | tr -d '[:space:]')"
if [ "$lines" -gt 60 ]; then
  fail_ "line budget exceeded: $lines lines > 60"
fi

# (b) CORE section present
if ! grep -qE '^#{1,6}[[:space:]]+CORE([[:space:]]|$)' "$FILE"; then
  fail_ "CORE section missing (expected a '## CORE' heading)"
fi

# (d) plan-ID history refs — one FAIL per occurrence
while IFS= read -r hit; do
  [ -n "$hit" ] || continue
  fail_ "plan-ID history ref: $hit"
done < <(grep -nE '2026[0-9]{4}-[0-9]{3}' "$FILE")

# (f) unfilled <placeholder> — template mode (under templates/) exempts this
case "$FILE" in
*templates/*) ;;
*)
  while IFS= read -r hit; do
    [ -n "$hit" ] || continue
    fail_ "unfilled <placeholder> in instance: $hit"
  done < <(grep -n -F -- '<placeholder>' "$FILE")
  ;;
esac

# (a) + (e) pointer lines: `- Name: `path`` — backtick-quoted repo-relative path
pattern='^-+[[:space:]]+[^:`]+:[[:space:]]*`([^`]+)`[[:space:]]*$'
n=0
while IFS= read -r line; do
  n=$((n + 1))
  target=""
  if [[ "$line" =~ $pattern ]]; then
    target="${BASH_REMATCH[1]}"
  fi
  [ -n "$target" ] || continue
  case "$target" in
  *AGENTS.md)
    fail_ "line $n: pointer targets an AGENTS.md (nested AGENTS.md is dead weight): $target"
    continue
    ;;
  esac
  case "$target" in
  *"<placeholder>"*) continue ;; # template slot; rule (f) governs instances
  esac
  if [ ! -e "$root/$target" ]; then
    fail_ "line $n: pointer target does not exist: $target"
  fi
done < "$FILE"

if [ "$FAILS" -eq 0 ]; then
  exit 0
fi
exit 1
