#!/usr/bin/env bash
# profile-lint — validate a project profile (.workflows/profile.json) against
# the profile schema (plan 20261026-041: D1 schema, D2 lint). The profile is
# machine truth for init/consumers: commands, pointers, tree domains, gates,
# scaffolds, meta stamps. Fictional paths are a bug — the lint bites.
#
# Usage: bash scripts/profile-lint.sh <path/to/profile.json>
#
# Checks — one "FAIL: <reason>" line per violation, exit 0 clean / 1 on any FAIL:
#   a) schema: commands.test + commands.lint required (build optional, no other
#      keys); pointers >= 1 (each a repo path); tree >= 1 domain (name -> path);
#      gates >= 1 (each a path under scripts/); scaffolds an object (may be
#      empty) whose scaffolds.kinds entries each carry an existing template
#      and a target containing {{name}}; meta.generated_by/-generated_at/
#      -stale_after present, the dates ISO (YYYY-MM-DD)
#   b) existence: every pointers.* and tree.*.path exists on disk (test -e),
#      resolved from the repo root (nearest ancestor of the profile containing
#      .git; else the invoking cwd's toplevel; else the profile's dir). A linked
#      worktree adds the main checkout as a fallback root so gitignored targets
#      (e.g. .workflows/decisions/INDEX.md) resolve where they exist.
#   c) commands: the first word of every commands.* must resolve (command -v)
#   d) gates: each entry exists as a file under scripts/
#   e) stamps: stale_after >= generated_at, at most 35 days after it, and not
#      already past (a profile stale today fails the lint)
#   f) metrics (optional block): crap_max a number >= 1, duplication_max a
#      number with 0 < value <= 1, paths a non-empty list of existing repo
#      paths; an absent metrics block stays legal (consumers apply defaults)
set -u

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "FAIL: usage: profile-lint.sh <profile-json-file>"
  exit 1
fi
if [ ! -f "$FILE" ]; then
  echo "FAIL: file not found: $FILE"
  exit 1
fi

