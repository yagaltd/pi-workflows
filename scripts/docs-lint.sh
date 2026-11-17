#!/usr/bin/env bash
# docs-lint.sh — lint the repository's human-facing Markdown.
#
# Three independent tools over the same doc_paths; a tool that is not
# installed is skipped with a warning, never a failure:
#   * markdownlint-cli2 — Markdown structure/style
#   * lychee            — link checker
#   * harper-cli        — English prose. Noisy on project vocabulary
#     (@role, pi, worktree, …), so it can be downgraded to advisory by
#     setting DOCS_LINT_HARPER_ADVISORY=1: a budget breach is printed but
#     does not fail the run.
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
#   * 6. gen-docs — the README commands table between the
#     `<!-- generated:commands:start/end -->` markers must match
#     regeneration from prompts/*.md frontmatter (`scripts/gen-docs.mjs
#     --check`). Drift ⇒ failure.
#   * 7. check-tree — placement manifest scan (`scripts/check-tree.mjs`):
#     files outside the .workflows/tree.json manifest are reported at WARN
#     tier; this gate never fails the run on its own.
#
# Env:
#   DRIFT_SCAN_DIR     override the drift-section scan root (fixtures). With
#                      it set, only the drift sections run — they scan every
#                      *.md under the root and the tool sections are skipped,
#                      so fixture outcomes do not depend on installed tools.
#   DRIFT_CLAIM_SCOPE  space-separated path prefixes narrowing the claim scan
#                      (e.g. "docs/canon.md").
#   DOCS_LINT_ANTI_BOT_HOSTS
#                      space/comma-separated anti-bot host list for the
#                      lychee section (default: www.npmjs.com). Override it
#                      only to probe the rule against an observable host.
#
# Anti-bot 403 is never debt. Some hosts reject non-browser clients, so a
# 403 from one of them is not evidence of a broken link. A lychee entry is
# dropped — and the drop printed as
# `note:  lychee: dropped anti-bot 403 — <host> <url>` — when BOTH hold:
#   * its host is on the anti-bot list: www.npmjs.com
#   * its status code is exactly 403.
# Everything else still counts: a 404, a 5xx, a timeout, or any non-403
# response from a listed host is a finding. The URL stays in the docs — it is
# legitimate for humans — and is never excluded from lychee; the rule judges
# each response, not the link. This is a rule, not a retry: the npmjs 403 was
# measured 0/1/0 across three consecutive runs and is sticky within a run,
# so a second attempt cannot make a run reproducible (after the rule landed
# it fired in 5/5 runs). A budget breach prints every counted link as
# `<file>: <url> — <status>`, so the failure names the link and not only the
# file.
#
# Runs from anywhere; operates on the repo it lives in. No tool configs
# (markdownlint/lychee configs may come later) — tools run on defaults.
#
# Outcome accounting: every section records exactly one outcome in the
# summary — ran / advisory / failed / skipped — so no section can disappear
# from the report:
#   ran       executed, findings at or below the committed budget
#   advisory  executed, above budget but downgraded to advisory (harper only)
#   failed    executed, findings above budget; or the tool could not run --
#             then the section is listed as `<tool> unusable`
#   skipped   not executed (tool or helper script genuinely absent)
# A section that ran and found something is never summarised as a pass.
#
# Ratchet, not absolute zero. The debt below is committed as per-file
# budgets in scripts/docs-lint-baseline.json; a tool section fails only when
# a file is missing from the budget (new) or its count exceeds the recorded
# one. The residual total per section is printed on every run, so the debt
# stays visible and countable. Regenerate the budget after a deliberate
# change with `--write-baseline`: sections in a fixed order, files sorted,
# so an unchanged tree reproduces the same bytes. Never hand-edit the budget
# to make a run pass.
#
# A tool that is on PATH but cannot execute (a mise shim without a pinned
# version prints `mise ERROR No version is set for shim` and exits non-zero)
# is `failed: <tool> unusable` with the tool's own error -- never findings,
# never a skip: a broken toolchain must not read as documentation debt.
#
# Measured debt 2026-11-17 (plan 20261117-064 TASK 6, tools pinned in
# mise.toml; harper-cli measured with --format json). These numbers describe
# scripts/docs-lint-baseline.json, which is the source of truth:
#   markdownlint-cli2 1011 findings / 64 files (61 docs/architecture.md,
#     408 skills/, 258 agents/, 119 templates/, 102 prompts/, 52 README.md,
#     11 AGENTS.md)
#   lychee 2 errors, both README.md (lines 7 and 19, the same 404 URL,
#     github.com/mariozechner/pi-coding-agent). The reproducible number is 2:
#     an intermittent npmjs.com 403 (anti-bot rejection of the package link,
#     not a broken link) is dropped by the anti-bot rule instead of being
#     banked as a phantom finding.
#   harper-cli 1121 prose findings / 47 name buckets — overwhelmingly project
#     vocabulary (@role, pi, worktree, T4 …), the advisory-triage candidate.
#     harper-cli reports bare file names even when handed paths, so its
#     budget buckets by name (the `SKILL.md` entry is every SKILL.md summed);
#     markdownlint-cli2 and lychee keep exact per-path budgets.
# Every markdownlint finding sits in a path plan 20261117-064 may not touch
# (docs/architecture.md and the surfaces owned by other plans), which is why
# the gate ratchets instead of demanding zero. Paying the debt down is a
# separate plan.
#
# Usage: ./scripts/docs-lint.sh [--write-baseline]
#   (no flag)         lint; passes while no file exceeds its budget
#   --write-baseline  regenerate scripts/docs-lint-baseline.json from this tree
# Exit 0 = clean, or findings only from advisory Harper · non-zero = findings
#          above budget, an unusable tool, or a drift-section finding (drift
#          findings always fail, live repo or fixture)

