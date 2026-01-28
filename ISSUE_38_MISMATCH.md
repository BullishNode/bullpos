# Issue #38 Repository Mismatch

## Problem

Issue #38 was created in the `bullpos` repository but describes tasks for the `bullbitcoin-mobile` repository.

## Evidence

**Issue Title:** [bullbitcoin-mobile] Add widget tests for screens

**Issue Context:**
```
Repository: bullbitcoin-mobile

Widget tests verify UI components render correctly and respond to user interaction.
```

**Files Referenced:**
- `test/features/merchant_payments/ui/merchant_setup_screen_test.dart`
- `test/features/merchant_payments/ui/invoice_builder_screen_test.dart`
- `test/features/merchant_payments/ui/share_link_dialog_test.dart`

All files are `.dart` files in a Flutter project structure (`test/features/...`), which does not exist in this repository.

## Current Repository

This repository (`bullpos`) is a TypeScript/JavaScript monorepo with:
- **Frontend:** React/TypeScript payment link application
- **Backend:** Express.js API server (placeholder)

## Impact

- Issue #38 cannot be completed in this repository
- The task requires Dart/Flutter widget testing (mocktail, flutter_test)
- The referenced files and directory structure do not exist here

## Related Issues

This is part of a larger pattern of repository mismatches documented in:
- PR #85 (ISSUE_28_MISMATCH.md) - Similar documentation for issue #28
- Memory context indicates **15 total mobile component issues** were misplaced in bullpos

## Recommended Action

1. Close or transfer issue #38 to the correct `bullbitcoin-mobile` repository
2. Review the batch of issues (batch-20260127-181138-2751594) for other mismatches
3. Update issue generation process to verify repository context

## Labels

The issue contains `component:mobile` and `component:tests` labels, confirming it belongs in a mobile repository.
