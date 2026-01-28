# Worker Routing Error - Issue #33

## Problem
Worker was assigned to issue #33 in the **bullpos** repository worktree, but issue #33 is actually for the **bullbitcoin-mobile** repository.

## Issue Details
- **Issue Number**: #33
- **Title**: [bullbitcoin-mobile] Implement create invoice use case
- **Correct Repository**: bullbitcoin-mobile
- **Current Worktree**: /tmp/vibelord-worktrees/bullpos/overnight/issue-33
- **Required Worktree**: /tmp/vibelord-worktrees/bullbitcoin-mobile/overnight/issue-33

## Expected Files
The issue expects to work on Dart files:
- `lib/features/merchant_payments/application/create_invoice_usecase.dart`

This file does not exist in the bullpos repository (TypeScript/JavaScript monorepo project).

## Issue Requirements
- Create CreateInvoiceUseCase (Dart class)
- Build InvoicePayload from input data
- Derive next AES key index
- Encrypt payload with AES-256-GCM
- Upload encrypted blob to backend
- Construct URL: btcpos.cash/p/{id}#{key}
- Store invoice locally for history

All of these are Flutter/Dart mobile app features, not TypeScript web features.

## Root Cause
The vibelord worker coordinator created a worktree in the wrong repository. The issue is tagged with `component:mobile` and explicitly mentions "bullbitcoin-mobile" in the title, but was routed to bullpos repository.

## Required Action
1. Create worktree at: `/tmp/vibelord-worktrees/bullbitcoin-mobile/overnight/issue-33`
2. Re-run worker with correct repository context
3. Fix routing logic to check `component:mobile` label or repository context in issue title before creating worktree

## Status
Cannot proceed - wrong repository, wrong language (Dart vs TypeScript), wrong codebase.