set -uo pipefail
cd "$(dirname "$0")/.."

FAIL=0
SECTION_DIRTY=0
err()  { echo "DOCS-LINT: $1" >&2; FAIL=1; SECTION_DIRTY=1; }
warn() { echo "skip:  $1"; }
note() { echo "note:  $1"; }
ok()   { echo "ok:   $1"; }

# Human-facing Markdown surfaces. Directories are linted recursively; a
# path that does not exist in this repo is noted and skipped, not an error.
doc_paths=(README.md AGENTS.md docs agents skills prompts templates)

RAN=()
ADVISED=()
FAILED=()
SKIPPED=()

# Hosts that reject non-browser clients. A 403 from one of these is a bot
# rejection, not a broken link: the lychee section drops that entry and
# prints the drop. Exported so the ratchet helper and this script cannot
# disagree about the list.
export DOCS_LINT_ANTI_BOT_HOSTS="${DOCS_LINT_ANTI_BOT_HOSTS:-www.npmjs.com}"

# --- flags -----------------------------------------------------------------
WRITE_BASELINE=0
usage() {
  cat <<'EOF'
usage: bash scripts/docs-lint.sh [--write-baseline]

  (no flag)         lint; passes while no file exceeds its committed budget
  --write-baseline  regenerate scripts/docs-lint-baseline.json from this tree
EOF
}
while [ "$#" -gt 0 ]; do
  case "$1" in
    --write-baseline) WRITE_BASELINE=1 ;;
    -h|--help) usage; exit 0 ;;
    *) usage >&2; echo "DOCS-LINT: unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done
baseline_file=scripts/docs-lint-baseline.json

# Scratch space: per-section counts, tool output and the ratchet helper live
# here, never in the tree.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/counts" "$tmp/measured"
ratchet_js="$tmp/ratchet.mjs"

# The ratchet helper is generated here so scripts/docs-lint.sh stays the
# single source of truth (no second committed script), and it is rewritten
# on every run so it can never drift from this file.
cat > "$ratchet_js" <<'RATCHET'
// Ratchet helper for scripts/docs-lint.sh — generated at run time.
// Node builtins only: read tool output, compare against the committed
// per-file budget, regenerate it deterministically.
import fs from "node:fs";

const ORDER = ["markdownlint-cli2", "lychee", "harper-cli"];
const [cmd, ...args] = process.argv.slice(2);
const byKey = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

