[private]
default:
    @just --unsorted --summary

ci:
    ./scripts/check-drift.sh
    ./scripts/docs-lint.sh
    ./scripts/agents-lint.sh AGENTS.md
    bun test

# CI runners have no bun and the test suite reads gitignored .workflows
# state — CI runs the state-free gate subset; `just ci` stays the
# local/pre-push gate.
ci-lite:
    ./scripts/check-drift.sh
    ./scripts/docs-lint.sh
    ./scripts/agents-lint.sh AGENTS.md

drift:
    ./scripts/check-drift.sh

docs:
    ./scripts/check-drift.sh
    ./scripts/docs-lint.sh

agents:
    ./scripts/agents-lint.sh AGENTS.md

test:
    bun test

flow slug:
    node scripts/flow-validate.mjs .workflows/flows/{{slug}}.json
    node scripts/flow-run.mjs .workflows/flows/{{slug}}.json

docs-if-touched:
    #!/usr/bin/env bash
    if git diff --name-only HEAD -- docs/ prompts/ skills/ agents/ README.md CHANGELOG.md | grep -q .; then
        just docs
    fi
