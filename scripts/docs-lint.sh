#!/usr/bin/env bash
# docs-lint.sh — lint the repository's human-facing Markdown.
#
# Three independent tools over the same doc_paths; a tool that is not
# installed is skipped with a warning, never a failure:
#   * markdownlint-cli2 — Markdown structure/style
#   * lychee            — link checker
#   * harper-cli        — English prose. Noisy on project vocabulary
#     (@role, pi, worktree, …), so it can be downgraded to advisory by
#     setting DOCS_LINT_HARPER_ADVISORY=1: findings are printed but do
#     not fail the run.
# Runs from anywhere; operates on the repo it lives in. No tool configs
# (markdownlint/lychee configs may come later) — tools run on defaults.
#
# Usage: ./scripts/docs-lint.sh   (or bash scripts/docs-lint.sh)
# Exit 0 = clean, or findings only from advisory Harper · non-zero = findings

set -uo pipefail
cd "$(dirname "$0")/.."

FAIL=0
err()  { echo "DOCS-LINT: $1" >&2; FAIL=1; }
warn() { echo "skip:  $1"; }
ok()   { echo "ok:   $1"; }

# Human-facing Markdown surfaces. Directories are linted recursively; a
# path that does not exist in this repo is noted and skipped, not an error.
doc_paths=(README.md AGENTS.md docs agents skills prompts templates)

RAN=()
SKIPPED=()

paths=()
for p in "${doc_paths[@]}"; do
  if [ -e "$p" ]; then
    paths+=("$p")
  else
    warn "$p does not exist in this repo — not linted"
  fi
done

# Flat, deterministic list of Markdown files under the doc paths. Every
# tool gets files, not directories, so per-tool directory semantics
# cannot diverge between installs.
md_files=()
if [ "${#paths[@]}" -gt 0 ]; then
  while IFS= read -r f; do md_files+=("$f"); done < <(
    find "${paths[@]}" -type f -name '*.md' 2>/dev/null | sort
  )
fi

run_markdownlint() {
  echo "== 1. markdownlint-cli2 — Markdown structure/style =="
  if ! command -v markdownlint-cli2 >/dev/null 2>&1; then
    SKIPPED+=("markdownlint-cli2")
    warn "markdownlint-cli2 not installed — structure lint skipped (npm i -g markdownlint-cli2 to enable)"
    return
  fi
  RAN+=("markdownlint-cli2")
  local out
  if out=$(markdownlint-cli2 "${md_files[@]}" 2>&1); then
    ok "markdownlint-cli2 clean"
  else
    printf '%s\n' "$out" >&2
    err "markdownlint-cli2 found problems (see output above)"
  fi
}

run_lychee() {
  echo "== 2. lychee — link checker =="
  if ! command -v lychee >/dev/null 2>&1; then
    SKIPPED+=("lychee")
    warn "lychee not installed — link check skipped (https://lychee.cli.rs to enable)"
    return
  fi
  RAN+=("lychee")
  local out
  if out=$(lychee "${md_files[@]}" 2>&1); then
    ok "lychee: all links resolve"
  else
    printf '%s\n' "$out" >&2
    err "lychee found broken links (see output above)"
  fi
}

run_harper() {
  echo "== 3. harper-cli — English prose =="
  if ! command -v harper-cli >/dev/null 2>&1; then
    SKIPPED+=("harper-cli")
    warn "harper-cli not installed — prose lint skipped (cargo install harper-cli to enable)"
    return
  fi
  RAN+=("harper-cli")
  local advisory=0
  if [ "${DOCS_LINT_HARPER_ADVISORY:-}" = "1" ]; then
    advisory=1
  fi
  local out
  if out=$(harper-cli lint "${md_files[@]}" 2>&1); then
    ok "harper-cli clean"
  elif [ "$advisory" = "1" ]; then
    printf '%s\n' "$out" >&2
    warn "harper-cli found prose issues — advisory (DOCS_LINT_HARPER_ADVISORY=1), not failing"
  else
    printf '%s\n' "$out" >&2
    err "harper-cli found prose issues (set DOCS_LINT_HARPER_ADVISORY=1 to downgrade to advisory)"
  fi
}

if [ "${#md_files[@]}" -eq 0 ]; then
  warn "no Markdown files under doc_paths — nothing to lint"
else
  run_markdownlint
  run_lychee
  run_harper
fi

echo
echo "== summary =="
if [ "${#RAN[@]}" -gt 0 ]; then
  for t in "${RAN[@]}"; do echo "ran:     $t"; done
else
  echo "ran:     (none)"
fi
if [ "${#SKIPPED[@]}" -gt 0 ]; then
  for s in "${SKIPPED[@]}"; do echo "skipped: $s"; done
fi
echo
if [ "$FAIL" -eq 0 ]; then
  echo "CLEAN — docs lint passed."
else
  echo "DOCS-LINT FAILED — fix the findings above; do not silence this check." >&2
fi
exit "$FAIL"
