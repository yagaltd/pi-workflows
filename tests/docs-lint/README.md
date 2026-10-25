# docs-lint fixtures

Fixture docs for the doc-drift sections of `scripts/docs-lint.sh` (sections
4–5). Each `fixtures-*/` directory is a standalone `DRIFT_SCAN_DIR` root;
each fixture doc below lists the exact findings the scanner must produce.

| Fixture | Proves | Expected findings |
|---|---|---|
| `fixtures-current/` | current stamp + gated claim accepted | none (exit 0) |
| `fixtures-expired/` | `stale_after` date in the past flagged | 1 (stamp expired) |
| `fixtures-missing-stamps/` | `generated_by` without dates flagged | 2 (missing `generated_at`, missing `stale_after`) |
| `fixtures-claims/` | claim line without a gate reference flagged | 1 (must not, no gate) |

Run one: `DRIFT_SCAN_DIR tests/docs-lint/fixtures-current bash scripts/docs-lint.sh`
