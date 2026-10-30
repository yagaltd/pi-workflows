[private]
default:
    @just --unsorted --summary

ci:
    ./scripts/check-drift.sh
    ./scripts/docs-lint.sh
    ./scripts/agents-lint.sh AGENTS.md
    bun test

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
    ./scripts/flow-validate.mjs .workflows/flows/{{slug}}.json
    ./scripts/flow-run.mjs .workflows/flows/{{slug}}.json

docs-if-touched:
    #!/usr/bin/env bash
    if git diff --name-only HEAD -- docs/ prompts/ skills/ agents/ README.md CHANGELOG.md | grep -q .; then
        just docs
    fi
