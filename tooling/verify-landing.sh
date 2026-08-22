#!/usr/bin/env bash
# verify-landing.sh — phantom-work tripwire (D6)
# S1: landing check — dirty allowed paths in the main tree (git status --porcelain)
#     OR an allowed-scoped non-empty diff on a matching task branch; both empty → ALARM exit 1
# S2: claims-vs-reality — each claimed file (stdin) must appear in the dirty tree OR a
#     task-branch diffstat (union); absent from both → ALARM exit 1
# S3: magnitude — informational numstat totals + new-file count (never fails)
# CLI: verify-landing.sh [--branches <glob>] <repo> <allowed>... (claimed paths on stdin)
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

    # ── Case 5: branch-landed → S1 PASS via branch evidence (clean main tree), rc 0 ──
    d="$tmpdir/branch-landed"; mkdir -p "$d/src"
    (cd "$d" && git init -q -b main && git config user.email "t@t" && git config user.name "t" \
        && echo "hello" > src/file.txt && git add -A && git commit -m "init" -q \
        && git checkout -q -b subagents/run1/task && echo "world" >> src/file.txt \
        && git add -A && git commit -m "task work" -q && git checkout -q main)
    passfail "branch-landed" 0 "OK.*S1.*landed" \
        bash -c 'echo "src/file.txt" | "$@"' _ "$self" "$d" src

    # ── Case 6: branch-empty → HARD INVARIANT: zero-diff branch + done claim = ALARM [S1] rc 1 ──
    d="$tmpdir/branch-empty"; mkdir -p "$d/src"
    (cd "$d" && git init -q -b main && git config user.email "t@t" && git config user.name "t" \
        && echo "hello" > src/file.txt && git add -A && git commit -m "init" -q \
        && git checkout -q -b subagents/run1/empty && git checkout -q main)
    passfail "branch-empty" 1 "ALARM.*zero diff" \
        bash -c 'echo "src/done.txt" | "$@"' _ "$self" "$d" src

    # ── Case 7: branch-ghost-claim → claimed path in neither tree nor branch diffstat = S2 ALARM rc 1 ──
    d="$tmpdir/branch-ghost"; mkdir -p "$d/src"
    (cd "$d" && git init -q -b main && git config user.email "t@t" && git config user.name "t" \
        && echo "hello" > src/file.txt && git add -A && git commit -m "init" -q \
        && git checkout -q -b subagents/run1/task && echo "world" >> src/file.txt \
        && git add -A && git commit -m "task work" -q && git checkout -q main)
    passfail "branch-ghost-claim" 1 "ALARM.*S2.*ghost" \
        bash -c 'echo "src/ghost.txt" | "$@"' _ "$self" "$d" src

    # ── Case 8: branch-namespace → branch outside the glob is NOT evidence (rc 1);
    #    the same fixture run with --branches 'other/*' passes via the flag (rc 0) ──
    d="$tmpdir/branch-ns"; mkdir -p "$d/src"
    (cd "$d" && git init -q -b main && git config user.email "t@t" && git config user.name "t" \
        && echo "hello" > src/file.txt && git add -A && git commit -m "init" -q \
        && git checkout -q -b other/ns/task && echo "world" >> src/file.txt \
        && git add -A && git commit -m "task work" -q && git checkout -q main)
    passfail "branch-namespace" 1 "ALARM.*zero diff" "$self" "$d" src
    passfail "branch-namespace-flag" 0 "OK.*S1.*landed" "$self" --branches 'other/*' "$d" src

    exit "$(cat "$failfile")"
fi

# ── Normal mode ────────────────────────────────────────────────────────────────
# CLI shape: verify-landing.sh [--branches <glob>] <repo> <allowed>...
branches="subagents/*"   # D3a default: pi-core 1.3.30 task-branch namespace
if [ "${1:-}" = "--branches" ]; then
    shift
    [ -z "${1:-}" ] && { echo "ALARM: --branches requires a glob value"; exit 2; }
    branches="$1"; shift
fi
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
# D3b — OR evidence: dirty allowed paths in the main tree, OR an allowed-scoped
# non-empty diff on ≥1 matching task branch (branch evidence is a superset, never a relaxation).
status="$(git status --porcelain -uall -- "${allowed[@]}" 2>/dev/null)"  # -uall: untracked dirs must list files (S2 blind-spot fix, found live 2026-08-22)
branch_diffstat=""   # union of matching branches' allowed-scoped name-status lines (S2/D3e)
branch_evidence=""   # first branch whose allowed-scoped diff is non-empty (S1/S3 marker)
set -- $(git branch --list --format='%(refname:short)' "$branches" 2>/dev/null)  # D3d: enumerate ALL matching local branches
current="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
for b in "$@"; do
    [ "$b" = "$current" ] && continue                                     # D3d: skip the checked-out branch
    base="$(git merge-base "$b" HEAD 2>/dev/null)" || continue             # D3c: divergence point from HEAD
    bstat="$(git diff --name-status "$base".."$b" -- "${allowed[@]}" 2>/dev/null)"
    [ -z "$bstat" ] && continue                                           # D3c/D3f: zero-diff branch counts as empty
    if [ -n "$branch_diffstat" ]; then
        branch_diffstat="$branch_diffstat
$bstat"
    else
        branch_diffstat="$bstat"
    fi
    [ -z "$branch_evidence" ] && branch_evidence="$b"
done
if [ -z "$status" ] && [ -z "$branch_evidence" ]; then
    echo "ALARM [S1]: write-task claims done but zero diff in allowed paths (${allowed[*]}) under $top"
    exit 1
fi

# S3 — magnitude (informational): numstat totals + new-file count (never fails)
# D3h — when a branch supplies the S1 evidence, the magnitude lands on that branch's diffstat
if [ -n "$branch_evidence" ]; then
    bev_base="$(git merge-base "$branch_evidence" HEAD 2>/dev/null)"
    lines="$(git diff --numstat "$bev_base".."$branch_evidence" -- "${allowed[@]}" 2>/dev/null | awk '{a+=$1; d+=$2} END{print a+0"+/"d+0"-"}')"
    newfiles="$(printf '%s\n' "$branch_diffstat" | grep -c '^A' || true)"
    echo "OK [S1]: work landed via branch $branch_evidence. diff magnitude: $lines, new files: $newfiles"
else
    lines="$(git diff --numstat -- "${allowed[@]}" 2>/dev/null | awk '{a+=$1; d+=$2} END{print a+0"+/"d+0"-"}')"
    untracked="$(echo "$status" | grep -c '^??' || true)"
    echo "OK [S1]: work landed. diff magnitude: $lines, new files: $untracked"
fi

# S2 — claims-vs-reality: every claimed file must appear in the dirty tree OR a task-branch diffstat
if [ -n "$claimed" ]; then
    if [ -n "$status" ]; then
        union="$status"
        if [ -n "$branch_diffstat" ]; then
            union="$status
$branch_diffstat"
        fi
    else
        union="$branch_diffstat"
    fi
    miss=0
    while IFS= read -r f; do
        [ -z "$f" ] && continue
        if ! grep -qF "$f" <<<"$union"; then
            echo "ALARM [S2]: claimed '$f' NOT in dirty tree or task-branch diffstat — suspected phantom"
            miss=1
        fi
    done <<<"$claimed"
    if [ "$miss" -eq 0 ]; then
        echo "OK [S2]: all claimed files present in dirty tree or task-branch diff"
    fi
    exit $miss
fi

exit 0