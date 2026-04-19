## Summary

<!-- 1-3 bullet points describing what this PR does and why -->

-

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (no functional changes)
- [ ] Documentation
- [ ] CI/CD / Infrastructure
- [ ] Test coverage improvement

## Related Issues

<!-- Link issues this PR addresses: Closes #123, Fixes #456 -->

## Postcard Validation Checklist

<!-- If this PR touches postcard creation or sending, verify: -->

- [ ] N/A - Does not affect postcard flow
- [ ] Address validation handles all edge cases (missing fields, invalid formats)
- [ ] Image validation enforces size/format constraints
- [ ] Message content is properly sanitized
- [ ] PostGrid API payload matches expected schema
- [ ] Return address is always included and valid

## Test Plan

- [ ] Unit tests pass (`pnpm test` in backend/)
- [ ] Unit tests pass (`pnpm test` in frontend/)
- [ ] Lint passes (`pnpm lint` in both packages)
- [ ] Build succeeds (`pnpm build` in both packages)
- [ ] New/changed code has test coverage
- [ ] E2E tests pass (if applicable)

## Screenshots / Evidence

<!-- For UI changes, include before/after screenshots -->
<!-- For API changes, include example request/response -->
