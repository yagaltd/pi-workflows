#!/usr/bin/env bash
# install-git-hooks — installs the repo's optional git hooks (plan 20261025-018 D3).
# Currently: pre-push → `just ci` (full local gate); falls back loudly to scripts/docs-lint.sh when just is absent (plan 20261030-046).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .git/hooks
cat > .git/hooks/pre-push <<'HOOK'
#!/usr/bin/env bash
if command -v just >/dev/null 2>&1; then
  just ci
else
  echo "pre-push: 'just' not found in PATH — falling back to scripts/docs-lint.sh only (install just for the full gate)" >&2
  bash "$(dirname "$0")/../../scripts/docs-lint.sh"
fi
HOOK
chmod +x .git/hooks/pre-push
echo "ok: pre-push hook installed (runs 'just ci' before every push; docs-lint fallback if just is absent)"
