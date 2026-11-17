# Review — backlog #6 init charter probe (owner-directed "do them all")

- Worker: pw51-init-probe (run_mvzavknb_7v6cz5/task_3) — Review: orchestrator-inline, registry Tier A grep-only (prompt-only edit, 10+/3−, one file).
- Recon (worker, verified plausible): init is prompt-driven in skills/init/SKILL.md only; no script/test covers the flow. Probe added as explicit step 6 (test -f AGENTS.md, loud failure + remediation hint, blocks handoff); old handoff step renumbered 7 with back-reference.
- Transport verified on main: probe lines present, check-drift CLEAN, suite untouched.
- Verdict: **ok: true** (orchestrator-inline, Tier A). Note recorded: prompt-enforced until a scripted /init gate exists.
