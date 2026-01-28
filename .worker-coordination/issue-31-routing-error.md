# Issue #31 Routing Error

## Problem
Issue #31 is tagged for `bullbitcoin-mobile` repository but was routed to `bullpos` worktree.

## Issue Details
- **Issue Number**: #31
- **Title**: [bullbitcoin-mobile] Implement merchant registration use case
- **Target Repository**: bullbitcoin-mobile (Flutter/Dart)
- **Current Worktree**: bullpos (TypeScript)

## Issue Content
The issue requires implementing Dart/Flutter code:
- `lib/features/merchant_payments/application/merchant_onboarding_usecase.dart`
- `lib/features/merchant_payments/application/ports/merchant_repository.dart`
- `lib/features/merchant_payments/application/merchant_payments_application_errors.dart`

## Required Action
This issue should be routed to: `/tmp/vibelord-worktrees/bullbitcoin-mobile/overnight/issue-31`

## Root Cause
The vibelord routing system may not be parsing the `[bullbitcoin-mobile]` prefix in the issue title or the `Repository: bullbitcoin-mobile` context field in the issue body.

## Architecture Context
Per memory #36378, the bullpos repository serves as a multi-repo project tracker with issues spanning:
- bullpos (backend TypeScript)
- bullpos (frontend TypeScript)
- bullbitcoin-mobile (Flutter/Dart mobile app)

The routing system needs to respect repository tags in issue titles/bodies.
