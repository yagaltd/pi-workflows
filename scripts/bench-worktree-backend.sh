#!/usr/bin/env bash
# bench-worktree-backend — plan 20261025-020 (D1): measure git worktrees vs
# LayerFS workspaces on the real pi-workflows tree.
#
# Git side (current backend, the baseline):
#   git worktree add --detach <dir> HEAD  →  probe (marker file + tree diff
#   vs source, excluding VCS metadata)  →  du -sk  →  git worktree remove.
#   ×20, ns timing via date +%s%N.
#
# LayerFS side (candidate backend, plan 020 context pack):
#   build from the local checkout's documented build path
#   (api/scripts/build-native.mjs — cargo +1.85.1, --offline --locked,
#   CARGO_BUILD_JOBS=2), then — only if the build ok AND a Docker engine is
#   reachable — workspace create → write probe → commit → discard ×20 through
#   the `layerfs` CLI with every LAYERFS_* path scoped to the bench scratch
#   dir (Store Disposable profile, the checkout's only profile here; the
#   owner's global config is never touched).
#
# A LayerFS build failure, missing Docker, or a low-disk abort is a RESULT
# (NO-GO-environment), recorded in the results file — never fixed inline.
#
# Guards: abort cleanly (exit 0, ABORTED entry) when free disk < 5 GB before
# or during the run; bounded build jobs (CARGO_BUILD_JOBS=2); free disk and
# load average recorded at run start and end.
#
# Usage:
#   bash scripts/bench-worktree-backend.sh                 # full run
#   bash scripts/bench-worktree-backend.sh --cleanup-only  # prune residue, exit 0
#
# Results: .workflows/reviews/layerfs-bench.md (rewritten each run).

set -u

N=20
MIN_FREE_KB=$((5 * 1024 * 1024))            # 5 GB guard
LAYERFS_CHECKOUT="${LAYERFS_CHECKOUT:-/home/aurel/Documents/vibe/layerfs}"
SCRATCH_ROOT="${BENCH_SCRATCH:-$HOME/.cache/pw-layerfs-bench}"
MARKER=".bench-marker"

cd "$(dirname "$0")/.." || exit 1
ROOT="$(git rev-parse --show-toplevel)" || exit 1
cd "$ROOT" || exit 1

HEAD_SUMMARY="$(git log -1 --format='%h %s')"
STAMP="$(date +%Y%m%d-%H%M%S)"
SCRATCH="$SCRATCH_ROOT/$STAMP"
RESULTS="$ROOT/.workflows/reviews/layerfs-bench.md"
GIT_COMMON="$(git rev-parse --git-common-dir)"
mkdir -p "$(dirname "$RESULTS")"

log() { printf '%s\n' "$*"; }
now_ns() { date +%s%N; }
ns_ms() { awk -v n="$1" 'BEGIN { printf "%.1f", n / 1000000 }'; }
kb_mb() { awk -v k="$1" 'BEGIN { printf "%.1f", k / 1024 }'; }
free_kb() { df -k --output=avail "$(dirname "$1")" 2>/dev/null | tail -1 | tr -d ' '; }
load_avg() { cut -d' ' -f1-3 /proc/loadavg 2>/dev/null || uptime | sed 's/.*load average: //'; }

# p50/p95, nearest-rank on the sorted samples. Args: samples... (ns).
pct() {
  local p="$1"; shift
  printf '%s\n' "$@" | sort -n | awk -v p="$p" -v n="$#" \
    '{ a[NR] = $1 } END { r = p * n; r = (r == int(r)) ? r : int(r) + 1; if (r < 1) r = 1; if (r > n) r = n; print a[r] }'
}

# ---------------------------------------------------------------- cleanup-only
if [ "${1:-}" = "--cleanup-only" ]; then
  git worktree prune
  # remove any bench worktree dirs still registered or on disk
  git worktree list --porcelain | awk '/^worktree /{print $2}' | grep "pw-layerfs-bench" | while IFS= read -r wt; do
    git worktree remove --force "$wt" 2>/dev/null || rm -rf "$wt"
  done
  [ -d "$SCRATCH_ROOT" ] && rm -rf "$SCRATCH_ROOT"
  log "cleanup: git worktree pruned, bench scratch removed ($SCRATCH_ROOT)"
  exit 0
