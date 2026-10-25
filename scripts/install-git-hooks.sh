#!/usr/bin/env bash
# install-git-hooks — installs the repo's optional git hooks (plan 20261025-018 D3).
# Currently: pre-push → scripts/docs-lint.sh (doc-drift gate). Owner-runnable, not wired by default.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .git/hooks
cat > .git/hooks/pre-push <<'HOOK'
#!/usr/bin/env bash
bash "$(dirname "$0")/../scripts/docs-lint.sh"
HOOK
chmod +x .git/hooks/pre-push
echo "ok: pre-push hook installed (runs scripts/docs-lint.sh before every push)"
