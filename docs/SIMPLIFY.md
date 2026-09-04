# Simplification Log

A standing effort to keep the codebase small: every round removes unnecessary
complexity (dead code, duplication, over-abstraction) with zero behavior
change. Staff-engineer reviews are run in batches; the findings become the
rounds below. Rounds end only when lint, tests, and build stay green.

| Round | Simplified | LOC Δ |
|-------|-----------|-------|
| 17 | shared fileToDataUrl helper replaces two FileReader copies | -8 |
| 16 | removed the utils/response backward-compat shim | -13 |
| 15 | requestLogger success/error branches share one log path | -35 |
| 14 | removed unused deps clsx + @types/dompurify | config |
| 13 | dropped unused draftApi publish/cancel wrappers | -25 |
| 12 | removed usePostcard.currentStep (modeled the old 4-step wizard) | -15 |
| 12 | removed usePostcard.currentStep (old 4-step wizard model) | -15 |
| 11 | draftSizeToPostGridSize replaced by isCardSize | -10 |
| 10 | email_processing table removed from schema | -15 |
| 9 | deleted vestigial App.tsx + test | -27 |
| 8 | trimmed route-test matrix duplicated from validation.test.ts | -150 |
| 7 | single devLoginResponse helper (was copy-pasted in two routes) | -25 |
| 6 | requireAuth helper replaces 12 copied auth blocks in server.ts | -35 |
| 5 | removed never-wired notifications service + SMTP config | -172 |
| 4 | dropped generateBackHTML/generatePreviewHTML dead exports | -240 |
| 3 | deleted orphaned root e2e specs (dead /postcard-editor route) | -516 |
| 2 | dropped AddressForm (superseded by InlineAddressForm) | -733 |
| 1 | dropped unused parallel validation module (backend/src/validation/postcard) | -1,123 |
