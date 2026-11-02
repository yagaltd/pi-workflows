# Lessons — plan 20261102-049 (JEV-batched PII advisory pass)

1. Guardrail tests must pin every position the guarantee names. Value-only fixtures let name-position leaks (header cells, heading text, key names) ship as "values never sent" — extend fixtures to ALL positions a documented guarantee covers.
2. Word guarantees precisely. "Values are never sent" was over-broad while field names passed through; the docs now name the sanitizer explicitly. An over-broad claim is a bug, not marketing.
3. Redact-then-truncate: redact high-entropy runs BEFORE applying a length bound so no partial literal survives truncation; semantics survive (email stays email, SECRETVALUE42 becomes [redacted:13]).
4. Probe the guarantee, not just the tests. Adversarial reproduction (sentinels in header positions) caught what structurally-limited tests could not — reviews should re-derive the claim, not rerun the suite.
5. Batched typed judgment makes advisory AI passes viable: one judge call per file, <=64 speculative questions, cents per file (TypeSafe parallel-questions cookbook); breadth is free, so ask generously and discard.