// "<file>\t<count>" lines → Map. Written by both fromJson and the shell.
function readCounts(file) {
  const counts = new Map();
  if (!file || !fs.existsSync(file)) return counts;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    const tab = line.lastIndexOf("\t");
    if (tab < 0) continue;
    const n = Number(line.slice(tab + 1));
    if (!Number.isInteger(n) || n <= 0) continue;
    counts.set(line.slice(0, tab), n);
  }
  return counts;
}

function sum(counts) {
  let total = 0;
  for (const n of counts.values()) total += n;
  return total;
}

// Hosts on the anti-bot list: a 403 from one of them is a bot rejection, not
// a broken link. Set by scripts/docs-lint.sh (DOCS_LINT_ANTI_BOT_HOSTS) so
// the list has exactly one definition.
const ANTI_BOT_HOSTS = new Set(
  String(process.env.DOCS_LINT_ANTI_BOT_HOSTS ?? "")
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean)
);

// Host of a URL, without scheme, credentials, path or port:
// "https://www.npmjs.com/package/x" → "www.npmjs.com". A URL that does not
// parse yields "" and can never match the anti-bot list.
function hostOf(url) {
  if (typeof url !== "string") return "";
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i.exec(url);
  if (!m) return "";
  return m[1].replace(/^.*@/, "").replace(/:\d+$/, "").toLowerCase();
}

// from-json <tool> <out> <json>...: tool JSON → "<file>\t<count>" lines.
// Harper is bucketed by file name: harper-cli reports bare names even when
// given paths, so several files can share one key and their counts sum.
// Lychee entries are counted one by one, except an entry whose host is on
// the anti-bot list AND whose status is exactly 403: that one is dropped and
// reported on stdout as "<host> <url>" so the shell can print it. Every
// other entry — 404, 5xx, timeout, non-403 from a listed host — counts, and
// is written to `<out>.findings` as "<file>\t<url>\t<status>" so a breach
// can name the link, not just the file.
function fromJson(tool, out, inputs) {
  const attempts = [];
  const drops = [];
  const detail = [];
  for (const input of inputs) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(input, "utf8"));
    } catch {
      return 3; // unusable: the tool printed no parseable JSON
    }
    const perFile = new Map();
    if (tool === "harper") {
      if (!Array.isArray(data)) return 3;
      for (const entry of data) {
        const file = entry?.file;
        const n = entry?.lint_count;
        if (typeof file !== "string" || !Number.isInteger(n) || n <= 0) continue;
        perFile.set(file, (perFile.get(file) ?? 0) + n);
      }
    } else if (tool === "lychee") {
      const map = data?.error_map;
      if (!map || typeof map !== "object") return 3;
      for (const [file, errors] of Object.entries(map)) {
        let n = 0;
        for (const error of Array.isArray(errors) ? errors : []) {
          const host = hostOf(error?.url);
          if (error?.status?.code === 403 && host && ANTI_BOT_HOSTS.has(host)) {
            drops.push(`${host} ${error.url}`);
            continue;
          }
          n++;
          const status = error?.status?.text ?? String(error?.status?.code ?? "error");
          detail.push(`${file}\t${error?.url ?? ""}\t${status}`.replace(/[\r\n]+/g, " "));
        }
        if (n > 0) perFile.set(file, n);
      }
    } else {
      return 2;
    }
    attempts.push(perFile);
  }
  const keys = new Set(attempts.flatMap((perFile) => [...perFile.keys()]));
  const counts = new Map();
  for (const key of keys) {
    const n = attempts.reduce((acc, perFile) => acc + (perFile.get(key) ?? 0), 0);
    if (n > 0) counts.set(key, n);
  }
  const body = [...counts.entries()].sort(byKey).map(([file, n]) => `${file}\t${n}`).join("\n");
  fs.writeFileSync(out, body ? body + "\n" : "");
  if (tool === "lychee") {
    fs.writeFileSync(`${out}.findings`, detail.length ? detail.join("\n") + "\n" : "");
  }
  for (const drop of drops) process.stdout.write(drop + "\n");
  return 0;
}

