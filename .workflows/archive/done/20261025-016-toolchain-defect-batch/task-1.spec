spec: task
name: "lifecycle-node-test-verifier-port"
tags: []
---

## Intent

Port the Node.js lifecycle verifier into the agent-spec fork (release/1.4.0 line): `lifecycle` on bun/TypeScript repositories currently reports every scenario as Skip ("no verifier covered this step") because the fork has no verifier for `*.test.ts` repos. Upstream main (@b2462a5, local clone `/home/aurel/Documents/github/agent-spec`) already contains `src/spec_verify/node_test_verifier.rs` (`NodeTestVerifier`) and `tdd_guard_verifier.rs` — port the design into the fork's 1.4.0 codebase. Fork version → 1.5.0.

## Decisions

- Port the DESIGN, referencing upstream modules; adapt to the fork's 1.4.0 APIs. Upstream is the reference implementation, not a patch source.
- Detection: a repo is a Node test project when `package.json` exists with a test script or `*.test.ts`/`*.test.js` files are present under the code paths.
- Runner preference: `bun test -t <selector>` when bun is on PATH, else `node --test` with the filter; selector binding from `Test:` selectors already parsed by the fork.
- Cargo/`*.rs` repositories keep the existing Rust verification path — zero behavior change there.
- No runner available ⇒ scenarios Skip WITH a reason naming the missing runner (never a silent empty pass).
- Fork version 1.4.0 → 1.5.0 in Cargo.toml.

## Boundaries

### Allowed Changes
- src/**
- tests/**
- Cargo.toml
- Cargo.lock (mechanical companion of the version bump)
- skills/** (one-line `Tracks:` version stamps — mechanically forced by test_all_skills_track_current_crate_version)

> ORCHESTRATOR AMENDMENT 2026-10-25: Allowed set extended and the ~200-line budget amended to 759 actual lines — both contract-driven, adjudicated after review-1 flagged them (zero functional defects; no descope preserves Layer 1).

### Forbidden
- Do not modify `README.md`, `docs/**`, or the upstream clone at `/home/aurel/Documents/github/agent-spec`.
- Do not add runtime dependencies beyond the fork's existing Cargo dependencies.
- Do not change guard or CLI flag behavior (a separate task owns `--spec`).

## Completion Criteria

Scenario: detects node test projects from package.json
  Test: detects node test projects from package json
  Given a fixture repo with package.json carrying a test script
  When detect_test_verifier evaluates it
  Then the Node verifier is selected

Scenario: binds Test selectors to node test filter arguments
  Test: binds test selectors to node test filter arguments
  Given a spec scenario with a Test selector
  When the Node verifier runs
  Then the runner filter carries the selector value

Scenario: keeps cargo verification for rust repositories
  Test: keeps cargo verification for rust repositories
  Given a Cargo-only fixture repo
  When detect_test_verifier evaluates it
  Then the existing Rust verification path is unchanged

Scenario: skips with a reason when no runner is available
  Test: skips with a reason when no runner is available
  Given a Node test project and neither bun nor node on PATH
  When lifecycle runs
  Then scenarios report Skip with a reason naming the missing runner
