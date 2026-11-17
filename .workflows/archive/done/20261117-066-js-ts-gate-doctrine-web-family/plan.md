# Plan 20261117-066 — JS/TS doctrine: real gates for vanilla JS, the whole web family in review

> Plan ID: 20261117-066
> Created: 20261117
> Owner: Aurel
> Status: DONE (shipped v0.15.2 — 20261117)
> Supersedes: none (follows 20261117-065)

## Lifecycle

DRAFT → APPROVED → CONTRACTED → EXECUTING → REVIEWED → SHIPPED → ARCHIVED

## Context

The Rust family is wired end to end (`/init` cites it, the reviewer names it, `/plan`
carries a `Skills:` line). The JS/TS story has two holes found 20261117: `/init`'s
gate examples cover bun/TS (`tsc --noEmit`) and rust/python but never vanilla JS, so a
project with `eslint`/`biome` and no `tsconfig` gets no guidance; and the reviewer
names two of ~20 installed web skills (`modern-web-guidance` + `impeccable/audit`),
leaving `web-perf` and the `distill`/`normalize`/`typeset` set to luck.

Also found: `agents/reviewer.md:173` cites `unsafe-checker` as part of the Rust trio —
that skill is **not installed** (the installed trio is `rust-review`,
`rust-best-practices`, `rust-port`), so the doctrine names a skill an agent cannot
consult.

## Exploration

- `skills/init/SKILL.md:155` — examples: bun/TS `tsc --noEmit` / `bun test`; rust
  `clippy -D warnings` / `cargo test`; python "the project's lint/test commands".
  No JS-without-TS case, and `eslint`/`biome` appear nowhere in the package.
- `agents/reviewer.md:173` — "web frontend: modern-web-guidance (+ impeccable/audit
  for UI)"; `web-perf`, `distill`, `normalize`, `typeset`, `critique` installed but
  unnamed.
- `tdd-guard lint` covers `**/*.{test,spec}.{ts,tsx,js,jsx}` — so JS/TS test quality is
  already enforced once the gate exists; the missing piece is the `check` command.

## Spec Map

- `.workflows/specs/task-1.spec` — JS/TS gate guidance + web family + phantom name

## Tasks

### TASK 1 (⚪ STANDARD, Tier B): JS/TS gates and the full web family

- **Agent**: worker
- **Wave**: 1
- **Depends On**: none
- **Contract**: .workflows/specs/task-1.spec
- **Status**: ✅ DONE (verdict reviews/task-1.md ok:true)
- **Problem**: no vanilla-JS gate example; reviewer names 2 of 20 web skills and one
  skill that is not installed.
- **Allowed**: skills/init/SKILL.md, agents/reviewer.md, tests/prompt-doctrine.test.ts, docs/architecture.md
- **Testing strategy**: doc-doctrine pins (bun test) asserting the named strings and the
  absence of the phantom skill; no network.
- **Verify**: bun test && bash scripts/check-drift.sh
- **What**: (1) `skills/init/SKILL.md` — add the vanilla-JS/TS gate branch: detect the
  project's own linter (`eslint`, `biome`) and test runner (`vitest`, `node --test`,
  `bun test`) from markers, emit `check`/`verify` from them, with one worked
  vanilla-JS example beside the existing bun/TS and rust ones; keep the
  "never placeholder filler" rule explicit. (2) `agents/reviewer.md` — the web line
  names `modern-web-guidance` first, `web-perf` for CWV-sensitive diffs, and the
  impeccable set by intent (`audit` for a UI audit, `harden` for resilience,
  `distill`/`normalize`/`polish` when the diff changes density or consistency);
  replace the non-existent `unsafe-checker` with the installed Rust trio.
  (3) Pin all of it in `tests/prompt-doctrine.test.ts`: the init skill names
  `eslint`/`biome` and a vanilla-JS example; the reviewer names `web-perf` and the
  impeccable set; `unsafe-checker` appears nowhere; every skill named in the reviewer
  doctrine exists in the installed set at authoring time (assert against a hardcoded
  list so CI does not depend on the machine).

## Contracts (generated after approval)

- .workflows/specs/task-1.spec

## Docs impact

- `skills/init/SKILL.md` — the JS/TS gate branch
- `agents/reviewer.md` — the web family and the corrected Rust trio
- `docs/architecture.md` — the domain-skill paragraph, if it repeats the family list
- `CHANGELOG.md` — the v0.15.2 entry

## Execution Notes

- TASK 1 — ✅ DONE (verdict reviews/task-1.md ok:true)
  context: `/init` now has the JS/TS gate branch — the project's own linter (`eslint`|`biome`)
  feeds `check`, its runner (`vitest`|`node --test`|`bun test`) feeds `verify`, with a worked
  vanilla-JS example beside bun/TS and rust, and an explicit "`check` stays ABSENT rather than
  invent one" rule. `agents/reviewer.md` names the web family by intent (modern-web-guidance
  first, `web-perf` for CWV, impeccable audit/harden/distill/normalize/polish) and the Rust
  trio is corrected to the installed `rust-review` / `rust-best-practices` / `rust-port`
  (`unsafe-checker` removed). Five pins, including a hardcoded installed-skill set so no
  doctrine line can name a skill that does not exist.
