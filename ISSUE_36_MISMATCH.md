# Issue #36 Repository Mismatch

## Summary

Issue #36 was incorrectly created in the bullpos repository when it should have been created in the bullbitcoin-mobile repository.

## Problem

- **Issue #36 Title**: [bullbitcoin-mobile] Implement payment link sharing functionality
- **Issue Context**: States "Repository: bullbitcoin-mobile"
- **Required Files**:
  - `lib/features/merchant_payments/ui/widgets/share_link_dialog.dart`
  - `lib/features/merchant_payments/ui/widgets/link_qr_code.dart`
- **Actual Repository**: bullpos (TypeScript/JavaScript monorepo with no Dart code)

## Evidence

1. Issue explicitly states it's for bullbitcoin-mobile in the context section
2. All file paths reference Dart files (`.dart` extensions) in Flutter project structure
3. bullpos repository contains no Flutter/Dart code - it's a TypeScript/JavaScript monorepo
4. Issue is labeled `component:mobile` but bullpos has no mobile component
5. Acceptance criteria mention Flutter-specific features:
   - System share sheet (native mobile API)
   - Save QR as image (mobile photo gallery integration)
   - Bottom sheet UI (Flutter UI component)

## Root Cause

The plan-decomposer tool (batch-20260127-181138-2751594) created this issue in the wrong repository during batch generation of issue sequence 36 of 56.

## Context

This is part of a larger pattern of repository mismatches. According to project memory (#37017), there are 15 total mobile component issues incorrectly created in the bullpos repository when they should be in bullbitcoin-mobile.

## Resolution Options

This issue should be:

1. **Transferred** to the bullbitcoin-mobile repository, OR
2. **Closed** as invalid and recreated in the correct repository

## Related Issues

- Issue #28: Similar repository mismatch documented in PR #85
- Issue #35: Similar repository mismatch documented in PR #91
- 12 additional mobile component issues with the same mismatch

## Changes

- Added `ISSUE_36_MISMATCH.md` documenting the repository mismatch
