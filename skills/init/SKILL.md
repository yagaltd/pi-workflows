---
name: init
description: "Bootstrap a project: architecture design, folder tree, charter, docs skeleton — before any planning or building. Use for 'init project', 'set up this project', 'scaffold', 'new project setup', or when starting work on an empty/new repo."
user-invocable: true
argument-hint: "<project description>"
---

# Init Workflow — project bootstrap

`/init` is the step BEFORE `/idea`/`/plan`: it designs the structure the
contracts will later enforce. Nothing here builds features — it produces
an approved architecture, an approved folder tree, the charter, the
project profile, and doc skeletons, then hands off to `/plan`.

```text
Phase 1 DECIDE  → stack/domain decisions (grill protocol)
Phase 2 DESIGN  → architecture: modules, boundaries, data flow, ADRs
Phase 3 TREE    → folder tree proposal → approval → architecture.md seeded
Phase 4 SCAFFOLD→ worker task: dirs + stubs per the approved tree
Phase 5 WIRE    → charter + profile + CONTEXT.md + README skeleton → /plan
```

## Phase 1: DECIDE — evidence first, grill what remains

Read whatever exists (repo, docs, prior CONTEXT.md — an empty repo is
fine). Identify the stack/domain decisions that are still open. Ask only
the unresolved ones, per the grill protocol (material, grounded,
answerable; recommended + evidence + AFK default). Typical: language,
package manager, test runner, key dependency choices, module layout
philosophy (single-entry vs multi-package, library vs app).

## Phase 2: DESIGN — architecture before code

Produce a compact architecture design:

- **Modules** — name, responsibility, one sentence each
- **Boundaries** — what each module may NOT touch (these become contract
  Forbidden lists and agent-spec guard checks later)
- **Data flow** — a Mermaid diagram if non-trivial
- **Key decisions** — one line each with rationale; promote to ADRs
  (`.workflows/docs/adr/`) when hard to reverse + surprising + a real
  tradeoff

## Phase 3: TREE — the folder tree, approved as an artifact

Propose the folder tree — the thing contract Boundaries will later derive
from:

```text
src/
  <module-a>/     # <responsibility>
  <module-b>/     # <responsibility>
tests/
docs/             # if the user wants user-facing docs (see DOCS-POLICY)
```

Tree rules:

- Every directory maps to a module from Phase 2 (no junk drawers)
- Tests mirror src/ layout
- `.workflows/` exists for workflow state (gitignore it unless the team
  wants it shared)
- Present the tree with the architecture; 🛑 GATE: human approves BOTH

On approval, write `.workflows/docs/architecture.md` using the `/docs`
skill's architecture template (Overview, Module Structure, Data Flow, Key
Design Decisions, Entry Points) — **seeded now, before any build**, so
`/docs` and docs-check update a living document instead of reconstructing
one later. Append the approved tree under `## Folder Tree`.

## Phase 4: SCAFFOLD — one worker task creates the skeleton

Dispatch ONE worker (inline prompt, `write: true`, medium thinking — the
shape follows `agents/dispatch-shapes.md` conventions; use `@role:worker`):

```text
task: `Scaffold the approved project tree.
Read .workflows/docs/architecture.md (approved architecture + tree).
Create every directory from the tree with a .gitkeep or minimal stub
file per module (comment header naming the module's responsibility —
no implemented code). Create tests/ mirroring src/.

Boundaries: ONLY the directories in the documented tree. No code, no
dependencies installed, no README content beyond placeholders.

Verify: find . -type d -not -path '*/.git*' -not -path '*/.workflows*' | sort
        → matches the documented tree exactly`
```

Reviewer verdict gates it like any task (verdict gating applies — but for
a scaffold, a quick `git status` + tree-match check suffices; docs-tier).

## Phase 5: WIRE — charter, profile, context, README skeleton, handoff

