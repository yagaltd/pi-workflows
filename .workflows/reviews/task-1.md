# Task 1 — readme-rebuild: extraction + shop-window rebuild (plan 20261026-045)

## Round 1 — FINAL — ok: TRUE (reviewer pw45-t1-reviewer; zero blocking findings)
- Layer 1: 4/4 contract Test commands verbatim (README 146L ≤200, Install/QuickStart/Commands/Gates, zero version-titled, zero How-It-Works; 23 command rows == 23 prompts; architecture.md extraction verified; CHANGELOG counterparts present).
- Layer 1b: guard zero violations; changed paths = {README.md (-853/+74), docs/architecture.md (new, 490L)}; CHANGELOG untouched (dedupe: all 4 counterparts verified present).
- Layer 3: bun 225/0 main; drift CLEAN 10 sections; docs-lint CLEAN (claim-to-gate on the new architecture doc); all 27 test-asserted README strings verified present.
- DOCUMENTED DEVIATION (reviewer-accepted): the contract's "7 sections only" prose collided with 10 wiring-test files hard-asserting literal README content (## Flows, ## Format chooser, ## Proof ledger, judge/typesafe strings...). Resolution: 7-section spine KEPT + 9 compressed machinery sections (2-6 lines each, current-state, gates named) = 146L; full narration lives in docs/architecture.md. RECONCILIATION routed to T2 (DOCS-POLICY budget sentence carries the wiring-test floor).
- Content audit: User Journeys / Directory Structure / Help dup / Coding Guidelines / Skills table / Configure-models dropped — sources own them (agents/*.md, agents/registry.md, models/registry.json); nothing orphaned.
