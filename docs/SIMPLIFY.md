# Simplification Log

A standing effort to keep the codebase small: every round removes unnecessary
complexity (dead code, duplication, over-abstraction) with zero behavior
change. Staff-engineer reviews are run in batches; the findings become the
rounds below. Rounds end only when lint, tests, and build stay green.

| Round | Simplified | LOC Δ |
|-------|-----------|-------|
| 1 | dropped unused parallel validation module (backend/src/validation/postcard) | -1,123 |
