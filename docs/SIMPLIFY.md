# Simplification Log

A standing effort to keep the codebase small: every round removes unnecessary
complexity (dead code, duplication, over-abstraction) with zero behavior
change. Staff-engineer reviews are run in batches; the findings become the
rounds below. Rounds end only when lint, tests, and build stay green.

| Round | Simplified | LOC Δ |
|-------|-----------|-------|
| 8 | trimmed route-test matrix duplicated from validation.test.ts | -150 |
| 7 | single devLoginResponse helper (was copy-pasted in two routes) | -25 |
| 6 | requireAuth helper replaces 12 copied auth blocks in server.ts | -35 |
| 5 | removed never-wired notifications service + SMTP config | -172 |
| 4 | dropped generateBackHTML/generatePreviewHTML dead exports | -240 |
| 3 | deleted orphaned root e2e specs (dead /postcard-editor route) | -516 |
| 2 | dropped AddressForm (superseded by InlineAddressForm) | -733 |
| 1 | dropped unused parallel validation module (backend/src/validation/postcard) | -1,123 |