# Repo root for path resolution (see header comment) — same walk as agents-lint.
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
# Worktree fallback: a linked worktree's .git is a file pointing into the main
# checkout's .git dir — the main root is the parent of git-common-dir.
main=""
if [ -f "$root/.git" ]; then
  common="$(git -C "$root" rev-parse --git-common-dir 2>/dev/null || true)"
  case "$common" in
  /*) m="$common" ;;
  [a-zA-Z0-9]*) m="$root/$common" ;;
  *) m="" ;;
  esac
  if [ -n "$m" ]; then
    m="$(cd "$m/.." 2>/dev/null && pwd)" || m=""
    [ -n "$m" ] && [ "$m" != "$root" ] && main="$m"
  fi
fi

exec python3 - "$FILE" "$root" "$main" <<'PY'
import json
import os
import shutil
import sys
from datetime import date, timedelta

file, root, main = sys.argv[1], sys.argv[2], sys.argv[3]
fails = 0


def fail(msg):
    global fails
    print(f"FAIL: {msg}")
    fails += 1


def on_disk(rel):
    """test -e against the walk-up root, then the worktree's main checkout."""
    return os.path.exists(os.path.join(root, rel)) or (
        bool(main) and os.path.exists(os.path.join(main, rel))
    )


try:
    with open(file, encoding="utf-8") as f:
        profile = json.load(f)
except (OSError, ValueError) as e:
    fail(f"profile is not readable JSON: {e}")
    sys.exit(1)
if not isinstance(profile, dict):
    fail("profile top level is not a JSON object")
    sys.exit(1)

# (a) + (c) commands — test/lint required, build optional; first word resolves
commands = profile.get("commands")
if not isinstance(commands, dict):
    fail("commands missing (expected an object with test + lint)")
    commands = {}
for key in sorted(commands):
    cmd = commands[key]
    if not isinstance(cmd, str) or not cmd.strip():
        fail(f"commands.{key} must be a non-empty string")
        continue
    if key not in ("test", "lint", "build"):
        fail(f"commands.{key}: unexpected key (allowed: test, lint, build)")
    first = cmd.strip().split()[0]
    if shutil.which(first) is None:
        fail(f"commands.{key}: first word does not resolve (command -v): {first}")
for key in ("test", "lint"):
    if key not in commands:
        fail(f"commands.{key} missing (required)")

# (a) + (b) pointers — >= 1, each an existing repo path
pointers = profile.get("pointers")
if not isinstance(pointers, dict) or len(pointers) < 1:
    fail("pointers missing or empty (need >= 1 repo path)")
    pointers = {}
for name in sorted(pointers):
    target = pointers[name]
    if not isinstance(target, str) or not target.strip():
        fail(f"pointers.{name} must be a non-empty repo path")
        continue
    if not on_disk(target):
        fail(f"pointers.{name}: pointer target does not exist: {target}")

# (a) + (b) tree — >= 1 domain (name -> existing repo path)
tree = profile.get("tree")
if not isinstance(tree, dict) or len(tree) < 1:
    fail("tree missing or empty (need >= 1 domain: name -> path)")
    tree = {}
for name in sorted(tree):
    path = tree[name]
    if not isinstance(path, str) or not path.strip():
        fail(f"tree.{name} must be a non-empty repo path")
        continue
    if not on_disk(path):
        fail(f"tree.{name}: domain path does not exist: {path}")

# (a) + (d) gates — >= 1, each an existing file under scripts/
gates = profile.get("gates")
if not isinstance(gates, list) or len(gates) < 1:
    fail("gates missing or empty (need >= 1 script path)")
    gates = []
for i, gate in enumerate(gates):
    if not isinstance(gate, str) or not gate.strip():
        fail(f"gates[{i}] must be a non-empty script path")
        continue
    if not gate.startswith("scripts/"):
        fail(f"gates[{i}]: gate not under scripts/: {gate}")
        continue
    if not os.path.isfile(os.path.join(root, gate)) and not (
        main and os.path.isfile(os.path.join(main, gate))
    ):
        fail(f"gates[{i}]: gate script does not exist: {gate}")

# (a) + (b) scaffolds — an object, may be empty; every kind entry must carry
# an existing template and a target containing {{name}}
scaffolds = profile.get("scaffolds")
if not isinstance(scaffolds, dict):
    fail('scaffolds missing or not an object (may be empty, e.g. {"kinds":{}})')
    scaffolds = {}
kinds = scaffolds.get("kinds")
if not isinstance(kinds, dict):
    fail("scaffolds.kinds missing or not an object (may be empty)")
    kinds = {}
for kname in sorted(kinds):
    kspec = kinds[kname]
    if not isinstance(kspec, dict):
        fail(f"scaffolds.kinds.{kname} must be an object (template + target)")
        continue
    template = kspec.get("template")
    target = kspec.get("target")
    if not isinstance(template, str) or not template.strip():
        fail(f"scaffolds.kinds.{kname}.template must be a non-empty repo path")
    elif not on_disk(template):
        fail(f"scaffolds.kinds.{kname}.template: template does not exist: {template}")
    if not isinstance(target, str) or not target.strip():
        fail(f"scaffolds.kinds.{kname}.target must be a non-empty repo path")
    elif "{{name}}" not in target:
        fail(f"scaffolds.kinds.{kname}.target: target must contain {{{{name}}}}: {target}")

# (a)+(b)+(f) metrics — optional; when present, numbers in range, paths exist
metrics = profile.get("metrics")
if "metrics" in profile and not isinstance(metrics, dict):
    fail("metrics must be an object when present (crap_max, duplication_max, paths)")
    metrics = {}
if isinstance(metrics, dict):
    crap = metrics.get("crap_max")
    if crap is not None and (
        isinstance(crap, bool) or not isinstance(crap, (int, float)) or crap < 1
    ):
        fail(f"metrics.crap_max must be a number >= 1 (got {crap!r})")
    dup = metrics.get("duplication_max")
    if dup is not None and (
        isinstance(dup, bool)
        or not isinstance(dup, (int, float))
        or not 0 < dup <= 1
    ):
        fail(f"metrics.duplication_max must be a number with 0 < value <= 1 (got {dup!r})")
    mpaths = metrics.get("paths")
    if mpaths is not None:
        if not isinstance(mpaths, list) or not mpaths or not all(
            isinstance(x, str) and x.strip() for x in mpaths
        ):
            fail("metrics.paths must be a non-empty list of repo paths")
        else:
            for rel in mpaths:
                if not on_disk(rel):
                    fail(f"metrics.paths: path does not exist: {rel}")

# (a) + (e) meta stamps — generated_by + ISO dates within budget, not stale
meta = profile.get("meta")
if not isinstance(meta, dict):
    fail("meta missing (need generated_by, generated_at, stale_after)")
    meta = {}
if not isinstance(meta.get("generated_by"), str) or not meta.get("generated_by", "").strip():
    fail("meta.generated_by missing or empty")


def stamp(key):
    val = meta.get(key)
    if not isinstance(val, str):
        fail(f"meta.{key} missing or not an ISO date")
        return None
    try:
        return date.fromisoformat(val)
    except ValueError:
        fail(f"meta.{key}: not an ISO date (YYYY-MM-DD): {val}")
        return None


generated = stamp("generated_at")
stale = stamp("stale_after")
if generated and stale:
    if stale < generated:
        fail(f"meta.stale_after {stale} is before meta.generated_at {generated}")
    elif stale > generated + timedelta(days=35):
        fail(f"meta.stale_after {stale} exceeds the 35-day stamp budget after {generated}")
    if stale < date.today():
        fail(f"meta.stale_after {stale} is already past (profile is stale today, {date.today()})")

sys.exit(1 if fails else 0)
PY
