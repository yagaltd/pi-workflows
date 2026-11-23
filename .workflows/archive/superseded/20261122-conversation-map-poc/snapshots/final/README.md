# Plan-level manager view (PoC)

A static chat tree for the human manager: what the plan is, which tasks are
done, what each worker did, which review layers passed, and what still needs a
human. **source = plan/verdict/LOG state, not transcript; tool calls are
evidence; this renders in any chat, chips only color in a TUI session**.

No new screen, no TUI, no click handling. If a branch is unclear, ask a
follow-up (`--detail <id>`) instead of adding interaction.

## Sample manager tree (verbatim)

Run `bun prototype/poc/cli.ts`:

```text
Plan 079 — Evasion oracle [[In progress]] · ship v0.15.18
├── T1 Tier-0 evasion scanner [[Done]] · mechanical ✓ · typed ok · agent ok
├── T2 judge evasion question pack [[Fixed]] · mechanical ✓ · typed ok · agent ok:false → fixed
│   └── Fork: judge-pack worker [[Fixed]]
├── T3 oracle-binding disclosure rule [[Done]] · mechanical ✓ · agent ok
├── T4 oracle variation between passes [[Done]] · typed ok · Kani proofs passed · agent ok
├── T5 proof gate resume [[Needs you]] · Kani pending · Owner gate blocked
│   └── Approve resume after proof failure? [[Needs you]]
│       └── Resume granted [[Done]]
└── T6 docs sweep [[Done]] · agent ok
```

10 lines for a 6-task plan. Every line is a human phrase; command output,
counts and tool names appear only in evidence. Pills (`[[Done]]`,
`[[Needs you]]`, `[[Fixed]]`, …) are derived from each node's status.

## Contract

`extractPlan(sources)` in `extract.ts` is pure: no IO, no clock, no transcript.
Inputs: `planText`, `logText`, `reviewFiles[]`, `proofText`, `journalText`.
Output: `{ id, title, status, shipTarget?, nodes[], edges[] }`.

Every node has `{ id, kind, summary, detail, status, evidence[] }` plus optional
`parent`, `owner`, `answersId`. Summaries are ≤60 chars and contain no tool
names, command output or counts. Kinds:

- `plan` — root: plan id, status, ship target.
- `task` — `T1…`, title and status from the plan's `TASK` blocks.
- `worker` — owner/worker discovered in the plan or fork records.
- `mechanical`, `typed`, `kani`, `agent-review` — verification layers attached
  to a task **only when a verdict or proof exists**; displayed inline in that
  review-chain order (`mechanical → typed → Kani → agent review`).
- `escalation` + `decision` — a human question and its answer/approval. The
  answer carries `answersId` pointing at the escalation, plus an `answers`
  edge back to it.
- `branch` — fork/subagent, with a `fork` edge from its task.
- `pending` / `blocked` — open gates (e.g. a pending proof or owner block).

Tool calls and raw verdict lines live in `evidence[]`; they are never nodes and
never appear in the default tree.

## CLI

```sh
bun prototype/poc/cli.ts                    # manager tree (default)
bun prototype/poc/cli.ts --verbose          # tree + evidence sources
bun prototype/poc/cli.ts --json             # machine-readable graph
bun prototype/poc/cli.ts --detail T2        # follow-up: "what happened with T2?"
bun prototype/poc/cli.ts --detail decision-T5
bun prototype/poc/cli.ts --sources <dir>    # plan.md/LOG.md/reviews/proofs/journal
```

`--detail` prints the node's full detail, evidence and links. Nodes resolve by
id (`T2`, `decision-T5`) or short alias (`esc-t5`, `ans-t5`).

## Fixtures and tests

`fixtures/` is a redacted synthesized composite grounded in repo docs:
task titles from `.workflows/proposals/20261119-plan-079-evasion-resistant-oracle.md`,
status/task grammar from archived plans (`20261117-074`), verdict phrasing from
`.workflows/reviews/task-2.md` and `fix-round-074.md`, and the judge tier names
from plan 076–078 LOG entries. Absolute paths, tokens and emails are absent;
the tests assert that. The Kani lines are synthetic because this worktree has
no Kani output — the parser accepts both JSONL proof rows and Kani-style text.

`bun test prototype/poc` covers task count/order/status, ≤60-char summaries,
layer-only-with-evidence, Kani-from-proofs, the answer→escalation link,
fork/pending/blocked nodes, determinism, tree length, tool-call hiding and
detail follow-ups. TDD: these tests were red (`Cannot find module './extract.ts'`)
before the extractor existed, then green (12 pass / 0 fail).

## Limitations

- This worktree has no live `.workflows/plan.md`, `journal.jsonl` or
  `.workflows/proofs/`; the CLI therefore defaults to fixtures. `--sources`
  accepts a directory with the same filenames for real artifacts.
- The parser targets the canonical pi-workflows plan/review grammar; novel
  prose layouts yield no node rather than a fabricated one.
- The known repo-wide `check-tree` WARN is out of scope for this PoC.

## Live-data validation and chip proof

The live `.workflows` is read-only. `bun prototype/poc/cli.ts --sources
/home/aurel/Documents/github/pi-workflows/.workflows` renders plan 076: an
inline blockquote `Status: APPROVED`, zero `### TASK` blocks, three evidence-backed
phase bullets from the plan + LOG, the post-phase-1 human gate and its owner
answer. `proofs.jsonl` has no Kani rows, so no Kani layer is rendered.

`realdata.test.ts` asserts those facts against the live files; `chips.test.ts`
feeds the live tree to the installed pi-emphasis `createPalette`/`decorate`
and checks ANSI, Nerd caps and that no `[[token]]` survives. Run
`bun prototype/poc/chips.ts | cat -v` to see the decorated bytes. In this
herdr/rpc session there is no `reply_style` section, so raw `[[...]]` appears
in chat; a fresh pi TUI session with the extension loaded renders pills.
