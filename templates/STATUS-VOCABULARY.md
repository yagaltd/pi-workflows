# Status vocabulary — the mapping of record

One table maps every pi-workflows status token to its reply pill. The
pi-emphasis extension owns pill-WRITING guidance; this file only maps the
domain tokens onto that vocabulary and never re-teaches pill writing.
This file is the mapping of record: the rules below and any future checker
read their pill words from this table, from no other source.

## Mapping

| pi-workflows token | pill | tone | required action lead-in |
| --- | --- | --- | --- |
| `done(<ref>)` | [[Done]] | success | cite `<ref>` |
| gate pass / `ok:true` | [[Passed]] | success | name the gate |
| release | [[Shipped]] | success | name the plan or build |
| merged branch | [[Merged]] | success | name the branch |
| queued P0–P2 (owner call) | [[Decision]] | ask | **Do:** the unblock action |
| `deferred(trigger:)` | [[Pending]] | wait | restate the trigger |
| `closed(<why>)` | [[Keep]] | closed | state the why |
| gate skip | [[Skipped]] | neutral | **Run:** the skipped command |
| P2 risk | [[At risk]] | warn | **Guard:** the guard action |
| broken gate | [[Failed]] | danger | **Next:** the fix step |
| unverified claim | [[Unverified]] | warn | **Check:** how to verify |

Work-kind opener maps by kind: [[Implement]] / [[Investigate]] /
[[Preview]] / [[Brainstorm]] / [[Qualify]].

## Rules

SCOREBOARD — ship reports open with a one-line scoreboard under the first
line, in the `[[Shipped]] [[Done N]] [[Decision N]] [[Skipped N]]` style.
Rule home: `agents/registry.md` (beside the follow-up-table doctrine).

FILES-STAY-CLEAN — pills `[[…]]` and Nerd Font glyphs are chat-reply
decoration only; tracked repo files (LOG.md, CHANGELOG.md, templates,
plans, archive) stay clean markdown — no pill tokens, no icon glyphs.
The mapping table above is the one exception: it defines the tokens.

## Example

A ship report opens with the scoreboard, then states each outcome with
its required action:

```text
[[Shipped]] [[Done 3]] [[Decision 1]] [[Skipped 1]]
plan 20261117-071 shipped — three tasks done, one owner call queued.

[[Decision]] **Do:** the owner picks the check-tree strictness tier.
[[Skipped]] **Run:** the strict tree check after that call.
[[Unverified]] **Check:** rerun the gates on a fresh clone before SHIP.
```
