# Worker Routing Error - Issue #30

## Problem
Worker was assigned to issue #30 in the **bullpos** repository worktree, but issue #30 is actually for the **bullbitcoin-mobile** repository.

## Issue Details
- **Issue Number**: #30
- **Title**: [bullbitcoin-mobile] Implement Liquid wallet derivation for merchant receiving
- **Correct Repository**: bullbitcoin-mobile
- **Current Worktree**: /tmp/vibelord-worktrees/bullpos/overnight/issue-30
- **Required Worktree**: /tmp/vibelord-worktrees/bullbitcoin-mobile/overnight/issue-30

## Expected Files
The issue expects to work on Dart files:
- `lib/features/merchant_payments/application/merchant_address_service.dart`
- `lib/features/merchant_payments/interface_adapters/merchant_wallet_adapter.dart`

These files do not exist in the bullpos repository (TypeScript/JavaScript project).

## Root Cause
The vibelord worker coordinator created a worktree in the wrong repository. The issue belongs to bullbitcoin-mobile but was routed to bullpos.

## Required Action
1. Create worktree at: `/tmp/vibelord-worktrees/bullbitcoin-mobile/overnight/issue-30`
2. Re-run worker with correct repository context
3. Fix routing logic to check issue repository tag before creating worktree

## Status
Cannot proceed - wrong repository, wrong language (Dart vs TypeScript), wrong codebase.