1. **Charter**: GENERATE the project's AGENTS.md — copy
   `templates/AGENTS.md` (package: two dirs up from this skill) to the
   project root, fill the `<placeholder>` pointer slots from the Phase
   1–4 facts (project overview, test command, architecture/map + ADR
   targets, conventions doc), and write the project's own binding rules
   into the PROJECT block. Follow the AGENTS.md authoring rules in
   `templates/DOCS-POLICY.md`: binding rules + one-liner facts +
   pointers to detail docs (e.g. `Test: npm test` · `Tests detail:
   tests/README.md`) — never command inventories; nested AGENTS.md files
   don't auto-load (pi walks up from cwd only). Then RUN
   `bash "${PI_WORKFLOWS_BIN:-./scripts/wf.sh}" agents-lint AGENTS.md`
   — a lint failure BLOCKS the
   handoff: fix before presenting. The charter's review pointers cite the
   installed domain-skill family matching the DETECTED stack (Phase 1 TREE):
   Rust → the Rust skill family (`rust-review`, `rust-best-practices`,
   `rust-port`, `rust-crate-architecture`); web frontend →
   modern-web-guidance + impeccable/audit; Cloudflare Workers → the workers
   skill family + security-audit. For a DETECTED Rust stack — greenfield or
   `/init --adopt` — also put this binding rule verbatim in the charter's
   PROJECT block:
   Rust structural gate: run `deslop-please` before `/review`; fix findings
   from first principles — no allowlist churn; consult the Rust skill family
   (`rust-review`, `rust-best-practices`, `rust-port`,
   `rust-crate-architecture`).
   When the stack is not yet known (greenfield, pre-detection), skip the Rust
   gate sentence and the review-pointer family citation — do not guess.
   Verification pointers in the charter cite the
project's
   actual commands — when the dev environment defines mise tasks (step 7
   below), the charter's test/check pointers cite `mise run check` and
   `mise run verify` so agents execute the same tasks gates run. The
   CITATION REPAIR (step 7) confirms these once the tasks exist — or
   strips them if they never materialize: never leave a `mise run …`
   pointer to tasks that were not written. Every
   session — orchestrator and all
   subagents — auto-loads it from here on.
2. **Profile**: GENERATE `.workflows/profile.json` — the machine truth
   for project facts: `commands`, `pointers`, `tree`, `gates`,
   `scaffolds`, `meta` (the schema is what `scripts/profile-lint.sh`
   checks). Greenfield: fill from the Phase 1–4 facts — test/lint/build
   commands (Phase 1; raw at first write — step 7's CITATION REPAIR
   rewrites `commands.test`/`commands.lint` to the mise tasks when they
   exist), the pointer targets the charter cites (canon,
   docs-policy, registry, ADR index), tree domains from the approved
   Phase 3 tree, gates in run order (at minimum the charter's
   `scripts/agents-lint.sh`). Brownfield (`/init --adopt`): there are no
   interview facts — run the extractor first:
   `bash "${PI_WORKFLOWS_BIN:-./scripts/wf.sh}" init-extract --root .`
   makes ONE batched judge call that drafts the profile commands,
   tree domains, stack detection, charter pointers, and the gate-questions
   into DRAFT files. Drafts land at `.workflows/profile.json.draft`,
   `.workflows/AGENTS.md.draft`, and `.workflows/charter-pointers.draft.md`.
   The gate-questions are booleans: "test command present" and "no key
   material in charter". The extractor then runs the deterministic lints on
   the drafts (profile-lint + agents-lint + check-tree) and reports pass or
   fail per path. Draft-by-judge, verify-by-gate — the judge never writes
   final files. A lint failure BLOCKS loudly — correct the draft before
   presenting. JUDGE SKIPPED (no key / endpoint down / below
   floor) → derive by hand:
   read the build manifests
   (`Cargo.toml`, `package.json`, `pyproject.toml`) for test/lint/build
   commands, list the top-level dirs as tree-domain candidates, pick
   pointer targets that exist on disk. Then PRESENT the draft to the
   owner for correction BEFORE linting. Then RUN
   `bash "${PI_WORKFLOWS_BIN:-./scripts/wf.sh}" profile-lint`
   `.workflows/profile.json` — a lint
   failure BLOCKS the handoff: fix before presenting (every pointer and
   tree path must exist on disk; a fictional path is a bug).
3. **CONTEXT.md**: seed `.workflows/CONTEXT.md` from Phase 1-2 decisions
   (glossary terms + decisions; ADRs already written in Phase 2).
