#!/usr/bin/env bash
# verify-landing.sh — phantom-work tripwire (D6)
# S1: landing check — git status --porcelain over allowed paths; empty → ALARM exit 1
# S2: claims-vs-reality — each claimed file (stdin) must appear in status; miss → ALARM exit 1
# S3: magnitude — informational numstat totals + untracked count (never fails)
# Portability: bash + git + awk only. No tokei, no node, no deno.
set -u

# ── selftest mode ──────────────────────────────────────────────────────────────
if [ "${1:-}" = "--selftest" ]; then
    self="$(realpath "$0")"
    tmpdir="$(mktemp -d)"
    trap 'rm -rf "$tmpdir"' EXIT
    failfile="$tmpdir/.fails"
    echo 0 > "$failfile"

    passfail() {
        local name="$1" expected_rc="$2" pattern="$3"
        shift 3
        local rc=0 result
        result="$("$@" 2>&1)" || rc=$?
        if [ "$rc" -eq "$expected_rc" ] && echo "$result" | grep -qE "$pattern"; then
            echo "PASS: $name"
        else
            echo "FAIL: $name (expected rc=$expected_rc pattern='$pattern', got rc=$rc: $(echo "$result" | head -3 | tr '\n' ' '))"
            echo 1 > "$failfile"
        fi
    }

    # ── Case 1: clean repo → S1 ALARM exit 1 ──
    d="$tmpdir/clean"; mkdir -p "$d/src"
    (cd "$d" && git init -q && git config user.email "t@t" && git config user.name "t" \
        && echo "hello" > src/file.txt && git add -A && git commit -m "init" -q)
    passfail "clean" 1 "ALARM.*zero diff" "$self" "$d" src

    # ── Case 2: landed edit → OK exit 0 ──
    d="$tmpdir/landed"; mkdir -p "$d/src"
    (cd "$d" && git init -q && git config user.email "t@t" && git config user.name "t" \
        && echo "hello" > src/file.txt && git add -A && git commit -m "init" -q \
        && echo "world" >> src/file.txt)
    passfail "landed" 0 "OK.*S1.*landed" "$self" "$d" src

    # ── Case 3: phantom claim → S2 ALARM exit 1 ──
    d="$tmpdir/phantom"; mkdir -p "$d/src"
    (cd "$d" && git init -q && git config user.email "t@t" && git config user.name "t" \
        && echo "hello" > src/file.txt && git add -A && git commit -m "init" -q \
        && echo "world" >> src/file.txt)
    passfail "phantom-claim" 1 "ALARM.*S2.*ghost" \
        bash -c 'echo "src/ghost.txt" | "$@"' _ "$self" "$d" src

    # ── Case 4: non-repo → ALARM exit 2 ──
    d="$tmpdir/nonrepo"; mkdir -p "$d"
    passfail "non-repo" 2 "ALARM.*not a git repo" "$self" "$d" src

    exit "$(cat "$failfile")"
fi

# ── Normal mode ────────────────────────────────────────────────────────────────
repo="$1"; shift
allowed=("$@")

# Read claimed files from stdin (optional — only if piped)
if [ ! -t 0 ]; then
    claimed="$(cat)"
else
    claimed=""
fi

# Resolve repo
cd "$repo" 2>/dev/null || { echo "ALARM: repo inaccessible: $repo"; exit 2; }
top="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "ALARM: not a git repo: $repo"; exit 2; }

# S1 — landing check (binary): any diff within allowed paths?
status="$(git status --porcelain -- "${allowed[@]}" 2>/dev/null)"
if [ -z "$status" ]; then
    echo "ALARM [S1]: write-task claims done but zero diff in allowed paths (${allowed[*]}) under $top"
    exit 1
fi

# S3 — magnitude (informational): numstat totals + explicit untracked count
lines="$(git diff --numstat -- "${allowed[@]}" 2>/dev/null | awk '{a+=$1; d+=$2} END{print a+0"+/"d+0"-"}')"
untracked="$(echo "$status" | grep -c '^??' || true)"
echo "OK [S1]: work landed. diff magnitude: $lines, new files: $untracked"

# S2 — claims-vs-reality: every claimed file must appear in actual status
if [ -n "$claimed" ]; then
    miss=0
    while IFS= read -r f; do
        [ -z "$f" ] && continue
        if ! grep -qF "$f" <<<"$status"; then
            echo "ALARM [S2]: claimed '$f' NOT in worktree status — suspected phantom"
            miss=1
        fi
    done <<<"$claimed"
    if [ "$miss" -eq 0 ]; then
        echo "OK [S2]: all claimed files present in worktree"
    fi
    exit $miss
fi

exit 0