// compare <section> <counts> <budget> [unit]: stdout = the residual line,
// stderr = one line per file above budget. Exit 1 on any breach.
function compare(section, countsFile, budgetFile, unit = "file") {
  let budget;
  try {
    budget = JSON.parse(fs.readFileSync(budgetFile, "utf8"));
  } catch {
    process.stderr.write(
      `cannot read the finding budget at ${budgetFile} — regenerate it: bash scripts/docs-lint.sh --write-baseline\n`
    );
    return 1;
  }
  const known = budget.sections?.[section]?.files ?? {};
  const counts = readCounts(countsFile);
  const breaches = [];
  for (const [file, n] of [...counts.entries()].sort(byKey)) {
    const allowed = known[file] ?? 0;
    if (n > allowed) {
      const why = Object.hasOwn(known, file) ? "increased" : "new file";
      breaches.push(`${file}: ${n} finding(s), budget ${allowed} — ${why}`);
    }
  }
  process.stdout.write(
    `residual ${sum(counts)} finding(s) in ${counts.size} ${unit}(s), budget ${budget.sections?.[section]?.total ?? 0}\n`
  );
  for (const breach of breaches) process.stderr.write(breach + "\n");
  return breaches.length > 0 ? 1 : 0;
}

// write <baseline> <section>=<counts>...: regenerate the budget. A section
// with no measurement keeps its committed entry — a skipped or unusable tool
// must never erase a budget.
function write(budgetFile, pairs) {
  let prev = { sections: {} };
  if (fs.existsSync(budgetFile)) {
    try {
      prev = JSON.parse(fs.readFileSync(budgetFile, "utf8"));
    } catch {
      prev = { sections: {} };
    }
  }
  const measured = new Map(
    pairs.map((pair) => [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)])
  );
  const sections = {};
  for (const section of ORDER) {
    const countsFile = measured.get(section);
    if (!countsFile) {
      sections[section] = prev.sections?.[section] ?? { total: 0, files: {} };
      continue;
    }
    const counts = readCounts(countsFile);
    const files = {};
    for (const [file, n] of [...counts.entries()].sort(byKey)) files[file] = n;
    sections[section] = { total: sum(counts), files };
  }
  const doc = {
    note: "Finding budget for scripts/docs-lint.sh (a ratchet, not absolute zero). Regenerate with `bash scripts/docs-lint.sh --write-baseline`; never hand-edit. A file absent here has budget 0 and a count above its budget fails the gate.",
    generated_by: "bash scripts/docs-lint.sh --write-baseline",
    sections,
  };
  fs.writeFileSync(budgetFile, JSON.stringify(doc, null, 2) + "\n");
  // Loudly report what moved, so banking new debt is a visible decision and
  // not a side effect of forgetting to read the diff.
  for (const section of ORDER) {
    const before = prev.sections?.[section]?.total ?? 0;
    const after = sections[section].total;
    if (before !== after) process.stdout.write(`budget: ${section}: ${before} -> ${after}\n`);
  }
  return 0;
}

let rc = 2;
if (cmd === "from-json") rc = fromJson(args[0], args[1], args.slice(2));
else if (cmd === "compare") rc = compare(...args);
else if (cmd === "write") rc = write(args[0], args.slice(1));
process.exit(rc);
RATCHET

# A section is bracketed by begin_section/end_section: err() marks the
# section dirty, so a section that produced findings lands in FAILED and
# never prints as a clean run. The flag is per section on purpose — a
# global counter would hide the second failing section behind the first.
begin_section() { SECTION_DIRTY=0; }
# end_section <name> [advisory]
end_section() {
  local name=$1 kind=${2:-}
  if [ "$kind" = "advisory" ]; then
    ADVISED+=("$name")
  elif [ "$SECTION_DIRTY" -ne 0 ]; then
    FAILED+=("$name")
  else
    RAN+=("$name")
  fi
}

print_outcomes() {
  local label=$1 joined="" n
  shift
  if [ "$#" -eq 0 ]; then printf '%-10s (none)\n' "$label"; return; fi
  for n in "$@"; do joined="${joined:+$joined, }$n"; done
  printf '%-10s %s\n' "$label" "$joined"
}

# A tool that is on PATH but cannot run is a failure, never a finding and
# never a skip: the shim's own error is printed, the section lands in the
# summary as `<tool> unusable`, and nothing is parsed out of the noise.
unusable() { # <tool> <tool-output>
  local tool=$1 out=$2 first
  first=$(printf '%s\n' "$out" | grep -v '^[[:space:]]*$' | head -1)
  printf '%s\n' "$out" >&2
  FAIL=1
  FAILED+=("$tool unusable")
  echo "failed: $tool unusable — ${first:-(no output)}"
}

