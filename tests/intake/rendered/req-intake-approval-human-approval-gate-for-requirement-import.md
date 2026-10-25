---
kind: requirement
id: REQ-INTAKE-APPROVAL
title: "Human approval gate for requirement import"
status: proposed
liveness: auto
tags: [guardrail, intake]
---

## Problem

An agent emitting candidate requirement blocks must never mutate the
requirement corpus on its own; import is a governance act.

## Requirements

[REQ-INTAKE-APPROVAL] The intake flow MUST NOT run the requirement import without explicit human approval of the specific blocks to import.

## Scenarios

Scenario: Unapproved import attempt
  Given an intake file with blocks no human has approved
  When the agent tries to import without approval
  Then the import is refused and the blocks stay annotated in the intake file

## Open Questions

None.
