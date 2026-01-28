# Issue #28 Repository Mismatch

## Problem

Issue #28 was created in the `bullpos` repository but its content is for the `bullbitcoin-mobile` repository:

- **Issue Title**: [bullbitcoin-mobile] Implement MerchantPayment entity and InvoicePayload value object
- **Issue Label**: component:mobile
- **Issue Context**: "Repository: bullbitcoin-mobile"
- **Expected Files**: Dart files in `lib/features/merchant_payments/domain/`
- **Actual Repository**: bullpos (TypeScript/JavaScript monorepo)

## Evidence

1. The issue description explicitly states "Repository: bullbitcoin-mobile"
2. All file paths reference Dart files: `lib/features/merchant_payments/domain/*.dart`
3. The bullpos repository contains no Dart/Flutter code
4. The issue is labeled with `component:mobile` but bullpos has no mobile component

## Root Cause

The plan-decomposer tool likely created issues in the wrong repository during batch generation (batch-20260127-181138-2751594).

## Resolution Options

1. **Transfer Issue**: Move issue #28 to the correct repository (bullbitcoin-mobile)
2. **Close as Invalid**: Close this issue and recreate it in the correct repository
3. **Skip**: Mark this as a plan-decomposer error and skip implementation

## Recommendation

This issue should be transferred to the bullbitcoin-mobile repository where the Dart/Flutter codebase exists. The bullpos repository cannot implement Dart domain entities.
