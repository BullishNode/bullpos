# Workspace Routing Error for Issue #34

## Problem

Issue #34 was routed to the **bullpos** workspace, but it should be in the **bullbitcoin-mobile** workspace.

## Evidence

### Issue Details
- **Issue Number**: #34
- **Title**: [bullbitcoin-mobile] Implement merchant setup screen UI
- **Repository Field**: bullbitcoin-mobile (explicitly stated in issue body)
- **Component Label**: component:mobile
- **Technology**: Flutter/Dart
- **Files**: `*.dart` files in `lib/features/merchant_payments/`

### Current Workspace
- **Workspace**: /tmp/vibelord-worktrees/bullpos/overnight/issue-34
- **Repository**: bullpos (Node.js/TypeScript)
- **Technology**: Express backend + browser frontend
- **No Flutter/Dart files present**

### Correct Workspace Location
- **Should be**: /tmp/vibelord-worktrees/bullbitcoin-mobile/overnight/issue-34
- **Currently**: Does not exist (directory not created)

## Root Cause

The vibelord worker routing logic assigned this issue to the wrong repository workspace. The issue metadata clearly indicates `bullbitcoin-mobile` but the worker created the workspace in `bullpos`.

## Required Action

1. **Vibelord system**: Create workspace at `/tmp/vibelord-worktrees/bullbitcoin-mobile/overnight/issue-34`
2. **Re-route issue**: Assign issue #34 to the correct workspace
3. **Worker retry**: Restart the worker in the correct workspace

## Issue Requirements (For Correct Workspace)

### Goal
Create merchant onboarding UI with form validation in Flutter mobile app.

### Files to Create
- `lib/features/merchant_payments/ui/merchant_setup_screen.dart`
- `lib/features/merchant_payments/presentation/merchant_setup_cubit.dart`
- `lib/features/merchant_payments/presentation/merchant_setup_state.dart`

### Dependencies
- Issue #31 (sequence 31)
- Issue #32 (sequence 32)

### Acceptance Criteria
- Privacy notice shown on first open
- All form fields present (store name, website, description, language, currency)
- Validation shows errors for invalid input
- Loading indicator during registration
- Success navigates to main merchant screen
- Errors displayed appropriately

## Cannot Complete

This issue **cannot be completed** in the current workspace because:
1. Wrong technology stack (TypeScript vs Flutter)
2. Wrong repository (bullpos vs bullbitcoin-mobile)
3. No Flutter project structure present
4. No existing merchant payment feature structure

A PR created in this workspace would be meaningless and create confusion in the wrong repository.