fi

# ------------------------------------------------------------------- preflight
LOAD_START="$(load_avg)"
DISK_BEFORE_KB="$(free_kb "$ROOT")"
DISK_BEFORE_H="$(kb_mb "$DISK_BEFORE_KB")"
if [ "${DISK_BEFORE_KB:-0}" -lt "$MIN_FREE_KB" ]; then
  {
    log "# worktree-backend bench — ABORTED"
    log ""
    log "ABORTED: disk free before run ${DISK_BEFORE_H} MB < 5 GB guard. No measurements taken."
    log "disk free before: ${DISK_BEFORE_H} MB; load average: ${LOAD_START}"
  } > "$RESULTS"
  log "ABORTED: low disk (${DISK_BEFORE_H} MB free) — recorded in $RESULTS"
  exit 0
fi

TREE_FILES="$(git ls-files | wc -l | tr -d ' ')"
TREE_BYTES_KB="$(du -sk --exclude=node_modules --exclude=.git "$ROOT" 2>/dev/null | awk '{print $1}')"
mkdir -p "$SCRATCH"

# Source-side files a fresh worktree will legitimately not have: untracked +
# ignored paths of THIS checkout (my own edits, node_modules symlink, the
# results dir the script itself creates, …). Computed after the results dir
# mkdir so it is part of the picture from the start.
mkdir -p "$(dirname "$RESULTS")"
UNTRACKED_BASES="$(git status --porcelain --ignored 2>/dev/null | awk '{print $NF}' | while IFS= read -r p; do basename "$p"; done | sort -u)"

probe_workspace() {
  # $1 = worktree dir. Verify: marker present; tree identical to source once
  # untracked/ignored source-side paths are excluded (my own edits, the
  # node_modules symlink, …); .git is the gitfile pointer (no real .git dir —
  # zero VCS pollution in the workspace).
  local ws="$1" diffout bad base ex=()
  [ -f "$ws/$MARKER" ] || { log "FAIL: marker missing in $ws"; return 1; }
  # node_modules is a shared symlink outside git's view (system constraint);
  # .workflows is evidence/meta (gitignored by design, tracked exceptions).
  # Both always excluded. Everything else dynamic: this checkout's untracked set.
  for base in .git node_modules .workflows $UNTRACKED_BASES; do ex+=(--exclude="$base"); done
  diffout="$(diff -rq ${ex[@]:-} "$ROOT" "$ws" 2>&1)" || true
  bad="$(printf '%s\n' "$diffout" | grep -v -F "Only in $ws: $MARKER" | grep -v '^$')"
  if [ -n "$bad" ]; then log "FAIL: unexpected tree diff:"; log "$bad" | head -5; return 1; fi
  printf '%s\n' "$diffout" | grep -qF "Only in $ws: $MARKER" || { log "FAIL: marker not reported by diff"; return 1; }
  [ -f "$ws/.git" ] && [ ! -d "$ws/.git" ] || { log "FAIL: .git pollution in workspace"; return 1; }
  return 0
}

# ------------------------------------------------------------------ git side
log "== git worktree baseline (N=$N) =="
ADD_NS=(); RM_NS=(); DU_KB=(); PROBE_OK=0; RESIDUE=0; GIT_ABORT=""
mkdir -p "$SCRATCH/wt"
for i in $(seq 1 "$N"); do
  AV="$(free_kb "$ROOT")"
  if [ "${AV:-0}" -lt "$MIN_FREE_KB" ]; then GIT_ABORT="iteration $i: disk ${AV} KB < 5 GB"; break; fi
  WS="$SCRATCH/wt/wt-$STAMP"
  t0="$(now_ns)"
  if ! git worktree add --detach "$WS" HEAD >/dev/null 2>&1; then
    GIT_ABORT="iteration $i: git worktree add failed"; break
  fi
  t1="$(now_ns)"
  printf 'bench marker %s iter %s\n' "$STAMP" "$i" > "$WS/$MARKER" 2>/dev/null
  if probe_workspace "$WS"; then PROBE_OK=$((PROBE_OK + 1)); fi
  d="$(du -sk "$WS" 2>/dev/null | awk '{print $1}')"
  DU_KB+=("$d")
  t2="$(now_ns)"
  if ! git worktree remove --force "$WS" >/dev/null 2>&1; then
    rm -rf "$WS"; RESIDUE=$((RESIDUE + 1))
  fi
  t3="$(now_ns)"
  [ -e "$WS" ] && { rm -rf "$WS"; RESIDUE=$((RESIDUE + 1)); }
  ADD_NS+=($((t1 - t0))); RM_NS+=($((t3 - t2)))
