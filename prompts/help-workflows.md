---
description: "Show pi-workflows quick reference"
thinking: off
restore: true
---

Show this reference and nothing else:

## pi-workflows — Quick Reference

### Starting work
/idea <description + repos/URLs>  →  Explore + plan + generate contracts (GPT-5.4)
/plan <description>               →  Decompose into tasks + contracts (GPT-5.4)
/explore <question>               →  Quick research, no planning (cheap)
/status                           →  Show plan progress + cost summary (cheap)

### Executing
/next                             →  Execute next task (reads contract first)
/add <feature>                    →  Build feature against contract
/fix <bug>                        →  Fix bug within boundaries
/refactor <scope>                 →  Restructure code, behavior preserved
/optimize <target>                →  Autoresearch loop

### Prototyping
/prototype <theories>             →  Parallel mini-prototypes to test approaches
/integrate <prototype>            →  Integrate validated prototype into production

### Verification
/contract [spec]                  →  Show contract for a task
/verify                           →  3-layer pipeline: agent-spec + tdd-guard + project checks
/review                           →  Mechanical verification + quality review (2-stage)

### Documentation
/docs [area]                      →  Generate/update project docs (cheap model)
/docs all                         →  Generate full doc set (architecture, onboarding, decisions)

### Delegated
/scout <area>                     →  Cheap subagent recon

### Flow: /idea → approve plan → /next × N → /review → ship
