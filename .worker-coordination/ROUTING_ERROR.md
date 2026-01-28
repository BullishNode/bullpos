# Worker Routing Error - Issue #40

## Problem
Worker was assigned to issue #40 in the **bullpos** repository worktree, but issue #40 is actually for the **bullbitcoin-mobile** repository.

## Issue Details
- **Issue Number**: #40
- **Title**: [bullbitcoin-mobile] Verify Phase 3 Wallet Integration complete
- **Correct Repository**: bullbitcoin-mobile
- **Current Worktree**: /tmp/vibelord-worktrees/bullpos/overnight/issue-40
- **Required Worktree**: /tmp/vibelord-worktrees/bullbitcoin-mobile/overnight/issue-40

## Task Description
The issue is a **verification task** that requires:
- Manual testing of merchant onboarding flow
- Manual testing of invoice builder
- Manual testing of link generation and sharing
- Verifying generated links work in bullpos browser
- Running and verifying all tests pass
- Verifying CI passes

## Why This Cannot Be Done in bullpos
This is a verification task for Phase 3 wallet integration in the **bullbitcoin-mobile** repository (Dart/Flutter mobile app). The bullpos repository is a completely different codebase (TypeScript/JavaScript point-of-sale system) and does not contain:
- The mobile app codebase to test
- The merchant onboarding flows for mobile
- The invoice builder interface for mobile
- The Flutter/Dart test suites

## Root Cause
The vibelord worker coordinator created a worktree in the wrong repository. The issue explicitly states "Repository: bullbitcoin-mobile" in its context section but was routed to bullpos.

## Required Action
1. Create worktree at: `/tmp/vibelord-worktrees/bullbitcoin-mobile/overnight/issue-40`
2. Re-run worker with correct repository context (bullbitcoin-mobile)
3. Fix routing logic to check issue repository tag/context before creating worktree

## Status
Cannot proceed - wrong repository, wrong codebase. This is a mobile app verification task that cannot be performed in the POS system repository.