done
BENCH_LEFT=$(git worktree list --porcelain | grep -c "pw-layerfs-bench" || true)

# --------------------------------------------------------------- layerfs side
log "== LayerFS side =="
LF_BUILD="aborted"; LF_BUILD_MS="n/a"; LF_TOOLCHAIN="n/a"; LF_NOTE=""
LF_RUNTIME="not run"; LF_SETUP_P50="n/a"; LF_SETUP_P95="n/a"; LF_TEARDOWN="n/a"; LF_DISK="n/a"
LF_RUNTIME_NOTE=""

if [ ! -d "$LAYERFS_CHECKOUT" ]; then
  LF_BUILD="aborted"; LF_NOTE="checkout not found at $LAYERFS_CHECKOUT"
else
  LF_COMMIT="$(git -C "$LAYERFS_CHECKOUT" log -1 --format='%h' 2>/dev/null || echo 'unknown')"
  LF_TOOLCHAIN="$(cargo +1.85.1 --version 2>/dev/null || cargo --version 2>/dev/null || echo 'cargo missing')"
  AV="$(free_kb "$LAYERFS_CHECKOUT")"
  if [ "${AV:-0}" -lt "$MIN_FREE_KB" ]; then
    LF_BUILD="aborted"; LF_NOTE="disk ${AV} KB < 5 GB guard before build"
  else
    t0="$(now_ns)"
    if (cd "$LAYERFS_CHECKOUT" && CARGO_BUILD_JOBS=2 node api/scripts/build-native.mjs) > "$SCRATCH/build.log" 2>&1; then
      t1="$(now_ns)"
      LF_BUILD="ok"; LF_BUILD_MS="$(ns_ms $((t1 - t0)))"
      LF_ARTIFACT="$(ls -la "$LAYERFS_CHECKOUT/api/binding/layerfs.node" 2>/dev/null | awk '{print $5}')"
      # Docker gate: workspace mount runs the daemon in a Docker sandbox
      # (checkout docs/api/how-to-use/agent.md, "Sandboxes and Workspaces").
      if docker info > /dev/null 2>&1; then
        LF_RUNTIME="run (see below)"
        LF_RUNTIME_NOTE="docker available"
        # Scoped env: every LAYERFS_* path inside the bench scratch; Store
        # Disposable profile (checkout default; no crash durability).
        export LAYERFS_HOME="$SCRATCH/layerfs-home"
        export LAYERFS_STORE_PATH="$SCRATCH/layerfs-store/store.sqlite"
        export LAYERFS_NATIVE="$LAYERFS_CHECKOUT/api/binding/layerfs.node"
        LAYERFS_CLI="$LAYERFS_CHECKOUT/api/agent/cli/src/layerfs.js"
        mkdir -p "$(dirname "$LAYERFS_STORE_PATH")" "$LAYERFS_HOME"
        git archive HEAD | tar -x -C "$SCRATCH/project-src"
        if node "$LAYERFS_CLI" init pw-bench "$SCRATCH/project-src" > "$SCRATCH/init.log" 2>&1 \
           && node "$LAYERFS_CLI" branch fork bench > "$SCRATCH/fork.log" 2>&1; then
          LF_ADD_NS=(); LF_RM_NS=(); LF_OK=0
          for i in $(seq 1 "$N"); do
            AV="$(free_kb "$SCRATCH")"
            if [ "${AV:-0}" -lt "$MIN_FREE_KB" ]; then LF_NOTE="aborted at iteration $i: disk < 5 GB"; break; fi
            t0="$(now_ns)"
            SANDBOX_JSON="$(node "$LAYERFS_CLI" sandbox create 2>/dev/null)" || { LF_NOTE="iteration $i: sandbox create failed"; break; }
            SB="$(printf '%s' "$SANDBOX_JSON" | grep -oE '"sandbox"[^,}]*' | head -1 | grep -oE '[0-9]+')"
            WS_JSON="$(node "$LAYERFS_CLI" workspace mount "$SB" bench 2>/dev/null)" || { LF_NOTE="iteration $i: mount failed"; break; }
            WSP="$(printf '%s' "$WS_JSON" | grep -oE '"/workspaces/[0-9]+"' | head -1 | tr -d '"')"
            t1="$(now_ns)"
            printf 'bench marker %s iter %s\n' "$STAMP" "$i" > "$WSP/$MARKER" 2>/dev/null \
              && node "$LAYERFS_CLI" workspace commit "$WSP" "bench probe $i" >/dev/null 2>&1 \
              && LF_OK=$((LF_OK + 1))
            d="$(du -sk "$SCRATCH/layerfs-store" 2>/dev/null | awk '{print $1}')"
            LF_DISK="$d"
            t2="$(now_ns)"
            node "$LAYERFS_CLI" workspace unmount "$WSP" >/dev/null 2>&1
            node "$LAYERFS_CLI" sandbox close "$SB" >/dev/null 2>&1
            t3="$(now_ns)"
            LF_ADD_NS+=($((t1 - t0))); LF_RM_NS+=($((t3 - t2)))
          done
          if [ "${#LF_ADD_NS[@]}" -gt 0 ]; then
            LF_SETUP_P50="$(ns_ms "$(pct 0.50 "${LF_ADD_NS[@]}")")"
            LF_SETUP_P95="$(ns_ms "$(pct 0.95 "${LF_ADD_NS[@]}")")"
            LF_TEARDOWN="$(ns_ms "$(pct 0.50 "${LF_RM_NS[@]}")") (p50)"
            LF_DISK="$(kb_mb "$LF_DISK") MB (store dir)"
            LF_RUNTIME="$LF_OK/$N probes passed"
          else
            LF_RUNTIME="failed: ${LF_NOTE:-no iterations completed}"
          fi
        else
          LF_RUNTIME="failed: init/fork failed (see $SCRATCH/init.log)"
        fi
      else
        LF_RUNTIME="not run"
        LF_RUNTIME_NOTE="NO-GO-environment: no Docker engine reachable (docker info failed). LayerFS workspace mount runs the daemon in a Docker sandbox (checkout docs api/how-to-use/agent.md 'Sandboxes and Workspaces'); setup/teardown/disk axes are unmeasurable on this machine."
      fi
    else
      t1="$(now_ns)"
      LF_BUILD="failed"; LF_BUILD_MS="$(ns_ms $((t1 - t0)))"
      LF_NOTE="$(tail -4 "$SCRATCH/build.log" | tr '\n' ' ' | cut -c1-300)"
    fi
  fi
