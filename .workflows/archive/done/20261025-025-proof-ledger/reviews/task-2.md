# Review — task-2

## Round 1
**ok: true**

Evidence: selector-bound scenarios pass (bun test); proofs are recorded data (failing verifier writes then exits with its code); collect is a report, exit 0 always.
Gaming check: hash drift test mutates output, not the assertion; collect asserts against fixture trails.
