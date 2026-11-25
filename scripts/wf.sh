#!/usr/bin/env bash
# wf.sh — the single shell entry point for pi-workflows scripts.
# Resolves the package root from THIS file, never from the caller's cwd, so a
# caller can invoke it from any repo with an absolute path. Args are forwarded
# verbatim; all logic stays in the existing node/bun/shell scripts.
set -u

usage() {
  cat >&2 <<'EOF'
usage: bash scripts/wf.sh <subcommand> [args...]
subcommands:
  judge            scripts/judge.mjs
  judge-context    scripts/check-judge-context.mjs
  lessons          scripts/lessons.mjs
  bench            scripts/bench-intake-triage.ts
  archive-check    scripts/check-archive.sh
  proof-ledger     scripts/proof-ledger.mjs
  eval-golden      scripts/eval-golden.mjs
  pii-scan         scripts/pii-scan.mjs
  evasion-scan     scripts/evasion-scan.ts
  closeout         scripts/closeout.mjs
  format-chooser   scripts/format-chooser.mjs
  decisions        scripts/decisions.mjs
  spec-selectors   scripts/check-spec-selectors.sh
  intent-guard     scripts/intent-guard.mjs
  flow-run         scripts/flow-run.mjs
  agents-lint      scripts/agents-lint.sh
  init-extract     scripts/init-extract.ts
  profile-lint     scripts/profile-lint.sh
  resume-digest    scripts/resume-digest.sh
  wip              scripts/wip.mjs
  output-policy    scripts/output-policy-cli.mjs
  open-diagram-render scripts/open-diagram-render.mjs
EOF
}

if [ "$#" -lt 1 ]; then usage; exit 2; fi
cmd="$1"
shift

src="${BASH_SOURCE[0]}"
dir="$(cd -P -- "$(dirname -- "$src")" && pwd)" || exit 2
root="$(cd -P -- "$dir/.." && pwd)" || exit 2

case "$cmd" in
  judge)          exec node    "$root/scripts/judge.mjs"              "$@" ;;
  judge-context)  exec node    "$root/scripts/check-judge-context.mjs" "$@" ;;
  lessons)        exec node    "$root/scripts/lessons.mjs"            "$@" ;;
  bench)          exec bun     "$root/scripts/bench-intake-triage.ts" "$@" ;;
  archive-check)  exec bash    "$root/scripts/check-archive.sh"       "$@" ;;
  proof-ledger)   exec node    "$root/scripts/proof-ledger.mjs"       "$@" ;;
  eval-golden)    exec node    "$root/scripts/eval-golden.mjs"        "$@" ;;
  pii-scan)       exec node    "$root/scripts/pii-scan.mjs"           "$@" ;;
  evasion-scan)   exec bun     "$root/scripts/evasion-scan.ts"        "$@" ;;
  closeout)       exec node    "$root/scripts/closeout.mjs"           "$@" ;;
  format-chooser) exec node    "$root/scripts/format-chooser.mjs"     "$@" ;;
  decisions)      exec node    "$root/scripts/decisions.mjs"          "$@" ;;
  spec-selectors) exec bash    "$root/scripts/check-spec-selectors.sh" "$@" ;;
  intent-guard)   exec node    "$root/scripts/intent-guard.mjs"       "$@" ;;
  flow-run)       exec node    "$root/scripts/flow-run.mjs"           "$@" ;;
  agents-lint)    exec bash    "$root/scripts/agents-lint.sh"         "$@" ;;
  init-extract)   exec bun     "$root/scripts/init-extract.ts"        "$@" ;;
  profile-lint)   exec bash    "$root/scripts/profile-lint.sh"        "$@" ;;
  resume-digest)  exec bash    "$root/scripts/resume-digest.sh"       "$@" ;;
  wip)            exec node    "$root/scripts/wip.mjs"              "$@" ;;
  output-policy) exec node "$root/scripts/output-policy-cli.mjs" "$@" ;;
  open-diagram-render) exec node "$root/scripts/open-diagram-render.mjs" "$@" ;;
  *) usage; exit 2 ;;
esac