fi

DISK_AFTER_KB="$(free_kb "$ROOT")"
DISK_AFTER_H="$(kb_mb "$DISK_AFTER_KB")"
LOAD_END="$(load_avg)"

# ------------------------------------------------------------------ results
G_P50="$(ns_ms "$(pct 0.50 ${ADD_NS[@]:-0})")"
G_P95="$(ns_ms "$(pct 0.95 ${ADD_NS[@]:-0})")"
G_T50="$(ns_ms "$(pct 0.50 ${RM_NS[@]:-0})")"
G_T95="$(ns_ms "$(pct 0.95 ${RM_NS[@]:-0})")"
G_N=${#DU_KB[@]}
G_DISK_SUM=0
if [ "$G_N" -gt 0 ]; then
  G_DISK_SUM=$(printf '%s\n' "${DU_KB[@]}" | awk '{s+=$1} END{print s+0}')
  G_DISK_MB="$(kb_mb $((G_DISK_SUM / G_N)))"
else
  G_DISK_MB="n/a (no completed iterations)"
fi
G_MIN="$(ns_ms "$(printf '%s\n' ${ADD_NS[@]:-0} | sort -n | head -1)")"
G_MAX="$(ns_ms "$(printf '%s\n' ${ADD_NS[@]:-0} | sort -n | tail -1)")"

{
  log "# LayerFS vs git worktree backend — bench (plan 20261025-020, D1)"
  log ""
  log "Generated by \`scripts/bench-worktree-backend.sh\` at $STAMP on pi-workflows @ $HEAD_SUMMARY."
  log ""
  log "## Environment"
  log ""
  log "| axis | value |"
  log "| --- | --- |"
  log "| repo HEAD | $HEAD_SUMMARY |"
  log "| tracked tree | $TREE_FILES files, ~$(kb_mb "$TREE_BYTES_KB") MB on disk (excl. node_modules/.git) |"
  log "| disk free before | ${DISK_BEFORE_H} MB |"
  log "| disk free after | ${DISK_AFTER_H} MB |"
  log "| load average (start / end) | $LOAD_START / $LOAD_END |"
  log "| iterations | N=$N per side |"
  log "| scratch dir | \`$SCRATCH\` |"
  log ""
  log "## git (current backend: git worktrees)"
  log ""
  if [ -n "$GIT_ABORT" ]; then
    log "**ABORTED: $GIT_ABORT**"
    log ""
  fi
  log "Cycle: \`git worktree add --detach <dir> HEAD\` → marker write + tree-diff probe → \`du -sk\` → \`git worktree remove --force\`. ns timing via \`date +%s%N\`. p50/p95 = nearest-rank over the $N samples."
  log ""
  log "| axis | p50 | p95 | min → max (setup) |"
  log "| --- | --- | --- | --- |"
  log "| git worktree add — setup (ms) | $G_P50 | $G_P95 | $G_MIN → $G_MAX |"
  log "| git worktree remove — teardown (ms) | $G_T50 | $G_T95 | — |"
  log "| disk per worktree (MB, du -sk mean) | $G_DISK_MB | — | — |"
  log ""
  log "- correctness (tree diff vs source, marker write): $PROBE_OK/$N passed"
  log "- teardown residue (forced rm -rf / dirs left): $RESIDUE; bench worktrees left in \`git worktree list\`: $BENCH_LEFT"
  log "- headline: git worktree add setup p95 = $G_P95 ms (contract ceiling 500 ms; pre-pilot baseline 39 ms)"
  log ""
  log "## layerfs (candidate backend)"
  log ""
  log "- LayerFS checkout: \`$LAYERFS_CHECKOUT\` @ ${LF_COMMIT:-?} (v1.1.0, source-available)"
  log "- toolchain: $LF_TOOLCHAIN (checkout-pinned +1.85.1), build: CARGO_BUILD_JOBS=2, offline+locked, crate \`layerfs-node\`"
  log "- LayerFS build ok/failed: **build $LF_BUILD** in ${LF_BUILD_MS} ms${LF_NOTE:+ — $LF_NOTE}"
  [ -n "${LF_ARTIFACT:-}" ] && log "- artifact: \`api/binding/layerfs.node\` ($LF_ARTIFACT bytes)"
  log ""
  log "| axis | p50 | p95 | disk |"
  log "| --- | --- | --- | --- |"
  log "| layerfs workspace setup: sandbox create + mount (ms) | $LF_SETUP_P50 | $LF_SETUP_P95 | $LF_DISK |"
  log "| layerfs teardown: unmount + sandbox close (ms) | $LF_TEARDOWN | — | — |"
  log ""
  log "- runtime state: $LF_RUNTIME${LF_RUNTIME_NOTE:+ — $LF_RUNTIME_NOTE}"
  log "- Store profile: Disposable (checkout default; no crash durability — acceptable for ephemeral agent workspaces, owner documents residual risk in the pilot report)."
  log ""
  log "## Correctness probe"
  log ""
  log "Per iteration, both sides: write a marker file into the fresh workspace, then \`diff -rq --no-dereference\` workspace vs source tree excluding VCS metadata (\`.git\`); the only allowed difference is the marker plus source-side untracked/ignored paths. git side additionally asserts the workspace's \`.git\` is the gitfile pointer (a polluted worktree fails the probe)."
  log ""
  log "## Cleanup"
  log ""
  log "\`bash scripts/bench-worktree-backend.sh --cleanup-only\` prunes bench worktrees (\`git worktree prune\` + remove) and deletes \`$SCRATCH_ROOT\`."
} > "$RESULTS"

log "results → $RESULTS"
[ -n "$GIT_ABORT" ] && log "NOTE: git side aborted early — ABORTED recorded in results"
exit 0