# ratchet_compare <section> <counts-file>
#
# Compares one section's per-file counts against the committed budget; sets
# RATCHET_RESIDUAL (the line printed either way) and RATCHET_VIOL (one line
# per file above budget). In --write-baseline mode it records instead of
# comparing. Returns 0 when the section is at or below budget.
ratchet_compare() {
  local section=$1 counts=$2 unit=${3:-file}
  RATCHET_VIOL="$tmp/violations.$section"
  : > "$RATCHET_VIOL"
  RATCHET_RESIDUAL=$(awk -F'\t' '{ total += $2 } END { printf "residual %d finding(s) in %d %s(s)", total + 0, NR, unit }' unit="$unit" "$counts")
  if [ "$WRITE_BASELINE" -eq 1 ]; then
    cp "$counts" "$tmp/counts/$section"
    RATCHET_RESIDUAL="$RATCHET_RESIDUAL (recording)"
    return 0
  fi
  if [ ! -f "$baseline_file" ]; then
    echo "no baseline at $baseline_file — run: bash scripts/docs-lint.sh --write-baseline" > "$RATCHET_VIOL"
    return 1
  fi
  RATCHET_RESIDUAL=$(node "$ratchet_js" compare "$section" "$counts" "$baseline_file" "$unit" 2> "$RATCHET_VIOL")
}

paths=()
for p in "${doc_paths[@]}"; do
  if [ -e "$p" ]; then
    paths+=("$p")
  else
    note "$p does not exist in this repo — not linted"
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
    warn "markdownlint-cli2 not installed — structure lint skipped (run mise install to enable)"
    return
  fi
  # Probe before the real run, so a launcher that cannot execute is reported
  # as unusable instead of having its error text parsed as findings.
  # `--version` is not usable as the probe here: markdownlint-cli2 reads it
  # as a glob and exits 2, so a clean one-line file is the probe.
  local probe probe_file="$tmp/probe.md"
  printf '# Probe\n\nA clean probe file for the tool-usable check.\n' > "$probe_file"
  if ! probe=$(markdownlint-cli2 "$probe_file" 2>&1); then
    unusable markdownlint-cli2 "$probe"
    return
  fi
  local out rc counts="$tmp/measured/markdownlint-cli2"
  out=$(markdownlint-cli2 "${md_files[@]}" 2>&1); rc=$?
  # Finding lines are "<file>:<line>[:<col>] error|warning MD<nnn> …"; the
  # path is everything before the trailing line (and optional column) number.
  printf '%s\n' "$out" \
    | sed -nE 's/^(.*) (error|warning) MD[0-9]{3}[^0-9].*$/\1/p' \
    | sed -E 's/:[0-9]+$//; s/:[0-9]+$//' \
    | LC_ALL=C sort | uniq -c | sed -E 's/^ *([0-9]+) (.*)$/\2\t\1/' > "$counts"
  # A non-zero exit with nothing parseable is a broken tool, not a clean run.
  if [ "$rc" -ne 0 ] && [ ! -s "$counts" ]; then
    unusable markdownlint-cli2 "$out"
    return
  fi
  begin_section
  if ratchet_compare markdownlint-cli2 "$counts"; then
    ok "markdownlint-cli2: $RATCHET_RESIDUAL"
  else
    note "markdownlint-cli2: $RATCHET_RESIDUAL"
    sed 's/^/  /' "$RATCHET_VIOL" >&2
    err "markdownlint-cli2: $(wc -l < "$RATCHET_VIOL" | tr -d ' ') file(s) above the budget — fix them, or justify the new debt in the report"
  fi
  end_section markdownlint-cli2
}

