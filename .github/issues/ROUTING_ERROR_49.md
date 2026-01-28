# Routing Error Documentation: Issue #49

## Issue Details
- **Issue Number:** #49
- **Title:** Add integration tests for payment history and recovery flow
- **Target Repository:** bullbitcoin-mobile
- **Actual Repository:** bullpos
- **Status:** Routing Error Detected

## Problem Description

Issue #49 explicitly states in its context section:
```
Repository: bullbitcoin-mobile
```

The issue requests implementation of Dart/Flutter integration tests in the following file paths:
- `test/features/merchant_payments/integration/payment_history_test.dart`
- `test/features/merchant_payments/integration/swap_recovery_test.dart`

However, the vibelord conductor routed this issue to the **bullpos** repository, which is a TypeScript/Node.js web application with completely incompatible technology stack.

## Tech Stack Mismatch

### Required (bullbitcoin-mobile)
- Language: Dart
- Framework: Flutter
- Test Framework: flutter_test
- Directory Structure: `test/features/merchant_payments/integration/`

### Actual (bullpos)
- Language: TypeScript/JavaScript
- Framework: Node.js + Web (frontend)
- Test Framework: Jest
- Directory Structure: `backend/src/__tests__/`, `frontend/__tests__/`

**Compatibility:** 0% - Complete tech stack mismatch

## Files That Don't Exist in bullpos

The following files requested by the issue do not exist and cannot be created in the bullpos repository:

1. `test/features/merchant_payments/integration/payment_history_test.dart` - Dart test file
2. `test/features/merchant_payments/integration/swap_recovery_test.dart` - Dart test file

The bullpos repository does not have:
- A `test/` directory at the root (uses `__tests__/` instead)
- A `features/` directory structure
- Any Dart files
- Flutter testing infrastructure

## Root Cause

The vibelord conductor is extracting the repository name from the worktree filesystem path structure:
```
/tmp/vibelord-worktrees/bullpos/overnight/issue-49
                        ^^^^^^^
                        Extracted as repository name
```

Instead of parsing it from the issue context:
```
Repository: bullbitcoin-mobile
            ^^^^^^^^^^^^^^^^^^^
            Should be extracted from here
```

## Proposed Fix

Modify the conductor's repository routing logic to:
1. Parse the `Repository:` field from the issue body context section
2. Use that value to determine the target repository worktree
3. Fall back to issue title prefix `[repo-name]` if context section is missing
4. Only use filesystem path as a last resort

## Historical Context

This is the **10th occurrence** of this exact routing bug in the same batch:
- Issue #30 → PR #87 (documented routing error)
- Issue #31 → PR #88 (documented routing error)
- Issue #33 → PR #89 (documented routing error)
- Issue #34 → PR #90 (documented routing error)
- Issue #39 → PR #95 (documented routing error)
- Issue #40 → PR #96 (documented routing error)
- Issue #41 → PR #97 (documented routing error)
- Issue #42 → PR #98 (documented routing error, merged)
- Issue #44 → PR #101 (documented routing error)
- Issue #45 → PR #102 (documented routing error)
- Issue #46 → PR #103 (documented routing error)

## Required Actions

1. **DO NOT MERGE THIS PR** - It contains only documentation, no functional changes
2. Fix the vibelord conductor routing logic to parse repository names from issue context
3. Close issue #49 in the bullpos repository
4. Re-route issue #49 to a bullbitcoin-mobile worktree for proper implementation
5. Investigate why 10+ consecutive issues in the same batch all failed routing

## Dependencies

Issue #49 depends on:
- #45 (also a routing error)
- #46 (also a routing error)
- #47 (unknown status)
- #48 (unknown status)

All dependencies appear to be affected by the same routing error, blocking the entire dependency chain.

---

**Generated:** 2026-01-28 03:08 AM CST
**Worker Session:** overnight
**Batch:** batch-20260127-181138-2751594
