---
kind: requirement
id: REQ-HISTORY-EXPORT
title: "Export run history"
status: proposed
liveness: auto
tags: [export, history]
---

## Problem

Teams lose the per-run trail (which contract ran, which wave, which verdict)
once a session ends, so post-mortems rely on scrollback.

## Requirements

[REQ-HISTORY-EXPORT] The workflow system MUST export a completed run's decision trail to a single markdown file on explicit request.

## Scenarios

Scenario: Export a finished run
  Given a completed run with at least one recorded decision
  When the export command runs for that run
  Then a markdown file is written containing every decision with its verdict


## Source Trace

- intake:sample-session
## Open Questions

- Where should the export land by default: repo root or `.workflows/runs/`?