run_lychee() {
  echo "== 2. lychee — link checker =="
  if ! command -v lychee >/dev/null 2>&1; then
    SKIPPED+=("lychee")
    warn "lychee not installed — link check skipped (run mise install to enable)"
    return
  fi
  local probe
  if ! probe=$(lychee --version 2>&1); then
    unusable lychee "$probe"
    return
  fi
  local counts="$tmp/measured/lychee" json="$tmp/lychee.json" rc drops line f url status
  # One attempt. Flaky-rejection retries were removed: the anti-bot rule
  # above decides what a 403 means, so a second request would only add
  # nondeterminism (the npmjs 403 was measured 0/1/0 across three runs).
  lychee --format json "${md_files[@]}" > "$json" 2> "$tmp/lychee.err"; rc=$?
  if ! drops=$(node "$ratchet_js" from-json lychee "$counts" "$json" 2> "$tmp/lychee.parse.err"); then
    unusable lychee "$(cat "$tmp/lychee.err" "$tmp/lychee.parse.err")"
    return
  fi
  # A non-zero exit with nothing counted and nothing dropped is a tool that
  # produced no usable report, not a clean tree.
  if [ "$rc" -ne 0 ] && [ ! -s "$counts" ] && [ -z "$drops" ]; then
    unusable lychee "$(cat "$tmp/lychee.err")"
    return
  fi
  # Anti-bot drops are printed, never silent: one line per dropped entry.
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    note "lychee: dropped anti-bot 403 — $line"
  done <<< "$drops"
  begin_section
  if ratchet_compare lychee "$counts"; then
    ok "lychee: $RATCHET_RESIDUAL"
  else
    note "lychee: $RATCHET_RESIDUAL"
    sed 's/^/  /' "$RATCHET_VIOL" >&2
    # Name the links, not just the files: a breach must say which URL broke
    # the budget (dropped anti-bot entries are already reported above).
    if [ -s "$counts.findings" ]; then
      while IFS=$'\t' read -r f url status; do
        [ -n "$f" ] || continue
        grep -qF "$f:" "$RATCHET_VIOL" || continue
        printf '  %s: %s — %s\n' "$f" "$url" "$status" >&2
      done < "$counts.findings"
    fi
    if [ -s "$tmp/lychee.err" ]; then sed 's/^/  /' "$tmp/lychee.err" >&2; fi
    err "lychee: $(wc -l < "$RATCHET_VIOL" | tr -d ' ') file(s) above the budget — fix the links, or justify the new debt in the report"
  fi
  end_section lychee
}

run_harper() {
  echo "== 3. harper-cli — English prose =="
  if ! command -v harper-cli >/dev/null 2>&1; then
    SKIPPED+=("harper-cli")
    warn "harper-cli not installed — prose lint skipped (run mise install to enable)"
    return
  fi
  local probe
  if ! probe=$(harper-cli --version 2>&1); then
    unusable harper-cli "$probe"
    return
  fi
  local advisory=0 counts="$tmp/measured/harper-cli"
  if [ "${DOCS_LINT_HARPER_ADVISORY:-}" = "1" ]; then
    advisory=1
  fi
  # --quiet keeps harper's informational notes off stdout; --format json gives
  # the per-file lint_count the ratchet compares.
  harper-cli lint --format json --quiet "${md_files[@]}" > "$tmp/harper.json" 2> "$tmp/harper.err"
  if ! node "$ratchet_js" from-json harper "$counts" "$tmp/harper.json"; then
    unusable harper-cli "$(cat "$tmp/harper.err")"
    return
  fi
  begin_section
  if ratchet_compare harper-cli "$counts" "name bucket"; then
    ok "harper-cli: $RATCHET_RESIDUAL"
    end_section harper-cli
  elif [ "$advisory" = "1" ]; then
    note "harper-cli: $RATCHET_RESIDUAL"
    sed 's/^/  /' "$RATCHET_VIOL" >&2
    warn "harper-cli: $(wc -l < "$RATCHET_VIOL" | tr -d ' ') file(s) above the budget — advisory (DOCS_LINT_HARPER_ADVISORY=1), not failing"
    end_section harper-cli advisory
  else
    note "harper-cli: $RATCHET_RESIDUAL"
    sed 's/^/  /' "$RATCHET_VIOL" >&2
    err "harper-cli: $(wc -l < "$RATCHET_VIOL" | tr -d ' ') file(s) above the budget — fix the prose, or set DOCS_LINT_HARPER_ADVISORY=1 to downgrade"
    end_section harper-cli
  fi
}

