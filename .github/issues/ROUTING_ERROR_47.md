# Routing Error: Issue #47

**Status:** BLOCKED - Routing Error
**Error Type:** ROUTING_ERROR_MOBILE
**Severity:** CRITICAL
**Issue:** [#47 - Implement payment detail screen](https://github.com/BullishNode/bullpos/issues/47)

## Summary
Issue #47 was routed to the `bullpos` repository but explicitly requires work in the `bullbitcoin-mobile` repository. This represents a systematic routing failure where the conductor system failed to parse the repository prefix `[bullbitcoin-mobile]` in the issue title.

## Evidence

### Issue Title
```
[bullbitcoin-mobile] Implement payment detail screen
```

### Issue Body - Repository Declaration
```
## Context
**Repository: bullbitcoin-mobile**
```

### Target Files (All Flutter/Dart)
- `lib/features/merchant_payments/ui/payment_detail_screen.dart`
- `lib/features/merchant_payments/ui/widgets/payment_info_card.dart`
- `lib/features/merchant_payments/ui/widgets/transaction_info.dart`

### Technology Stack Mismatch
- **Issue requires:** Flutter/Dart mobile development (Widget classes, BuildContext, Scaffold)
- **bullpos provides:** TypeScript/Node.js web application (HTML, CSS, Lightning Network backend)

## Codebase Reality Check

### bullpos Repository Structure
```bash
$ ls -la lib/features/merchant_payments/ 2>/dev/null
ls: cannot access 'lib/features/merchant_payments/': No such file or directory
```

The `lib/features/` directory structure does not exist in bullpos. This is a Flutter/Dart pattern.

### What bullpos Actually Contains
- `backend/` - Node.js Lightning Network payment backend
- `frontend/` - TypeScript web frontend for POS terminal
- `src/` - Shared utilities and wallet management

### Compatibility
- **Mobile UI Components:** 0% (no Flutter code exists)
- **Payment Detail Screens:** 0% (web-only invoice display)
- **Widget Architecture:** 0% (uses HTML/CSS, not Flutter widgets)

## Root Cause

The conductor system extracts the repository name from the worktree filesystem path:
```bash
/tmp/vibelord-worktrees/bullpos/overnight/issue-47
                        ^^^^^^^
                        Used as repo identifier
```

Instead of parsing the bracketed prefix from the issue title:
```
[bullbitcoin-mobile] Implement payment detail screen
 ^^^^^^^^^^^^^^^^^^
 Should be used as repo identifier
```

## Dependency Chain Impact

Issue #47 depends on issue #46, which is likely also a routing error following the same pattern (part of batch-20260127-181138-2751594, sequence 47 of 56).

## Pattern Recognition

This is part of a systematic routing failure pattern affecting multiple issues:
- Issue #42: `[bullbitcoin-mobile]` routed to bullpos (PR #98)
- Issue #44: Multi-repo coordination failure (PR #101)
- **Issue #47: `[bullbitcoin-mobile]` routed to bullpos (THIS ISSUE)**

All follow the same root cause: conductor extracts repo from path instead of issue title prefix.

## Recommended Actions

1. **Close this issue in bullpos repository** - It cannot be implemented here
2. **Verify bullbitcoin-mobile repository exists** - If not, create it or document the correct repo name
3. **Re-route to correct repository** - Create worktree in bullbitcoin-mobile if available
4. **Fix conductor routing logic** - Parse `[repo-name]` prefix from issue titles before falling back to path extraction
5. **Validate batch integrity** - Check all 56 issues in batch-20260127-181138-2751594 for similar routing errors

## Manual Intervention Required

This issue requires manual re-routing to the correct repository. The automated conductor system cannot fix routing errors on its own.

---

**Note:** This PR is created to satisfy the completion signal requirements of the overnight worker. The PR should be merged to document the routing error, but the underlying issue cannot be resolved in the bullpos codebase.

## Related Issues
- #42 (ROUTING_ERROR_MOBILE - documented in PR #98)
- #44 (ROUTING_ERROR_MULTI_REPO - documented in PR #101)
- #46 (dependency - likely also routing error)

## References
- Memory observations: #37533, #37676, #37679, #37685, #37700 (similar routing error patterns)
