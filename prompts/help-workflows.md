---
description: "Show pi-workflows quick reference"
model: openrouter/xiaomi-mimo-v2-pro
thinking: off
restore: true
---

Show this reference and nothing else:

## pi-workflows — Quick Reference

### Starting work
/idea <description + repos/URLs>  →  Explore + plan atomic tasks (GPT-5.4)
/plan <description>               →  Decompose into tasks only (GPT-5.4)
/explore <question>               →  Quick research, no planning (cheap)
/status                           →  Show plan.md progress (cheap)

### Executing
/next                             →  Execute next pending task from plan.md
/add <feature>                    →  Build feature directly
/fix <bug>                        →  Fix bug directly
/refactor <scope>                 →  Restructure code directly
/optimize <target>                →  Autoresearch loop

### Delegated
/scout <area>                     →  Cheap subagent recon
/review                           →  Independent verification subagent

### Swan (autoresearch)
/swan-explore <target>            →  Online research + codebase analysis
/swan-prototype <theories>        →  3 parallel workers in worktrees
/swan-integrate <prototype>       →  Integrate winner into production
/swan-optimize <target>           →  Autoresearch loop

### Flow: /idea → approve plan → /next × N → /review → ship