4. **README skeleton**: create per `templates/DOCS-POLICY.md` — title,
   one-paragraph description, install/build/test placeholders. (Full docs
   come from `/docs` when there's something real to document.)
5. Append to `.workflows/LOG.md`:
   `<date> INIT — architecture + tree approved, scaffolded, profile linted`
6. **Charter probe**: VERIFY the scaffold finished — `test -f AGENTS.md` at the
   project root. If missing, FAIL LOUDLY: name the missing path
   (`AGENTS.md at <project root>`) and the remediation — run the charter step
   (Phase 5 step 1: copy `templates/AGENTS.md` and fill the slots), see
   `templates/DOCS-POLICY.md` / `docs/canon.md`. This probe is BLOCKING:
   init cannot proceed past it without AGENTS.md, and the remediation is
   mandatory, not advisory. Do NOT hand off without a charter: downstream
   roles and lints depend on it.
7. **Dev environment (mise)**: DETECT the stack from build markers
   (`package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `Gemfile`,
   `*.csproj`) and existing version files (`.nvmrc`, `.python-version`,
   `.tool-versions`, `mise.toml`). Greenfield: GENERATE a `mise.toml`
   draft — a `[tools]` block pinned from the detected markers, versions
   confirmed with `mise current` — together with a `[tasks]` section whose
   `check`, `verify`, and `ci` tasks are REAL commands detected from the
   stack — never placeholder filler. For JS/TS, DETECT the project's OWN tooling
   instead of assuming TypeScript: the linter (`eslint` or `biome`, from
   `eslint.config.*` / `.eslintrc*` / `biome.json` or a linter entry in the
   package manifest) and the runner (`vitest`, `node --test`, `bun test`,
   from that manifest or the test script). Examples: bun/TS projects →
   `check = "bunx tsc --noEmit"`, `verify = "bun test"`; rust projects →
   `check = "cargo metadata --no-deps --format-version 1 >/dev/null && cargo tree --locked --workspace -e normal,build --target all >/dev/null && cargo clippy --locked --workspace --all-targets -- -D warnings && { if command -v cargo-deny >/dev/null 2>&1; then cargo deny --config deny.toml --locked check; else echo 'SKIP: cargo-deny absent — install with cargo install cargo-deny --locked' >&2; fi; } && { if command -v deslop-please >/dev/null 2>&1; then deslop-please; else echo 'SKIP: deslop-please absent — install deslop-please (needs rust-analyzer: rustup component add rust-analyzer)' >&2; fi; }"`, `verify = "cargo test"`;
   vanilla JS (`eslint` + `node --test`) → `check = "bunx eslint ."`,
   `verify = "node --test"`; python → the project's lint/test commands.
   The Rust chain runs non-locked `cargo metadata` first to bootstrap
   `Cargo.lock`; every following cargo command uses `--locked`. Optional tools
   `cargo-deny` and `deslop-please` are guarded: if absent, print a loud SKIP
   with an install hint to `stderr` and continue; a findings exit (1) fails
   the gate. Never add `--update-allow`, `--allow`, or generate an allow file.
   If no linter is detectable, `check` stays ABSENT and the handoff says
   so plainly — leave the gate out rather than invent one. These tasks are the
   executable charter: gates and review run them (see scripts/flow-gates.mjs),
   and the step 1 charter cites them. `ci = "mise run check && mise run
   verify"` composes the pair for CI: if `check` is absent, `ci` runs
   `verify` alone, and if neither exists neither does `ci`.

   CONTRACT: `check`, `verify`, and `ci` stay FLAT inline under `[tasks]`
   in the root `mise.toml` — `scripts/flow-gates.mjs` (`miseTasks()`) and
   `/review` Layer 0 parse only that shape; `.mise/tasks/` file tasks are
   invisible to them, and moving `check` there silently disables the
   executable charter. File tasks are for other verbs — the `wf:*` bridge
   below is the pattern. OPTIONAL: a conditional docs gate (the
   `docs-if-touched` pattern — run the docs checks only when doc surfaces
   changed; house example `.mise/tasks/docs-if-touched`) — add it only
   when the project has a docs gate; it never replaces `check`/`verify`.

   **CI wiring (gate: owner approval):** `mise` coordinates CI, so the
   project's CI calls the tasks instead of restating commands. Only when
   the tasks above exist (this step did not degrade): GREENFIELD — OFFER
   a minimal CI job running `mise install && mise run ci`
   (`.github/workflows/ci.yml` when the repo's host is GitHub Actions;
   no CI host declared → say so and skip). BROWNFIELD — when a CI
   configuration exists (`.github/workflows/*`, `.gitlab-ci.yml`,
   `Jenkinsfile`, …), OFFER consolidation onto `mise run ci` under the
   version-file boundaries: NEVER delete an existing CI configuration,
   NEVER rewrite a pipeline unilaterally, never forced. 🛑 the owner
   approves before any CI file is written or changed; a declined offer
   stays untouched and is named as an open question in the handoff. The
   handoff reports the CI outcome (job written / consolidated /
   offered-and-declined / no CI host declared / skipped — this step
   degraded).

   CITATION REPAIR (runs after this step resolves): steps 1–2 wrote the
   charter and `profile.json` before these tasks existed — reconcile
   now. Tasks exist → set `profile.commands.test = "mise run verify"`
   and `profile.commands.lint = "mise run check"`, and confirm the
   charter cites that pair. Step degraded → STRIP every `mise run …`
   citation from the charter and keep the Phase-1 raw commands in the
   profile (a citation to tasks that do not exist is a bug: the
   `command -v` check in `profile-lint` will not catch it). Run
   `profile-lint` again after any change.
   Also PERSIST the approved Phase 3
   tree as `.workflows/tree.json` in this minimal shape (the tree checker
   consumes it):

   ```json
   {
     "roots": ["src", "tests"],
     "files": ["AGENTS.md", "README.md", "mise.toml"]
   }
   ```

   (`roots` = top-level directories from the approved tree; `files` =
   top-level files.)
   then 🛑 GATE: the OWNER approves the
   draft before anything is written. Brownfield: mise already reads
   `.nvmrc` / `.python-version` / `.tool-versions` natively as-is —
   REPORT the native pinning and OFFER consolidation into `mise.toml`
   (never forced). On approval: run `mise install`, then verify each
   runtime resolves with `mise exec -- <runtime> --version`. Boundaries:
   NEVER delete existing version files; NEVER upgrade runtimes only to
   enable mise; NEVER silently replace another tool manager. mise
   missing → SKIP LOUDLY: REPORT it, OFFER installation
   (`curl https://mise.run | sh`), then continue Phase 5 without a
   `mise.toml` — init never blocks on mise, and the phase never aborts.
   Report the mise-absent skip loudly in the handoff.

   **Task bridge: pi-workflows wrappers (gate: owner approval):**
   DETECT a consumer `mise` installation (`mise --version`) and an existing
   configuration (`mise.toml`, `mise/config.toml`, `mise/conf.d/`). If `mise`
   is absent, REPORT `pi-workflows mise tasks SKIPPED (mise absent)`, OFFER
   opt-in installation, and do not install anything or write the fragment.
   If present, WRITE `mise/conf.d/pi-workflows.toml` (use the existing
   directory layout when one exists) from `buildInitMiseFragment()` in
   `scripts/init-extract.ts`. The emitted tables are `[tasks."wf:judge"]`,
   `[tasks."wf:judge-context"]`, `[tasks."wf:lessons"]`,
   `[tasks."wf:bench"]`, `[tasks."wf:archive-check"]`, and `[tasks."wf:wip"]`.
   Each task calls
   `"$PI_WORKFLOWS_BIN" <verb> "$@"`.
   Boundaries (gate: owner approval): do not edit the root `mise.toml`, do not
   define `check`/`verify`, do not create a legacy task manifest, and do not
   replace the repo's own tasks. Record the path in the handoff and the
   `.workflows/LOG.md` recommendation (LOG writes stay gate-only).

   **Persona bridge: main-agent persona (gate: owner approval):**
   When the installed package's canonical `agents/orchestrator.md` is present,
   read it with `readCanonicalPersona()` and, after the owner approves the
   generated paths, write `.pi/APPEND_SYSTEM.md` with
   `mergeAppendSystem(existing, buildInitPersonaFragment(personaText))`.
   Merge the consumer `.gitignore` with `mergeInitGitignore(existing)` so
   `!.pi/APPEND_SYSTEM.md` and `!.workflows/wip/` survive broad ignore rules.
   Never overwrite unrelated `.pi/APPEND_SYSTEM.md` content, edit root
   `mise.toml`, define repo `check`/`verify`, or change the persona source.
   Report both generated paths in the handoff; LOG writes stay gate-only.
8. **Docs consolidation**: triage loose root-level `*.md`
   design/roadmap/refactor notes using the Phase 3 TREE listing. Greenfield:
   there are typically none — state that and skip this step cleanly.
   Brownfield: CLASSIFY each loose root-level note into exactly one of four
   destinations and render the classification table in chat:

   | Note records... | Destination |
| --- | --- |
   | A decision + its rationale | `.workflows/decisions/ADR-NNNN-<slug>.md` |
   | Superseded / historical content | `archive/done/<area>/` |
   | Living reference material | `docs/` |
   | Roadmap / future work | `.workflows/` queue or proposals |

   🛑 GATE: the OWNER approves the classification before anything moves.
   Unclassifiable notes stay put and are listed as open questions.
   On approval: EXECUTE the moves — convert decision notes to ADR structure
   (date, status, context, decision, consequences), update references
   repo-wide (grep each moved filename and fix every citation), NEVER delete
   a note (superseded notes go to archive, not `/dev/null`), and append the
   moves to `.workflows/LOG.md`. Self-probe: WARN-tier listing of any
   root-level notes still unclassified — record the WARN in LOG; init
   proceeds (this probe is advisory, not blocking).
9. **Model policy**: QUERY the LIVE pi model catalog (subagent_models tool
   surface — capability metadata only) and build the per-tier shortlist
   (strong/standard/scout/vision), preferring native provider models and
   noting provenance for each pick. 🛑 GATE: present the shortlist to the
   OWNER and record their pick, then write `models/registry.json` with
   provenance `pi-catalog`. The catalog is CAPABILITY truth: NEVER read
   key files or key contents (API keys) — the catalog needs no secrets.
10. **Hand off**: present the summary — including the model-policy
   outcome (the owner's registry picks and their provenance), the
   dev-environment outcome (mise.toml written and verified, native
   pinning reported, the generated `mise/conf.d/pi-workflows.toml` path, or
   the loud mise-absent skip), and the CI outcome (job written /
   consolidated / offered-and-declined / no CI host declared / skipped
   with the reason) — and point at `/plan` — its
contract
   Boundaries now derive from the documented tree (say so explicitly in
   the handoff). The fresh project now carries its charter (probed
   in step 6), its `.workflows/profile.json`, CONTEXT.md, and the README
   skeleton — and
   any later session can `/restart`
   (it runs `bash "${PI_WORKFLOWS_BIN:-./scripts/wf.sh}" resume-digest`)
   to rebuild state before continuing.

## Rules

- Detected formatter profiles are offered only at the owner gate:
  `detectFormatterProfiles()` maps on-disk markers/config to a read-only
  check; no formatter file is written and no `fmt` runs before explicit owner
  approval (gate: `scripts/init-extract.ts`, `scripts/profile-lint.sh`).
- A detected formatter whose executable is absent reports `SKIP` with the
  reason and offers no command; nothing is written or run (gate:
  `scripts/init-extract.ts`).
- Worker Verify runs `format-check` read-only, scoped to the task's explicit
  paths, never `fmt` there; `fmt` is allowed only in an explicitly contracted
  formatting task on explicit paths (gate: `agents/worker.md`).
- Markdown is excluded from `format-check`; `scripts/docs-lint.sh` is the sole
  Markdown authority. The docs baseline regenerates only with
  `bash scripts/docs-lint.sh --write-baseline`, never by hand (gate:
  `scripts/docs-lint.sh`).
- `/init` never implements features — architecture, tree, stubs only
- The tree is an APPROVED artifact, not a side effect of the first task
- `/init` on an existing project = `/audit` first (map what exists), then
  design gaps — never re-scaffold over live code
- Everything stays lean: this skill routes details to references
  (`agents/dispatch-shapes.md`, `templates/DOCS-POLICY.md`, the /docs
  skill's architecture template) instead of restating them
