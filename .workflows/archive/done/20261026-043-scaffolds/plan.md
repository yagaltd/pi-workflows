# Plan: scaffolds — profile-declared generators (043)

> Plan ID: 20261026-043
> Status: SHIPPED 2026-10-29 — v0.12.9 (final gate R1 ok:true, zero findings)
> Created: 2026-10-29
> Shape: pi-workflows plan-draft (house format), ≤110 lines. Single repo. T1 W1; T2 W2 inline.

## Context

The generator study (xecute — origin: Rust architecture toolkit; template dir + manifest as the single source of structure) and the profile plan (041) left `scaffolds.kinds` empty in `.workflows/profile.json`. Gap: agents still hand-place recurring artifacts (ADR entries, decision rows, new modules) and re-derive naming/numbering each time. This plan lands the scaffold mechanism: kinds declared in the profile, one generator script, pi-workflows self-adopts one real kind (`adr`).

## Decisions

- **D1 — kind schema.** `scaffolds.kinds.<kind>` = `{ "template": <repo path to a template file>, "target": <target path pattern> }`. Placeholders inside template and target: `{{name}}` (sanitized: `[a-z0-9-]`), `{{date}}` (ISO today), `{{next:N}}` (next free zero-padded N sequence computed from existing files matching the target pattern — e.g. `DEC-{{next:3}}.md` → `DEC-006.md` when DEC-001..005 exist).
- **D2 — the generator.** `scripts/scaffold.sh <kind> <name> [name-args…]`: kind must exist in the profile (else `FAIL: unknown kind` + the kind list); template must exist; target computed from the pattern; **refuses overwrite** (`FAIL: target exists`); sanitizes the name; renders placeholders; writes the file; prints the created path. No post-hooks, no git ops.
- **D3 — self-adoption.** The repo's profile gains one kind: `adr` — template `templates/ADR.md`, target `.workflows/decisions/DEC-{{next:3}}-{{name}}.md`. New ADRs become `scaffold adr <slug>`; numbering stops being re-derived by hand.
- **D4 — docs.** README gains a Tooling note line for `scripts/scaffold.sh`; `templates/DOCS-POLICY.md` profile section gains one sentence: scaffold kinds are profile data, templates are per-project files (language-agnostic stance).
- **D5 — version 0.12.9** at SHIP.

## Spec Map

| Task | Contract | Wave | Mode |
|------|----------|------|------|
| T1 generator + profile kind + probes | task-1.spec | 1 | dispatched Tier B 🟡 |
| T2 docs + ship prep | task-2.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): generator + kind — scripts/scaffold.sh, .workflows/profile.json, templates/ADR.md (placeholders only if needed)
- D1 schema + D2 generator + D3 kind. Contract: `scaffold adr test-slug` creates `.workflows/decisions/DEC-006-test-slug.md` with rendered placeholders; unknown kind fails with the kind list; overwrite refuses; bad name (slash/uppercase) fails; profile-lint still passes (the new kind must satisfy the 041 schema — extend profile-lint to validate kind entries: template exists, target has `{{name}}`).

### TASK 2 (Tier A, ⚪): docs + ship — orchestrator-inline ✅ ✅
- D4 README + DOCS-POLICY lines, CHANGELOG v0.12.9, version bump, full gate chain.

## Adversarial pass (on record)

- Path traversal via name → sanitization rule (D1: `[a-z0-9-]` only); slash/`..`/uppercase fail with `FAIL: invalid name`.
- Silent overwrite → refuse by default; no force flag this plan (delete-then-scaffold is the owner's explicit act).
- Kind schema drift → profile-lint extended: every kind entry must have an existing `template` and a `target` containing `{{name}}` (checked in T1, not a later pass).
- Template churn → templates are per-project files (D4 docs line); pi-workflows bakes no language templates.
- Numbering races → single-writer assumption documented (one orchestrator); `{{next:N}}` recomputes per run, never caches.

## Verification (whole-plan final gate)

scaffold adr creates the expected next-numbered file with rendered placeholders · unknown-kind/overwrite/invalid-name probes fail · profile-lint passes with the kind schema check · drift CLEAN (9 sections) · bun 225/0 · docs-lint exit 0 · cc-check known-finding only · version 0.12.9 · final whole-plan reviewer (read-only over committed evidence — full unfiltered gate output in final-gates.md).
