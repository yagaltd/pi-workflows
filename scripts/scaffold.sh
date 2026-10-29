#!/usr/bin/env bash
# scaffold — create a file from a profile scaffold kind (.workflows/profile.json
# scaffolds.kinds, plan 20261026-043). The profile is machine truth: the kind
# names the template and the target pattern; the script only renders it.
#
# Usage: bash scripts/scaffold.sh <kind> <name>
#
# Target and template are rendered with:
#   {{name}}    the name, sanitized to [a-z0-9-] (else FAIL: invalid name)
#   {{date}}    ISO today
#   {{next:N}}  next free zero-padded(N) sequence: existing files in the
#               target's directory matching the pattern's literal prefix
#               through the sequence placeholder (DEC-001.md and
#               DEC-001-legacy.md both count), + 1
# A file for this name already existing (at any sequence) is a refusal:
#   FAIL: target exists: <path>, exit 1, no writes. Unknown kind:
#   FAIL: unknown kind: <k> (known: <list>). No hooks, no git ops; the created
#   path is printed.
#
# Root resolution: .git walk-up from this script's dir (profile-lint pattern);
# a linked worktree adds the main checkout as a fallback so {{next:N}} sees
# gitignored directories (e.g. .workflows/decisions/) that only exist there.
set -u

KIND="${1:-}"
NAME="${2:-}"
if [ -z "$KIND" ] || [ -z "$NAME" ]; then
  echo "FAIL: usage: scaffold.sh <kind> <name>"
  exit 1
fi

# Repo root for profile/template/target resolution — same walk as profile-lint.
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root=""
scan="$here"
while [ "$scan" != "/" ]; do
  if [ -e "$scan/.git" ]; then
    root="$scan"
    break
  fi
  scan="$(dirname "$scan")"
done
if [ -z "$root" ]; then
  root="$(git -C "$here" rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "$root" ]; then
  echo "FAIL: repo root not found (no .git above scripts/)"
  exit 1
fi
PROFILE="$root/.workflows/profile.json"
if [ ! -f "$PROFILE" ]; then
  echo "FAIL: profile not found: $PROFILE"
  exit 1
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

exec python3 - "$PROFILE" "$root" "$main" "$KIND" "$NAME" <<'PY'
import json
import os
import re
import sys
from datetime import date

profile_file, root, main, kind, name = sys.argv[1:6]


def fail(msg):
    print(f"FAIL: {msg}")
    sys.exit(1)


if not re.fullmatch(r"[a-z0-9-]+", name):
    fail(f"invalid name: {name} (allowed: [a-z0-9-])")

try:
    with open(profile_file, encoding="utf-8") as f:
        profile = json.load(f)
except (OSError, ValueError) as e:
    fail(f"profile is not readable JSON: {e}")

scaffolds = profile.get("scaffolds")
kinds = scaffolds.get("kinds") if isinstance(scaffolds, dict) else None
if not isinstance(kinds, dict):
    fail("profile has no scaffolds.kinds object")
if kind not in kinds:
    fail(f"unknown kind: {kind} (known: {', '.join(sorted(kinds))})")

spec = kinds[kind]
if not isinstance(spec, dict):
    fail(f"scaffolds.kinds.{kind} must be an object (template + target)")
template_rel = spec.get("template")
target_rel = spec.get("target")
if not isinstance(template_rel, str) or not template_rel.strip():
    fail(f"scaffolds.kinds.{kind}.template must be a non-empty repo path")
if not isinstance(target_rel, str) or not target_rel.strip():
    fail(f"scaffolds.kinds.{kind}.target must be a non-empty repo path")


def resolve(rel):
    """Repo path -> absolute path (worktree root first, then main checkout)."""
    for base in (root, main):
        if base:
            p = os.path.join(base, rel)
            if os.path.exists(p):
                return p
    return None


template_path = resolve(template_rel)
if template_path is None:
    fail(f"template not found: {template_rel}")

target_dir_rel = os.path.dirname(target_rel)
target_base = os.path.basename(target_rel)
placeholder = re.compile(r"\{\{next:(\d+)\}\}|\{\{name\}\}|\{\{date\}\}")


def name_matcher(base_str):
    """Full-match regex for this target's files carrying one literal name."""
    out, pos = "", 0
    for m in placeholder.finditer(base_str):
        out += re.escape(base_str[pos : m.start()])
        if m.group(1):
            out += f"[0-9]{{{m.group(1)}}}"
        elif m.group(0) == "{{name}}":
            out += re.escape(name)
        else:
            out += r"[0-9]{4}-[0-9]{2}-[0-9]{2}"
        pos = m.end()
    return re.compile(out + re.escape(base_str[pos:]))


def scan_dirs():
    for base in (root, main):
        if base:
            d = os.path.join(base, target_dir_rel) if target_dir_rel else base
            if os.path.isdir(d):
                yield d


# Overwrite refusal — with a {{next:N}} target the name identifies the record:
# a file for this name at any sequence means the target exists.
if "{{name}}" in target_base:
    name_rx = name_matcher(target_base)
    for d in scan_dirs():
        for f in os.listdir(d):
            if name_rx.fullmatch(f):
                existing = os.path.join(target_dir_rel, f) if target_dir_rel else f
                fail(f"target exists: {existing}")

# Next free sequence: max over files matching the target's literal prefix
# through the {{next:N}} placeholder (nameless legacy files count too), + 1,
# zero-padded to N.
next_match = re.search(r"\{\{next:(\d+)\}\}", target_base)
next_seq = None
if next_match:
    prefix_rx = re.compile(
        re.escape(target_base[: next_match.start()])
        + f"([0-9]{{{next_match.group(1)}}})"
    )
    max_seq = 0
    for d in scan_dirs():
        for f in os.listdir(d):
            m = prefix_rx.match(f)
            if m:
                max_seq = max(max_seq, int(m.group(1)))
    next_seq = max_seq + 1

today = date.today().isoformat()


def render(text):
    if next_seq is not None:
        text = re.sub(
            r"\{\{next:(\d+)\}\}",
            lambda m: str(next_seq).zfill(int(m.group(1))),
            text,
        )
    return text.replace("{{name}}", name).replace("{{date}}", today)


out_rel = render(target_rel)
out_path = os.path.join(root, out_rel)

try:
    with open(template_path, encoding="utf-8") as f:
        content = render(f.read())
except OSError as e:
    fail(f"template not readable: {template_rel} ({e})")

os.makedirs(os.path.dirname(out_path), exist_ok=True)
try:
    with open(out_path, "x", encoding="utf-8") as f:
        f.write(content)
except FileExistsError:
    fail(f"target exists: {out_rel}")
except OSError as e:
    fail(f"write failed: {out_rel} ({e})")
print(out_rel)
PY
