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
/status                           →  Show plan.md + contract progress (cheap)

### Executing
/next                             →  Execute next task (reads contract first)
/add <feature>                    →  Build feature against contract
/fix <bug>                        →  Fix bug within boundaries
/refactor <scope>                 →  Restructure code, behavior preserved
/optimize <target>                →  Autoresearch loop

### Verification
/contract [spec]                  →  Show contract for a task
/verify                           →  agent-spec guard + project checks
/review                           →  agent-spec lifecycle + bombadil + checks

### Documentation
/docs [area]                      →  Generate/update project docs (cheap model)
/docs all                         →  Generate full doc set (architecture, onboarding, decisions)

### Delegated
/scout <area>                     →  Cheap subagent recon

### Swan (autoresearch)
/swan-explore <target>            →  Online research + codebase analysis
/swan-prototype <theories>        →  3 parallel workers in worktrees
/swan-integrate <prototype>       →  Integrate winner into production
/swan-optimize <target>           →  Autoresearch loop

### Flow: /idea → approve plan+contracts → /next × N → /verify → /review → /docs → ship
