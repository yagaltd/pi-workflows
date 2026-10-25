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
# Two doc-drift sections run in the same numbered/err/ok style and fail on
# findings:
#   * 4. doc stamps — a file that declares `generated_by` (frontmatter key or
#     prose token) must also carry `generated_at` + `stale_after`; a
#     `stale_after` date (YYYY-MM-DD) before today is an expired-stamp finding.
#   * 5. claim-to-gate — claim lines (must / must not / never, case-
#     insensitive, outside fenced code blocks and inline code spans) in
#     AGENTS.md + docs/** must carry a gate reference on the same line: a
#     backtick span containing `/`, a command-shaped backtick span, or a
#     `gate:` token. Missing ⇒ finding with file:line + the claim text.
#
# Env:
#   DRIFT_SCAN_DIR     override the drift-section scan root (fixtures). With
#                      it set, only the drift sections run — they scan every
#                      *.md under the root and the tool sections are skipped,
#                      so fixture outcomes do not depend on installed tools.
#   DRIFT_CLAIM_SCOPE  space-separated path prefixes narrowing the claim scan
#                      (e.g. "docs/canon.md").
#
# Runs from anywhere; operates on the repo it lives in. No tool configs
# (markdownlint/lychee configs may come later) — tools run on defaults.
#
# Usage: ./scripts/docs-lint.sh   (or bash scripts/docs-lint.sh)
# Exit 0 = clean, or findings only from advisory Harper · non-zero = findings
#          (drift-section findings always fail, live repo or fixture)

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

# --- doc-drift scan roots (sections 4–5) ------------------------------------
#
# DRIFT_SCAN_DIR repoints the drift scan at a fixture root: the drift
# sections then scan every *.md under it (recursively, sorted) and the
# tool sections are skipped. Live runs scan the doc_paths files for
# stamps, and the curated claim surface AGENTS.md + docs/** for claims,
# optionally narrowed by DRIFT_CLAIM_SCOPE path prefixes.
drift_root="${DRIFT_SCAN_DIR:-}"

drift_stamp_files=()
drift_claim_files=()
if [ -n "$drift_root" ]; then
  while IFS= read -r f; do drift_stamp_files+=("$f"); done < <(
    find "$drift_root" -type f -name '*.md' 2>/dev/null | sort
  )
  drift_claim_files=("${drift_stamp_files[@]}")
else
  drift_stamp_files=("${md_files[@]}")
  if [ -e AGENTS.md ]; then drift_claim_files+=("AGENTS.md"); fi
  for f in "${md_files[@]}"; do
    case "$f" in docs/*) drift_claim_files+=("$f") ;; esac
  done
fi
if [ -n "${DRIFT_CLAIM_SCOPE:-}" ] && [ "${#drift_claim_files[@]}" -gt 0 ]; then
  narrowed=()
  for f in "${drift_claim_files[@]}"; do
    for scope in $DRIFT_CLAIM_SCOPE; do
      case "$f" in "$scope"|"$scope"/*) narrowed+=("$f"); break ;; esac
    done
  done
  drift_claim_files=("${narrowed[@]}")
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

run_stamps() {
  echo "== 4. doc stamps — generated_by ⇒ generated_at + stale_after =="
  if [ "${#drift_stamp_files[@]}" -eq 0 ]; then
    SKIPPED+=("doc-stamps")
    warn "no files to scan for stamps"
    return
  fi
  RAN+=("doc-stamps")
  local f ln today d
  today=$(date +%F)
  for f in "${drift_stamp_files[@]}"; do
    # Only self-declared files are checked: a file without the generated_by
    # token is hand-written and exempt (no false positives by construction).
    grep -q 'generated_by' "$f" || continue
    ln=$(grep -n -m1 'generated_by' "$f" | cut -d: -f1)
    if ! grep -q 'generated_at' "$f"; then
      err "$f:$ln: generated_by declared but generated_at missing — add a stamp"
    fi
    if ! grep -q 'stale_after' "$f"; then
      err "$f:$ln: generated_by declared but stale_after missing — add a stamp"
    elif ! d=$(grep -m1 'stale_after' "$f" | sed -n -E 's/.*stale_after[^0-9]*([0-9]{4}-[0-9]{2}-[0-9]{2}).*/\1/p') || [ -z "$d" ]; then
      err "$f:$ln: stale_after carries no YYYY-MM-DD date"
    elif [[ "$d" < "$today" ]]; then
      err "$f:$ln: stamp expired — stale_after $d is before today $today"
    fi
  done
}

# Strip inline code spans (`…`, ``…``) so their contents never read as
# claims. Applied repeatedly until a fixed point.
strip_code_spans() {
  local s=$1 prev
  while :; do
    prev=$s
    s=$(printf '%s' "$s" | sed -E 's/``[^`]+``//g; s/`[^`]+`//g')
    [ "$s" = "$prev" ] && break
  done
  printf '%s' "$s"
}

# A gate reference on a claim line: a backtick span containing `/`, a
# command-shaped backtick span (lowercase first word followed by more
# words), or a `gate:` token.
has_gate_ref() {
  local line=$1 span
  if printf '%s' "$line" | grep -qiE '(^|[^[:alpha:]])gate:'; then return 0; fi
  while IFS= read -r span; do
    [ -n "$span" ] || continue
    case "$span" in */*) return 0 ;; esac
    if printf '%s' "$span" | grep -qE '^[a-z][a-z0-9._-]*[[:space:]]+[^[:space:]]'; then return 0; fi
  done < <(printf '%s' "$line" | grep -oE '`[^`]+`' | sed -E 's/^`//; s/`$//')
  return 1
}

run_claims() {
  echo "== 5. claim-to-gate — must / must not / never lines name a gate =="
  if [ "${#drift_claim_files[@]}" -eq 0 ]; then
    SKIPPED+=("claim-to-gate")
    warn "no files in claim scope"
    return
  fi
  RAN+=("claim-to-gate")
  local f n line stripped excerpt fence
  for f in "${drift_claim_files[@]}"; do
    fence=0
    n=0
    while IFS= read -r line || [ -n "$line" ]; do
      n=$((n + 1))
      case "$line" in
        '```'*|'~~~'*) fence=$((1 - fence)); continue ;;
      esac
      [ "$fence" -eq 0 ] || continue
      stripped=$(strip_code_spans "$line")
      printf '%s\n' "$stripped" | grep -qiE '\b(must not|must|never)\b' || continue
      if has_gate_ref "$line"; then continue; fi
      excerpt=$(printf '%s' "$line" | cut -c1-120)
      err "$f:$n: claim without gate reference: $excerpt"
    done < "$f"
  done
}

if [ -n "$drift_root" ]; then
  # Fixture mode: only the drift sections run, on the fixture root, so
  # fixture outcomes do not depend on installed tools or live doc state.
  warn "DRIFT_SCAN_DIR=$drift_root set — tool sections skipped (fixture mode: drift sections only)"
  SKIPPED+=("markdownlint-cli2" "lychee" "harper-cli")
  run_stamps
  run_claims
elif [ "${#md_files[@]}" -eq 0 ]; then
  warn "no Markdown files under doc_paths — nothing to lint"
else
  run_markdownlint
  run_lychee
  run_harper
  run_stamps
  run_claims
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
