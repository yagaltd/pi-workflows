spec: task
name: "ci-parity-just-ci"
tags: [ci, github-actions, just]
verify: "grep -q 'uses: taiki-e/install-action@v2' .github/workflows/ci.yml && grep -q 'run: just ci' .github/workflows/ci.yml && just ci"
---

## Intent

Point the GitHub Actions workflow at the shared `just ci` entrypoint so local, pre-push, and CI run one definition. Removes the raw script call and closes the local-CI question without Docker.

## Decisions

- Install `just` in the runner via `taiki-e/install-action@v2` (single pinned action, no other new deps).
- The existing job keeps its trigger set (push on all branches + pull_request); its run step becomes `just ci`.
- No Docker anywhere in the workflow (agent-ci rejected — one shell job, no fidelity gain).
- CI cannot be executed locally by design; verification is inspection + local `just ci` green. This limitation is documented loudly, not papered over.

## Boundaries

### Allowed Changes
- .github/workflows/ci.yml

### Forbidden
- Do not modify justfile (T1's output — sibling wave)
- Do not modify scripts/ or add workflow jobs
- Do not add caching layers, matrices, or secrets
- Do not change the checkout action version

## Completion Criteria

Scenario: workflow installs just via the pinned action
  Test: grep -q 'uses: taiki-e/install-action@v2' .github/workflows/ci.yml
  Given ci.yml on the current branch
  When inspecting the job steps
  Then one step uses taiki-e/install-action@v2 to install just before the run step

Scenario: job runs the shared entrypoint
  Test: grep -q 'run: just ci' .github/workflows/ci.yml
  Given ci.yml on the current branch
  When inspecting the job steps
  Then the run step is exactly "just ci" — no raw script invocation remains

Scenario: workflow stays valid YAML with a single job
  Test: node -e "const s=require('fs').readFileSync('.github/workflows/ci.yml','utf8'); if(!/^name:/.test(s) || (s.match(/uses:/g)||[]).length!==2) process.exit(1)"
  Given ci.yml after the edit
  When parsing the file structurally
  Then it opens with name:, and contains exactly two uses: lines (checkout + just install)

Scenario: negative — entrypoint failure would fail CI
  Test: just ci
  Given the runner executes just ci as its only verification step
  When any gate inside just ci fails
  Then the job fails (exit code propagates — no continue-on-error anywhere in ci.yml)
