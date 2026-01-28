# Routing Error: Issue #41

## Problem
Issue #41 was routed to the `bullpos` repository, but it belongs to the `bullbitcoin-mobile` repository.

## Issue #41 Details
**Title:** [bullbitcoin-mobile] Add image attachment support to invoice builder

**Repository:** bullbitcoin-mobile (Flutter/Dart mobile app)

**Requirements:**
- Add image attachment capability to invoice builder
- Flutter/Dart implementation required
- Files needed: `lib/features/merchant_payments/ui/widgets/image_attachment.dart`

## Current Repository
**Repository:** bullpos (TypeScript/Node.js browser POS)

**Stack:** TypeScript, React, Node.js, Express

**No relation to:** Flutter, Dart, or mobile invoice builder

## Root Cause
The vibelord worker conductor routed a bullbitcoin-mobile issue to a bullpos worktree. These are separate projects with incompatible tech stacks.

## Resolution Needed
1. Route issue #41 to the correct bullbitcoin-mobile repository
2. Update conductor routing logic to validate repository context
3. Add repository tags to issue metadata for validation

## Repository Mapping
| Issue Tag | Correct Repository |
|-----------|-------------------|
| `[bullbitcoin-mobile]` | bullbitcoin-mobile |
| `[bullpos]` | bullpos |
| `[bull-bitcoin-workspace]` | (shared workspace issues) |
