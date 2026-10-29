# Task 1 — plan-thinner: SKILL as sole flow authority + thin prompt (plan 20261026-037)

## Round 1 — ok: false (1 P1 — STALE TEST, orchestrator scope)
- P1: tests/queue-wiring.test.ts:13 pinned `TYPESAFE_API_KEY` in prompts/plan.md — the approved 037 move relocated the prompt-unique flow (incl. that config line) to skills/plan/SKILL.md. Worker escalated correctly (same class as the plan-036 T3 stale-protocol tests).
- All other layers PASS: 3/3 contract greps; guard --spec zero violations; diff = {skills/plan/SKILL.md (+123), prompts/plan.md (−128)} exactly; move-completeness (7-line prompt, zero flow prose; SKILL carries judge pre-flight + PROPOSAL-FORMAT pointer).

## ORCHESTRATOR FIX (Tier A — one-line retarget)
- tests/queue-wiring.test.ts retargeted: reads skills/plan/SKILL.md (the flow authority post-037); both assertions hold (TYPESAFE present, TYPEDLLM absent).

## Round 2 — FINAL — pending reviewer
