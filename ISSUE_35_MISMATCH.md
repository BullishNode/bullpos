# Issue #35 Repository Mismatch

## Problem

Issue #35 was created in the `bullpos` repository, but it clearly belongs in the `bullbitcoin-mobile` repository.

## Evidence

1. **Explicit repository declaration in issue body:**
   ```
   ## Context
   **Repository: bullbitcoin-mobile**
   ```

2. **All referenced files are Dart/Flutter files:**
   - `lib/features/merchant_payments/ui/invoice_builder_screen.dart`
   - `lib/features/merchant_payments/ui/widgets/line_item_form.dart`
   - `lib/features/merchant_payments/ui/widgets/amount_type_selector.dart`
   - `lib/features/merchant_payments/presentation/invoice_builder_cubit.dart`
   - `lib/features/merchant_payments/presentation/invoice_builder_state.dart`

3. **Flutter/Dart component label:**
   - Issue is labeled `component:mobile`
   - References Flutter UI patterns (screens, widgets, cubits)

4. **bullpos repository structure:**
   - Contains `frontend/` (TypeScript/browser) and `backend/` (Node.js) directories
   - No Flutter or Dart code exists in this repository
   - No `lib/` directory structure typical of Flutter projects

## Issue Details

- **Issue Number:** #35
- **Title:** [bullbitcoin-mobile] Implement invoice builder screen UI
- **Sequence:** 35 of 56 in batch-20260127-181138-2751594
- **Dependencies:** #33, #34
- **Correct Repository:** bullbitcoin-mobile
- **Current Repository:** bullpos (incorrect)

## Root Cause

This issue was created by the `plan-decomposer` automated tool during batch processing. The tool appears to have created multiple issues in the wrong repository. Other confirmed mismatches include:
- Issue #28 (documented in ISSUE_28_MISMATCH.md)
- Issues #29-34 (likely similar mismatches)

## Proposed Resolution

1. **Option A (Preferred):** Transfer issue #35 to the `bullbitcoin-mobile` repository
2. **Option B:** Close this issue and recreate it in `bullbitcoin-mobile`
3. **Option C:** Document and skip implementation until tooling is fixed

## Related Issues

Part of a larger batch of misrouted issues. See also:
- ISSUE_28_MISMATCH.md (documented)
- Issues #29-34 (may have similar problems)

## Action Required

Repository maintainers should review the entire batch (issues #28-56) to identify and correct all misrouted issues before implementation work continues.