run_stamps() {
  echo "== 4. doc stamps — generated_by ⇒ generated_at + stale_after =="
  if [ "${#drift_stamp_files[@]}" -eq 0 ]; then
    SKIPPED+=("doc-stamps")
    warn "no files to scan for stamps"
    return
  fi
  begin_section
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
  end_section doc-stamps
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
  begin_section
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
  end_section claim-to-gate
}

run_gen_docs() {
  echo "== 6. gen-docs — README commands table matches prompts frontmatter =="
  if [ ! -f scripts/gen-docs.mjs ]; then
    SKIPPED+=("gen-docs")
    warn "scripts/gen-docs.mjs missing — commands-table check skipped"
    return
  fi
  begin_section
  local out
  if out=$(node scripts/gen-docs.mjs --check 2>&1); then
    ok "gen-docs: commands table in sync with prompts/*.md"
  else
    printf '%s\n' "$out" >&2
    err "gen-docs: README commands section drifted (run node scripts/gen-docs.mjs)"
  fi
  end_section gen-docs
}

run_check_tree() {
  echo "== 7. check-tree — placement manifest scan (WARN tier) =="
  if [ ! -f scripts/check-tree.mjs ]; then
    SKIPPED+=("check-tree")
    warn "scripts/check-tree.mjs missing — placement check skipped"
    return
  fi
  begin_section
  # WARN tier by design: findings are reported, never fail the run.
  node scripts/check-tree.mjs || true
  end_section check-tree
}

if [ -n "$drift_root" ]; then
  # Fixture mode: only the drift sections run, on the fixture root, so
  # fixture outcomes do not depend on installed tools or live doc state.
  warn "DRIFT_SCAN_DIR=$drift_root set — tool sections skipped (fixture mode: drift sections only)"
  SKIPPED+=("markdownlint-cli2")
  SKIPPED+=("lychee")
  SKIPPED+=("harper-cli")
  run_stamps
  run_claims
elif [ "${#md_files[@]}" -eq 0 ]; then
  warn "no Markdown files under doc_paths — nothing to lint"
  SKIPPED+=("all sections (no Markdown files under doc_paths)")
else
  run_markdownlint
  run_lychee
  run_harper
  run_stamps
  run_claims
  run_gen_docs
  run_check_tree
fi

# --write-baseline: assemble the committed budget from what this run
# measured. A section that did not run (skipped or unusable) keeps its
# committed entry — an absent tool must never erase a budget.
if [ "$WRITE_BASELINE" -eq 1 ]; then
  measured=()
  for section in markdownlint-cli2 lychee harper-cli; do
    if [ -f "$tmp/counts/$section" ]; then
      measured+=("$section=$tmp/counts/$section")
    else
      warn "$section was not measured — its committed budget is kept unchanged"
    fi
  done
  if ! node "$ratchet_js" write "$baseline_file" ${measured[@]+"${measured[@]}"}; then
    FAIL=1
    echo "DOCS-LINT: failed: could not write $baseline_file" >&2
  fi
fi

echo
echo "== summary =="
print_outcomes "ran:" ${RAN[@]+"${RAN[@]}"}
print_outcomes "advisory:" ${ADVISED[@]+"${ADVISED[@]}"}
print_outcomes "failed:" ${FAILED[@]+"${FAILED[@]}"}
print_outcomes "skipped:" ${SKIPPED[@]+"${SKIPPED[@]}"}
echo
if [ "$FAIL" -ne 0 ]; then
  echo "DOCS-LINT FAILED — fix the findings above; do not silence this check." >&2
elif [ "$WRITE_BASELINE" -eq 1 ]; then
  echo "BASELINE WRITTEN — $baseline_file regenerated from this tree (a zero diff means the tree already matched its budget)."
elif [ "${#RAN[@]}" -eq 0 ] && [ "${#ADVISED[@]}" -eq 0 ]; then
  echo "CLEAN — but no section ran; read the skipped line above." >&2
elif [ "${#SKIPPED[@]}" -gt 0 ]; then
  echo "CLEAN — docs lint passed, with ${#SKIPPED[@]} section(s) not run (see skipped above)."
else
  echo "CLEAN — docs lint passed."
fi
exit "$FAIL"
