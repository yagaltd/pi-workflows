#!/usr/bin/env bash
# cleanup-worktrees — safe manual sweep of pi-core-subagent worktrees in a repo.
#
# The extension auto-cleans on merge and at session start (≥1.3.32), but a
# crashed parent session leaves leftovers. Run this at SHIP ritual or anytime:
#
#   node ../pi-workflows/scripts/cleanup-worktrees.sh [repo-dir]   # default: cwd
#
# Rules:
#   - branch fully merged into HEAD  → remove worktree dir + branch (safe)
#   - branch NOT merged              → REPORT only, never touched
#   - worktree dir w/o git registration (stale shell) → removed
#   - branches owned by LIVE runs are never touched (check mtime < 30 min)
set -u
REPO="${1:-$PWD}"
SUB="$REPO/.git/subagents"

[ -d "$SUB" ] || { echo "no .git/subagents in $REPO — nothing to do"; exit 0; }

cd "$REPO" || exit 1
removed=0; kept=0

for wt in "$SUB"/*/; do
  [ -d "$wt" ] || continue
  run_task=$(echo "$wt" | sed "s|$SUB/||; s|/$||")   # <run>/<task>
  branch="subagents/$run_task"

  # live run? (dir touched in the last 30 min)
  if [ -n "$(find "$wt" -mmin -30 2>/dev/null)" ]; then
    echo "LIVE (skipped):    $run_task"
    kept=$((kept+1)); continue
  fi

  if git show-ref --verify --quiet "refs/heads/$branch"; then
    if git merge-base --is-ancestor "$branch" HEAD; then
      echo "MERGED → removing: $run_task"
      git worktree remove --force "$wt" && git branch -D "$branch"
      removed=$((removed+1))
    else
      last=$(git log -1 --format='%h %s' "$branch")
      echo "NOT MERGED (kept): $run_task — $last"
      echo "  → review: git -C $wt diff; then merge --no-ff or discard"
      kept=$((kept+1)); continue
    fi
  else
    echo "STALE SHELL → rm:  $run_task (no branch registered)"
    rm -rf "$wt"
    removed=$((removed+1))
  fi
done

git worktree prune
rmdir "$SUB" 2>/dev/null && echo "(removed empty .git/subagents)"
echo "── $removed removed, $kept kept ──"
[ "$kept" -gt 0 ] && exit 2 || exit 0   # exit 2 = unmerged work needs review
