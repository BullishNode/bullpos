# Routing Error Report: Issue #39

## Error Classification
**CRITICAL** - Wrong Repository Assignment

## Issue Details
- **Issue Number:** #39
- **Issue Title:** Integrate merchant_payments Tests into CI Pipeline
- **Assigned Repository:** bullpos
- **Correct Repository:** bullbitcoin-mobile

## Problem Description
Issue #39 requests CI/CD pipeline setup for Flutter/Dart feature tests in the `merchant_payments` module of the bullbitcoin-mobile mobile application. However, the vibelord worker coordination system routed this issue to the bullpos repository.

## Repository Mismatch
- **bullpos (current):** TypeScript-based web payment system with Express.js backend and browser-based frontend
- **bullbitcoin-mobile (required):** Flutter/Dart mobile application

These repositories have completely different technology stacks and cannot fulfill each other's requirements.

## Issue Requirements
The issue specifically asks to:
1. Modify/create GitHub Actions workflows for Flutter tests
2. Run unit tests and widget tests for merchant_payments feature
3. Configure CI to execute on PRs affecting merchant_payments directory
4. Fail build if tests fail

## Root Cause
The worker coordination system assigned this issue to bullpos despite:
- Issue body/title referencing mobile app testing
- Dependencies on issues #37 and #38 which may be in bullbitcoin-mobile
- Flutter/Dart specific test requirements

## Pattern Recognition
This is the **second documented occurrence** of this routing pattern:
- Issue #30: Previously routed to wrong repository
- Issue #39: Current instance

## Recommended Fix
The vibelord worker coordination system needs:
1. Repository context validation before work assignment
2. Technology stack matching (Flutter → mobile repo, TypeScript → web repo)
3. Dependency chain validation (issues referencing each other should be in same repo)
4. Explicit repository markers in issue body parsing

## Session Outcome
No implementation possible in this repository. A PR will be created documenting this error for maintainer review.

---

**Report Date:** 2026-01-27
**Session:** Continuation Session 1
**Worker Branch:** fix/issue-39
